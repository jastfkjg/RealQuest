# Woodland cottage and front yard — playable visual checkpoint

Status: implemented and browser-verified candidate; owner visual approval pending.

## Authorized slice

Owner request: “先做「林间小屋与门前小院」的可走动、可交互样板，保持 Hearthwood 风格，重点打磨场景、物件反馈和阅读角入口。先给我看实机效果，确认后再接家园升级的可见变化和存档恢复。”

This pass changes the home neighborhood and home interior only. Preserve existing gameplay, IDs, inventory/reward rules, quick Life entry, and existing save behavior. Do not implement a new upgrade appearance/progression or recovery system before the owner's next checkpoint.

## Short plan

1. Capture the current yard/room with an isolated guest. Keep original player databases untouched.
2. Compose a warm timber cottage, readable stone approach, planted borders and an interior with a distinct reading corner. Use original code-native pixel drawing alongside audited unchanged actor sheets. All proposed art remains a candidate.
3. Make nearby objects readable, give interactions local pending/accepted feedback, and connect the reading corner directly to the existing study journal. Retain the separate home upgrade manual.
4. Exercise walking/pathfinding, collision, mouse/keyboard/touch, input ownership, room transitions and reduced motion. Inspect real desktop/mobile screenshots and a recording. Stop for actual visual review.

Visual thesis: a sunlit woodland home, moss planting and warm timber surrounding a clear stone path; the home and its usable objects lead the composition.

Content plan: the yard establishes the entrance and garden route; the interior gives storage, rest and study their own places; the existing journal supplies the detailed study workflow.

Interaction thesis: modest proximity brackets, an opening book/chest response tied to real interaction, and sparse hearth/doorway ambience. Reduced motion keeps stable feedback without drifting or pulsing.

## Environment

Reused installed React 19, Phaser 3.90.0, Vite 6.4.4, TypeScript and npm lockfile. Python 3.14 backend virtualenv, Alembic and pytest. No package or lockfile changes. Isolated services: frontend 5197 / backend 8029, cookie `realquest_cottage_preview`, database `output/cottage-prototype/test.db`. The normal player database was not read, migrated, reset or edited.

## Implemented flow and files

- `frontend/src/game/hearthwood.ts`: original code-native cottage, stone approach, low garden edging/plant clusters, linen clothesline, timber interior, hearth, woven mats and reading table. Two-world-unit pixel grid; no generated/downloaded bitmap, new font or sound file. Character sheets and outside-neighborhood art remain unchanged.
- `frontend/src/game/village.ts`: use the candidate for the home and its yard, retaining the world's other buildings, trees, paths and the existing tiny level marker. No new upgrade stage or furnishing unlock.
- `backend/app/world.py`, `frontend/src/types.ts`, `frontend/src/game/interaction.ts`: add `home_reading` with an explicit study action. Existing table holds the open study book and separate small upgrade manual; the existing `home_desk` ID is retained, with its interaction anchor moved to that manual. Explicit hit areas match bed/chest/books. All world and room collision rectangles, spawn points, existing IDs and economy rules are unchanged.
- `frontend/src/game/WorldScene.ts`: click-to-approach, hover/proximity brackets, pending/rejected/accepted response, book/chest/manual/door opening and accepted rest feedback. Escape cancels walking. Keyboard movement clears pointer hover. Half-step camera zoom keeps source pixels at integer CSS scale; outdoor framing shows the home roof, and the home room pans at readable mobile scale. Short landscape keeps the player above the quickbar. Other interiors retain their camera treatment. Existing server command/retry/reward behavior stays authoritative.
- `frontend/src/game/GameCanvas.tsx`: truthful reading action, busy feedback, home context text and read-only response/hover testing state.
- `frontend/src/components/StudyPage.tsx`: returning from the physical reading corner restores focus to the world. Existing direct Life entry still restores focus to that entry.
- `frontend/src/App.tsx`, `frontend/src/game-ui.css`: location-scoped short-landscape rule keeps the home quest compass from covering the bed/chest; map/journal remain available.
- `frontend/scripts/cottage-smoke.mjs`, `frontend/package.json`: `npm run test:cottage` covers actual behavior, with context/browser cleanup in `finally`.
- `docs/art/asset-manifest.json`, `tools/audit_inventory_assets.py`: source/hash provenance and audit for the original procedural scene, alongside the 31 unchanged raster assets. `DESIGN.md`, art plan/checklist, this report and `progress.md` record the checkpoint.

No new save fields, recovery mechanism, building costs, rewards, dependencies, engine, map or paid/external asset was introduced. Existing autosave and previously implemented study/recovery features remain available; the next upgrade appearance/save extension awaits owner confirmation.

## Actual browser evidence

All evidence uses isolated guests. The owner-facing in-app preview uses its own `小屋试住旅人`, starting at the real initial seed ×6 / gold ×20. Screenshot test guests use `林间旅人`. No completed plans or achievements were fabricated for the scene.

Artifacts under `output/cottage-prototype/`:

| Evidence | Files | Outcome |
|---|---|---|
| Before views | `before-yard-{1440,390}.png`, `before-room-{1440,390}.png`, `before-state.json` | Inspected before implementation; identified roof cropping and miniature phone room. |
| Final outdoor/indoor viewports | `yard-{1440,1920,768,390,720}.png`, `room-{1440,1920,768,390,720}.png` | Real Chromium, 1440×900, 1920×1080, 768×1024, 390×844, 720×450; viewport overflow checked. Same initial character/resources, new isolated guests. |
| Physical reading entry | `reading-corner-1440.png`, `reading-journal-1440.png` | Walk to open book → existing study journal → create/start/pause a real study timer → return to same position and canvas focus. No XP from opening/closing the book. |
| Other objects | `home-manual.png`, `storage.png`, `rest-feedback.png` | Separate upgrade manual; store/withdraw conserves seed totals; rest feedback follows server acceptance. |
| Failed/pending/accepted action | `gather-{rejected,pending,accepted}.png` | Injected rejection grants nothing; pending feedback, retry and held E produce exactly one accepted gather. |
| Touch and reduced motion | `touch-yard.png`, `touch-room.png`, `touch-journal.png`, `touch-reading-corner.png`, `touch-room-{375,844}.png`, `touch-landscape-entry.png` | Chromium emulated touch, DPR2, reduced motion; 390×844, 375×812, 844×390. Readable camera, reachable ≥44px primary controls, wall collision/escape and landscape doorway verified. |
| Frame-loop evidence | `game-client-final/shot-0.png`, `state-0.json` | Skill's supplied client executed after meaningful scene changes. Only module resolution and a `finally` cleanup wrapper were adapted in the local copy; no error file produced. |
| Interaction videos | `recordings/*.webm` | Actual complete desktop and emulated-touch flows, including study entry. Captured by Playwright and flushed on context close. |
| Machine-readable checks | `result.json`, `geometry-comparison.json`, `asset-audit.json` | 25 final captures, no unexpected browser errors; geometry/spawn/ID comparisons pass; scene hash and raster audit pass. |

Screenshots were opened and visually inspected; existence alone was not counted as a pass. Final correction: the narrow room now centers vertically, pans horizontally, and handles low landscape without placing the player under the menu. The roof retains its readable silhouette at the new outdoor framing.

## Commands and outcomes

Commands from the repository root unless specified:

| Command | Outcome |
|---|---|
| In `backend/`: `DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/cottage-prototype/test.db .venv/bin/alembic upgrade head` | Existing migrations initialize only the new isolated test DB. No new migration. |
| In `backend/`: `.venv/bin/python -m pytest -q` | **54 passed**, including reachable approach for every object (now including the reading corner). Existing Starlette/httpx deprecation warning. |
| In `frontend/`: `npm run build` | TypeScript + Vite pass. Existing Phaser chunk-size warning remains. No standalone lint script exists. |
| `REALQUEST_URL=http://127.0.0.1:5197 npm run test:smoke` in `frontend/` | Existing complete desktop/mobile game regression passes: four interiors, quests, camera/navigation, storage/rest, timers, crops, trading/crafting/upgrading and persistence. The final subsequent home-only landscape camera refinement is covered by the cottage rerun below. |
| `node frontend/scripts/cottage-smoke.mjs` / `npm run test:cottage` in frontend | Final **pass**, 25 captures; door/pathfinding, Escape, wall collision, study focus/input, object responses, conservation, failure/retry, mobile and remount listener checks. |
| `node output/cottage-prototype/game-client.mjs --url http://127.0.0.1:5197 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["left"],"frames":6},{"buttons":[],"frames":4}]}' --iterations 1 --screenshot-dir output/cottage-prototype/game-client-final` | Pass on final production snapshot; screenshot inspected. Supplied develop-web-game client plus guaranteed cleanup. |
| Bundled Python `tools/audit_inventory_assets.py --output output/cottage-prototype` | **31 images and one procedural source hash pass.** System Python lacked Pillow; used the existing bundled Python without installing anything. |
| Read-only comparison of HEAD/world geometry against current `world.py` | Outdoor/indoor obstacles, every spawn and previous home IDs unchanged. |
| `git diff --check` | Pass. No commit, push or deployment performed. |

## Preview, limits and handoff

The fixed production snapshot is served at **http://127.0.0.1:5197/** with isolated backend **8029**. The in-app browser preview is left open as a deliverable. Click the green-roof cottage, then the open book on the left table; keyboard movement/E and touch controls are supported. The small closed book beside it retains the home-upgrade manual.

Backend command (from `backend/`):

```sh
DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/cottage-prototype/test.db SESSION_COOKIE_NAME=realquest_cottage_preview ALLOWED_ORIGINS=http://127.0.0.1:5197 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8029
```

Preview command (from `frontend/`), after copying `dist/` to `output/cottage-prototype/build/`:

```sh
REALQUEST_API_TARGET=http://127.0.0.1:8029 npm run preview -- --host 127.0.0.1 --port 5197 --strictPort --outDir ../output/cottage-prototype/build
```

Physical iOS/Android, Safari and native browser zoom remain unverified. The 720×450 capture is a reflow/layout check, not a claim of native browser zoom testing. No continuous tree-sway animation, new character/tool animation sheet, climate system or furnishing-placement mechanic is claimed. New scene art and interaction treatment remain candidates pending owner visual review.

Cleanup: automated contexts/browsers close in `finally`; the development Vite instance was stopped. Final process/health verification is recorded in `cleanup-results.json`. Keep only this task's fixed preview/backend and its marked in-app deliverable for manual review. Unrelated existing tabs and shared tool hosts are preserved.

