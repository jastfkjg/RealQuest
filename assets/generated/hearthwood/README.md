# Inventory satchel material

## Fine village sources, 2026-10-15

`village-{scenery,actors,details}-v2.png` are immutable original built-in image_gen sheets based on the owner-approved fine-village reference. Adjacent `.prompt.txt` files contain the exact prompts. They are processed by `tools/build_village_art.py` (Python/Pillow) into48 runtime sprites/portraits. Processing is explicit alpha threshold, measured cropping, nearest-neighbor native sizing and three documented outfit palette ramps. Unlike the UI shells below, these are deliberately processed derivatives, not lossless copies of their source sheet.

`village-actors-v2.layout.json` records the reviewed four directions and two complete walking poses. The clipped generated bottom row is excluded; the actual loop is idle/stepA/idle/stepB. Source and runtime dimensions/hashes, cuts, palette choices and rebuild hash are in `docs/art/village-art-v2.json`; task18 records actual browser evidence. Original vendor assets remain untouched; no new pack/font/audio.

Original generated RealQuest UI decoration, produced with the built-in `image_gen` tool on 2026-10-10 from the owner-approved concept in `docs/art/references/inventory-satchel-concept.png`. The exact generation prompt is `satchel-shell-v1.prompt.txt`. No external asset pack was acquired. The concept's background is illustrative, not a world asset.

The immutable PNG is 1254×1254 RGBA. It has no text or interactive content. `tools/build_inventory_skin.py` losslessly encodes the runtime WebP and verifies exact decoded RGBA equality; it does not edit or resize the art. Rebuild with Python + Pillow/WebP, then run `tools/audit_inventory_assets.py`. Both tools resolve paths relative to the repository.

Hashes, actual dimensions, source/runtime paths and CSS nine-slice metadata are in `docs/art/asset-manifest.json`. The actual implementation is a review candidate. Concept approval does not approve reuse across other dialogs. This material is generated project artwork; it is not represented as a CC0 third-party pack asset.

## Village arrival materials

`arrival-village-v1.png` and `arrival-register-v1.png` were generated from the owner-approved `docs/art/references/arrival-concept-v1.png` using built-in image_gen. The adjacent `.prompt.txt` files contain exact prompts. The former is a static character-free, text-free welcome illustration, not a playable tileset. The latter is a transparent blank paper/moss-cloth/timber material, with all content provided by DOM. Rebuild each with `tools/build_inventory_skin.py --asset <name>`. Pixel equality, hashes, dimensions and measured slice values are in the manifest. Actual browser acceptance remains pending.
