#!/usr/bin/env python3
"""Read-only Linux host/container/Core sampler. No installation or service changes.

Run manually first; scheduling is a separate deployment action. The optional
credential JSON contains only operationsToken and must be 0600.
"""
import argparse
import datetime
import ipaddress
import json
import os
import re
from pathlib import Path
import stat
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request


def read_proc(path):
    try:
        return Path("/proc", path).read_text()
    except OSError:
        return None


def host_snapshot():
    result = {"loadAverage": list(os.getloadavg()), "cpuCount": os.cpu_count()}
    memory = read_proc("meminfo")
    if memory:
        allowed = {"MemTotal", "MemAvailable", "SwapTotal", "SwapFree", "Dirty", "Writeback"}
        result["memoryBytes"] = {k: int(v.split()[0]) * 1024
                                 for k, v in (line.split(":", 1) for line in memory.splitlines())
                                 if k in allowed}
    cpu = read_proc("stat")
    if cpu:
        result["cpuTicks"] = [int(value) for value in cpu.splitlines()[0].split()[1:]]
        result["clockTicksPerSecond"] = os.sysconf("SC_CLK_TCK")
    vm = read_proc("vmstat")
    if vm:
        allowed = {"pswpin", "pswpout", "pgmajfault", "oom_kill"}
        result["vmCounters"] = {k: int(v) for k, v in (line.split() for line in vm.splitlines()) if k in allowed}
    network = read_proc("net/dev")
    if network:
        # Interface names are system labels; no IPs, peer destinations or payloads.
        result["networkCounters"] = {}
        for line in network.splitlines()[2:]:
            name, values = line.split(":", 1)
            values = [int(value) for value in values.split()]
            result["networkCounters"][name.strip()] = {
                "rxBytes": values[0], "txBytes": values[8],
                "rxErrors": values[2], "txErrors": values[10],
                "rxDropped": values[3], "txDropped": values[11]}
    disks = read_proc("diskstats")
    if disks:
        result["diskCounters"] = {}
        for line in disks.splitlines():
            fields = line.split()
            if fields[2].startswith(("loop", "ram")) or len(fields) < 14:
                continue
            result["diskCounters"][fields[2]] = {
                "readSectors512": int(fields[5]), "writeSectors512": int(fields[9]),
                "ioInFlight": int(fields[11]), "ioBusyMs": int(fields[12]),
                "ioWeightedMs": int(fields[13])}
    result["pressure"] = {key: read_proc("pressure/" + key) for key in ("cpu", "memory", "io")}
    fs = os.statvfs("/")
    result["rootDiskBytes"] = {"total": fs.f_blocks * fs.f_frsize, "available": fs.f_bavail * fs.f_frsize}
    result["rootInodes"] = {"total": fs.f_files, "available": fs.f_favail}
    return result


def containers_snapshot():
    try:
        # Never inspect full environment, command arguments, mounts or labels.
        ps = subprocess.run(["docker", "ps", "--format", "{{.ID}}"], capture_output=True, text=True, timeout=5, check=True)
        ids = ps.stdout.split()
        if not ids:
            return {"available": True, "containers": []}
        # State includes error strings and health logs, so use an explicit small projection instead.
        fmt = '{"name":{{json .Name}},"pid":{{.State.Pid}},"running":{{.State.Running}},"oomKilled":{{.State.OOMKilled}},"restartCount":{{.RestartCount}},"memoryLimitBytes":{{.HostConfig.Memory}},"nanoCpus":{{.HostConfig.NanoCpus}},"cpuQuota":{{.HostConfig.CpuQuota}},"cpuPeriod":{{.HostConfig.CpuPeriod}}}'
        inspected = subprocess.run(["docker", "inspect", "--format", fmt, *ids], capture_output=True, text=True, timeout=5, check=True)
        stats = subprocess.run(["docker", "stats", "--no-stream", "--format", "{{json .}}", *ids], capture_output=True, text=True, timeout=8, check=True)
        allowed = {"Name", "CPUPerc", "MemUsage", "MemPerc", "NetIO", "BlockIO", "PIDs"}
        containers = [json.loads(line) for line in inspected.stdout.splitlines()]
        for container in containers:
            pid = container.pop("pid", 0)
            try:
                group = Path(f"/proc/{pid}/cgroup").read_text().split("0::", 1)[1].strip()
                root = Path("/sys/fs/cgroup")
                folder = (root / group.lstrip("/")).resolve()
                if root not in folder.parents and folder != root:
                    continue
                container["cgroupV2"] = {}
                for filename in ("cpu.stat", "memory.events", "memory.current", "memory.peak", "pids.current"):
                    try:
                        container["cgroupV2"][filename] = (folder / filename).read_text().strip()
                    except OSError:
                        pass
            except (OSError, IndexError):
                container["cgroupV2"] = None
        return {"available": True, "containers": containers,
                "usage": [{key: value for key, value in json.loads(line).items() if key in allowed} for line in stats.stdout.splitlines()]}
    except (OSError, subprocess.SubprocessError, ValueError):
        return {"available": False, "reason": "docker_missing_or_unavailable"}


def services_snapshot(units):
    result = {}
    for unit in units:
        try:
            response = subprocess.run(["systemctl", "show", "--no-pager",
                                       "--property=ActiveState,SubState,NRestarts,Restart,MemoryCurrent,MemoryPeak,CPUUsageNSec",
                                       unit], capture_output=True, text=True, timeout=5, check=True)
            result[unit] = dict(line.split("=", 1) for line in response.stdout.splitlines() if "=" in line)
        except (OSError, subprocess.SubprocessError):
            result[unit] = {"available": False}
    return result


def validate_core_url(value):
    url = urllib.parse.urlsplit(value)
    try:
        local = ipaddress.ip_address(url.hostname).is_loopback
    except ValueError:
        local = False
    if url.scheme != "http" or not local or url.username or url.password or url.query or url.fragment or url.path != "/internal/operations":
        raise ValueError("Core URL must be a literal loopback HTTP /internal/operations URL")
    return value


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def core_snapshot(url, credentials):
    if not url:
        return {"available": False, "reason": "not_configured"}
    try:
        request = urllib.request.Request(url, headers={
            "X-Paperbanana-Operations-Token": credentials["operationsToken"]})
        # Bypass inherited proxies; never follow a redirect carrying credentials.
        opener = urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())
        with opener.open(request, timeout=5) as response:
            data = response.read(1_000_001)
            if len(data) > 1_000_000:
                raise ValueError("snapshot too large")
            return {"available": True, "snapshot": json.loads(data)}
    except urllib.error.HTTPError as error:
        error.close()
        return {"available": False, "reason": "probe_unavailable"}
    except (OSError, ValueError, KeyError):
        return {"available": False, "reason": "probe_unavailable"}


def container_core_snapshot(container):
    # Production Core need not publish a host port. The dedicated read-only
    # token stays inside the container and is never placed in command arguments.
    script = """
    const response = await fetch('http://127.0.0.1:3000/internal/operations', {
      headers: {'x-paperbanana-operations-token': process.env.PAPERBANANA_OPERATIONS_TOKEN || ''},
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) process.exit(1);
    const body = await response.text();
    if (body.length > 1000000) process.exit(1);
    console.log(JSON.stringify(JSON.parse(body)));
    """
    try:
        response = subprocess.run(["docker", "exec", container, "node", "--input-type=module", "-e", script],
                                  capture_output=True, text=True, timeout=8, check=True)
        return {"available": True, "snapshot": json.loads(response.stdout)}
    except (OSError, subprocess.SubprocessError, ValueError):
        return {"available": False, "reason": "container_probe_unavailable"}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--node", choices=["hz", "hk", "sg", "local"], required=True)
    parser.add_argument("--samples", type=int, default=1)
    parser.add_argument("--interval", type=int, default=60)
    parser.add_argument("--core-url", type=validate_core_url)
    parser.add_argument("--core-container", help="Existing Core container, read its loopback endpoint without publishing a port")
    parser.add_argument("--credentials-file", type=Path)
    parser.add_argument("--containers", action="store_true")
    parser.add_argument("--unit", action="append", default=[], help="Existing proxy/tunnel service name to observe; never restarts it")
    args = parser.parse_args()
    if not 1 <= args.samples <= 10080 or args.interval < 15:
        parser.error("samples must be 1..10080 and interval >= 15 seconds")
    if len(args.unit) > 8 or any(not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9@_.-]{0,100}\.service", unit) for unit in args.unit):
        parser.error("at most eight explicit service unit names are allowed")
    if args.core_container and (args.core_url or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,100}", args.core_container)):
        parser.error("--core-container requires a container name and cannot be combined with --core-url")
    credentials = {}
    if args.core_url:
        if not args.credentials_file:
            parser.error("--core-url requires --credentials-file")
        if stat.S_IMODE(args.credentials_file.stat().st_mode) & 0o077:
            parser.error("credentials file must be private (0600)")
        credentials = json.loads(args.credentials_file.read_text())
        if set(credentials) != {"operationsToken"} or not all(isinstance(value, str) and value for value in credentials.values()):
            parser.error("credentials file must contain exactly one nonempty read-only operations token")
    os.umask(0o077)
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    for sample in range(args.samples):
        started = time.monotonic()
        now = datetime.datetime.now(datetime.timezone.utc)
        target = output / (args.node + "-" + now.strftime("%Y-%m-%d") + ".jsonl")
        if target.exists() and target.stat().st_size >= 100_000_000:
            raise RuntimeError("Daily observation size limit reached; no existing records deleted")
        record = {"version": 1, "node": args.node, "sampledAt": now.isoformat(), "host": host_snapshot(),
                  "core": container_core_snapshot(args.core_container) if args.core_container else core_snapshot(args.core_url, credentials)}
        if args.containers:
            record["docker"] = containers_snapshot()
        if args.unit:
            record["services"] = services_snapshot(args.unit)
        with target.open("a") as handle:
            handle.write(json.dumps(record, separators=(",", ":")) + "\n")
        if sample + 1 < args.samples:
            time.sleep(max(0, args.interval - (time.monotonic() - started)))


if __name__ == "__main__":
    main()
