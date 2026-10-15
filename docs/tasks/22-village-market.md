# Village market and livelihood — 2026-10-15

Status: **implemented and browser-verified candidate; owner visual approval pending**. Local preview only; no commit, push or deployment.

Request: continue improving the map, buildings, NPCs, earning channels and goals; draw appropriate inspiration from Stardew Valley.

## Scope and result

One connected livelihood loop: walk to a general store south of the library → meet Mira (米拉) → sell gathered materials/harvests or fulfill village orders → use the earnings to improve the home → return for the persistent story reward. Preserve the existing cultivation, workshop, currencies and separate Life Mode.

The initial plan was to connect a shop, daily deliveries and home goals using existing components and authoritative commands. Actual scene review led to original shop/counter art for a recognizable store. This shop is a new visual checkpoint; it is not owner-approved and does not authorize unrelated screen redesigns.

Reference: [official Stardew Valley introduction](https://www.stardewvalley.net/) — the connection between farming, crafting and community informs the loop. No characters, maps, fonts or assets copied.

- Added a walkable shop at world position (832,688), its interior, shelves/counter and Mira. A connected village path, direction sign and moved tree keep the approach clear. The current map and game menu can mark the store without teleporting.
- Buy seeds; sell crops, wood, stone or planks. Quantity selection shows the exact server quote and resulting balance. Pending, shortage, rejection, retry and success are represented.
- Three daily material orders reward preparation. Source-marker actions lead to existing gathering/farming locations. Completed orders and cumulative income persist.
- Two story quests, `market_neighbor` and `village_supplier`, link the first sale, three deliveries and home level2. Old first-harvest quests accept sales at either the workshop or store. Home upgrading remains at the real home desk; level2 shortens new crop growth from60 to45 seconds.
- Shop tabs use the existing modal input/focus lifecycle. Text stays native Chinese DOM, with mobile scrolling, 44px controls, keyboard/Escape and reduced-motion support.

## Economy and persistence

| Action | Server rule |
|---|---|
| Buy seed | 2 gold each |
| Sell crop | 8 + workshop level −1 gold each |
| Sell wood / stone / plank | 2 / 3 / 8 gold each |
| Timber order | 6 wood →18 gold |
| Masonry order | 4 stone →20 gold |
| Supper order | 4 crops →44 gold |
| First-customer story | 10 gold,2 seeds,10 bond EXP |
| Village-supplier story | 50 gold,20 stewardship EXP |

Gold remains the sole trading currency. Only seeds are purchasable, so there is no buy/sell arbitrage. Each order consumes actual inventory and settles once per `Asia/Shanghai` calendar date. There is no missed-day penalty. The server rejects stale dates, remote transactions, invalid quantities, insufficient inventory and duplicate settlement. Existing database locks/request receipts protect retries; no client-provided price is trusted.

Save additions are compatible defaults. Schema3 moves an old outdoor position that collides with changed geometry to the nearest walkable point, without changing inventory or achievements. Historical balances do not fabricate market progress. All new test players live in `output/village-market/test.db`; the existing player database was not reset or edited by this task.

## Files changed by this slice

The working tree already contained and continued receiving other HUD, interior, Life journal, character and atlas work. The list below records this task's contributions, not ownership of every diff in a shared file.

- Server: `backend/app/market.py` (new), `main.py`, `rules.py`, `world.py`, `quests.py`; `backend/tests/test_market.py` (new).
- UI: `frontend/src/components/MarketPanel.tsx` and `market.css` (new); `App.tsx`, `main.tsx`, `types.ts`, `components/Atlas.tsx`, `components/InventoryPanel.tsx`, `components/InventoryView.tsx`, `world-panels.css`. The decorative map leader no longer intercepts destination clicks.
- Scene/navigation: `frontend/src/game/{GameCanvas.tsx,WorldScene.ts,interaction.ts,navigation.ts,items.ts,village.ts,villageGround.ts,interiors.ts}`. New shop bindings extend the existing scene rather than create another Phaser instance.
- Art: the two original source PNGs and exact adjacent prompts under `assets/generated/hearthwood/market-*-v1.*`; two packed PNGs under `frontend/public/assets/hearthwood/market/`; `tools/build_market_art.py`, `docs/art/market-art-v1.json`, main asset manifest and audit extension.
- Browser verification: `frontend/scripts/market-smoke.mjs`, `market-layout.mjs` (new), package `test:market` script.
- Documentation: `README.md`, `DESIGN.md`, `TODO.md`, `docs/game-design.md`, `docs/art/ASSET_PLAN.md`, `docs/art/REVIEW_CHECKLIST.md`, this report and `progress.md`.

## Asset provenance

Two original built-in image_gen outputs, without uploaded references or third-party packs:

| Runtime | Dimensions | Bytes | Immutable source |
|---|---:|---:|---|
| `market/shop.png` | 272×232 | 118,554 | `market-shop-v1.png` (1345×1169) |
| `market/counter.png` | 416×169 | 93,154 | `market-counter-v1.png` (1983×793) |

`tools/build_market_art.py` reproducibly crops transparent bounds and proportionally resizes with nearest-neighbor sampling; alpha and original sources are retained. Runtime uses two native pixels per world unit. Exact crops, dimensions, source/runtime hashes and rebuild hash are in `docs/art/market-art-v1.json`; exact prompt hashes are in the main manifest. Source packs are outside the runtime bundle. No new font, audio or dependency.

Mira intentionally reuses the existing audited golden-outfit `appearance5`; this is a temporary presentation binding, not a unique character sprite. Existing room materials/furniture are reused; the shop's counter and exterior are unique generated assets.

## Commands and outcomes

Established environment: npm/lockfile, React/TypeScript/Vite and Phaser3.90; Python FastAPI/SQLAlchemy/SQLite through the existing backend `.venv`. No package-manager or engine changes.

| Command | Actual outcome |
|---|---|
| `cd backend && .venv/bin/python -m pytest -q` | **124 passed** (16 new market cases). Existing Starlette/httpx deprecation warning only. |
| `npm --prefix frontend run build -- --outDir /Users/zilong/Developer/projects/RealQuest/output/village-market/build` | TypeScript and production build pass. Existing large Phaser chunk advisory and external outDir notice. |
| `REALQUEST_URL=http://127.0.0.1:5295 npm --prefix frontend run test:market` | Final equivalent direct `node frontend/scripts/market-smoke.mjs` run passes;25 captures and recorded desktop/touch flows. |
| `node frontend/scripts/market-layout.mjs` |9 layouts (trade/orders/goals ×1440/390/375), goal-bottom scroll evidence,44px controls, enlarged375px text and Escape pass. |
| Bundled Python `tools/check_character_contrast.py --output output/village-market/contrast-<tab>-<width>` for each of9 directories |357 visible, unclipped text runs against actual captured backgrounds; minimum **5.53:1**. |
| Bundled Python `tools/audit_inventory_assets.py --output output/village-market/assets` | Final **133 source/runtime images** inventoried across the shared tree; hashes/generated pixels pass. |
| `node output/life-commissions/game-client.mjs --url http://127.0.0.1:5295 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":6},{"buttons":[],"frames":6}]}' --iterations 1 --pause-ms 250 --screenshot-dir output/village-market/game-client-final` | Cleanup-wrapped skill frame client passes; screenshot/text state inspected; no error files. |
| `git diff --check` | Pass. New layout script formatted with the installed Prettier. |

Browser flow uses actual gathering, planting and60-second crop maturation, actual shop entrance/Mira interaction, sales, all three orders, purchase lost-response reconciliation, reload, home upgrade and reward claiming. Backend cases also cover concurrent/duplicate delivery and CST rollover/stale offers. Test setup movement uses public authoritative movement/path geometry; it does not mint resources. The separate layout script discloses and restricts its visual fixture to the isolated test database/player.

`result.json` has one deliberately injected `net::ERR_FAILED` for the committed-response retry case. No unexpected JavaScript or network errors remained. The selected+hover text color and completed-reward label were fixed from actual screenshots. The contrast collector excludes scroll-clipped glyphs and separately scrolls the goal action into full view, instead of measuring pixels outside the dialog as text background.

## Captures inspected

All paths are under `output/village-market/`:

- `shop-exterior.png`, `road-to-shop.png`, `shop-interior.png`: actual world/building/path and counter/Mira.
- `trade-rejected.png`, `home-goal.png`, `orders-completed.png`, `earned-home-upgrade.png`: real outcome/retry/progression.
- `trade-*`, `orders-*`, `goals-*`:1440×900,1920×1080,768×1024,390×844,720×450.
- `layout-trade-390.png`, `layout-orders-390.png`, `layout-goals-1440.png`, `layout-goals-bottom-375.png`, `large-text-375.png`: final enabled/claimed states and readable scrolling.
- `map-shop.png`: real shop marker selected without teleporting.
- `trade-touch-dpr2.png`, `orders-touch-dpr2.png`: emulated touch/DPR2 with reduced motion.
- `game-client-final/shot-0.png` and state JSON; `result.json`; `videos/*.webm`;9 `contrast-*` folders.

These are candidate implementation evidence, not owner-approved references or a matched old/new visual comparison (the old store did not exist).

## Remaining gaps

- Mira's unique sprite/portrait, NPC schedules, rotating order narratives, additional crops, seasons/weather and new regional maps are future slices. The present shop deliberately stays open every day.
- Physical iOS/Android/Safari, native browser-menu zoom and actual screen-reader/device testing remain unverified. Chromium keyboard, emulated touch/DPR2, reduced motion and enlarged text/reflow were verified.
- A pre-existing nearest-object HUD control overlaps a distant clicked exit in one room view. This flow verifies keyboard walking to the door and exit; that broader pointer-overlay issue is not claimed fixed.
- No full economy balancing over many days or multi-hour endurance run. Existing systems outside this slice were not comprehensively reaccepted.

## Handoff and cleanup

Manual preview: **http://127.0.0.1:5295**, isolated API **http://127.0.0.1:8095**. Both were checked (preview HTTP200/API `status:ok`) and intentionally retained for owner review. Open the map (`M`) and select 风铃杂货铺, or use the menu's store direction; walk to its door and interact with Mira.

- Preview PID27169, started14:14:01, cwd `frontend`, fixed build at `output/village-market/build`.
- API PID30099, started14:22:39, cwd `backend`, database `output/village-market/test.db`, cookie `realquest_market`. Start command uses `DATABASE_URL`, `SESSION_COOKIE_NAME`, `ALLOWED_ORIGINS=http://127.0.0.1:5295` and `.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8095 --no-access-log`.
- Frontend start uses `REALQUEST_API_TARGET=http://127.0.0.1:8095 node node_modules/vite/bin/vite.js preview --outDir /Users/zilong/Developer/projects/RealQuest/output/village-market/build --host 127.0.0.1 --port 5295 --strictPort`.
- All owned browser contexts/browsers close in `finally`; no market runner or headless browser remained in the final PID/start-time/parent/argument check. The superseded own API was stopped normally. No npx or node_repl host was started by this task.
- Existing shared node_repl/MCP hosts and other chats' services were preserved because they are not attributable idle resources of this task. Occupied5293/8093 were left intact. Codex preview opening was queued.
