#!/usr/bin/env python3
"""Stream the release plus short-lived registry auth to the restricted SSH command."""
import hashlib,json,os,pathlib,subprocess
p=pathlib.Path('release.tar.gz');h=hashlib.sha256(p.read_bytes()).hexdigest()
head={k:os.environ[v] for k,v in {'sha':'GITHUB_SHA','run':'GITHUB_RUN_ID','attempt':'GITHUB_RUN_ATTEMPT','branch':'GITHUB_REF_NAME','repository':'GITHUB_REPOSITORY','token':'GH_TOKEN','username':'GITHUB_ACTOR'}.items()}
head.update(size=p.stat().st_size,sha256=h,expected=json.loads(pathlib.Path('state.json').read_text()))
with subprocess.Popen(['ssh','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ServerAliveInterval=30','root@116.62.146.226','deploy'],stdin=subprocess.PIPE) as ssh:
 ssh.stdin.write((json.dumps(head)+'\n').encode())
 with p.open('rb') as f:
  for block in iter(lambda:f.read(4*1024*1024),b''):ssh.stdin.write(block)
 ssh.stdin.close()
 if ssh.wait():raise SystemExit('Hangzhou deployment failed; inspect the guarded receiver receipt')
