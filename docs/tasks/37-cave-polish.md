# Web/Cocos cave presentation and feel

> 启动入口现统一为 `start.command`，本文中的入口名称已更新；其余历史参数、端口和验证记录保留当时状态，当前用法见 [本地说明](../cocos-local.md)。

User authorization (2026-10-17): gradually refine the local Web/Cocos UI, art and controls. Prior migration changes are uncommitted and preserved; starting hashes/status are in ignored `output/cave-polish/starting-state.json`.

## Slice and plan

1. Audit both running cave views. Replace checkerboard/proxy route blocks with shared, deterministic project-authored cave materials and real route objects. Improve the existing four monster silhouettes at the same world scale.
2. Render confirmed hit/recovery feedback and truthful target/range/cover/cast cues. Make target selection pure; align held attack and multi-pointer release semantics across clients. Keep menus, Life, blur and IME ownership.
3. Fit cave status/actions on desktop and short landscape; keep the player/action area clear. No new maps, enemies, rewards, audio dependency, platform integration or save migration.
4. Build both engines, test public inputs and failure/retry/pause with isolated saves, inspect actual screenshots/recordings and close owned automation resources. Keep a manual preview only if healthy.

Visual thesis: an old moss-edged stone shelter with quiet warm lamps, worn walkable rock, distinct creature silhouettes and readable amber danger cues.

Content hierarchy: player and active tell → selected enemy/confirmed damage → usable route object → compact status/actions. The cave is the visual anchor; no new dashboard or large central toast.

Interaction thesis: a short confirmed hit glint/number, server-timed anticipation and cast progress, and stable press/hold targets. Reduced motion keeps static outlines/numbers without bobbing or travel. No screen shake, predicted damage or invented rewards.

Acceptance and provenance evidence to be recorded after actual verification. Owner visual approval remains open; this treatment is scoped to caves and their entry/route objects.

## Implemented scope

- `shared/game/caveArt.ts` and `caveView.ts` are canonical, engine-free presentation only. They draw deterministic worn stone/moss/shelter/lamp materials, real route objects and distinct slime/bat/beetle/guardian silhouettes; expose pure live/cyclic targeting, cover/range/safe-entry hints, server cast timing, actual telegraphs and confirmed-only feedback. No map, collision, damage, cooldown, drop, reward, balance or save-schema changes.
- Web adapters: `frontend/src/game/cavePaint.ts`, `cave.ts`; persistent hold/multi-pointer ownership in `components/CombatPanels.tsx` and `game/GameCanvas.tsx`; scoped `cave-polish.css`, imported last in `main.tsx`. Target click now selects without attacking. Attack repeats while held across receipts; release/cancel/blur adds no pulse. Multi-touch releases only its pointer. Compact cave HUD removes duplicated identity/status and keeps direct Life/navigation. Short landscape uses the target line for boss HP so a central meter does not hide the actors.
- Cocos adapters: `assets/scripts/cavePaint.ts`, `combatView.ts`, `ui/combatDock.ts`, plus scoped `Bootstrap.ts`/`platform.ts` wiring. Stable native press targets survive receipt-driven HUD redraws; target/T, held attack, cast/cooldown/soup states align with Web. The confirmed native Label layer sits above the world and below HUD using the actual world's sibling index (Canvas also contains a camera). Numbers stay16CSSpx above silhouettes; reduced motion disables bob/lift/fade while retaining cues.
- `sync.mjs` produces12 code modules and52 unchanged PNGs; `asset-bindings.json` and generated core/metas updated. `test-cave-view.mjs` covers public pure behavior, and `frontend/scripts/cave-polish.mjs` runs both real engines. Existing baseline hashes still protect396 original sources plus seven extracted helpers' semantics. Exactly four original Web files have explicit task37 presentation exceptions in the preservation contract.
- Launcher/build defaults now use `web-cave-polish/web-desktop`, API8130/Cocos5431, optional Web5430. `run-preview.py` owns all three processes, refuses occupied/distinct-port conflicts and uses only `output/cave-polish/local-preview.db`. Original Web launcher stays intact. READMEs, shared-core docs, design checkpoint and art provenance are updated.

## Artwork and provenance

All new art is original project-authored code-native geometry, not external raster artwork: chipped stone slabs, moss seams, warm safe shelter/lamp niches, entrance/gate/stair/ladder/deep-route bindings and four creature families. `caveArt.ts` is the reproducible source; the Cocos binding manifest records exact source/generated code hashes. Web ground renders at2 source pixels/world unit and preserves native-scale actors; neither client enlarges tiny sprites to fake detail. Creature idle poses are discrete6Hz, static under reduced motion. All text stays native Chinese.

No bitmap, font, audio, download, third-party pack, paid asset or image-generation input was added. The52 copied Cocos PNGs remain byte-identical,2,199,403bytes. The existing156-image source/runtime audit passes. Other Cocos item glyphs, non-cave grounds and two travel-resident shapes remain provisional; this does not claim full Web visual parity or owner approval.

## Environment and commands

Existing npm/frontend lockfile, React19/Phaser3.90/Vite6, Node22.23.2; backend `.venv`/`requirements.lock`, existing Alembic002 schema (no pyproject); official Creator3.8.8 in ignored `output/cocos-tools/CocosCreator.app`. No dependency changes. Creator's success exit36 is normalized to0 by the build wrapper.

Commands actually used (repository root unless noted):

```sh
node clients/cocos/tools/sync.mjs
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/build.mjs web-desktop
node clients/cocos/tools/test-core.mjs
node clients/cocos/tools/test-cave-view.mjs
node clients/cocos/tools/check-baseline.mjs
# frontend/: npm run build
# backend/: .venv/bin/python -m pytest -q tests/test_combat.py
/Users/zilong/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 tools/audit_inventory_assets.py
node frontend/scripts/cave-polish.mjs
# Supplied develop-web-game frame client, adapted for local Playwright import,
# engine-ready/start/isolated fixture, compositor screenshot and finally cleanup:
# 10 right +6 idle frames, two iterations per engine.
# frontend/node_modules/.bin/prettier --check <changed presentation files>
git diff --check
```

- Genuine Creator Web build and actual engine declarations/64 bindings pass. Web production build passes with the existing large-chunk warning.11 durable core groups, new cave presentation assertions,396 protected sources +7 extraction checks pass.26 relevant backend combat tests pass with the existing Starlette/httpx deprecation warning; the retained soup interruption/pause/limit test covers failed consumption separately from a successful safe drink.156-image audit passes.
- Automation uses API8130/Web5430/Cocos5431 with **only `output/cave-polish/test.db`**, schema002 and cookie`realquest_cave_polish`. Each browser creates its own guest; SQL fixtures update only that returned save ID. Normal owner DBs, previous preview DBs and original player data are untouched. Prepared gear/soup/full100 stats/approach positions are prerequisites, not earned possessions. Gallery-only floor/guardian phase/HP fixtures explicitly test presentation, not boss outcomes.
- Actual inputs select/cycle without attacking or spending, hold two staff hits against an initially full-health slime, obtain exactly one gel/+2gold, replay the same request ID/sequence after a deliberately lost committed reply, then stop without a release hit. Actual walking/spark/safe soup checks cast progress,12damage/cooldown/one consumption; panels and blur pause/clear inputs; retreat preserves loot. DPR2 touch checks diagonal input, one-finger/full release and held attack. Desktop1920×1080/1440×900/1024×768 and landscape844×390/740×360 are checked in both engines. Native bounds are supplemented by personally inspected real renders, not treated as visual proof alone.
- Fixed issues found in review: Cocos feedback was behind the ground because Canvas has a camera sibling; short Web boss meter obscured actors; pointer release previously created an extra Web click pulse; clicking a Web enemy previously attacked despite its selection caption. The test was corrected to drink in the safe entrance (combat correctly interrupts soup) and to approach beside the clickable exit (clicking the nearby exit correctly opens its panel). Position assertions allow subpixel render interpolation while checking public stopped movement.

## Evidence and remaining scope

Ignored artifacts live under `output/cave-polish/`: starting hashes/status, six before captures, final flow/layout/four-family/telegraph/touch captures, `web-flow.webm`/`cocos-flow.webm`, `result.json`, logs, frame-client states/screenshots and launcher lifecycle evidence. Representative captures: `web-confirmed-hit.png`, `cocos-confirmed-hit.png`, `*-floor-2.png`, `*-floor-3.png`, `*-boss-sweep.png`, `*-layout-740.png`, `*-soup-cast.png`. Screenshots show a candidate, not an owner-approved reference.

Physical devices, Safari/native focus/IME/screen readers/text scaling, long sessions, production weak-network performance and platform/AppID release gates remain unverified. Existing functional migration evidence for all five full-health floors is task36; this presentation task does not claim a newly earned whole chapter. Broader item artwork, travel NPC art, non-cave terrain and unrelated screen treatments need their own coherent slice and visual checkpoint. No audio/screen shake or new mechanics were added. No commit, push, deploy or platform-account action.


Final browser result: **16 behavior groups/42 captures** pass, zero unexpected page/console errors. Exactly two deliberately aborted committed replies (one per engine) are reported separately as expected network errors and replay identical IDs/sequences. Four additional supplied frame-client captures (two per engine) show one canvas/actual cave movement and no error artifacts. Both final recordings are retained. Personally reviewed both before/after combat/landscape views, confirmed numbers, cast/soup states, four creature silhouettes/guardian shot/sweep, final short layouts and the supplied frame screenshots. Build success alone was not used as render acceptance.

Launcher lifecycle check on5432/5433/API8133 passes: all three HTTP checks200, launcher3551 exited0 and its verified children3553/3554/3555 exited; those listeners are gone. Final manual handoff identities/cleanup are recorded below.


## Final handoff and cleanup — 2026-10-17 11:56 CST

- Verified test API99229/8130, Web proxy99242/5430 and Cocos proxy909/5431 by PID/start/parent/cwd/args/listeners, then stopped normally through owned sessions93183/37174/31148. All exited0; PIDs and listeners were confirmed gone before handoff. The test database is preserved only as evidence.
- Manual dual preview retained via `./start.command --web-port 5430`: launcher3689, API3691/8130, Cocos3692/5431, Web3693/5430, exec session22218. It uses **only `output/cave-polish/local-preview.db`**. Both roots, both proxied health checks and direct API health return200. Ctrl+C in the owned launcher stops its three children. Normal owner data and old preview databases remain intact; old5426/8126 listeners/PIDs were already absent when this task started.
- All owned automation browsers/contexts, video encoders, frame/probe/test/Creator/Node runners exited; final process inspection found no owned browser/build/test runner. Temporary wrappers, stale failure snapshots and redundant raw recordings were removed. Canonical6MB Web/12MB Cocos recordings,42 final captures, six before captures, four frame captures, results/logs and provenance remain ignored. `handoff.json` and `launcher-result.json` record exact runtime evidence.
- Shared/unattributable Oct16 Node/node_repl/Playwright MCP/artifact hosts and the user's editor were preserved; they are not safely attributable to this completed task. No broad process-name kill was used. A representative Cocos guardian render was queued in this chat's file panel for visual review; no automated browser was retained.
- Final formatting, Python launcher syntax, asset audit and Git diff checks pass. No commit, push, deploy or original-player save write.
