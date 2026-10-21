"""Process original static departure NPC cutouts; never touch the village cast."""
import hashlib
import json
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'docs/art/generated/departure-v1'
OUT = ROOT / 'assets/runtime/hearthwood/residents'
records = []
for name in ['adu','lanya']:
    image = Image.open(SOURCE / f'{name}-source.png').convert('RGBA')
    # Reject generation's translucent edge glow; keep the actual cutout and
    # publish crisp binary alpha, matching the established actor pipeline.
    alpha = image.getchannel('A').point(lambda a: 255 if a >= 160 else 0)
    image.putalpha(alpha)
    body = image.crop(alpha.getbbox())
    figure = Image.new('RGBA',(48,64))
    fitted = body.copy()
    fitted.thumbnail((40,54),Image.Resampling.NEAREST)
    figure.alpha_composite(fitted,((48-fitted.width)//2,63-fitted.height))
    portrait = body.crop((0,0,body.width,round(body.height*.46)))
    portrait.thumbnail((116,116),Image.Resampling.NEAREST)
    head = Image.new('RGBA',(128,128))
    head.alpha_composite(portrait,((128-portrait.width)//2,128-portrait.height))
    for variant, im in [('figure',figure),('actor',figure),('portrait',head)]:
        path = OUT/f'{name}-{variant}.png'
        im.save(path)
        records.append({'path':str(path.relative_to(ROOT)),'dimensions':list(im.size),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'source':f'docs/art/generated/departure-v1/{name}-source.png','frames':1 if variant=='actor' else None})
    p=SOURCE/f'{name}-source.png'
    records.append({'path':str(p.relative_to(ROOT)),'dimensions':[1024,1536],'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
# Scenery is cut and packed at two native pixels per world unit. Explicit
# variants follow collision footprints; the runtime never stretches a texture.
SCENERY = ROOT/'assets/runtime/hearthwood/journey'
SCENERY.mkdir(exist_ok=True)
for name, sizes in [('cliff',[(448,224),(576,256),(224,144)]),('boat',[(72,176)])]:
    image=Image.open(SOURCE/f'{name}-source.png').convert('RGBA')
    alpha=image.getchannel('A').point(lambda a:255 if a>=160 else 0)
    image.putalpha(alpha);image=image.crop(alpha.getbbox())
    for w,h in sizes:
        path=SCENERY/f'{name}-{w}.png'
        image.resize((w,h),Image.Resampling.NEAREST).save(path)
        records.append({'path':str(path.relative_to(ROOT)),'dimensions':[w,h],'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'source':f'docs/art/generated/departure-v1/{name}-source.png'})
    p=SOURCE/f'{name}-source.png'
    records.append({'path':str(p.relative_to(ROOT)),'dimensions':list(Image.open(p).size),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()})
(ROOT/'docs/art/departure-art-v1.json').write_text(json.dumps({'provenance':'Original project assets generated with built-in imagegen; no third-party references supplied.','processing':'tools/build_departure_art.py; nearest neighbour packing; alpha threshold 160; actors 54px tall / 63px baseline, front frame only; geography sprites two source pixels per world unit','rebuild':'tools/build_departure_art.py','rebuild_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'prompts':[{'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(SOURCE.glob('*prompts.json'))],'assets':records},ensure_ascii=False,indent=2)+'\n')
