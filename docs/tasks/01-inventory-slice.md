# Task 01 — Inventory to Soil Reference Slice

## Outcome

Produce one believable Hearthwood inventory and a reliable seed-to-soil interaction. Do not redesign all screens. The visual direction is selected; do not reopen an unrestricted style search. The first rendered screen still needs owner signoff.

## Inspect first

Read the root guidance and asset plan. Identify the actual inventory model, item registry, quickbar, planting API, server transaction behavior, input ownership, and current sprite sources. Capture the current inventory with the same starter save used for the new reference. Do not change balances or seed quantities for appearance.

## Pass A: component and inventory reference

Create or reuse a development-only UI preview route, such as `/dev/ui`, gated from production. It should show the relevant button, slot, tooltip, selection, disabled, and pending states. Use the existing icon family and the supplied tokens. Audit the bundled source samples and import the selected Kenney UI pack only when its matching elements improve the chosen treatment. Do not render every available skin together.

Implement the inventory layout in DESIGN.md: compact header, quiet tray, clear occupied item, selected details, and an understandable quickbar. Reuse true quantities and capacity. Add a sparse starter fixture, a full fixture, a long-label fixture, and a rejected-action fixture in the development preview only.

Capture desktop 1440 x 900 and mobile 390 x 844. Evaluate icon size, contrast, focus, empty-slot emphasis, and primary action placement. Supply a brief comparison and stop at this visual checkpoint for owner approval before broad rollout.

## Pass B: complete the action chain after the checkpoint

1. Select the existing seed item.
2. Assign it to an existing quick slot without consuming inventory.
3. Close inventory and resume world input at the same position.
4. Select the quick slot and show a valid nearby planting target.
5. Confirm planting using the existing server contract.
6. Show a short pending state; block accidental duplicate activation.
7. On success, update the seed count and plot presentation together.
8. On rejection, retain or restore the correct inventory and explain the reason.
9. Reopen inventory, switch modes, and reload to verify the committed state.

If the existing game has no planting action, report that gap. Implement only the smallest compatible action needed after confirming scope; do not disguise a preview animation as persisted farming.

## Required tests

- Selection and quick binding do not consume items.
- Clicking, keyboard selection, and a touch alternative reach the same supported action.
- Empty/depleted items cannot be consumed; stale shortcuts remain truthful.
- Typing and IME input never move the player.
- Escape cancels targeting before closing an unrelated screen.
- Duplicate confirmation and retry after a timeout do not double-consume.
- A rejected request does not leave a false planted plot.
- Reopening and reload preserve actual quantities and plot state.

## Deliverables

Actual component changes; asset binding updates; recorded license/source metadata; screenshots at matched state; a short interaction capture when possible; exact check results; remaining limitations. Update the review checklist without pre-checking unexecuted tests.

## Out of scope

New crops, new currencies, drag-and-drop frameworks, equipment systems, full map rebuilding, global asset replacement, economic rebalancing, new AI agents, and engine migration.

## Initial Pass A candidate — 2026-10-10 (visual treatment superseded)

**Historical candidate:** engineering and browser checks below were completed, but the owner rejected the plain linen composition as too presentation-like. The owner subsequently approved the satchel concept and requested inventory implementation. See the current checkpoint below. Pass B and other screens remain deferred.

### Actual environment and audit

React 19.3.0, Phaser 3.90.0, Vite 6.4.4, TypeScript, Zustand and Playwright 1.64.0 are installed. npm and `package-lock.json` are the established frontend workflow; Python 3.14 / the existing backend `.venv` uses FastAPI, SQLAlchemy and Alembic. There is one existing migration (`001_initial.py`); no schema or rule change was made.

The server inventory is a dictionary of quantities. There are five non-currency IDs (`seed`, `wood`, `stone`, `crop`, `plank`) and no server capacity or maximum stack size. The prior 24 slots were presentation only. The candidate preserves 24 display cells and reports owned item types instead of asserting a 24-item capacity. A real starter save contains seed ×6, gold ×20, and zero of the other resources. No quantities were changed for presentation.

Quickbar preferences are the existing four unique IDs in `realquest-quick-items` localStorage. Assigning an already-bound item swaps positions. Bindings consume nothing; stale bindings remain visible as “暂无” in the inventory, with a zero quantity and disabled use/assignment. World quick buttons and keys 1–4 still open inventory on the selected item (phone details are an explicit subview); their labels now explain this. The existing `navigate` function sets a destination marker and closes the panel, without moving the player. The candidate says “标记” and explains that walking is manual.

Existing planting already checks map, proximity and resources on the server. Commands are serialized; SQLite uses `BEGIN IMMEDIATE`, PostgreSQL uses a player row lock, and receipts key an action by player/request ID plus payload fingerprint. A failed rule never commits the copied state. A network failure/timeout retries the same request ID. The candidate retains that path and shows pending, success and failure beside its action. The selected valid-plot targeting flow is still Pass B.

Assets: all 21 existing PNGs inventoried; the eight raw UI samples and six item icons visually inspected. All eight supplied hashes/blobs match. Existing icon bytes and IDs remain unchanged; Kenney files are not installed. See the manifest and the audit section in `docs/art/ASSET_PLAN.md`.

### Implemented files and flow

- `frontend/src/game/items.ts`: one presentation registry for existing IDs, Chinese names, meanings and actual icon paths. `stores/game.ts` re-exports names and rejects binding absent items, retaining the original storage key and swap behavior.
- `frontend/src/components/InventoryView.tsx`: shared buttons, item slots, selected details, wallet, tooltip and quickbar. Native DOM controls expose quantity, selection and binding. A 6×4 tray uses 60px cells; phones use four 56px columns and an explicit detail subview. Primary action and quick assignment precede long descriptive content on phones.
- `frontend/src/components/InventoryPanel.tsx`: real-store adapter for existing nearby planting, crafting, selling and destination marking. `RpgPanels.tsx` retains character UI; its old inventory implementation was moved, not duplicated.
- `frontend/src/App.tsx`: inventory-only theme, compact title/wallet line, modal Tab loop, unchanged native dialog dismissal/focus return, and truthful quick-button labels. Other screen treatments remain unchanged.
- `frontend/src/inventory.css`, `frontend/src/main.tsx`, `frontend/src/vite-env.d.ts`: import shared `styles/realquest-tokens.css`, scope the candidate to inventory, gate the dynamic preview import on `import.meta.env.DEV`.
- `frontend/src/dev/InventoryPreview.tsx`: `/dev/ui`, with sparse, full, long-label, rejected and depleted fixtures. Full means 24 repeated test stacks of existing art, clearly labeled; it does not invent production item types or a stack-splitting feature. Fixtures use local React state only. Pending/rejection/retry/success are visibly simulated; there are no API calls or preference writes.
- `frontend/scripts/inventory-{baseline,smoke,mutations,contrast}.mjs`, `frontend/package.json`: reproducible browser evidence and `test:inventory`. The existing `rpg-ui-smoke.mjs` selectors were updated for this layout and its accurate marker labels.
- `tools/audit_inventory_assets.py`, asset manifest, asset plan, this task record, checklist and `progress.md`: reproducible audit and evidence.

No backend implementation, schema, economy, world art, camera, other screen layout, dependency version or source image was changed. The pre-existing dirty tree was preserved. A concurrent owner commit became `f1f9fe5`; subsequent source/document deletions were restored from that commit only after the owner explicitly requested restoration. This work remains an uncommitted diff.

### Visual evidence and comparison

Artifacts are local and Git-ignored under `output/inventory-pass-a/`. Baseline and candidate use the **same isolated guest cookie**, name 林间旅人, appearance 0, position (240, 320), seed ×6, gold ×20, and unchanged camera. Production/user databases were never used.

| Evidence | Files | Result |
|---|---|---|
| Matched desktop 1440×900, DPR1 | `before-1440.png`, `after-1440.png` | Inspected. Single linen header, quieter 24-cell tray, 32px item icon, 48px detail icon, visible action. Previous dark tray, tiny support text, separate currency bar and duplicate item footer removed. |
| Matched phone 390×844, DPR1 | `before-390.png`, `after-390.png`, `after-390-details.png` | Inspected. Four columns; explicit tray/details views. Primary action and quick assignment are visible in the detail view; secondary text scrolls. No horizontal overflow. |
| Additional viewports | `after-1920.png`, `after-768.png`, `reflow-720.png` | Layout bounds checked; images inspected. 720×450 tests the effective layout viewport of 200% desktop zoom, not a physical browser-menu zoom test. |
| Focus and controls | `keyboard-focus.png`, `depleted-real.png`, `touch-hidpi-details.png` | Keyboard focus, stale binding, and emulated touch at DPR2. No action target below 44×44 in tested real inventory views. |
| Preview states | `preview-starter.png`, `preview-full.png`, `preview-long.png`, `preview-long-mobile.png`, `preview-rejected.png`, `preview-depleted.png`, `preview-pending.png`, `preview-tooltip.png`, `preview-component-states.png` | Inspected. Images are decoded before capture. Full fixture distinguishes all five existing icon silhouettes; long labels wrap. |
| Existing action regression | `real-rejected.png`, `real-pending.png`, `real-planted.png`, `mutations-result.json` | Injected rejection preserves resources; real server commit followed by lost response and automatic retry consumes exactly one seed. Mode return and reload preserve the plot. |
| Interaction recording | `recordings/` (latest `.webm`) | Desktop capture includes filters, keyboard assignment, focus, reopening and layout changes. |
| Audit and game loop | `asset-contact-sheet.png`, `asset-audit.json`, `game-client/shot-0.png`, `game-client/state-0.json` | Opened/inspected. Source hashes match; skill client exercises movement/frame stepping without browser errors. |

### Commands and results

Test services use `output/inventory-pass-a/test.db` exclusively:

```sh
# backend/
DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/inventory-pass-a/test.db .venv/bin/alembic upgrade head
DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/inventory-pass-a/test.db ALLOWED_ORIGINS=http://127.0.0.1:5187 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8021

# frontend/
REALQUEST_API_TARGET=http://127.0.0.1:8021 npm run dev -- --host 127.0.0.1 --port 5187 --strictPort
```

| Check | Outcome |
|---|---|
| `npm run build` | TypeScript + Vite pass. Existing large Phaser chunk warning remains. Preview fixture strings/code absent from production JS. |
| `backend/.venv/bin/python -m pytest -q` (from backend use `.venv/bin/python`) | 21 pass; existing Starlette/httpx deprecation warning. Tests create their own temporary DB. |
| `npm run test:inventory` | Final combined inventory + mutation run passed after all code changes. |
| `node scripts/inventory-smoke.mjs` | Pass: same-save quantities/position, selection, filters, keyboard/touch binding without consumption, reload, depleted shortcuts, focus loop/return, IME/input isolation, mode return, marker semantics, four viewport bounds, effective reflow, DPR2, reduced motion and preview isolation. `result.json`: zero unexpected console/page errors or failed requests. |
| `node scripts/inventory-mutations.mjs` | Pass: injected 422, pending duplicate prevention, one committed plant despite lost response, same-ID retry, mode return and reload. |
| `node scripts/inventory-contrast.mjs` | 44 rendered text samples pass 4.5:1; minimum 4.97:1 against actual opaque UI backgrounds. This is scoped evidence, not a complete WCAG certification. |
| `REALQUEST_URL=http://127.0.0.1:5187 npm run test:play-mode` | Pass: movement, range gating, gathering, held-key reset, blur recovery, reward and save restoration. |
| `REALQUEST_URL=http://127.0.0.1:5187 npm run test:rpg-ui` | Pass: existing real crafting, planting, maturation, harvest, sale, growth, persistence and six viewport layouts. |
| Required game skill client | Ran the bundled `web_game_playwright_client.js` from a dependency-resolving copy in `node_modules/.cache/inventory-game-client.mjs`; only added `finally` cleanup. `--click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":6},{"buttons":[],"frames":4}]}' --iterations 1 --pause-ms 250`. Pass, output in `game-client/`. |
| `tools/audit_inventory_assets.py` with bundled Python/Pillow | Pass: eight source hashes and Git blobs, all 21 PNG dimensions/bounds/hashes. No source image writes. |
| `git diff --check` | Pass. No standalone lint script exists. |

### Checkpoint and gaps

- **Candidate only:** owner approval is not yet obtained. Do not propagate this treatment to character, map, journal, creation or Life screens.
- **Pass B deferred:** numeric shortcuts still open inventory on the selected item; there is no selected-item planting target/confirmation overlay or Escape-to-cancel targeting chain. Existing planting actions remain usable and were regression-tested.
- **Preserved world:** no camera or world scale adjustment. The existing close-up world, procedural farm stages and saturated wood icon are retained rather than certified as a new accepted world baseline.
- **Unverified:** real touch hardware/Safari and an actual browser-menu zoom operation. Emulated Chromium touch/DPR2 and an equivalent narrow layout were tested. No audio pack was imported or auditioned.
- **Production isolation:** `/dev/ui` fixtures are excluded by the production build; that pathname falls through to the ordinary game, not a preview. The preview has no API/persistence calls.
- **Preview handoff:** retain only the task's isolated services on 5187/8021 for owner review. All test browsers/contexts are closed in `finally`; process inspection confirmed no task Playwright scripts or Chromium headless processes remain. No automation tab is retained. Preview listeners are backend PID 98418 and Vite PID 98454. Stop these two services when the review is finished, preserving the isolated test evidence and user data.

## Current checkpoint — satchel candidate, 2026-10-10

**Concept approved; actual browser implementation ready for owner review. Stop before other dialogs or Pass B.**

The owner explicitly approved [the satchel preview](../art/references/inventory-satchel-concept.png) and requested implementation of the bag, item tag and quick pockets while preserving actual quantities and interactions. This iteration replaces the initial plain linen presentation with a cloth shell and detached tag. It does not adopt the concept image's invented background details.

### Changed implementation

- `frontend/src/inventory.css`: inventory-only transparent dialog, moss cloth silhouette, stitched linen tray, timber nameplate, selected brackets/pointer, detached content-sized item tag and sewn pocket roll. Six columns of 64px slots on desktop; four 56px columns at 390px. Mobile uses an explicit detail subview. Short opening/selection/press feedback respects reduced-motion preferences.
- `frontend/src/components/InventoryView.tsx`: live 48px item art, real count badges, concise item summary, native keyboard-accessible uses/source disclosure, pocket contents and stored references exposed through accessible labels. Empty pockets show no fabricated possession. Gold is always shown; earned special resources/large balances get a separate label row without overlapping the title. Existing assignment and swap callbacks are unchanged.
- `frontend/src/game/items.ts`: short localized purposes added to the existing five item definitions. No IDs, source art, recipe, quantity or progression change.
- `frontend/src/App.tsx`: the inventory's existing Tab loop now includes disclosure summaries. Other dialog rendering and world quickbar behavior are unchanged.
- `frontend/src/dev/InventoryPreview.tsx`: same isolated fixtures plus high balances/earned resource stress in the full fixture. All such quantities are preview-only. Screenshot capture includes the full fixture page; the fixture route remains excluded from production JS.
- `frontend/scripts/inventory-{smoke,contrast,mutations}.mjs` and `rpg-ui-smoke.mjs`: new artifact directory, disclosure keyboard and quantity invariance, visibly unobscured currency, long-balance mobile placement, and adjusted detail selectors. Existing focus, binding, input, persistence and transaction regression checks retained.
- `assets/generated/hearthwood/`, `frontend/public/assets/hearthwood/satchel-shell-v1.webp`, `tools/build_inventory_skin.py`, `tools/audit_inventory_assets.py`, `docs/art/references/inventory-satchel-concept.png`: one original textless generated shell and its reproducible lossless packaging/audit. See the [asset provenance](../art/ASSET_PLAN.md#9-approved-satchel-direction--implementation-candidate) and [exact built-in image_gen prompt](../../assets/generated/hearthwood/satchel-shell-v1.prompt.txt). Raw PNG: 1254×1254, 2,170,323 bytes; runtime WebP: 1,414,574 bytes. Decoded RGBA pixels are identical. All original 21 PNG hashes and eight source Git blobs still match; no pack was acquired.
- `DESIGN.md`, asset plan/manifest, checklist, this record and `progress.md` distinguish approved concept from actual candidate. No backend code, database schema, player save, rule, engine, world/camera or other screen was changed. Diff remains uncommitted over `f1f9fe5`.

### Final visual evidence

Same isolated guest as the initial before/after: 林间旅人, appearance 0, position (240,320), seed ×6, gold ×20. Session metadata remains Git-ignored. No actual user's database was used. Artifacts: `output/inventory-satchel/`.

| Evidence | Result |
|---|---|
| `after-1440.png`, `after-390.png`, `after-390-details.png` | Final browser images opened and inspected. Bag silhouette, pointer, count, sewn pockets and independent tag visible. Phone actions and all tested buttons meet 44px minimum; no horizontal overflow. |
| `after-1920.png`, `after-768.png`, `reflow-720.png`, `touch-hidpi-details.png` | Bounds, narrow landscape, 200%-equivalent layout and emulated touch/DPR2 checked. No claim of physical-device testing. |
| `preview-{starter,full,full-mobile,long,long-mobile,pending,rejected,depleted,tooltip,component-states}.png` | Isolated visual fixtures, including full 24 repeated existing-art stacks, six-digit quantities, multi-resource wallet and long Chinese names. Key final images opened and inspected. |
| `real-rejected.png`, `real-pending.png`, `real-planted.png`, `mutations-result.json` | Rejection preserves seed 6; lost response + same-ID retry commits one plot and leaves seed 5. Mode switching/reload retain it. |
| `inventory-interaction.webm` | Latest desktop selection, keyboard, pocket assignment, reopening and viewport capture. Browsers closed in `finally`. |
| `asset-audit.json`, `asset-contact-sheet.png`, `game-client/shot-0.png`, `game-client/state-0.json` | 22 audited entries including the generated runtime image; preserved originals verified. Frame-client image and text state inspected. |

Inspection found and fixed a briefly obscured coin label during header refinement. The smoke test now checks that the label's center is actually visible via hit-testing. The final count and coin label were visually rechecked.

### Checks executed in this iteration

Reuse the isolated 5187 frontend / 8021 backend and `output/inventory-pass-a/test.db` commands above. The first attempted restart found those services already running; no replacement service or database was created.

| Command | Outcome |
|---|---|
| `npm run build` (frontend) | TypeScript/Vite pass after final UI changes. Existing Phaser >500kB warning remains. Production JS checked: no preview fixture strings. |
| `.venv/bin/python -m pytest -q` (backend) | 21 passed; existing Starlette/httpx deprecation warning. |
| `node scripts/inventory-smoke.mjs` (frontend) | Final pass: real state, selection, disclosures, filters, keyboard/touch assignment, reload, zero-count references, focus/IME, mode return, non-teleporting markers, viewport bounds, unobscured currency, high balances and fixture isolation. `result.json` has zero unexpected console/page errors or failed requests. |
| `node scripts/inventory-mutations.mjs` (frontend) | Pass: 422 rejection, disabled pending action, duplicate prevention, lost-response same-ID retry with one consumption, reload/mode persistence. |
| `node scripts/inventory-contrast.mjs` (frontend) | 21 visible text samples pass 4.5:1; minimum 5.37:1 against their computed opaque base colors. Hidden/screen-reader-only text excluded. This is scoped text-color evidence, not a blanket accessibility certification or per-texture-pixel contrast claim. |
| `REALQUEST_URL=http://127.0.0.1:5187 npm run test:rpg-ui` | Pass: real crafting, planting, maturation, harvest, sale, growth, persistence and six viewport layouts. Evidence remains in that script's established `output/rpg-polish/` directory. |
| Required game skill client | Existing cleanup-wrapped copy `node_modules/.cache/inventory-game-client.mjs` run with `--click-selector '#start-btn'`, short right/idle frame burst, one iteration and 250ms pause. No page errors; screenshot/state saved and inspected. |
| `tools/build_inventory_skin.py` using bundled Python/Pillow | Lossless packaging pass; unchanged RGBA pixels. |
| `tools/audit_inventory_assets.py` using bundled Python/Pillow | All original source/runtime hashes plus generated source/runtime equality pass; 22 audit entries. |
| `git diff --check` | Pass. No standalone lint script exists. |

### Handoff and limits

- Candidate actual render awaits owner review. Do not roll out other dialogs yet. Pass B adjacent-plot target preview/confirmation remains deferred; numeric shortcuts still open inventory and existing nearby planting remains usable.
- No new crop art, world art, font or sound. The one generated shell is original material, not an acquired pack. It is still approximately 1.4 MB lossless; no broad asset pipeline optimization was attempted.
- Physical touch hardware/Safari and actual browser-menu zoom remain unverified; Chromium emulation and equivalent reflow are checked.
- Retain the existing isolated services on **5187 / 8021** for owner preview (Vite PID 98454, backend PID 98418). All task automation contexts/browsers have closed; process inspection confirms no Playwright/Chromium test processes remain. Other tasks' services were left alone. Stop only these two preview services after review is finished.

### Owner checkpoint — 2026-10-10

The owner explicitly approved the actual inventory: “这版背包可以”. Journal implementation was authorized next, with a distinct notebook layout and its own visual review. This supersedes the pending inventory approval above; it does not authorize other screens or the deferred planting targeting flow. See `02-journal-slice.md`.
