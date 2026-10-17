# Local village and interior polish

User authorization (2026-10-17): continue Web/Cocos village/interior UI, art and control refinement. Preserve all prior uncommitted migration/cave work, player data and authoritative rules. Starting hashes/status: `output/village-polish/starting-state.json`.

## Coherent slice and plan

1. Compare actual village, home and workshop renders. Prioritize village road → home entrance → storage/reading/rest context → return. Reuse the established fine-village and fine-interior artwork; no new visual family.
2. Reproducibly render the existing Web terrain/floor/rug code and existing sprite layout for Cocos, replacing temporary road/floor blocks without changing geography. Keep furniture separate for depth/feedback. Other existing rooms may consume the same established material port; no unrelated panel redesign.
3. Align Cocos facade/furniture hit areas and safe click-to-approach with Web. Show a quiet route endpoint/trail, nearby-object focus and actual pending/result feedback; Escape/manual movement/blur cancels intentions. Refine compact HUD around the room on short landscape in both clients.
4. Build genuine engine targets, test actual door/storage/reading/pause/retry/persistence/touch flows using isolated saves, inspect desktop/landscape captures and recordings, and clean owned automation resources. Preserve the current manual preview until replacement is verified.

Visual thesis: a lived-in woodland path leading to warm oak, linen and a small usable reading corner; the world and active object remain the main visual anchor.

Content hierarchy: player and selected route → nearby usable object → compact identity/time/action → secondary menus. No extra inventory or achievements for decoration.

Interaction thesis: a restrained selected route/destination mark, stable object brackets and server-confirmed chest/book feedback. Door transitions preserve spatial intent, no ordinary camera shake; reduced motion keeps static cues. No new map, mechanic, currency, home tier or save format.

New actual renders remain candidates pending owner review; do not extend a new panel design to unrelated screens.


## Implemented flow and files

- `shared/game/localScene.ts`: pure reachable approaches using the existing pathfinder and65-unit interaction contract; common local camera; route endpoint/trail/focus marks; existing-sheet idle/walk/reduced-motion frames. No position teleport, balance rule or time settlement. `sceneLayout.ts` is generated, not hand-maintained gameplay data.
- `tools/build_local_scene_art.mjs`, `assets/derived/local-scenes/*.png`, `docs/art/local-scene-art-v1.json`: execute the actual existing Web village/ground/interior functions offline with real source image dimensions. Emit seven unique PNGs and separate sprite placement/anchor/depth/response data. Old Web source art stays unchanged; no screenshot crop or invented asset path.
- `clients/cocos/assets/scripts/localSceneView.ts`: original village routes/banks/props and six existing fine rooms; source-scale sprites, independently sorted furniture, measured rugs, real facade/furniture hit areas, foreground-tree opacity and native interaction marks. Open chest uses the actual open frame's height at the same foot anchor, rather than squeezing it into the closed box. Source PNGs are never edited.
- `clients/cocos/assets/scripts/Bootstrap.ts`: connect the renderer, source-scale foot anchors, half-step local camera/roof framing, reachable click-to-approach and one actual interaction on arrival. Manual directions, stop/Escape, mode change and blur clear intentions. An input epoch prevents a delayed position reply from opening a canceled panel. Panels retain input ownership and authoritative pause/serial commands. Actual scheduled NPC movement plays existing directional frames; released players return to idle. Reduced motion keeps stable direction poses/route marks. The local world header includes actual day/time/resources; target/action captions explain what will happen, ordinary world messages expire, and persistent errors stay visible. The cave retains its prior action/hint spacing.
- `clients/cocos/assets/scripts/ui/storage.ts`: one selected item across actual backpack/home containers, existing item art, explicit one-item store/withdraw, truthful zeros/disabled actions, selected-item counts and paging. Page changes select their first actual item; stale entry copy no longer replaces the selected counts. Uses the existing `PanelHost` and server command queue, not a parallel storage model.
- `frontend/src/game/WorldScene.ts` adds shared route marks only for village/home; `local-scene.css` and its final import in `main.tsx` compact that slice's HUD and put the action prompt to the right of the doorway. The original room/village art and existing storage/study/sleep interfaces remain available. Character/XP details remain in the existing dossier; no data is hidden from the model or changed.
- Cocos core copies/PNG copies/metas and `asset-bindings.json` are generated by `sync.mjs`. Valid editor-generated metadata is now preserved rather than rewritten on every sync. The52 original PNG metas were restored only after verifying their captured starting hashes exactly equal HEAD; no pre-existing user edit was replaced. New PNG importer metadata was created by the real Creator importer.
- New checks: `test-local-scene.mjs`, `frontend/scripts/village-polish.mjs`, package scripts and asset audit support. Historical depth/landscape scripts now select an actual storage item before transfer and respect the last page's disabled Next control. Those entire historical phase4–5 suites were not rerun here; their previous evidence stays in task36.
- Build/preview defaults now use `web-village-polish`; `run-preview.py` retains `output/cave-polish/local-preview.db` by default for local save continuity and accepts an explicit `--database` for separate samples. Root/Cocos/shared READMEs, design/art/checklist/baseline/progress docs are updated. No backend code/migration, dependency version, normal Web launcher or player-data reset.

## Provenance and payload

The original owner-approved fine-village direction and current fine-interior source family are reused. Exact underlying generated-source prompts, cuts, licenses and hashes remain in `village-art-v2.json`, `detail-art-v3.json` and `market-art-v1.json`. No new image-generation request, download, external/paid pack, font or sound.

Seven reproducible derivatives total3,940,084bytes: one3840×2560 terrain, one960×736 floor and five rug sizes. Canonical derivatives stay in `assets/derived/local-scenes/` outside the Web bundle, with exact input/script/layout/PNG hashes. `--check` rerenders and compares every output; the original Web render functions and source PNGs remain byte-identical. Furniture and Chinese labels are not baked into terrain.

Cocos now binds64 PNGs/6,200,961bytes plus14 code modules (78 total bindings). Existing52 PNGs are unchanged; newly used original crates/flowers/chest/rune/backpack are copies, not newly authored possessions. Nearest-neighbor/untrimmed metadata and original two-source-pixels/world-unit scenery remain explicit. This is local desktop quality work, not a miniature-platform payload/VRAM optimization claim. Farming/advanced item glyphs, travel residents, non-local grounds/night presentation and release/device gates remain separate gaps.

## Environment and reproducible commands

Existing npm/package-lock, React19/Phaser3.90/Vite6, Node22.23.2; backend Python3.14 `.venv`/`requirements.lock.txt`, Alembic002; official Creator3.8.8 in ignored `output/cocos-tools/CocosCreator.app`. Reuse existing TypeScript, esbuild/Playwright and bundled Pillow; no new dependency. Creator exit36 is normalized to0 by the wrapper.

Commands actually used, repository root unless noted:

```sh
node tools/build_local_scene_art.mjs
node tools/build_local_scene_art.mjs --check
node clients/cocos/tools/sync.mjs
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
REALQUEST_COCOS_BUILD=web-village-polish COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/build.mjs web-desktop
node clients/cocos/tools/test-local-scene.mjs
node clients/cocos/tools/test-core.mjs
node clients/cocos/tools/check-baseline.mjs
# frontend/: npm run build -- --outDir ../output/village-polish/web-build --emptyOutDir
# backend/: .venv/bin/python -m pytest -q tests/test_game.py tests/test_daynight.py
/Users/zilong/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 tools/audit_inventory_assets.py --output output/village-polish/audit
node frontend/scripts/village-polish.mjs
node frontend/scripts/village-polish.mjs --engine=cocos
# Supplied develop-web-game client:10 right/6 idle frames ×2 for each engine;
# adaptations: local import, engine-ready/start/isolated room fixture,
# compositor screenshot and finally cleanup.
# frontend/node_modules/.bin/prettier --check <new presentation/test files>
python3 -m py_compile clients/cocos/tools/run-preview.py
git diff --check
```

Test API8134 uses **only `output/village-polish/test.db`**, cookie`realquest_village_polish`, allowed origins`http://127.0.0.1:5434,http://127.0.0.1:5435`. Initialize existing migrations from `backend/`, then run uvicorn there with that `DATABASE_URL`. Root proxies: `tools/serve.py --port 5434 --api-port 8134 --build ../../output/village-polish/web-build` and `--port 5435 --api-port 8134 --build web-village-polish/web-desktop` (full script path `clients/cocos/tools/serve.py`). The manual5430/5431/API8130 preview stayed live while candidates used separate output directories; no served handoff directory was rebuilt during owner use.

Every browser creates its own guest; fixture SQL updates only that returned save ID in the asserted test.db. Fixtures prepare location/approach position, daytime world clock and optional guide dismissal; they do not grant inventory, achievements, damage, drops or storage outcomes. Actual enter/exit, transfers, reading and short-rest settlement use UI/server commands. The15:00 NPC and canopy/cave views are explicit render fixtures, not naturally earned progression or accelerated reality time. Web retains its existing frame hook; Cocos frame stepping only waits, and settlement stays on server wall time.

## Actual verification and evidence

- Both genuine builds pass; actual Creator declarations/78 source bindings pass. Web retains the existing large-chunk advisory.87 relevant game/daynight backend tests pass (existing Starlette/httpx deprecation). Pure local-scene tests cover all real home/furniture/building approaches, walkability/map immutability, camera, motion/reduced-motion, marks and every actual sprite binding.11 durable core groups and395 protected original sources+7 extracted-helper semantic checks pass. Exactly one additional original Web source (`WorldScene.ts`) is explicitly allowed for this scoped presentation extension; prior exceptions remain recorded.163-image audit and byte-reproduced derivative checks pass.
- Main two-engine suite:20 groups/40 captures, zero unexpected errors. Subsequent Cocos rerun:11 groups/21 captures, including actual scheduled resident frames, idle release, empty selection and page behavior; zero unexpected errors. The combined final flow evidence contains21 distinct engine/behavior groups and41 unique captures. One deliberate422 and one lost committed reply per engine are recorded separately. Rejected storage changes nothing; retry replays the same request ID, deposits exactly one seed and withdraws it back to the original6/0 totals. Reload preserves saved location/counts.
- Actual façade click walks/enters once; Escape stops a selected route; furniture hit zones open storage, reading and bed; reading/panels own movement/world clock; actual short rest advances the original30 game minutes; real doorway exit and subsequent reload work. Manual directions and blur clear route/held state. Desktop1920×1080/1440×900/1024×768 and landscape844×390/740×360, DPR2 touch walking/store/withdraw and reduced motion are checked.
- Five final targeted checks pass: reduced-motion scheduled movement uses static direction poses; real canopy opacity reveals the player; empty/paged storage disables invalid transfers and all native storage targets are at least44px/in bounds; acknowledged world copy expires; cave hint/action spacing retains its original separation. A separate delayed-move probe confirms Escape prevents a late furniture panel from opening and preserves6/0 seed counts. No unexpected errors.
- The supplied frame client passes two short-input iterations per engine with actual room movement, one canvas and no error artifacts; four screenshots/text states were personally inspected. Both original/completed village/home/short views, storage (normal/rejected/confirmed/depleted/touch), all six rooms, NPC/canopy/reduced motion and cave compatibility images were opened and reviewed. Screenshots/builds alone are not claimed as interaction proof.

Ignored evidence: `output/village-polish/starting-state.json`, `baseline.json`/eight before captures, `result.json`, `result-cocos.json`, `final-probe.json`, `pending-probe.json`, logs, `frame-web/`, `frame-cocos/`, `web-flow.webm` and `cocos-flow.webm`. Representative final views: `cocos-returned.png`, `cocos-room-home.png`, `cocos-storage.png`, `cocos-touch-storage.png`, `web-layout-740.png`, `cocos-resident-walking.png`, `cocos-canopy.png`. Reference status is candidate; no owner actual-render/feel approval is implied.

## Remaining boundaries

This completes the home interaction chain and ports the existing material family across existing rooms; it does not finish every village art gap. Native farming detail/advanced item icons, travel-resident artwork, non-local/night scenes and remaining advanced Web conveniences stay follow-ups. No new furnishing placement/tier, map, economy, social rule or AI integration.

Physical devices/Safari, native focus/IME/screen readers/text scaling, actual native safe areas, long sessions, production weak-network/load and miniature-platform payload/VRAM/performance remain unverified. Portrait phone review is outside scope. Owner render/feel checkpoint remains open before a new treatment spreads to unrelated screens. No commit, push, deploy or platform account action.

Launcher lifecycle test on5436/5437/API8136, separate `output/village-polish/launcher-check.db`: all200; launcher18616 exited0 and its children18618/18619/18620 were verified gone. Current handoff/cleanup identities are appended below after switching the manual preview.


## Final handoff and cleanup — 2026-10-17 12:46 CST

- Final review found the desktop movement hint insufficiently contrasted directly over grass. Both local clients now give that hint an opaque pine backing; the changed opaque UI pairs have minimum4.97:1 and the hint pair10.23:1 (`palette-contrast.json`). This is a scoped palette check, not certification of every old textured panel. Both final builds and two further supplied frame iterations per engine pass; the final four captures in `frame-web-final/` and `frame-cocos-final/` were opened and inspected. All six Cocos room views were also reviewed.
- The52 original PNG importer files exactly match their captured starting bytes after the real Creator import. `sync.mjs` now preserves valid editor-generated metadata/vertices instead of creating unrelated changes. Genuine type/binding/build and final diff checks pass.
- Initial test API7348/8134 and proxies10580/5434,10581/5435 were verified by PID/start/parent/cwd/args/listeners and stopped normally via their owned sessions. Previous manual launcher3689 and children3691/3692/3693 were verified and stopped via session22218 before rebuilding its served Web output. Their PIDs/listeners were confirmed gone. The original local preview DB was backed up as `output/village-polish/previous-preview-backup.db` and reused; no normal player DB or prior preview save was reset.
- A final isolated launcher21459 (children21461/21462/21463) served the last contrast/frame checks on5434/5435/API8134 using the asserted test.db. It exited0 through session49433; every owned child and test listener was verified gone. The earlier independent lifecycle launcher18616 also exited0 with all children gone. No browser was retained.
- Final manual preview deliberately retained: **Web http://127.0.0.1:5430**, **Cocos http://127.0.0.1:5431**, API8130. Launcher21626, API21637, Cocos proxy21638, Web proxy21639, exec session46096. It serves `frontend/dist` and `web-village-polish/web-desktop`, using the same `output/cave-polish/local-preview.db` and cookie as the preceding handoff. Both roots, both proxied health checks and direct API health return200; previous IDs are preserved. `handoff.json` records exact checks/PIDs. Ctrl+C in this owned launcher stops its three children. Refresh an already-open client to load the new art.
- All owned browser/encoder/frame/probe/test/Node/Creator runners have exited. Temporary wrappers, stale failure files and redundant raw videos were removed; canonical9.2MiB Web/15.3MiB Cocos recordings, results, captures and source audit evidence remain ignored. Shared application Node/node_repl/Playwright/artifact hosts cannot be attributed safely to this completed task and were preserved; no broad process-name termination was used. A final Cocos room image was queued in this chat's file panel for review.
- Cocos-only derivative textures are absent from the Web bundle. Final `git diff --check` and395+7 preservation checks pass. No commit, push, deploy or platform-account change.
