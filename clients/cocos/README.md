# RealQuest Cocos local prototype

Independent **Cocos Creator 3.8.8** project. Original React/Phaser Web pages, launcher, server rules and player databases remain available. Current implementation/evidence: [phases2–3](../../docs/tasks/35-cocos-shared-world.md); initial baseline: [phases0–1](../../docs/tasks/34-cocos-local-spike.md).

Supports village movement/collision and click-to-walk; five original building enter/exits and inn; existing crossing/mountain/city locations and server-quoted travel; gather/plant/harvest; storage/rest; scheduled NPC greetings; inventory/quick viewing; direct read-only Life summary. Full combat, advanced NPC/quest/economy panels and Life editing remain in the original Web. Cave saves can safely retreat without pretending combat has migrated.

## Build and run

Use official Creator3.8.8. This workspace has a portable editor under ignored `output/cocos-tools/CocosCreator.app`; it is a local tool, not a distributed dependency. Node, TypeScript and Playwright reuse the existing frontend installation; Python reuses `backend/.venv` and its locked dependencies.

```sh
# Repository root
export COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator"
node clients/cocos/tools/sync.mjs
node clients/cocos/tools/check.mjs
node clients/cocos/tools/build.mjs web-desktop
./start-cocos.command
```

Open `http://127.0.0.1:5422`. The launcher owns API8122 and proxy5422, refuses occupied ports and terminates its own children on Ctrl+C. Optional `--port 5424 --api-port 8124` uses different ports without touching existing processes. It uses **only `output/cocos-phase23/local-preview.db`**, with existing Alembic migrations. Original `start.command` stays unchanged. The current handoff runtime and cleanup are recorded in task35.

Builds go to `web-phase23/web-desktop/` (ignored), controlled by `REALQUEST_COCOS_BUILD` for the output root. Creator's `name` option does not select the output directory; the build script sets `buildPath` explicitly. Creator exit36 means success. Do not rebuild a directory while someone is using that served preview.

## Sessions and save compatibility

The standalone client uses server-issued bearer guests and never replaces the Web HttpOnly cookie. Phase1's `realquest-cocos-guest-v1` token migrates to a token/save-ID record. Invalid credentials and failed device storage do not silently start a new journey.

Commands are serialized and persisted before sending. Each operation has its own save-bound durable key, so another tab cannot overwrite its retry identity. Two transport failures leave an explicit pending state; **重连并确认** or reload replays the same ID. Rule rejections preserve resources and permit a deliberate new attempt. Another tab's save switch blocks this page's old mutations. This is online-first; offline play and background reward settlement are not implemented.

**存档 → 选择旅程凭证 → preview → 确认接续** accepts the existing `realquest-recovery` version1 file from Web. Exporting a Cocos credential also works in the original Web recovery UI. Switching away from an existing journey asks for its credential export first. Credentials grant access to a save and should be kept private; no credentials appear in screenshots or the render hook. Unknown pending operations must be resolved before switching to a different save. A credential can restore an expired session to the same save and resolve its pending operation.

Both clients must connect to **the same backend/database**. A credential from another local database or server cannot move that server's records. The default local sample deliberately does not attach to `backend/realquest.db`. Numerical `/api/export` JSON remains read-only. No schema migration, balance import or automatic player merge was introduced.

For development against an already-updated API, `tools/serve.py --port 5422 --api-port <port> --build web-phase23/web-desktop` can proxy it. Configure its allowed origin explicitly. Point only to a backend/database you intend to use; this configuration was tested with the isolated shared test database, not the owner's real save.

## Shared sources and artwork

Canonical engine-independent modules live in [`shared/game`](../../shared/game/README.md); Web entry points stay compatible. Cocos copies are generated because Creator's importer needs assets-local scripts. `sync.mjs` and `asset-bindings.json` record exact source/output hashes. No hand-maintained parallel rules.

All52 PNGs are existing art copied byte-for-byte with nearest-neighbor metadata;9 code modules are generated. No new raster art, fonts or external source packs. Room furniture/actors retain their source pixel ratios; scenery uses the existing world coordinates. Procedural grounds, landmark markers and the two travel residents' temporary native shapes are provisional; full original Web artwork parity is not claimed.

## Verification

```sh
node clients/cocos/tools/test-core.mjs
node clients/cocos/tools/check-baseline.mjs
# With the isolated test API8122 pointing ONLY at output/cocos-phase23/test.db:
python3 clients/cocos/tools/serve.py --port 5422 --api-port 8122 --build web-phase23/web-desktop
python3 clients/cocos/tools/serve.py --port 5423 --api-port 8122 --build ../../frontend/dist
node clients/cocos/tools/smoke-phase23.mjs
node clients/cocos/tools/smoke-session.mjs
node clients/cocos/tools/probe-resize.mjs
# Existing checks: frontend/: npm run build
# backend/: .venv/bin/python -m pytest -q
```

The browser suite creates fresh guests. Historical indoor/travel fixtures update **only their own save IDs** inside the asserted test.db. It checks native original-Web create/recovery, actual Cocos controls, idempotent lost-response/reload, server mutations, room/travel transitions, viewport resize and DPR2 touch. Browsers close in finally. Phase1's older smoke script is historical evidence for its older API contract; it is not the current acceptance command.

## Platform gates

No platform projects/AppIDs/devices are available yet. Platform verified login, account linking, host file adapters, API-domain configuration, developer-tool import and physical-device validation remain deferred. Build commands require a real AppID. Bilibili needs its compatible official plugin. Android needs SDK/NDK/JDK and package/device verification. The local guest adapter is not platform account verification.

Desktop and phone landscape are the local layout targets. Portrait, Safari, screen readers/native text scaling, physical safe areas, production payload/weak-network/device performance and long-session endurance are not certified. Owner actual-render/feel review remains open.
