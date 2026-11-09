#!/usr/bin/env python3
"""Private, zero-dependency HTTP tool for an Agent running on the owner's Mac.

The adjacent agent-secret.json is never printed or put in command arguments.
"""
import argparse
import json
from pathlib import Path
import ssl
import stat
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = 'https://tuyansci.cn/api/agent-ops/'

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

def fetch(operation, window, credential):
    if operation not in ('overview', 'failures', 'health'):
        raise ValueError('unsupported operation')
    if operation == 'health' and window:
        raise ValueError('health accepts no time window')
    target = BASE + operation + ('?' + urllib.parse.urlencode(window) if window else '')
    ca_file = '/etc/ssl/cert.pem' if Path('/etc/ssl/cert.pem').is_file() else None
    context = ssl.create_default_context(cafile=ca_file)
    opener = urllib.request.build_opener(NoRedirect(), urllib.request.HTTPSHandler(context=context))
    request = urllib.request.Request(target, headers={'Authorization': 'Bearer ' + credential, 'Accept': 'application/json'})
    with opener.open(request, timeout=20) as response:
        body = response.read(128 * 1024 + 1)
        if len(body) > 128 * 1024:
            raise ValueError('response too large')
        result = json.loads(body)
        if result.get('schemaVersion') != 1 or result.get('operation') != operation:
            raise ValueError('unexpected response schema')
        return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('operation', choices=['overview', 'failures', 'health', 'doctor'])
    parser.add_argument('--from', dest='start')
    parser.add_argument('--to', dest='end')
    args = parser.parse_args()
    if bool(args.start) != bool(args.end) or (args.operation in ('doctor', 'health') and args.start):
        parser.error('from/to must be provided together for overview/failures only')
    window = {'from': args.start, 'to': args.end} if args.start else {}
    try:
        path = Path(__file__).resolve().with_name('agent-secret.json')
        if stat.S_IMODE(path.stat().st_mode) & 0o077:
            raise ValueError('credential file must be private')
        secret = json.loads(path.read_text())['token']
        if args.operation == 'doctor':
            result = {kind: fetch(kind, {}, secret) for kind in ('overview', 'failures', 'health')}
        else:
            result = fetch(args.operation, window, secret)
        print(json.dumps(result, ensure_ascii=False, indent=2))
    except urllib.error.HTTPError as error:
        print(json.dumps({'error': 'operations HTTP request rejected', 'status': error.code}), file=sys.stderr)
        return 1
    except Exception:
        print(json.dumps({'error': 'operations access unavailable; check the private credential file, network and service status'}), file=sys.stderr)
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
