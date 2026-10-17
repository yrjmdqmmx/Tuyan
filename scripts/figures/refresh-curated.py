"""Refresh every curated record from retained publisher context. Never grants approval.

Only missing files are downloaded. Membership and human annotations remain in
curation.json. New candidates require separate caption/image/rights review.
"""
from pathlib import Path
from urllib.parse import urlsplit
import json, runpy, subprocess

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'docs/infographic-v400/evidence'

if __name__ == '__main__':
    research = runpy.run_path(str(ROOT / 'scripts/figures/research-papers.py'))
    download = runpy.run_path(str(ROOT / 'scripts/figures/download-figures.py'))
    curation = json.loads((ROOT / 'scripts/figures/curation.json').read_text())
    sources = {}
    for identifier in curation:
        key = identifier.rsplit('.g', 1)[0]
        record = json.loads((BASE / 'papers' / (key + '.json')).read_text())
        if urlsplit(record['sourceUrl']).hostname=='journals.plos.org':
            sources[key] = urlsplit(record['sourceUrl']).path.split('/')[1]
    for source in sources.items():
        research['fetch'](source)
    for identifier in curation:
        key, number = identifier.rsplit('.g', 1)
        if key in sources:
            print(json.dumps(download['download']((key, int(number)))), flush=True)
        else:
            # Non-PLOS publisher imports retain their own DOI, JATS figure ID,
            # format and article license; never send them through the PLOS URL builder.
            evidence=json.loads((BASE/'figures'/(identifier+'.json')).read_text())
            asset=evidence['assets']['original']
            local=ROOT/asset['path']
            if not local.exists():
                subprocess.run(['curl','--fail','--location','--silent','--show-error',
                                '--max-time','45',asset['url'],'-o',str(local)],check=True)
            importer=runpy.run_path(str(ROOT/'scripts/figures/import-jats-figure.py'))
            importer['ingest'](key,BASE/'papers'/(key+'.xml'),evidence['figure']['id'],
                               evidence['metadata']['sourceUrl'],asset['url'],local)
    runpy.run_path(str(ROOT / 'scripts/figures/build-reference-catalog.py'))
