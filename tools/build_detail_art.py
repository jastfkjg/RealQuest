"""Pack original fine item/furniture sheets; immutable sources and explicit cuts.

Requires Pillow. Rebuilds native two-pixel/world-unit furniture and64px UI items.
"""
import hashlib
import json
import colorsys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'assets/generated/hearthwood'
OUT=ROOT/'frontend/public/assets/hearthwood/detail'
QA=ROOT/'output/hud-interiors'
QA.mkdir(parents=True,exist_ok=True)
records=[]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()

def cut(source,rect):
    im=Image.open(source).convert('RGBA').crop(rect)
    im.putalpha(im.getchannel('A').point(lambda a:255 if a>=160 else 0))
    bounds=im.getbbox();assert bounds,rect
    return im.crop(bounds)

def save(im,category,id,source,rect,processing):
    path=OUT/category/(id+'.png');path.parent.mkdir(parents=True,exist_ok=True)
    im.save(path,optimize=True)
    records.append(dict(id=id,category=category,path=str(path.relative_to(ROOT)),
        width=im.width,height=im.height,visible_bounds=im.getbbox(),sha256=sha(path),
        size_bytes=path.stat().st_size,source=str(source.relative_to(ROOT)),
        source_sha256=sha(source),crop=rect,processing=processing))

items=SRC/'items-ui-v3.png'
assert Image.open(items).size==(1254,1254)
names=['seed','wood','stone','crop','plank','gold','backpack','journal','sprout']
contact=Image.new('RGBA',(540,540),'#dee3cf');draw=ImageDraw.Draw(contact)
for i,name in enumerate(names):
    x=i%3*418;y=i//3*418;rect=[x,y,x+418,y+418]
    im=cut(items,rect);ratio=min(60/im.width,60/im.height)
    im=im.resize((round(im.width*ratio),round(im.height*ratio)),Image.Resampling.NEAREST)
    frame=Image.new('RGBA',(64,64));frame.alpha_composite(im,((64-im.width)//2,(64-im.height)//2))
    save(frame,'items',name,items,rect,'alpha>=160; visible bounds; nearest-neighbor fit60px; centered64x64')
    preview=frame.resize((128,128),Image.Resampling.NEAREST)
    contact.alpha_composite(preview,(i%3*180+26,i//3*180+10))
    draw.text((i%3*180+14,i//3*180+148),name,fill='#27392f')
contact.save(QA/'items-contact-sheet.png')

# HUD portraits crop the original high-detail heads, avoiding enlargement of
# the already packed world sprite. Saved appearance IDs/palette identity stay.
layout=json.loads((SRC/'village-actors-v2.layout.json').read_text())
actor_source=SRC/'village-actors-v2.png'
for actor in layout['actors']:
    if not isinstance(actor['id'],int):continue
    rect=actor['frames'][0];body=cut(actor_source,rect)
    for y in range(body.height):
        for x in range(body.width):
            rr,gg,bb,aa=body.getpixel((x,y))
            if not aa:continue
            h,s,v=colorsys.rgb_to_hsv(rr/255,gg/255,bb/255)
            yy=9+y*54/body.height;variant=actor.get('palette')
            if variant=='sky' and yy>=31 and .13<h<.48 and s>.2:h,s=.55,min(.55,s)
            elif variant=='silver' and yy<31 and h<.13 and s>.28:h,s,v=.12,.13,min(1,v*.65+.35)
            elif variant=='silver' and yy>=31 and .13<h<.48 and s>.2:h,s,v=.57,.16,min(1,v+.13)
            elif variant=='sun' and yy>=26 and .48<h<.7 and s>.25:h,s=.035,.53
            else:continue
            body.putpixel((x,y),tuple(round(c*255) for c in colorsys.hsv_to_rgb(h,s,v))+(aa,))
    face=body.crop((0,0,body.width,body.width)).resize((64,64),Image.Resampling.NEAREST)
    save(face,'portraits','character-'+str(actor['id']),actor_source,rect,'original head/shoulders square crop; matching recorded palette; nearest-neighbor64px')

source=SRC/'interiors-v3.png'
assert Image.open(source).size==(1254,1254)
bands=[(0,359),(359,704),(704,975),(975,1254)]
# Width is in unchanged world units. Extra width variants retain a common
# two-native-pixel density instead of stretching an individual runtime object.
furniture=[('notice',[144]),('bookcase',[112]),('workbench',[208]),('desk',[88,96]),
    ('bed',[72]),('hearth',[72]),('planter',[24]),('barrel',[32]),
    ('anvil',[48]),('rug',[144]),('window',[40]),('chest-open',[48]),
    ('manual',[18]),('book',[32]),('lantern',[14]),('wall',[128])]
contact=Image.new('RGBA',(800,800),'#dee3cf');draw=ImageDraw.Draw(contact)
runtime=[]
for i,(name,widths) in enumerate(furniture):
    y0,y1=bands[i//4];rect=[i%4*1254//4,y0,(i%4+1)*1254//4,y1]
    original=cut(source,rect)
    for width in widths:
        id=name+'-'+str(width) if len(widths)>1 else name
        processing='alpha>=160; reviewed cut; nearest-neighbor at2nativepx/world-unit'
        if name=='workbench':
            # The existing208-unit counter is two ordinary modules. Enlarging
            # one square bench to its whole width would make tools person-sized.
            module=original.resize((208,round(original.height*208/original.width)),Image.Resampling.NEAREST)
            im=Image.new('RGBA',(416,module.height))
            im.alpha_composite(module,(0,0));im.alpha_composite(module,(208,0))
            processing+='; two adjacent104world-unit modules, no tool enlargement'
        else:
            im=original.resize((width*2,round(original.height*width*2/original.width)),Image.Resampling.NEAREST)
        save(im,'interiors',id,source,rect,processing)
        runtime.append(dict(id=id,width=im.width,height=im.height))
    preview=im.copy();preview.thumbnail((188,172),Image.Resampling.NEAREST)
    x=i%4*200;y=i//4*200
    contact.alpha_composite(preview,(x+(200-preview.width)//2,y+175-preview.height))
    draw.text((x+8,y+180),name,fill='#27392f')
contact.save(QA/'interiors-contact-sheet.png')

# Repack the previously generated closed chest at this room's common density.
closed_source=SRC/'village-details-v2.png'
rect=[884,400,1310,887]
original=cut(closed_source,rect)
im=original.resize((96,round(original.height*96/original.width)),Image.Resampling.NEAREST)
save(im,'interiors','chest-closed',closed_source,rect,'original village chest; alpha>=160; nearest-neighbor at2nativepx/world-unit')
runtime.append(dict(id='chest-closed',width=im.width,height=im.height))

manifest=dict(version=3,source='Original built-in image_gen outputs; exact prompts adjacent',
    rebuild='tools/build_detail_art.py',rebuild_sha256=sha(Path(__file__)),
    records=records)
(ROOT/'docs/art/detail-art-v3.json').write_text(json.dumps(manifest,indent=2)+'\n')
(ROOT/'frontend/src/game/detailAssets.json').write_text(json.dumps(runtime,indent=2)+'\n')
print(f'Packed {len(records)} original detail assets; {sum(r["size_bytes"] for r in records):,} runtime bytes; sources unchanged.')
