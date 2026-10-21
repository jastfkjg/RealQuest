#!/usr/bin/env python3
"""Verify this handoff's source files and documented contrast pairs (stdlib only)."""
from __future__ import annotations

import hashlib
import json
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FONT_EXTENSIONS = {'.ttf', '.otf', '.woff', '.woff2', '.eot', '.ttc', '.otc'}


def luminance(value: str) -> float:
    rgb = [int(value[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    linear = [v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4 for v in rgb]
    return sum(a * b for a, b in zip(linear, (0.2126, 0.7152, 0.0722)))


def main() -> int:
    errors: list[str] = []
    required = ['AGENTS.md', 'DESIGN.md', 'README.md', 'docs/art/ASSET_PLAN.md',
                'docs/art/REVIEW_CHECKLIST.md', 'docs/tasks/01-inventory-slice.md',
                'docs/design/realquest-tokens.css']
    for name in required:
        if not (ROOT / name).is_file():
            errors.append(f'Missing {name}')
    manifest = json.loads((ROOT / 'docs/art/asset-manifest.json').read_text())
    for entry in manifest['source_files']:
        path = ROOT / entry['local_path']
        if not path.is_file():
            errors.append(f'Missing source: {path}')
            continue
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != entry['sha256']:
            errors.append(f'SHA-256 mismatch: {path.name}')
        if hashlib.sha1(f'blob {len(raw)}\0'.encode() + raw).hexdigest() != entry['git_blob_sha1']:
            errors.append(f'Git blob mismatch: {path.name}')
        if not raw.startswith(b'\x89PNG\r\n\x1a\n'):
            errors.append(f'Invalid PNG signature: {path.name}')
        elif struct.unpack('>II', raw[16:24]) != (entry['width'], entry['height']):
            errors.append(f'Dimension mismatch: {path.name}')
    for path in ROOT.rglob('*'):
        if path.is_file() and path.suffix.lower() in FONT_EXTENSIONS:
            errors.append(f'Unexpected font binary: {path.relative_to(ROOT)}')
        if path.is_file() and path.suffix == '.md':
            text = path.read_text(encoding='utf-8')
            if re.search(r'[\u3400-\u9fff]', text):
                errors.append(f'Non-English CJK text in documentation: {path.relative_to(ROOT)}')
            if len(re.findall(r'^```', text, re.M)) % 2:
                errors.append(f'Unbalanced Markdown fences: {path.relative_to(ROOT)}')
    css = (ROOT / 'docs/design/realquest-tokens.css').read_text()
    colors = dict(re.findall(r'--rq-([\w-]+):\s*(#[0-9a-fA-F]{6});', css))
    pairs = [('ink', 'linen', 4.5), ('ink-muted', 'linen', 4.5),
             ('ink', 'canvas', 4.5), ('ink-muted', 'canvas', 4.5),
             ('linen-raised', 'moss', 4.5), ('linen-raised', 'moss-hover', 4.5),
             ('linen-raised', 'pine', 4.5), ('danger', 'linen', 4.5),
             ('control-border', 'linen-raised', 3.0)]
    for fg, bg, minimum in pairs:
        light, dark = sorted([luminance(colors[fg]), luminance(colors[bg])], reverse=True)
        ratio = (light + 0.05) / (dark + 0.05)
        print(f'{fg} / {bg}: {ratio:.2f}:1 (minimum {minimum})')
        if ratio < minimum:
            errors.append(f'Contrast below target: {fg}/{bg}')
    if errors:
        for error in errors:
            print(f'FAIL: {error}', file=sys.stderr)
        return 1
    print(f'PASS: {len(manifest["source_files"])} PNG sources, documentation, and listed contrast pairs.')
    print('This is a handoff integrity check, not a runtime or complete accessibility certification.')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (OSError, ValueError, KeyError, struct.error) as exc:
        print(f'Cannot verify kit: {exc}', file=sys.stderr)
        raise SystemExit(1)
