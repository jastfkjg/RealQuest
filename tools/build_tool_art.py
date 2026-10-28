"""Deterministic slicing of original tool/resource atlases; never edit sources."""
import hashlib
import json
import sys
from io import BytesIO
from pathlib import Path
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[1]
CHECK='--check' in sys.argv
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
records=[]
sources=[]
contact=Image.new('RGBA',(1024,1024),'#e3e3cf')

def save(im,relative,binding,source,crop,role):
    path=ROOT/relative;data=BytesIO();im.save(data,format='PNG')
    if CHECK:
        assert path.read_bytes()==data.getvalue(),relative
    else:
        path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data.getvalue())
    records.append(dict(path=relative,binding=binding,source=source,crop=list(crop),role=role,
                        width=im.width,height=im.height,sha256=sha(path)))

for label in ['tools','resources']:
    source=f'assets/generated/hearthwood/tools-v1/{label}.png'
    im=Image.open(ROOT/source).convert('RGBA');assert im.size==(1536,1024)
    prompt=source.replace('.png','.prompt.txt')
    sources.append(dict(path=source,sha256=sha(ROOT/source),width=im.width,height=im.height,
                        prompt=prompt,prompt_sha256=sha(ROOT/prompt)))
    for row in range(4):
        for col in range(4):
            rect=(col*384,row*256,(col+1)*384,(row+1)*256);cell=im.crop(rect)
            alpha=cell.getchannel('A').point(lambda a:255 if a>=160 else 0);cell.putalpha(alpha)
            # Discard isolated neighbor-cell slivers without recoloring sprites.
            pixels=alpha.load();seen=set();parts=[]
            for yy in range(256):
                for xx in range(384):
                    if not pixels[xx,yy] or (xx,yy) in seen:continue
                    pending=[(xx,yy)];part=[];seen.add((xx,yy))
                    while pending:
                        ax,ay=pending.pop();part.append((ax,ay))
                        for nx,ny in ((ax-1,ay),(ax+1,ay),(ax,ay-1),(ax,ay+1)):
                            if 0<=nx<384 and 0<=ny<256 and pixels[nx,ny] and (nx,ny) not in seen:
                                seen.add((nx,ny));pending.append((nx,ny))
                    parts.append(part)
            largest=max(map(len,parts));clean=Image.new('L',(384,256));mask=clean.load()
            for part in parts:
                keep=len(part)==largest if label=='tools' else len(part)==largest or len(part)>=largest*.02 and min(y for x,y in part)>6 and max(y for x,y in part)<249
                if keep:
                    for xx,yy in part:mask[xx,yy]=255
            alpha=clean;cell.putalpha(alpha)
            bounds=alpha.getbbox();assert bounds
            # Keep real generated alpha, discarding only near-transparent matte.
            sprite=cell.crop(bounds)
            if label=='tools':
                key=['hoe','axe','pickaxe','watering_can'][col]+'-'+str(row)
                sprite.thumbnail((84,84),Image.Resampling.NEAREST)
                out=Image.new('RGBA',(96,96));out.alpha_composite(sprite,((96-sprite.width)//2,(96-sprite.height)//2))
                save(out,f'assets/derived/tools-v1/tools/{key}.png','tools/'+key,source,rect,'tool-tier-icon')
            else:
                key=(['stone','copper','iron','gold'][col]+'-'+['whole','cracked','depleted'][row]) if row<3 else ['stump','stump-cracked','sapling','tree_seed'][col]
                scale=.32 if key!='sapling' else .25
                sprite=sprite.resize((round(sprite.width*scale),round(sprite.height*scale)),Image.Resampling.NEAREST)
                out=Image.new('RGBA',(128,128));out.alpha_composite(sprite,((128-sprite.width)//2,112-sprite.height))
                if key!='tree_seed':save(out,f'assets/derived/tools-v1/resources/{key}.png','gathering/'+key,source,rect,'resource-state')
                if row==0 and col>0 or key=='tree_seed':
                    item=['','copper_ore','iron_ore','gold_ore'][col] if row==0 else 'tree_seed'
                    icon=cell.crop(bounds);icon.thumbnail((58,58),Image.Resampling.NEAREST)
                    small=Image.new('RGBA',(64,64));small.alpha_composite(icon,((64-icon.width)//2,(64-icon.height)//2))
                    save(small,f'assets/derived/tools-v1/items/{item}.png','items/'+item,source,rect,'collected-material-icon')
            contact.alpha_composite(out,(col*256+(256-out.width)//2,(row+(0 if label=='tools' else 4))*128))

manifest=dict(schema_version=1,creator='OpenAI built-in image_gen; original RealQuest art',
              license='Original project-generated artwork; no third-party sprites',sources=sources,
              processing='4x4 cells; alpha>=160; tools largest connected component; resources components>=2% largest and no edge slivers; nearest-neighbor; fixed.32 resource scale, sapling.25; 96px tool icons and128px resource frames, foot baseline112',
              script='tools/build_tool_art.py',script_sha256=sha(Path(__file__)),records=records)
path=ROOT/'docs/art/tool-art-v1.json'
if CHECK:assert json.loads(path.read_text())==manifest
else:
    path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    (ROOT/'output/tools-130').mkdir(exist_ok=True,parents=True);contact.save(ROOT/'output/tools-130/art-contact.png')
print(('Verified' if CHECK else 'Built'),len(records),'tool and resource sprites')
