"""Read-only source audit and nearest-neighbor contact sheet. Requires Pillow."""
import hashlib
import json
import argparse
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', default='output/inventory-satchel')
OUTPUT = ROOT / parser.parse_args().output
OUTPUT.mkdir(parents=True, exist_ok=True)
manifest = json.loads((ROOT / 'docs/art/asset-manifest.json').read_text())
rows = []
for entry in manifest.get('original_scene_art', []) + manifest.get('original_ui_art', []):
    source = ROOT / entry['source_path']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == entry['sha256'], source
for entry in manifest['source_files']:
    path = ROOT / entry['local_path']
    data = path.read_bytes()
    assert hashlib.sha256(data).hexdigest() == entry['sha256'], path
    assert hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest() == entry['git_blob_sha1'], path
    with Image.open(path) as source:
        assert source.size == (entry['width'], entry['height']), path
for entry in manifest['existing_runtime_files']:
    assert hashlib.sha256((ROOT / entry['path']).read_bytes()).hexdigest() == entry['sha256'], entry['path']
for entry in manifest.get('additional_character_assets', []):
    source = ROOT / entry['source_path']
    runtime = ROOT / entry['runtime_path']
    data = source.read_bytes()
    assert runtime.read_bytes() == data, runtime
    assert hashlib.sha256(data).hexdigest() == entry['sha256'], source
    assert hashlib.sha1(f'blob {len(data)}\0'.encode() + data).hexdigest() == entry['git_blob_sha1'], source
    with Image.open(source) as image:
        assert image.size == (64, 112), source
        for row in range(4):
            for column in range(4):
                assert image.convert('RGBA').crop((column*16, row*16, column*16+16, row*16+16)).getbbox(), source
for entry in manifest.get('original_item_assets', []):
    runtime = ROOT / entry['runtime_path']
    assert hashlib.sha256(runtime.read_bytes()).hexdigest() == entry['sha256'], runtime
    assert hashlib.sha256((ROOT / entry['rebuild']).read_bytes()).hexdigest() == entry['script_sha256'], entry['rebuild']
    with Image.open(runtime) as image:
        assert image.size == (entry['width'], entry['height']) and image.mode == entry['mode'], runtime
for entry in manifest.get('generated_runtime_assets', []):
    source = ROOT / entry['source_path']
    runtime = ROOT / entry['runtime_path']
    assert hashlib.sha256(source.read_bytes()).hexdigest() == entry['source_sha256'], source
    assert hashlib.sha256(runtime.read_bytes()).hexdigest() == entry['sha256'], runtime
    with Image.open(source) as source_image, Image.open(runtime) as runtime_image:
        assert source_image.convert('RGBA').tobytes() == runtime_image.convert('RGBA').tobytes(), runtime
    with Image.open(source) as image:
        assert image.size == (entry['width'], entry['height']) and image.mode == entry['mode'], source
village_entries = []
if manifest.get('village_art'):
    record = manifest['village_art']
    village = json.loads((ROOT / record['manifest']).read_text())
    assert hashlib.sha256((ROOT / village['rebuild']).read_bytes()).hexdigest() == village['rebuild_sha256']
    for entry in village['records']:
        path = ROOT / entry['path']
        assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'], path
        assert hashlib.sha256((ROOT / entry['source']).read_bytes()).hexdigest() == entry['source_sha256'], path
        with Image.open(path) as image:
            assert image.size == (entry['width'],entry['height']), path
            if entry['id'].startswith('actor-'):
                assert image.size == (192,256)
                for col in range(4):
                    poses = [image.crop((col*48,row*64,col*48+48,row*64+64)) for row in range(4)]
                    assert all(p.getbbox() and p.getbbox()[3] < 64 for p in poses), path
                    assert poses[1].tobytes() != poses[3].tobytes(), path
        village_entries.append(path)
for path in sorted((ROOT / 'assets/vendor/ninja-adventure/ui').glob('*.png')) + sorted((ROOT / 'frontend/public/assets/ninja-adventure').rglob('*.png')) + [ROOT / entry['runtime_path'] for entry in manifest.get('generated_runtime_assets', []) + manifest.get('original_item_assets', [])] + village_entries:
    with Image.open(path) as source:
        rgba = source.convert('RGBA')
        rows.append({
            'path': str(path.relative_to(ROOT)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'width': source.width, 'height': source.height, 'visible_bounds': rgba.getbbox(),
            'size_bytes': path.stat().st_size,
            'colors': len(rgba.getcolors(rgba.width * rgba.height)),
        })
(OUTPUT / 'asset-audit.json').write_text(json.dumps(rows, indent=2) + '\n')
samples = [r for r in rows if '/ui/' in r['path'] or '/icons/' in r['path'] or '/items/' in r['path']]
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
