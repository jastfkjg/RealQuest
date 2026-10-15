# Task 18 — Fine pixel village

Owner request (2026-10-15): implement the approved fine-pixel village preview, with slightly fewer flowers and grass, refining both people and scenery in the current village.

## Plan

1. Preserve geography, collision, saved appearance IDs and authoritative interactions. Replace presentation bindings with original, separately layered scenery and real directional actor frames.
2. Build a reproducible source-to-runtime pipeline, record prompts, cuts, dimensions and hashes; preserve existing vendor sources. Keep paths quiet and concentrate a small amount of planting at banks/buildings.
3. Inspect actual desktop, tablet and phone gameplay; verify movement/animation, doors, gathering/retry, NPC dialogue, inventory, mode/focus and persistence in an isolated database. Run production build, existing regressions and the game skill client.
4. Report actual evidence, limitations and retained preview; close owned test browsers and idle tools.

## Status

**Implemented and browser-verified candidate; actual owner render acceptance pending.** Approved concept: `docs/art/references/village-fine-concept-v1.png`. Scope is the current outdoor village and consistent actor presentation, not new maps, interior redesigns or game rules.

## Changes and flow

| Files | Result |
| --- | --- |
| `frontend/src/game/village.ts`, new `villageGround.ts` | Independently layered fine buildings, trees, bridges, notice board, resources and small props; two native scenery pixels/world unit. Original road/collision/door anchors preserved. Quiet paths, five small flower clumps, clustered grass and bank detail. Transparent canopies keep a player behind a tree visible. |
| `game/WorldScene.ts`, `GameCanvas.tsx` | 48×64 actor frames at2/3 scale; 36-world-unit body, real four-direction/two-step walking. Outdoor fit width/640 and height/400 gives more surrounding context, independent of DPR. Roof hit areas follow actual facades; auto-approach stops beside NPCs. One canvas/listener, held-key cleanup and server synchronization retained. Debug state reports real frame geometry. |
| `game/appearances.ts`, `components/PixelPerson.tsx`, `components/WorldPanels.tsx`, `App.tsx`, `hud.css` | Saved appearance IDs0–5 remain stable, same fine actors throughout welcome/world/HUD/dossier. Distinct full-body/head-shoulder art; Lia's hat and Noah's hood match their world sprites. Lighter HUD edges; layout/actions and Chinese DOM text preserved. |
| `game/art.ts` | Finer native-code soil, edges and furrows. Existing empty/growing/ready crop states and server planting/harvest transitions retained. |
| `tools/build_village_art.py`, `assets/generated/hearthwood/village-*`, `frontend/public/assets/hearthwood/village/` | Three original built-in image_gen source sheets and exact prompts; measured cell layout, alpha threshold, nearest-neighbor normalization, three named outfit palette ramps and48 packed runtime PNGs. Clipped generated bottom walking row excluded. No prior vendor/runtime image modified, new external pack/font/audio or gameplay feature. |
| `docs/art/village-art-v2.json`, `asset-manifest.json`, asset plan/README, `DESIGN.md`, checklist, `progress.md`, extended `tools/audit_inventory_assets.py` | Source/runtime dimensions, hashes, cuts, alpha bounds, original-code hashes, approved density exception, reproducible packaging and evidence. Actual render is a candidate. |
| `frontend/scripts/village-fine.mjs`, `package.json` | `npm run test:village`: actual keyboard/mouse/touch journey and21 captures with finally cleanup. |

No backend code, SQL migration, player record, resource rule, engine/package version, commit, push or deployment was changed. The pre-existing and independently changing `backend/realquest.db-wal` is preserved.

## Assets and reproducibility

Built-in image_gen mode was used. Exact prompts:

- `assets/generated/hearthwood/village-scenery-v2.prompt.txt`
- `assets/generated/hearthwood/village-actors-v2.prompt.txt`
- `assets/generated/hearthwood/village-details-v2.prompt.txt`

The three immutable RGBA PNG sheets are1254×1254,2172×724 and1774×887. Processed runtime files total1,470,001 bytes. `docs/art/village-art-v2.json` contains every exact source path/hash, crop, native size, alpha bound, runtime hash and processing description. Runtime artwork is intentionally processed; source/runtime equality is not claimed. IDs0/1/2 use generated redhead/hat/hood families; IDs3/4/5 use documented sky/silver/sun ramps. Walking phases are idle/stepA/idle/stepB, with distinct complete limb poses. Sources and the approved concept remain outside the runtime bundle.

Rebuild with Python/Pillow: `python3 tools/build_village_art.py`. Audit: `python3 tools/audit_inventory_assets.py --output output/village-fine`. This host used the bundled Python at `/Users/zilong/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3` for Pillow. Audit covers88 images, including all40 preserved entries and48 new runtime files, and validates the original ground/farm code and packing hashes.

## Verification and evidence

All real browser work used isolated `output/village-fine/test.db`, cookie `realquest_village_fine`, and a real running frontend/backend. No player's database was reset or edited. Main feature evidence is the **production build**, not a DEV mockup. Current installed Phaser3.90.0 and Vite6.4.4 were retained.

| Command / evidence | Result |
| --- | --- |
| `npm run build` from `frontend/` | TypeScript/Vite pass; existing large Phaser chunk warning remains. |
| `.venv/bin/python -m pytest -q` from `backend/` |108 pass; existing Starlette/httpx deprecation warning. |
| `REALQUEST_URL=http://127.0.0.1:5211 npm run test:village` |21 production captures: actual bridge route, separated Noah dialogue, distinct walking frames, four buildings in/out including upper roof clicks, canopy occlusion, five viewports, DPR2 touch movement, all six appearances, mode/input ownership and reload. Zero unexpected errors. |
| `REALQUEST_URL=http://127.0.0.1:5211 npm run test:play-mode` | Production pass: roof-target approach, range gating, single entry after restart, real gather/cooldown, held-key reset, quest reward, save restoration, read-only growth history and blur recovery. |
| `npm run test:arrival` against the DEV server before fixed-build handoff | Six saved IDs, four walking directions, unchanged starting balances, create rejection/retry/lost response, IME/keyboard and DPR2 touch pass. Five welcome viewport captures produced; source/runtime actors are identical to the final build. |
| Existing inventory smoke/mutation scripts through compatibility copies in `frontend/node_modules/.cache/village-inventory-*.mjs` | Pass: own output/session folder; current read-only Life modal replaces the obsolete duration-field test step. Selection, binding/no consumption, persistence, focus, responsive/touch, marker-only navigation and isolated DEV fixtures verified. Real planting rejects, pending prevents duplicates, lost-response retry consumes exactly one seed and reload retains it. Final mutation flow also ran on the production build after the soil refinement. |
| Required game skill client | Original bundled `web_game_playwright_client.js`, copied for local dependency resolution with finally cleanup only; two right/down/idle frame bursts on production. Screenshot/state JSON inspected; no error file. |
| Asset audit and `git diff --check` | Pass;88 raster files and original source code hashes verified; source art retained. |

The unmodified old `npm run test:inventory` is **not** reported as passing: its cached cookie belonged to an older task and its Life form selectors predate the current read-only journal. The compatibility copies use a fresh task folder and replace only that outdated form step with modal keyboard ownership; actual IME behavior is covered by the arrival suite. No product control was added to satisfy the obsolete selector.

Actual screenshots under `output/village-fine/` were opened and inspected:

- `village-{spawn,bridge}-1920.png`, `village-bridge-{1440,768,390,720}.png`:1920×1080,1440×900,768×1024,390×844 and720×450. The quiet bridge view is suitable for owner comparison to the approved concept.
- `walking-right.png`, `tree-occlusion.png`, `village-reloaded.png`, `inside-{home,workshop,library,guild}.png`, `village-touch-dpr2.png`, `appearance-{0..5}.png`: actual animation/occlusion/doors/touch and stable appearances. Interior backgrounds deliberately retain their previous artwork.
- `scenery-contact-sheet.png`, `actors-contact-sheet.png`, `asset-audit.json`, `game-client/shot-{0,1}.png` and state JSON. Native source/frame detail and complete feet checked.
- `recordings/*.webm`: actual desktop route capture; test contexts/browsers close in finally. `inventory/` holds the separate existing mutation/regression evidence.

## Preview and cleanup

Retain `http://127.0.0.1:5211/` for manual owner review: fixed Vite preview on port5211, isolated API on8043. Setup commands used from the respective folders:

```sh
# backend/
DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/village-fine/test.db .venv/bin/alembic upgrade head
DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/village-fine/test.db SESSION_COOKIE_NAME=realquest_village_fine ALLOWED_ORIGINS=http://127.0.0.1:5211 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8043
# frontend/
REALQUEST_API_TARGET=http://127.0.0.1:8043 npm run preview -- --host 127.0.0.1 --port 5211 --strictPort
```

The initial DEV server session was stopped through its own tool interface; npm85970 and Vite85993 exited. Preview node89454 and API85957 are reserved for owner review. All task browser contexts, Chromium children and runners are closed after checks. Pre-existing shared node_repl/Playwright tool hosts and the unrelated API8027 are not attributable to this work and were preserved. Final process/port/HTTP check confirmed only preview node89454 and API85957 on5211/8043; both cwd values match this project. API health through8043 and the5211 proxy returned success; preview root returned HTTP200. No owned test/browser runner or Chromium headless child remained. A manual Codex preview tab was requested for owner review.

## Limits and next checkpoint

Owner approved the concept, not this actual render. Physical Safari/iOS/Android, native browser-menu zoom, screen readers, long-session performance/memory and a full accessibility audit remain unverified. Chromium viewport/reduced-motion/DPR2 touch checks are actual emulation. The2× ground backing is about40MB uncompressed; long mobile sessions need device review. Interior scenes and new building upgrade facades are outside scope; their existing layouts, gameplay and assets remain. No inferred approval to expand this treatment to unrelated screens.
