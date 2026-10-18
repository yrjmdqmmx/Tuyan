import pathlib,json,collections,statistics,csv
root=pathlib.Path(__file__).parent
manifest=json.loads(root.joinpath('manifest.json').read_text());allrows=[];groups=collections.defaultdict(list)
for f in root.glob('*.jsonl'):
 for line in f.read_text().splitlines():
  r=json.loads(line);allrows.append(r);groups[(r['id'],r['node'])].append(r)
summary=[]
for (id,node),rows in sorted(groups.items()):
 good=[r for r in rows if r['curl_exit']==0 and r.get('http_code',0)>0]
 times=[r['time_starttransfer']*1000 for r in good]
 summary.append(dict(id=id,node=node,n=len(rows),transport_ok=len(good),http=dict(collections.Counter(str(r.get('http_code')) for r in rows)),median_ms=round(statistics.median(times),1) if times else None,max_ms=round(max(times),1) if times else None,min_ms=round(min(times),1) if times else None,tls_median_ms=round(statistics.median(r['time_appconnect']*1000 for r in good),1) if good else None,bytes=sum(r.get('size_download') or 0 for r in rows)))
root.joinpath('summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2)+'\n')
lookup={(x['id'],x['node']):x for x in summary}
print('TOTAL',len(allrows),'HTTP complete',sum(x['curl_exit']==0 for x in allrows),'downloads MiB',round(sum(x.get('size_download') or 0 for x in allrows)/1048576,2))
nodes=['hangzhou','hongkong','singapore','hangzhou-via-singapore','hangzhou-via-hongkong']
print('id | HZ | HK | SG | HZ>SG | HZ>HK')
for m in manifest:
 cols=[]
 for node in nodes:
  x=lookup.get((m['id'],node));cols.append('-' if not x else str(x['median_ms'])+' '+str(x['http'])+(' FAIL:'+str(x['n']-x['transport_ok']) if x['n']!=x['transport_ok'] else ''))
 print(m['id'],' | '.join(cols))
