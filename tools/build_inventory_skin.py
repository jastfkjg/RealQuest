"""Encode the generated shell losslessly for runtime. Requires Pillow with WebP.

No artwork edits, resampling, recoloring or quantization. Keep the source PNG.
Verify decoded RGBA equality so this packaging step cannot change the artwork.
"""
import argparse
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset", choices=["satchel-shell-v1", "journal-spread-v1", "character-dossier-v1", "arrival-village-v1", "arrival-register-v1"], default="satchel-shell-v1")
    asset = parser.parse_args().asset
    SOURCE = ROOT / f"assets/generated/hearthwood/{asset}.png"
    TARGET = ROOT / f"frontend/public/assets/hearthwood/{asset}.webp"
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as image:
        original = image.convert("RGBA")
        original.save(TARGET, "WEBP", lossless=True, exact=True, method=6)
        with Image.open(TARGET) as runtime:
            assert original.tobytes() == runtime.convert("RGBA").tobytes()
    print(f"PASS unchanged RGBA pixels: {SOURCE.stat().st_size} → {TARGET.stat().st_size} bytes")
