"""Reproducible packing of original generated village art; source PNGs stay intact.

Nearest-neighbor cuts normalize source illustration cells to native world pixels.
Alpha threshold removes generator fringe, never inventing sprites/animation frames.
"""
import argparse
import hashlib
import json
import colorsys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/generated/hearthwood'
OUT = ROOT / 'assets/runtime/hearthwood/village'
OUT.mkdir(parents=True, exist_ok=True)
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--scenery-only', action='store_true')
args = parser.parse_args()
records = []
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()

def opaque(im):
    im = im.convert('RGBA')
    im.putalpha(im.getchannel('A').point(lambda a: 255 if a >= 160 else 0))
    return im

def save(im, name, source, rect, note):
    path = OUT / (name + '.png')
    im.save(path, optimize=True)
    records.append(dict(id=name, path=str(path.relative_to(ROOT)), width=im.width,
                        height=im.height, sha256=sha(path), size_bytes=path.stat().st_size,
                        source=str(source.relative_to(ROOT)), source_sha256=sha(source),
                        crop=rect, processing=note, visible_bounds=im.getbbox()))

scenery = SOURCE / 'village-scenery-v2.png'
im = Image.open(scenery).convert('RGBA')
assert im.size == (1254, 1254), 'Review crop geometry before replacing source'
bands = [(0, 388), (388, 756), (756, 974), (974, 1254)]
names = ['home','workshop','library','guild','oak','oak-alt','fir','birch',
         'shrub','flowers','crates','bench','board','wood','stone','bridge']
widths = [144,120,144,160,76,76,68,64,30,20,44,74,48,36,32,104]
sheet = Image.new('RGBA', (640,640), '#dee3cf')
draw = ImageDraw.Draw(sheet)
for i,(name,width) in enumerate(zip(names,widths)):
    width *= 2  # Two native art pixels per world unit; geometry stays unchanged.
    y0,y1 = bands[i//4]
    rect = [i%4*1254//4, y0, (i%4+1)*1254//4, y1]
    cut = opaque(im.crop(rect))
    bounds = cut.getbbox()
    assert bounds, name
    cut = cut.crop(bounds)
    height = round(cut.height * width/cut.width)
    if name == 'bridge': height = 152
    cut = cut.resize((width,height), Image.Resampling.NEAREST)
    save(cut,name,scenery,rect,'alpha>=160; trim visible bounds; nearest-neighbor native world size')
    preview = cut.copy(); preview.thumbnail((146,140),Image.Resampling.NEAREST)
    x,y = i%4*160,i//4*160
    sheet.alpha_composite(preview,(x+(160-preview.width)//2,y+140-preview.height))
    draw.text((x+5,y+143),name,fill='#27392f')
(ROOT/'output/village-fine').mkdir(parents=True, exist_ok=True)
sheet.save(ROOT/'output/village-fine/scenery-contact-sheet.png')

details=SOURCE/'village-details-v2.png'
detail_image=Image.open(details).convert('RGBA')
assert detail_image.size==(1774,887)
detail_cuts=[
    ('grass',[0,0,375,400],20),('grass-patch',[375,0,884,400],42),
    ('bank-stones',[884,0,1310,400],24),('step',[1310,0,1774,400],43),
    ('fence',[0,400,555,887],84),('lantern',[555,400,884,887],18),
    ('chest',[884,400,1310,887],36),('rune',[1310,400,1774,887],62),
]
for name,rect,width in detail_cuts:
    width *= 2
    cut=opaque(detail_image.crop(rect));cut=cut.crop(cut.getbbox())
    cut=cut.resize((width,round(cut.height*width/cut.width)),Image.Resampling.NEAREST)
    save(cut,name,details,rect,'alpha>=160; measured isolated cut; trim; nearest-neighbor native world size')

if not args.scenery_only:
    # Geometry is filled from the inspected source, not inferred from a filename.
    layout = json.loads((SOURCE/'village-actors-v2.layout.json').read_text())
    source = SOURCE/'village-actors-v2.png'
    actors = Image.open(source).convert('RGBA')
    assert list(actors.size) == layout['source_size']
    for actor in layout['actors']:
        frames=[]
        for rect in actor['frames']:
            cut=opaque(actors.crop(rect)); bounds=cut.getbbox()
            assert bounds, (actor['id'],rect)
            cut=cut.crop(bounds)
            # Actors render at 2/3 scale; each silhouette stays 36 world units tall.
            ratio=min(40/cut.width,54/cut.height)
            cut=cut.resize((round(cut.width*ratio),round(cut.height*ratio)),Image.Resampling.NEAREST)
            frame=Image.new('RGBA',(48,64))
            frame.alpha_composite(cut,((48-cut.width)//2,63-cut.height))
            # Explicit, reproducible outfit ramps for the three retained extra
            # appearance IDs. Animation/geometry remain the inspected originals.
            if actor.get('palette'):
                for y in range(64):
                    for x in range(48):
                        rr,gg,bb,aa=frame.getpixel((x,y))
                        if not aa: continue
                        h,s,v=colorsys.rgb_to_hsv(rr/255,gg/255,bb/255)
                        variant=actor['palette']
                        if variant=='sky' and y>=31 and .13<h<.48 and s>.2:
                            h,s=.55,min(.55,s)
                        elif variant=='silver' and y<31 and h<.13 and s>.28:
                            h,s,v=.12,.13,min(1,v*.65+.35)
                        elif variant=='silver' and y>=31 and .13<h<.48 and s>.2:
                            h,s,v=.57,.16,min(1,v+.13)
                        elif variant=='sun' and y>=26 and .48<h<.7 and s>.25:
                            h,s=.035,.53
                        else: continue
                        rgb=tuple(round(c*255) for c in colorsys.hsv_to_rgb(h,s,v))
                        frame.putpixel((x,y),rgb+(aa,))
            frames.append(frame)
        assert len(frames)==16
        packed=Image.new('RGBA',(192,256))
        for i,frame in enumerate(frames): packed.alpha_composite(frame,(i%4*48,i//4*64))
        save(packed,'actor-'+str(actor['id']),source,actor['frames'],'reviewed directional/walk cells; alpha>=160; nearest-neighbor 48x64 frame packing; palette='+str(actor.get('palette')))
        portrait=Image.new('RGBA',(64,64)); portrait.alpha_composite(frames[0],(8,0))
        save(portrait,'character-'+str(actor['id']),source,actor['frames'][0],'same idle actor; centered 64x64 body')
        face=frames[0].crop((8,8,40,40)).resize((40,40),Image.Resampling.NEAREST)
        save(face,'portrait-'+str(actor['id']),source,actor['frames'][0],'same idle actor head/shoulders crop; 40x40 HUD portrait')

    contact=Image.new('RGBA',(1024,680),'#dee3cf');labels=ImageDraw.Draw(contact)
    for col,actor in enumerate(layout['actors']):
        packed=Image.open(OUT/('actor-'+str(actor['id'])+'.png')).convert('RGBA')
        face=Image.open(OUT/('portrait-'+str(actor['id'])+'.png')).convert('RGBA').resize((80,80),Image.Resampling.NEAREST)
        contact.alpha_composite(face,(col*128+24,4))
        labels.text((col*128+8,90),str(actor['id']),fill='#27392f')
        for row in range(4):
            frame=packed.crop((144,row*64,192,row*64+64)).resize((96,128),Image.Resampling.NEAREST)
            contact.alpha_composite(frame,(col*128+16,112+row*138))
    contact.save(ROOT/'output/village-fine/actors-contact-sheet.png')

manifest={'version':2,'rebuild':'tools/build_village_art.py','rebuild_sha256':sha(Path(__file__)),
          'style_reference':'docs/art/references/village-fine-concept-v1.png',
          'source':'Original built-in image_gen output; exact prompts adjacent to source PNGs',
          'scenery_world_scale':0.5,'actor_world_scale':2/3,
          'actor_layout':'assets/generated/hearthwood/village-actors-v2.layout.json',
          'actor_layout_sha256':sha(SOURCE/'village-actors-v2.layout.json'),
          'records':records}
(ROOT/'docs/art/village-art-v2.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Packed {len(records)} village images; source PNGs preserved; contact sheet saved.')
