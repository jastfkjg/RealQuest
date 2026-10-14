# Knowledge, science and magic — study growth

Authorized 2026-10-14: continue the existing learning loop with knowledge points invested in science or magic, keeping the feel of a game page.

## Plan

1. Award one knowledge point on the first unfinished → completed transition of a study task; preserve XP, shards, record ownership, legacy completed tasks and timer provenance.
2. Extend the same study journal with a knowledge chapter: two selectable research paths, one explicit point investment and a server-confirmed growth mark. Connect completion, history and the character entry.
3. Verify deterministic rules, concurrency/retries, save recovery and actual browser flows at desktop/phone/landscape sizes, using an isolated database. Inspect screenshots and contrast.
4. Record exact checks, evidence and cleanup; retain a separate local preview. No commit, push, deployment or user data reset.

Visual thesis: two ink-drawn paths on a familiar woodland journal, with earned knowledge lighting the chosen discipline. Reuse the existing book material and shared tokens; no new bitmap or palette.
Content: earned point seal → science/magic selection → selected discipline and exact level/cost preview → explicit investment → recorded result. Secondary history stays folded away.
Interaction: bookmark/page entrance, selected path emphasis, and confirmed level stamp. Native buttons, no drag requirement, one primary spending action, reduced-motion alternatives.

## Rules

- Every study task completed after this feature is active grants one knowledge point once, through bound timer completion, same-day record association or shortening a target to already recorded minutes. Existing maximum of 20 newly created study tasks per server day remains; no new hidden daily cap.
- Historical completed tasks receive no automatic retroactive award; unfinished legacy tasks can earn their first point. Old wisdom XP, shards, runes and health growth remain intact.
- One point raises science or magic by one. Values start at zero and persist independently from the five legacy XP attributes. Selection does not spend; explicit confirmation does. A shared investment revision prevents cross-tab/branch double spending.
- Science/magic equipment, spells and world effects are future work. This slice provides actual permanent levels, without claiming those effects exist.
- Uses existing JSON saves and transactions; no SQL schema change. Manual/timer provenance is preserved and does not certify learning.

Status: implemented and verified; actual visual candidate requires owner review.

## Implemented files

| Files | Change |
| --- | --- |
| `backend/app/rules.py`, `main.py` | Additive knowledge defaults, task completion point, science/magic spending under the existing transaction, expected total-level check and receipt deltas. |
| `backend/tests/test_knowledge.py` | Twelve deterministic/API cases: partial/subminute timer, XP cap independence, record ownership, edit/archive/restore, midnight attribution, legacy completed/unfinished saves, invalid spending, conservation, concurrent linking/spending, receipts and recovery isolation. |
| `frontend/src/components/KnowledgeStudy.tsx`, `knowledge.css` | Two discipline marks, actual point seal/levels, investment preview, rolling five-level marks, source links, pending/error/confirmed states, responsive paper margins and reduced motion. Confirmed/error feedback receives focus. |
| `StudyPage.tsx`, `StudyLibrary.tsx` | Fifth chapter, restored chapter preference, reward promise/provenance, completion → research action and history reward status. Suppress duplicate completion toast covering the phone action. |
| `CharacterPanel.tsx`, `stores/game.ts`, `types.ts`, `GameCanvas.tsx`, `main.tsx` | Actual science/magic and balance display with direct entry, transient entry hint, compatibility types, game-text state and scoped stylesheet. |
| `frontend/scripts/knowledge-smoke.mjs`, `study-smoke.mjs`, `package.json` | Repeatable knowledge regression; original study test additionally asserts knowledge awards without weakening existing XP/retry checks. |
| README, TODO, DESIGN, architecture/game-design/art docs and progress | Current usage, boundaries, material reuse and verification evidence. |

## Actual checks

Node 22.23.2, Python 3.14.6, existing npm lock/dependencies, Vite 6.4.4 and Phaser 3.90.0. No dependency changes. Fresh isolated SQLite at `output/knowledge-growth/test.db`, cookie `realquest_knowledge_preview`. Dedicated production build directory preserves earlier preview builds.

| Command/check | Outcome |
| --- | --- |
| In `backend/`: `DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/knowledge-growth/test.db .venv/bin/alembic upgrade head` | Existing schema applied only to new test DB; no new migration. |
| In `backend/`: `.venv/bin/python -m pytest -q` | **76 passed**; existing Starlette/httpx advisory remains. |
| In `frontend/`: `npm run build -- --outDir ../output/knowledge-growth/build` | TypeScript/Vite pass; existing Phaser bundle-size and intentional external-output advisories remain. |
| `REALQUEST_URL=http://127.0.0.1:5203 /Users/zilong/.nvm/versions/node/v22.23.2/bin/node frontend/scripts/knowledge-smoke.mjs` | **Pass: 22 captures**, ten contrast cases, no unexpected console/page errors. Actual manual activity → association → point → science/magic, pending/failure, same-ID lost-response retry, outside-client conflict, source review, 6+ levels, long title, character entry, reload, keyboard/IME/tab ownership, DPR2 touch and reduced motion. |
| Same URL/Node with `frontend/node_modules/.cache/knowledge-study-smoke.mjs` | Original study flow passes, including a real server minute, pause/reload, lost timer-finish response and manual linking. Knowledge is 1 after timer completion and 2 after linked completion; XP/shards unchanged. Copy only redirects artifact output to `legacy-study/`. |
| Same URL/Node with `frontend/node_modules/.cache/knowledge-health-smoke.mjs` | Previous health/stamina flow passes, **19 captures**. Copy only redirects evidence to `health-regression/`. No zero-stamina DB fixture requested this run; deterministic coverage remains in backend suite. |
| In `frontend/`: same URL/Node with `scripts/play-mode-smoke.mjs` | Existing movement, approach/range, enter/restart, gather/cooldown, held keys, quest, restore and blur flow passes. |
| `node output/knowledge-growth/game-client.mjs --url http://127.0.0.1:5203 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":6},{"buttons":[],"frames":6}]}' --iterations 2 --pause-ms 250 --screenshot-dir output/knowledge-growth/game-client-final` | Skill frame client passes; screenshots/text inspected. Reuses prior skill client adaptation with local import and finally browser/session cleanup. |
| Bundled Python `tools/check_character_contrast.py --output output/knowledge-growth/contrast-<case>` | **10 cases / 328 text runs / minimum 4.94:1**, sampled against actual paper texture. |
| Bundled Python `tools/audit_inventory_assets.py --output output/knowledge-growth` | **31 images/source hashes pass**; no art edits/acquisitions. |
| `git diff --check` | Pass. |

Initial visual checks caught the completion toast covering the mobile research button and text touching the darker paper edge. Fixed duplicate toast, mobile navigation spacing, paper inset and secondary provenance position. Final measured contrast and focused flow pass. Tests never reset an owner save or fabricate an actual-user activity.

## Visual evidence

All under `output/knowledge-growth/`, all implementation candidates:

- Empty research: [1440](../../output/knowledge-growth/empty-1440.png), [1920](../../output/knowledge-growth/empty-1920.png), [768](../../output/knowledge-growth/empty-768.png), [390](../../output/knowledge-growth/empty-390.png), [720 landscape](../../output/knowledge-growth/empty-720.png).
- [Completed desktop](../../output/knowledge-growth/completed-1440.png), [completed phone](../../output/knowledge-growth/completed-390.png), [science preview](../../output/knowledge-growth/available-science.png), [magic selection](../../output/knowledge-growth/available-magic.png).
- [Pending](../../output/knowledge-growth/pending-investment.png), [failed](../../output/knowledge-growth/failed-investment.png), [science invested](../../output/knowledge-growth/science-invested.png), [magic invested](../../output/knowledge-growth/magic-invested.png), [reconciled conflict](../../output/knowledge-growth/conflict-reconciled.png).
- [Sixth level](../../output/knowledge-growth/science-level-six.png), [long title at 390](../../output/knowledge-growth/long-source-390.png), [touch selection](../../output/knowledge-growth/touch-375.png), [touch investment](../../output/knowledge-growth/touch-invested-375.png), [844 landscape](../../output/knowledge-growth/touch-844.png), [larger DOM text](../../output/knowledge-growth/large-text-844.png).
- [Interaction recording](../../output/knowledge-growth/knowledge-flow.webm), `results.json`, `contrast-summary.json`, texture samples and final game-text states remain as local evidence.

## Handoff and limits

Completed: learning → point → permanent science/magic, completion/source/character entry, retries/concurrency and save compatibility. Preview-only: owner visual approval. Not implemented: tool requirements, spells/world effects, old XP/shard conversion, skills or HP/combat.

Unverified: physical Safari/iOS/Android, native browser-menu zoom and IME keyboard, production PostgreSQL concurrency/load. Touch and larger-text checks are browser emulation; deterministic clock tests do not claim multi-day physical-device operation.

Retain `http://127.0.0.1:5203/` (Vite PID **55793**, npm parent **55770**) and isolated backend `8035` (PID **55797**) for manual review. Enter 现实成长 → 今日研习 → 知识研修, or the character's science/magic entry. Prior 5201/8033 listeners are absent; this task did not stop them. Test process cleanup is verified separately below. No commit, push or deployment.

Cleanup verified: all owned feature/legacy/health/play-mode/frame runners and headless browser processes exited; scripts close browsers in finally. Both retained service health checks return 200; PID/start-time/parent/CWD/listener ownership checked. Seven existing shared Node tool hosts remain because ownership or use by other chats cannot be established; no broad kill or user browser closure. The Codex browser-opening request returned queued, so use the direct preview URL. Isolated fixtures/screenshots remain for review.
