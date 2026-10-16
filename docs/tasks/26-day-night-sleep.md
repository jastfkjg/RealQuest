# Day/night and sleep — first gameplay stage

Status: implemented and verified candidate, 2026-10-16. Actual owner visual approval and final balance remain pending.

Owner request, 2026-10-16: implement a 24-hour clock, 01:00 fainting/home return/HP loss/no sleep stamina recovery, offline and Life Mode pause, compatible existing saves.

## Scope and plan

1. Extend the existing resident clock rather than adding a parallel time system. Preserve all concurrent resident/artwork work and existing player databases.
2. Add normal sleep, free short rest, visible bedtime reminders and morning outcomes with explicit input ownership.
3. Verify deterministic clock boundaries, retries/concurrency, real-time separation and compatible saves. Exercise the production build in an isolated browser at desktop and phone-landscape sizes; inspect screenshots and recordings.
4. Record exact outcomes and close this task's owned browsers and services. No city, lodging, map expansion, combat, asset acquisition, commit, push or deployment.

## Implemented rule candidate

- New journeys begin at06:00; the existing speed is retained:30 real minutes per24 game hours, or23m45s of active play from06:00 to next01:00. The play-day number changes at morning, not at midnight.
- Home sleep advances to next06:00, fills stamina and restores up to20 HP. Free bedside short rest costs30 game minutes and restores up to20 stamina/10 HP; it is unavailable if it would reach01:00.
- Confirmed active time reaching01:00 settles one faint, returns to the safe bedside position, removes up to10 current HP with floor1, and preserves current stamina. No permanent capacity/point/reality-growth loss.
- Existing background/reading/Life pause now shares the sleep clock. Unconfirmed tails of expired10s heartbeat leases are discarded, not charged on reconnect. Owner-scoped pause cannot stop another active view. Delayed yesterday-world commands cannot undo a morning return.
- Clock-version migration preserves a legacy resident clock's committed playable day/time without counting an old lease. Legacy01:00–06:00 becomes06:00 without penalty; pre-clock saves gain defaults. Player assets and old production/commission deadlines remain untouched.
- Real crop/resource timestamps and720-real-second natural stamina recovery remain. No game sleep time is added to real timers, daily point quotas or production; fainting resets the stamina recovery anchor so its result grants no accumulated recovery.

## Actual changed files

| Files | Purpose |
| --- | --- |
| `backend/app/daynight.py` (new), `residents.py` | One shared authoritative clock, additive clock-version migration, missed-heartbeat handling and deterministic next-morning transitions. Existing NPC identities/routines remain. |
| `backend/app/rules.py`, `main.py` | Bed sleep/short rest, late-action guard, expected-day business identity, sleep quotes, snapshot projection, and player-lock serialization for old-save initialization. Existing receipt/economy boundaries reused. |
| `backend/tests/test_daynight.py` (new), `test_game.py`, `test_health.py`, `test_residents.py` | New sleep/pause/conservation/concurrency/migration cases. Existing NPC/economy fixtures explicitly keep their08:30 scenario while production new journeys start06:00; changed rest callers include the expected day. |
| `frontend/src/components/SleepPanel.tsx` (new), `sleep.css` (new) | Native bedside choices, capped recovery, disabled late short-rest state, single inline error, staged bedtime reminder and persistent/dismissible morning outcome. |
| `frontend/src/components/Residents.tsx`, `game/residents.ts`, `game/GameCanvas.tsx`, `game/WorldScene.ts` | Shared displayed clock and reminders, existing lifecycle reuse, game/scene state output, stronger readable night tint, cleared held input/path and actual home-position reconciliation after a night. |
| `frontend/src/App.tsx`, `main.tsx`, `game/interaction.ts` | Bed entry, sleep panel, discoverable guide, shared stylesheet and feedback ownership; no second Phaser instance. |
| `frontend/src/services/api.ts`, `stores/game.ts`, `types.ts` | Typed clock/outcome/rules, day-bound delayed world actions, revision-aware acceptance, and close/reset stale world context on a new morning. |
| `frontend/scripts/day-night-smoke.mjs` (new), `package.json` | Repeatable `test:sleep` command with an explicit isolated-DB guard; all contexts/browsers close in finally. |
| `README.md`, `DESIGN.md`, `TODO.md`, `docs/{game-design,roadmap,architecture}.md`, `docs/art/{ASSET_PLAN,REVIEW_CHECKLIST}.md`, `asset-manifest.json`, this report, `progress.md` | Current rules, stage completion, production-clock deferral, evidence and source reuse. Existing resident work and player data preserved. |

No dependency, lockfile, SQL migration, downloaded/generated raster, font, sound, map or account change. Existing source art is unchanged; DOM/CSS and installed Lucide icons use shared Hearthwood tokens. The existing Phaser lighting layer provides the night tint.

## Commands and outcomes

Reused npm/package-lock, React19, Phaser3.90.0, Vite6.4.4 and the backend Python3.14 virtualenv. Final browser runners use the existing Node22.23.2 runtime. No lint script is defined. All services bind loopback; browser fixtures use only `output/day-night/test.db`, cookie `realquest_daynight_preview`, frontend5401/API8101.

| Command/check | Actual result |
| --- | --- |
| In `backend/`: `DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/day-night/test.db .venv/bin/alembic upgrade head` | Existing migrations applied only to the new isolated DB. No player database touched. |
| In `backend/`: `.venv/bin/python -m pytest -q` | **174 passed**, including deadline/sleep concurrency, lost-response receipts, nonfatal repeated fainting, zero stamina, expired leases, Life/reality time separation, pre-clock/resident-clock saves and concurrent initialization versus inventory mutation. Existing Starlette/httpx deprecation warning. |
| In `frontend/`: `npm run build` | TypeScript and production build pass; existing large-Phaser-chunk advisory remains. |
| In `frontend/`: `REALQUEST_URL=http://127.0.0.1:5401 REALQUEST_TEST_DB=/Users/zilong/Developer/projects/RealQuest/output/day-night/test.db /Users/zilong/.nvm/versions/node/v22.23.2/bin/node scripts/day-night-smoke.mjs` (also `npm run test:sleep`) | **9 feature groups,16 captures, zero unexpected console/page errors.** Actual home entry, bed controls/input, short rest, rejected sleep, server-committed lost response/retry, sleep/reload, night navigation, Life/disconnect/pagehide pause,01:00 faint/scene return/recovery, late rejection, legacy recovery and DPR2 touch/reduced-motion. |
| Cleanup-wrapped supplied skill client: `node output/day-night/frame-client.mjs --url http://127.0.0.1:5401 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["left"],"frames":6},{"buttons":[],"frames":4}]}' --iterations 2 --screenshot-dir output/day-night/frame-final` | Two final movement/render/text-state iterations pass. Only local module resolution and finally cleanup are adapted from the installed skill client. |
| Original `REALQUEST_URL=http://127.0.0.1:5401 node scripts/play-mode-smoke.mjs` | **Does not pass unchanged**: its fixed canvas gather point is intercepted by the pre-existing DOM interaction prompt. This was previously documented in task21 and was not hidden/disabled to make the test pass. |
| `REALQUEST_URL=http://127.0.0.1:5401 node output/day-night/play-mode-compatible.mjs` | **All10 existing assertions pass** after replacing only that pickup approach with physical direction keys and E; the local copy also resolves Playwright from installed modules. Actual gather/cost/cooldown, held-key reset, quest reward, refresh, Life read-only behavior and blur recovery remain covered. No game control change was made for that interception. |
| `git diff --check`, scoped Prettier check, local-document link check / manifest parse | Pass;84 local links checked and asset manifest valid JSON. No standalone lint command claimed. |

Sandbox restrictions initially prevented local listeners/process inspection; approved scoped local execution was used for services and Chromium. No automatic approval rejection occurred. Initial engineering checks exposed06:00-dependent legacy test fixtures, a missing scene field and real-time fixture tolerance; these were corrected. Visual review found short-screen action clipping, clock/morning overlap, duplicate sleep toast and duplicate failure feedback; the final UI and dedicated assertions correct them.

## Inspected actual-browser evidence

Evidence is local under `output/day-night/`; screenshots depict isolated fixture players, not fabricated possessions or changes to an owner's save. Starting/bedtime conditions are seeded through a CLI that refuses any DB path except this task's explicit output DB. No production time-override endpoint exists. Near-deadline cases exercise real server heartbeat time after deterministic fixture setup; this is not a claim of waiting a complete24-hour cycle on a physical device.

- Bed choices: [1440×900](../../output/day-night/sleep-1440.png), [1920×1080](../../output/day-night/sleep-1920.png), [844×390](../../output/day-night/sleep-landscape.png), [DPR2 touch](../../output/day-night/sleep-touch-landscape.png), [late-night short-rest rejection](../../output/day-night/late-bed.png).
- Outcomes: [short rest](../../output/day-night/short-rest-1440.png), [single rejected-save feedback](../../output/day-night/sleep-rejected.png), [normal morning](../../output/day-night/slept-1440.png), [faint return](../../output/day-night/fainted-1440.png), [landscape faint return](../../output/day-night/fainted-landscape.png), [legacy zero-stamina recovery](../../output/day-night/legacy-recovered.png).
- World/pause: [initial morning](../../output/day-night/morning-1440.png), [night](../../output/day-night/night-1440.png), [landscape night](../../output/day-night/night-landscape.png), [Life Mode](../../output/day-night/life-paused-1440.png), [touch sleep outcome](../../output/day-night/slept-touch-landscape.png).
- `result.json`, `frame-final/{shot-*,state-*}` and `videos/*.webm` retain the full browser results, readable state and recorded desktop flow. Tests close contexts to flush recordings. Actual images were opened and inspected; generation alone was not counted as acceptance.

## Remaining gaps and cleanup

Completed: requested first-stage rules and public bed flow, compatible saved state, service-authoritative timing, deterministic integrity tests and production-build browser evidence. Preview-only: actual owner visual approval and gameplay tuning. Unverified: physical devices/Safari/native zoom/screen readers, full-day endurance, production PostgreSQL load and long-term receipt growth. Known independent limitation: the original fixed-point mouse gather regression still needs its HUD hit-area issue resolved.

Next: first-chapter departure/city/lodging as a separate slice. Production-clock migration remains explicitly deferred; no sleep skip matures crops, completes real commissions or refreshes reality quotas. No commit, push, deploy or player-data reset.

Cleanup completed after the last UI verification: final preview Node63291/npm63268 and isolated API63258 exited, as did the superseded services57057/58576/58599/61145. Ports5401/8101 have no listeners; exact PID/start/command/CWD evidence and final process checks are in `output/day-night/{owned-services,cleanup}.json`. Feature/frame/compatibility browsers and contexts close in finally and all runners completed. No manual preview is retained; only screenshots, recordings and the isolated test DB remain. Existing/shared tools are preserved when their ownership or another chat's use cannot be established. No broad process kill was used.
