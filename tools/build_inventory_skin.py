"""Encode the generated shell losslessly for runtime. Requires Pillow with WebP.

No artwork edits, resampling, recoloring or quantization. Keep the source PNG.
Verify decoded RGBA equality so this packaging step cannot change the artwork.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/generated/hearthwood/satchel-shell-v1.png"
TARGET = ROOT / "frontend/public/assets/hearthwood/satchel-shell-v1.webp"

if __name__ == "__main__":
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(SOURCE) as image:
        original = image.convert("RGBA")
        original.save(TARGET, "WEBP", lossless=True, exact=True, method=6)
        with Image.open(TARGET) as runtime:
            assert original.tobytes() == runtime.convert("RGBA").tobytes()
    print(f"PASS unchanged RGBA pixels: {SOURCE.stat().st_size} → {TARGET.stat().st_size} bytes")
