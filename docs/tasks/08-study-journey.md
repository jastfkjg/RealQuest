# Study journey — plans, daily pages and recovery

Authorized 2026-10-13: extend the existing study loop into plan → today's study → continue on another day → archive/review, including save recovery and background-timer verification. Preserve Hearthwood; no task tables. Initial working tree clean.

## Plan

1. Add server-owned study plans, one page per plan/calendar day, reversible archive and safe edits. Preserve previous records, timer identity and reward rules.
2. Extend the existing study book with a plan index and dated history; keep one primary reading action. Reuse the approved material/tokens and existing actor art.
3. Add downloadable recovery credentials for the latest server save, with a preview before switching journeys. Do not import client-supplied balances. Keep existing JSON export for inspection.
4. Reconcile server time/state on foreground/online return; verify real browser suspension, reload, cookie-loss recovery, rejection/retry, keyboard/touch and original game behavior against an isolated database.

Visual thesis: a woodland study journal with cloth bookmarks, a chapter index and dated leaves; the next page is always within reach.
Content: current plan → one daily page/action → previous leaves → folded-away editing/recovery details. No invented progress or achievements.
Interaction: existing book entrance, bookmark selection/reveal and completion seal; respect reduced motion and focus ownership.

Status: implementation in progress. Owner visual approval remains separate. No new raster asset, font, dependency, commit or deployment planned.

## Implemented

Status: **implemented and verified candidate; owner visual approval pending**. No commit, push, deployment, paid asset or player-database mutation.

| Files | Behavior |
| --- | --- |
| `backend/app/rules.py` | Add `study_plans`, optional task plan/archive fields; create/edit/archive/restore a plan; stable plan/day UUID; edit unfinished non-timing tasks and reversibly archive pages. Existing activity XP/caps/shards and timer settlement remain authoritative. |
| `backend/app/main.py`, `models.py`, `migrations/versions/002_recovery.py` | RecoveryKey/GuestSession hash tables and four recovery endpoints; identity preview; restore the latest server save into an additional guest session. Delete revokes credentials/sessions. Snapshot `save_id` plus expected command save identity prevent a stale tab writing to a different restored journey. |
| `frontend/src/components/StudyLibrary.tsx`, `StudyPage.tsx`, `study.css` | Plan spines and selected chapter, per-day study page, dated history, six-entry index pagination, progressively disclosed editing/archive, returning to the same plan after completion. Phone puts the chapter and primary action first. |
| `frontend/src/components/RecoveryPanel.tsx`, `Welcome.tsx`, `App.tsx` | Credential download/import preview and explicit restore; save-current-credential confirmation before switching an existing journey. Welcome permits recovery without creating a character; settings and study provide the same feature. |
| `frontend/src/stores/game.ts`, `services/api.ts`, `types.ts`, `game/GameCanvas.tsx` | Server time anchored to a monotonic clock; foreground/pageshow/focus/online resync, stale response clock protection, per-save command identity, refresh view preferences, typed plan state and game-text hook. |
| `backend/tests/test_game.py`, `test_migrations.py` | Multi-day/API midnight boundaries, paused multi-day gap, concurrent opening, archive/edit invariants, recover latest state without importing rewards, invalid/deleted credentials, original session preservation, stale-tab rejection and populated 001 → 002 migration. |
| `frontend/scripts/journey-smoke.mjs`, `journey-review.mjs`, `study-smoke.mjs`, `package.json` | Actual browser flow, 62-second lifecycle freeze, second-tab pause, Cookie-free recovery and current-save protection, responsive captures, keyboard/IME/reduced motion and contrast evidence; `npm run test:journey`. Existing independent-study smoke now selects the record summary by its semantic title, because this slice also adds a separate care summary; it also waits for the visible pending state to finish before removing network interception, since foreground state refresh can observe the commit before the retry returns. Original reward/retry assertions remain unchanged. |
| `README.md`, `TODO.md`, `DESIGN.md`, architecture and art checklist/plan, `progress.md` | Current usage, boundaries, evidence and remaining work. No source artwork or manifest change. |

### Rules and recovery contract

- A plan holds a title and default 1–120 minute duration. It opens at most one page per Shanghai calendar day, only when the user chooses to study. No daily auto-job, streak penalty or fabricated completion.
- New daily pages retain the latest topic and current default duration. Earlier partial progress remains on its original page; an older page can still be continued. Crossing midnight settles the activity on its finish day and keeps its original task association.
- Plan edits affect the plan/default for future pages. Unfinished task edits require its timer to end first. Reducing a target below recorded progress may mark it complete but grants no additional XP. Completed pages retain their original promise.
- Archiving is reversible and does not delete records or growth. A plan/page with a bound running **or paused** timer cannot be archived until that timer ends. Existing standalone study tasks remain usable and browsable; they are not silently attached to plans.
- Recovery files contain a high-entropy bearer credential and basic file metadata. Only its SHA-256 hash is stored server-side. Import submits only the credential; arbitrary balances, histories and client-reported progress are never loaded. Recovery returns the latest server state, even if the file predates later activity. Existing sessions/files remain valid until the whole save is deleted.
- Credentials recover access to the original server database; they are **not standalone database backups**. Server loss/deletion, account binding, cross-server import and per-record reward correction remain outside this slice. The UI says this before import. A current journey is not deleted when switching away.

## Visual evidence and assets

No new bitmap, generated art, font, sound or dependency. Existing `journal-spread-v1.webp`, measured source insets, approved tokens, controlled integer-scale actor frames and installed Lucide icons are reused. Source hash/pixel audit: 31 images pass.

- [Final plan, desktop](../../output/study-journey/final-plan-1440-default.png), [phone chapter](../../output/study-journey/final-plan-390-default.png), [phone creation](../../output/study-journey/final-create-390.png).
- [Final history](../../output/study-journey/final-history-1440-default.png), [recovery page](../../output/study-journey/final-save-1440-default.png), [Cookie-free recovery identity preview](../../output/study-journey/recovery-mobile-preview.png).
- Fixed-build flow screenshots: `new-plan-*`, `plan-*`, `timer-*`, `complete-*`, `archived-*`, `history-*`, `save-*` at 1440×900, 390×844, 768×1024, 1920×1080 and 720×450. DPR2 touch, 375px phone, 844px landscape, long title and large DOM text captured separately.
- Browser flow evidence: `output/study-journey/results.json` (38 layout captures, zero unexpected console/page errors); final recording `recordings/page@935fc0f36a13f2b711b4c236652beaa0.webm` plus the second-tab recording `page@b4ae4f03846364998663e397b412ccf2.webm`.
- Contrast: `review-cases.json` and `contrast-*/contrast-{text,background,result}`; **12 cases / 302 text runs / minimum 4.89:1**. This samples actual visible text against the texture; not a blanket accessibility certification or measurement of native input text.
- Skill frame screenshot and text inspected at `game-client/shot-0.png` and `state-0.json`; one canvas and one keyboard listener.

Screenshots were opened and inspected, including desktop, tablet, wide, phone, short view, archived and long-title states. Initial phone index pushed the main action below the fold; the final layout puts the chapter first and writing a new plan hides the secondary shelf. History selection moves focus to its page, and small/large-text views scroll without horizontal overflow. Existing native dialog focus ownership and optional motion are retained.

## Commands and actual outcomes

Reused React 19, Phaser 3.90.0, TypeScript/Vite 6.4.4, npm lockfile, installed Playwright and Python 3.14 `.venv`. No dependency changes or standalone lint script.

| Command | Outcome |
| --- | --- |
| In `backend/`: `DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/study-journey/test.db .venv/bin/alembic upgrade head` | Pass, isolated database migrated to 002; owner's `backend/realquest.db` untouched. |
| In `backend/`: `.venv/bin/python -m pytest -q` | **54 passed**; includes populated legacy migration and repeated upgrade. Existing Starlette/httpx deprecation warning. |
| In `frontend/`: `npm run build` and final `npm run build -- --outDir ../output/study-journey/build` | TypeScript/Vite pass; existing Phaser chunk-size warning; dedicated output directory warning expected. |
| `REALQUEST_URL=http://127.0.0.1:5195 node scripts/journey-smoke.mjs` | Final fixed-build pass. Server/client time remains correct with local Date.now two days ahead; original page frozen for **62 real seconds**, paused from another tab, foreground/reload synchronized. Offline resume rejected without advancing paused state. Lost create/finish response retried without duplicate plan/record/award. Full archive/restore, invalid file, Cookie-free recovery, backing up a current journey before switching, IME, focus and touch flow pass. |
| `REALQUEST_URL=http://127.0.0.1:5195 node scripts/journey-review.mjs` | Pass: creation/plan/history/recovery captures, six-entry pagination, keyboard containment, large DOM text, 375px/landscape and reduced motion. |
| Bundled Python `tools/check_character_contrast.py --output output/study-journey/contrast-<case>` | All 12 cases pass; result above. |
| `REALQUEST_URL=http://127.0.0.1:5195 npm run test:smoke` | Full original desktop and mobile pass: four interiors, quests, movement/camera/navigation, storage/rest, timers, harvesting/economy and persistence, clean console. |
| Cached skill client `node node_modules/.cache/inventory-game-client.mjs --url http://127.0.0.1:5195 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":8},{"buttons":[],"frames":8}]}' --iterations 1 --pause-ms 300 --screenshot-dir ../output/study-journey/game-client` | Pass; existing skill client differs by guaranteed `finally` browser cleanup. Movement/frame/state screenshot inspected. |
| Bundled Python `tools/audit_inventory_assets.py --output output/study-journey` | Pass: 31 image/source/hash checks. |
| `git diff --check` | Pass. |

Initial shell invocations from the wrong directory failed before execution; rerun from the documented backend/frontend directories produced the outcomes above. Tests never reset real player data or weaken assertions. Legacy independent-study regression is recorded below after completion.

## Remaining limits

Actual iOS/Android Safari, physical lock-screen/native keyboard, real browser-menu zoom and prolonged OS sleep are unverified. Chromium lifecycle freeze and touch emulation do not establish physical-device behavior. Server timer arithmetic across a three-day pause and midnight was verified with deterministic fixtures. Generic Goal/stage architecture, notifications, automatic scheduling, AI, server-side history pagination, record correction, recovery-key management UI, database disaster recovery and public-service hardening are separate work.

## Preview and cleanup

New fixed preview: **http://127.0.0.1:5195/** → enter world → 现实成长 → 今日研习 → 研习计划. Old 5193 is the earlier study-only snapshot; it is not changed by this build. The new preview uses only `output/study-journey/test.db`, backend 8027 and Cookie `realquest_journey_preview`, keeping other preview identities and the player database separate.

Retain for manual review: preview Vite PID **84305** (npm parent **84282**, esbuild **84306**, started 12:43) and backend PID **84270** (started 12:43). Commands:

```sh
# backend/
SESSION_COOKIE_NAME=realquest_journey_preview DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/study-journey/test.db ALLOWED_ORIGINS=http://127.0.0.1:5195 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8027 --no-access-log
# frontend/
REALQUEST_API_TARGET=http://127.0.0.1:8027 npm run preview -- --host 127.0.0.1 --port 5195 --strictPort --outDir ../output/study-journey/build
```

This task's superseded development service and backend PID 82310 stopped through their tool sessions. Automation browsers and contexts close in `finally`; the downloaded bearer file is removed in `finally`. Other user's preview services and shared tool hosts are not terminated. Final process/health verification and legacy regression follow below.

Final legacy regression: the unchanged-flow `study-smoke.mjs` was copied to ignored `node_modules/.cache/study-compat-smoke.mjs` with only its output directory redirected to `output/study-journey/legacy/`, preserving prior task artifacts. After narrowing the summary selector and waiting for pending retry completion, the entire original independent-study browser flow **passed**: real minute/pause/reload, failed create and same-ID retry, linked manual record, no repeated XP, world marker, keyboard/IME and touch. The first failure was an ambiguous record/care selector; a later run exposed a test interception teardown race when foreground polling observed the committed state before the retry completed. Neither required changing production rules or weakening assertions.

Final cleanup: 12 explicitly recorded automation, Chromium and ffmpeg PIDs from the compatibility reruns are confirmed exited (`cleanup-results.json`). Other journey/review/frame/original-smoke commands also completed and their `finally` browser closes ran. Superseded task development server/backend are stopped; no bearer file remains among review artifacts. Only this task's fixed preview 5195 (npm84282/Vite84305/esbuild84306) and isolated backend8027 (84270) remain for manual review, both HTTP200. Existing user preview5193 and unrelated/shared tool hosts remain untouched. The app was asked to open the new preview; its response was queued, so no claim is made that the tab was visibly opened. Final `git diff --check` passes.
