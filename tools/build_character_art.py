"""Reproduce the five textless dossier emblems from the original 3x2 sheet."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/generated/hearthwood/character-emblems-v2.png"
TARGET = ROOT / "assets/runtime/hearthwood/character"
MANIFEST = ROOT / "docs/art/character-art-v2.json"
CELLS = {"science": (0, 0), "magic": (1, 0), "planting": (2, 0), "ranching": (0, 1), "building": (1, 1)}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def run(check=False):
    records = []
    with Image.open(SOURCE) as original:
        assert original.size == (1536, 1024) and original.mode == "RGBA"
        for name, (x, y) in CELLS.items():
            crop = (x * 512, y * 512, (x + 1) * 512, (y + 1) * 512)
            image = original.crop(crop)
            path = TARGET / (name + ".webp")
            if not check:
                TARGET.mkdir(parents=True, exist_ok=True)
                image.save(path, "WEBP", lossless=True, exact=True, method=6)
            with Image.open(path) as runtime:
                assert runtime.convert("RGBA").tobytes() == image.tobytes()
            records.append(dict(id=name, source_path=str(SOURCE.relative_to(ROOT)), source_sha256=sha(SOURCE),
                source_cell=list(crop), runtime_path=str(path.relative_to(ROOT)), sha256=sha(path),
                width=512, height=512, size_bytes=path.stat().st_size,
                processing="Exact 512px cell crop; lossless WebP; decoded RGBA equality. No recolor, resize or alpha changes."))
    data = dict(version=2, creator="OpenAI built-in image_gen", license="Original generated project artwork; no third-party license claimed.",
        reference="docs/art/references/character-dossier-concept-v2.png", prompt="assets/generated/hearthwood/character-emblems-v2.prompt.txt",
        rebuild="tools/build_character_art.py", rebuild_sha256=sha(Path(__file__)), records=records)
    if check:
        assert json.loads(MANIFEST.read_text()) == data
    else:
        MANIFEST.write_text(json.dumps(data, indent=2) + "\n")
    print(f"PASS: {len(records)} emblems, {sum(r['size_bytes'] for r in records):,} bytes; exact source crops verified")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    run(parser.parse_args().check)
