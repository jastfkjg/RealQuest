"""Package original ranch sheets into reproducible, nearest-sampled RGBA sprites.

The rectangles were measured from the actual generated sheets, not their prompt
grids: the larger horse and feeding trough cross nominal row/column boundaries.
Source PNGs and prompts are immutable inputs. Run with --check to compare every
PNG, the manifest, and the 1:1 review sheets without writing anything.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("assets/generated/hearthwood/ranching-v1")
DERIVED = Path("assets/derived/ranching-v1")
REVIEW = Path("output/cocos-ranching-125")
ALPHA_THRESHOLD = 160

# Exclusive right/bottom coordinates of the dominant connected alpha silhouette.
SMALL = {
    "chicken": [(138, 191, 300, 370), (490, 116, 730, 378), (860, 56, 1153, 380)],
    "duck": [(96, 538, 311, 772), (462, 483, 747, 773), (845, 460, 1201, 786)],
    "sheep": [(64, 913, 344, 1188), (443, 885, 753, 1195), (822, 860, 1211, 1214)],
}
LARGE = {
    "cow": [(48, 143, 281, 340), (342, 75, 651, 344), (677, 53, 1067, 355)],
    "goat": [(57, 490, 272, 704), (354, 436, 635, 710), (703, 396, 1065, 717)],
    "pig": [(63, 840, 264, 1003), (350, 790, 645, 1003), (702, 759, 1063, 1016)],
    "horse": [(29, 1125, 263, 1404), (311, 1061, 629, 1413), (659, 1016, 1073, 1430)],
}
BUILDINGS = {
    "coop": [(158, 76, 352, 331), (573, 37, 870, 331), (1061, 11, 1442, 331)],
    "barn": [(127, 398, 383, 680), (557, 370, 884, 678), (1013, 349, 1488, 679)],
    "stable": [(149, 728, 362, 982), (551, 750, 891, 985), (1005, 697, 1496, 984)],
}
FACILITIES = {
    "water": (24, 132, 507, 416), "rooting": (568, 93, 1030, 427),
    "mayo": (1134, 77, 1515, 421), "cheese": (75, 521, 492, 924),
    "loom": (581, 536, 1042, 917), "oil": (1137, 512, 1497, 931),
}
ITEMS = {
    "egg": (73, 100, 232, 310), "duck_egg": (368, 45, 570, 321),
    "wool": (643, 69, 939, 314), "milk": (1022, 54, 1202, 321),
    "goat_milk": (69, 350, 248, 617), "truffle": (354, 383, 599, 605),
    "mayonnaise": (685, 366, 902, 612), "duck_mayo": (1003, 366, 1212, 612),
    "cheese": (46, 660, 291, 880), "goat_cheese": (337, 664, 628, 890),
    "cloth": (654, 669, 975, 900), "truffle_oil": (1050, 636, 1193, 900),
    "animal_feed": (16, 915, 293, 1199),
}
PROPS = {
    "trough": (307, 968, 669, 1202), "nest": (664, 965, 965, 1203),
    "ledger": (967, 915, 1222, 1197),
}


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_sha(path: Path) -> str:
    return sha((ROOT / path).read_bytes())


def png_bytes(image: Image.Image) -> bytes:
    stream = BytesIO()
    image.save(stream, format="PNG")
    return stream.getvalue()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    check = parser.parse_args().check

    def emit(path: Path, data: bytes) -> None:
        absolute = ROOT / path
        if check:
            assert absolute.is_file(), f"Missing {path}"
            assert absolute.read_bytes() == data, f"Out of date: {path}"
        else:
            absolute.parent.mkdir(parents=True, exist_ok=True)
            absolute.write_bytes(data)

    sheets = {}
    sources = []
    for name in ("small-animals", "large-animals", "buildings", "facilities", "items"):
        path = SOURCE / (name + ".png")
        image = Image.open(ROOT / path).convert("RGBA")
        sheets[name] = image
        sources.append({
            "path": str(path), "sha256": file_sha(path),
            "width": image.width, "height": image.height, "mode": "RGBA",
            "alpha_extrema": list(image.getchannel("A").getextrema()),
            "prompt": str(path.with_suffix(".prompt.txt")),
            "prompt_sha256": file_sha(path.with_suffix(".prompt.txt")),
        })

    def silhouette(sheet: str, rectangle: tuple) -> Image.Image:
        cell = sheets[sheet].crop(rectangle)
        w, h = cell.size
        # Main bodies are connected; small disconnected halos and neighbouring
        # cell scraps are not part of the authored silhouette.
        data = bytearray(1 if a >= ALPHA_THRESHOLD else 0
                         for a in cell.getchannel("A").tobytes())
        largest = []
        for i in range(w * h):
            if not data[i]:
                continue
            data[i] = 0
            todo, part = [i], []
            while todo:
                j = todo.pop()
                part.append(j)
                y, x = divmod(j, w)
                neighbors = []
                if x: neighbors.append(j - 1)
                if x + 1 < w: neighbors.append(j + 1)
                if y: neighbors.append(j - w)
                if y + 1 < h: neighbors.append(j + w)
                for k in neighbors:
                    if data[k]:
                        data[k] = 0
                        todo.append(k)
            if len(part) > len(largest):
                largest = part
        assert len(largest) > 1000, (sheet, rectangle)
        mask = bytearray(w * h)
        for i in largest:
            mask[i] = 255
        cell.putalpha(Image.frombytes("L", (w, h), bytes(mask)))
        assert cell.getchannel("A").getbbox() == (0, 0, w, h), (sheet, rectangle)
        return cell

    records, previews = [], {}

    def asset(sheet: str, rectangle: tuple, key: str, group: str,
              size: tuple, scale: float | None = None, fit: tuple | None = None,
              baseline: int | None = None) -> None:
        sprite = silhouette(sheet, rectangle)
        source_size = sprite.size
        if scale is not None:
            sprite = sprite.resize(tuple(round(v * scale) for v in sprite.size),
                                   Image.Resampling.NEAREST)
        else:
            sprite.thumbnail(fit, Image.Resampling.NEAREST)
        assert sprite.width < size[0] and sprite.height < size[1], key
        offset = ((size[0] - sprite.width) // 2,
                  baseline - sprite.height if baseline else (size[1] - sprite.height) // 2)
        assert offset[0] > 0 and offset[1] > 0, key
        out = Image.new("RGBA", size)
        out.alpha_composite(sprite, offset)
        path = DERIVED / group / (key + ".png")
        data = png_bytes(out)
        emit(path, data)
        binding = ("items/" if group == "items" else "ranching/") + key
        record = {
            "id": key, "group": group, "binding": binding,
            "source": str(SOURCE / (sheet + ".png")),
            "source_sha256": file_sha(SOURCE / (sheet + ".png")),
            "crop": list(rectangle), "crop_dimensions": list(source_size),
            "alpha_threshold": ALPHA_THRESHOLD,
            "component_rule": "largest 4-connected silhouette; exclude detached alpha specks and neighbouring sprites",
            "resampling": "NEAREST", "fixed_source_scale": scale,
            "resized_dimensions": list(sprite.size), "offset": list(offset),
            "content_bounds": list(out.getchannel("A").getbbox()),
            "path": str(path), "width": size[0], "height": size[1],
            "mode": "RGBA", "output_alpha_values": [0, 255], "sha256": sha(data),
        }
        if group == "animals":
            species, stage = key.rsplit("-", 1)
            record.update(species=species, stage=int(stage),
                          stage_name=["young", "growing", "adult"][int(stage) - 1])
        records.append(record)
        previews[binding] = out

    for sheet, catalog, scale in (("small-animals", SMALL, .18), ("large-animals", LARGE, .20)):
        for species, rectangles in catalog.items():
            for stage, rectangle in enumerate(rectangles, 1):
                asset(sheet, rectangle, f"{species}-{stage}", "animals", (96, 96),
                      scale=scale, baseline=90)
    for family, rectangles in BUILDINGS.items():
        for level, rectangle in enumerate(rectangles, 1):
            asset("buildings", rectangle, f"{family}-{level}", "buildings", (256, 192),
                  scale=.48, baseline=186)
    for key, rectangle in FACILITIES.items():
        asset("facilities", rectangle, key, "facilities", (128, 128), fit=(116, 116), baseline=122)
    for key, rectangle in ITEMS.items():
        asset("items", rectangle, key, "items", (64, 64), fit=(56, 56))
    for key, rectangle in PROPS.items():
        asset("items", rectangle, key, "props", (96, 96), fit=(84, 84), baseline=90)

    # Quality is communicated by localized inventory labels, not invented new
    # silhouettes. Raw and processed quality products reuse identical artwork.
    aliases = []
    for key in ITEMS:
        if key == "animal_feed":
            continue
        normal = next(r for r in records if r["binding"] == "items/" + key)
        aliases.append({"binding": "items/fine_" + key, "alias_of": normal["binding"],
                        "path": normal["path"], "sha256": normal["sha256"],
                        "reason": "same product silhouette; quality is a localized item label"})

    def contact(filename: str, bindings: list, columns: int, cell: tuple) -> None:
        rows = (len(bindings) + columns - 1) // columns
        canvas = Image.new("RGBA", (columns * cell[0], rows * cell[1]), "#ddd5b9")
        draw = ImageDraw.Draw(canvas)
        for i, binding in enumerate(bindings):
            x, y = i % columns * cell[0], i // columns * cell[1]
            im = previews[binding]
            draw.rectangle((x + 2, y + 2, x + cell[0] - 3, y + cell[1] - 3),
                           fill="#e9e2ca", outline="#b4a88b")
            # Intentional 1:1 pixels. Never upscale a review sprite.
            canvas.alpha_composite(im, (x + (cell[0] - im.width) // 2, y + 6))
            draw.text((x + 8, y + cell[1] - 20), binding.rsplit("/", 1)[1], fill="#453b2e")
        emit(REVIEW / filename, png_bytes(canvas))

    contact("art-animals-1x.png", [r["binding"] for r in records if r["group"] == "animals"], 3, (120, 126))
    contact("art-buildings-1x.png", [r["binding"] for r in records if r["group"] == "buildings"], 3, (272, 222))
    contact("art-facilities-1x.png", [r["binding"] for r in records if r["group"] in ("facilities", "props")], 3, (152, 158))
    contact("art-items-1x.png", [r["binding"] for r in records if r["group"] == "items"], 4, (112, 96))

    manifest = {
        "schema_version": 1,
        "creator": "OpenAI built-in image_gen; original RealQuest Hearthwood artwork",
        "license": "Original project-generated artwork; no third-party game sprites or fonts",
        "processing": "Measured per-sprite rectangles; alpha >=160; largest 4-connected body; nearest-neighbor resizing; transparent canvas; source sheets unchanged. Animals share fixed per-sheet scale to retain life-stage size differences.",
        "script": "tools/build_ranching_art.py", "script_sha256": file_sha(Path(__file__).relative_to(ROOT)),
        "review_status": "Generated candidate; 1:1 contact sheets inspected by implementer, owner visual approval not implied",
        "sources": sources, "records": records, "aliases": aliases,
    }
    emit(Path("docs/art/ranching-art-v1.json"),
         (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode())
    print(f"{'Verified' if check else 'Built'} {len(records)} ranch sprites, {len(aliases)} quality aliases, 4 actual-size contact sheets")


if __name__ == "__main__":
    main()
