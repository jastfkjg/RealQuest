"""Pack three inspected original NPC sheets; preserve sources and player art.

Grid cells were visually inspected: 4 directions (down/up/left/right), 3 rows
(idle/left step/right step). Repack to the established idle/A/idle/B runtime.
"""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT/'assets/runtime/hearthwood/residents'
OUT.mkdir(parents=True,exist_ok=True)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
records=[]
contact=Image.new('RGBA',(720,420),'#f4efde')
draw=ImageDraw.Draw(contact)
for index,npc in enumerate(['lia','noah','mira']):
    source=ROOT/f'assets/generated/hearthwood/npc-life/{npc}-v1.png'
    im=Image.open(source).convert('RGBA')
    assert im.size==(1024,1536)
    assert im.getchannel('A').getextrema()[0]==0
    clean=im.copy()
    clean.putalpha(clean.getchannel('A').point(lambda a:255 if a>=160 else 0))
    frames=[]; cuts=[]
    for row in [0,1,0,2]:
        for col in range(4):
            columns=[0,256,488,768,1024] if npc=='mira' and row==2 else [0,256,512,768,1024]
            rect=[columns[col],row*512,columns[col+1],(row+1)*512]
            cut=clean.crop(rect);bounds=cut.getbbox();assert bounds
            # Transparent gutters ensure no neighboring body leaks into a cell.
            assert bounds[0]>0 and bounds[2]<rect[2]-rect[0] and bounds[1]>4 and bounds[3]<508,(npc,row,col,bounds)
            cut=cut.crop(bounds)
            ratio=min(40/cut.width,54/cut.height)
            cut=cut.resize((round(cut.width*ratio),round(cut.height*ratio)),Image.Resampling.NEAREST)
            frame=Image.new('RGBA',(48,64));frame.alpha_composite(cut,((48-cut.width)//2,63-cut.height))
            frames.append(frame);cuts.append(rect)
    packed=Image.new('RGBA',(192,256))
    for i,frame in enumerate(frames):packed.alpha_composite(frame,(i%4*48,i//4*64))
    front=clean.crop((0,0,256,512));bounds=front.getbbox();front=front.crop(bounds)
    head=front.crop((0,0,front.width,round(front.height*.48)))
    portrait=Image.new('RGBA',(128,128));head.thumbnail((120,120),Image.Resampling.NEAREST)
    portrait.alpha_composite(head,((128-head.width)//2,128-head.height))
    for name,image,crop,processing in [
        ('actor',packed,cuts,'alpha>=160; inspected 4x3 cells repacked idle/A/idle/B; nearest-neighbor 48x64 feet-aligned frames'),
        ('portrait',portrait,[0,0,256,512],'alpha>=160; front-cell visible bounds, upper48%; proportional nearest-neighbor to128px'),
        ('figure',frames[0],[0,0,256,512],'byte-exact first runtime frame; 48x64')]:
        p=OUT/f'{npc}-{name}.png';image.save(p,optimize=True)
        records.append({'id':f'{name}-{npc}','path':str(p.relative_to(ROOT)),'width':image.width,'height':image.height,
                        'sha256':sha(p),'size_bytes':p.stat().st_size,'source':str(source.relative_to(ROOT)),
                        'source_sha256':sha(source),'crop':crop,'processing':processing})
    contact.alpha_composite(portrait,(index*240+56,12))
    draw.text((index*240+12,150),npc+' / NPC only',fill='#27392f')
    for i in range(4):
        contact.alpha_composite(frames[i].resize((72,96),Image.Resampling.NEAREST),(index*240+(i%2)*100+12,175+(i//2)*110))
contact.convert('RGB').save(ROOT/'output/npc-life/identities.png')
# Preserve and compare every player binding. NPC files must not duplicate any.
players=list((ROOT/'assets/runtime/hearthwood/village').glob('actor-[0-5].png'))
assert len(players)==6
for p in OUT.glob('*-actor.png'):
    assert all(p.read_bytes()!=q.read_bytes() for q in players)
manifest={'creator':'OpenAI built-in image_gen','license':'Original generated project artwork; no third-party input',
          'status':'candidate_owner_render_review_pending','rebuild':'tools/build_resident_art.py',
          'rebuild_sha256':sha(Path(__file__)),'player_assets_preserved':[{ 'path':str(p.relative_to(ROOT)),'sha256':sha(p)} for p in players],
          'records':records,'prompts':[{'path':f'assets/generated/hearthwood/npc-life/{n}-v1.prompt.txt','sha256':sha(ROOT/f'assets/generated/hearthwood/npc-life/{n}-v1.prompt.txt')} for n in ['lia','noah','mira']]}
(ROOT/'docs/art/resident-art-v1.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
print('Packed9 original runtime assets;',sum(r['size_bytes'] for r in records),'bytes; six player sheets unchanged')
