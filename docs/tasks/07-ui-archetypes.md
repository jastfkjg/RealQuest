# UI archetype redesign — 2026-10-13

Status: implemented and browser-verified candidate; owner visual approval pending. No commit, push, deployment, purchase or save migration.

## Scope and composition

The owner explicitly requested six interface archetypes, with map, board and encounter first. This supersedes the earlier single-screen limit for these six screens. Existing inventory, journal, character and arrival layouts remain in place.

Visual thesis: Hearthwood's timber, moss and readable linen support different game interactions, rather than decorating one shared modal layout.
Content: geography/selected destination; notices/selected request; person/dialogue; paired item containers; building/current-next outcomes; practical timer/logging.
Interaction: immediate selection, restrained notice/request reveal, visible focus and pressed controls. Reduced motion is supported. Authoritative commands and stable IDs are reused.

| Screen | Implemented archetype | Files |
|---|---|---|
| World map | Full-width interactive travel chart. Existing house/sprite art and line symbols identify destinations. Click selects; the destination dock explicitly marks direction and returns. Player arrow, selection ring, quest flag and rune lock are independent. Region hatching and labels reflect `discovered_*`; buildings reflect `visited_*`. Optional place index starts collapsed; zoom/recenter and keyboard/touch markers work. | `frontend/src/components/Atlas.tsx` |
| Quest board | Short pinned notices on the left and a single selected commission on the right. Distinct real statuses, objective checks, compact rewards, existing accept/claim/track actions. Phone has a compact row of notices above details. Selection remains on the chosen notice after a command. | `frontend/src/components/Quests.tsx` |
| NPC encounter | Character identity/place stage alongside dialogue. Continue reveals the optional request and transfers keyboard focus to its action. Conversational accept/turn-in/leave controls. Existing typewriter and reveal behavior retained. | `frontend/src/components/WorldPanels.tsx` |
| Storage | Backpack and chest grids, linked item selection, one transfer strip. Zero quantities remain clearly shown as empty types; no invented possessions or capacity. One-unit mutations reconcile with the server. | `frontend/src/components/WorldPanels.tsx` |
| Building upgrade | Drafting grid and existing building image; current/next numeric effects, icon-first materials, explicit shortfall and disabled insufficient-material action. Workshop trade/craft functions retained. | `frontend/src/components/WorldPanels.tsx` |
| Growth recording | Full-height utility workspace, timer and manual forms, explicit source labels, most recent saved action and actual EXP/shard reward. Existing concurrent Today study entry preserved. | `frontend/src/App.tsx` |

`frontend/src/world-panels.css` now contains purpose-specific compositions and shared control states. Removed obsolete card-list, resource-row and old atlas styles. `DESIGN.md` records these six contracts to prevent a return to the universal pale modal pattern.

## Assets and data boundaries

No new bitmap, font, sound or external asset. Existing audited house images (80×80), character frames and semantic item icons are reused unchanged. Workshop/guild/landmark symbols use the already installed Lucide family. Runtime icons and source metadata remain intact; 31-image/hash audit passes.

There are no dedicated NPC portraits or next-level building images in the adopted assets. Controlled-size character frames and current building artwork are intentional fallbacks. The map uses existing authoritative geometry, with vertical cartographic compression and leader lines at crowded points; gameplay camera/coordinates are unchanged. Discovery is persisted landmark discovery, not continuous fog-of-war. Undiscovered destinations can still be marked; the rune lock describes the reading requirement, not a travel restriction.

The pre-existing dirty tree and player database WAL/SHM were preserved. Another active task implemented Today study/backend fields during this pass; those edits are not attributed to this task. This task made no backend/rule/type/save changes. Captured fixtures use the existing DEV-only `dialog-fixture.json` and do not write API, cookies or localStorage.

## Before / after evidence

Matched starter fixtures, same viewport and state; captured before edits and after implementation. The Growth after view includes the concurrently added Today study entry, which this pass preserves.

| Screen | Desktop before → after | Phone before → after |
|---|---|---|
| Map | [Before](../../output/archetypes/before/map-1440.png) · [After](../../output/archetypes/after/map-1440.png) | [Before](../../output/archetypes/before/map-390.png) · [After](../../output/archetypes/after/map-390.png) |
| Board | [Before](../../output/archetypes/before/board-1440.png) · [After](../../output/archetypes/after/board-1440.png) | [Before](../../output/archetypes/before/board-390.png) · [After](../../output/archetypes/after/board-390.png) |
| Encounter | [Before](../../output/archetypes/before/npc-1440.png) · [After](../../output/archetypes/after/npc-1440.png) | [Before](../../output/archetypes/before/npc-390.png) · [After](../../output/archetypes/after/npc-390.png) |
| Storage | [Before](../../output/archetypes/before/storage-1440.png) · [After](../../output/archetypes/after/storage-1440.png) | [Before](../../output/archetypes/before/storage-390.png) · [After](../../output/archetypes/after/storage-390.png) |
| Blueprint | [Before](../../output/archetypes/before/building-1440.png) · [After](../../output/archetypes/after/building-1440.png) | [Before](../../output/archetypes/before/building-390.png) · [After](../../output/archetypes/after/building-390.png) |
| Growth | [Before](../../output/archetypes/before/activity-1440.png) · [After](../../output/archetypes/after/activity-1440.png) | [Before](../../output/archetypes/before/activity-390.png) · [After](../../output/archetypes/after/activity-390.png) |

Additional: [selected map destination](../../output/archetypes/after/map-selected-1440.png), [NPC request expanded](../../output/archetypes/after/npc-request-1440.png), [DPR2 touch selection](../../output/archetypes/after/map-touch-selected.png). Actual game screenshots and interaction recording are in `output/archetypes/real/`; the full smoke test captures the discovered forest map, workshop economy and phone views in `output/smoke/`.

Screenshots were visually inspected. Main desktop/phone variants were checked individually; additional 768×1024, 1920×1080 and 720×450 captures check responsive sizing. Initial map clipping, region-title overlap and long phone board layout were corrected. Effective 720px reflow and DPR2 emulation were tested; physical Safari/touch and actual browser-menu zoom are unverified.

## Commands and outcomes

Installed environment reused: npm lock, React 19, Phaser 3.90.0, Vite 6.4.4, existing Python `.venv`. No dependency update; no standalone lint command is defined.

- `DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/archetypes/test.db .venv/bin/alembic upgrade head` — isolated DB initialized. Never points at player DB.
- Backend: same DATABASE_URL, `ALLOWED_ORIGINS=http://127.0.0.1:5189,http://127.0.0.1:5191 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8025 --no-access-log`.
- DEV: `REALQUEST_API_TARGET=http://127.0.0.1:8025 npm run dev -- --host 127.0.0.1 --port 5189 --strictPort`.
- `npm run build` and final `npm run build -- --outDir ../output/archetypes/build` — TypeScript/Vite pass. Existing Phaser chunk-size warning; dedicated output directory warning is expected.
- Backend `.venv/bin/python -m pytest -q` — 44 passed; existing Starlette/httpx deprecation warning.
- `PHASE=before node scripts/archetypes-capture.mjs` and `node scripts/archetypes-capture.mjs` — 30 matched captures per phase; no overflow or console exceptions; final buttons meet 44px target.
- `REALQUEST_URL=http://127.0.0.1:5189 node scripts/dialogs-capture.mjs` — actual game at five viewports, focusable map markers, selection before navigation, unchanged player position, resource invariants, recording.
- `REALQUEST_URL=http://127.0.0.1:5189 node scripts/dialogs-interactions.mjs` — storage rejection/retry/pending deduplication/conservation/reload, input ownership, focus loop/Escape return, DPR2 touch manual record, preview isolation.
- `REALQUEST_URL=http://127.0.0.1:5189 node scripts/journal-mutations.mjs` — real board/NPC accept and turn-in, reward persistence, tracking failures/retries and manual-growth provenance. Old layout selectors were replaced with public selection/continue steps; behavioral assertions retained.
- `node scripts/archetypes-states.mjs` — landmark selection/zoom, discovery/visit/rune states, locked notice, NPC continue/accept/leave/focus, DPR2 touch map. Development state injection uses the actual loaded store module, including Vite's timestamp, to avoid a separate test store.
- `REALQUEST_URL=http://127.0.0.1:5191 node scripts/smoke.mjs` — full desktop and mobile pass, zero console errors: four interiors, quests, world movement/camera, storage/rest, timers, harvest, trade/craft/upgrade, persistence. Earlier DEV runs were invalidated by live reloads while other task files changed; the passing run used the fixed production build.
- Skill frame client copied to ignored `frontend/node_modules/.cache/archetypes-web-game.mjs`, with guaranteed `finally` browser close; existing action loop run for two movement bursts — screenshots/state pass, no error log, one canvas and one keyboard listener.
- `REALQUEST_URL=http://127.0.0.1:5189 node scripts/dialogs-contrast.mjs` + bundled Python `tools/check_character_contrast.py --output <case>` — 36 captured cases, 921 visible text runs, minimum 4.56:1. Sampler excludes clipped/hidden text and clips ranges to scroll containers.
- Bundled Python `tools/audit_inventory_assets.py --output output/archetypes` — 31-image/source-hash and pixel equality audit passed.
- `git diff --check` — passed.

This task's test changes: `archetypes-{capture,states}.mjs`, updated `dialogs-{capture,contrast}.mjs`, and adapted `journal-mutations.mjs` / `smoke.mjs` selectors. Existing storage interaction coverage remains in `dialogs-interactions.mjs`.

## Handoff and limits

Candidate awaits visual approval. Full Life Mode goal/history architecture, dedicated portraits, next-stage building art, and continuous map fog are not claimed complete. No deployment or commit.

Automation browsers/contexts close in `finally`, including failures. The task's DEV service is stopped after final captures. The fixed preview on **http://127.0.0.1:5191/** and isolated backend **8025** are retained for owner review; screenshot comparison is at **http://127.0.0.1:5191/review/**. Other active task services are preserved. Cleanup verification is recorded at completion below.

Completion cleanup: Vite DEV parent/child 62267/62290 and final automated Chromium 73505/73506/73507/73508 exited. Retained only this task's fixed preview npm/Vite 66969/66992 (5191), backend 66786 (8025), and the user-facing review tab. The final production build includes the NPC focus fix and compact phone growth header. Other project tests, study preview 5193/backend 8023, and shared Playwright MCP hosts were left intact because they are active or their chat ownership cannot be established from their shared parent. No broad process termination was used.
