# Task 04 — Village arrival / character creation

Original request: implement the approved village-registration concept, soften the name and appearance controls, and moderately expand the appearance choices. Scope is this welcome flow only; existing saves/world/balance remain compatible.

## Plan and direction

- Visual thesis: a warm woodland arrival illustration, live small traveler, linen registration sheet and moss-painted wooden entry sign.
- Content: restrained brand on the canopy; a single registration prop contains name, six appearance tags, one entry action and accurate guest-cookie note.
- Interaction: signature-line focus, slightly rotated portrait tags that lift when selected, short paper/character entrance; reduced motion supported.
- Audit the existing three sprite bindings and import only three compatible CC0 sheets from the same fixed source commit, preserving IDs 0–2.
- Preserve create validation, idempotent request/retry, quest activation and actual initial balances. Test with an isolated backend database; never reset the user's guest.
- Deliver actual desktop/phone captures and stop at review.

## Status

**Implemented and browser-verified; actual owner visual approval pending.** Generated background and blank registration material are candidate assets based on the owner-approved concept. All text and controls remain DOM. These files apply only to the welcome illustration; no world tileset replacement. No commit, push or deployment.

## Changed files and flow

| Files | Change |
|---|---|
| `frontend/src/components/Welcome.tsx`, `welcome.css`, `App.tsx` | Extract the existing create adapter into a composed welcome scene. Signature-line input, selected portrait seals, six gently offset paper tags, live small traveler and primary wood sign. Pending, failure, retry, keyboard, IME and reduced motion retained/verified. |
| `frontend/src/game/appearances.ts`, `components/PixelPerson.tsx`, `game/characterGrowth.ts`, `game/village.ts` | One append-only frontend appearance registry feeds the welcome, HUD/dossier and Phaser. Existing 0–2 unchanged; 3–5 added. Source frames remain 16×16, selected previews 2×/3× and scene actor 3×/4×. |
| `backend/app/rules.py`, `backend/tests/test_game.py` | Allow audited IDs 0–5; verify create/replay/reload and unchanged starter values for every ID, plus rejection of invalid IDs. No schema migration, balance or progression changes. |
| `frontend/src/dev/WelcomePreview.tsx`, `main.tsx` | `/dev/welcome` is visibly labeled and excluded from production. It can preview name and appearance without API requests/cookies/storage writes. `?state=pending` and `?state=error` provide isolated visual states. |
| `frontend/src/game/GameCanvas.tsx` | Existing read-only game-text hook includes actual appearance and sprite texture for cross-layer validation. |
| `frontend/scripts/arrival-*.mjs`, `package.json` | Layout captures, real create/mutation/keyboard/touch tests and actual-background contrast sampling. Existing RPG test updates one obsolete preview selector only. |
| `tools/build_inventory_skin.py`, `audit_inventory_assets.py`, `check_character_contrast.py` | Lossless welcome asset packaging, additional source/runtime sprite audit, optional contrast evidence directory. |
| `assets/generated/hearthwood/arrival-*`, `frontend/public/assets/hearthwood/arrival-*` | Two generated textless source PNGs, exact prompts and lossless WebPs. Detailed provenance in ASSET_PLAN / manifest. |
| `assets/vendor/ninja-adventure/characters/`, `frontend/public/assets/ninja-adventure/character-{3,4,5}.png` | Three actual CC0 sheets copied byte-for-byte from the existing official fixed source version; license and original files retained. |

The original worktree already contained `scripts/start.py` and database WAL/SHM changes. Those remain unrelated and were not edited/reset by this task. All test writes used `output/arrival-reference/test.db`; original save data was not used to create visual fixtures.

## Actual evidence

- [1440×900](../../output/arrival-reference/arrival-1440.png), [390×844](../../output/arrival-reference/arrival-390.png), [768×1024](../../output/arrival-reference/arrival-768.png), [1920×1080](../../output/arrival-reference/arrival-1920.png), [720×450](../../output/arrival-reference/arrival-720.png), [short-view scroll to entry](../../output/arrival-reference/arrival-720-scrolled.png).
- Screenshots are of the real homepage and separate fresh test guests. They contain true name/appearance selections and no invented progression. All five viewport images inspected. Primary action visible in the 390×844 initial viewport; short 720×450 layout scrolls naturally to the button, with no clipping or horizontal overflow.
- [Interaction recording](../../output/arrival-reference/arrival-interaction.webm), [test results](../../output/arrival-reference/interaction-results.json), [new sheet/frame audit](../../output/arrival-reference/selected-character-frames.png), [actual new character in world](../../output/arrival-reference/world-appearance-4.png), and `output/arrival-reference/game-client/`.
- Failure, pending and focus screenshots are `arrival-rejected.png`, `arrival-pending.png`, `arrival-keyboard-focus.png`. Screenshot before/after comparisons use the owner's original supplied home capture as a historical reference, not a claimed matched-save browser baseline.
- Inspection fixes: removed an inherited 1200px width constraint; aligned mobile traveler with the road; brought the mobile CTA above the fold; corrected inherited hover color; darkened the canopy under mobile text; inset text from the irregular paper edge; removed the tablet background's rectangular edge.

## Commands and results

Services: `.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8021` with isolated `DATABASE_URL` above and `ALLOWED_ORIGINS=http://127.0.0.1:5187`; frontend `REALQUEST_API_TARGET=http://127.0.0.1:8021 npm run dev -- --host 127.0.0.1 --port 5187 --strictPort`. Existing npm lock / installed React 19, Phaser 3.90 and Vite 6.4.4 retained. Test DB initialized with `.venv/bin/alembic upgrade head`. No standalone lint script is defined.

| Command | Outcome |
|---|---|
| `npm run build` (frontend) | Pass: TypeScript + production build. Existing Phaser chunk-size warning retained. DEV preview code absent from dist. |
| `.venv/bin/python -m pytest -q` (backend) | **32 passed**, including six appearance/replay/balance cases and five invalid input cases. Existing Starlette/httpx deprecation warning. |
| `node scripts/arrival-smoke.mjs` | Pass: all six selected→created→restored→dossier→four-direction world flows; unchanged starter balances; empty name, keyboard/Space/focus, IME Enter, rejected/pending/retried requests, duplicate submission guard, lost-response same-ID retry, DPR2 emulated touch, isolated preview. No unexpected console/page errors. |
| `node scripts/arrival-capture.mjs` | Pass: five viewport captures, no horizontal overflow, 44px entry action and unobscured hit target after scroll. Screenshots opened and inspected. |
| `node scripts/arrival-contrast.mjs` plus `tools/check_character_contrast.py --output output/arrival-reference/contrast-<viewport>-<state>` | Pass: 18 visible DOM text runs per capture, 1440/390 default+hover, minimum **4.97:1** against sampled actual texture/background. Scope is these captures, not a universal screen audit. |
| `REALQUEST_URL=http://127.0.0.1:5187 npm run test:rpg-ui` | Pass: existing inventory, shortcuts, crafting, growth unlocks, planting/harvest/sale, mobile actions and six layouts. First run found the obsolete `.stage-person` selector; updated only to the new preview marker and reran successfully. |
| `node node_modules/.cache/inventory-game-client.mjs --url http://127.0.0.1:5187 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":8},{"buttons":[],"frames":8}]}' --iterations 1 --pause-ms 300 --screenshot-dir ../output/arrival-reference/game-client` | Pass: existing skill client with finally cleanup, real world movement/text-state capture and screenshot inspected. |
| `tools/build_inventory_skin.py --asset arrival-village-v1` / `--asset arrival-register-v1` | Pass: lossless decoded RGBA equality. Uses bundled Python 3.12 / Pillow, no dependency installation. |
| `tools/audit_inventory_assets.py --output output/arrival-reference` | Pass: **29 images**, all original hashes unchanged, added character bytes/frames verified and generated source/runtime pixels equal. |
| `git diff --check` | Pass. |

`npm run test:arrival` groups the three new browser scripts; the contrast analyzer runs separately with the documented capture directories. Tests always close their own contexts/browser in `finally`.

## Remaining gaps and checkpoint

- Physical-device Safari/touch, actual browser-menu zoom and mobile virtual keyboard behavior are unverified. Chromium touch/DPR2, native input, IME event ownership and small-viewport reflow are verified.
- Welcome art is a **static illustration**, with short DOM entrance/selection/press transitions; it does not imply animated water or a new playable village. Two lossless welcome materials add approximately **2.77 MB**; no paid pack, fonts or engine migration.
- Actual homepage remains a candidate for owner review. No other screen redesign or account system was added.
- Preview handoff: `http://127.0.0.1:5187/dev/welcome` deliberately avoids account/cookie writes, so existing guests can inspect choices safely. Retain the isolated frontend 5187 and backend 8021 for review; no automation browser is retained. Other tools with unconfirmed ownership are not terminated.
- Cleanup verified at 19:47 local: no Chromium/headless browser or arrival/RPG/frame-client test runner remains. Retained frontend Vite PID 55925 (npm parent 55902, started 19:14) and backend PID 55886 (started 19:14), both from this task. Preview and backend each returned HTTP 200. Existing user browser tabs were not operated or closed.
