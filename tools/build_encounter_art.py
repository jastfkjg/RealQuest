"""Package original encounter artwork. Use --check for a read-only rebuild audit."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets/generated/hearthwood"
TARGET = ROOT / "assets/runtime/hearthwood/encounters"
MANIFEST = ROOT / "docs/art/encounter-art-v1.json"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def build():
    records = []
    TARGET.mkdir(parents=True, exist_ok=True)

    def save(name, source, image, processing):
        path = TARGET / (name + ".webp")
        image.save(path, "WEBP", lossless=True, exact=True, method=6)
        with Image.open(path) as runtime:
            assert runtime.convert("RGBA").tobytes() == image.convert("RGBA").tobytes()
        records.append(dict(id=name, source_path=str(source.relative_to(ROOT)),
                            source_sha256=sha(source), runtime_path=str(path.relative_to(ROOT)),
                            sha256=sha(path), width=image.width, height=image.height,
                            mode="RGBA", alpha_bounds=image.getbbox(), size_bytes=path.stat().st_size,
                            processing=processing))

    path = SOURCE / "library-encounter-v1.png"
    with Image.open(path) as image:
        save("library-stage", path, image.convert("RGBA"), "Lossless WebP; exact decoded RGBA equality; no art changes.")

    path = SOURCE / "notice-paper-v1.png"
    with Image.open(path) as image:
        image = image.convert("RGBA")
        # Remove the generator's faint outside shadow, keep a crisp paper edge.
        image.putalpha(image.getchannel("A").point(lambda a: 255 if a >= 160 else 0))
        bounds = image.getbbox()
        save("notice-paper", path, image.crop(bounds),
             dict(alpha_threshold=160, crop=list(bounds), nine_slice_source_px=[80, 80, 80, 80],
                  css_border_width_px=[18, 18, 18, 18]))

    path = SOURCE / "village-actors-v2.png"
    layout = json.loads((SOURCE / "village-actors-v2.layout.json").read_text())
    rect = next(a for a in layout["actors"] if a["id"] == "lia")["frames"][0]
    with Image.open(path) as image:
        image = image.convert("RGBA").crop(rect)
        image.putalpha(image.getchannel("A").point(lambda a: 255 if a >= 160 else 0))
        image = image.crop(image.getbbox())
        # Crop from original detailed art, never magnify the 40px packed portrait.
        side = min(image.width, image.height)
        save("lia-portrait", path, image.crop((0, 0, side, side)),
             dict(source_cell=rect, alpha_threshold=160, crop="trimmed original head/shoulders square; no resize"))

    MANIFEST.write_text(json.dumps(dict(version=1, creator="OpenAI built-in image_gen, directed for RealQuest",
        license="Original generated project artwork; no third-party license claimed.",
        rebuild="tools/build_encounter_art.py", rebuild_sha256=sha(Path(__file__)),
        records=records), indent=2) + "\n")
    return records


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.check:
        manifest = json.loads(MANIFEST.read_text())
        assert manifest["rebuild_sha256"] == sha(Path(__file__))
        records = manifest["records"]
        for record in records:
            assert sha(ROOT / record["source_path"]) == record["source_sha256"]
            assert sha(ROOT / record["runtime_path"]) == record["sha256"]
            with Image.open(ROOT / record["runtime_path"]) as image:
                assert image.size == (record["width"], record["height"])
    else:
        records = build()
    print(f"PASS {len(records)} encounter images; {sum(r['size_bytes'] for r in records):,} runtime bytes")
