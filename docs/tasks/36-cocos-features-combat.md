# Cocos migration — phases 4–5

> 启动入口现统一为 `start.command`，本文中的入口名称已更新；其余历史参数、端口和验证记录保留当时状态，当前用法见 [本地说明](../cocos-local.md)。

User authorization: continue later migration stages, preserving the existing Web and allowing scoped UI improvements. Start: clean38bf6dd (prior phases committed by owner). No platform AppIDs/devices are available.

## Plan

1. Separate functional panels from the world controller. Reuse server views and canonical helpers for story quests, marker-only navigation, market/orders, crafting/upgrades, residents, equipment and growth.
2. Make direct Life access functional: study tasks/plans and server timer, manual records with explicit provenance, real commission history/cancellation and proximity-based Noah acceptance/settlement. No invented growth rewards.
3. Port the existing five-floor combat input/rendering contract: authoritative sequenced ticks, targeting/attacks/spell/soup, telegraphs, safe retreat, pause/blur/weak-network recovery, stone gate. No new combat rules or geography.
4. Verify genuine Creator/Web builds, backend/core tests, actual browser progression and failures/retries/persistence, desktop/landscape/touch screenshots. Preserve earlier manual previews with separate build output, ports and test DB.

Visual thesis: Hearthwood timber notices, linen reading leaves and moss actions; each function gets an appropriate composition and the world remains primary.
Content: pinned story notice/detail; shop goods and receipt; workshop blueprint; compact character abilities; practical Life input/timer; cave targeting and recovery.
Interaction: visible selection/hover/press/focus; meaningful pending/rejection/retry; stable text drafts and IME ownership; marker navigation never moves the player. Camera and telegraphs explain actual combat state, with no ornamental camera shake.

## Evidence

Local functional implementation and verification completed. Owner actual-render/feel approval remains open. Source assets, stable IDs, old Web and authoritative rules are preserved. Platform SDK/account/device work remains deferred.

## Implemented slice

- `shared/game/features.ts` is the canonical, engine-free descriptive layer: stable item/quest labels, recipe deficits, quoted growth commands with expected-investment guards, server-anchored timer display, UUID record identities and normalized/fractional combat intentions. The server alone validates/mutates inventory, growth, damage, time and rewards. `sync.mjs` generates the Cocos copy and verifies10 code +52 unchanged PNG bindings.
- `assets/scripts/ui/panels.ts` separates functional reading/actions from `Bootstrap.ts`. Quest notices have objectives/rewards/accept/claim/track and marker-only directions; market has server prices, quantities and dated finite orders; blueprints cover upgrade/plank/old counter actions; residents offer preset topics, gifts/help, story quests and Noah commissions; equipment/armory support purchase/craft/equip and confirmed one-item sale; library learns the existing spark spell. Map marks live resident locations without moving the actor.
- Direct Life access supports study create/edit/archive/restore, plan create/edit/archive/restore/today identity, real server timer start/pause/resume/finish, manual records/history, Noah-only proximity acceptance/settlement and explicit quoted growth spending. Manual/timer provenance remains unverified; neither directly mints growth points. Cancelling an active commission requires a second explicit click. Existing record/save IDs and recovery protocol remain compatible.
- `combatView.ts` ports the existing code-authored slime/bat/beetle/boss silhouettes and server telegraphs/projectiles/casts to native Graphics. Cave movement uses only encounter/owner/next-sequence intentions. Keyboard and touch target/attack/spark/soup, five-floor stairs, floor3 rest, unlocked passages, safe retreat, defeated retreat, gate opening and missing-stone verification all use existing commands. Panels/background/blur stop input and hold no simulated offline rewards.
- Hearthwood linen/wood/moss primitives are shared, while list/detail, blueprint, trade receipt, resident conversation and practical input forms differ. Desktop is primary; short landscapes paginate lists and storage instead of covering actions. No raster/font/download/source processing was added. Equipment/loot text glyphs, procedural world/cave ground and travel-resident shapes remain provisional artwork.

## Bugs found through actual play

1. Armory soup selection carried into equipment and produced a rejected equip. Equipment now selects an actual owned weapon.
2. Cave click paths overshot16px nodes because server ticks move farther than one node. Fractional approach intentions converge using authoritative position.
3. Mira and the counter share an anchor. Exact-distance ties now prioritize the resident; her conversation explicitly opens the shop, and the unattended counter still works.
4. Creator's array-spread transform compiled a Map iterator to `[].concat(iterator)`, so native held touch directions never matched. Explicit `Array.from` fixes it. Direction targets now survive HUD receipt redraws, and each native touch-end/cancel releases only that pointer.
5. Combat touch intentions commit on press because a receipt may replace the HUD before release. Visible cast/cooldown/stamina/soup-limit states prevent misleading enabled actions.
6. Native Web EditBox consumes Escape before Cocos receives it. A lifecycle-bound document listener dismisses editing first (except IME composition); the next Escape returns to the prior panel. Draft text remains intact.
7. Storage page size now adapts to short height. Repeated dialogue feedback was removed because the same text already occupies the conversation body.

## Reproducible environment and verification

Existing tooling: npm/frontend lockfile, React19/Phaser3.90/Vite6.4.4, Node22.23.2; backend `.venv` and existing Alembic schema; official Creator3.8.8 at ignored `output/cocos-tools/CocosCreator.app`. No dependency/balance/schema change. Creator's native success exit36 is normalized to0 by the wrapper. Builds use separate ignored `clients/cocos/web-phase45/web-desktop`; prior build directories are preserved.

Commands actually used from repository root unless noted:

```sh
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/build.mjs web-desktop
node clients/cocos/tools/test-core.mjs
node clients/cocos/tools/test-features.mjs
node clients/cocos/tools/check-baseline.mjs
# frontend/: npm run build
# backend/: .venv/bin/python -m pytest -q
node clients/cocos/tools/smoke-phase45.mjs
node clients/cocos/tools/smoke-depths.mjs
node clients/cocos/tools/smoke-landscape.mjs
/Users/zilong/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 tools/audit_inventory_assets.py
```

- Genuine Creator Web build and actual engine declarations/62 bindings pass. Original Web production build passes with its existing chunk-size warning;229 backend tests pass with existing Starlette/httpx deprecation warning.11 durable shared-core groups, feature behavior assertions,400 protected original Web/art/rule/migration sources +7 original extraction-semantics checks pass.156-image audit passes;52 Cocos PNG bytes remain2,199,403.
- Main browser suite:9 groups/20 captures; actual home→gather→claim, lost reply same-ID/exact one reward, main quest marker/no teleport, craft/rejected/retried purchases/equip, initial100-HP/100-stamina character clearing three full-health slimes/exact loot, stairs/modal/blur pause/safe retreat, actual Noah settlement/one-point magic spend, Chinese study/timer, plans/manual/history and original cookie/recovery readback. One deliberately injected422 is reported separately; no unexpected page/console errors.
- Depths suite:9 groups/25 captures; prepared test guest with200 HP/stamina, magic3/building1, gold/materials and approach positions. These are fixture prerequisites, not a balance claim or a naturally earned full chapter. Actual controls buy/sell/deliver/upgrade/craft/sell/equip/store/withdraw/learn; all five enemy floors start at full health and are actually defeated with keyboard movement/attacks/spark. Platform rest/soup, exact gel7/shell4/crystal7/gold+72/gate_stone1, permanent gate consumption and stable study editing/archive are asserted. No fixture seeds hits, deaths, drops or boss outcomes. The earlier100-stat automated bot ran out of stamina and correctly suffered a server-authoritative defeat; the grown-character fixture avoids confusing bot skill with migration correctness.
- Landscape suite:3 groups/23 captures; DPR2 real multi-touch diagonal/one-pointer release/full release, Chinese text focus, actual native touch press held across receipts, attack/spark damage/loot, soup consumption/cooldown, no-overlap controls, inventory/equipment/quests/growth/map/armory/shop/orders/storage/spell/cave/Life pause. Short-screen targets740×360 and844×390; desktop1440×900/1920×1080/1024×768. Native rendering/screenshots were inspected directly, not inferred from control bounds alone.
- The supplied develop-web-game frame client is adapted only for local Playwright import, Cocos-ready/start, compositor screenshot and finally cleanup;10 right/6 idle frames ×2 pass with one canvas and no error artifacts. Server clocks stay real; `advanceTime` only waits.

All browser fixtures create their own guests in `output/cocos-phase45/test.db` behind test proxy5426/API8126 and a distinct cookie. Noah readiness and timer elapsed are explicitly shortened only for that save. Original owner databases, old preview databases and original Web source/rules/art are untouched. A response-lost cave tick also replays identical request ID/sequence/encounter before continuation.

## Artifacts and actual review

Ignored evidence under `output/cocos-phase45/` includes `build.log`, `smoke.log`, `smoke-result.json`, `interaction.webm`, `depths.log`, `depths-result.json`, `landscape.log`, `landscape-result.json`, `asset-audit.log` and `frame-client/`. Representative captures: `board-ready.png`, `workshop-blueprint.png`, `market-order.png`, `armory-sale.png`, `spell-learned.png`, `study-timer.png`, `manual-history.png`, `cave-live.png`, `boss-windup.png`, `depth-5-clear.png`, `gate-open.png`, `compact-armory.png`, `compact-mira.png`, `touch-spark-cooldown.png`, `life-740.png`. Screenshots are candidate renders; owner approval is not implied.

## Remaining gates

No AppIDs/platform projects/devices exist yet, so verified WeChat/Douyin/Bilibili login, account linking, host file adapters, API-domain configuration, developer-tool import, compatible Bilibili plugin and physical-device performance/release tests are still deferred. Android/TapTap packaging needs SDK/NDK/JDK, package signing and device validation. No platform-ready or store-ready claim.

Advanced original Web AI/calendar/training/detail conveniences, full original artwork parity, accessibility semantics/native text scaling, Safari, physical keyboard/IME/device safe areas, production weak-network/payload performance and endurance remain follow-up work. Short landscapes expose core use; some secondary edit/topic controls remain desktop-only. The new component treatment needs the owner's render/feel checkpoint before wider visual rollout. The original Web remains usable through its unchanged launcher and source.

All three suites complete:21 behavior groups/68 captures, plus2 frame-client captures; zero unexpected errors and one intentional422 in the main suite. Final copy-only gate refinement also passed a separate prepared-prerequisite visual check, after the full-depth suite had earned its own stone without seeding boss outcomes. Final Escape focus probe confirms input→Canvas→Life→world. No commit, push or deployment.

Cleanup/handoff identities are recorded below.


## Final handoff and cleanup — 2026-10-17 00:54 CST

- Test proxy76520 and API76119 were verified by start time, parent, command, cwd and listening ports, then stopped normally through their owned exec sessions92886/19443. Both exited0; PIDs and ports were verified gone before manual startup. Test DB is preserved as evidence and is not the handoff database.
- Final manual preview uses `./start.command`: launcher86631, API86634/8126, proxy86635/5426, exec session20162. It serves `web-phase45/web-desktop` and **only `output/cocos-phase45/local-preview.db`**. Root, proxied health and direct API health all return200. Retained deliberately for owner testing; Ctrl+C in the launcher stops its own two children. A Codex browser preview tab was queued for this chat and is retained for manual review.
- All task automation browsers/contexts and Node/Cocos build/test/frame/probe runners exited through finally/normal completion; no owned automation session remains. Temporary frame/probe wrappers and redundant raw recordings were removed; canonical18MB `interaction.webm`, screenshots/results/logs remain ignored.
- Earlier5420/8120 and5422/8122 previews were not stopped by this task. At final inspection their old PIDs44912/45078/71828/71830/71831 and listeners were already absent; no restart, termination workaround or ownership claim was made. Shared `node_repl` hosts started onOct16 are not attributable to this completed task and were preserved, as was the active tool host.
- The original Web launcher/source and owner player databases remain intact. No commit/push/deploy, platform account change or external publishing.
