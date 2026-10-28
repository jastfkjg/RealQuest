# Cocos migration — phases 2–3

> 启动入口现统一为 `start.command`，本文中的入口名称已更新；其余历史参数、端口和验证记录保留当时状态，当前用法见 [本地说明](../cocos-local.md)。

Authorized: continue shared logic, network sessions and save compatibility, preserve the existing Web client; UI improvements within this flow. No platform AppIDs or devices yet.

## Plan

1. Extract protocol and pure interaction/navigation/routine helpers into `shared/game`; Web keeps compatible entry points and its existing store. Generate Cocos copies with hashes.
2. Add durable same-ID pending commands, explicit network/session states, safe reconnection, and recovery-file exchange against the existing authoritative save. Never import client balances or silently replace invalid credentials.
3. Load existing village interiors and journey areas by server location, use unchanged collision/door anchors, implement enter/exit, storage/rest and quoted travel. Keep full combat, advanced NPC/economy panels and Life editing in the original Web until their later stages.
4. Verify backend invariants, original Web build, real Creator build and actual browser flows across old/new clients. Capture desktop/landscape evidence and clean task automation.

## Visual checkpoint

Visual thesis: retain Hearthwood linen, timber and moss with a quiet scene label and actionable connection feedback.
Content: world remains the main surface; save management is a deliberate reading leaf with credential preview and explicit switch; room furniture keeps native pixel ratios.
Interaction: camera follows the actor across rooms; pressed controls give immediate feedback; network uncertainty stops resource actions and offers the same operation for retry. Input and scene changes clear held movement.

Original phase 1 preview ports5420/8120 are retained; phase2–3 builds and tests use separate output/ports. No numerical save import, fake platform login, new world geography, new assets or reward rules.

## Evidence

Pending implementation and verification. Owner actual-render approval remains open.

## Implemented flow and files

- `shared/game/{protocol,interaction,stamina,residents,villageIntro,navigation,appearances}.ts`: canonical extracted helpers; navigation receives server time explicitly. Seven compatible Web entry points preserve the original exports/store behavior. `client.ts` and `clock.ts` add the renderer-independent guest/session/retry layer. `shared/game/README.md` documents ownership.
- `clients/cocos/assets/scripts/core/`: generated copies from the canonical source. `tools/sync.mjs`, `check.mjs`, `check-baseline.mjs` verify source/binding hashes and compare the extracted helpers with95371f2.400 other protected original Web/art/rule/migration files are unchanged; the seven extraction entry points and the additive API extension are explicitly scoped exceptions.
- `platform.ts`: bearer transport, typed HTTP failures, phase1 credential migration, atomic token/save-ID record, per-request durable outbox keys and explicit host storage/file/viewport/focus boundaries. No provider credentials or platform-auth claims.
- `Bootstrap.ts`: existing village, five interiors, crossing/mountain/city/inn selected by authoritative `location`; same saved coordinates/collisions/door anchors, source-scale furniture and all six appearances. Real storage/rest, quoted travel and locked departure, scheduled villagers, cave-save safe retreat, direct read-only Life summary, held-input cleanup, modal keyboard ownership/Tab selection and pressed feedback. Session leaf supports v1 credential preview/cancel/explicit confirmation/export, backs up the current journey before switching and restores an expired credential to its original save. Network uncertainty disables new play mutations until reconnect/replay. Error text has a solid linen background.
- `backend/app/main.py`: additive `client-recover` exchanges the existing credential for a bearer GuestSession; recovery preview adds save_id. It never changes Web cookies, imports balances or merges players. Existing recovery-file/recover and every command/state/reward rule stay authoritative. `backend/tests/test_client_session.py` now has5 API tests, including original-Web→client→Web identity/resource/timer preservation and forged/origin rejection.
- Tooling: independent Creator buildPath, configurable static/API proxy, root `start.command` and launcher owning its children, test/core/scene/session/resize scripts. `serve.py` defaults still support the earlier prototype; current arguments are explicit. Launcher probe uses SO_REUSEADDR so TIME_WAIT after a closed test listener is not mistaken for a running service; an actual occupied listener is preserved.
- Documentation: root README/DESIGN, Cocos/shared READMEs, asset plan/manifest/review checklist and progress.md. No commits, pushes or deployments.

## Actual validation

| Command / flow | Result |
|---|---|
| `backend/: .venv/bin/python -m pytest -q` |229 passed; existing Starlette/httpx deprecation warning |
| `frontend/: npm run build` |Passed TypeScript + Vite6.4.4 production build; existing large-chunk warning |
| `node clients/cocos/tools/test-core.mjs` |11 groups passed: same-ID retry, unknown-outcome reload, rejected mutations, storage failure, expired auth, stale/save-mismatched replies, recovery safety, other-tab identity and independent durable keys, collision/path/navigation |
| `COCOS_CREATOR=... node clients/cocos/tools/check.mjs` |Actual bundled3.8.8 declarations pass;61 source/output bindings pass |
| `node clients/cocos/tools/check-baseline.mjs` |400 protected original files preserved;7 extracted modules match original semantics with explicit clock injection |
| `COCOS_CREATOR=... node clients/cocos/tools/build.mjs web-desktop` |Genuine Creator build passed, native success36 normalized0; final bundle evidence in `output/cocos-phase23/build-evidence.json` |
| `node clients/cocos/tools/smoke-phase23.mjs` |12 groups /24 captures pass, original Web native create/recovery and actual Cocos controls; no unexpected page/console errors; one deliberately injected422 reported separately |
| `node clients/cocos/tools/smoke-session.mjs` |4 further groups pass: native Chinese Cocos name, backup-before-switch, other-tab blocking, expired-token recovery and readable unknown-outcome reconnect; one deliberate401 separated |
| `node clients/cocos/tools/probe-resize.mjs` |1440→844×390→740×360→1920×1080 controls fit; screenshots visually inspected |
| Supplied develop-web-game frame client, repository-adapted wrapper |Final2 iterations of10 right/6 idle frames pass, compositor screenshots/state inspected, no error files; finally closes browser. Server time remains real |
| Bundled Python `tools/audit_inventory_assets.py` |156 original images/hashes/source pixels verified |
| `python3 -m py_compile ...`, `zsh -n start.command`, `git diff --check` |Passed |
| Launcher on5424/8124, then normal parent SIGTERM |API health +HTTP200; parent and both children exited, ports free. Final default launch5422/8122 succeeds after TIME_WAIT probe fix |

The12-group scene suite ran after the render-window fix. The final small change adds a solid feedback background and marks cross-tab credential changes unauthorized; the4-group session suite, core/type checks and supplied frame client ran on that final build. No extra gameplay rule changed after the12-group suite.

All browser fixtures are fresh guests. Historical room/travel positioning and clock fixtures touch only their own save IDs in the explicitly asserted `output/cocos-phase23/test.db`; no owner database or player was reset. The current manual preview uses another database, `local-preview.db`.

## Visual evidence

Representative captures were opened and inspected, including:

- `output/cocos-phase23/home-desktop.png`, `storage-desktop.png`, `rest-desktop.png`, `room-{workshop,library,guild,shop}.png`
- `recovery-preview-desktop.png`, `original-web-return.png`, `backup-before-switch.png`, `other-tab-session-guard.png`, `network-feedback-paper.png`
- `travel-desktop.png`, `mountain-desktop.png`, `inn-desktop.png`, `departure-locked.png`
- `inventory-844.png`, `inventory-740.png`, `session-740.png`, `travel-740.png`, `touch-world.png`, `touch-inventory.png`
- `resize-{844,740,1920}.png`, `frame-client-final/shot-1.png`

Continuous real create/recovery/room/network/travel recording: `output/cocos-phase23/interaction.webm` (about14MB). Structured results: `smoke-result.json`, `session-result.json`. Credentials stay in memory/local storage and never appear in those render/result artifacts.

Two defects were found by actual visual review: Canvas alignment could leave the camera at its previous center; even after control coordinates fit, the bottom-level render window retained1440×900 while the canvas became844×390. The installed engine's public `director.root.resize` synchronizes the render window, then Widget/Canvas camera alignment is refreshed. Screenshot inspection caught the second defect that coordinate assertions alone missed.

## Assets and remaining boundaries

52 existing PNGs,2,199,403 bytes, plus9 canonical code bindings. New bindings cover interior furniture, market facade/counter and five remaining actor sheets. Sources stay byte-identical, nearest sampling is explicit and no new raster/font/source pack was acquired. Room footprints remain480×368; furniture/actor source scales stay unchanged. Existing rug is a scoped resized presentation; full fine room-ground rendering, journeys/landmark scenery and two native travel-resident placeholders remain visual-production gaps. This is a new candidate, not owner-approved art parity.

Full combat/advanced NPC/quest/economy panels/Life editing are later-stage work. The cave can be loaded and safely exited; no unfinished combat is offered as playable. No new maps, balance, currencies or reward rules. Long offline play is not implemented: the client preserves uncertain online commands and resumes against the server.

Mini-game account verification/linking, host-specific credential file adapters, platform developer-tool imports/domain configuration/AppIDs, Android package setup, physical-device testing, Safari, screen-reader semantics/native text scaling/safe areas and long-session/release performance remain unverified. The final debug Web output includes source maps:18,985,085 bytes /185 files; this is not a release package size or a device-performance certification. Local `window.advanceTime` waits real time and cannot advance authoritative crop/reward clocks.

## Runtime ownership and cleanup

- **Current manual preview:** http://127.0.0.1:5422; API8122; root launcher PID71828, API71830, proxy71831 (2026-10-16 23:23). Session97105. Database: `output/cocos-phase23/local-preview.db`. Health/HTTP200 verified. Retained intentionally for owner play; Ctrl+C on the launcher owns both child shutdowns. Codex browser opening returned `queued`, so an actually visible tab is not claimed.
- **Closed:** test API57858, test Cocos proxy58519, original-Web comparison proxy58523; test-launcher69106 and children69615/69617.5423/5424/8124 free; old PIDs absent. All smoke/probe/frame-client browser contexts and Node runners closed in finally; Creator build processes exited. No task-owned idle test runner remains.
- **Prior preview preserved:**5420/API8120, PIDs45078/44912, remains from task34. Earlier auto-review rejected stopping that retained preview, so no termination workaround was attempted here. It uses its earlier API and a pre-final Cocos build; use5422 for this delivery. The first phase23 build showed Creator ignores `name` for the output directory and updated the old Cocos build directory; the original React/Phaser client was unaffected. All subsequent builds use explicit `project://web-phase23` and leave that older runtime untouched.
- Official portable Creator tool and ignored build/test evidence remain local; no new app installation/account change or external publication. `output/cocos-phase23/cleanup.json` records retained/closed identities. Source changes remain uncommitted.
