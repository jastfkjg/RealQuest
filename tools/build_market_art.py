"""Reproducibly pack original generated market sprites, preserving source/alpha."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/runtime/hearthwood/market'
OUT.mkdir(parents=True, exist_ok=True)
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
records = []
for name, width in [('shop', 272), ('counter', 416)]:
    source = ROOT / f'assets/generated/hearthwood/market-{name}-v1.png'
    im = Image.open(source).convert('RGBA')
    bounds = im.getbbox()
    assert bounds and im.getchannel('A').getextrema()[0] == 0
    cropped = im.crop(bounds)
    packed = cropped.resize((width, round(cropped.height * width / cropped.width)), Image.Resampling.NEAREST)
    target = OUT / f'{name}.png'
    packed.save(target, optimize=True)
    records.append({'id': 'market-' + name, 'source': str(source.relative_to(ROOT)), 'source_sha256': sha(source),
        'source_dimensions': list(im.size), 'crop': list(bounds), 'path': str(target.relative_to(ROOT)),
        'width': packed.width, 'height': packed.height, 'sha256': sha(target), 'size_bytes': target.stat().st_size,
        'processing': 'Transparent bounds crop; nearest-neighbor proportional resize to two native pixels/world unit; alpha preserved; source unchanged'})
manifest = {'creator': 'OpenAI built-in image_gen', 'license': 'Original generated project artwork; no third-party pack',
    'status': 'candidate_pending_owner_visual_review', 'rebuild': str(Path(__file__).relative_to(ROOT)),
    'rebuild_sha256': sha(Path(__file__)), 'records': records}
(ROOT / 'docs/art/market-art-v1.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(records, ensure_ascii=False))
