# Hearthwood world dialogs — candidate checkpoint

## Authorized scope and plan

Owner requested recognizable wood/seed icons and improvements to the pictured NPC, map, growth recording, storage, building upgrade and commission board dialogs. This explicitly expands the previous single-screen checkpoint to these existing dialogs; inventory, journal, dossier and welcome compositions remain intact.

- Visual thesis: tactile linen, warm timber and moss, with lighter edges and different structures for conversation, pinned commissions, a folded map, a storage tray and a work order.
- Content: one clear purpose per panel; real quantities, quest states, costs, timer and forms. Quiet locked content; rewards and materials use the shared item identities.
- Interaction: restrained hover/press feedback, visible keyboard focus, skippable dialogue, native paper-note expansion. Reduced motion respected.
- Audit icon bindings, reuse native components and code-drawn art; preserve source PNGs, saves, rules and IDs.
- Implement the requested dialogs; capture and inspect 1440×900 / 390×844 plus responsive stress sizes.
- Run build, asset audit, backend checks and actual browser flows in an isolated database. Deliver the candidate and pause for visual review.

## Status

**Implemented and verified; actual owner visual review pending.** No commit, push or deployment. Formal saves, stable item IDs, costs, rewards and progression rules were not changed. Test writes use only `output/dialogs-reference/test.db`.

## Implemented files and flow

| Files | Outcome |
|---|---|
| `frontend/src/game/items.ts`, `game-ui.css`, `public/assets/hearthwood/items/{wood,seed}.png` | Clear log/seed identities shared by inventory, quickbar and all new material/reward presentations. Other item art is retained. |
| `tools/build_item_icons.py`, `audit_inventory_assets.py`, `docs/art/asset-manifest.json` | Original 16px code drawings with deterministic rebuild/check, source-script and file hashes, dimensions and bounds. All earlier PNGs retain their audited hashes. |
| `frontend/src/components/WorldPanels.tsx`, `App.tsx`, `world-panels.css` | Existing chest, building and NPC adapters extracted into distinct compositions. Same commands, one-unit amounts, pending guard, server reconciliation and feedback. Native dialog naming, scoped focus loop with select/textarea support and Escape/focus return. |
| `frontend/src/components/Quests.tsx` | Real quest content/actions and icon rewards. Locked/claimed commissions use native expandable notes; active/ready/available notes expose existing actions. Approved journal uses its existing composition and shared actions. |
| `frontend/src/components/Atlas.tsx` | Softer cartography, opaque readable place labels, existing coordinates/path geometry, keyboard markers and compact index. Mini-map preserved. Marker selection still sets direction and closes the panel; no teleport or fabricated route. |
| `frontend/src/dev/DialogsPreview.tsx`, `dialog-fixture.json`, `main.tsx` | DEV-only `/dev/dialogs`; real components with clearly labeled starter fixtures generated from backend initial/upgrade/create rules. Controls describe preview results. No API, cookies or localStorage writes. Excluded from production. |
| `frontend/scripts/dialogs-{capture,interactions,contrast}.mjs`, `package.json` | Actual screenshots, responsive checks, real storage rejection/pending/retry, emulated-touch record, input/focus/preview isolation, and text contrast sampling. Every browser/context closes in `finally`. |
| `frontend/scripts/smoke.mjs` | Two obsolete selectors updated to semantic item heading and exact place name. Behavior assertions retained. |

Activity recording remains the existing accessible dialog, now two calm sections on desktop and one column on phone. Timer pause/resume/finish, date limits, manual provenance, reward caps and all server rules remain intact. This does not implement the future full Life Mode, Goals or History.

## Actual browser evidence

Fresh isolated Chromium guest 林间旅人, appearance 0: actually entered/exited the home, gathered 3 wood and talked to Noah (relationship 1). Real inventory is wood 3 / seed 6 / gold 20; first commission is ready after the real visit/gather actions. No screenshot possessions or quest rewards were fabricated. Layout captures reopen the existing panel adapter with actual world/interior objects; the separate full smoke test exercises proximity and operations end to end.

- [Six-dialog overview](../../output/dialogs-reference/dialogs-overview.jpg): crops of actual 1440×900 captures, not a generated mockup.
- Desktop: [board](../../output/dialogs-reference/board-1440.png), [NPC](../../output/dialogs-reference/npc-1440.png), [map](../../output/dialogs-reference/map-1440.png), [storage](../../output/dialogs-reference/storage-1440.png), [repair](../../output/dialogs-reference/building-1440.png), [growth](../../output/dialogs-reference/activity-1440.png), [corrected inventory](../../output/dialogs-reference/inventory-1440.png).
- [390×844 review sheet](../../output/dialogs-reference/qa-390.png); individual `*-390.png` and `*-390-bottom.png` files show default/bottom scroll. Desktop, phone, 768×1024, 1920×1080 and short 720×450 were captured and inspected; no horizontal overflow or undersized DOM buttons. SVG markers have the equivalent 44px index-button alternative.
- [Capture results](../../output/dialogs-reference/capture-results.json), [interaction results](../../output/dialogs-reference/interaction-results.json), [contrast summary](../../output/dialogs-reference/contrast-summary.json), [asset contact sheet](../../output/dialogs-reference/asset-contact-sheet.png). Recordings under `output/dialogs-reference/recordings/`.
- Real storage rejection/pending pictures: `storage-rejected.png`, `storage-pending.png`; actual DPR2 emulated-touch recording success: `activity-touch-saved.png`.

Inspection corrections: tightened board blank space; removed duplicate NPC name and captured the actual revealed dialogue; replaced generic home line symbol with audited house art; restored unchanged mini-map; separated place names from trees and darkened disabled text. Short-height views scroll naturally; on phone the NPC farewell and lower storage/form controls are reachable by scrolling.

## Environment and checks

Reused npm lock and installed React 19 / Phaser 3.90 / Vite 6.4.4 / Playwright 1.64. Python backend `.venv` retained. No dependency or engine upgrade. No standalone lint script exists.

Test database initialized with `DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/dialogs-reference/test.db .venv/bin/alembic upgrade head`. Backend: `DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/dialogs-reference/test.db ALLOWED_ORIGINS=http://127.0.0.1:5187 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8021`. Frontend: `REALQUEST_API_TARGET=http://127.0.0.1:8021 npm run dev -- --host 127.0.0.1 --port 5187 --strictPort`.

| Command | Actual outcome |
|---|---|
| `npm run build` | TypeScript and production build pass; existing Phaser chunk-size warning. DEV fixture/preview strings absent from dist. |
| `.venv/bin/python -m pytest -q` | 32 passed; existing Starlette/httpx deprecation warning. |
| `REALQUEST_URL=http://127.0.0.1:5187 npm run test:dialogs` | Seven real panels × five viewports, actual dialogue, no overflow, 44px DOM controls, mobile scrolling, unchanged inventory/XP/attributes/events from viewing, native note expansion, keyboard map marker/no teleport. Actual store rejection/pending/duplicate/retry/withdraw/reload, input/focus/Escape, DPR2 touch record, zero-write DEV preview pass. |
| `REALQUEST_URL=http://127.0.0.1:5187 npm run test:smoke` | Complete desktop and phone flows pass: four interiors, quests/rewards, camera/navigation, storage, rest, timer persistence, crop maturation/harvest, economy and reload. |
| `REALQUEST_URL=http://127.0.0.1:5187 npm run test:rpg-ui` | Inventory/quickbar/planting/crafting, real growth unlocks, phone actions and six layouts pass. |
| `REALQUEST_URL=http://127.0.0.1:5187 node scripts/journal-smoke.mjs`, `node scripts/journal-mutations.mjs`, `node scripts/journal-preview.mjs` (same URL, separately) | All three pass: existing 手账 layout, real reward/retry/save flows, isolated fixtures. Initial grouped run was interrupted by hot reload during formatting; stable rerun passed. |
| `node scripts/dialogs-contrast.mjs` + `tools/check_character_contrast.py --output output/dialogs-reference/contrast-…` for each capture | 36 cases, 844 visible functional DOM/SVG text runs, minimum 4.65:1. Default/hover/bottom at 1440/390. Decorative aria-hidden quote excluded. Input-value/placeholder colors use opaque token surfaces; they are outside this text-node sampling count. |
| Bundled Python 3.12/Pillow: `tools/build_item_icons.py --check`; `tools/audit_inventory_assets.py --output output/dialogs-reference` | Pixel rebuild check and 31-image/hash/frame audit pass. Source samples and legacy files unchanged. Two original icons total 509 bytes. |
| Existing `node_modules/.cache/inventory-game-client.mjs --url http://127.0.0.1:5187 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":8},{"buttons":[],"frames":8}]}' --iterations 1 --pause-ms 300 --screenshot-dir ../output/dialogs-reference/game-client` | Actual movement/state/screenshot pass; image inspected; finally cleanup retained. |
| `git diff --check` | Pass. |

The first broad smoke run found ambiguity between the new keyboard map marker and the existing index button; its locator now uses the exact index name. Capture refinement used a visible intermediate waypoint and allowed the camera to settle after viewport changes. No behavior/rule changes were made to bypass tests. No unexpected page/console errors in final runs.

## Remaining gaps and checkpoint

- Physical Safari/touch devices, native mobile keyboard and actual browser-menu zoom are unverified; Chromium DPR2 emulated touch and short-view reflow were tested.
- No fog-of-war, new world art, new NPC portrait pack or full Life Mode added. Map uses original native vector symbols; some existing building art is reused, without modifying its source pixels.
- Candidate awaits owner visual review; no rollout to menu, guide, settings or AI content. No commit/push/deploy.
- Existing `backend/realquest.db-wal` / SHM changes belong to the active user environment and were preserved. Tests use their separate database.
- Cleanup and preview handoff recorded below after final verification.

## Preview and cleanup — 21:15 local

Candidate preview: **http://127.0.0.1:5187/dev/dialogs**. Close the current dialog to switch among six examples. This route is DEV-only, visibly labeled, and makes no API/cookie/save writes. A Codex browser-panel open was queued by the app; it was not reported as an already-opened tab. The owner's earlier 5175/8027 services are currently stopped; this task did not stop them.

All task-created Chromium instances, contexts and script runners have exited, including failed attempts, with `finally` cleanup. No headless/Chromium process remained in the final process check. Retain frontend Vite PID 62229 (npm parent 62206) and isolated backend PID 62193, started 20:43, solely for candidate review / optional isolated interaction review. Their CWDs, start times and listeners were verified; preview/module returned HTTP 200 and backend health returned `ok`. Existing user browser tabs and unrelated tools were not operated or closed. Shared/older tool hosts with unconfirmed ownership are preserved; no broad process kill was used.

Once owner review ends, stop only these identified preview sessions/services. The real user database was never used for tests or reset. No further work beyond this candidate checkpoint remains in the authorized scope.
