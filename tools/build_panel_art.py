"""Lossless platform fallbacks from existing project-owned interface materials."""
import hashlib
import json
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
materials = {
    'notice-paper': ('encounters/notice-paper', [80,80,80,80], 18),
    'arrival': ('arrival-village-v1', None, None),
    'register': ('arrival-register-v1', None, None),
    'book': ('journal-spread-v1', None, None),
    'life-book': ('life-journal-v1', None, None),
    'letter': ('commission-letter-v1', None, None),
}
records=[]
for name,(relative,slices,edge) in materials.items():
    source=ROOT/'assets/runtime/hearthwood'/f'{relative}.webp'
    target=ROOT/'assets/derived/panel-materials'/f'{name}.png'
    target.parent.mkdir(parents=True,exist_ok=True)
    with Image.open(source) as original:
        pixels=original.convert('RGBA');pixels.save(target,optimize=True)
        with Image.open(target) as encoded:assert pixels.tobytes()==encoded.convert('RGBA').tobytes()
    records.append({'source':str(source.relative_to(ROOT)),'source_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),
        'path':str(target.relative_to(ROOT)),'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),
        'width':pixels.width,'height':pixels.height,'nine_slice_source_px':slices,'edge_display_px':edge,
        'license':'Existing original generated RealQuest artwork; no third-party license claimed.',
        'processing':'PNG fallback re-encoding only. Exact decoded RGBA equality; no resizing, recoloring, cropping or source changes.'})
(ROOT/'docs/art/cocos-panel-materials-v1.json').write_text(json.dumps({'schema_version':1,'rebuild':'tools/build_panel_art.py',
    'rebuild_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'records':records},indent=2)+'\n')
print(f'Verified {len(records)} pixel-identical PNG fallbacks; supported browsers reuse original lossless WebP.')
