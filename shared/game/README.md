# Engine-independent game core

`protocol`, `interaction`, `stamina`, `residents`, `villageIntro`, `appearances` and `navigation` are extracted from the existing Web implementation. The Web keeps compatible re-export files. Navigation accepts an explicit server timestamp; its Web wrapper obtains that timestamp from the unchanged Zustand store. No React, Phaser, Cocos, DOM or storage APIs belong here.

`features` supplies descriptive item/recipe labels, server-quoted growth commands, server-anchored timer display, stable record IDs and sequenced combat intentions. It never computes damage, settles rewards or advances server time.

`caveArt` supplies original deterministic world-coordinate drawing marks for cave materials, real route objects and four creature silhouettes. `caveView` supplies pure target/range/cover selection, actual server cast progress, authoritative telegraphs and confirmed-only feedback. Render adapters belong to each engine; these modules never change combat outcomes or saves. Reduced motion keeps static cues and numbers.

`client` defines the Cocos guest protocol, serial mutation queue, save/revision/session guards, durable request IDs and explicit recovery transitions. `clock` anchors server time to a monotonic clock. The Web's mature cookie/store lifecycle stays intact; sharing the protocol/helpers does not require replacing it.

Cocos Creator imports scripts inside its assets database, so `clients/cocos/tools/sync.mjs` generates tracked engine-local copies. Edit canonical modules here, then sync/check. The binding manifest checks both hashes. `check-baseline.mjs` verifies the extraction against the original revision; future behavioral changes need deliberate, tested updates to that preservation contract.

Network operations remain server-authoritative. An uncertain operation is replayed with the same request ID, including after reload. Per-request storage keys preserve independent in-flight operations from multiple tabs. Recovering the same save can replace an expired credential and settle its pending operation; switching to another save waits for confirmation of pending operations. Credential files identify server-side saves; numerical exports are never imported.

`localScene` provides reachable approach selection through the existing pathfinder, scoped camera/route/focus cues and existing-sheet motion frames (static under reduced motion). `sceneLayout` is generated data, never hand-edited: `tools/build_local_scene_art.mjs` executes the existing Web scene functions with real sprite dimensions and emits reusable Cocos terrain/rugs plus separate sprite placements. It changes no map, collision, save or gameplay rule. Source inputs, exact PNG/layout hashes and regeneration checks live in `docs/art/local-scene-art-v1.json`.


Cocos source ownership: `npm run cocos:sources` checks the current source/provenance inventory and residual Web path strings; `cocos:check` includes this guard before real engine types. After an intentional canonical edit, sync, inspect source/provenance changes, then explicitly regenerate with `npm run cocos:sources:write`. The inventory is generated evidence, not a second editable rules source. Policy and per-file consumers are in `docs/migration/cocos-source-{policy,inventory}.json`. Frozen original Web paint/assets/tests remain required inputs until a separate byte-preserving relocation; see task51.
