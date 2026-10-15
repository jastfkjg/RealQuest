# Task 19 — Fine HUD, item art and interiors

Owner request (2026-10-15): refine the five pictured floating HUD elements and inventory items to match the fine village, and make the pictured indoor scene equally crisp and detailed. These six screenshots identify problems; they are not approval of the resulting implementation.

## Implemented slice

- Status card: thin timber/brass edges, moss cloth, high-resolution original-source head crops, clearer XP/resource seams and native Chinese text.
- Bottom rail: stitched quick pockets, fine backpack/book/sprout illustrations, quieter frames, real quantities and existing navigation. Empty/depleted items remain truthful, with increased illustration legibility.
- Utility keys and quest note: native fine utility strokes from the existing Lucide dependency, linen paper, small brass clip and retained labels/actions. Phone portrait spacing keeps the quest note below the status card.
- Toasts: opaque linen, moss/red status edge, readable text and the original status/alert roles. The toast now inherits shared theme tokens. Phone portrait toast appears below the quest note.
- Interaction prompt: restrained linen and a quiet keycap; identical object/action text is rendered once. Pending, disabled/cooldown, errors, keyboard and touch behavior remain authoritative.
- Inventory items: original 64px seed, wood, stone, crop, plank and coin art bound to existing semantic IDs. Shared occurrences use the same art; no possessions or quantities were fabricated.
- Existing guild, library, workshop and home: fine oak floor, plaster/wainscot, curtains, notice boards, shelves, desks, bed, hearth, planter, chest, barrel, anvil and woven rugs. Individual furniture is depth-sorted. The long workshop counter packs two ordinary104-unit modules, keeping tools at actor-appropriate scale instead of enlarging one square table across208 units. Home chest/open-book/rest feedback follows the existing selected/accepted state.

Room geography remains 480×368, with the existing furniture collision rectangles, interaction anchors and server commands. Scenery uses two native art pixels per world unit; original 48×64 actors stay at2/3 scale. A common half-step interior camera fits width/520 and (height−144)/368, minimum1.5, following on narrow/short screens. Native DOM text is never camera-scaled. The original coarse room renderers remain in source for history; current rooms bind to `interiors.ts`. The hearth is a detailed static illustration in this pass.

## Assets and provenance

Two original transparent sheets were generated with the built-in image generator: `assets/generated/hearthwood/items-ui-v3.png` and `interiors-v3.png`, both1254×1254. Exact prompts are adjacent. No restricted/paid asset, external pack, font or audio was acquired. Sources stay outside the runtime bundle and are not modified in place.

`tools/build_detail_art.py` performs reviewed cuts, alpha threshold160 and nearest-neighbor normalization. Runtime `frontend/public/assets/hearthwood/detail/` contains33 PNGs /690,923 bytes: nine64px item/menu illustrations, six64px original-source head portraits, eighteen furniture pieces. Portraits and the closed chest reuse the preceding original village sheets. `docs/art/detail-art-v3.json` records original/source hashes, cuts, dimensions, processing and script hash; the root manifest links it. Existing vendor/runtime image bytes remain preserved. `tools/audit_inventory_assets.py` now verifies both art generations and produces bounded contact sheets.

## Files in this slice

- Presentation: `frontend/src/hud-detail.css`, `App.tsx`, `components/HudIcon.tsx`, `components/PixelPerson.tsx`, `game/GameCanvas.tsx`, `game/items.ts`.
- Rooms: `frontend/src/game/interiors.ts`, `detailAssets.json`, `WorldScene.ts`.
- Shared coin/item paths: `game-ui.css`, `rpg-ui.css`, `components/InventoryView.tsx`, `JournalView.tsx`, `Quests.tsx`, `WorldPanels.tsx`; stylesheet import in `main.tsx`.
- Verification: `frontend/scripts/hud-detail.mjs`, `interiors-detail.mjs`, `hud-detail-contrast.mjs`, updated physical approach helpers in `cottage-smoke.mjs`, package scripts; packing/audit tools and art/task documentation.

Concurrent Life journal and notice-board/library-dialogue work is outside this slice and preserved, including its changes in shared files. There was a transient build failure while that work referenced an unfinished `encounter-ui.css`; once the file existed the combined build passed. Development hot reload also interrupted an early room test. A parallel browser run caused resource contention; its two explicitly identified owned browsers/runners were normally terminated and verified exited, then final checks were rerun serially. HUD fixture logout was removed from browser cleanup: contexts close directly, with fixture guests retained only in the isolated test database. Final checks use the fixed production build. Early historical tests attempted to click world points beneath a fixed prompt; their physical routes now approach above it and use the advertised E/action control. The final narrow-landscape return uses the visible near-door prompt, since the facade point lies beneath the identity card. No force-click or state teleport is used.

## Environment and checks

Established npm/package-lock, React19, Phaser3.90, TypeScript5.8 and Vite6.4 were retained. Commands run in `frontend` unless indicated. API8043 uses the existing isolated `output/village-fine/test.db` and cookie `realquest_village_fine`; user databases were not reset or edited.

| Check | Actual result |
|---|---|
| `npm run build` | Passed; existing Phaser chunk-size advisory remains |
| `backend/.venv/bin/python -m pytest -q` (backend cwd: `.venv/bin/python -m pytest -q`) |108 passed; existing Starlette/httpx deprecation warning |
| `npm run test:village` |21 captures passed: real routes/all doors, poses/canopies, six IDs, five viewports, touch, reload, one canvas/listener |
| `npm run test:details` / individual member scripts | Final sequential run passed: HUD12 cases and room23 captures, zero browser errors; final numeric/phone/landscape spacing included |
| `npm run test:cottage` | Final sequential run passed25 captures, zero browser errors: reading/timer/pause, manual, storage round trip, rest, repeated doors, rejected/pending/retried gather, blur, touch/landscape entry and wall collision |
| `REALQUEST_URL=http://127.0.0.1:5211 node node_modules/.cache/detail-inventory-mutations.mjs` | Passed rejection, pending, idempotent lost-response retry, mode switch and reload. Copy changes output destination only from the existing mutation suite |
| `npm run test:details:contrast` + `tools/check_character_contrast.py --output …` |8 actual texture cases /188 text runs passed; minimum5.47:1 after numeric-pocket and landscape-placement corrections |
| Skill Playwright game frame client | Passed2 short-input iterations and inspected canvas PNGs; player moved(271,339)→(308,363), one canvas/listener, correct fine actor, no error files. Resolving copy of the skill client adds only a `finally` browser close |
| `tools/build_detail_art.py`; `tools/audit_inventory_assets.py --output output/hud-interiors/audit` (bundled Pillow Python) |33 assets packed;125 source/runtime images inventoried and hashes verified |
| `git diff --check` | Passed |

The new HUD suite adapts the historical HUD test to the current readonly Life journal. It checks mode/input ownership; it does not claim the removed Life note form or simulated IME coverage. Inventory quantities and mutations remain server-owned.

## Evidence and limits

Actual rendered evidence is in `output/hud-interiors/`: `hud/`, `rooms/`, `cottage/`, `contrast/`, `inventory/`, `game-client/`, packing contact sheets and `audit/`. HUD/cottage recordings are retained. The original village regression evidence remains in `output/village-fine/`.

Reviewed desktop/phone samples show the fine room furniture, clear item silhouettes, native type and one exit caption. Final guild/library/workshop/home, inventory and desktop/phone HUD samples were inspected. All final suites above passed. Actual owner approval, physical Safari/iOS/Android, native browser-menu zoom and multi-hour endurance remain unverified. No commit, push, deployment or player-data mutation was performed.


## Handoff and cleanup

The final production build is copied to `output/hud-interiors/build/`, isolated from other tasks rebuilding the shared frontend. `http://127.0.0.1:5211` serves that snapshot; API8043 uses the isolated existing test database. Frontend preview PID1216 / npm1193 (exec session30848) and API PID96709 (session43478) remain for owner review. API target is `REALQUEST_API_TARGET=http://127.0.0.1:8043`; both listening ports were verified after testing.

All final automation contexts/browsers close in `finally`. The sequential runner exited0; no HUD/interior/cottage/inventory/frame-client Node runners remain. Earlier cancelled browser roots99528/99582 and launchers99526/99557, and frame-client161/326, were explicitly verified absent. The old dev and intermediate preview sessions exited130. No broad process kill was used. Shared node_repl/MCP hosts and active other-task preview/build processes remain because their ownership is shared or belongs to another active task.

No backend rule/database schema, user-save reset, dependency upgrade, commit, push or deployment is part of this slice. The retained review services are intentionally running, not idle tools.
