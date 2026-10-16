# 33 · 首层返村后的下一次出发

User request: connect equipment improvement, cave progression and real-life growth after the first-floor return; improve offline return guidance while retaining existing growth and rewards. Make the UI beautiful and consistent with the game.

## Plan

1. Derive a next-departure plan from actual equipment, permanent cave routes, vitality/stamina, knowledge wallet, magic and active commissions. Keep server rules, prices, receipts, rewards and saves unchanged.
2. Add a scoped illustrated preparation journal: moss-cloth packing scene and three paper bookmarks for equipment, cave route and growth. Connect the first-expedition recap, existing tracker, workshop handbook and menu. Respect dismissed guidance and manually tracked side quests.
3. Refresh authoritative state before an optional return slip. Store only per-save device-local continuation metadata; no automatic claims, spending, movement or tutorial completion. Retain manual access when device storage is unavailable.
4. Verify policies and real server actions with an isolated database, production-browser desktop/landscape captures, keyboard/touch, failure/retry, input ownership and persistence. Inspect final screenshots and supplied game client; close owned automation/services.

Visual thesis: an open linen field journal beside a cloth packing place, with familiar village artwork and a small route threaded through five cave marks.
Content: actual progress → one next action → selected preparation topic; extended rules remain in existing destination pages.
Motion: short paper arrival, bookmark selection and physical button press; respect reduced motion.

Scope is this connected interaction only. No new map, balance, reward, dependency, paid asset, font, external generation, commit, push or deployment. Owner approval of actual renders remains separate from implementation verification.

## Implemented candidate

- Successful actual workshop recap opens the journal. The workshop handbook and main menu reopen it; the optional compact/expanded tracker continues after the old first-expedition guide ends. Manual side-quest tracking and the persisted existing dismiss/resume preference retain ownership.
- Equipment leaf compares the actual equipped weapon with three optional upgrades, server prices, actual wallet, recipe material counts and level requirements. Selection never buys, crafts or equips; existing armory and equipment actions remain responsible for mutations. Initial weapons remain valid for exploration.
- Cave leaf shows permanent cleared depth, the next material source, third-floor rope/deep-route guidance and actual stone/gate progress. A live cave uses an explicit return-to-play action; low resources and missing equipment have recovery paths. No new passage, reward or lock was added.
- Growth leaf distinguishes pending study, other active promise kinds, elapsed-but-unclaimed promises, unspent knowledge, invested magic and exhausted daily quota. Research opens the existing knowledge page on magic, with an explicit existing spend action. Corrected that page's obsolete future-only spell/gate copy. No automatic allocation or settlement.
- Device-local continuation uses a per-save versioned timestamp/depth/magic bookmark. An absence of at least300seconds may produce a small slip after a successful current snapshot; it does not steal focus, replace an open page or interrupt a manually tracked side quest. Background polling cannot consume the absence. Failed refresh waits for a successful foreground/online retry. Closing or Escape dismisses it without changing saves. Reading recommendations is still available without localStorage.
- Desktop leaves fit without scrolling at1440×900,1920×1080 and1024×768. Short-landscape844×390/740×360 keeps the three bookmarks, close, preference and primary action fixed; one readable leaf scrolls with a fade, visible cue and keyboard/touch access. Entrance, object hover and press respect reduced motion.

### Changed files and assets

| Files | Purpose |
| --- | --- |
| `frontend/src/game/nextDeparture.ts` | Pure state policy and optional per-save return metadata. |
| `frontend/src/components/NextDeparture.tsx`, `frontend/src/next-departure.css` | Packing/journal composition, tracker, return slip, responsive reading and focus/input states. |
| `frontend/src/App.tsx`, `stores/game.ts`, `types.ts`, `main.tsx`, `game/GameCanvas.tsx` | Panel/menu, refreshed return lifecycle, marker ownership, research entry intent and text-state inspection. Paths after `App.tsx` are relative to `frontend/src`. |
| `frontend/src/components/VillageIntro.tsx`, `Quests.tsx`, `KnowledgeStudy.tsx` | Actual recap handoff, optional tracker continuation and selected magic entry. |
| `frontend/scripts/next-departure{,-state}.mjs`, `frontend/package.json` | Isolated public-behavior/browser and pure-policy checks; npm test entry. |
| `DESIGN.md`, `README.md`, art plan/manifest/checklist, `progress.md`, this task | Contract, exact reuse, evidence and limitations. |

No backend/rule source, database schema, dependency/lockfile, existing asset bytes or player data changed. Existing artwork is reused unchanged: arrival village, backpack, book and magic emblem; existing vector weapon/key symbols remain candidate art. The156-image source/runtime audit passes. No source pack, font, image generation, external upload or new asset acquisition.

### Environment and exact commands

Reused npm/package-lock, React19, Phaser3.90, TypeScript5.8, Vite6.4.4, installed Playwright1.64 and backend Python3.14 virtualenv. No standalone lint script is configured.

All test-save fixture writes assert exactly `output/next-departure/test.db` and update only the newly created test guest. Cookie `realquest_next33` isolates this API. No ordinary player database was opened, reset or seeded.

From `backend`:

```sh
DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/next-departure/test.db .venv/bin/alembic upgrade head
DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/next-departure/test.db SESSION_COOKIE_NAME=realquest_next33 ALLOWED_ORIGINS=http://127.0.0.1:5414 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8114 --no-access-log
```

From `frontend`, iteration used `REALQUEST_API_TARGET=http://127.0.0.1:8114 npm run dev -- --host 127.0.0.1 --port 5414 --strictPort`. Final validation uses `npm run build`, then `REALQUEST_API_TARGET=http://127.0.0.1:8114 npm run preview -- --host 127.0.0.1 --port 5414 --strictPort` after stopping the dev session. Local listening/browser execution required sandbox escalation and succeeded; no automatic approval rejection occurred.

| Check | Actual outcome |
| --- | --- |
| `npm run build` | Pass: TypeScript and final production build. Assets `index-DAksey8m.js`, `index-CrmNvDPZ.css`; existing large-chunk warning remains. |
| `REALQUEST_URL=http://127.0.0.1:5414 REALQUEST_TEST_DB=/Users/zilong/Developer/projects/RealQuest/output/next-departure/test.db npm run test:next-departure` | Pass: policy suite and10 browser check groups/25 final captures. Desktop leaves fit; fixed controls remain uncovered at every target size. Zero unexpected console/page errors; three deliberately injected503 logs are separate. [Report](../../output/next-departure/report.json). |
| Actual mutations | Workshop recap grants/consumes nothing. Rejected96-gold purchase preserves inventory; retry adds exactly one sword and deducts96 once. Equip/reload persists. An elapsed one-hour fixture is actually settled at Noah for1knowledge point; explicit magic research rejection preserves it, successful retry spends it once and saves magic1. Read-only comparison and marker actions preserve resources/position. |
| Return and input | Same-device reload and blur/focus/online contracts verified with a simulated600-second absence; pending/ready states, manual tracking, dismiss/resume, stale/failed refresh, another open panel,15.5seconds of background-poll quiet, Escape dismissal and DPR2 landscape touch pass. This does not certify native OS/tab switching. |
| `node scripts/village-intro-state.mjs` | Pass:19 existing first-expedition decisions. The full prior first-floor combat suite was not replayed. |
| `.venv/bin/python -m pytest -q tests/test_village_intro.py tests/test_combat.py tests/test_life_tasks.py tests/test_knowledge.py tests/test_departure.py` from `backend` |81passed; existing Starlette/httpx deprecation warning. |
| Supplied develop-web-game client | Pass:10up frames/6idle frames, one iteration,250ms pause. Only local Playwright resolution, isolated storage state and `finally` closure are adapted in an ignored copy; no gameplay or assertion replacement. Canvas screenshot/state inspected; final evidence in `output/next-departure/game-client-final/`. |
| Bundled Python `tools/audit_inventory_assets.py --output output/next-departure/assets` | Pass:156images; source/runtime hashes and pixels unchanged. Host/venv Python lacked Pillow, so the existing bundled runtime was used without installing dependencies. |
| Seven solid text/background pairs | Pass, minimum5.67:1; [pairs](../../output/next-departure/contrast.json). This is scoped solid-color evidence, not a per-texture or whole-app certification. |
| Prettier on new/edited UI/test files; `git diff --check` | Pass. |

### Final evidence and limitations

Actual final screenshots were opened and inspected, including [weapon comparison](../../output/next-departure/gear-staff.png), [pending study](../../output/next-departure/promise-pending.png), [elapsed but unclaimed](../../output/next-departure/promise-ready.png), [return slip](../../output/next-departure/return-ready.png), [knowledge available](../../output/next-departure/knowledge-unspent.png), [magic invested](../../output/next-departure/magic-invested.png), [third-floor route](../../output/next-departure/rope-route.png), [gate ready](../../output/next-departure/gate-ready.png), [touch route](../../output/next-departure/touch-route-844.png) and [scrolled touch leaf](../../output/next-departure/touch-route-read-844.png). Final flow [recording](../../output/next-departure/videos/page@5815db8056a2457284fcbb65c9d44e96.webm). Early iteration captures are diagnostic only; final results are in `report.json`.

The test begins from an explicitly isolated first-clear/return fixture, then executes the real recap and subsequent public actions. It does not replay the first cave fight, wait3real hours, verify actual real-world learning, rebalance combat/economy or reaccept the full departure/city chapter. Physical devices/Safari, native zoom, screen readers, blocked-storage browser behavior and long-session endurance remain unverified. Phone portrait is outside scope. Owner approval of actual UI/feel remains pending; existing broad mouse/HUD obstruction is outside this slice.

### Cleanup

All browser contexts/Chromium instances close in `finally`; the final npm/browser runner and recorded Chromium/ffmpeg children exited. The original tool sessions stopped API8114/PID13735 and production preview5414/npm14415/Vite14438/esbuild14439; earlier dev npm13747/Vite13770 already exited. Final process/start-time/parent/cwd records are in [owned runtimes](../../output/next-departure/owned-runtimes.json), and [cleanup](../../output/next-departure/cleanup.json) confirms every recorded target is absent and both ports are free. The temporary frame-client copy is removed. No task browser or manual-preview service is retained; screenshots/recording are the review artifacts. Shared Codex hosts, other tasks and user browsers were untouched. No commit, push or deployment.
