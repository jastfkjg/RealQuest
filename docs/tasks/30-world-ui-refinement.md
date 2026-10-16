# Task 30 — Doorway depth, quiet world cues and fitted game panels

User request (2026-10-16): fix player occlusion in front of a doorway; remove nearby NPC activity/road text labels and refine the quest exclamation; make notices smaller and shorter; restyle the market, sleep and equipment dialogs; redesign the board to avoid vertical scrolling and header overlap.

## Plan and composition

1. Sort outdoor buildings at their physical front edge, retain authoritative collision/door anchors, remove world text placards, and draw a small transparent quest symbol.
2. Reuse existing timber, moss cloth, paper, bed, counter and item art. Market becomes a shelf with a checkout strip; sleep a small bedside scene with two choices; equipment a cloth-lined rack with a truthful empty state. Keep game text native and controls accessible.
3. Fit the board to the viewport with a fixed title, four compact pinned notices and one selected sheet. Long objectives/briefing use explicit pages. Short screens use compact side-by-side compositions. Keep server actions and retry ownership unchanged.
4. Verify actual browser screenshots and interactions at desktop and phone landscape sizes; check build, relevant backend regressions and asset preservation. Close task-owned automation; retain only a clearly identified manual preview if needed for owner review.

Visual thesis: warm timber edges and moss cloth hold a small number of readable paper surfaces, with the playable world visible around each object.
Content: identity/title → selected content → exact outcome/action. Motion: short paper entrance, quiet selection/press feedback, short nonblocking notices; reduced motion respected.

## Results

Implemented and checked in the production build; owner visual acceptance remains pending. No new asset, dependency, balance/save/backend change, commit, push or deployment. Existing user services on 5175/8027 were never signalled or changed by this task; final inspection found them already exited. All player data is preserved.

### Changed files and flow

- `frontend/src/game/village.ts`, `WorldScene.ts`: outdoor buildings sort at their physical facade rather than the door interaction point; five original colliders/anchors remain authoritative. NPC activity bubbles and the shop road placard are removed. Available quests use a transparent outlined exclamation; ready quests use a check. Routines/activity information remain in the neighbor book and ordinary interaction prompt.
- `frontend/src/App.tsx`: ordinary world notices expire after1.8s. `frontend/src/world-ui-refinement.css`, imported in `main.tsx`, puts them at the lower right, keeps errors dismissible and retains the existing cave-specific clearance.
- `components/Quests.tsx`, `VillageIntro.tsx`: the fixed board holds four notices and a selected sheet, with explicit pages for long objectives, descriptions and preparation. Every one of the nine departure objectives remains reachable. No body scrolling, sticky title overlay or selection-induced scroll. Native reward/action controls and live confirmation remain server-owned; an already-confirmed success announcement does not cover the next action.
- `components/MarketPanel.tsx`: compact shelves/checkout, one dated order per page, explicit quest/home and conversation/kindness views. `components/SleepPanel.tsx`: bed art and two rest choices; rules disclose as a separate view, Escape returns to choices. `components/CombatPanels.tsx`: cloth-lined owned rack/detail or an honest empty rack with marker-only navigation. Existing prices, item counts, rest/equip commands and reconciliation remain unchanged.
- `frontend/scripts/world-ui-refinement.mjs`, `frontend/package.json`: dedicated behavior/layout suite with a hard-coded isolated fixture DB guard, public controls, viewport/occlusion/non-scroll assertions and browser cleanup in `finally`.
- `DESIGN.md`, asset plan/manifest, review checklist and `progress.md`: scoped design/provenance/evidence. No runtime artwork added; the existing timber, paper, bed, counter and item sources are reused unchanged.

### Actual environment and commands

React19 / Phaser3.90 / Vite6.4.4 / TypeScript / Playwright1.64.0, existing npm lockfile and Python3.14 virtualenv. No standalone lint script exists. Test DB: `output/world-ui-refinement/test.db`, never `backend/realquest.db`.

| Command / check | Actual result |
| --- | --- |
| `DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/world-ui-refinement/test.db .venv/bin/alembic upgrade head` from backend | Isolated schema ready; no user DB migration. |
| `DATABASE_URL=... SESSION_COOKIE_NAME=realquest_ui30 ALLOWED_ORIGINS=http://127.0.0.1:5411 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8111` | Isolated API only. |
| `REALQUEST_API_TARGET=http://127.0.0.1:8111 npm run dev -- --host 127.0.0.1 --port 5411 --strictPort` | Used during iteration; stopped before final production check. |
| `npm run build` from frontend | TypeScript/Vite pass. Existing large-chunk warning remains. |
| `REALQUEST_API_TARGET=http://127.0.0.1:8111 npm run preview -- --host 127.0.0.1 --port 5411 --strictPort` | Final fixed production build used for49 captures. |
| `npm run test:world-ui` from frontend | Pass: all five real door enter/exits and collision boundaries; notice clearance/expiry; board rejection/retry and exact single reward; paged preparation and all9 objectives; dialog input ownership; actual sale/rejection/retry/buy at the server price; rules Escape, actual short rest/overnight sleep; marker-only empty equipment, real equip/reload; DPR2 landscape touch/reduced motion. No page exceptions. |
| `.venv/bin/python -m pytest -q tests/test_daynight.py tests/test_market.py tests/test_game.py tests/test_village_intro.py` from backend |112 pass; pre-existing Starlette/httpx deprecation warning. |
| Required game skill frame client, copied to an ignored cache with cleanup-only `try/finally`, short up/idle inputs, one iteration | Final production pass; screenshot/state opened and inspected. No error artifact. Temporary wrapper removed at cleanup. |
| Bundled Python `tools/audit_inventory_assets.py --output output/world-ui-refinement/assets` |156 images, existing source/runtime hashes and pixels preserved. No new pack/font/audio. |
| Solid shared-token contrast calculation |9 pairs, minimum4.85:1; textured headers additionally inspected visually. This is not a full per-pixel accessibility certification. |
| `git diff --check` | Pass. |
| `REALQUEST_URL=http://127.0.0.1:5411 npm run test:play-mode` | **Not passed:** legacy mouse pickup coordinate is covered by the existing `.interact` HUD, the same limitation recorded in task21. No forced click, hidden HUD or claim of a broad world regression pass. Its browser closed in `finally`. |

### Visual evidence

All artifacts are under `output/world-ui-refinement/`. All49 final captures have in-viewport dialogs, unobscured control centers and no dialog/body scroll. Remaining clipped boxes reported in JSON are decorative vignette crops and1px screen-reader live regions. Desktop1440×900 /1920×1080 /1024×768 and landscape844×390 /740×360 were checked. Touch emulation uses844×390, DPR2 and reduced motion.

- `overview.png`: contact sheet cropped from four actual final desktop dialogs; no mockup data was introduced into the real player save.
- `door-{home,workshop,library,guild,shop}.png`, `npc-cue.png`, `quiet-path.png`, `world-notice.png`: actual facade/cue/notice evidence. New notice is small at the lower edge and expires in about1.8s.
- `board-{1440,1920,1024,844,740}.png`, `board-rejected.png`, `board-briefing-{1,2}.png`, `board-{long,long-844,description,description-844,description-740,objectives-2}.png`: fitted board, authoritative retry, paging and long-copy coverage.
- `shop-{1440,1920,1024,844,740}.png`, `shop-{orders,order2,story,home,social,kindness}*.png`: shelf, order, story and social subviews without whole-panel scrolling.
- `sleep-*.png`, `equipment-*.png`, `touch-equipment-844.png`: normal and depleted rest, rules return, truthful empty rack and actual owned/equipped rack.
- `layout-report.json`: eight behavior groups and49 captured states, no page exceptions. `videos/*.webm` records the actual flow; `game-client/` contains the final skill capture/state; `assets/` contains the provenance audit. `contrast-pairs.json` scopes the contrast evidence.

### Limits and cleanup

Actual owner visual acceptance, physical devices/Safari, native browser zoom, screen-reader use and endurance remain unverified. Phone portrait remains outside the requested repository scope. The legacy broad mouse smoke limitation is explicitly retained above; this report does not claim full gameplay/combat regression coverage.

Final process/parent/start-time/cwd/port checks are in `output/world-ui-refinement/cleanup.json`. All automated contexts/browsers close in `finally`; no task browser/Chromium/ffmpeg/test runner remains. Iteration Vite40190 and npm40167 exited; the temporary skill wrapper was removed. Shared Codex/node_repl hosts could not be safely attributed to this task and were preserved.

**Manual preview retained:** [http://127.0.0.1:5411](http://127.0.0.1:5411), production Vite48711/npm48688 with isolated API8111/PID40152, distinct `realquest_ui30` cookie and `output/world-ui-refinement/test.db`. Frontend-proxy and direct API health checks both return `ok`. This preview is retained for owner review because the initial user5175/8027 services had exited independently by handoff; this task never stopped them. Opening the preview starts a separate guest journey, not the owner's saved game. Close these three identified processes after manual review is finished. No automation browser/tab is retained. The overview image was queued in the Codex file panel.
