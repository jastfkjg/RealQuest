#!/usr/bin/env python3
"""Inventory a local asset ZIP without extracting or executing its contents.

Reports paths, sizes, hashes, PNG dimensions, and candidate license documents.
This does not infer a license, inspect animation semantics, or import assets.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import stat
import struct
import sys
import zipfile
from pathlib import Path, PurePosixPath

SKIP_FONTS = {'.ttf', '.otf', '.woff', '.woff2', '.eot', '.ttc', '.otc', '.fnt'}
MAX_MEMBERS = 20000
MAX_TOTAL_BYTES = 1024 * 1024 * 1024
MAX_READ_BYTES = 24 * 1024 * 1024


def audit(path: Path) -> dict:
    if not path.is_file():
        raise ValueError(f'Archive does not exist: {path}')
    archive_hash = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b''):
            archive_hash.update(chunk)
    report = {'archive_name': path.name, 'archive_sha256': archive_hash.hexdigest(),
              'license_verified': False, 'files': [], 'warnings': []}
    with zipfile.ZipFile(path) as archive:
        members = archive.infolist()
        if len(members) > MAX_MEMBERS or sum(m.file_size for m in members) > MAX_TOTAL_BYTES:
            raise ValueError('Archive exceeds audit safety limits.')
        for member in members:
            if member.is_dir():
                continue
            normalized = member.filename.replace('\\', '/')
            parts = PurePosixPath(normalized)
            mode = (member.external_attr >> 16) & 0xFFFF
            unsafe = parts.is_absolute() or '..' in parts.parts or bool(re.match(r'^[A-Za-z]:', normalized))
            entry = {'path': member.filename, 'size_bytes': member.file_size}
            if unsafe or stat.S_ISLNK(mode):
                entry['status'] = 'skipped_unsafe_path_or_symlink'
            elif parts.suffix.lower() in SKIP_FONTS:
                entry['status'] = 'font_not_read_or_extracted'
            elif member.flag_bits & 1:
                entry['status'] = 'skipped_encrypted'
            elif member.file_size > MAX_READ_BYTES or member.file_size / max(1, member.compress_size) > 1000:
                entry['status'] = 'skipped_read_limit'
            else:
                raw = archive.read(member)
                entry['sha256'] = hashlib.sha256(raw).hexdigest()
                entry['status'] = 'inventoried_only'
                if raw.startswith(b'\x89PNG\r\n\x1a\n') and len(raw) >= 24:
                    entry['width'], entry['height'] = struct.unpack('>II', raw[16:24])
                if any(word in parts.name.lower() for word in ['license', 'licence', 'copyright', 'readme']):
                    entry['license_review_candidate'] = True
            report['files'].append(entry)
    report['warnings'].append('Metadata inspection is not a security, license, or runtime compatibility certification.')
    return report


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    result = audit(args.archive)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    with args.report.open('x', encoding='utf-8') as out:
        json.dump(result, out, indent=2, ensure_ascii=False)
        out.write('\n')
    print(f'Wrote {len(result["files"])} inventory entries to {args.report}')
    print('No files were extracted or executed; license review is still required.')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (OSError, ValueError, zipfile.BadZipFile, RuntimeError) as exc:
        print(f'Asset audit failed: {exc}', file=sys.stderr)
        raise SystemExit(1)
