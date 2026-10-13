# RealQuest Asset Plan and Provenance

## Study journey material reuse — 2026-10-13

`StudyLibrary` and the extended study book reuse the same audited journal spread, shared Hearthwood tokens, selected actor frame and installed Lucide icons. Plan spines, dated index and recovery layout are DOM/CSS; no new bitmap, font, audio, generated artwork or source modifications. Source/runtime manifest remains unchanged; 31-image audit passes. Evidence: `docs/tasks/08-study-journey.md`.

## Today study material reuse — 2026-10-13

`StudyPage.tsx` / `study.css` reuse the existing `journal-spread-v1.webp` and selected `PixelPerson` sheet without source edits, resampling, new raster downloads or generated artwork. The original journal nine-slice uses the already audited 220/140/260/140 source insets; the mobile view exposes one leaf. Actor frames stay at integer 3×/4× scaling. The hourglass is original project SVG geometry authored in `StudyPage.tsx` and colored with existing Hearthwood tokens. It is decoration beside a native DOM timer, not a raster asset or simulated possession. No new font, audio or runtime image is added. Candidate evidence: `docs/tasks/06-today-study.md`.

## World-dialog item correction — 2026-10-10

Owner reported that the existing wood crop looked like an orange vessel and the seed pouch looked like a medical bag. Audit confirmed wood was cropped from `tileset.png` at `(16,144,32,160)` by `frontend/scripts/build-village-assets.py`; the seed was a code-drawn bag with a cross. Their pixels did not communicate the stable item meanings.

Two new **original project icons**, `frontend/public/assets/hearthwood/items/{wood,seed}.png`, replace only the presentation bindings: bark logs with cut ends/growth rings, and an open seed pouch with grains and a sprout. Both are 16×16 RGBA; together they add 509 bytes. `tools/build_item_icons.py` rebuilds them deterministically; `--check` compares decoded pixels without changing files. Exact file/script SHA-256, dimensions and visible bounds are in `asset-manifest.json` under `original_item_assets`. Existing source and legacy runtime PNGs remain byte-identical.

The shared item registry, CSS quickbar, commission rewards, storage and repair materials use these identities. Other item sprites, actors, the world tileset and all supplied source samples remain unchanged. Dialog materials are scoped CSS; repair art reuses the audited house derivatives. No new external pack, font or generated background is acquired in this pass. Current candidate and screenshots: [world-dialog task record](../tasks/05-world-dialogs.md).

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

## 8. Initial Pass A repository audit — 2026-10-10 (superseded visual candidate)

Actual files, rather than acquisition entries, were audited with `tools/audit_inventory_assets.py`. All eight supplied samples match their documented SHA-256 and Git blob hashes. Thirteen existing runtime PNGs were also inventoried, for 21 total; sizes, alpha bounds and hashes are recorded in the manifest and `output/inventory-pass-a/asset-audit.json`. The contact sheet was opened and visually inspected.

- The four 16×8 button samples use orange/brown fills. Pressed artwork has a transparent first row; its alpha bounds are `[0, 1, 16, 8]`. The 16×16 frames have four different material/color treatments. None is adopted as an inventory skin. Slice insets remain unset because no nine-slice asset is being used.
- Inventory uses original CSS geometry with the supplied Hearthwood tokens. This is a candidate implementation, not an approved derived PNG skin. The raw source samples remain outside `frontend/public` and unchanged.
- All six existing item/currency icons are 16×16. Wood is the recorded CC0 tileset crop; seed, crop, stone, plank and gold are project-generated originals. Their provenance must not be inferred from the `ninja-adventure` directory name. The selected item icon is 48 CSS pixels (3×), slot/quick icons are 32 (2×), and compact currency art is 16 (1×).
- The source sprite sheets, houses and terrain remain unchanged. The existing procedural farm states in `art.ts` / `WorldScene.ts` remain in use; this pass does not supply or approve new crop animations.
- Kenney packs are still absent. No download, font installation, source recoloring, source-file modification or new runtime image was needed for this candidate.
- Existing wood artwork is more saturated than the new UI; retained for identity and provenance continuity. Any icon replacement requires a separate reviewed binding, not a guessed asset path.

Visual candidate and exact verification are recorded in `docs/tasks/01-inventory-slice.md`. Owner approval is pending.

## 9. Approved satchel direction — implementation candidate

The owner approved the [generated concept](references/inventory-satchel-concept.png) and explicitly requested implementation of the bag, floating item tag and quick pockets. This supersedes the initial plain linen composition for inventory only. The actual browser render still awaits review; other dialogs and the concept's illustrative world changes are excluded.

One original textless material was produced with the built-in `image_gen` tool from that approved concept. The raw source is `assets/generated/hearthwood/satchel-shell-v1.png` (1254×1254 RGBA, 2,170,323 bytes). The [exact prompt](../../assets/generated/hearthwood/satchel-shell-v1.prompt.txt) is preserved. It contains only the moss cloth shell, leather and brass; no baked text, item, grid, quantity or button. This is generated project artwork, not an installed Kenney/Ninja UI skin or a claimed third-party CC0 asset.

`tools/build_inventory_skin.py` packages it as lossless WebP (`lossless=True`, `exact=True`, `method=6`) and asserts decoded RGBA equality. The sole new runtime file is `frontend/public/assets/hearthwood/satchel-shell-v1.webp` (1,414,574 bytes). The source is unchanged and stays outside `public`. Runtime uses measured CSS nine-slice insets of top 220 / right 180 / bottom 200 / left 180 source pixels; the pocket roll samples the same cloth through a centered CSS background. The source hash, runtime hash, dimensions, pixel equality and paths are audited in `asset-manifest.json` and `tools/audit_inventory_assets.py`.

The title plaque, linen inset, slot selection brackets, pointer, floating tag and pocket seams are original DOM/CSS using Hearthwood tokens. Existing 16px item PNGs remain byte-identical, with 48px tray/detail/desktop pocket icons and 32px phone pocket icons. All original 21 PNGs and eight raw-source Git blobs still match the manifest. The new audit has 22 entries including the generated WebP. Kenney packs remain absent. No world, portrait, font or sound replacement is implied.

## 10. Journal slice — inventory approved, journal candidate

On 2026-10-10 the owner approved the actual satchel and requested a journal using the same materials and palette, with its own reading layout. See `docs/tasks/02-journal-slice.md` for the scoped checkpoint.

One original blank journal spread was generated with built-in `image_gen`, using only the previously generated satchel as a material reference. Source `assets/generated/hearthwood/journal-spread-v1.png` is 1536×1024 RGBA; exact prompt is adjacent. No third-party sample was submitted to generation. The source has no text, tasks, numbers or controls. This is project-generated art, with runtime approval pending.

`tools/build_inventory_skin.py --asset journal-spread-v1` packages the unmodified pixels as `frontend/public/assets/hearthwood/journal-spread-v1.webp` (1,326,372 bytes), asserting RGBA equality. Both hashes and measured CSS slice insets are in the manifest. Desktop renders a bound double page; phone clips one leaf of the same nine-slice. Fixed edge depths preserve paper behind long entries. Existing gold/seed icons are reused at 32 CSS pixels; all content is DOM.

Audit: eight source samples and all original runtime hashes unchanged; 23 total entries including the two generated surfaces. Kenney packs remain acquisition entries only. No font, world, economy or save changes. Journal screenshots have been inspected, but owner approval is pending.

## 11. Adventurer dossier — character candidate

The owner authorized character UI next, with a different layout from the journal. The single field dossier contains an identity portrait/name, actual level/experience, five attribute selectors and the selected ability/actions. No character art, equipment, unsupported attributes or economic rules were invented.

Built-in `image_gen` made one blank backing with the approved project-generated satchel as material/color reference only. Source `assets/generated/hearthwood/character-dossier-v1.png` is 1448×1086 RGBA (2,411,527 bytes), with an adjacent exact prompt. Runtime `frontend/public/assets/hearthwood/character-dossier-v1.webp` is 1,473,240 bytes, losslessly packaged by `tools/build_inventory_skin.py --asset character-dossier-v1` with RGBA equality asserted. It contains only cloth, blank paper, clips and leather corners. Existing 16px actor frames render at 64 CSS pixels, and all text/values/actions remain native DOM.

The source/runtime hashes, alpha bounds and measured nine-slice cuts are recorded in the manifest. Audit now verifies 24 entries; original assets and raw samples remain unchanged, and Kenney packs remain absent. Actual character render is a candidate awaiting owner review. Details in `docs/tasks/03-character-slice.md`.

## 12. Village arrival — homepage candidate

The owner approved `references/arrival-concept-v1.png` and authorized implementation with softer registration controls and more appearance choices. The actual browser render is still a candidate. The name is the existing character name, not a new account/login system.

Two textless project artworks were generated with built-in `image_gen` from the approved concept: `assets/generated/hearthwood/arrival-village-v1.png` (1586×992 RGB) and `arrival-register-v1.png` (1122×1402 RGBA). Exact prompts are adjacent. `tools/build_inventory_skin.py --asset <name>` creates WebP with decoded RGBA equality: 1,565,666 bytes for the static welcome illustration and 1,203,260 bytes for the blank paper/wood/cloth surface. Only DOM renders text, signature input, portrait selection and the start button. These files do not replace world tiles.

Three real CC0 character sheets from the existing official Superpowers source commit are added as IDs 3–5: upstream `6.png`, `9.png`, `5.png`. Original IDs 0–2 and their bytes remain unchanged. The 64×112 sheets have real four-direction walking frames; source originals and license are in `assets/vendor/ninja-adventure/characters`. Two inspected candidates with only two animation rows were not used. The manifest records exact URLs, hashes, geometry, bounds and byte-identical runtime copies. No characters were generated or recolored.

Audit passes for 29 images including the original eight source references, unchanged runtime files, five generated materials and three added sprites. Kenney packs remain absent. No font or audio additions. Full-screen illustration remains static; arrival and hover transitions honor reduced motion. See task 04 for actual screenshots, checks and remaining limits.
