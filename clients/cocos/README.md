# RealQuest Cocos local prototype

Independent **Cocos Creator 3.8.8** project. Original React/Phaser Web pages, launcher, server rules and player databases remain available. Current village/interior UI/art/feel: [task38](../../docs/tasks/38-village-interior-polish.md); cave evidence: [task37](../../docs/tasks/37-cave-polish.md); functional implementation: [phases4–5](../../docs/tasks/36-cocos-features-combat.md); network/shared-world baseline: [phases2–3](../../docs/tasks/35-cocos-shared-world.md); initial baseline: [phases0–1](../../docs/tasks/34-cocos-local-spike.md).

Supports village movement/collision and click-to-walk; five original building enter/exits and inn; existing crossing/mountain/city locations and server-quoted travel; gather/plant/harvest; storage/rest; scheduled NPC dialogue/topics/gifts/help; story quests/marker navigation; server-priced trades/orders; crafting/building upgrades; weapons/equipment/spark; inventory/quick viewing; direct Life study tasks/plans/timer/manual records/history/Noah commissions and explicit growth. Five-floor combat uses server-sequenced intentions, targeting/attacks/spark/soup, real telegraphs, stairs/platform rest/safe retreat and permanent gate opening. No client-authored damage, rewards or accelerated real time. Advanced Web-only AI/calendar/training conveniences and full visual parity are not claimed.

## Build and run

Use official Creator3.8.8. This workspace has a portable editor under ignored `output/cocos-tools/CocosCreator.app`; it is a local tool, not a distributed dependency. Node, TypeScript and Playwright reuse the existing frontend installation; Python reuses `backend/.venv` and its locked dependencies.

```sh
# Repository root
export COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator"
node clients/cocos/tools/sync.mjs
node clients/cocos/tools/check.mjs
node clients/cocos/tools/build.mjs web-desktop
./start-cocos.command --web-port 5430
```

Open Cocos at `http://127.0.0.1:5431` and Web at `http://127.0.0.1:5430` (run `npm run build` in `frontend/` first). Both use isolated API8130; each client keeps its own guest unless you explicitly continue the same journey using a recovery credential. The launcher refuses occupied ports and terminates only its own children on Ctrl+C. Optional `--port 5433 --api-port 8133 --web-port 5432` selects different ports. Without `--web-port`, it serves Cocos only.

The launcher uses **only `output/cave-polish/local-preview.db`** with existing Alembic migrations, separate from the automated fixture database and original owner data. Original `start.command` stays unchanged. Current handoff/cleanup: task38. The database path deliberately retains task37’s local sample so existing browser sessions and saves continue; `--database output/my-preview.db` can explicitly select another local sample.

Builds go to `web-village-polish/web-desktop/` (ignored), controlled by `REALQUEST_COCOS_BUILD`. The build script sets `buildPath` explicitly; Creator exit36 means success. Do not rebuild a directory while someone uses that served preview.

## Sessions and save compatibility

The standalone client uses server-issued bearer guests and never replaces the Web HttpOnly cookie. Phase1's `realquest-cocos-guest-v1` token migrates to a token/save-ID record. Invalid credentials and failed device storage do not silently start a new journey.

Commands are serialized and persisted before sending. Each operation has its own save-bound durable key, so another tab cannot overwrite its retry identity. Two transport failures leave an explicit pending state; **重连并确认** or reload replays the same ID. Rule rejections preserve resources and permit a deliberate new attempt. Another tab's save switch blocks this page's old mutations. This is online-first; offline play and background reward settlement are not implemented.

**存档 → 选择旅程凭证 → preview → 确认接续** accepts the existing `realquest-recovery` version1 file from Web. Exporting a Cocos credential also works in the original Web recovery UI. Switching away from an existing journey asks for its credential export first. Credentials grant access to a save and should be kept private; no credentials appear in screenshots or the render hook. Unknown pending operations must be resolved before switching to a different save. A credential can restore an expired session to the same save and resolve its pending operation.

Both clients must connect to **the same backend/database**. A credential from another local database or server cannot move that server's records. The default local sample deliberately does not attach to `backend/realquest.db`. Numerical `/api/export` JSON remains read-only. No schema migration, balance import or automatic player merge was introduced.

For development against an already-updated API, `tools/serve.py --port 5431 --api-port <port> --build web-village-polish/web-desktop` can proxy it. Configure its allowed origin explicitly. Point only to a backend/database you intend to use; this configuration was tested with the isolated shared test database, not the owner's real save.

## Shared sources and artwork

Canonical engine-independent modules live in [`shared/game`](../../shared/game/README.md); Web entry points stay compatible. Cocos copies are generated because Creator's importer needs assets-local scripts. `sync.mjs` and `asset-bindings.json` record exact source/output hashes. No hand-maintained parallel rules.

Cocos binds64 PNGs/6,200,961bytes and14 generated code modules. Existing artwork is copied byte-for-byte; seven reproducible terrain/floor/rug derivatives add3,940,084bytes. `tools/build_local_scene_art.mjs` renders the original Web scene functions with existing sprites, deduplicates textures, retains separate furniture and records input/layout/PNG hashes in `docs/art/local-scene-art-v1.json`. Derivatives live outside the Web bundle. No new image-generation request, external pack, font or audio. Room furniture/actors retain their source pixel ratios; scenery uses the existing world coordinates. The cave has a shared original stone/moss material, route-object and four-monster treatment (task37). The village and six existing rooms now share the established fine materials/layouts with Web; actual facade/furniture hits, safe approach/stop cues, tree occlusion and source-scale walking poses are supported. Other grounds, farming/advanced item details and the two travel residents' temporary native shapes remain provisional; full original Web artwork parity is not claimed.

## Verification

Current village/home suite: `node clients/cocos/tools/test-local-scene.mjs` and `node frontend/scripts/village-polish.mjs` (`--engine=cocos` supports a focused rerun). Browser fixtures require API8134 using **only `output/village-polish/test.db`**, cookie`realquest_village_polish`, origins5434/5435, Web5434 serving `../../output/village-polish/web-build` and Cocos5435 serving `web-village-polish/web-desktop`. Build the isolated Web snapshot with `npm run build -- --outDir ../output/village-polish/web-build --emptyOutDir` from `frontend/`. Existing Alembic commands run from `backend/`. These ports/databases are separate from the manual sample. Exact commands, fixture limits, preserved saves, screenshots/recordings and cleanup are in task38.

Current cave presentation suite: `node clients/cocos/tools/test-cave-view.mjs` and `node frontend/scripts/cave-polish.mjs`. The browser suite requires a separately migrated API8130 using **only `output/cave-polish/test.db`**, cookie`realquest_cave_polish`, origins`http://127.0.0.1:5430,http://127.0.0.1:5431`, Web5430 (`../../frontend/dist`) and Cocos5431 (`web-village-polish/web-desktop`) proxies. Stop the manual preview before using those ports. Never point the fixture suite at `local-preview.db` or owner data. Commands, prepared fixtures,16 groups/42 captures and cleanup: task37.

The following phase4–5 suites retain their historical build/ports/database; build with `REALQUEST_COCOS_BUILD=web-phase45` before rerunning them. They are not the current launcher defaults.

```sh
node clients/cocos/tools/test-core.mjs
node clients/cocos/tools/test-features.mjs
node clients/cocos/tools/check-baseline.mjs
# Start a separate API8126 using ONLY output/cocos-phase45/test.db, distinct cookie and allowed origin5426.
# Never run these SQLite fixture tests against your normal preview or player database.
python3 clients/cocos/tools/serve.py --port 5426 --api-port 8126 --build web-phase45/web-desktop
node clients/cocos/tools/smoke-phase45.mjs
node clients/cocos/tools/smoke-depths.mjs
node clients/cocos/tools/smoke-landscape.mjs
# Existing checks: frontend/: npm run build
# backend/: .venv/bin/python -m pytest -q
```

These browser suites create fresh guests and update only their own save IDs in the asserted test.db. The main suite covers actual first-story/first-cave progression, lost claim/rejected purchase, Noah settlement and direct Life. Depths uses explicitly prepared grown-character200 HP/stamina/resources/abilities/position and ready deadlines, then real UI trades/upgrades/gear/storage/spell, five full-health floors and gate opening. It never seeds hits, monster deaths or combat rewards. Landscape checks desktop/short-landscape geometry and DPR2 real multi-touch/input ownership. Browsers close in finally; screenshots/results stay ignored under `output/cocos-phase45`. Earlier phase23/session scripts retain their original ports/build expectations and historical evidence; do not point them at a handoff database.

## Platform gates

No platform projects/AppIDs/devices are available yet. Platform verified login, account linking, host file adapters, API-domain configuration, developer-tool import and physical-device validation remain deferred. Build commands require a real AppID. Bilibili needs its compatible official plugin. Android needs SDK/NDK/JDK and package/device verification. The local guest adapter is not platform account verification.

Desktop and phone landscape are the local layout targets. Portrait, Safari, screen readers/native text scaling, physical safe areas, production payload/weak-network/device performance and long-session endurance are not certified. Owner actual-render/feel review remains open.
