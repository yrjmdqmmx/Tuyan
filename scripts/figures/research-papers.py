"""Download public publisher XML for rights/caption research; does not approve assets."""
from pathlib import Path
import subprocess, json, xml.etree.ElementTree as ET, concurrent.futures

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'docs/infographic-v400/evidence/papers'
OUT.mkdir(parents=True, exist_ok=True)
PAPERS = {
 'pbio.1002128': 'plosbiology', 'pbio.2003779': 'plosbiology',
 'pcbi.1011436': 'ploscompbiol', 'pcbi.1013027': 'ploscompbiol',
 'pcbi.1012374': 'ploscompbiol', 'pcbi.1009809': 'ploscompbiol',
 'pcbi.1010086': 'ploscompbiol', 'pcbi.1005857': 'ploscompbiol',
 'pone.0327607': 'plosone', 'pone.0242453': 'plosone',
 'pone.0281854': 'plosone', 'pcbi.1009226': 'ploscompbiol',
 'pcbi.1011461': 'ploscompbiol', 'pdig.0000364': 'digitalhealth',
 'pgen.1011738': 'plosgenetics', 'pgen.1008646': 'plosgenetics',
 'pone.0332415': 'plosone', 'pcbi.1008009': 'ploscompbiol',
}
def text(e):
 if e is None: return ''
 def flatten(node):
  tag=node.tag.split('}')[-1]
  if tag in ['inline-formula','disp-formula']:
   tex=next((x for x in node.iter() if x.tag.split('}')[-1]=='tex-math'),None)
   if tex is not None: return '$'+''.join(tex.itertext()).strip()+'$'
  value=(node.text or '')+''.join(flatten(child)+(child.tail or '') for child in node)
  if tag=='sup':return '^{'+value+'}'
  if tag=='sub':return '_{'+value+'}'
  return value
 return flatten(e).strip()
def fetch(pair):
 key,journal=pair; doi='10.1371/journal.'+key
 url=f'https://journals.plos.org/{journal}/article/file?id={doi}&type=manuscript'
 p=OUT/(key+'.xml')
 if not p.exists():
  p.write_bytes(subprocess.check_output(['curl','--fail','--location','--silent','--show-error','--retry','2','--max-time','30',url]))
 root=ET.fromstring(p.read_bytes()); meta=root.find('.//article-meta')
 row={'doi':doi,'sourceUrl':f'https://journals.plos.org/{journal}/article?id={doi}',
      'title':text(root.find('.//article-title')),'journal':text(root.find('.//journal-title')),
      'authors':[(text(x.find('name/given-names'))+' '+text(x.find('name/surname'))).strip() if x.find('name') is not None else text(x.find('collab')) for x in meta.findall('contrib-group/contrib[@contrib-type="author"]') if x.find('name') is not None or x.find('collab') is not None],
      'year':text(meta.find('pub-date/year')),'license':text(meta.find('permissions')),
      'licenseAttributes':[x.attrib for x in meta.findall('permissions/license')], 'figures':[]}
 for f in root.findall('.//fig'):
  g=f.find('.//graphic')
  row['figures'].append({'id':f.get('id'),'label':text(f.find('label')),'caption':text(f.find('caption')),'xml':ET.tostring(f,encoding='unicode'), 'graphic':g.attrib if g is not None else {}})
 (OUT/(key+'.json')).write_text(json.dumps(row,ensure_ascii=False,indent=2))
 return {'paper':key,'figures':len(row['figures']),'license':row['license'][:200]}
if __name__=='__main__':
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
  futures={pool.submit(fetch,item):item[0] for item in PAPERS.items()}
  for task in concurrent.futures.as_completed(futures):
   try: print(json.dumps(task.result(),ensure_ascii=False),flush=True)
   except Exception as error: print(json.dumps({'paper':futures[task],'error':str(error)},ensure_ascii=False),flush=True)
