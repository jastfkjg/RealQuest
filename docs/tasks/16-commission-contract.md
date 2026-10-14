# Noah active commission contract — 2026-10-14

Owner approved the second preview: “可以，按此进行实现”. The existing active-task right pane feels like a data display; replace it with a signed parchment contract, hourglass, status ribbon and sealed reward tag. Scope is Noah's active and ready-to-settle commission states, plus the matching dialogue. Existing selection/history/other NPCs and authoritative rules remain intact.

## Plan

1. Package a blank transparent scroll and empty hourglass frame from the approved concept. Preserve all Chinese text, timer, reward and controls as DOM. Dynamic sand reflects server-derived elapsed time; no fake activity verification.
2. Compose an active contract on the existing wood board/cloth backing. Waiting primary action closes the dialog; at the deadline it becomes the real settlement action. Preserve cancellation confirmation, rules, retry and focus ownership.
3. Verify production build, commission rules, waiting → close/reopen/reload → due → rejected/retried settlement, cancellation, story switching and responsive keyboard/touch layouts on isolated data. Inspect screenshots and clean owned tools.

Visual thesis: a warm, quiet signed promise with one tactile hourglass, on moss cloth and timber.
Content order: topic/quota → promise title → hourglass/time note → sealed reward → close or settle; rules secondary.
Interaction: restrained sand trickle, status change when due and short wood-button press; reduced motion stops the trickle.

Status: implemented and browser-verified candidate. Generated concept approved; actual runtime acceptance pending.

## Implemented files and behavior

- `frontend/src/components/LifeQuests.tsx`: active/ready contract branch with promise title, quiet native timer, status ribbon, pending reward and signature. Waiting primary action only closes the dialog; due state invokes the original `life_claim` action. Shared cancellation/rules preserve confirmation, Escape, focus and authoritative reconciliation. History keeps its existing countdown.
- `frontend/src/components/ContractHourglass.tsx`: unmodified empty raster frame over original clipped SVG sand. Clamped remaining/total server time drives sand level; the trickle stops at the deadline or with reduced motion. The decorative sand is not a second timer or proof of real work. Native timer uses `aria-live=off`; the readiness ribbon announces a meaningful state change.
- `frontend/src/components/WorldPanels.tsx`, `commission-contract.css`, `main.tsx`: active-only cloth/scroll composition, matching Noah dialogue, scoped responsive layout and stylesheet import. Selection/history/story/other NPC structures remain. Redundant acceptance notice is hidden while the contract shows acceptance; errors remain available.
- `frontend/scripts/life-commissions-smoke.mjs`: waiting close/reopen, midpoint sand, automatic due transition, rejected/retried settlement, active viewport/rules-scroll captures and optional actual-texture contrast via `REALQUEST_IMAGE_PYTHON`. Existing early rejection, duplicate rewards, cancellation, quota, keyboard and touch tests remain.
- New reference/source/prompts/runtime materials plus `tools/build_inventory_skin.py`, manifest, `DESIGN.md`, asset plan, checklist and progress record capture the direction and provenance. Existing board assets and prior uncommitted work are preserved.

All task types and 1–5 hours use real state. Ready still means only the deadline has elapsed. The existing server requires Noah proximity, enforces the daily cap, and owns reward/cancellation/idempotency. No backend, save schema, original player data, world geometry, font or dependency changes.

## Assets and provenance

Built-in `image_gen` generated `assets/generated/hearthwood/commission-scroll-v1.png` and `commission-hourglass-v1.png` using the approved project-generated concept as reference. Exact `.prompt.txt` files are adjacent. Both sources are RGBA with genuine transparency; the empty glass center is mostly transparent. Runtime `frontend/public/assets/hearthwood/commission-{scroll,hourglass}-v1.webp` totals 2,605,194 bytes. Existing packaging uses `lossless=True, exact=True, method=6` and asserts decoded RGBA equality. No artwork cropping, recoloring, background removal or resampling. The original sand geometry, source hashes, measured nine-slice values and dimensions are in `docs/art/asset-manifest.json`.

## Verification

Existing React/TypeScript/npm lockfile, Phaser3.90, Vite6.4.4 and backend Python3.14 reused. Fixed production preview uses only `output/life-commissions/board-ui/test.db` and cookie `realquest_commission_board`; fixtures modify only freshly created test guest IDs. No real user save reset.

| Command/check | Outcome |
| --- | --- |
| `npm --prefix frontend run build -- --outDir /Users/zilong/Developer/projects/RealQuest/output/commission-contract/build` | TypeScript/Vite pass; existing Phaser chunk-size advisory. |
| `cd backend && .venv/bin/python -m pytest -q tests/test_life_tasks.py` | 19 passed; existing Starlette/httpx deprecation advisory. |
| `REALQUEST_URL=http://127.0.0.1:5209 REALQUEST_TEST_DB=/Users/zilong/Developer/projects/RealQuest/output/life-commissions/board-ui/test.db REALQUEST_TEST_OUTPUT=../../output/commission-contract/ REALQUEST_IMAGE_PYTHON=<bundled Python with Pillow> node frontend/scripts/life-commissions-smoke.mjs` | Final pass:39 captures, no unexpected console/page errors. Includes close/reopen without cancellation, midpoint sand/reload, real waiting-to-due transition, rejected settlement and successful retry, no duplicate rewards, cancellation/Escape, quotas, story, focus and DPR2 touch. |
| Visible foreground/computed background checks | 37 cases /937 text runs /minimum4.51:1. Image-backed scroll text is measured separately. |
| Actual text-range/background-pixel audit via `tools/check_character_contrast.py` | 12 contract cases /262 visible text runs /minimum4.75:1. Samples actual paper/cloth pixels after hiding text; respects the dialog clipping viewport and separately captures scrolled rules. Fixed low-contrast wooden-footer links and phone ribbon edges. |
| `REALQUEST_URL=http://127.0.0.1:5209 node frontend/scripts/play-mode-smoke.mjs` | Pass: approach/range, enter, gathering, held keys, story rewards, persistence, history ownership and blur recovery. |
| `node output/life-commissions/game-client.mjs --url http://127.0.0.1:5209 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":6},{"buttons":[],"frames":6}]}' --iterations 2 --pause-ms 250 --screenshot-dir output/commission-contract/game-client` | Pass using the existing cleanup wrapper around the skill frame client. Images/text snapshots inspected, no error files. |
| Bundled Python `tools/audit_inventory_assets.py --output output/commission-contract/assets` | Pass:35 image/source checks, preserved hashes and exact generated runtime RGBA. |
| `node output/commission-contract/inspect-hourglass.mjs` | Separate one-hour work guest: actual desktop/phone frame/sand dimensions, reduced-motion stop and125% computed-text enlargement with no horizontal overflow. Screenshots inspected. |
| `git diff --check` | Pass. |

Actual changed screen inspected at1440×900,1920×1080,768×1024,390×844,375×812 and720×450, including scroll-to-action. DPR2 touch settlement/cancellation runs in the feature suite. Key artifacts: `output/commission-contract/{contract-work-1440,contract-work-390,contract-large-text-390,active-1440,active-375,active-half-1440,ready,settlement-rejected,active-rules-scrolled-1440}.png`, `result.json`, `contrast-*/`, `recordings/` and `game-client/`.

Fixture disclosure: test-only timestamps are adjusted in that isolated DB to exercise half-time and a real three-second deadline without waiting hours. Application code has no clock override/backdoor. Physical Safari/iOS/Android, native browser-menu zoom, screen-reader/device testing and multi-hour endurance remain unverified. Actual owner acceptance remains pending. No commit, push, deployment or external purchase.

## Handoff and cleanup

- Updated manual preview remains http://127.0.0.1:5209, now serving `output/commission-contract/build`. npm81655/Vite81678/esbuild81681, session30625. Existing isolated API8041 remains PID76440/session92543. Parentage, arguments, start time, listeners and health checked; `/api/health` returns `{"status":"ok"}`.
- Prior board preview session16784 exited normally before replacement. All feature/diagnostic/frame/play-mode runners completed; their Chromium contexts close in `finally`. Final process check found no task test runner or headless Chromium remaining.
- Shared app `node_repl`/CUA/MCP hosts and editor processes are not owned by this slice and remain untouched. The preview/API are intentionally retained for owner review; no broad kill or user browser closure.
