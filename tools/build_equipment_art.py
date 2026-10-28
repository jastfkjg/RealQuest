"""Slice the original atlas without changing source art. Nearest-neighbor runtime icons."""
import hashlib,json,sys
from io import BytesIO
from pathlib import Path
from PIL import Image,ImageOps
root=Path(__file__).resolve().parents[1]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
source=root/'assets/generated/hearthwood/equipment-v1/atlas.png'
im=Image.open(source).convert('RGBA');assert im.size==(1536,1024)
rows=json.loads((root/'backend/app/equipment_catalog.json').read_text())['equipment']
assert len(rows)==24
records=[];contact=Image.new('RGBA',(960,640),'#e8dfc5')
for i,g in enumerate(rows):
 col,row=i%6,i//6;rect=[col*256,row*256,(col+1)*256,(row+1)*256]
 cell=im.crop(rect);cell.putalpha(cell.getchannel('A').point(lambda x:255 if x>=160 else 0))
 bounds=cell.getchannel('A').getbbox();assert bounds
 sprite=cell.crop(bounds);sprite.thumbnail((88,88),Image.Resampling.NEAREST)
 out=Image.new('RGBA',(96,96));out.alpha_composite(sprite,((96-sprite.width)//2,(96-sprite.height)//2))
 rel=f'assets/derived/equipment-v1/{g["id"]}.png';p=root/rel;p.parent.mkdir(parents=True,exist_ok=True)
 if '--check' in sys.argv:
  b=BytesIO();out.save(b,format='PNG');assert p.read_bytes()==b.getvalue(),rel
 else:out.save(p)
 records.append(dict(id=g['id'],source=str(source.relative_to(root)),source_sha256=sha(source),crop=rect,alpha_bounds=list(bounds),alpha_threshold=160,path=rel,binding='items/'+g['id'],width=96,height=96,sha256=sha(p)))
 contact.alpha_composite(out.resize((144,144),Image.Resampling.NEAREST),(col*160+8,row*160+8))
manifest=dict(schema_version=1,creator='OpenAI built-in image_gen; original RealQuest project artwork',license='Original project-generated artwork; no third-party assets',script='tools/build_equipment_art.py',script_sha256=sha(Path(__file__)),sources=[dict(path=str(source.relative_to(root)),sha256=sha(source),width=1536,height=1024,prompt='assets/generated/hearthwood/equipment-v1/atlas.prompt.txt',prompt_sha256=sha(source.with_suffix('.prompt.txt')))],processing='6x4 measured equal256px cells; alpha>=160; nearest-neighbor downscale and center in96px transparent icons; no source changes',records=records)
if '--check' not in sys.argv:
 (root/'docs/art/equipment-art-v1.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
 (root/'output/cocos-weapons-123/art-contact.png').parent.mkdir(parents=True,exist_ok=True);contact.save(root/'output/cocos-weapons-123/art-contact.png')
print('Verified' if '--check' in sys.argv else 'Built',len(records),'equipment sprites')
