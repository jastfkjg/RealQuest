# Noah commission board — 2026-10-14

Owner approved the generated wood-board/riverbank concept and requested implementation: “可以，就按这版预览图实现。” Scope is Noah's existing commission conversation, including its story topic and active/settled/cancelled/quota states. Other NPCs and the growth journal keep their current layout.

## Plan

1. Reuse the current authoritative commission actions and selection state. Compose a compact wooden board, riverside character stage, paper tabs, task slips, hour tokens and one reward/action area.
2. Package two original textless materials from the approved reference; preserve the existing Noah sprite. All Chinese text and controls remain DOM. Shared Hearthwood palette, readable fonts, focus and reduced motion apply.
3. Verify production build, task rules, real browser selection/acceptance/settlement/cancellation/retry, story topic, keyboard and responsive layouts on an isolated database. Inspect actual screenshots, record commands/evidence, and clean owned tools.

Visual thesis: warm timber around a calm paper commission, with Noah present in a small riverside scene.
Content order: topic and quota → task type → hours → exact reward → accept; expanded rules are secondary.
Interaction: short board entrance, pressed wood tokens and a selected paper-slip marker; reduced motion removes transitions.

Status: implemented and browser-verified candidate. Concept approved; actual browser render awaits owner acceptance.

## Implemented result and files

- `frontend/src/components/WorldPanels.tsx`: Noah-only timber board, separate riverside actor stage and paper conversation; existing story request remains available. Actual relationship and commission state drive the identity text. Other NPC layouts are preserved.
- `frontend/src/components/LifeQuests.tsx`: retained accept/claim/cancel actions, task IDs, reconciliation and countdown; paper task slips, hour tokens, exact reward preview, expandable rules and readable pending/receipt/quota states. Existing history uses the same extracted quota renderer and keeps its layout.
- `frontend/src/components/CommissionIcon.tsx`, `commission-board.css`: original integer-grid book/boots/hammer, shared Hearthwood tokens, scoped wood/paper states, 44px controls, visible focus and reduced motion. Phone uses a compact identity strip; short landscape scrolls while the close control stays visible.
- `frontend/src/App.tsx`, `main.tsx`: Noah's accessible modal title and the scoped stylesheet import.
- `frontend/scripts/life-commissions-smoke.mjs`: current acceptance label, configurable output location, rules/Escape, tab wrap, story, 375px and short-landscape scrolling checks. Retains authoritative failure/lost-response/cancellation/settlement/quota/touch coverage.
- `tools/build_inventory_skin.py`, source/runtime artwork, reference/prompt and `docs/art/asset-manifest.json`: two new textless materials and reproducible lossless packaging; actor/world/source packs unchanged. Runtime additions total 2,756,642 bytes. No new font, audio, external pack or paid asset.
- `DESIGN.md`, `docs/art/ASSET_PLAN.md`, `REVIEW_CHECKLIST.md`, `progress.md`: scoped contract, provenance, verification and handoff.

Backend rules, migrations and user databases were not changed. Acceptance/settlement still require Noah proximity; one active task, one point/hour, daily five-point quota, reservation/cancellation and acceptance-day settlement remain server-authoritative. The backdrop is an illustration, not a new traversable map. All controls/text are DOM.

## Verification

Environment: existing npm lock/dependencies, React/TypeScript, Phaser 3.90, Vite 6.4.4 and Python 3.14 virtual environment. Only isolated `output/life-commissions/board-ui/test.db` was used, with unique cookie `realquest_commission_board`. Existing migrations were applied there from the backend working directory.

| Command/check | Actual outcome |
| --- | --- |
| `npm --prefix frontend run build -- --outDir /Users/zilong/Developer/projects/RealQuest/output/commission-board/build` | TypeScript/Vite pass; existing Phaser chunk-size advisory. Fixed production build served for final checks. |
| `cd backend && .venv/bin/python -m pytest -q tests/test_life_tasks.py` | 19 passed; existing Starlette/httpx deprecation advisory. |
| `REALQUEST_URL=http://127.0.0.1:5209 REALQUEST_TEST_DB=/Users/zilong/Developer/projects/RealQuest/output/life-commissions/board-ui/test.db REALQUEST_TEST_OUTPUT=../../output/commission-board/ node frontend/scripts/life-commissions-smoke.mjs` | Final production run passes: 30 screenshots, zero unexpected console/page errors. Covers selection, rejected/lost acceptance response, early settlement rejection, cancellation/Escape, persistence, real rewards/quota, story, expanded rules, focus wrap and DPR2 touch. |
| Computed DOM contrast in feature suite | 28 cases / 828 text runs, minimum 4.97:1. This checks foreground and composed CSS background colors; it is not a claim of a per-pixel artwork contrast audit. |
| `REALQUEST_URL=http://127.0.0.1:5209 node frontend/scripts/play-mode-smoke.mjs` | Pass: movement/approach/range, entering, gathering/cooldown, held-key clearing, story rewards, save restore, history ownership and blur recovery. |
| `node output/life-commissions/game-client.mjs --url http://127.0.0.1:5209 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":6},{"buttons":[],"frames":6}]}' --iterations 2 --pause-ms 250 --screenshot-dir output/commission-board/game-client` | Skill frame client passes using existing local-import/finally-cleanup wrapper. Screenshots and text snapshots inspected; no error files. |
| Bundled Python `tools/audit_inventory_assets.py --output output/commission-board/assets` | Pass: 33 images, preserved hashes, generated source/runtime pixel equality and original SVG source hash. |
| `git diff --check` | Pass. |

Actual screenshots inspected at 1440×900, 1920×1080, 768×1024, 390×844, 375×812 and 720×450; DPR2 touch 375×812/844×390, reduced motion and larger journal text exercised. Primary acceptance fits phone portrait; short-landscape scrolling keeps close visible. The story reveal control's small hit target was corrected within Noah's scope. Main evidence: `output/commission-board/choices-1440.png`, `choices-390.png`, `choices-375.png`, `choices-768.png`, `choices-720-scrolled.png`, `active-1440.png`, `active-390.png`, `ready.png`, `claimed-two.png`, `daily-cap.png`, `story-1440.png`, `rules-open-1440.png`, `result.json`, `recordings/` and `game-client/`.

Settlement maturity fixtures only adjust the dedicated test guests' task timestamps in that isolated DB. No clock override, reward fabrication or test backdoor was added to application code. Physical Safari/iOS/Android, native browser-menu zoom and multi-hour real-time endurance remain unverified. No production deployment, commit or push.

## Handoff and cleanup

- Retained for owner manual review: http://127.0.0.1:5209 (npm 76699 / Vite 76722, child esbuild 76725) with isolated API8041 (PID76440). Working directories, start time, arguments and listeners verified. Frontend `/api/health` returns `{"status":"ok"}`.
- Initial dev session76093 exited normally; final production server uses session16784 and API session92543. Test runners completed; their browser contexts/Chromium instances close in `finally`. Final process inspection confirms no task smoke/frame runner or headless Chromium remains.
- Shared application `node_repl`, CUA and Playwright MCP hosts predate this implementation and cannot be assigned safely to this completed task; preserved. Editor processes also preserved. No broad process kill or user browser closure.
- An interrupted final-test dispatch hit an automatic approval-review deadline before launch. Retried once after the owner requested continuation; both final commands ran successfully. Nothing remains blocked by approval review.
