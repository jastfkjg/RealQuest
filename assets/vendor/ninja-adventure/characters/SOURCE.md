# Additional traveler appearances — 2026-10-10

Creator: Pixel-boy / Sparklin Labs. CC0-1.0, license copied unchanged alongside these files.

Official source: https://github.com/sparklinlabs/superpowers-asset-packs
Fixed commit: `e8674a03ab4456802f71f848c4df79eccca23f7a` (same as original three character bindings).

| Immutable upstream file | Runtime binding | ID |
|---|---|---|
| `ninja-adventure/characters/6.png` | `frontend/public/assets/ninja-adventure/character-3.png` | 3 |
| `ninja-adventure/characters/9.png` | `frontend/public/assets/ninja-adventure/character-4.png` | 4 |
| `ninja-adventure/characters/5.png` | `frontend/public/assets/ninja-adventure/character-5.png` | 5 |

Each PNG is 64×112, with 16×16 cells, four direction columns and four walking rows. First four rows of all sheets visually inspected in `output/arrival-reference/selected-character-frames.png`. Remaining action rows are unused. Source and runtime bytes are identical. Hashes, Git blob IDs, exact raw URLs and bounds are in `docs/art/asset-manifest.json`. Re-run `tools/audit_inventory_assets.py` to verify them. Original appearance IDs 0–2 and their files are unchanged. Character labels are cosmetic, never classes/stat bonuses.

Only these three selected files ship. Other candidates stayed in ignored output for inspection. Two candidates had only two animation rows and were rejected rather than inventing animation frames.
