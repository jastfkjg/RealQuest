# RealQuest Asset Plan and Provenance

## Next departure journal — 2026-10-16

No new raster, font, audio, downloaded pack or generated source. A scoped native React/CSS journal reuses the original village arrival vignette, backpack/book PNGs, magic emblem and registry item symbols unchanged. Cloth stitching, book binding, route knots, paper bookmarks and the return slip are CSS/DOM; Chinese text remains native. Bindings and the empty new-asset list are recorded under `next_departure_journal` in the manifest. Actual render approval is pending; evidence and limits: [task33](../tasks/33-next-departure.md).

## Functional worktables and field pages — 2026-10-16

No new image, font, audio, source processing or external pack is added. The armory and utility frames reuse `commission-wood-v1.webp` and the full textless `encounters/notice-paper.webp`; no new paper slice margin is claimed. Existing magic emblem, book, stone, backpack, chest, journey cliff and village vignette supply the scene props. The building sketch now uses the audited Hearthwood home/workshop/library PNGs rather than the old Ninja placeholder. Stone arches are original native CSS geometry; weapon/key art remains the existing item registry. Bindings and exact reuse are in `living_field_panels`;156-image preservation passes. Evidence and pending owner review: [task32](../tasks/32-field-panels.md).

## Overall controls — 2026-10-16

The requested overall control refinement adds no raster, font, audio, external pack or processing. Soft geometry, grain, bevel, shelf and selection treatments are native CSS using the shared Hearthwood tokens; short shelves reuse the existing `commission-wood-v1.webp`. Installed Lucide supplies market bookmark icons. All existing art is unchanged; bindings and the empty new-asset list are recorded under `living_controls` in the manifest. Actual browser evidence and pending owner review: [task31](../tasks/31-living-controls.md).

## World UI refinement — 2026-10-16

The requested doorway, cue, notification, market, bedside, equipment and board refinement adds no image, font, sound, external pack or processing. Existing timber, pinned paper, bed, counter and item assets are reused unchanged; compact punctuation is original Phaser geometry. All Chinese text and server actions stay native. Bindings/reuse are recorded under `world_ui_refinement` in the manifest; evidence and limitations: [task30](../tasks/30-world-ui-refinement.md). Actual render remains pending owner review.

## First expedition guidance — 2026-10-16

No image, font, audio, external pack or source processing is added. The guide uses native Chinese DOM/CSS, shared Hearthwood tokens, installed Lucide and existing item identities within the board, armory, cave and tracker. Bindings and the empty new-asset list are recorded under `village_intro` in the manifest. Actual browser evidence and pending owner review: [task29](../tasks/29-first-expedition.md).

## Village combat — 2026-10-16

The five cave floors, entrance, stone gate, route anchors and four enemy silhouettes are original deterministic canvas/Phaser geometry in `frontend/src/game/cave.ts`. Each640×448 world backdrop is drawn at1280×896 source pixels, then bound at0.5 world scale; the existing village actor keeps its established scale and source sheet. The nine new item symbols are original64×64 viewBox inline SVG in `game/items.ts`; installed Lucide supplies DOM action icons. No raster, font, audio, downloaded pack or source-sprite modification is added; no third-party artwork was uploaded to generation. Existing156-image hashes remain audited. These geometry/vector visuals are a playable candidate, with formal cave art, sound, animation and owner approval still pending. Evidence and limitations: [task28](../tasks/28-village-combat.md).

## Day/night and sleep — 2026-10-16

No raster, font, audio, sprite cut or downloaded asset is added. Bedside choices, night reminders and morning outcomes use native Chinese DOM/CSS, existing Hearthwood tokens and already installed Lucide icons. Outdoor night tint and warm doorway light reuse the existing `WorldScene` presentation layer; source imagery and resident sheets remain unchanged. Source bindings are `frontend/src/components/SleepPanel.tsx`, `frontend/src/sleep.css` and the existing clock/canvas/scene. Actual-render approval remains pending; evidence is recorded in task26.

## World map concept and terrain — 2026-10-15

The owner approved `references/world-map-concept-v1.png` for implementation. The concept remains a non-runtime reference. Built-in `image_gen` produced one original textless 1536×1024 terrain illustration from that project-generated concept and the project-generated fine-village reference. The source and exact prompt are `assets/generated/hearthwood/world-map-terrain-v1.{png,prompt.txt}`; a byte-identical PNG copy is the only new runtime art at `frontend/public/assets/hearthwood/world-map-terrain-v1.png`. No external pack, font, sound or vendor artwork was sent to generation. Exact dimensions and hashes are in `asset-manifest.json`. Existing village building and bridge cuts are reused unchanged. The terrain is illustrative; world geometry, marker positions, discovery, and navigation remain live data.

## Illustrated adventurer dossier — 2026-10-15

Owner approved `references/character-dossier-concept-v2.png` and requested implementation with unchanged data and upgrade rules. Built-in image_gen derived one original textless 1536×1024 RGBA sheet, `assets/generated/hearthwood/character-emblems-v2.png`, from that generated concept. Exact prompt is adjacent. Five 512×512 cells become lossless WebP emblems (1,273,356 total bytes) through `tools/build_character_art.py`; decoded source-crop equality and all hashes are recorded in `character-art-v2.json`. Source is never modified or shipped in the runtime bundle. No font, paid pack, downloaded artwork or dependency was added.

The existing dossier backing, arrival-village vignette and saved actor appearance are reused unchanged. Circles, checkmarks, levels, text and actions remain native DOM/CSS. This artwork illustrates ability categories, not owned items or earned unlocks. Actual implementation is a candidate for owner review; evidence and limits are in `docs/tasks/23-character-dossier.md`.

## Daily growth journal — 2026-10-15

The owner approved `references/life-journal-concept-v1.png` with “可以，按此进行实现”. The concept and exact original prompt are reference-only. Built-in `image_gen` generated one original textless asymmetric journal using that project-owned reference; source and prompt are `assets/generated/hearthwood/life-journal-v1.{png,prompt.txt}`. No vendor asset, font, audio or external pack was acquired or uploaded. The existing commission ledger, hourglass and integer-grid icons are reused unchanged.

`tools/build_inventory_skin.py --asset life-journal-v1` packages the1536×1024 RGBA source as a1,391,868-byte lossless runtime WebP, asserting decoded RGBA equality. The manifest records both hashes, bounds, provenance and measured source slices120/110/140/110 (top/right/bottom/left). Desktop CSS edges are72/66/84/66; compact layouts clip the right leaf with60/44/68/44 or40/24/48/24 edges. All date cells, text, timer, state, reward amounts and controls remain DOM. The illustration is not an inventory possession. Actual layout/evidence: task20; runtime owner acceptance remains pending.

## Village board and Lia dialogue — 2026-10-15

Owner approved the two reference-only concepts `references/village-board-concept-v1.png` and `references/library-dialogue-concept-v1.png` and authorized implementation. Built-in `image_gen` produced two original textless assets: `assets/generated/hearthwood/{notice-paper,library-encounter}-v1.png`; exact prompts are adjacent. No vendor pack, font, sound or external acquisition. The library background contains no actors, labels or controls. Its scene is illustrative, not a replacement playable map.

`tools/build_encounter_art.py` packages the library without pixel changes, removes the paper's faint outer shadow with an alpha160 threshold and trims it to1434×867, and crops a104×104 Lia head/shoulder portrait from the already audited original actor sheet. Source images remain untouched. Three lossless runtime WebPs total3,410,296bytes; dimensions, crop, processing, source/runtime hashes and rebuild hash are in `encounter-art-v1.json`, linked from the main manifest and covered by the asset audit. Paper source slices are80px with18px CSS edges. Existing timber, cottage/workshop/item art and actual player appearance are reused. All text, selection, objectives, statuses, rewards and controls remain DOM. Actual-render evidence and limits: task21.

## Fine HUD, item art and interiors — 2026-10-15

The five pictured HUD elements and existing four rooms now use the fine village family. Two original built-in `image_gen` sheets (`items-ui-v3.png`, `interiors-v3.png`) retain exact adjacent prompts outside runtime. `tools/build_detail_art.py` packs nine 64px item/menu illustrations, six 64px original-source head crops and eighteen room pieces: 33 PNGs, 690,923 bytes. The closed chest and portraits reuse the previous original high-resolution village sources; all old source/runtime assets are preserved. No new external pack/font/audio was acquired.

Room scenery uses two native pixels per world unit, with unchanged room geography, furniture collision footprints, object anchors and commands. Fine oak grain, plaster, wainscot, nine-patch rugs and independently depth-sorted furniture replace the coarse room drawing. HUD text stays DOM; utility strokes reuse the installed Lucide dependency. Crops, dimensions, hashes and processing are in `detail-art-v3.json`, linked from the root manifest and covered by the asset audit. Implementation candidate and actual-render acceptance remain distinct; task19 records verification.

## Fine pixel village — 2026-10-15

The owner approved `references/village-fine-concept-v1.png` and requested the existing village at that fidelity with fewer flowers/grass. Three original transparent sheets were generated using built-in `image_gen`: `assets/generated/hearthwood/village-{scenery,actors,details}-v2.png`; exact prompts are adjacent. They remain source files outside the runtime bundle. No new third-party pack, font or audio was acquired, and all previous vendor/runtime image bytes remain unchanged.

`tools/build_village_art.py` measures/trims reviewed cells, thresholds alpha at160 and uses nearest-neighbor normalization. It produces48 runtime PNGs (1,470,001 bytes total) in `frontend/public/assets/hearthwood/village/`. Scenery has two native art pixels per world unit. Actors use48×64 frames at2/3 scale, maintaining a36-world-unit visible body. Four directions use idle/stepA/idle/stepB: the generator's cropped bottom row is explicitly excluded. Three extra saved appearance IDs use documented sky/silver/sun palette derivatives; IDs and player data are unchanged. Separate full-body and head/shoulder crops keep dialogue/HUD identities consistent.

The source sheets are1254×1254 RGBA (1,788,196 bytes),2172×724 RGBA (1,620,642 bytes) and1774×887 RGBA (984,231 bytes), respectively. Exact source/runtime hashes, crop rectangles, alpha bounds, dimensions, processing and rebuild-script hash live in `village-art-v2.json`, linked from `asset-manifest.json`. Existing source/hash checks plus all48 new runtime entries are covered by `tools/audit_inventory_assets.py`.

Ground uses original deterministic canvas composition, with a3840×2560 backing for the existing1920×1280 world. Paths, collision, door/resource anchors and saves remain authoritative. A few white flower clumps, grass clustered near verges/trees and bank stones replace indiscriminate planting. Scenery/actors remain independent depth-sorted objects; canopies fade when they cover the player. Actual render acceptance remains pending; see task18 for browser evidence and limitations.

## Active commission contract — 2026-10-14

The owner approved `references/commission-contract-concept-v1.png` to replace Noah's active-task data blocks with a signed scroll and hourglass. Two new original textless assets were produced using built-in `image_gen`: a blank curled parchment and an empty hourglass frame with transparent surroundings/glass. Sources/prompts are `assets/generated/hearthwood/commission-{scroll,hourglass}-v1.{png,prompt.txt}`. Lossless WebP packaging through `tools/build_inventory_skin.py` asserts RGBA equality; no source edit, resampling, external pack, font or audio. Runtime additions total 2,605,194 bytes. Exact dimensions, hashes, alpha bounds and source/runtime paths are in the manifest.

The scroll uses source slices180/170/200/170, desktop CSS43/40/48/40 and phone33/23/35/23. `ContractHourglass.tsx` draws original clipped SVG sand behind the unmodified transparent frame using authoritative remaining/total time; frame and sand share a100×150 coordinate ratio. It represents waiting only, never verification of real behavior. Chinese content, status, deadline, reward and actions remain DOM. Existing wood, river and NPC actor remain unchanged. Scope/evidence: `docs/tasks/16-commission-contract.md`; actual implementation acceptance pending.

## Noah commission board — 2026-10-14

Owner approved `references/commission-board-concept-v1.png` as the direction for Noah's existing reality-commission dialogue. It remains a reference outside runtime, with the exact prompt and approval in the manifest. The actual implementation is a candidate pending owner review.

Two original textless assets were generated from that approved generated concept: `commission-wood-v1.png` (blank timber board) and `commission-river-v1.png` (character-free riverside backdrop). They stay in `assets/generated/hearthwood`; `tools/build_inventory_skin.py --asset <name>` packages lossless WebP with decoded RGBA equality. Runtime files total 2,756,642 bytes. No source resampling, recoloring, third-party pack, font, audio or paid acquisition. The wood uses measured 105px source slices and 24px desktop / 15px mobile CSS borders. Scenery is an isolated illustration, never a playable map.

The existing Noah actor is overlaid at 4× desktop / 3× phone; it is not baked into the backdrop. `CommissionIcon.tsx` supplies original integer-grid book, boots and hammer decorations beside DOM labels. All text, selection, quota, reward and controls are real DOM driven by current state. `commission-board.css` scopes the new materials to Noah; other NPCs and journal layouts keep their existing bindings. Exact dimensions, hashes, processing and provenance are recorded in `asset-manifest.json`. Evidence: `docs/tasks/15-commission-board.md`.

## Knowledge research material reuse — 2026-10-14

The knowledge chapter reuses the existing journal spread through `study.css`, shared tokens and installed Lucide Compass/Sparkles/Star icons. Its connector path and level marks are project-authored SVG/CSS UI, not inventory, tools or new unlock assets. No raster, font, audio, paid pack, download or source-pixel edit. All 31 existing image entries and source hashes pass audit. Actual rendered candidate and evidence: `docs/tasks/12-knowledge-growth.md`.

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

## 13. Woodland cottage and yard — procedural candidate

The owner requested a playable home/yard reference before approving new upgrade visuals or save extensions. `frontend/src/game/hearthwood.ts` is original project-authored pixel drawing (Phaser Graphics), not a downloaded pack or generated bitmap. It renders the home facade, stepping stones, low garden edges, plants/linen, room materials, reading table and ephemeral open-object states. The two-world-unit pixel grid matches the existing 16px actors rendered at 2 world units per source pixel. Its source hash and binding are in `asset-manifest.json` under `original_scene_art`, validated by the existing asset audit.

All 31 prior source/runtime raster assets remain byte-identical. The original home PNG is preserved but the home's presentation binding now uses the candidate procedural facade. Other buildings, trees and existing character animations retain their assets. No source pack, font, audio or new image enters the bundle; Kenney packs remain unacquired. Decorative furniture does not assert earned inventory or completed study plans. Existing collision shapes, door/plot anchors and save data are retained. Actual render approval is pending; see `docs/tasks/09-cottage-prototype.md` for screenshots, interaction recordings, tests and exclusions.

## 14. Approved travel-kit HUD — 2026-10-13

Owner approved the generated `references/hud-concept-v1.png` design board; it is a reference outside the runtime bundle. Implementation uses original code-native 24×24 integer SVG paths in `frontend/src/components/HudIcon.tsx` (nine variants) and shared Hearthwood CSS edges. Main desktop icons render at 2× and compact controls at 1×. Character/menu/portrait reuse the actual existing appearance sheet; item icons and currency identity remain audited existing files. All functional text remains DOM. Source/concept hashes, original artwork provenance and reference approval are in the manifest; UI source checks are included in the audit. No new runtime raster, font, audio, purchase or third-party pack. Actual render awaits owner review; see task 10.

## 15. Health and stamina field journal — 2026-10-14

Reuses the unchanged generated `arrival-village-v1.webp` as a woodland vignette and the actual existing character appearance. All pledge choices, progress footprints, health seal, capacity preview and text are live DOM/CSS with the shared Hearthwood tokens; outline symbols use the existing Lucide dependency. No new bitmap, font, audio, downloaded pack or image-generation request. The manifest records the additional village-art binding without changing hashes. Actual render remains a candidate; evidence and limits are in task 11.

## Character point allocation — 2026-10-14

Owner approved `references/character-points-concept-v1.png`, generated with built-in image_gen using the supplied UI screenshot. Exact prompt and SHA-256 are recorded. It is a design reference only, excluded from runtime. Implementation reuses `character-dossier-v1.webp`, unchanged actor sheets, shared tokens and installed Lucide SVG components. All values and controls remain DOM; no new runtime asset/font/pack. Actual render and evidence: task 14.

## Noah commission pages — 2026-10-15

Owner approved the three acceptance/receipt/small-talk concepts. Reuse the existing timber board, riverbank, actor, blank scroll and native icons. Five textless original illustrations are now bound only to these states: `commission-{study,exercise,work,ledger,letter}-v1`. Source PNGs and complete built-in image_gen prompts live in `assets/generated/hearthwood/`; lossless decoded-RGBA-identical WebPs live in `frontend/public/assets/hearthwood/`. No font, vendor pack or source artwork modification. The objects represent a commission/receipt, not an inventory grant. All task text, point amounts, credited status, quest status and controls remain native DOM. Concept previews in `docs/art/references/commission-{accept,receipt,talk}-concept-v1.*` are reference-only and never runtime UI. Manifest contains dimensions, alpha bounds, hashes and bindings. Actual implementation acceptance remains pending; see task17.

## Village market — 2026-10-15

Two original built-in image_gen assets: `assets/generated/hearthwood/market-{shop,counter}-v1.png`, with exact adjacent prompts. No reference upload, external pack, font or sound. `tools/build_market_art.py` crops transparent bounds and packs nearest-neighbor sprites with alpha retained, preserving immutable sources. Shop272×232 and counter416×169 use two native pixels/world unit; total211,708 bytes. Exact source/runtime hashes, dimensions and crop bounds are in `market-art-v1.json`, covered by the main asset audit. Mira reuses audited appearance5; a unique NPC sprite remains a recorded gap. Actual render is a candidate, not owner-approved.

## Independent residents — 2026-10-16

Three original built-in image_gen character sheets, exact prompts in `assets/generated/hearthwood/npc-life/{lia,noah,mira}-v1.{png,prompt.txt}`. No reference upload, third-party pack, font or sound. The reviewed 4-direction ×3-pose sheets provide twelve actual poses each; `tools/build_resident_art.py` packs the existing 48×64 runtime frame contract (idle/A/idle/B) and makes matching figures/128px portraits. Alpha threshold160 and nearest-neighbor normalization are reproducible; Mira's lower row uses a measured488px boundary to exclude a neighboring boot. Sources remain unchanged.

Nine runtime PNGs under `frontend/public/assets/hearthwood/residents/` total210,614bytes. Exact source/prompt/runtime/rebuild hashes and crops are in `resident-art-v1.json`, covered by the main audit along with all six preserved player sheets. NPC IDs never use the player's appearance registry. Previous reused Lia/Noah/appearance5 NPC bindings are superseded but their original audited files remain intact. Actual render approval pending; desktop and landscape evidence in task25.

## Departure and first city — 2026-10-16

Four original cutouts were generated with the built-in imagegen tool: boatman Adu, innkeeper Lanya, a mossy cliff and a rowboat. Immutable sources and exact prompts live in `docs/art/generated/departure-v1/`; reproducible packing and hashes live in `tools/build_departure_art.py` and `departure-art-v1.json`. Ten runtime PNGs provide two unique single-frame NPC actors, matching figures and portraits, three cliff footprints and a boat. Static NPCs do not claim walking cycles or village schedules. All five NPC figures have distinct hashes; prior player and village art remains unchanged. No third-party input, download, font, audio or pack was added. Source images stay outside the runtime bundle. Geography uses two source pixels per world unit, shared scenery, code-native terrain and installed Lucide icons. Actual render remains a candidate; evidence and the separately planned combat prerequisite are recorded in task27.
