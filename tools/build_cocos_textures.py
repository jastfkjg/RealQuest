"""Reproduce one pixel-identical WebP derivative; retain its original PNG fallback."""
import argparse
import hashlib
import io
import json
from pathlib import Path
from PIL import Image, features, __version__

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'assets/derived/local-scenes/terrain.png'
OUTPUT = 'assets/derived/cocos-textures/terrain-lossless.webp'
MANIFEST = 'docs/art/cocos-lossless-textures-v1.json'
OPTIONS = {'lossless': True, 'exact': True, 'method': 6}


def digest(value):
    return hashlib.sha256(value).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Re-encode in memory and verify bytes/provenance without writes')
    args = parser.parse_args()
    if __version__ != '12.3.0' or features.version('webp') != '1.6.0':
        raise SystemExit('Use Pillow12.3.0 with libwebp1.6.0; see tools/requirements-art.lock.txt and texture manifest.')
    source = ROOT / SOURCE
    before = source.read_bytes()
    parent = json.loads((ROOT / 'docs/art/local-scene-art-v1.json').read_text())
    original = next(row for row in parent['records'] if row['path'] == SOURCE)
    if digest(before) != original['sha256']:
        raise SystemExit('Original scene derivative drift; regenerate/verify its original baker first.')
    with Image.open(io.BytesIO(before)) as loaded:
        if loaded.info:
            raise SystemExit('Explicit color/metadata handling is required before encoding a source with metadata.')
        rgba = loaded.convert('RGBA')
    with io.BytesIO() as buffer:
        rgba.save(buffer, format='WEBP', **OPTIONS)
        encoded = buffer.getvalue()
    with Image.open(io.BytesIO(encoded)) as loaded:
        restored = loaded.convert('RGBA')
    if restored.size != rgba.size or restored.tobytes() != rgba.tobytes():
        raise SystemExit('Decoded RGBA differs; refusing a changed game image.')
    if len(encoded) >= len(before):
        raise SystemExit('Lossless derivative must be smaller than its original PNG.')
    width, height = rgba.size
    row = {'source': SOURCE, 'source_sha256': digest(before), 'source_bytes': len(before),
           'path': OUTPUT, 'sha256': digest(encoded), 'bytes': len(encoded),
           'width': width, 'height': height, 'rgba_sha256': digest(rgba.tobytes()),
           'decoded_rgba_equal': True, 'format': 'lossless-webp'}
    manifest = {'schema_version': 1,
                'note': 'Same original Cocos village terrain pixels/dimensions; retain original PNG and all geography. No new artwork or external inputs.',
                'rebuild': 'tools/build_cocos_textures.py',
                'rebuild_sha256': digest(Path(__file__).read_bytes()),
                'encoder': {'pillow': __version__, 'libwebp': features.version('webp'), 'options': OPTIONS},
                'records': [row]}
    text = json.dumps(manifest, ensure_ascii=False, indent=2) + '\n'
    if args.check:
        if (ROOT / OUTPUT).read_bytes() != encoded or (ROOT / MANIFEST).read_text() != text:
            raise SystemExit('Lossless Cocos texture/provenance drift; inspect before regenerating.')
    else:
        (ROOT / OUTPUT).parent.mkdir(parents=True, exist_ok=True)
        (ROOT / OUTPUT).write_bytes(encoded)
        (ROOT / MANIFEST).write_text(text)
    if source.read_bytes() != before:
        raise SystemExit('Original PNG changed during encoding.')
    print(('Verified' if args.check else 'Built') + f' pixel-identical{width}x{height} terrain: {len(before)} PNG bytes -> {len(encoded)} WebP bytes; PNG preserved.')


if __name__ == '__main__':
    main()
