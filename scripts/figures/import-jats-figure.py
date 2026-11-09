"""Import a publisher figure and JATS provenance. This does not approve its license.

Usage: python3 scripts/figures/import-jats-figure.py KEY XML FIG_ID SOURCE_URL IMAGE_URL LOCAL_IMAGE
The original publisher PNG is retained byte-for-byte (never relabelled as TIFF).
"""
from pathlib import Path
import sys, json, hashlib, shutil, runpy, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'docs/infographic-v400/evidence'
text = runpy.run_path(str(ROOT / 'scripts/figures/research-papers.py'))['text']

def ingest(key, xml_path, figure_id, source_url, image_url, image_path):
    xml = Path(xml_path).read_bytes()
    root = ET.fromstring(xml)
    meta = root.find('./front/article-meta')
    figure = root.find(f'.//fig[@id="{figure_id}"]')
    assert meta is not None and figure is not None
    doi = text(meta.find('article-id[@pub-id-type="doi"]'))
    permissions = meta.find('permissions')
    # Select the article license explicitly. A separate CC0 data waiver must
    # never be treated as the illustration's license.
    links = [n.get('{http://www.w3.org/1999/xlink}href', '') for n in permissions.iter()]
    article_grant = next((v for v in links if '/licenses/by/4.0/' in v), '')
    row = {
        'doi': doi, 'sourceUrl': source_url,
        'title': text(meta.find('title-group/article-title')),
        'journal': text(root.find('./front/journal-meta/journal-title-group/journal-title')),
        'authors': [(text(n.find('name/given-names'))+' '+text(n.find('name/surname'))).strip()
                    for group in meta.findall('contrib-group') for n in group.findall('contrib')
                    if n.find('name') is not None and
                    (n.get('contrib-type')=='author' or group.get('content-type')=='author')],
        'year': text(meta.find('pub-date/year')),
        'license': text(permissions),
        'licenseAttributes': [{'{http://www.w3.org/1999/xlink}href':article_grant}] if article_grant else [],
    }
    f = {'id':figure_id, 'label':text(figure.find('label')),
         'caption':text(figure.find('caption')), 'xml':ET.tostring(figure,encoding='unicode'),
         'graphic':figure.find('.//graphic').attrib}
    assert row['authors'] and row['title'] and row['year'] and row['doi'], 'Incomplete bibliographic record'
    identifier = key + '.g' + ''.join(c for c in figure_id if c.isdigit()).zfill(3)
    source = Path(image_path)
    assert source.read_bytes().startswith(b'\x89PNG\r\n\x1a\n')
    asset_path = ROOT / 'apps/paperbanana-api/assets/reference-library' / (identifier+'.png')
    if source.resolve()!=asset_path.resolve():
        shutil.copyfile(source, asset_path)
    asset = {'url':image_url, 'path':str(asset_path.relative_to(ROOT)),
             'bytes':asset_path.stat().st_size, 'sha256':hashlib.sha256(asset_path.read_bytes()).hexdigest()}
    (BASE/'papers'/(key+'.xml')).write_bytes(xml)
    (BASE/'papers'/(key+'.json')).write_text(json.dumps({**row,'figures':[f]},ensure_ascii=False,indent=2))
    record = {'id':identifier,'paper':key,'metadata':row,'figure':f,
              'assets':{'large':asset,'original':dict(asset)}}
    (BASE/'figures'/(identifier+'.json')).write_text(json.dumps(record,ensure_ascii=False,indent=2))
    print(identifier)

if __name__ == '__main__':
    ingest(*sys.argv[1:])
