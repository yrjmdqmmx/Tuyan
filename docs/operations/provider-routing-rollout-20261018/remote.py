import pathlib,subprocess,shlex
ROOT=pathlib.Path(__file__).parent
BASE=['ssh','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=10']
HOSTS={'hz':BASE+['root@116.62.146.226'],'hk':BASE+['root@47.243.4.247'],'sg':BASE+['-o','HostKeyAlias=47.84.201.88','-J','root@47.243.4.247','ecs-user@10.77.0.2']}
def run(node,command,data=None,timeout=300):
 p=subprocess.run(HOSTS[node]+[command],input=data,capture_output=True,timeout=timeout)
 if p.returncode:raise RuntimeError(node+': '+p.stderr.decode()[:1200])
 return p.stdout

def py(node,source):return run(node,'sudo python3 -',source.encode())
def put(node,path,data,mode=0o644):
 script='from pathlib import Path\np=Path('+repr(path)+')\np.parent.mkdir(parents=True,exist_ok=True)\np.write_bytes('+repr(data)+')\np.chmod('+repr(mode)+')'
 return py(node,script)
