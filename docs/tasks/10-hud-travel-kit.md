# HUD travel kit — implementation checkpoint

Owner approved `docs/art/references/hud-concept-v1.png` on 2026-10-13 with “可以，按此进行调整优化”. Approval is for the concept; actual browser renders remain a candidate.

Scope: bottom quick-item/navigation rail, player identity/resources, compact quest note, utility keys and nearby interaction tag. Preserve existing modal layouts, actions, saves, source sprites, counts and world camera. Plan: inspect current cascade/semantics → scoped HUD skin and original pixel icons → inspect real responsive views and verify controls → record evidence and clean up automation.

Environment: clean starting tree; React 19, Phaser 3.90.0, npm lock, Vite 6.4.4, local Playwright 1.64.0, Python 3.14/FastAPI/SQLAlchemy and Alembic migrations 001/002. Existing owner preview 5197/backend 8029 retained. New isolated test server 8031 uses only `output/hud-reference/test.db`, cookie `realquest_hud_preview`; Vite 5199 proxies to it. No production DB migrations or save edits.

Implementation and verification results will be recorded after browser review.

## Implemented

- `frontend/src/hud.css` owns the final floating HUD treatment, loaded after existing world/dialog CSS. One thin timber/moss rail joins four real quick slots and four linen-labelled entries. Empty quantities remain visible; quick slots still open item details and never consume anything.
- `frontend/src/components/HudIcon.tsx` provides nine original 24×24 integer-path SVG variants. Main desktop icons use 2×, compact icons use 1×. The character entry reuses `PixelPerson` and the actual appearance ID, not the orange-haired example baked into the concept. Existing 16px item/actor sprites retain integer scaling.
- `App.tsx` uses the shared skin for identity/resources and utility keys, readable labels and shortcut titles, XP accessibility metadata and sound state. `Quests.tsx` retains its navigation/expand handlers; its compact summary becomes a clipped linen note. `GameCanvas.tsx` only adds the shared theme to the existing interaction button.
- Default, hover, pressed, focus-visible, depleted quantities and existing pending/disabled interaction labels have matching styles. Phone keeps the existing omission of the quick-item row and sound shortcut (sound remains in settings), preserving the four main entries, direction pad and interaction button. Short landscape separates those controls. No camera/world/input/API changes.
- `frontend/scripts/hud-smoke.mjs` / `package.json` add the reproducible `test:hud` browser flow. Existing modal contents remain unchanged.

## Assets and provenance

The owner-approved generated board is saved at `docs/art/references/hud-concept-v1.png`, reference-only and excluded from the runtime bundle. The new SVG paths and CSS edges are original project-authored geometry; no external packs, fonts, audio or generated runtime bitmap are added. Concept and source hashes are in `docs/art/asset-manifest.json`; `tools/audit_inventory_assets.py` now checks original UI source hashes alongside procedural scene art. All 31 earlier raster assets still match. No source PNGs were edited.

## Actual verification

All commands run against the isolated services, with the existing npm/Python environment:

| Command / check | Outcome |
| --- | --- |
| `cd backend && DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/hud-reference/test.db .venv/bin/alembic upgrade head` | New test DB only, successful; user databases untouched |
| `cd frontend && npm run build` | TypeScript and Vite pass; existing Phaser bundle-size advisory remains |
| `cd frontend && REALQUEST_URL=http://127.0.0.1:5199 node scripts/hud-smoke.mjs` (also exposed as `npm run test:hud`) | Pass: 12 captures, all entries/shortcuts, focus restoration, no world movement through panels/IME, quick-slot selection/depleted/assignment/reload, unchanged inventory, nameplate, sound persistence, map/menu, marker-only quest guide, tracking expand/collapse, real gathering/cooldown, touch/DPR2/reduced motion, long name |
| `cd frontend && REALQUEST_URL=http://127.0.0.1:5199 npm run test:play-mode` | Existing roof approach/entry/range, gather/cooldown, held-key reset, quest reward, reload, manual growth settlement and blur regression pass |
| `node output/hud-reference/game-client.mjs --url http://127.0.0.1:5199 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":6},{"buttons":[],"frames":6}]}' --iterations 2 --pause-ms 250 --screenshot-dir output/hud-reference/game-client` | Skill client movement/state captures pass; only local import and finally cleanup adapted, original skill unchanged |
| `node output/hud-reference/contrast.mjs` | Actual computed foreground/opaque-background checks: 57 text runs, minimum 5.67:1; desktop, hover and phone |
| Bundled Python `tools/audit_inventory_assets.py` | Pass: original source/runtime hashes, generated pixel equality, 31 raster entries, original UI/scene source hashes |
| `git diff --check` | Pass |

The initial build's nullable-character callback and test's hidden duplicate quick-slot locator were corrected before the passing runs. No unexpected console errors in the final flow. No backend logic changed, so the focused game regression was used instead of rerunning the unrelated full backend suite.

Inspected actual screenshots: [1440×900](../../output/hud-reference/after-1440.png), [1920×1080](../../output/hud-reference/after-1920.png), [768×1024](../../output/hud-reference/after-768.png), [390×844](../../output/hud-reference/after-390.png), [720×450](../../output/hud-reference/after-720.png); DPR2 emulated touch [390](../../output/hud-reference/touch-390.png), [375](../../output/hud-reference/touch-375.png), [844 landscape](../../output/hud-reference/touch-844.png), [long name](../../output/hud-reference/long-name.png), [keyboard focus](../../output/hud-reference/keyboard-focus.png), [cooldown](../../output/hud-reference/depleted-world-prompt.png). Before/after captures use the same untouched starter guest; separate integration guests are cleaned up. JSON results, contrast samples, two skill states and interaction WebMs are in `output/hud-reference/`. The skill canvas capture is game-state evidence, not the DOM HUD screenshot.

Limits: actual owner visual acceptance is still pending; physical Safari/iOS/Android and native browser-menu zoom were not tested. 720×450 is an effective reflow layout check, not a claim of native zoom testing. This slice does not redesign the interior inventory, character or journal screens.

## Handoff and cleanup

New manual preview: `http://127.0.0.1:5199/` (Vite PID 19702, npm launcher 19679); isolated backend 8031 (PID 19652) and `output/hud-reference/test.db` are retained for owner review. Frontend `/` and backend `/api/health` return successfully. A browser preview was requested in the Codex panel; the tool returned queued, so direct URL access is also supplied. No automation browser is retained. Each Playwright script closes the browser in `finally`; integration guests are removed, while the isolated same-save screenshot fixture remains local for comparison.

The final process inventory showed no `hud-smoke`, `play-mode-smoke`, frame client, Chromium or headless Chrome worker from this task. Pre-existing shared node_repl / Playwright MCP hosts could not be attributed exclusively to this completed work and were left alone. Earlier 5197/8029 services were present at baseline but absent at final inspection; this task did not stop them or restart them. No user browser tabs were closed. The new preview services are deliberate handoff items, not idle test workers.

Final scope check restricts active/focus styles to the HUD containers; existing opened modal states remain unchanged. No commit, push or deployment.
