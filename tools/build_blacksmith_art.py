"""Deterministically package original blacksmith source art; never edit sources."""
import hashlib
import io
import json
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/generated/hearthwood/blacksmith-v1/character.png'
OUT = ROOT / 'assets/derived/blacksmith-v1'
CHECK = '--check' in sys.argv
sha = lambda b: hashlib.sha256(b).hexdigest()
im = Image.open(SOURCE).convert('RGBA')
assert im.size == (1536, 1024) and im.getchannel('A').getextrema()[0] == 0
clean = im.copy()
clean.putalpha(clean.getchannel('A').point(lambda a: 255 if a >= 160 else 0))
records = []
for name, rect, size, binding in [
    ('portrait', (0, 0, 1024, 1024), (320, 296), 'atlas/blacksmith'),
    ('figure', (1024, 0, 1536, 1024), (48, 64), 'village/blacksmith-figure'),
]:
    region = clean.crop(rect)
    bounds = region.getbbox()
    assert bounds and bounds[0] > 0 and bounds[2] < region.width
    cut = region.crop(bounds)
    max_size = (312, 288) if name == 'portrait' else (40, 54)
    ratio = min(max_size[0] / cut.width, max_size[1] / cut.height)
    cut = cut.resize((round(cut.width * ratio), round(cut.height * ratio)), Image.Resampling.NEAREST)
    packed = Image.new('RGBA', size)
    packed.alpha_composite(cut, ((size[0] - cut.width) // 2, size[1] - cut.height - 1))
    data = io.BytesIO(); packed.save(data, format='PNG', optimize=True); data = data.getvalue()
    target = OUT / (name + '.png')
    if CHECK:
        assert target.read_bytes() == data, target
    else:
        OUT.mkdir(parents=True, exist_ok=True); target.write_bytes(data)
    records.append(dict(path=str(target.relative_to(ROOT)), binding=binding, dimensions=size, sha256=sha(data), source=str(SOURCE.relative_to(ROOT)), source_sha256=sha(SOURCE.read_bytes()), crop=rect, alpha_bounds=bounds, processing='alpha>=160; inspected isolated cell; proportional nearest-neighbor; bottom aligned; static pose, no animation'))
interior = ROOT / 'assets/generated/hearthwood/blacksmith-v1/interior.png'
stand_source = SOURCE.parent / 'stand.png'
stand = Image.open(stand_source).convert('RGBA')
stand.putalpha(stand.getchannel('A').point(lambda a:255 if a>=160 else 0))
bounds=stand.getbbox();stand=stand.crop(bounds)
stand.thumbnail((320,180),Image.Resampling.NEAREST)
data=io.BytesIO();stand.save(data,format='PNG',optimize=True);data=data.getvalue()
target=OUT/'stand.png'
if CHECK: assert target.read_bytes()==data
else: target.write_bytes(data)
records.append(dict(path=str(target.relative_to(ROOT)),binding='ui/weapon-stand',dimensions=stand.size,sha256=sha(data),source=str(stand_source.relative_to(ROOT)),source_sha256=sha(stand_source.read_bytes()),crop=bounds,processing='alpha>=160; trim transparent bounds; proportional nearest-neighbor downsample to320x180 maximum'))
records.append(dict(path=str(interior.relative_to(ROOT)), binding='ui/blacksmith-interior', dimensions=Image.open(interior).size, sha256=sha(interior.read_bytes()), processing='original bytes; textless environment'))
manifest = dict(source='OpenAI built-in image_gen', rights='Original project art; approved project concept used as sole reference; no third-party assets or fonts', approval='Concept approved 2026-10-23; actual Cocos render pending owner review', records=records, processor='tools/build_blacksmith_art.py', processor_sha256=sha(Path(__file__).read_bytes()), prompts=[dict(path=str(p.relative_to(ROOT)), sha256=sha(p.read_bytes())) for p in sorted(SOURCE.parent.glob('*.prompt.txt'))])
target = ROOT / 'docs/art/blacksmith-art-v1.json'
data = json.dumps(manifest, ensure_ascii=False, indent=2) + '\n'
if CHECK:
    assert target.read_text() == data
else:
    target.write_text(data)
print('PASS original blacksmith portrait, static resident figure and textless environment' + (' rebuild' if CHECK else ' packaging'))
