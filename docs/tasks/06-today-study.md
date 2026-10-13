# Today study — one complete growth loop

## Authorized scope — 2026-10-13

Create a learning task, run/pause/resume a study timer, associate records, settle growth exactly once, and restore after refresh. Preserve Hearthwood and make the page feel like an interactive game journal, not a dashboard. Existing uncommitted world-dialog work and user database files are preserved.

## Plan

1. Extend the existing server-authoritative JSON save and timer with learning tasks and stable activity identities; reuse activity reward rules and transaction receipts.
2. Build a full-screen study journal reached from the existing growth panel, using current tokens, journal art and character. One selected task and one primary action per state; secondary record linking stays folded away.
3. Verify deterministic rule/API behavior, actual browser create → timer → record → completion → reload, keyboard/touch/input ownership, failures/retries, and responsive views with an isolated database.
4. Record evidence and remaining gaps. No commit, deployment, or user-save edits.

Visual thesis: an open woodland study journal, warm paper on moss cloth, a quiet hourglass and the actual traveler beside today's chosen pursuit.
Content: title/date and return → selected handwritten task → focus clock/action → actual recorded growth and optional record slips. No KPI grid or pretend inventory.
Interaction: a brief page entrance, tactile duration/selection controls, and a completion seal after server confirmation. Reduced motion removes these transitions. Controls remain native accessible DOM.

## Rules and boundaries

- Learning activity rewards are unchanged; completing/associating a task grants no second reward.
- Tasks use the existing Asia/Shanghai day boundary. An unfinished task can be continued later without penalty. A bound timer ending after midnight records/rewards on its finish day while advancing its original task.
- Manual record linking is restricted to unlinked study records from the task's calendar day. One record can belong to only one task. Timer provenance does not certify learning.
- Existing timers and old saves remain usable. No new currencies, AI, full goal hierarchy, or record correction policy.

Status: **implemented and verified; owner visual review pending**. No commit, push or deployment.

## Implemented files and behavior

| Files | Scope of this task |
|---|---|
| `backend/app/rules.py` | Add `study_create` and `study_link`; stable task, activity and timer identities; linked timer completion; derived cumulative task minutes/actual XP. Existing daily caps, shards and XP calculations retained. Old JSON saves upgrade additively. |
| `backend/app/main.py` | Expose `study_task_log` in snapshots. Optional `SESSION_COOKIE_NAME` retains the default name but isolates this preview from other localhost guest cookies. No SQL table/migration changes. |
| `backend/tests/test_game.py` | 12 additional test cases covering cumulative sessions, pause/restore, subminute finish, daily cap, cross-midnight attribution, legacy records/timers, invalid input rollback, single-record ownership, concurrent finish/replay and guest isolation. |
| `frontend/src/components/StudyPage.tsx`, `study.css` | Full-screen book, short task composition, duration presets/custom 1–120, one shared timer, task bookmarks, completion seal, record association/details, actual wisdom capability marker, reduced motion, native dialog/focus/Escape and mobile timer-first ordering. |
| `frontend/src/App.tsx` | Only this task's additions: import StudyPage, add 今日研习 entry to the existing activity panel and route the study view. Concurrent unrelated activity/dialog refinements preserved. |
| `frontend/src/types.ts`, `stores/game.ts`, `game/GameCanvas.tsx`, `main.tsx` | Typed task/record fields; `#study` view refresh restoration, optional selected-task session preference, read-only study state in game-text hook, stylesheet import. World remains mounted, with existing overlay input ownership. |
| `frontend/scripts/study-smoke.mjs`, `study-contrast.mjs`, `package.json` | Real browser flow and responsive/contrast evidence; `npm run test:study` runs both. Browsers/contexts close in `finally`. |
| `README.md`, `TODO.md`, `DESIGN.md`, `docs/architecture.md`, art plan/checklist, this report, `progress.md` | Usage, scope, state flow, art reuse, evidence and remaining work. Full goal/stage/daily task system remains unchecked. |

Creation persists the topic, target and server calendar date before timing starts. Finishing one or several sessions creates genuine `timer` records with stable task association, advances the task and grants only the existing activity reward. Manual records can be associated separately if they belong to the task day and no other task; reassociation to the same task is a no-op for progress/rewards. Client retries retain the original transport UUID; creation also has a stable task UUID, and new timer controls guard against stale timer IDs. Uncertain responses reconcile against `/api/state`.

The design does not claim that a timer proves study. Task completion grants no extra XP, coins or unlock action. Reaching wisdom 25 offers the existing ruins marker without teleporting or automatically resolving the world event. Existing free study timers and all other activity types remain available.

## Artwork and visual review

No new raster asset, font, paid pack or dependency. Reused the audited textless journal spread and existing selected character sheet at integer 3×/4× scale. The original SVG hourglass is authored directly in `StudyPage.tsx`; source art and manifest hashes remain intact. 31-image audit passes.

- [Final desktop completed page](../../output/study-reference/final-completed-1440-default.png), [mobile creation](../../output/study-reference/final-draft-390-default.png), [mobile completion](../../output/study-reference/final-completed-390-default.png).
- [Desktop real timer](../../output/study-reference/timer-1440.png), [phone real timer](../../output/study-reference/timer-390.png), [tablet](../../output/study-reference/timer-768.png), [wide](../../output/study-reference/timer-1920.png), [short viewport](../../output/study-reference/timer-720.png), [DPR2 touch/long title](../../output/study-reference/touch-long-title.png). All opened and visually inspected. Short views intentionally scroll; controls remain reachable.
- [Browser results](../../output/study-reference/results.json), [contrast summary](../../output/study-reference/contrast-summary.json), [asset audit](../../output/study-reference/asset-audit.json), [game frame](../../output/study-reference/game-client/shot-0.png).
- Actual desktop flow recording: `output/study-reference/recordings/page@7cd7e5f54599834494629c5a35b253e0.webm` (final small completion illustration/copy refinement is documented by the later `final-*` screenshots).

Visual corrections from inspection: phone timer/actions moved before record details; actor sheet dimensions corrected to measured 64×112; inherited small-text colors overridden; phone paper-edge insets increased; timer punctuation darkened; after creation focus moves to the next primary action without scrolling away; complete state replaces the zeroed timer with the closing-book message. Toasts dismiss automatically and have an accessible close control.

Final contrast sample: **10 cases, 268 visible text runs, minimum 4.97:1**, measured against rendered paper/background in desktop/phone default, hover and bottom views. Input text/placeholder use the explicit opaque linen surface; text-node sampling does not include input values. This is scoped evidence, not a universal accessibility certification.

## Environment, commands and outcomes

Reused npm lockfile and installed React 19, Phaser 3.90, Vite 6.4.4, Playwright 1.64; Python backend `.venv`. No new dependencies or standalone lint command.

Test database: `output/study-reference/test.db`, created with `DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/study-reference/test.db .venv/bin/alembic upgrade head` in `backend/`. No tests used `backend/realquest.db`.

| Command | Result |
|---|---|
| `npm run build` (frontend) | TypeScript + production build pass. Existing Phaser chunk-size warning retained. |
| `.venv/bin/python -m pytest -q` (backend) | **44 passed**, existing Starlette/httpx deprecation warning. |
| `REALQUEST_URL=http://127.0.0.1:5193 node scripts/study-smoke.mjs` | Pass on fixed production build. Real 61-second session, pause/reload/resume, create rejection/pending/retry, lost-response create/finish with same UUID, single award, task/record persistence, manual association without extra XP, wisdom marker without movement, keyboard/IME/Escape/focus, touch/subminute/long title and five viewports. No unexpected console/page errors. |
| `REALQUEST_URL=http://127.0.0.1:5193 node scripts/study-contrast.mjs` and bundled Python `tools/check_character_contrast.py --output output/study-reference/contrast-<case>` | Pass: final 10 cases above; 375px phone/844px landscape, larger DOM text, keyboard containment and reduced motion also checked. |
| `REALQUEST_URL=http://127.0.0.1:5193 npm run test:smoke` | Final pass: desktop four interiors, quests, camera/navigation, storage/rest, timers, harvesting/economy/persistence; mobile touch, portrait/landscape and clean console. |
| Existing `node node_modules/.cache/inventory-game-client.mjs --url http://127.0.0.1:5193 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":8},{"buttons":[],"frames":8}]}' --iterations 1 --pause-ms 300 --screenshot-dir ../output/study-reference/game-client` | Pass; screenshot and state inspected; one world canvas. |
| Bundled Python `tools/audit_inventory_assets.py --output output/study-reference` | Pass: 31 source/runtime images, source hashes and generated pixel equality preserved. |
| `git diff --check` | Pass. |

The first study script used an incorrect existing form label; corrected the selector and reran the full flow. The first broad smoke was interrupted by concurrent HMR; another attempt used a storage selector superseded by concurrent dialog work. After that work's script update, the entire original smoke passed on the frozen build. No production behavior or assertions were weakened to make these checks pass. The unrelated dialog files, test changes and original DB WAL/SHM remain preserved.

## Preview, cleanup and remaining gaps

Review **http://127.0.0.1:5193/**, enter a character, then **现实成长 → 今日研习**. This is a functional isolated preview, not a fixture. The frontend serves a fixed snapshot at `output/study-reference/build` so other worktree hot reloads do not disrupt review. Backend 8023 uses the separate test database and `realquest_study_preview` Cookie; default application cookies remain named `realquest_session`.

Retained solely for manual review: Vite preview PID **63576** (npm parent 63553, started 11:20), backend PID **67308** (started 11:26); CWD/listeners and HTTP 200/health `ok` verified. Start equivalents:

```
# backend/
SESSION_COOKIE_NAME=realquest_study_preview DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/study-reference/test.db ALLOWED_ORIGINS=http://127.0.0.1:5193 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8023
# frontend/
REALQUEST_API_TARGET=http://127.0.0.1:8023 npm run preview -- --host 127.0.0.1 --port 5193 --strictPort --outDir ../output/study-reference/build
```

All own study/contrast/frame/smoke script sessions exited, and their browsers closed in `finally`, including failed runs. Superseded own development frontend and backend were stopped through their sessions and confirmed exited. Other task's 5189 Vite, independently started smoke/Chromium and Chrome CLI session, and tool hosts without confirmed ownership are preserved; no broad process termination. Existing user browser tabs were not operated. An app preview tab may be retained explicitly for this review.

Physical iOS/Android Safari, real mobile keyboard, actual browser-menu zoom, extended background suspension and long-term performance remain unverified. Chromium touch/DPR2, IME-event ownership, short-view reflow, large DOM text and timer refresh were verified. Tasks do not yet edit/archive/recur automatically; historical task/record pagination, broader Goals/History and AI remain separate future work. Today's slice is ready for owner review; no further screen rollout is included.
