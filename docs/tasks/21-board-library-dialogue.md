# Village notice board and Lia conversation — 2026-10-15

Owner approved the two generated previews with “可以，按此进行实现”. References: `docs/art/references/village-board-concept-v1.png` and `library-dialogue-concept-v1.png`. Approval covers the direction; actual browser implementation remains a candidate.

## Plan

1. Preserve all starting changes, especially the concurrent HUD, items, interiors and Life journal work. Scope this slice to board presentation and Lia's conversation; Noah keeps his commission scene.
2. Reuse existing timber, item identities and actors. Add original textless paper and library backdrop from built-in image generation, with reproducible processing and provenance. All content, state and controls remain DOM.
3. Make a timber notice board with short pinned notices and one selected illustrated parchment. Make a library scene with live actor identity, a low dialogue surface and two replies. Preserve server-owned task acceptance, turn-in, retries, rewards and saves.
4. Verify actual desktop/tablet/phone/short-landscape browser layouts, keyboard/touch/focus/reduced motion, failed/retried task actions and persistence in an isolated database. Build and run relevant regressions. Inspect captures and close owned automation.

Visual thesis: clear woodland pixel scenes, warm timber and calm linen with moss actions.
Content: board notice selection → objectives/rewards → one action; conversation place/actors → speech → optional request → reply.
Motion: paper selection lift, brief page entrance, existing skippable dialogue; reduced motion removes decorative movement.

Status: implemented and browser-verified candidate. Actual owner render review remains pending.

## Implemented files and flow

- `frontend/src/encounter-ui.css`: scoped timber board, selected/hover/pressed/focus/disabled notices, short phone notice row, paper details/rewards/action, sticky close; library stage, low dialogue paper, portrait/nameplate, replies, request, pending/error context and reduced motion. Leaves Noah and unrelated panels on their existing skins.
- `frontend/src/components/Quests.tsx`: decorative existing cottage/workshop/crop material for the selected notice; mobile selection focuses and scrolls the new detail. Existing authoritative quest actions/rewards retained. Concurrent currency-icon change preserved.
- `frontend/src/components/LibraryEncounter.tsx`, `WorldPanels.tsx`: Lia-specific scene with actual traveler appearance and existing Lia art. Dialogue continues through the existing skippable reveal control before opening the optional quest. Request acceptance uses existing server commands, Escape first folds it, and reply focus returns. Conversation dismissal releases world input. Existing Noah component remains intact.
- `frontend/src/main.tsx`: one scoped stylesheet import, retaining concurrent HUD/Life imports.
- `tools/build_encounter_art.py`, `docs/art/encounter-art-v1.json`, main asset manifest, asset audit/plan: reproducible processing, provenance and source/runtime checks. All new sources remain outside runtime; no vendor upload, font, audio or purchase.
- `frontend/scripts/encounter-ui.mjs` and package `test:encounters`: real guest/world actions in this task's isolated DB, failed/retried reward mutation, responsive/focus/touch/reflow and texture-contrast evidence. Browser and recording contexts close in `finally`.

No backend rules, save schema, prices, rewards or user records changed. Starting and concurrently evolving HUD/interiors/Life-journal work was preserved. No commit, push or deployment.

## Environment and actual verification

Reused npm lock/install, React19, TypeScript, Vite6.4.4, Phaser3.90 and backend Python3.14. No dependency upgrade. New isolated DB: `output/encounter-ui/test.db`; cookie `realquest_encounter`. API8091 and preview5291 are independent of existing5211/8043 and5217/8047 services. Initial sandbox port binds failed before startup; permitted local service launches succeeded. The DEV server's first navigation timed out; it was stopped and replaced by a fixed production preview. An initial preview proxy defaulted to8017; its environment was corrected before testing. No user storage was used to bypass these setup failures.

| Command / check | Outcome |
| --- | --- |
| `npm --prefix frontend run build -- --outDir /Users/zilong/Developer/projects/RealQuest/output/encounter-ui/build` | TypeScript/production build passes. Existing Phaser chunk-size advisory. |
| `cd backend && DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/encounter-ui/test.db .venv/bin/alembic upgrade head` | Existing migrations applied only to this new test DB. No migration change. |
| `cd backend && .venv/bin/python -m pytest -q tests/test_game.py` |53 passed; existing Starlette/httpx deprecation advisory. |
| `REALQUEST_URL=http://127.0.0.1:5291 node frontend/scripts/encounter-ui.mjs` |22 captures, no unexpected console/page errors. Public-world home visit and wood gathering → ready board → failed claim leaves quantities intact → pending prevents duplicate → retry grants exact12gold/3seed/10questXP → reload retains result. Selection/locked state and five viewports pass. |
| Same feature suite, Lia | Real bridge approach/talk, request reveal/accept/fold/farewell, Escape and focus return, acceptance without immediate reward, reload, focus wrap, normal typewriter first-continue reveal and touch replies pass. DPR2 at375×812;125% text reflows without horizontal overflow. Desktop reduced motion pass. |
| Texture contrast, `tools/check_character_contrast.py --output output/encounter-ui/contrast-<capture>` |Six cases,136 text runs, minimum5.00:1 after darkening notice metadata and reserving phone text space beside the floating close latch. |
| `node output/life-commissions/game-client.mjs --url http://127.0.0.1:5291 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":6},{"buttons":[],"frames":6}]}' --iterations 1 --pause-ms 250 --screenshot-dir output/encounter-ui/game-client` | Existing skill client with local import/finally-cleanup wrapper passes; screenshot/state inspected. |
| Bundled Pillow Python `tools/build_encounter_art.py --check` and `tools/audit_inventory_assets.py --output output/encounter-ui/assets` |3 new images and125 total image/source entries pass. No original art edits. |
| `git diff --check` |Pass. |

The original `play-mode-smoke.mjs` was attempted and did not pass: its hardcoded canvas click at the first wood pickup is intercepted by the existing HUD interaction prompt in this concurrent game build. This slice does not claim that broader regression passed or alter HUD input to satisfy it. The scoped suite uses public keyboard movement/E for the affected pickup/bridge route, then executes actual board/NPC commands, and the skill input/frame loop passes. Actual pointer/touch operation of the changed board and dialogue is verified.

## Screenshots and remaining limits

Actual captures inspected at1440×900,1920×1080,768×1024,390×844 and720×450, plus375×812/DPR2 and125% text. Desktop: [board](../../output/encounter-ui/board-1440.png), [Lia](../../output/encounter-ui/lia-1440.png). Phone: [board](../../output/encounter-ui/board-390.png), [action](../../output/encounter-ui/board-action-390.png), [Lia touch](../../output/encounter-ui/lia-touch-375-dpr2.png), [request](../../output/encounter-ui/lia-request-390.png), [large text](../../output/encounter-ui/lia-large-text-375.png). Failure/pending/claimed screenshots, `result.json`, contrast folders and real interaction videos in `output/encounter-ui/`.

The stage is a decorative illustration, not navigable geography. Short landscapes scroll to replies; they do not pretend all content fits in450px. Physical Safari/iOS/Android, native browser-menu zoom and screen-reader/device testing remain unverified. Actual render awaits owner review; approved concept references do not imply approval of these browser captures.

Final follow-up: grouped reply text avoids a lone Chinese character at125% size; the complete22-capture suite and texture check pass again. A second skill-frame burst opens the real board, sends directional input and verifies mode=board, inputEnabled=false, player=(240,320) unchanged and one canvas.

## Handoff and cleanup

Fixed production preview: http://127.0.0.1:5291, Vite Node PID1242/session63211, serving only `output/encounter-ui/build`. Isolated API8091: Python PID427/session44289. Both were created for this task and intentionally retained for manual review. Frontend startup: `REALQUEST_API_TARGET=http://127.0.0.1:8091 node node_modules/vite/bin/vite.js preview --outDir /Users/zilong/Developer/projects/RealQuest/output/encounter-ui/build --host 127.0.0.1 --port 5291 --strictPort` in `frontend`; API startup uses the task DB/cookie and `ALLOWED_ORIGINS=http://127.0.0.1:5291 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8091` in `backend`. Listener identities/arguments/start times and proxied `/api/health`=`ok` were verified.

All feature/frame/failed-regression browser runs completed with context/browser cleanup; corresponding runner and recording-process checks found no task-owned leftovers. The failed DEV preview and incorrectly configured fixed-preview process were stopped through their own terminal sessions. No npm/npx launcher or node_repl was created. Existing unrelated game previews, user browsers and shared tool hosts were preserved. The last process-check shell was still needed for verification and was allowed to finish normally.
