# RealQuest Asset Plan and Provenance

**Checked:** 2026-10-10.  
**Direction:** Hearthwood.  
**Scope:** Fill the next UI/interaction slice, not replace the entire game's art.

## 1. What is actually supplied

The kit includes **eight unmodified PNG source samples** from the official Pixel-Boy Ninja Adventure repository: four button states and four small frame textures. The PNG bytes were retrieved and checked against their Git blob hashes; dimensions and SHA-256 values are in `asset-manifest.json`.

These are raw source assets, not a finished RealQuest UI kit. They have not been installed in the owner's game. Some original colors are deliberately more saturated than the selected Hearthwood direction. Treat them as reusable shape/state references, not authorization to paste all eight styles into the product. Original upstream names are preserved.

The kit also includes design tokens, an asset audit tool, and a binding manifest with explicit gaps. It does **not** include the complete Kenney packs, a complete world tileset, crop animations, production portraits, or font binaries. External pack download links are provided below. Direct archive retrieval was not completed in the preparation environment; do not mark those entries as downloaded.

## 2. Selected acquisition list

| Priority | Source | Selected purpose | Delivery status |
|---|---|---|---|
| P0 | [Kenney UI Pack - Pixel Adventure](https://kenney.nl/assets/ui-pack-pixel-adventure) | Primary acquisition pool for UI borders, buttons, slots, tabs, and control parts | Official page verified; full pack must be downloaded and audited |
| P0 | [Ninja Adventure](https://pixel-boy.itch.io/ninja-adventure-asset-pack) | Preserve a coherent existing world family if it matches; source button/frame samples; possible matching portraits/items | Eight UI source PNGs supplied; full pack and existing-project match not verified |
| P1 | [Kenney Input Prompts Pixel](https://kenney.nl/assets/input-prompts-pixel) | Keyboard, mouse, and touch hints | Official page verified; not bundled |
| P1 | [Kenney Interface Sounds](https://kenney.nl/assets/interface-sounds) | A small set of menu, selection, confirmation, and cancellation sounds | Official page verified; not bundled |

The official pages for these four packs identify them as CC0. Ninja Adventure describes characters, tilesets, items, UI, effects, and audio; this is a catalog description, not proof that a specific crop sequence or required animation exists. Kenney Input Prompts Pixel identifies a 16 x 16 grid. Do not infer that every asset in every pack uses the same frame size.

Download from the creator pages, preserve the included license text, and record the downloaded archive's hash before selecting files. The CC0 deed permits copying, modification, and distribution, including commercial use, subject to its stated limitations: [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/). This does not verify the rights of an arbitrary mirror or grant rights in unrelated brands or characters.

No paid purchase is required for this selected baseline. Do not substitute a free non-commercial edition of another pack. Do not add a second world family just to obtain one decorative object.

## 3. Selected source roles, not a shopping list

**World and actors:** first audit the current project's licensed art. Keep it if coherent. If it has no traceable source or mixes incompatible pixel densities, use the official Ninja Adventure pack as the single fallback candidate and review a small yard before migration. Do not import its Godot project into the Phaser application.

**UI:** acquire Kenney Pixel Adventure, inspect its sheets, and select one compatible material/color family. Treat the pack as parts. The inventory still needs the layout and behavior specified in DESIGN.md. No generic pack will supply RealQuest's complete task journal or map.

**Input hints:** import only the keys and input types actually supported. Recommended first subset: interact, inventory, cancel, the four quick slots, movement, pointer, and touch. Do not display gamepad bindings unless gamepad support exists. Plain localized labels remain the fallback.

**Audio:** choose no more than six initial cues: open, close, select, confirm, invalid, and reward. Audition them, normalize conservatively if needed, document transformations, and test in browser after a user gesture. Source availability is not evidence that a sound has been auditioned. Muted play remains fully usable.

## 4. Immediate missing assets and bindings

Names below are **proposed semantic IDs**, not claims about existing filenames.

| Semantic role | Needed states/content | Source or production path | Current state |
|---|---|---|---|
| `ui.button.primary` | default, hover, pressed, focus, disabled, pending | Tokens + selected source button geometry | Raw samples supplied; component not integrated |
| `ui.surface.inventory` | linen center, restrained timber edge | Selected Kenney parts + DOM layout | Download and measure |
| `ui.slot` | empty, occupied, selected, bound, depleted | Shared component; selected frame or CSS state | Needs implementation |
| `ui.prompt.interact` | current input + localized verb | Input Prompts Pixel | Download and map |
| `ui.quest.marker` | available, tracked, ready, locked | Coherent existing icon or selected UI atlas | Audit first |
| `ui.map.marker` | building, actor, destination, player | Reuse audited world silhouettes/portraits | Audit and bind |
| `portrait.player` | selected actor's actual portrait | Matching faceset only | Not supplied; controlled sprite preview is fallback |
| `item.seed`, `item.wood`, `item.stone` | existing identity and counts | Keep current authorized item sprites | Repository audit required |
| `farm.plot` | prepared, seeded, growing, mature | Existing farm art or a coherent original sequence | Required gap; not claimed as supplied |
| `fx.plant` / `fx.pickup` | short local feedback | Existing matching effect or small original sequence | Required gap; not claimed as supplied |
| `sfx.ui.*` | six restrained cues | Interface Sounds | Download, audition, map |

Do not bind a visually similar icon to the wrong item merely to fill a field. Do not represent a seed, a crop, and a tool with the same symbol. Do not add capabilities because the pack contains an attractive icon for them.

## 5. Supplied PNG sources

Upstream creator repository: [pixel-boy/NinjaAdventure](https://github.com/pixel-boy/NinjaAdventure), linked from the creator's asset page. Local files are under `assets/vendor/ninja-adventure/ui/`.

| Upstream path | Actual size | Intended handling |
|---|---|---|
| `theme/theme_1/button_normal.png` | 16 x 8 | Source button geometry; audit center and edge slices |
| `theme/theme_1/button_hover.png` | 16 x 8 | Matching hover source |
| `theme/theme_1/button_pressed.png` | 16 x 8 | Matching pressed source |
| `theme/theme_1/button_disabled.png` | 16 x 8 | Matching disabled source |
| `theme/nine_path_2.png` | 16 x 16 | Raw frame example, not the default inventory skin |
| `theme/nine_path_10.png` | 16 x 16 | Raw frame example, not an approved alternate palette |
| `theme/nine_path_11.png` | 16 x 16 | Raw frame example, not an approved alternate palette |
| `theme/nine_path_12.png` | 16 x 16 | Dark frame candidate for small HUD elements |

A file's name is not slice metadata. Determine edge widths, corner geometry, transparency, and center treatment from pixels before using it as a CSS border or Phaser NineSlice. Large source-frame colors are not automatically approved text backgrounds. Keep originals unchanged and record any derived palette mapping separately.

Courtesy credit: **Ninja Adventure artwork by Pixel-Boy and AAA; Kenney assets by Kenney.** Attribution is good practice here even where the listed CC0 dedication does not require it.

## 6. Import and audit workflow

1. Preserve this kit in a reviewable branch. Merge root documentation; do not overwrite existing repository rules blindly.
2. Download the selected packs through their official pages. Do not execute downloaded examples or installers.
3. Run the optional local ZIP inventory tool:

   ```bash
   python3 tools/audit_asset_zip.py path/to/downloaded-pack.zip \
     --report /tmp/realquest-asset-audit.json
   ```

   This tool reads metadata; it does not install assets, validate licensing automatically, or extract fonts.
4. Inspect the PNGs/contact sheets, source license, and actual animation coverage. Record archive version/hash, file paths, and license in the project registry.
5. Map semantic IDs to real files and frames. Record sprite sheet margin, spacing, cell dimensions, animation direction/order, visible bounds, and pivot as applicable.
6. For UI, measure source slice insets. For actors, distinguish full frame dimensions from the visible body. For crops, confirm that growth states match the existing gameplay model.
7. Import only the selected runtime subset through the project's existing asset pipeline. Keep an untouched source copy outside the runtime public directory.
8. Test one inventory-to-soil slice before replacing other screens or world assets.

The manifest intentionally contains null paths for unmapped roles. Resolve them from actual files; never turn null into an invented filename to satisfy a build.

## 7. What still requires design work

A final inventory layout, a usable journal, a spatial map, coherent transitions, and responsive input cannot be downloaded as individual PNGs. The supplied source files and selected packs supply parts; DESIGN.md defines how those parts become a product.

The first deliverable is a working reference screen, not a claim that the entire art pipeline is complete. Record candidate/approved status, owner approval, and implementation commit before expanding the treatment.
