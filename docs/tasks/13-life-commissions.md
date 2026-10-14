# NPC reality commissions — 2026-10-14

Owner request: replace growth forms with NPC dialogue for study/exercise/work, earning knowledge/health/skill points at one point per hour, at most five per day. Server time gates settlement. Support cancellation and turn the existing growth entry into history. Keep game presentation.

## Plan and contract

1. Extend existing JSON saves and transaction/receipt commands. Noah at the river offers all three types. Only one active commission; acceptance and settlement require proximity. Cancellation is available from dialogue or history.
2. China Standard Time quota belongs to the acceptance day. Active hours reserve quota; claimed hours permanently consume it regardless of point spending. Cancellation releases the reservation and gives no partial reward. Overnight tasks stay valid and consume the original day's quota. Closed browser/offline time counts. Server timestamps govern eligibility; elapsed time does not verify real activity.
3. Reuse NPC vignette, pixel actor, Hearthwood controls and journal styling. Dialogue choices → hour tokens → explicit acceptance; active countdown → settlement or cancellation. Growth entry shows dated, real records and a marker to Noah (no teleport).
4. Retain prior notes, XP and point balances. Legacy note completion no longer awards knowledge/health points; those now come only from commissions. Preserve health investment/science/magic progression; skill points are saved, with no invented spending mechanic.
5. Verify rules, retries/concurrency/persistence, real browser UI and responsive screenshots with an isolated database. Record results and clean task-owned tools. No production/user DB modifications, commit, push or deployment.

Status: implemented and verified at the NPC feature checkpoint; owner visual review pending. No new assets added.

## Implemented result

- Noah's default conversation is the reality commission. The existing story quest remains under “村庄闲谈”. Three native choice buttons and 1–5 hour tokens replace the growth form; after a 2-point claim only 1–3 remain. Server-derived quota, waiting clock, due timestamp, confirmation receipt, cancellation confirmation and daily completion state are rendered with the existing NPC scene.
- The HUD “现实成长”/L opens the growth journal. It shows current progress, actual three-currency balances, filtered settled/cancelled history (ten entries at a time), old activity records and a marker to Noah. Cancellation is available here without walking; acceptance/settlement require proximity. Marker navigation never teleports.
- Existing health investment and science/magic study remain accessible. The training page now points to Noah and preserves old exercise history. Old study notes/timers remain usable, but completion/editing/linking no longer mint points. Existing XP, rewards, records, saves and stable IDs are preserved.
- All rules run inside the existing transaction. Stable task IDs and receipts protect unknown-response retries; task terminal state protects repeats with new request IDs. Receipt ledger includes skill deltas. No SQL migration or player-data reset.

### Scoped files

- `backend/app/rules.py`, `main.py`: life task defaults, views, quota/time/proximity validation, accept/cancel/claim, receipt delta, and retired legacy point awards.
- `backend/tests/test_life_tasks.py`, `test_health.py`, `test_knowledge.py`: nineteen new cases including invalid input, boundary timestamps, cancellation, midnight, retry, concurrency and recovery; adapt legacy tests to the explicit new reward policy, preserving spending/XP checks. Ensure standalone test collection initializes its temporary database before app imports.
- `frontend/src/components/LifeQuests.tsx`, `life-quests.css`: dialogue choices, countdown/confirmation and dated journal.
- `App.tsx`, `WorldPanels.tsx`, `TrainingPage.tsx`, `StudyPage.tsx`, `KnowledgeStudy.tsx`, `types.ts`, `game/GameCanvas.tsx`, `main.tsx`: replace entry, keep NPC story branch, preserve spending, correct reward copy, typed snapshot/debug hook and stylesheet.
- `frontend/scripts/life-commissions-smoke.mjs`, `play-mode-smoke.mjs`, `smoke.mjs`, `package.json`: new feature script; general world regression now treats Life as history, tests legacy timer compatibility through public API and selects the NPC story topic explicitly.
- `README.md`, `DESIGN.md`, `docs/game-design.md`, `docs/architecture.md`, `docs/art/REVIEW_CHECKLIST.md`, `progress.md`: current rules, superseded prior form contract, evidence and handoff.

Assets: no new image, font, sound, download or source processing. Existing `PixelPerson`/Ninja Adventure NPC, Lucide icons and Hearthwood token geometry are reused. No tracked source/runtime asset files changed for this task. A concurrently added character concept image belongs to the other active chat and is excluded from this scope.

## Verification

Actual environment: existing npm lockfile/dependencies, React/TypeScript, Phaser 3.90, Vite 6.4.4 and `backend/.venv` Python 3.14. Isolated database only: `output/life-commissions/test.db`; unique cookie `realquest_life_preview`.

| Command/check | Outcome |
| --- | --- |
| `cd backend && DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/life-commissions/test.db .venv/bin/alembic upgrade head` | Existing migrations applied to a fresh isolated database. |
| `cd backend && .venv/bin/python -m pytest -q tests/test_life_tasks.py` | 19 passed independently. |
| `cd backend && .venv/bin/python -m pytest -q` | 95 passed at this feature checkpoint; existing Starlette/httpx deprecation advisory. |
| `npm --prefix frontend run build` | TypeScript/Vite pass; existing Phaser chunk-size advisory. Final build copied to `output/life-commissions/build`. |
| `REALQUEST_TEST_DB=/Users/zilong/Developer/projects/RealQuest/output/life-commissions/test.db node frontend/scripts/life-commissions-smoke.mjs` | Pass on fixed production build: 24 screenshots, no unexpected console errors. Includes rejected acceptance, committed response loss/retry, server refusal before deadline, cancellation/Escape, reload, 2-point claim → remaining three hours, 5-point cap, history filter, spending without quota refill, work-point touch settlement and portrait/landscape touch cancellation. |
| `REALQUEST_URL=http://127.0.0.1:5205 node frontend/scripts/play-mode-smoke.mjs` | Pass: movement/approach, range, entering, gather/cooldown, held-key clearing, story rewards, persistence, new history ownership and blur recovery. |
| `REALQUEST_URL=http://127.0.0.1:5205 node frontend/scripts/smoke.mjs` | Pass on fixed build: four interiors, story quests, camera, navigation, storage, rest, legacy timers, crop harvest/economy, reload, independent mobile guest and portrait/landscape touch. |
| `node output/life-commissions/game-client.mjs --url http://127.0.0.1:5205 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":6},{"buttons":[],"frames":6}]}' --iterations 2 --pause-ms 250 --screenshot-dir output/life-commissions/game-client` | Skill frame client passes. Existing local-import/finally-cleanup wrapper reused; screenshots and text state inspected, no error files. |
| Text contrast in feature browser script | 22 cases / 705 visible DOM text runs, minimum 4.97:1. Reads computed foreground/opaque ancestor backgrounds; excludes hidden 1px screen-reader title and disabled controls. |
| `git diff --check` | Pass. |

Visuals inspected at 1440×900, 1920×1080, 768×1024, 390×844, 375×812, 720×450; additional DPR2 emulated-touch 375×812/844×390, reduced motion and 20px enlarged journal text. Verified no horizontal overflow and 44px control targets in captured dialogs. **Actual owner visual approval remains pending.**

Evidence: `output/life-commissions/{choices-1440,choices-390,active-1440,ready,claimed-two,daily-cap,history-complete-1440,history-complete-390,touch-work-375,touch-landscape}.png`, `result.json`, `recordings/*.webm`, and `game-client/`. Main world regression evidence remains in `output/smoke/` and `output/ux-v0.2/`.

Maturity fixture disclosure: browser tests change only their own task's timestamps in the dedicated test DB to exercise settlement without waiting several real hours. Server clock boundary/early refusal uses deterministic backend tests; the browser also attempts an immediate early settlement against the real API and receives rejection. No test clock override or backdoor exists in application code. Physical devices/Safari, native browser-menu zoom, multi-hour wall-clock endurance and production PostgreSQL load remain unverified. Historical feature-specific browser scripts aimed at retired form entry points are superseded by `test:life`; they were not claimed as passing.

## Handoff and cleanup

- Fixed local preview: http://127.0.0.1:5205 — Vite PID 66597 / npm parent 66574, isolated API port 8037 PID 66561. Retained for owner manual review. Health through the frontend proxy returns `{"status":"ok"}`.
- Initial task dev frontend and API (session 84661 / 62298, API PID 63733) were stopped through their session interfaces. All task-created test contexts/browsers close in `finally`; runner sessions completed. Final process inspection found no remaining task smoke/frame runner or headless Chromium processes.
- Existing 5203/8035 preview listeners disappeared during this task without a stop action here. Shared app node_repl/MCP hosts cannot be safely assigned to a completed task, and another active chat uses this repository; they were preserved. No broad process kill, user browser closure or unrelated cleanup.
- Concurrent chat **“优化个人数据页面”** began adding character growth fields/options to shared backend/type files during final review. Those edits were preserved and are not claimed as this task's work. The fixed preview and its evidence represent this NPC slice before that separate UI rollout; coordinate the latest joint preview in that chat.
- No commit, push, deployment, paid acquisition or original player database modification.
