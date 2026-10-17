"""Compile reviewed case annotations. Missing assets/rights never become usable."""
from pathlib import Path
import json, shutil, hashlib
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'docs/infographic-v400/evidence'
curation=json.loads((ROOT/'scripts/figures/curation.json').read_text())
CORPUS_VERSION='journal-2026-10-10.v2'
records=[]
for identifier,review in curation.items():
 p=BASE/'figures'/(identifier+'.json')
 if not p.exists():
  records.append({'id':'journal_'+identifier,'figureTypeId':review['type'],'license':{'status':'pending'},'reason':'原始图像尚未成功保存，不进入可用图库。'})
  continue
 d=json.loads(p.read_text());meta=d['metadata'];caption=d['figure']['caption']
 grants=[a.get('{http://www.w3.org/1999/xlink}href','') for a in meta['licenseAttributes']]
 license_url=next((g for g in grants if '/by/4.0' in g or '/zero/1.0' in g),'')
 license_id='CC0-1.0' if '/zero/1.0' in license_url else 'CC-BY-4.0' if license_url else 'unknown'
 status=review.get('status','verified') if license_url else 'pending'
 # No automated inference from OA/downloadability. These entries were inspected
 # using complete publisher XML + captions and contact sheets; the annotations
 # record semantic/third-party exceptions explicitly. New entries require review.
 reviewed=bool(review.get('design') and review.get('caution'))
 if review.get('reviewEvidence'):
  audit=next((r for r in json.loads((ROOT/review['reviewEvidence']).read_text()) if r['figureId']==identifier),None)
  assert audit and audit['status']=='verified', f'Missing explicit approval: {identifier}'
  assert audit['articleXmlSha256']==hashlib.sha256((ROOT/audit['articleXml']).read_bytes()).hexdigest(), identifier
  assert audit['originalCaptionSha256']==hashlib.sha256(caption.encode()).hexdigest(), identifier
  assert audit['largeSha256']==d['assets']['large']['sha256'] and audit['originalSha256']==d['assets']['original']['sha256'], identifier
  assert audit['grantUrl']==license_url and set(audit['permissionReview'])=={'storage','display','modelInput','adaptation'}, identifier
 if not reviewed and status=='verified':status='pending'
 image=d['assets']['large'];original=d['assets']['original']
 for asset in [image,original]:
  assert hashlib.sha256((ROOT/asset['path']).read_bytes()).hexdigest()==asset['sha256']
 attribution=f"{', '.join(meta['authors'])}. {meta['title']}. {meta['journal']} ({meta['year']}), {d['figure']['label']}. {meta['doi']}. {license_id}."
 row={'id':'journal_'+identifier,'source':'journal-curated','corpusVersion':CORPUS_VERSION,'figureTypeId':review['type'],
  'panelTypes':[{'panel':panel,'typeId':typ} for panel,typ in review.get('panels',{}).items()],
  'title':meta['title'],'titleZh':review.get('design',review.get('reason',meta['title'])),'summary':caption,'originalCaption':caption,
  'shortIntroZh':review.get('design','待核验论文线索'),'detailZh':review.get('design','')+' '+review.get('caution',''),
  'paper':{k:meta[k] for k in ['title','authors','journal','year','doi','sourceUrl']},'figureNumber':d['figure']['label'],
  'researchDomain':review['domain'],'layout':review.get('layout','unreviewed'),'density':review.get('density','high' if review.get('panels') or 'grid' in review.get('layout','') else 'medium'),
  'tags':[review['type'],review['domain'],review.get('layout','')],'designLessons':[review.get('design','')],
  'doNotTransfer':[review.get('caution',''),'原论文的实体名称、样本、数值、显著性、模型性能与科学结论。'],
  'imageUrl':image['url'],'localPreviewUrl':'/reference-library/'+identifier+'.png',
  'assets':d['assets'],'modifications':[],
  'license':{'id':license_id,'url':license_url,'status':status,'attributionRequired':license_id=='CC-BY-4.0',
   'verifiedAt':'2026-10-10','basis':meta['license'],'evidenceFile':str((BASE/'papers'/(d['paper']+'.xml')).relative_to(ROOT)),
   'captionEvidence':d['figure']['xml'],'reviewEvidence':review.get('reviewEvidence'),'thirdPartyReview':review.get('reason','已检查出版方XML、全文素材声明、图注和图像；未发现该图另行限制或第三方署名例外。'),
   'permissions':{use:status=='verified' for use in ['storage','display','modelInput','adaptation']},
   'conditions':['保留论文、作者、图号、来源及许可链接（CC0为学术溯源要求，非额外许可义务）','如修改，明确说明修改并保留原图','不暗示原作者认可新作品','仅基于许可的复制与改编权判断模型输入；不额外授予训练、商标、隐私等权利'],
   'attribution':attribution},
  'quality':{'status':'reviewed' if status=='verified' else status,'inspection':'publisher-caption-and-image','reason':review.get('reason','结构与科学编码可作为所标注类型的参考；局限写在 doNotTransfer 中。')}}
 records.append(row)
 if status=='verified':
  dest=ROOT/'apps/web/public/reference-library'/f'{identifier}.png';dest.parent.mkdir(parents=True,exist_ok=True);shutil.copyfile(ROOT/image['path'],dest)
out=ROOT/'packages/figure-taxonomy/src/references.js'
out.write_text('// Generated from individually reviewed publisher records; see scripts/figures/curation.json.\nexport const JOURNAL_REFERENCES = '+json.dumps(records,ensure_ascii=False,indent=2)+'\n')
(ROOT/'docs/infographic-v400/reference-register.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
coverage={}
for row in records:
 if row['license']['status']!='verified':continue
 for type_id in set([row['figureTypeId']]+[p['typeId'] for p in row['panelTypes']]):coverage[type_id]=coverage.get(type_id,0)+1
(ROOT/'packages/figure-taxonomy/src/reference-coverage.js').write_text('export const REFERENCE_COVERAGE = '+json.dumps(coverage,ensure_ascii=False,indent=2)+'\n')
examples={}
for row in records:
 if row['license']['status']!='verified':continue
 for type_id in set([row['figureTypeId']]+[p['typeId'] for p in row['panelTypes']]):
  examples.setdefault(type_id,[]).append({'id':row['id'],'paperTitle':row['paper']['title'],'url':row['paper']['sourceUrl'],'figure':row['figureNumber'],'panels':[p['panel'] for p in row['panelTypes'] if p['typeId']==type_id],'boundary':row['doNotTransfer'][0]})
(ROOT/'packages/figure-taxonomy/src/reference-examples.js').write_text('export const REFERENCE_EXAMPLES = '+json.dumps(examples,ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'records':len(records),'verified':sum(r['license']['status']=='verified' for r in records),'coveredTypes':len(coverage)},ensure_ascii=False))
