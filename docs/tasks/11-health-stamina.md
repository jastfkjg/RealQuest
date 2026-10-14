# Health and stamina — one playable growth loop

Authorized 2026-10-14: implement the recommended exercise → health point → stamina capacity → gathering → rest/recovery slice, with a game-like page rather than a form/dashboard.

## Plan and composition

1. Extend authoritative rules and compatible saves; test daily rewards, association, spending, exhaustion and server-time recovery.
2. Build an expedition field journal: a quiet woodland/actual traveler vignette, one daily pledge on linen, and an investable health seal. Reuse Hearthwood tokens, existing artwork and accessible controls. Keep secondary recording/history progressively disclosed.
3. Connect real gathering, bedside rest, HUD and character entry; inspect browser states at 1440/1920/768/390/720 and touch 375/844, then run regressions.
4. Record evidence, remaining limits and exact process cleanup. No commit/push/deploy.

Visual thesis: a linen field journal beside a woodland trail, carrying one real promise and a tangible growth seal. Content: traveler/remaining stamina → today's pledge → recording or linking actual exercise → seal/capacity preview. Motion: journal entrance, selected pledge mark, server-confirmed reward seal; reduced-motion equivalent.

## Rule contract

- One immutable exercise pledge per server day (Asia/Shanghai), chosen duration 1–120 minutes; multiple same-day exercise records can complete it. One health point per completed daily pledge, never per submission. Linking existing manual records grants no additional XP. Older unfinished pledges remain readable and can accept records within the existing seven-day backfill window.
- Manual exercise remains self-reported, never verified. No automatic reward for opening the page, starting a pledge or missing a day. Legacy XP/energy/shards/unlocks remain intact; no retroactive balance conversion.
- Health point → +5 maximum and current stamina once; initial stamina 100. No HP/knowledge/skill spending in this slice.
- Successful wood/stone gathering costs 4/6. Failed actions spend nothing. Walk, talk and inventory remain usable at zero.
- Server time restores one stamina each 720 real seconds (5/hour), including offline, capped at capacity with fractional elapsed time preserved. Bedside sleep fills stamina without advancing crop time or calendar.
- Business identities for daily pledges/record IDs and expected investment revision supplement request receipts. All mutations reuse the existing transaction/locking boundary.

## Verification

Implementation and automated verification complete. Actual render is a candidate, not owner-approved. Existing production/user databases are not test fixtures.

## Implemented files

| Files | Outcome |
| --- | --- |
| `backend/app/rules.py` | Additive legacy-safe defaults, one pledge per day, record/link completion, health investment, lazy recovery, wood/stone costs and bed restoration. Old XP/resources/unlocks are unchanged. |
| `backend/app/main.py` | Server-clock stamina projection, exercise views and authoritative rules, point/investment/capacity deltas in receipts; existing locked transaction and session isolation reused. |
| `backend/tests/test_health.py` | Ten new parametrized/deterministic cases for daily deduplication, partial association, dates/source/XP cap, invalid requests, lazy recovery, full-cap no banking, clock reversal, investment races, gathering rollback, mining and credential restore. |
| `frontend/src/components/TrainingPage.tsx`, `frontend/src/training.css` | Woodland field journal, real daily pledge, partial manual recording, same-day linking, completion seal, explicit investment, date history, bed marker, native dialog/input/focus and responsive/reduced-motion states. |
| `frontend/src/components/StaminaBadge.tsx`, `frontend/src/game/stamina.ts` | Actual current/max stamina, server-anchored display recovery and direct journal entry. |
| `frontend/src/App.tsx`, `components/CharacterPanel.tsx`, `main.tsx`, `stores/game.ts`, `types.ts` | Life Mode/character/HUD entry, hash restoration and types. All other screen compositions and the original five-attribute dossier remain. |
| `frontend/src/game/interaction.ts`, `GameCanvas.tsx` | Actual gather cost/low-stamina reason, sleep label, effective stamina/health/task text-state output. No camera/world/art replacement. |
| `frontend/scripts/health-smoke.mjs`, `frontend/package.json` | Repeatable `test:health` workflow; independent test contexts, optional explicitly guarded isolated DB fixture, cleanup in finally. |
| `README.md`, `TODO.md`, `DESIGN.md`, `docs/game-design.md`, `docs/architecture.md`, art plan/checklist/manifest, `progress.md` | Current behavior, boundaries, artwork reuse, evidence and handoff. |

## Actual commands and outcomes

Environment: Node 22.23.2, Python 3.14.6, existing npm lock/dependencies; Vite 6.4.4, Phaser 3.90.0. Build and final feature checks use Node 22; one earlier npm-launched regression inherited host Node 25.9.0. No dependencies changed. All services bind loopback; backend uses only `output/health-stamina/test.db` and cookie `realquest_health_preview`.

| Command/check | Outcome |
| --- | --- |
| `cd backend && DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/health-stamina/test.db .venv/bin/alembic upgrade head` | Applied existing SQL migrations to a new isolated database only; no new SQL migration needed. |
| `cd backend && .venv/bin/python -m pytest -q` | **64 passed**; existing Starlette/httpx deprecation advisory remains. |
| `cd frontend && npm run build` | TypeScript and Vite pass; existing Phaser bundle-size advisory remains. |
| `REALQUEST_URL=http://127.0.0.1:5201 REALQUEST_TEST_DB=/Users/zilong/Developer/projects/RealQuest/output/health-stamina/test.db /Users/zilong/.nvm/versions/node/v22.23.2/bin/node frontend/scripts/health-smoke.mjs` | **Pass, 20 captures** on final production build. Actual UI pledge, partial record, Chinese network failure/retained input, committed response loss/retry, existing-record link/no duplicate XP or health, pending investment, reload, gather, bed rest, zero-stamina fixture, marker-only navigation/hash clearing, IME/world input/focus, landscape touch record/investment, long-title wrapping and reduced motion. |
| `cd frontend && REALQUEST_URL=http://127.0.0.1:5201 npm run test:play-mode` | Existing world interaction, cooldown, held-key, quest, reload, growth and blur regression passes. |
| `cd frontend && REALQUEST_URL=http://127.0.0.1:5201 npm run test:smoke` | Existing complete desktop and touch/portrait/landscape regression passes: four interiors, quests, storage, study timer, farming, economy and persistence. |
| `node output/health-stamina/contrast.mjs` | Six actual computed foreground/opaque-background state checks, 190 text runs, minimum **4.97:1**. Selected ordinal text corrected before final pass. |
| `node output/health-stamina/game-client.mjs --url http://127.0.0.1:5201 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":6},{"buttons":[],"frames":6}]}' --iterations 2 --pause-ms 250 --screenshot-dir output/health-stamina/game-client-final` | Skill frame client and text-state pass; only local module import and finally cleanup adapted. Final captures inspected. |
| Bundled Python `tools/audit_inventory_assets.py --output output/health-stamina` | All **31** existing source/runtime raster entries, source hashes and original UI/scene source checks pass. System Python lacks Pillow, so the existing bundled runtime was used. |
| `git diff --check` | Pass. |

First checks caught and corrected unstable full-stamina timestamps in read projections, mobile action position, a post-resize test camera timing race, focus/hash semantics and one low-contrast ordinal. Sandbox restrictions required approved local service/browser execution outside the sandbox. No automatic approval rejection occurred. Final browser console reports no unexpected errors; deliberately aborted network requests are explicitly scoped in the test.

## Inspected visual evidence

Actual production-build screenshots, all candidate renderings:

- [Daily pledge, 1440×900](../../output/health-stamina/pledge-1440.png), [1920×1080](../../output/health-stamina/pledge-1920.png), [768×1024](../../output/health-stamina/pledge-768.png), [390×844](../../output/health-stamina/pledge-390.png), [720×450 reflow](../../output/health-stamina/pledge-720.png).
- [Completed pledge and available point](../../output/health-stamina/completed-1440.png), [invested capacity](../../output/health-stamina/invested-1440.png), [phone completion](../../output/health-stamina/completed-390.png), [phone investment](../../output/health-stamina/cultivate-390.png).
- [Failed record](../../output/health-stamina/failed-record.png), [pending investment](../../output/health-stamina/pending-investment.png), [real gather](../../output/health-stamina/gather-1440.png), [bed rest](../../output/health-stamina/rested-1440.png), [zero-stamina isolated fixture](../../output/health-stamina/exhausted-1440.png).
- DPR2 emulated touch [375 portrait](../../output/health-stamina/touch-375.png), [844 landscape](../../output/health-stamina/touch-844.png), [larger DOM text](../../output/health-stamina/large-text-landscape.png).
- [Touch landscape investment](../../output/health-stamina/touch-invested-844.png), [long completed title and history at 390](../../output/health-stamina/long-title-390.png). Low-height 720 layout condenses the village column to expose the pledge choices immediately.
- [Desktop interaction recording](../../output/health-stamina/health-flow.webm); result JSON, contrast samples and game-client states live under the same ignored evidence directory. This is a new screen, so there is no pre-existing matched screen baseline.

No new image, font, audio, downloaded pack or purchase. The old generated village illustration is reused without editing source pixels; existing actor sprites and Lucide symbols remain. Only the additional CSS binding is recorded in the asset manifest.

## Remaining scope and handoff

Completed: the exercise → point → capacity → gathering → recovery chain and deterministic integrity tests. Preview-only: actual visual approval. Unverified: physical iOS/Android/Safari, native browser-menu zoom/IME keyboard, production PostgreSQL concurrency/load and multi-day device suspension. Time-based integrity is tested with deterministic server clocks, not a claim of waiting multiple real hours in a physical browser.

Deferred: pledge editing/general goals, exercise timers/imports, HP/combat, food, knowledge/skills, old-currency conversion, game calendar and tuning through player sessions. Existing manual exercise remains usable outside pledges. The daily pledge's immutable target and one-point budget are deliberate first-slice limits.

Manual preview retained at `http://127.0.0.1:5201/`: Vite production preview PID **52415**, npm parent **52392**, isolated backend `8033` PID **52429**. Both health checks pass; checked process start times, commands, CWD and listener ownership. The Codex browser-opening request returned **queued**, so the direct URL is supplied. Enter through the HUD stamina button or 现实成长 → 行前手札; preview save is separate from normal player data.

Original development server and previous backend PID 51947 exited. All owned health/capture/contrast/frame clients, regression runners and Chromium workers exited; scripts close in finally. Existing app-managed node_repl/Playwright hosts are preserved because ownership/use by other chats cannot be established from shared parent processes. No broad kill, user browser closure, user DB edits, commit, push or deployment. Isolated screenshots/fixtures remain as local review evidence.
