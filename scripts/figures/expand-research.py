"""Additional discipline/boundary coverage; downloads do not grant approval."""
from pathlib import Path
import importlib.util,concurrent.futures,json
HERE=Path(__file__).resolve().parent
modules=[]
for filename in ['research-papers.py','download-figures.py']:
 spec=importlib.util.spec_from_file_location(filename,HERE/filename);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);modules.append(m)
research,images=modules
EXTRA={
 'pone.0323682':('plosone',[1]), 'pone.0292318':('plosone',[9]),
 'pone.0327092':('plosone',[4]),'pcbi.1005562':('ploscompbiol',[1]),
 'pmed.1002254':('plosmedicine',[1]),'pone.0340807':('plosone',[5,7]),
 'ppat.1010510':('plospathogens',[6]),'pone.0216201':('plosone',[1]),
 'pcbi.1009527':('ploscompbiol',[2]),'pntd.0013378':('plosntds',[2]),
}
if __name__=='__main__':
 def run(item):
  key,(journal,figures)=item;research.fetch((key,journal));return [images.download((key,n)) for n in figures]
 with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
  for result in pool.map(run,EXTRA.items()):print(json.dumps(result),flush=True)
