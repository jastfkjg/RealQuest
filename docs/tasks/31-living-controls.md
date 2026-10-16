# Task 31 — Tactile controls and quieter content surfaces

User request (2026-10-16): buttons and display boxes across pages feel rigid and like data displays; optimize the overall interface. The attached examples identify rest actions, market quantity/confirmation and the product grid.

## Plan

1. Keep Hearthwood art, palette, type, page archetypes and game rules. Extend shared control tokens into painted wooden actions, soft paper secondary actions, rounded utility controls and attached bookmark tabs.
2. Give the market actual object shelves and selected paper labels instead of seven colored data cards. Keep native quantity choices, true prices/counts and authoritative trade actions. Make bedside actions compact and contextual.
3. Apply the same primitives across inventory, journal, character growth, map/storage/upgrades, NPC/commission pages, travel/combat preparation and Life/study surfaces while preserving their different layouts.
4. Review actual desktop and landscape screens, selection/hover/press/focus/disabled/pending states and touch/input behavior; run build, dedicated flows and asset preservation. Keep manual previews clearly identified, close automation in finally.

Visual thesis: useful objects sit on timber and linen, with soft edges, a small physical press and clear selection; framing supports content instead of enclosing every value.
Content: context → selected object or entry → exact next action. Motion: a short button press, a tiny object lift on hover, restrained bookmark selection; reduced motion removes displacement.

The user's explicit overall request authorizes applying this control refinement across existing pages. Earlier screenshots are critique references, not owner approval of a new final render. No assets, backend changes or player-data edits are planned.

## Results

Implemented and browser-verified candidate. Owner visual acceptance is pending.

- Shared controls have soft, slightly asymmetric corners and a restrained material treatment: painted moss primary actions, linen secondary actions, attached bookmark tabs, round utility buttons and soft item pockets. Hover, physical press, keyboard focus, disabled/pending and reduced-motion states are preserved.
- The shop replaces seven bordered data cards with short timber shelves, object sprites, true prices/counts and a selected name label. Tabs have installed Lucide icons, buy/sell shares one segmented control, quantity remains a native select, and the confirmation action is compact.
- Bedside rest choices use compact actions beside their description. The existing bed art sits directly on the linen page; no large colored backing or full-width button banners.
- The same primitives refine inventory/dossier/journal/map, storage/blueprints, residents/NPC commissions, armory/spells/cave/travel, Life/study/training and menu/guide/settings. Calendar cells, diagrams and page spreads keep their meaningful geometry. The layouts remain different.
- The generic modal now consistently owns the existing `rq-theme` tokens. No backend, prices, quantities, reward rules, save identifiers or real player data changed. Earlier task30 work remains intact.

### Changed files

| Files | Change |
| --- | --- |
| `styles/realquest-tokens.css` | Shared action, paper, bookmark and pocket corner tokens; base button uses the paper token. |
| `frontend/src/living-controls.css` | Final scoped material, control, shelf and state treatment with desktop/landscape and reduced-motion rules. |
| `frontend/src/main.tsx`, `frontend/src/App.tsx` | Import the final control layer; make shared tokens available to all existing modal types. |
| `frontend/src/world-ui-refinement.css` | Replace its hard-coded button corner with the shared paper token. |
| `frontend/src/components/MarketPanel.tsx` | Add decorative service-tab icons through existing Lucide. Trading semantics unchanged. |
| `frontend/scripts/world-ui-refinement.mjs`, `frontend/package.json` | Extend the existing isolated flow with `test:controls`, family-page coverage, actual ready-state waiting and normal-motion control-state captures. The fixture guard accepts only the two named task test DB paths. |
| `DESIGN.md`, art plan/manifest/checklist, `progress.md`, this report | Record the requested overall scope, source reuse, evidence and remaining limits. |

Other dirty files were inherited from task30 and preserved; pre-existing player DB WAL/SHM changes were not reset or edited for this task.

### Verification

Established stack reused: npm/package-lock, React19, TypeScript5.8, Phaser3.90, Vite6.4.4 and installed Playwright. No dependencies changed. Test API used a new `output/living-controls/test.db`, cookie `realquest_controls31`, port8112; Vite5412 proxied to that API. Only newly created guests in this task DB were seeded. The owner/manual preview DB and normal `backend/realquest.db` were never seeded or reset.

| Command/check | Actual outcome |
| --- | --- |
| `npm run build` in `frontend` | Pass: TypeScript and production Vite build. Existing large-chunk warning remains; no new dependency. Final CSS `index-Dw8t6K1m.css`, app JS `index-DLZm65zG.js`. |
| `REALQUEST_API_TARGET=http://127.0.0.1:8112 npm run preview -- --host 127.0.0.1 --port 5412 --strictPort` | Final production build used for acceptance, after closing the task dev server. |
| `npm run test:controls` in `frontend` | Pass:10 check groups,99 captures, no page runtime errors, no empty family capture. Browser/context closed in `finally`. Full report: [layout-report](../../output/living-controls/layout-report.json), [log](../../output/living-controls/verification.log). |
| Supplied `web_game_playwright_client.js` via a temporary local wrapper adding `finally` cleanup; `--url http://127.0.0.1:5412 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["up"],"frames":10},{"buttons":[],"frames":6}]}' --iterations 1 --pause-ms 250` | Pass: actual player moved, one canvas/listener, expected world state and no captured console/page errors. [Image](../../output/living-controls/game-client/shot-0.png), [state](../../output/living-controls/game-client/state-0.json). Wrapper removed after completion. |
| Bundled Python `tools/audit_inventory_assets.py --output output/living-controls/assets` | Pass:156 images, supplied source hashes and preserved runtime/source pixels unchanged. No image/font/audio addition. |
| Seven changed solid-color and gradient-endpoint contrast pairs | Pass, minimum4.96:1. [Measured pairs](../../output/living-controls/contrast.json). This is not a universal textured-background contrast audit. |
| `prettier --check src/living-controls.css scripts/world-ui-refinement.mjs src/components/MarketPanel.tsx`; `git diff --check` | Pass. No standalone lint script is configured. No backend code changed; task30's prior112 backend tests are historical evidence, not a newly executed task31 run. |

The final production flow covers all five facade collisions and real enter/exits; notice timeout; board rejection/retry with exactly one reward, paged briefing and all nine objectives; failed/retried trade without resource loss and actual purchase price; short rest and overnight sleep; empty gear marker without teleport, real equip and reload; input ownership and return to the world. Family screens were opened through real HUD/menu/interact controls. Study text entry preserved player position.

Target layouts include1440×900,1920×1080,1024×768,844×390 and740×360; family layouts include desktop1440 and landscape844. DPR2 touch actions and reduced motion pass. Normal-motion shop hover, keyboard focus, physical press, rejection and disabled pending action were captured and inspected. The fitted task30 board/shop/rest/gear layouts stay within the viewport with visible actions and no dialog-body scrolling. Existing longer reading/menu pages retain their normal scrolling; visible controls and scroll-to-action captures were reviewed without claiming those whole pages became scroll-free.

### Actual browser evidence

Representative final renders inspected:

- [Shop desktop](../../output/living-controls/shop-1440.png), [landscape](../../output/living-controls/shop-844.png), [keyboard focus](../../output/living-controls/shop-focus.png), [physical press](../../output/living-controls/shop-pressed.png), [pending](../../output/living-controls/shop-pending.png).
- [Bedside desktop](../../output/living-controls/sleep-1440.png), [landscape](../../output/living-controls/sleep-844.png), [board](../../output/living-controls/board-1440.png), [gear](../../output/living-controls/equipment-owned.png).
- [Inventory](../../output/living-controls/family-inventory-1440.png), [dossier](../../output/living-controls/family-character-1440.png), [journal](../../output/living-controls/family-journal-1440.png), [map](../../output/living-controls/family-map-1440.png), [storage](../../output/living-controls/family-storage-1440.png), [blueprint](../../output/living-controls/family-blueprint-1440.png).
- [Life journal](../../output/living-controls/family-life-1440.png), [study](../../output/living-controls/family-study-1440.png), [knowledge](../../output/living-controls/family-knowledge-1440.png), [training](../../output/living-controls/family-training-1440.png), [Lia](../../output/living-controls/family-lia-1440.png), [Noah](../../output/living-controls/family-noah-1440.png), [travel](../../output/living-controls/family-travel-1440.png), [menu](../../output/living-controls/family-menu-1440.png), [settings](../../output/living-controls/family-settings-1440.png).
- [Final recorded flow](../../output/living-controls/videos/page@748188fc3e12c13f69e61d4e0d7588b6.webm). Test-generated earlier iteration files are ignored local evidence, not runtime assets.

### Cleanup and remaining limits

All task automation contexts/browsers and launchers finished. Task dev PIDs60442/60466/60468, test API60499 and production test preview70309/70332/70335 are confirmed exited; ports5412/8112 are free. The temporary skill wrapper is removed. No matching task browser or test runner remained in the final process audit.

Manual preview [http://127.0.0.1:5411](http://127.0.0.1:5411) remains for owner review, with existing API8111 and cookie `realquest_ui30`. It serves the current final production assets; root and both direct/proxied API health checks return200. Retained identities: npm48688, Vite48711, API40152. Details: [cleanup and health](../../output/living-controls/cleanup.json). Other project processes and shared Codex/node_repl hosts were left untouched because their ownership does not authorize cleanup here.

Owner render approval, physical devices/Safari, native browser zoom, screen readers and endurance/performance remain unverified. The older broad `test:play-mode` mouse pickup/HUD obstruction described in task30 remains outside this control treatment; no full-game regression pass is claimed. No commit, push or deployment performed.
