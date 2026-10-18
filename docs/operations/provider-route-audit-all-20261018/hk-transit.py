"""Ephemeral HZ->HK SOCKS tunnel, exact 443 destinations only, cleaned in finally."""
import json,pathlib,shlex,subprocess
root=pathlib.Path(__file__).parent
manifest=json.loads(root.joinpath('manifest.json').read_text())
# Known regional restrictions exclude HK as a candidate for these direct vendors.
selected=[r for r in manifest if r['current_route']=='singapore' and r['id'] not in ['openai','anthropic','gemini','fal']]
source=root.joinpath('probe.py').read_text().replace('__MANIFEST__',repr(selected)).encode()
base=['ssh','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=10']
hz='116.62.146.226';hk='47.243.4.247';tag='provider-route-all-20261018';remote='/run/'+tag;added=False

def ssh(host,cmd,data=None):
 p=subprocess.run(base+['root@'+host,cmd],input=data,capture_output=True,timeout=360)
 if p.returncode:raise RuntimeError(host+': '+p.stderr.decode()[:400])
 return p.stdout

def py(host,src):return ssh(host,'python3 -',src.encode())
try:
 ssh(hz,'test ! -e '+remote+' && install -d -m 700 '+remote+' && ssh-keygen -q -t ed25519 -N '+shlex.quote('')+' -C '+tag+' -f '+remote+'/id')
 pub=ssh(hz,'cat '+remote+'/id.pub').decode().strip();host_pub=ssh(hk,'cat /etc/ssh/ssh_host_ed25519_key.pub').decode().split()
 permits=','.join('permitopen="'+h+':443"' for h in sorted(set(r['host'] for r in selected)))
 entry='restrict,port-forwarding,'+permits+',command="/bin/false",from="'+hz+'" '+pub
 py(hk,'from pathlib import Path\np=Path("/root/.ssh/authorized_keys")\ns=p.read_text()\np.write_text(s.rstrip()+"\\n"+'+repr(entry)+'+"\\n")\np.chmod(0o600)')
 added=True
 py(hz,'from pathlib import Path\np=Path('+repr(remote+'/known_hosts')+')\np.write_text('+repr(hk+' '+host_pub[0]+' '+host_pub[1]+'\n')+')\np.chmod(0o600)')
 ssh(hz,'ssh -fN -M -S '+remote+'/socket -o BatchMode=yes -o StrictHostKeyChecking=yes -o UserKnownHostsFile='+remote+'/known_hosts -o IdentitiesOnly=yes -o ExitOnForwardFailure=yes -o ServerAliveInterval=15 -i '+remote+'/id -D 127.0.0.1:18444 root@'+hk)
 print('Temporary HK tunnel ready; exact allowed destinations:',len(selected),flush=True)
 p=subprocess.Popen(base+['root@'+hz,'python3 - --node hangzhou-via-hongkong --rounds 5 --socks 127.0.0.1:18444'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.PIPE)
 p.stdin.write(source);p.stdin.close()
 with root.joinpath('hangzhou-via-hongkong.jsonl').open('w') as f:
  n=0
  for line in p.stdout:
   json.loads(line);f.write(line.decode());f.flush();n+=1
   if n%20==0:print(n,'HK transit samples complete',flush=True)
 p.wait(timeout=30)
 if p.returncode:raise RuntimeError(p.stderr.read().decode()[:400])
finally:
 try:ssh(hz,'ssh -S '+remote+'/socket -O exit root@'+hk)
 except RuntimeError:pass
 if added:
  py(hk,'from pathlib import Path\np=Path("/root/.ssh/authorized_keys")\np.write_text("\\n".join(x for x in p.read_text().splitlines() if '+repr(tag)+' not in x)+"\\n")\np.chmod(0o600)')
 ssh(hz,'rm -rf -- '+remote)
 hz_absent=ssh(hz,'test ! -e '+remote+' && echo absent').decode().strip()=='absent'
 hk_absent=py(hk,'from pathlib import Path\nprint('+repr(tag)+' not in Path("/root/.ssh/authorized_keys").read_text())').decode().strip()=='True'
 receipt={'temporary_key_removed':hz_absent,'temporary_authorization_removed':hk_absent,'no_public_listener_created':True,'allowed_destinations':[r['host'] for r in selected]}
 root.joinpath('temporary-tunnel-cleanup.json').write_text(json.dumps(receipt,indent=2)+'\n')
 print('HK tunnel cleanup verified:',hz_absent and hk_absent,flush=True)
