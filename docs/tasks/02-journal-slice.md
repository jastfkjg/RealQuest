# Journal reference — visual checkpoint

## Scope and owner checkpoint

On 2026-10-10 the owner approved the actual satchel inventory (“这版背包可以”) and authorized the journal next: same materials and colors, a distinct notebook layout, existing data and interactions retained, then review. The journal delivered here remains a **candidate awaiting owner review**. Other dialogs and deferred inventory Pass B remain out of scope.

Plan completed: inspect actual quest/activity data and actions; build a shared journal with desktop index/detail and explicit phone back navigation; add an isolated development preview; verify real interactions, persistence and rendered screenshots; stop for visual review.

## Actual environment and data audit

- Started from owner commit `7539291` with a clean tree. Read root `AGENTS.md`, `DESIGN.md`, asset plan/manifest/checklist and the inventory task record. No nested instructions apply.
- React 19.3, Phaser 3.90, Vite 6.4.4 and TypeScript, existing npm lock and scripts. FastAPI / SQLAlchemy backend with `.venv` Python 3.14. Local Playwright 1.64. No engine/dependency changes.
- Reused existing isolated Vite **5187** and backend **8021**, backed by `output/inventory-pass-a/test.db`. No service restart, save deletion, schema migration or production database access. Browser mutation tests create their own guests and remove only their own guest through `/api/session`; before/after baseline evidence remains under `output/`.
- `backend/app/quests.py` defines six quests and the available/locked/active/ready/claimed status calculation. Objectives/checks, rewards, prerequisites and tracked quest come from server state. Existing `QuestList` is also used by the board and NPC dialogs.
- Previously the journal expanded every quest and every growth record in one scroll. It normally has no selected giver, so acceptance/claiming remain at the actual NPC/board, with server map/proximity checks. Navigation only marks a direction; it does not walk or teleport. Shared command queue, UUID retry behavior and authoritative reward transitions are unchanged.
- Activity kind, amount, date, note, XP, source and verification status come from `state.activities`. No invented dates, progress, possessions or completion states in the real view.

## Implemented flow and files

| Files | Change |
|---|---|
| `frontend/src/components/JournalView.tsx` | Pure reading view: left quest index, one right-hand detail page, checked objectives and actual completion count, existing reward icons; journey/completed/growth bookmark chapters. Growth entries grouped by their actual date. Phone selects an entry and has an explicit “返回目录” action with focus restoration. |
| `frontend/src/components/JournalPanel.tsx` | Adapter to authoritative store data, existing actions and scoped success/failure feedback. Growth entry opens the existing form. |
| `frontend/src/components/Quests.tsx` | Extracts existing actions into `QuestActions`, reused by the journal and unchanged board/NPC layouts. Journal marker labels clarify that they mark the giver/delivery destination. Pending tracking disables duplicate activation. |
| `frontend/src/game/questPresentation.ts`, `game/activities.ts`, `stores/game.ts` | Existing Chinese labels factored into pure modules for the isolated preview; store keeps its compatible re-export. |
| `frontend/src/journal.css`, `App.tsx`, `main.tsx` | Scoped Hearthwood book surface, spine, warm paper and cloth bookmarks. Shared modal focus behavior extended to journal; one feedback location. Layout can scroll for long text/small landscape; reduced motion respects OS and existing in-game preference. Other dialogs retain their styles. |
| `frontend/src/dev/JournalPreview.tsx`, `journal-fixtures.json` | DEV-only `/dev/journal`, using the same view and explicitly marked fixtures for starter, ready, completed, growth, long text and rejection/retry. Six task definitions copied from the audited backend for presentation fixtures only; never used for game rules. No API calls or localStorage writes. Production JS excludes fixtures. |
| `frontend/scripts/journal-{baseline,smoke,mutations,preview}.mjs`, `package.json` | Before capture and deterministic browser checks, with `test:journal` for the three regression scripts. Browser/context cleanup in `finally`. |
| `assets/generated/hearthwood/journal-spread-v1.{png,prompt.txt}`, `frontend/public/assets/hearthwood/journal-spread-v1.webp` | One original blank book material; no baked task text or controls. |
| `tools/build_inventory_skin.py`, `tools/audit_inventory_assets.py` | Reuse lossless packaging with an asset argument and the existing hash/pixel audit with an output argument. |
| `docs/art/{ASSET_PLAN.md,asset-manifest.json}`, `docs/tasks/{01-inventory-slice.md,02-journal-slice.md}`, `progress.md` | Actual approval boundary, generated source/provenance, implementation and evidence recorded. |

## Asset provenance

Built-in `image_gen` generated a blank spread using the previously generated, approved satchel shell only as material/palette reference. No vendor source was uploaded. The raw PNG and exact prompt stay outside the runtime bundle. Source is 1536×1024 RGBA, 2,052,312 bytes; runtime lossless WebP is 1,326,372 bytes. Decoded RGBA equality is asserted. Both hashes and alpha bounds are in the manifest.

Desktop nine-slice source cuts: top 220 / right 140 / bottom 260 / left 140 pixels; CSS edge depths 140 / 90 / 166 / 90. Phone reveals the right leaf of a double-width nine-slice with 90 / 60 / 166 / 60 edge depths. Fixing these depths resolved a real long-text defect where the footer had extended beyond the paper. Text is native DOM; existing 16px gold/seed icons render at 32 CSS pixels.

All original eight source samples and runtime hashes are unchanged; the full audit has 23 entries including satchel and journal surfaces. Kenney packs remain absent. No replacement world tiles, fonts, sound, crop assets or external packs were introduced.

## Evidence inspected

Evidence directory: `output/journal-reference/` (local, gitignored). Images were opened and inspected, not merely generated.

| Evidence | Result |
|---|---|
| `before-1440.png`, `before-390.png` | Old continuous card/list layout, captured before edits on an isolated guest. |
| `journal-1440.png`, `journal-390.png`, `journal-390-detail.png` | Actual gameplay UI. Desktop book spread; phone index/detail and readable rewards/actions. Real starter inventory stays gold 20 / seed 6, quests and XP unchanged by browsing. |
| `journal-768.png`, `journal-1920.png`, `journal-720.png` | Tablet, larger desktop and short landscape; no horizontal overflow. Vertical scroll is intentional in short viewports. |
| `journal-ready.png`, `journal-completed.png`, `journal-locked.png` | Actual completed objective checks, giver-only claim and completed chapter; prerequisite remains explicit. |
| `journal-growth.png`, `journal-growth-390.png`, `journal-growth-empty.png` | Real manual study record, date/note/25 XP/source/unverified provenance; honest empty chapter. |
| `journal-rejected.png`, `journal-pending.png`, `mutations-result.json` | Rejected tracking preserves state. Lost response retries the same request UUID; pending repeat activation sends no extra command. Inventory and XP unchanged by tracking. |
| `preview-*.png`, `preview-result.json` | Isolated visual fixtures including long phone entry. Final fixed-depth paper edges remain behind the action hint/footer. |
| `journal-result.json` | Five viewports, 44px controls, keyboard/focus, no movement leak, non-teleporting markers, reload and one canvas; emulated touch/DPR2 directory/detail/bookmarks. No unexpected console/page errors in layout run. |
| `asset-audit.json`, `asset-contact-sheet.png`, `game-client/shot-0.png`, `game-client/state-0.json` | Original hashes and generated pixels audited; short movement/idle frame client inspected with one canvas/listener and unchanged initial economy. |

## Commands and outcomes

Run frontend commands in `frontend/` and backend commands in `backend/`. Browser checks use `REALQUEST_URL=http://127.0.0.1:5187` (journal/inventory scripts default to it).

| Command | Outcome |
|---|---|
| `npm run build` | TypeScript/Vite pass; existing large Phaser chunk warning. Production JS searched and confirmed to exclude preview fixtures. |
| `.venv/bin/python -m pytest -q` | **21 passed**; existing Starlette/httpx deprecation warning. |
| `node scripts/journal-smoke.mjs` | Pass: real state unchanged, five viewports, minimum 44px visible controls, focus trap/restore, mobile return, modal movement ownership, marker semantics, reload, one canvas, emulated touch/DPR2. |
| `node scripts/journal-mutations.mjs` | Pass: enter home → gather → ready → board claim; gold 32 / XP 10 and no duplicate reward; board/NPC acceptance; tracked task rejection/pending/same-ID retry/reload; real growth recording and chapter display. |
| `node scripts/journal-preview.mjs` | Pass: six fixtures, pending/rejection/retry/success, long Chinese mobile scrolling; zero API calls, localStorage writes or page errors. |
| `npm run test:inventory` | Both existing browser suites pass: quantities, selections, quick slots, focus/IME, phone/touch, mode return, planting rejection/retry and persistence. |
| `REALQUEST_URL=http://127.0.0.1:5187 npm run test:play-mode` | Existing home/gather/cooldown/input reset/quest reward/persistence/growth/blur flow passes. |
| Cleanup-wrapped game skill client | `node node_modules/.cache/inventory-game-client.mjs --url http://127.0.0.1:5187 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":6},{"buttons":[],"frames":4}]}' --iterations 1 --pause-ms 250 --screenshot-dir ../output/journal-reference/game-client`; pass, screenshot/state inspected. |
| `tools/build_inventory_skin.py --asset journal-spread-v1` | Pass, lossless pixel equality, using bundled Python/Pillow runtime. |
| `tools/audit_inventory_assets.py --output output/journal-reference` | Pass, original hashes and both generated source/runtime pixel pairs; 23 entries. |
| `git diff --check` | Pass. No standalone lint script exists. |

## Review handoff and remaining gaps

- Review actual screenshots or use **http://127.0.0.1:5187 → 任务日志**. Isolated component examples: **http://127.0.0.1:5187/dev/journal**. No other dialog rollout until the next owner checkpoint.
- The generated surface is still about 1.33 MB lossless; broad asset optimization is outside this slice. Raw source is excluded from runtime assets.
- Real hardware touch, Safari and actual browser-menu zoom remain unverified. Chromium viewport reflow, DPR2 touch emulation, keyboard, focus and reduced motion were checked. This is not a blanket accessibility certification.
- Keep existing isolated 5187/8021 services for owner review; automated browser contexts/processes are closed. Do not stop other task services. No commit, push or deployment performed.
