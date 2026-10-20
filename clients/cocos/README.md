# RealQuest Cocos client

Cocos Creator **3.8.8** is the only implementation, playtesting and acceptance client as of 2026-10-20. The React/Phaser application and two-client comparison tooling have been removed after relocating the required artwork and offline paint/test sources.

Run commands from the **repository root**, using Node22/npm10 and the locked root dependencies. No separate client npm installation is required.

```sh
npm ci
npm exec -- playwright install chromium
npm run cocos:doctor -- --browser
export COCOS_CREATOR="/path/to/CocosCreator.app/Contents/MacOS/CocosCreator"
npm run build
./start.command --check
./start.command
```

The default release is `web-current/web-desktop`; preview is localhost5443/API8143 with database `output/cocos-local/local-preview.db` and cookie `realquest_cocos`. Stop a preview before rebuilding the same folder, or select a separate `REALQUEST_COCOS_BUILD`. The preview serves an existing package without hot reload. Ctrl+C stops only its owned API/proxy processes.

## Sources

- `assets/scripts/Bootstrap.ts`: client entry, world and input lifecycle.
- `assets/scripts/ui/`: panels and the shared Hearthwood theme.
- `assets/scripts/core/`: generated copies of canonical `shared/game/` sources.
- `assets/resources/`: generated runtime bindings; canonical images are in `assets/runtime/` at the repository root.
- `tools/scene-art/` at the root: engine-independent offline Canvas paint/layout sources.
- `asset-bindings.json`: source/target hashes; importer metadata retains stable UUIDs, nearest filtering and full frames.

Edit canonical shared/art sources, run `npm run cocos:sync`, review changes and refresh the source inventory explicitly with `npm run cocos:sources:write`. Never repair a stale build by rewriting its receipt. Source packs, SDKs, databases and private credentials are not client bundle inputs.

## Checks

```sh
npm run check
npm test
npm run test:browser
npm run cocos:test:browser -- --build web-current/web-desktop --suite inventory,life
npm run cocos:test:startup -- --build web-current/web-desktop
npm run cocos:art:check
```

The browser runner prepares independent databases/cookies and random loopback ports for28 Cocos suites, and verifies browser/service cleanup in finally. It does not need a manually running preview and does not accept a player database. Current source ownership has no legacy-client or Git-history preservation gate.

Real engine type checks and builds need the configured official Creator SDK. Development builds are available through `cocos:build`; `npm run build` creates a release with debug/sourceMaps disabled and MD5 caching enabled. Optional mini-game targets remain explicit Creator builds and require the owner's platform AppID.

See [root setup](../../README.md), [local configuration](../../docs/cocos-local.md), [delivery](../../docs/cocos-delivery.md), and [retirement/validation report](../../docs/tasks/109-cocos-only-client.md). Physical devices, system accessibility and actual remote SDK CI/deployment retain their own validation scope; they do not require keeping a second client.
