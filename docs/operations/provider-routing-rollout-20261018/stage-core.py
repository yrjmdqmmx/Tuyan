import io,tarfile,json,subprocess,hashlib
from remote import *
repo=__import__('pathlib').Path('/Users/a1-6/.codex/worktrees/tuyan-hangzhou-oss-migration/paperbanana（tuyan）')
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=repo,text=True).strip()
expected='sha256:631f11b065a9974c6f6034b4e37546ffc7e17199d2bd81ea2a9edaee775ea85d'
base='tuyan-core-hangzhou:f15510ce1a4d'
actual=run('hz',"docker image inspect "+base+" --format '{{.Id}}'").decode().strip()
assert actual==expected
folder='/opt/paperbanana/regional-routing-'+sha[:12]
image='tuyan-core-hangzhou:'+sha[:12]
blob=(repo/'apps/paperbanana-api/dist/server.cjs').read_bytes()
files={'server.cjs':blob,'build-provenance.json':(json.dumps({'codeSha':sha})+'\n').encode(),'Dockerfile':f'FROM {base}\nCOPY --chown=node:node server.cjs /app/dist/server.cjs\nCOPY --chown=node:node build-provenance.json /app/build-provenance.json\nLABEL org.opencontainers.image.revision="{sha}"\n'.encode(),'source.tar':subprocess.check_output(['git','archive','HEAD'],cwd=repo)}
buf=io.BytesIO()
with tarfile.open(fileobj=buf,mode='w:gz') as t:
 for name,data in files.items():
  info=tarfile.TarInfo(name);info.size=len(data);info.mode=0o644;t.addfile(info,io.BytesIO(data))
run('hz','mkdir '+folder)
run('hz','tar -xzf - -C '+folder,buf.getvalue())
output=run('hz','docker build --pull=false -t '+image+' '+folder,timeout=300)
(ROOT/'image-build.txt').write_bytes(output)
image_id=run('hz',"docker image inspect "+image+" --format '{{.Id}}'").decode().strip()
receipt={'code_sha':sha,'base_image':expected,'base_tag':base,'image_tag':image,'image_id':image_id,'server_cjs_sha256':hashlib.sha256(blob).hexdigest(),'staging_directory':folder,'preserved_production_fix':'f15510ce1a4d97ca117b01892cc9837638a51334'}
(ROOT/'image-build.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
