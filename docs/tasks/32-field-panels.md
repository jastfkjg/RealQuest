# Task 32 — In-world worktables and field pages

User request (2026-10-16): redesign all similar popup pages because the large generic armory panel does not fit the game. This authorizes the connected family of remaining generic utility dialogs, beyond task31's control geometry.

## Plan

1. Preserve Hearthwood palette, native text, existing art, page archetypes and authoritative rules. Rebuild armory as a timber rack and cloth worktable with a selected paper sheet; move extended guidance to a real handbook tab.
2. Give spell, cave, gate, storage, building and travel dialogs their own illustrated working surfaces. Use explicit selections/pages for long content; keep important costs, shortfalls and actions visible. Extend matching timber/paper framing to menu/guide/settings without changing inventory, journal, Life or NPC compositions.
3. Verify actual desktop and landscape renders, keyboard/touch, pending/failure/retry, resource conservation and persistence in a new isolated test save. Run build, source-asset audit and supplied game client. Close task automation/services, retain a clearly identified manual preview.

Visual thesis: village tools rest on timber and moss cloth; a small paper sheet carries the next decision, with the surrounding world still visible.
Content plan: context/selected object → actual requirement or effect → one primary action; lengthy rules are an explicit handbook page.
Motion: restrained paper arrival, selected-object lift and physical button press, all removed under reduced motion. No new animation dependency.

No backend, balance, currency, engine, paid asset, external generation or player-data edit is planned. Existing uncommitted task30/31 work and DB WAL/SHM are preserved. The user's critique image is a problem reference, not approval of a new final render.

## Results

Implemented and production-browser-verified candidate. Actual owner render approval is pending.

### Implemented compositions

- Armory: a timber weapon rack, moss-cloth display and one selected parchment sheet. Purchase, crafting and first-expedition handbook are native tabs. Exact stats, owned count, price, recipe, shortfalls and equip/sell actions remain live. Soup is a compact separate counter strip.
- Spell/cave/gate: existing emblem/book/stone props and original CSS stonework support a readable decision sheet. Cave and gate rules are explicit handbook pages. All prerequisites and actual entry/retreat/permanent-open actions remain authoritative.
- Storage: paired satchel/chest surfaces show six actual item types per page. Selection, all item types, deposit and withdraw remain available; page changes do not mutate resources.
- Building: current/next blueprint and materials sit on a worktable. Workshop counter operations have a separate tab. The sketch now reuses audited Hearthwood building PNGs.
- Travel: a resident/scenic aside and one actual server quote at a time, with previous/next options. Costs, arrival time, shortfalls and explicit confirmation stay visible. Bridge/ferry alternatives remain in the aside.
- Menu/guide/settings/AI: timber and textless paper replace the generic dialog surface. Guide has four topic pages; settings separates preferences, recovery and data management. Destructive data and restore behavior is unchanged and was not executed during review. The AI page still truthfully says it is unavailable.
- Feedback uses a small title-rail receipt/error tag; it does not resize or cover the working surface. Shared task31 control states remain. Paper entrance, object hover and button press respect reduced motion.

### Actual changed files

| Files | Purpose |
| --- | --- |
| `frontend/src/field-panels.css`, `main.tsx` | Scoped frame/materials, independent layouts, responsive height budgets and motion; final style import. |
| `components/FieldIllustration.tsx` | Existing prop compositions and explicit native main/handbook pages. |
| `components/CombatPanels.tsx` | Armory tabs, selected display, spell/cave/gate sheets and accessible rules; commands unchanged. |
| `components/WorldPanels.tsx` | Six-type storage pages, blueprint/counter tabs and Hearthwood building presentation binding. |
| `components/TravelPanel.tsx` | One quoted route option per page and illustrated aside; original quote and mutation payloads preserved. |
| `components/VillageGuide.tsx`, `App.tsx` | Four guide chapters, settings pages and field-family class. Existing inventory, diary/Life and NPC compositions retained. |
| `scripts/field-panels.mjs`, `package.json` | Dedicated isolated fixture/visual/interaction flow and `test:field-panels` command. |
| `scripts/village-intro-{smoke,controls}.mjs` | Existing recap tests now explicitly open the handbook tab. Their full expedition suites were not rerun in this visual task. |
| `DESIGN.md`, art plan/manifest/checklist, `progress.md`, this report | Scope, presentation reuse, evidence and limits. |

Paths in the table are relative to `frontend/src` unless prefixed otherwise. Previous task30/31 changes and pre-existing player DB WAL/SHM changes are preserved. No backend/rules/dependency/lockfile change, new raster/font/audio, commit, push or deployment.

### Environment and validation

Reused npm/package-lock, React19, Phaser3.90, TypeScript5.8, Vite6.4.4, installed Playwright and backend Python virtualenv. No standalone lint script is configured. The new test DB is only `output/field-panels/test.db`, cookie `realquest_field32`; the fixture writer asserts that exact task path and only updates its freshly created test guest. Original player and manual-preview saves were not seeded or reset.

Startup in `backend`:

```sh
DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/field-panels/test.db .venv/bin/alembic upgrade head
DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/field-panels/test.db SESSION_COOKIE_NAME=realquest_field32 ALLOWED_ORIGINS=http://127.0.0.1:5413 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8113 --no-access-log
```

Development used `REALQUEST_API_TARGET=http://127.0.0.1:8113 npm run dev -- --host 127.0.0.1 --port 5413 --strictPort` in `frontend`. Final acceptance used `npm run build`, then the same API target with `npm run preview -- --host 127.0.0.1 --port 5413 --strictPort` after closing the task dev server.

| Check | Actual outcome |
| --- | --- |
| `npm run build` | Pass, TypeScript and production build. Existing large-chunk warning remains. Final app `index-repOVeTg.js`, CSS `index-QGECSTdx.css`. [Build log](../../output/field-panels/build.log). |
| `npm run test:field-panels` against the final production preview | Pass:12 check groups/91 captures. Every captured dialog is in viewport; no body vertical scrolling, covered control or measured content overflow. Zero unexpected page/console errors; one expected injected503 console log is separate. [Report](../../output/field-panels/report.json), [log](../../output/field-panels/verification.log). |
| Public behavior and resources | Actual rejected purchase preserves inventory; retry buys exactly one24-gold sword, equip/reload persist,8-gold soup costs once. Staff craft consumes exact listed materials. Spell costs8 and becomes learned. Store/withdraw preserve totals; home upgrade consumes6wood/3stone/10gold; counter consumes3wood per plank. Gate consumes one stone and opens permanently; real cave first-floor entry/retreat work; selected ferry spends6gold and reaches the mountain. |
| Input and states | Normal-motion hover, keyboard focus-visible, physical press,44px primary height, frozen world position while dialog owns input, pending/error/retry, selected/locked/ready/success and reload checked. DPR2 landscape touch changes a guide page and closes back to one canvas. Reduced motion verified. |
| Supplied develop-web-game frame client | Final build passes10 up frames +6 idle frames, one iteration, pause250ms. Only a temporary local copy adds `finally` browser closure. Actual screenshot/state inspected, no captured console/page error; wrapper removed. [Image](../../output/field-panels/game-client/shot-0.png), [state](../../output/field-panels/game-client/state-0.json). |
| Bundled Python `tools/audit_inventory_assets.py --output output/field-panels/assets` | Pass:156 existing images, hashes/source pixels preserved. Reuse/bindings recorded under `living_field_panels` in manifest. |
| Seven solid-color pairs | Pass, minimum4.96:1. [Pairs](../../output/field-panels/contrast.json). This does not certify every textured pixel/background or all unchanged screens. |
| Prettier on changed TSX/CSS/test scripts; `git diff --check` | Pass. Backend tests were not rerun because this change has no backend/rule code; prior backend results remain historical evidence. |

Target captures include1440×900,1920×1080,1024×768,844×390 and740×360. Initial real-browser review exposed short-screen storage feedback/rack overlap and cave/gate content overflow; final height budgets, title-rail receipts and handbook pages resolve them. A wrong mountain fixture coordinate and an ambiguous guide/HUD selector were corrected in the runner, not hidden with forced clicks.

### Final actual renders

- Armory [desktop](../../output/field-panels/armory-buy-1440.png), [short landscape](../../output/field-panels/armory-buy-740.png), [craft](../../output/field-panels/armory-craft-ready.png), [handbook](../../output/field-panels/armory-notes.png), [focus](../../output/field-panels/armory-focus.png), [press](../../output/field-panels/armory-pressed.png), [failed short-screen action](../../output/field-panels/armory-rejected-740.png).
- [Spell](../../output/field-panels/spell-ready.png), [cave](../../output/field-panels/cave-entry-1440.png), [gate](../../output/field-panels/gate-locked-1440.png), [storage](../../output/field-panels/storage-1440.png), [storage next leaf](../../output/field-panels/storage-page-2-844.png), [blueprint](../../output/field-panels/building-1440.png), [counter](../../output/field-panels/counter-844.png).
- [Boat](../../output/field-panels/travel-boat.png), [inn option](../../output/field-panels/travel-inn-3-844.png), [guide](../../output/field-panels/guide.png), [settings](../../output/field-panels/settings.png), [recovery](../../output/field-panels/settings-recovery-844.png), [data](../../output/field-panels/settings-data-844.png), [AI unavailable](../../output/field-panels/ai-844.png).
- [Final flow recording](../../output/field-panels/videos/page@16e320e04d1088476bfe4440e23edbeb.webm). Earlier iteration evidence is ignored local output, not runtime art or accepted screenshots.

### Cleanup and remaining gaps

All dedicated browser contexts/Chromium instances close in `finally`. Dev launcher/Vite/esbuild85315/85344/85351, test API85300 and test production launcher/Vite/esbuild90308/90351/90352 are confirmed exited;5413/8113 are free. Task runner and temporary skill wrapper are removed/exited. Shared Codex/node_repl hosts and other projects are preserved because task ownership was not established.

The former manual-preview PIDs40152/48688/48711 were already absent at cleanup audit; this task did not signal them. Restored [manual preview5411](http://127.0.0.1:5411) with the original `output/world-ui-refinement/test.db`, cookie `realquest_ui30` and API8111. Retained API92298, npm92308 and Vite92331 for owner review. Root, proxied/direct API health return200 and served asset names match the final build. [Cleanup/health evidence](../../output/field-panels/cleanup.json).

Owner render approval, physical devices/Safari, native zoom, screen readers, expanded imported-recovery preview forms and long-run combat/departure acceptance remain unverified. Phone portrait is outside scope. No full expedition replay or old broad mouse pickup/HUD regression pass is claimed; the latter limitation is documented in task30. Existing scene/weapon symbols remain candidate art, without inventing new animated assets.
