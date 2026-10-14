# Character dossier with point allocation — 2026-10-14

Owner approved `docs/art/references/character-points-concept-v1.png` and requested implementation. The reference uses example values; the actual dossier reads the authoritative save. Existing uncommitted NPC commission work is preserved.

Plan: extend JSON saves with vitality and three skill levels; compose the approved dossier using existing material/portrait and DOM text; use server quotes and transactional spending; verify isolated fixtures, retries, persistence, keyboard/touch layouts and screenshots.

Visual thesis: one moss-cloth field record, compact identity/resources, growth rows on the left, points and one selected purchase on the right. Content: identity → current/max resources → paths and wallet → upgrade. Motion: panel entry, row feedback and meter transition; reduced motion disables transitions.

## Rules and scope

- Vitality starts at 100/100; planting/ranching/building levels start at 0. Missing fields are added lazily, without converting or deleting existing XP, points, inventory, quests or buildings.
- Health: select vitality or stamina; 1 health point increases its maximum and current value by 5. Existing stamina-only callers remain compatible.
- Science/magic: preserve 1 knowledge point per level. Skills: upgrading to level N costs N skill points (1, 2, 3, …), independently for each skill. Point rewards still come from NPC commissions.
- Server quotes and expected-investment guards plus the existing transaction lock/request receipts prevent double spending. The dossier has no EXP progression.
- Combat/damage, ranching gameplay, skill production bonuses and knowledge tools/spells remain outside scope. UI explicitly describes unimplemented effects. Legacy world EXP gates remain compatible.
- No new runtime raster/font/dependency. Existing dossier WebP, player sprite, tokens and Lucide icons reused. Approved reference is outside the runtime bundle.

## Verification and handoff

Implemented and verified in Chromium. The concept is owner-approved; final browser rendering awaits owner review. Test data and evidence live only under `output/character-points/`.


## Changed files

- `frontend/src/components/CharacterView.tsx`, `CharacterPanel.tsx`, `character.css`: the resource/point dossier, server-backed selection and spending, localized pending/error/success and insufficient-point states. Phone places balances above the rows and moves focus to selected upgrade details; all controls are at least 44 CSS pixels.
- `frontend/src/dev/CharacterPreview.tsx`: clearly labeled, API-free starter/example/long-name fixtures, excluded from production.
- `backend/app/rules.py`, `main.py`, `frontend/src/types.ts`, `game/GameCanvas.tsx`: additive vitality/skill fields, server quotes, health-target and skill commands, receipt deltas and text-state inspection.
- `frontend/src/App.tsx`: only the dossier's duplicate global error/notice excluded; local feedback remains beside the action. Existing modal focus/escape lifecycle reused.
- `backend/tests/test_character_points.py`, `frontend/scripts/character-points.mjs`, `character-points-contrast.mjs`, `frontend/package.json`: economic/compatibility tests and the replacement `test:character` flow.
- Design, README, rules/architecture, asset plan/manifest, approved concept PNG/prompt, review checklist and progress notes updated. All unrelated NPC commission changes remain intact.

## Commands and results

- `cd backend && .venv/bin/python -m pytest -q`: **108 passed**. Includes additive/idempotent legacy migration, per-branch increasing prices, insufficient funds/invalid input, health target separation, concurrent spending, receipt replay and credential restoration. Existing Starlette/httpx deprecation warning only.
- `npm --prefix frontend run build`: **passed**, TypeScript and Vite production build; existing Phaser chunk-size warning. Installed Phaser remains 3.90.x, React 19 and the existing npm lockfile unchanged.
- Isolated migration: `DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/character-points/test.db .venv/bin/alembic upgrade head` in backend: **passed**. No schema migration added and no user database accessed.
- `REALQUEST_URL=http://127.0.0.1:5207 REALQUEST_TEST_DB=/Users/zilong/Developer/projects/RealQuest/output/character-points/test.db npm --prefix frontend run test:character`: equivalent script run passed against the fixed production build, **15 screenshots, no unexpected console/page errors**. Validated free selection, resource purchases, all displayed knowledge/skill selection, rejection rollback, pending lock, lost-response replay, stale cross-tab synchronization, reload, mode switch, retained legacy XP/inventory, keyboard focus/escape, touch and reduced motion.
- `REALQUEST_URL=http://127.0.0.1:5207 node frontend/scripts/play-mode-smoke.mjs`: **passed**, existing movement, approach/gather, cooldown, held keys, quest reward, restore, Life history and blur checks.
- Develop-web-game frame client ran with its original behavior and a task-local finally/close wrapper: right for 6 frames, release for 4, one iteration. **Passed**, text-state and screenshot under `frame-loop/`, no error artifact. Temporary runner removed after completion.
- `node frontend/scripts/character-points-contrast.mjs` and bundled Python `tools/check_character_contrast.py --output output/character-points`: **77 visible text runs, minimum 4.97:1** over the actual textured starter view. Screen-reader-only title correctly excluded from visual samples. This is a captured-state check, not a blanket accessibility certification.
- Bundled Python `tools/audit_inventory_assets.py --output output/character-points/asset-audit`: **31 existing images verified**, source/runtime hashes and generated pixel equality intact. No runtime image/font additions.
- `git diff --check`: **passed**.

## Visual evidence

`output/character-points/` contains `profile-{1440,1920,768,390,720}.png`, `profile-390-upgrade.png`, `starter-1440.png`, `purchase-{rejected,pending,saved}.png`, `stale-state-synced.png`, `final-1440.png`, `large-text-1440.png`, `touch-375.png`, `touch-upgrade-saved.png`, recordings and `result.json`. The profile captures use explicit isolated test balances/levels matching the approved reference. Actual initial saves have zero unallocated points. Final desktop, tablet, phone and touch purchase captures were opened and visually inspected; narrow paper-edge spacing and footer contrast were corrected.

Remaining limits: physical Safari/iOS/Android and native browser-menu zoom unverified; emulated touch/DPR2, large DOM text, responsive reflow and reduced motion verified. No combat/damage or skill output effects added. No commit/push/deploy or real-player data mutation.

## Cleanup and manual preview

Automation contexts/browsers close in finally; completed test runners and temporary layout/frame scripts are removed. The development Vite server was stopped and replaced by a fixed production preview using `output/character-points/build`. Only the task's isolated frontend at **http://127.0.0.1:5207/** and backend **8039** remain for manual review, with cookie `realquest_character_points`; health endpoints pass. Shared app node_repl/MCP hosts and the other task's 5205/8037 preview remain untouched because they are not owned by this task. No broad process termination.
