# Cocos migration — phases 0–1

User authorized on 2026-10-16: establish a migration baseline and independent Cocos prototype, preserve the existing Web client, and improve UI/design within this slice. User subsequently confirmed that no platform AppIDs/devices are available yet: local prototype first. This authorization does not include platform publication, account changes or a full migration.

## Plan and design checkpoint

1. Record baseline revision, source bindings, API/save invariants and engine/toolchain.
2. Build a real Creator project alongside `frontend/`, with no replacement of its routes/build scripts.
3. Implement server-backed village movement, gathering/planting, inventory selection/quick binding, one NPC interaction, and direct Life summary access.
4. Verify actual Creator import/build, browser interaction, persistence, retry/rejection, desktop and landscape layout; then collect owner visual feedback before expanding the new treatment.

Visual thesis: an open, sunlit village with a quiet linen travel HUD and a compact readable packing leaf. Existing Hearthwood art/tokens provide continuity; UI layout may improve rather than reproduce historical CSS.

Content plan: playable world as primary workspace; one contextual world action; inventory as item selection plus contextual detail; Life summary directly reachable without walking to an NPC. The prototype must distinguish its supported actions from unimplemented full-game systems.

Interaction thesis: clear press feedback, restrained scene-following camera and immediate inventory selection; resource changes display pending/error/success and use authoritative server snapshots. No artificial progression or rewards.

## Baseline and compatibility

- Starting revision: `95371f2` (`Add next-departure journal and return guidance`); initial working tree clean.
- Existing client: React 19 / Phaser 3.90 / TypeScript / Vite, npm lockfile retained.
- Backend: Python 3.14, FastAPI/SQLAlchemy/Alembic. Rules, migration history, world geometry and stable identifiers remain authoritative.
- Existing Web entry and Cookie sessions remain available. Cocos opts into a separate bearer guest endpoint; no implicit player merge or Web-cookie replacement.
- Token storage is a credential, not a portable backup. Platform account verification/linking is not implemented by guest transport.
- Request UUIDs, same-request retries, `save_id`, revision handling, world owner and real/server clock semantics remain mandatory.
- User databases must not be used for tests. No source artwork is modified. Runtime copies have reproducible bindings to the existing manifest.

## Scope and gates

Local slice supports overworld movement/collision, wood/stone gathering, planting/harvest when ready, server NPC greeting, inventory selection and non-consuming quick bindings, direct read-only growth summary and reload persistence. Full interiors, quests/rewards, cave combat, calendar/study editing and platform accounts remain on the existing client.

Use actual Cocos Creator 3.8.8 initially, obtained from the official download host in a temporary tool directory. The scene is based on its bundled official 2D scene template. No imitation renderer or fake Cocos export is accepted as a build pass.

| Gate | Status |
|---|---|
| Source/API baseline and independent project | Complete;407 protected Web/art/rule/migration files unchanged |
| Real Creator typecheck/import/Web build | Pass; official3.8.8, genuine Web build, documented exit36 normalized by wrapper |
| Server-backed browser interaction and persistence | Pass; mutation failure/replay, planting, reload, NPC and input checks |
| Desktop/landscape screenshots inspected | Pass at1440×900 and844×390/DPR2; owner acceptance separate |
| Original Web build and backend regression | Pass; existing production build and227 backend tests |
| WeChat/Douyin/Bilibili developer-tool and physical-device validation | Deferred: user has no projects/AppIDs/devices yet |
| Android SDK/package and physical-device validation | Not yet verified |
| Owner visual/feel acceptance | Pending |

## Verification and evidence

Local implementation is complete for this scoped prototype. Phase1's platform/package/device gates remain deferred or unverified; this is not completion of the full multi-platform phase.

### Actual changed files

- `backend/app/main.py`: optional explicit bearer guest lookup and `/api/client-session`; existing Web Cookie endpoint and save/rule/migration schema retained. No platform identity is fabricated.
- `backend/tests/test_client_session.py`: new transport isolation, credential rejection, replay, origin and save-ID regression.
- `clients/cocos/assets/scenes/Bootstrap.scene`, `assets/scripts/Bootstrap.ts`: genuine Cocos scene and scoped UI/world controller, source-world collision/navigation, server-synchronized actions, explicit input ownership, lifecycle and seedling presentation.
- `clients/cocos/assets/scripts/platform.ts`, `core/client.ts`, `core/clock.ts`: host transport/viewport/focus boundary, serial commands with same-ID network retry, state identity/version handling and real server clock anchor. Seven original source modules are reproducibly copied rather than manually maintained forks.
- `clients/cocos/tools/`, `build-templates/web-desktop/`, project settings/meta files and `start-cocos.command`: real editor build/type checks, source checks, clean preview lifecycle, full-window Web shell and actual-browser evidence. Original `frontend/` source/build/entry and `start.command` unchanged.
- Root README/DESIGN, art manifest/plan/checklist, progress, this task and `docs/migration/cocos-baseline.json`: scoped authorization, immutable baseline, provenance and acceptance limits.

### Commands and outcomes

Commands below were run from repository root unless stated otherwise:

| Check | Command / result |
|---|---|
| Backend including new bearer regression | `backend/`: `.venv/bin/python -m pytest -q` —227 passed; existing Starlette/httpx deprecation warning |
| Original Web | `frontend/`: `npm run build` — pass; existing large-chunk warning |
| Source bindings and real engine declarations | `COCOS_CREATOR=... node clients/cocos/tools/check.mjs` —35 bindings and actual bundled `cc.d.ts` pass |
| Shared client behavior | `node clients/cocos/tools/test-core.mjs` — same-ID retry, command order, rejection recovery, save/day identity and expired-token preservation pass |
| Existing source preservation | `node clients/cocos/tools/check-baseline.mjs` —407 protected source/art/rule/migration files unchanged from95371f2 |
| Actual Cocos Web build | `COCOS_CREATOR=... node clients/cocos/tools/build.mjs web-desktop` — pass; Creator's documented36 success mapped to shell0 |
| Actual browser flow | `node clients/cocos/tools/smoke.mjs` — pass; desktop, landscape, DPR2 touch, mutation failure/replay, input and persistence evidence in `output/cocos-migration/smoke-result.json` |
| Chinese input and recording | `node clients/cocos/tools/record.mjs` — Chinese name reaches actual create command; real movement/gather/inventory/Life flow recorded in `output/cocos-migration/interaction.webm` |
| Supplied game frame client | Skill's original action loop with local integration/cleanup/compositor wrapper —2iterations, state output and inspected compositor captures, no unexpected errors |
| Existing art audit | Bundled workspace Python ran `tools/audit_inventory_assets.py` —156 images and original/generated-source equality pass. System Python lacked Pillow; no global package was installed |
| Script/shell/patch checks | Python `py_compile`, `zsh -n start-cocos.command`, `git diff --check` — pass |

The official editor was downloaded from `https://download.cocos.com/CocosCreator/v3.8.8/CocosCreator-v3.8.8-mac-121518.zip`. It refuses execution from `/private/tmp`; the portable tool was moved to Git-ignored `output/cocos-tools/CocosCreator.app`. The downloaded1.1GB archive was removed after extraction. The4.1GB editor is retained locally for reproducible builds, outside runtime and version control.

The frame-client wrapper retains the supplied action loop, waits for the actual Cocos boot, guarantees browser cleanup and captures the browser compositor. A direct read of the engine's non-preserved WebGL buffer can be black and is not visual acceptance evidence.

### Screenshots and measurements

Inspected actual captures under `output/cocos-migration/`:

- `welcome-desktop.png`, `world-desktop.png`, `inventory-desktop.png`, `life-desktop.png`, `dialogue-desktop.png` and `planted-desktop.png`.
- `inventory-landscape.png`, `world-landscape-touch.png`, `inventory-landscape-touch.png` at844×390, with actual DPR2 touch events.
- `frame-client-delivery/` or the final compositor frame directory: normal game state and visible canvas, rather than black buffer reads.

Selected copied PNGs total1,130,268bytes. The Web **debug** output (including engine and source maps) measured17,752,684bytes before the last small presentation changes; release-package size, first-package limits and resident GPU memory are not certified. Local headless boot is recorded per run in `smoke-result.json` (about2.35s); sampled RAF cadence was60Hz. These are local Chromium observations, not physical-device FPS, memory or network-performance promises.

NPC greeting uses an explicitly asserted isolated `preview.db` clock fixture at08:30; no normal player data is edited. New manual journeys start at06:00; residents emerge according to their existing08:00 routines. The final manual preview uses a different `local-preview.db`.

### Remaining gates

Owner render/feel review; full terrain/depth/art parity; full interiors/combat/quests/Life editing; combat weak-network benchmark; verified platform login/account linking/recovery UX; API base URL/domain setup; Bilibili official plugin compatibility; mini-game developer-tool/package/device validation; Android SDK/package/device tests; Safari, native text scaling, safe areas, screen-reader semantics, long-session memory and production load remain open. No platform release, full-game parity or owner approval is claimed.

### Preview and cleanup

The tested standalone preview is deliberately retained at `http://127.0.0.1:5420` with API8120, using isolated `output/cocos-migration/preview.db`; its processes are Python proxy45078 and API44912. Both are this task's original test services, now handed over for manual preview. The original Web services/source/player databases are not those services and remain untouched.

Automatic approval review rejected a normal stop of proxy5420 because it might be a preview the user wanted retained. No alternative termination or indirect workaround was attempted; both preview services remain running. Therefore the planned switch to the unified launcher/local-preview.db was not performed. The new `start-cocos.command` / `tools/run-preview.py` is syntax-checked and designed to own future sessions and stop its own children in finally; its complete start/stop lifecycle is still unverified. It refuses occupied5420/8120, so it must not be launched over the retained preview.

All automated browser contexts/runners and Cocos build/help processes exited after their last use. The official editor tool is retained in the ignored tools directory, and the1.1GB download archive was removed. No shared/unrelated process was stopped. Owner preview is intentionally retained rather than claiming complete background-service cleanup. No commit, push, deployment or user-save reset.
