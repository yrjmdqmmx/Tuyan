"""No credentials, no inference: identical bounded HTTP/1.1 probes on each host."""
import argparse, datetime, json, random, subprocess, time

p = argparse.ArgumentParser()
p.add_argument('--node', required=True)
p.add_argument('--rounds', type=int, default=7)
p.add_argument('--proxy', default='')
p.add_argument('--connect-to', default='')
p.add_argument('--providers', default='tokendance,bailian,ark,openrouter')
a = p.parse_args()
endpoints = {
    'tokendance': 'https://tokendance.space/gateway/v1/models',
    'bailian': 'https://dashscope.aliyuncs.com/compatible-mode/v1/models',
    'ark': 'https://ark.cn-beijing.volces.com/api/v3/models',
    'openrouter': 'https://openrouter.ai/api/v1/key',
}
keys = a.providers.split(',')
for rnd in range(a.rounds):
    order = keys.copy()
    random.Random(811 + rnd).shuffle(order)
    for provider in order:
        cmd = ['curl', '--silent', '--show-error', '--http1.1', '--compressed',
               '--retry', '0', '--connect-timeout', '5', '--max-time', '12',
               '--max-filesize', '2097152', '--output', '/dev/null', '--write-out', '%{json}',
               '--header', 'Accept: application/json', '--header', 'Connection: close']
        if a.proxy:
            cmd += ['--noproxy', '', '--proxy', a.proxy]
        else:
            cmd += ['--noproxy', '*', '--proxy', '']
        if a.connect_to:
            cmd += ['--connect-to', a.connect_to]
        cmd.append(endpoints[provider])
        started = datetime.datetime.now(datetime.timezone.utc).isoformat()
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        try:
            raw = json.loads(r.stdout)
        except json.JSONDecodeError:
            raw = {}
        safe = {k: raw.get(k) for k in [
            'http_code', 'http_connect', 'remote_ip', 'remote_port', 'local_ip',
            'time_namelookup', 'time_connect', 'time_appconnect', 'time_starttransfer',
            'time_total', 'size_download', 'ssl_verify_result', 'num_connects', 'http_version']}
        print(json.dumps({'node': a.node, 'provider': provider, 'round': rnd + 1,
                          'started_at': started, 'curl_exit': r.returncode,
                          'proxy': a.proxy or None, **safe}), flush=True)
    time.sleep(.3)
