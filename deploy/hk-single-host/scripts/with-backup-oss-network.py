#!/usr/bin/env python3
"""Temporary, exact OSS reply exceptions for the HK host's Tailscale CGNAT filter.

Run under paperbanana-backup.service's flock. Never persist/flush host rules.
ExecStopPost also calls --cleanup, including after a forced service termination.
"""
import configparser
import ipaddress
import json
import os
import re
import shlex
import signal
import socket
import subprocess
import sys
import uuid

COMMENT_PREFIX = "paperbanana-backup-oss:"
ENDPOINT = "https://oss-cn-hongkong-internal.aliyuncs.com"


def iptables(*args, check=True):
    return subprocess.run(["iptables", "-w", "5", *args], check=check,
                          capture_output=True, text=True)


def cleanup():
    # Delete only this service's individually tagged INPUT exceptions.
    for line in iptables("-S", "INPUT").stdout.splitlines():
        rule = shlex.split(line)
        if rule[:2] == ["-A", "INPUT"] and "--comment" in rule:
            comment = rule[rule.index("--comment") + 1]
            if comment.startswith(COMMENT_PREFIX):
                iptables("-D", *rule[1:])


def reply_rules(config_file, bucket):
    config = configparser.ConfigParser(interpolation=None)
    with open(config_file, encoding="utf-8") as source:
        config.read_file(source)
    endpoints = {config.get(section, "endpoint", fallback="").rstrip("/")
                 for section in config.sections()}
    if endpoints != {ENDPOINT} or not re.fullmatch(r"[a-z0-9][a-z0-9-]{1,61}[a-z0-9]", bucket):
        raise ValueError("backup requires the configured HK internal HTTPS endpoint and bucket")
    host = bucket + "." + ENDPOINT.removeprefix("https://")
    addresses = sorted({entry[4][0] for entry in socket.getaddrinfo(
        host, 443, family=socket.AF_INET, type=socket.SOCK_STREAM)})
    if not 1 <= len(addresses) <= 32 or any(
        ipaddress.ip_address(address) not in ipaddress.ip_network("100.64.0.0/10")
        for address in addresses
    ):
        raise ValueError("unexpected OSS internal DNS response; no firewall changes made")
    rules = []
    comment = COMMENT_PREFIX + uuid.uuid4().hex
    for address in addresses:
        route = json.loads(subprocess.run(["ip", "-j", "route", "get", address],
            check=True, capture_output=True, text=True).stdout)
        if len(route) != 1 or route[0].get("dev") != "eth0":
            raise ValueError("OSS internal route must use this HK host's eth0")
        rules.append(["-i", "eth0", "-s", address + "/32", "-p", "tcp", "--sport", "443",
                      "-m", "conntrack", "--ctstate", "ESTABLISHED", "--ctdir", "REPLY",
                      "-m", "comment", "--comment", comment, "-j", "ACCEPT"])
    return rules


def run(config_file, bucket, command):
    # Validate all addresses/routes before mutating any rule.
    rules = reply_rules(config_file, bucket)
    child = None
    installed = []

    def stop(signum, _frame):
        if child is not None:
            child.send_signal(signum)
            child.wait()
        raise SystemExit(128 + signum)

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        # The helper is run while holding the service's lock; recover stale exceptions.
        cleanup()
        if iptables("-S", "ts-input", check=False).returncode == 0:
            for rule in rules:
                iptables("-I", "INPUT", "1", *rule)
                installed.append(rule)
        child = subprocess.Popen(command)
        return child.wait()
    finally:
        for rule in reversed(installed):
            iptables("-D", "INPUT", *rule)


if __name__ == "__main__":
    try:
        if os.geteuid() != 0:
            raise PermissionError("run as root under the backup service lock")
        if sys.argv[1:] == ["--cleanup"]:
            cleanup()
        elif len(sys.argv) >= 4:
            sys.exit(run(sys.argv[1], sys.argv[2], sys.argv[3:]))
        else:
            raise ValueError("expected config file, bucket and upload command")
    except Exception as error:
        # No config values, credential-bearing arguments or command output in errors.
        print("Backup OSS network helper failed: " + type(error).__name__, file=sys.stderr)
        sys.exit(1)
