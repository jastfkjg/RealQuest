"""Pack the approved sword key poses without repainting their source artwork.

Run with the project's bundled Pillow Python. --check verifies every byte of the
runtime atlases, the contact sheet and provenance manifest without writing files.
"""

import argparse
import hashlib
import json
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("docs/art/references/sword-motion-preview-v1/preview.png")
SOURCE_SHA = "98b844237e599b6dee8b04a1acf46ff9229c21ecf59aa81339ea839e29acdc8e"
OUT = Path("assets/derived/sword-motion-v1")
CONTACT = Path("output/cocos-sword-127/art-contact.png")
MANIFEST = Path("docs/art/sword-motion-v1.json")
FRAME_SIZE = (96, 96)
FOOT_ANCHOR = (48, 80)
DIRECTIONS = ("south", "north", "west", "east")
STAGES = ("ready", "anticipation", "start", "active", "follow", "recovery")

# Inspected connected silhouettes, including the blade and painted arc. Equal
# 256px nominal cells would clip blades/arcs and include neighboring fragments.
BOUNDS = (
    ((40, 46, 197, 254), (330, 51, 463, 254), (540, 52, 719, 254),
     (807, 53, 1033, 254), (1081, 57, 1283, 254), (1322, 46, 1477, 254)),
    ((71, 288, 242, 498), (327, 293, 472, 498), (570, 293, 789, 498),
     (803, 296, 993, 498), (1053, 297, 1251, 498), (1354, 288, 1515, 498)),
    ((48, 529, 197, 745), (311, 516, 478, 745), (522, 530, 745, 745),
     (772, 534, 1001, 745), (1053, 530, 1262, 745), (1328, 529, 1474, 745)),
    ((73, 777, 223, 989), (315, 782, 471, 989), (560, 782, 762, 989),
     (803, 782, 1028, 989), (1076, 783, 1284, 989), (1358, 777, 1509, 989)),
)
# Midpoint of the two boot contact extents in the bottom four source rows.
# A weapon tip is excluded from this measurement; anchors refer to ground contact.
FOOT_X = (
    (138, 395, 652, 878.5, 1150, 1419),
    (136, 402.5, 639, 918.5, 1174.5, 1416),
    (141, 400.5, 666, 923, 1184, 1420),
    (125, 386, 631.5, 871.5, 1147, 1412),
)
FOOT_Y = (254, 498, 745, 989)
# Match the established actor's 54px visible idle body, rendered at 2/3 scale.
# Apply one scale per direction to every pose, preserving crouch/extension.
SOURCE_IDLE_HEIGHT = (208, 210, 216, 212)
MOTION_CONTACT = Path("output/cocos-sword-127/motion-contact.png")
MOTION_ROOT = Path("assets/generated/hearthwood/sword-motion-v1")
MOTION_STAGES = ("walk_contact", "walk_passing", "dodge_lean", "dodge_recover")
MOTION_SOURCES = {
    "motion.png": "b8c4ff924d42022b2ad9fbf212ff7e5fdc36d1529ccf61bae69aa77d2b6bb348",
    "passing-compact.png": "f367682c24fcc69e0439abd8ef8f260e1d225abdb2cfe4b75ce015aa10e17d77",
}
# Source, measured crop, boot-support midpoint, shared standing-height reference.
# The dedicated compact passing sheet replaces near-identical original walk B
# poses. Intermediate passing drafts and their prompts are preserved, not bound.
MOTION_POSES = (
    (("motion.png", (48, 35, 233, 302), (155, 302), 267),
     ("passing-compact.png", (56, 118, 424, 641), (285, 641), 523),
     ("motion.png", (667, 94, 893, 300), (775.5, 300), 267),
     ("motion.png", (1004, 74, 1204, 300), (1114.5, 300), 267)),
    (("motion.png", (74, 333, 282, 601), (151.5, 601), 268),
     ("passing-compact.png", (689, 118, 1057, 640), (835, 640), 522),
     ("motion.png", (680, 387, 915, 601), (795, 601), 268),
     ("motion.png", (1028, 374, 1235, 601), (1109.5, 601), 268)),
    (("motion.png", (51, 634, 239, 897), (164, 897), 263),
     ("passing-compact.png", (1178, 118, 1516, 640), (1400, 640), 522),
     ("motion.png", (664, 686, 910, 889), (798.5, 889), 263),
     ("motion.png", (1010, 663, 1232, 889), (1119, 889), 263)),
    (("motion.png", (64, 934, 259, 1199), (140.5, 1199), 265),
     ("passing-compact.png", (1770, 118, 2097, 640), (1885, 640), 522),
     ("motion.png", (659, 976, 897, 1195), (773, 1195), 265),
     ("motion.png", (999, 963, 1207, 1187), (1106.5, 1187), 265)),
)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def file_sha(path):
    return sha((ROOT / path).read_bytes())


def png_bytes(image):
    buf = BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def normalize_frame(image, rect, anchor, scale):
    cut = image.crop(rect)
    cut.putalpha(cut.getchannel("A").point(lambda a: 255 if a >= 160 else 0))
    # Clear hidden RGB without changing any visible source color.
    clean = Image.new("RGBA", cut.size)
    clean.alpha_composite(cut)
    target_size = tuple(round(length * scale) for length in clean.size)
    cut = clean.resize(target_size, Image.Resampling.NEAREST)
    relative_anchor = ((anchor[0] - rect[0]) * scale, (anchor[1] - rect[1]) * scale)
    offset = tuple(round(FOOT_ANCHOR[i] - relative_anchor[i]) for i in range(2))
    assert offset[0] >= 0 and offset[1] >= 0
    assert offset[0] + cut.width <= 96 and offset[1] + cut.height <= 96
    frame = Image.new("RGBA", FRAME_SIZE)
    frame.alpha_composite(cut, offset)
    return frame, {
        "source_crop": list(rect), "source_foot_anchor": list(anchor),
        "scale": scale, "resized_size": list(target_size),
        "destination_offset": list(offset), "visible_bounds": list(frame.getbbox()),
    }


def build():
    assert file_sha(SOURCE) == SOURCE_SHA, "Approved source changed"
    image = Image.open(ROOT / SOURCE).convert("RGBA")
    assert image.size == (1536, 1024)
    frames = []
    poses = []
    for row, direction in enumerate(DIRECTIONS):
        scale = 54 / SOURCE_IDLE_HEIGHT[row]
        for col, stage in enumerate(STAGES):
            rect = BOUNDS[row][col]
            frame, normalized = normalize_frame(image, rect, (FOOT_X[row][col], FOOT_Y[row]), scale)
            frames.append(frame)
            poses.append({
                "direction": direction, "stage": stage, "source": str(SOURCE), **normalized,
                "atlas_rect": [col * 96, row * 96, 96, 96],
            })

    motion_images = {}
    for name, expected_sha in MOTION_SOURCES.items():
        assert file_sha(MOTION_ROOT / name) == expected_sha, f"Motion source changed: {name}"
        motion_images[name] = Image.open(ROOT / MOTION_ROOT / name).convert("RGBA")
    motion_frames = []
    motion_poses = []
    for row, direction in enumerate(DIRECTIONS):
        for col, stage in enumerate(MOTION_STAGES):
            name, rect, anchor, standing_height = MOTION_POSES[row][col]
            frame, normalized = normalize_frame(motion_images[name], rect, anchor, 54 / standing_height)
            motion_frames.append(frame)
            motion_poses.append({
                "direction": direction, "stage": stage, "source": str(MOTION_ROOT / name), **normalized,
                "atlas_rect": [col * 96, row * 96, 96, 96],
            })

    outputs = {}
    records = []
    for name, cols, packed_frames, binding in (
        ("actor-0", 6, frames, "combat/sword-actor-0"),
        ("motion-0", 4, motion_frames, "combat/sword-motion-0"),
    ):
        sheet = Image.new("RGBA", (cols * 96, 384))
        for index, frame in enumerate(packed_frames):
            sheet.alpha_composite(frame, (index % cols * 96, index // cols * 96))
        path = OUT / f"{name}.png"
        data = png_bytes(sheet)
        outputs[path] = data
        source = SOURCE if name == "actor-0" else MOTION_ROOT / "motion.png"
        prompt = (SOURCE.parent / "refine.prompt.txt" if name == "actor-0"
                  else MOTION_ROOT / "motion-refine.prompt.txt")
        records.append({
            "appearance_id": 0, "weapon_id": "stone_sword", "path": str(path),
            "binding": binding, "width": cols * 96, "height": 384,
            "sha256": sha(data), "bytes": len(data), "alpha": [0, 255],
            "source": str(source), "source_sha256": file_sha(source),
            "prompt_path": str(prompt), "prompt_sha256": file_sha(prompt),
            "processing_sources": [{"path": str(source), "sha256": file_sha(source)}] if name == "actor-0" else [
                {"path": str(MOTION_ROOT / source_name), "sha256": digest}
                for source_name, digest in MOTION_SOURCES.items()],
        })

    # Documentation only; no contact-sheet labels enter the runtime atlas.
    contact = Image.new("RGBA", (1232, 1052), "#e8dfc5")
    draw = ImageDraw.Draw(contact)
    for col, stage in enumerate(STAGES):
        draw.text((68 + col * 192, 10), stage, fill="#27392f")
    for row, direction in enumerate(DIRECTIONS):
        draw.text((8, 74 + row * 192), direction, fill="#27392f")
        for col in range(6):
            frame = frames[row * 6 + col].resize((192, 192), Image.Resampling.NEAREST)
            x, y = 64 + col * 192, 30 + row * 192
            draw.line((x, y + 160, x + 191, y + 160), fill="#c5b998")
            contact.alpha_composite(frame, (x, y))
    draw.text((64, 814), "Existing actor vs held pose: native pixels (left) and 2x nearest (right)", fill="#27392f")
    old = Image.open(ROOT / "assets/runtime/hearthwood/village/actor-0.png").crop((0, 0, 48, 64))
    contact.alpha_composite(old, (72, 858))
    contact.alpha_composite(frames[0], (128, 841))
    contact.alpha_composite(old.resize((96, 128), Image.Resampling.NEAREST), (300, 840))
    contact.alpha_composite(frames[0].resize((192, 192), Image.Resampling.NEAREST), (412, 806))
    outputs[CONTACT] = png_bytes(contact)

    motion_contact = Image.new("RGBA", (1232, 812), "#e8dfc5")
    motion_draw = ImageDraw.Draw(motion_contact)
    for col, stage in enumerate(("ready",) + MOTION_STAGES):
        motion_draw.text((68 + col * 224, 10), stage, fill="#27392f")
    for row, direction in enumerate(DIRECTIONS):
        motion_draw.text((8, 74 + row * 192), direction, fill="#27392f")
        for col, frame in enumerate([frames[row * 6]] + motion_frames[row * 4:row * 4 + 4]):
            x, y = 64 + col * 224, 30 + row * 192
            motion_draw.line((x, y + 160, x + 191, y + 160), fill="#c5b998")
            motion_contact.alpha_composite(frame.resize((192, 192), Image.Resampling.NEAREST), (x, y))
    outputs[MOTION_CONTACT] = png_bytes(motion_contact)

    prompts = [SOURCE.parent / "generate.prompt.txt", SOURCE.parent / "refine.prompt.txt"]
    prompts += [path.relative_to(ROOT) for path in sorted((ROOT / MOTION_ROOT).glob("*.prompt.txt"))]
    source_prompts = {
        "motion-draft.png": "motion.prompt.txt", "motion.png": "motion-refine.prompt.txt",
        "passing.png": "passing.prompt.txt", "passing-front.png": "passing-front.prompt.txt",
        "passing-compact.png": "passing-compact.prompt.txt",
    }
    sources = []
    for name, prompt_name in source_prompts.items():
        path, prompt = MOTION_ROOT / name, MOTION_ROOT / prompt_name
        source_image = Image.open(ROOT / path)
        sources.append({
            "path": str(path), "sha256": file_sha(path), "bytes": (ROOT / path).stat().st_size,
            "width": source_image.width, "height": source_image.height,
            "prompt_path": str(prompt), "prompt_sha256": file_sha(prompt),
            "runtime_input": name in MOTION_SOURCES,
        })

    manifest = {
        "schema_version": 1, "created_on": "2026-10-23",
        "status": "runtime_derivative_candidate_owner_style_approved_runtime_review_pending",
        "owner_checkpoint": "Owner accepted the four-direction six-key-pose preview with 合适 on 2026-10-23; derived atlas and gameplay have separate review.",
        "creator": "OpenAI built-in image_gen; original RealQuest artwork",
        "rights": "Project-generated source, no third-party source or font added",
        "script": "tools/build_sword_art.py", "script_sha256": file_sha(Path(__file__).relative_to(ROOT)),
        "source": {"path": str(SOURCE), "sha256": SOURCE_SHA, "width": 1536, "height": 1024,
                   "provenance": "docs/art/references/sword-motion-preview-v1/provenance.json",
                   "prompts": ["docs/art/references/sword-motion-preview-v1/generate.prompt.txt",
                               "docs/art/references/sword-motion-preview-v1/refine.prompt.txt"]},
        "sources": sources,
        "prompts": [{"path": str(path), "sha256": file_sha(path)} for path in prompts],
        "generation_review": "Initial supplemental walk B omitted some blades; targeted refinement repaired blades but retained near-identical strides. Separate passing drafts corrected feet and hands but became too slender. Final passing-compact.png preserves correct sword hands and restores compact proportions. Only motion.png and passing-compact.png contribute to the motion atlas; all drafts and prompts remain preserved outside runtime bundles.",
        "processing": "Measured complete silhouettes; alpha >= 160; hidden transparent RGB cleared; nearest-neighbor packing; fixed per-direction body scale and common boot anchor. Original motion poses generated with built-in image_gen; Python performs no source repaint, invented pose, added weapon or painted pixel.",
        "frame_size": list(FRAME_SIZE), "sheet_size": [576, 384],
        "foot_anchor_from_top_left": list(FOOT_ANCHOR), "world_scale": 2 / 3,
        "world_canvas_size": [64, 64], "standing_visible_body_world_height": 36,
        "directions": list(DIRECTIONS), "stages": list(STAGES),
        "sampling": "nearest", "trim": False,
        "poses": poses, "motion_stages": list(MOTION_STAGES), "motion_poses": motion_poses, "records": records,
        "contact_sheets": [{"path": str(path), "sha256": sha(outputs[path])} for path in (CONTACT, MOTION_CONTACT)],
        "limits": [
            "The attack source contains six key poses per direction; supplementary genuine artwork provides two walk and two dodge keys per direction. There is no dedicated damage pose.",
            "Weapon and arc are painted into the source pose; this atlas represents the accepted short-sword silhouette, not independent replacement sword layers.",
            "This slice is actor-0 and stone_sword only. Other appearances and weapons must retain their existing presentation.",
            "Two-frame walk/dodge cycles are limited key animation, not a complete high-frame-count animation set. Supplementary generated frames are candidates for runtime review.",
            "Owner approval covers source style/proportions/poses only; runtime timing and scene readability require actual Cocos review.",
        ],
    }
    outputs[MANIFEST] = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode()
    return outputs


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    for path, data in build().items():
        destination = ROOT / path
        if args.check:
            assert destination.read_bytes() == data, f"Rebuild differs: {path}"
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
    print(f"{'Verified' if args.check else 'Built'} 2 sword atlases / 40 packed poses, 2 contact sheets and provenance; sources unchanged.")


if __name__ == "__main__":
    main()
