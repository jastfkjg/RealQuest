"""Read-only source audit and nearest-neighbor contact sheet. Requires Pillow."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'output/inventory-satchel'
OUTPUT.mkdir(parents=True, exist_ok=True)
manifest = json.loads((ROOT / 'docs/art/asset-manifest.json').read_text())
rows = []
for entry in manifest['source_files']:
    path = ROOT / entry['local_path']
    data = path.read_bytes()
    assert hashlib.sha256(data).hexdigest() == entry['sha256'], path
    assert hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest() == entry['git_blob_sha1'], path
    with Image.open(path) as source:
        assert source.size == (entry['width'], entry['height']), path
for entry in manifest['existing_runtime_files']:
    assert hashlib.sha256((ROOT / entry['path']).read_bytes()).hexdigest() == entry['sha256'], entry['path']
for entry in manifest.get('generated_runtime_assets', []):
    source = ROOT / entry['source_path']
    runtime = ROOT / entry['runtime_path']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == entry['source_sha256'], source
    assert hashlib.sha256(runtime.read_bytes()).hexdigest() == entry['sha256'], runtime
    with Image.open(source) as source_image, Image.open(runtime) as runtime_image:
        assert source_image.convert('RGBA').tobytes() == runtime_image.convert('RGBA').tobytes(), runtime
    with Image.open(source) as image:
        assert image.size == (entry['width'], entry['height']) and image.mode == entry['mode'], source
for path in sorted((ROOT / 'assets/vendor/ninja-adventure/ui').glob('*.png')) + sorted((ROOT / 'frontend/public/assets/ninja-adventure').rglob('*.png')) + [ROOT / entry['runtime_path'] for entry in manifest.get('generated_runtime_assets', [])]:
    with Image.open(path) as source:
        rgba = source.convert('RGBA')
        rows.append({
            'path': str(path.relative_to(ROOT)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'width': source.width, 'height': source.height, 'visible_bounds': rgba.getbbox(),
            'size_bytes': path.stat().st_size,
            'colors': len(rgba.getcolors(rgba.width * rgba.height)),
        })
(OUTPUT / 'asset-audit.json').write_text(json.dumps(rows, indent=2) + '\n')
samples = [r for r in rows if '/ui/' in r['path'] or '/icons/' in r['path']]
sheet = Image.new('RGB', (800, 130 * ((len(samples) + 3) // 4)), '#dee3cf')
draw = ImageDraw.Draw(sheet)
for i, row in enumerate(samples):
    x, y = i % 4 * 200, i // 4 * 130
    with Image.open(ROOT / row['path']) as source:
        rgba = source.convert('RGBA').resize((source.width * 4, source.height * 4), Image.Resampling.NEAREST)
        sheet.paste(rgba, (x + 16, y + 16), rgba)
    draw.text((x + 16, y + 85), Path(row['path']).name, fill='#27392f')
    draw.text((x + 16, y + 103), f"{row['width']}x{row['height']} | 4x inspection", fill='#56614f')
sheet.save(OUTPUT / 'asset-contact-sheet.png')
print(f'PASS: eight supplied hashes/blobs, all preserved runtime hashes and generated source/runtime pixels verified; {len(rows)} images inventoried; contact sheet saved.')
