# Hearthwood Review Checklist

## Cocos shared core and world — phases2–3

- [x] Original Web compatible helper entry points/build retained; extracted protocol/helpers checked against original source semantics. Server rules, migrations and source art preserved.229 backend tests and11 shared-core groups pass.
- [x] Original Web native character creation and credential restoration interoperate with Cocos preview/cancel/confirm/export; indoor saves, appearance IDs, resource counts, storage and timers remain server-authoritative.
- [x] Browser verification includes five real door enter/exits, home storage/rest, ferry fare/return, city/inn, locked departure, two lost responses + reload replay, failed/retried planting, modal ownership, blur and real DPR2 touch.
- [x] Actual desktop1440×900, landscape844×390/740×360 and resize-to1920×1080 captures inspected. Fixed both Canvas alignment and bottom-level render-window resize; control coordinates alone did not prove correct rendering.
- [x]52 unchanged PNGs/9 generated code modules have61 checked bindings. No source-image modification, numerical save import, real player reset, deployment or fake platform login.
- [ ] Full combat/advanced feature panels/Life editing, world-art parity, owner render/feel acceptance, platform accounts/SDK/file adapters, physical devices, Safari/screen readers/text scaling/safe areas/endurance and release performance remain open.

Commands, screenshots, runtime ownership and limitations: [task35](../tasks/35-cocos-shared-world.md).

## Cocos local migration prototype — 2026-10-16

- [x] Independent actual Creator3.8.8 project imports/builds for Web; original Web production build and227 backend tests pass. Explicit bearer guests preserve original cookies and saves; malformed credentials cannot silently replace a journey.
- [x] Browser flow: actual movement, rejected gathering, committed/lost-response replay, exact3wood/4stamina, inventory selection and non-consuming quick assignment, real planting, reload preservation and actual NPC greeting. NPC schedule test uses only the explicitly asserted isolated test DB.
- [x] Desktop1440×900 and landscape844×390 layout, DPR2 real touch start/release/selection/return, keyboard ownership and direct read-only Life access pass. Latest representative screenshots inspected. Full original-village visual parity is not claimed.
- [x] Existing source images remain unchanged;35 deterministic source bindings include28 PNGs and7 code files. No new raster/font/external pack, no player-data reset or deployment.
- [ ] Platform AppIDs/account verification, developer-tool and physical-device tests, Android packaging, Safari, screen-reader semantics, native text scaling, safe-area and endurance acceptance remain unverified. Owner render/feel review pending.

Scope, reproducible commands, evidence and cleanup: [task34](../tasks/34-cocos-local-spike.md).

## Next departure and return guidance — 2026-10-16

- [x] Actual workshop recap connects to a distinct cloth/linen journal with equipment, cave and growth bookmarks. State-aware tracker/manual menu access, dismissed guidance and manually tracked side quests checked. Existing art/asset bytes, rewards and server rules preserved.
- [x] Final production10groups/25captures: fitted desktop1440/1920/1024, fixed actions and explicitly scrollable reading leaf on844/740landscape, DPR2 touch/reduced motion, keyboard ownership/focus and Escape pass. Screenshots inspected; zero unexpected page/console errors, three injected503logs separate.
- [x] Actual rejected/retried sword purchase, exact96-gold spend, equip/reload, actual one-point NPC settlement and explicit magic spend pass. Pending promises allow cave play. No new reward or automatic growth, claim, movement or tutorial completion.
- [x] Optional per-save return slip uses refreshed server state after a simulated600-second absence, waits on failed refresh, preserves another open page, stays quiet through background polling and respects dismiss/side-quest ownership.15.5-second poll regression checked; native OS/tab switching not certified.
- [x] Build, policy checks,19 prior intro decisions,81 relevant backend tests,156-image audit,7solid contrast pairs(min5.67) and supplied frame client pass. Test-only fixture paths are asserted.
- [ ] Owner actual-render/feel approval, physical devices/Safari/zoom/screen readers, blocked storage, long-session endurance and full real-growth-to-departure chapter remain unverified.

Files, commands, screenshots, recording and cleanup: [task33](../tasks/33-next-departure.md).

## Functional popup compositions — 2026-10-16

- [x] Armory rack/work order, illustrated spell/cave/gate, paged paired storage, blueprint/counter and quoted route pages replace the remaining generic utility compositions. Menu/guide/settings use matching materials with explicit native pages.
- [x] Final production12 check groups/91 captures pass: desktop1440/1920,1024, landscape844/740, all captured bodies without vertical scrolling, no covered controls/content overflow. Default, selected, shortfall, ready, hover/focus/press, pending/error/retry, success and reload reviewed. Expected injected503 is separate from zero unexpected page/console errors.
- [x] Exact server purchase/craft/spell/store/withdraw/upgrade/counter/ferry/gate actions and real cave entry/retreat pass; input ownership,44px primary action, DPR2 touch and reduced motion checked. Final screenshots inspected.
- [x] Build,156-image preservation,7 solid contrast pairs(min4.96), supplied game frame client and format/diff checks pass. Test automation closes in finally; test services closed and manual preview identified in task32.
- [ ] Owner render approval, physical devices/Safari/native zoom/screen readers, expanded imported-recovery forms and full combat/departure endurance remain unverified. Existing old broad mouse-HUD obstruction is outside this visual family.

Files, commands, images, recording and cleanup: [task32](../tasks/32-field-panels.md).

## Overall tactile controls — 2026-10-16

- [x] Shared moss/linen actions, soft pockets and paper tabs applied across existing game and Life pages; market data cards replaced with small object shelves, rest actions made compact. Existing page archetypes and actual values retained.
- [x] Production build and final10-group/99-capture browser flow pass. Desktop1440/1920,1024 and landscape844/740 target layouts, DPR2 touch, reduced motion, normal-motion hover/press, keyboard focus, failure/retry and disabled/pending checked; final captures inspected. No empty family capture or new page runtime error.
- [x] Actual claim/trade/rest/equip/persistence, movement input ownership and five door enter/exits remain correct.156-image preservation audit,7 solid-color/gradient-endpoint contrast pairs(min4.96), skill frame client and formatting/diff checks pass.
- [x] Test browsers/contexts use finally cleanup; isolated test services closed and retained manual preview identified in task31.
- [ ] Existing long reading/menu surfaces may still scroll; this change refines their controls, while task30 board/shop/rest/gear fitted layouts keep explicit pages. Physical devices/Safari/native zoom/screen readers/endurance and owner render approval remain unverified.

Files, commands, screenshots, recording and cleanup: [task31](../tasks/31-living-controls.md).

## Requested world UI refinement — 2026-10-16

- [x] Five real facade collisions/door enter-exits, quieter NPC/road cues and compact1.8s edge notices checked.
- [x] Requested market, bedside, equipment and board layouts use existing Hearthwood art; fixed board title and explicit pages replace vertical scrolling.
- [x] Final production49 captures at desktop and phone landscape sizes pass in-viewport, unobscured-control and non-scroll checks. Actual screenshots, DPR2 touch and reduced motion inspected.
- [x] Claim rejection/retry grants exactly one reward; actual trades/rest/equip and reload/marker-only navigation pass. Relevant112 backend tests, production build,156-image audit,9 contrast pairs(min4.85) and skill frame client pass.
- [ ] Legacy broad mouse smoke remains blocked by the existing HUD pickup overlap; full gameplay regression is not claimed.
- [ ] Owner render approval, physical devices/Safari, native zoom and screen-reader/endurance checks remain unverified.

Files, evidence, commands and cleanup: [task30](../tasks/30-world-ui-refinement.md).

## First expedition — 2026-10-16

Status: implemented and browser-verified candidate; owner gameplay/visual acceptance pending.

- [x] Real new-guest starter claim → explicit departure briefing → purchase/equip → actual first-floor sword combat → carry loot back to workshop → inspect uses and save recap. No position, kill or drop fixture in this flow; original prices/rewards and magic0 exploration retained.
- [x]224 backend tests,19 UI policy decisions,6 flow groups/19 captures and7 control groups/4 captures pass; scoped rejection/retry/replay, reload, skip/resume, stored loot, recovery, tracked side quests and marker-only navigation checked.
- [x] Desktop1440/1920 and landscape844/720 layouts, DPR2 actual touch events, reduced motion, reading input and Life Mode/single canvas verified. Final two-frame-client captures and actual screenshots inspected.
- [x] Initial guide font inheritance corrected within this slice.15 visible text runs over actual hidden-text background pixels pass at minimum6.80:1; guide copy≥14px and actions≥44px. This is not a universal contrast audit.
- [x] No new art/font/audio/dependency/migration;156 existing images audited unchanged. No commit, push, deployment or normal player-data edit.
- [ ] Owner visual/gameplay confirmation, physical devices/Safari/native zoom/screen readers, complete real-growth-to-departure timing, full-cave balance and long-run/production-load checks remain open.

Files, commands, captures, recording and cleanup: [task29](../tasks/29-first-expedition.md).

## Day/night and sleep — 2026-10-16

- [x] Reuse the existing resident clock, native Chinese controls, tokens and source artwork; no new bitmap, font, sound or external pack.
- [x] New06:00 journey, 24-hour clock, midnight,01:00 faint, next morning at home, HP loss without sleep stamina recovery, free short rest and sleep-to-morning checked with deterministic rules and actual browser flows.
- [x] Life/reading, disconnect and pagehide pause; expired lease tails discarded; old-save migration, concurrent initialization, receipt replay and late yesterday movement preserve assets and state.
- [x] Production build,174 backend tests,9 feature flows/16 desktop/landscape/DPR2-touch captures and cleanup-wrapped skill frame client pass. Inspected the actual sleep, night and morning images; improved short-screen actions and kept morning feedback clear of the clock.
- [x] Existing keyboard/gameplay regression passes using a local compatibility copy that replaces the old intercepted gather click with physical keyboard approach/E. Unmodified mouse regression still stops at that existing HUD obstruction; no mouse-regression pass is claimed.
- [ ] Actual-render owner approval, physical devices/Safari, native browser zoom/screen readers, full-day endurance and final gameplay balance remain unverified. Production clock migration and lodging remain future work.

Files, commands, evidence and cleanup: [task26](../tasks/26-day-night-sleep.md).

## Approved world map — 2026-10-15

- [x] Owner-approved generated concept saved with its prompt; actual map render is a separate candidate.
- [x] Textless fine-pixel terrain and existing village buildings/bridge are combined with live Chinese DOM labels, state-bound markers and a selected-place leaf. Source/runtime image bytes, dimensions and provenance are recorded.
- [x] Five desktop/tablet/phone/short-landscape viewports captured and inspected. Index selection, pointer pan, button/wheel zoom, recenter, discovery changes, direction marking without teleport, Escape, minimum 44px controls and browser errors checked in an isolated fixture.
- [x] Actual game desktop/phone flow opened the map, marked a destination and returned with unchanged player position, inventory and XP; destination art fits its leaf without clipping.
- [x] TypeScript/Vite build and map browser review pass; source/runtime PNG byte identity verified.
- [ ] Physical device/Safari, native browser zoom, long-session performance and owner acceptance of the actual browser render remain unverified.

Evidence and exact commands: [world-map task](../tasks/24-world-map.md).

## Illustrated adventurer dossier — 2026-10-15

- [x] Owner approved concept v2; actual browser rendering remains a separate review candidate.
- [x] Identity/resources, five selectable illustrated abilities, contextual exact-cost spending and insufficient-point guidance implemented. Existing server quotes, save fields and upgrade rules retained.
- [x] Browser flow: free selection, pending lock, rejected purchase, lost-response replay, stale quote synchronization, all resource/knowledge/skill purchases, reload, focus/Escape, marker-only navigation and touch pass; 16 captures, no unexpected errors.
- [x] Six viewport layouts and large-text/commission-detail cases inspected; 16 visual captures and 834 visible text runs on actual texture pass, minimum 5.70:1. Existing game frame client passes.
- [x] TypeScript/Vite build, 35 relevant backend tests and five exact source-crop asset checks pass. Original sources preserved; generated prompt/crops/hashes recorded.
- [ ] Actual owner render approval, physical devices/Safari, native browser zoom and screen-reader testing remain unverified.

Commands, changed files, evidence and cleanup: [task23](../tasks/23-character-dossier.md).

## Village board and Lia dialogue — 2026-10-15

- [x] Owner approved both generated directions; concept approval and original prompts are recorded. Actual render remains a candidate.
- [x] Timber/pinned-notice board and scene/low-dialogue Lia layout implemented with native Chinese content, existing quest state, actual actors and existing item identities. Noah and other panel treatments retained.
- [x] Real objective completion, exact reward turn-in, failed/retried mutation, pending duplicate guard, locked selection and reload checked in an isolated database. Lia request acceptance/folding/farewell, Escape, focus return, focus wrap and first-continue text reveal checked.
- [x]22 captures at1440/1920/768/390/720 and375/DPR2 touch;125% text and reduced motion inspected. Narrow/short views scroll; no horizontal overflow or undersized changed controls. Close latch has a reserved text gutter.
- [x] Build,53 backend game tests, skill movement/modal input bursts,125-image audit and3 new asset checks pass. Six actual-texture cases /136 text runs /minimum5.00:1.
- [ ] Original broad mouse regression did not pass its pickup click because an existing HUD interaction prompt intercepts it. Scoped public keyboard/E route and changed-page mouse/touch flows pass; no broader pass claimed.
- [ ] Physical device/Safari/native browser zoom/screen reader and actual owner render acceptance remain pending.

Evidence, exact commands, limitations, retained preview and cleanup: [task21](../tasks/21-board-library-dialogue.md).

## Daily growth journal — 2026-10-15

- [x] Owner approved the calendar/daily-journal concept; actual DOM implementation is a separate candidate.
- [x] Asymmetric moss/linen journal, real balances and quota, record-marked calendar, selected-day task/history, filters and paging implemented. Text and controls remain DOM; one new original blank surface has exact source/runtime provenance.
- [x] Month/day/keyboard navigation, return-to-today, acceptance-day/overnight archive, due-without-auto-reward, marker-only navigation, cancellation rejection/retry, persistence and focus return pass. Existing48-capture commission flow regression passes with no unexpected browser errors.
- [x] Six desktop/tablet/phone/landscape sizes,375px/DPR2 touch, large text and reduced motion checked.15 dedicated captures inspected;1,092 actual-texture text runs, minimum5.13:1.
- [x] TypeScript/Vite build,19 relevant backend rules tests, deterministic date/quota checks,125-image shared-art audit and diff/format checks pass.
- [ ] Physical devices/Safari, native zoom, actual screen-reader testing and actual-render owner acceptance remain unverified.

Files, exact commands, evidence, limitations and cleanup: [daily journal report](../tasks/20-life-journal.md).

## Fine pixel village — 2026-10-15

Status: approved concept implemented; actual owner render acceptance pending.

- [x] Current outdoor village uses original fine scenery, independent depth layers,48×64 actors, real four-direction walking, consistent HUD/dialogue identities, reduced flower density and fine soil. Existing map/collision/anchors/IDs and server mutations preserved.
- [x] Roof hit bounds and NPC approach spacing match the new presentation; canopy occlusion remains legible. All four entrances/exits, bridge route, keyboard/input ownership, save reload, six appearances, five viewports and DPR2 emulated touch checked in the actual production build.
- [x]21-capture feature suite, existing play-mode regression, actual planting rejection/pending/lost-response retry, game skill frame client, TypeScript/Vite build and108 backend tests pass. Unexpected feature-console errors: zero. Final screenshots/contact sheets opened and inspected.
- [x] Three original built-in generated source sheets, exact prompts, reviewed cuts/complete walk poses, explicit palette derivatives and48 runtime PNGs recorded.88-image audit verifies prior files and new source/runtime hashes; code-native ground/soil and rebuild hashes included. No vendor pack/font/audio change.
- [x] Task automation browsers/runners closed in finally; old DEV service stopped. Fixed preview5211 and isolated API8043 retained for owner review, with process/HTTP verification at handoff.
- [ ] Physical Safari/devices, native browser-menu zoom, long-session memory/performance, complete accessibility audit and actual owner render acceptance remain unverified. Interior backgrounds and new upgrade facades remain outside scope.

Exact files, commands, source/prompt/manifest links, screenshots, compatibility test disclosure and cleanup: [task18](../tasks/18-village-fine-art.md).

## Active commission contract — 2026-10-14

- [x] Second approved preview implemented for Noah active/ready state: curled parchment, live sand hourglass, status ribbon, pending reward seal and matching dialogue; waiting closes, deadline enables the real settlement action.
- [x] Two original textless materials and original SVG sand have prompts/source/runtime hashes, transparent alpha and lossless pixel equality;35-image audit passes. DOM text/actions and existing actor/world preserved.
- [x] Production build,19 commission rule tests,39-capture feature suite, play-mode regression and frame client pass; no unexpected console errors. Close/reopen, midpoint/deadline, rejection/retry, cancellation, quotas, story and focus verified.
- [x] Desktop/tablet/phone/short-landscape/DPR2 touch, scrolling rules,125% text enlargement and reduced motion checked. Actual screenshots inspected. Actual texture audit:12 cases/262 runs/minimum4.75:1; separate computed CSS cases minimum4.51:1.
- [ ] Actual owner acceptance, physical devices/Safari/screen readers, native browser-menu zoom and long endurance remain unverified.

Evidence, commands, assets and retained preview: [active contract report](../tasks/16-commission-contract.md).

## Noah wooden commission board — 2026-10-14

- [x] Owner-approved preview implemented for Noah: riverside actor stage, timber frame, paper task slips, hour tokens, live quota/reward and one main action. Existing commission rules and story topic preserved.
- [x] Two original textless assets packaged losslessly with prompts/hashes; existing actor and world unchanged. All Chinese text and controls remain DOM. 33-image/source audit passes.
- [x] Production build, 19 commission backend tests, final 30-capture browser feature suite, play-mode regression and skill frame client pass. Zero unexpected browser errors; 28 contrast cases / 828 runs / minimum4.97:1 using computed CSS backgrounds.
- [x] Desktop/tablet/phone/short landscape, 375px/DPR2 touch, scrolling, focus wrap, Escape, expanded rules, reduced motion and larger journal text checked. Actual screenshots inspected; close remains visible while scrolling.
- [ ] Owner acceptance of the actual implementation, physical Safari/devices, native browser-menu zoom and multi-hour endurance remain unverified.

Evidence, commands, asset provenance and cleanup: [commission board report](../tasks/15-commission-board.md).

## Character point allocation — 2026-10-14

- [x] Owner-approved concept implemented with vitality/stamina, five concrete growth paths, three available point balances and exact-cost purchases; no EXP display in the dossier.
- [x] Server prices, compatibility defaults, concurrency/retry guards, receipt deltas and reload/recovery verified; existing XP/inventory preserved.
- [x] Production build, 108 backend tests, 15-capture browser flow, existing play-mode regression and game frame client pass; no unexpected browser errors.
- [x] 1440/1920/768/390/720 layouts, DPR2 touch, large DOM text, keyboard/focus and reduced motion checked. Actual captures inspected; 77 text runs/minimum 4.97:1.
- [x] Existing 31 source/runtime images preserved; only the approved concept reference and prompt added outside runtime.
- [ ] Physical device/Safari/native browser zoom and owner acceptance of the actual implementation remain unverified. Combat/skill effects remain outside scope.

Evidence and cleanup: [character points task record](../tasks/14-character-points.md).

## NPC reality commissions — 2026-10-14

- [x] Noah dialogue choices → hours → timed acceptance → settlement/cancellation; three point types and five-point daily quota are server-authoritative. Early, repeated and concurrent commands are covered.
- [x] HUD growth entry is a journal with real active/settled/cancelled records, truthful marker navigation and retained legacy records. Legacy note completion cannot mint new points.
- [x] Existing NPC art/tokens/icons reused; no new artwork or font. Desktop/tablet/phone/short-landscape/DPR2 emulated touch, keyboard/Escape/focus, reload, reduced motion and larger text checked.
- [x] 95 backend tests, production build, 24-capture feature flow, focused and complete world regressions, and skill frame client pass. No unexpected console errors. Contrast: 22 cases, 705 runs, minimum 4.97:1.
- [ ] Actual owner acceptance, physical devices/Safari/native zoom, multi-hour real-time endurance and production PostgreSQL load remain unverified. Browser maturity states use an explicitly isolated fixture.

Evidence, exact files/commands and retained preview: [NPC commission report](../tasks/13-life-commissions.md). Separate concurrent character-panel changes are excluded from this checkpoint.

## Knowledge research — 2026-10-14

- [x] Learning completion awards an actual point once; selected science/magic investment, receipt deltas, current levels and provenance follow authoritative state.
- [x] Existing journal material, palette and icons reused; connector UI is original code. No new bitmap/font/audio; all 31 image/source checks pass.
- [x] Desktop/tablet/phone/short-landscape, 375 DPR2 touch, larger DOM text, keyboard/IME/tab ownership, pending/rejected/lost-response/conflicting actions and reload checked. Sources and 6+ level marks inspected.
- [x] Duplicate completion toast no longer covers the mobile research button; paper margins keep text off the darker edge. Ten actual texture contrast cases / 328 text runs / minimum 4.94:1 pass.
- [x] 76 backend tests, production build, 22-capture feature flow, original real-minute learning flow, 19-capture health regression, play-mode regression and game frame client pass. No unexpected console errors.
- [ ] Physical Safari/iOS/Android, native browser zoom/keyboard and production PostgreSQL concurrency/load unverified. Owner visual approval pending.

Files, commands, candidate screenshots and handoff: [knowledge growth](../tasks/12-knowledge-growth.md).

## Travel-kit HUD — 2026-10-13

Concept owner-approved; actual implementation verified and awaiting visual review.

- [x] Unified bottom rail, original pixel-object icons, actual appearance, identity/resources, quest note and utility keys; original actions and real quantities retained.
- [x] Five desktop/phone/tablet/landscape viewports, DPR2 emulated touch at 375/390/844, reduced motion, long name, focus and 44px controls checked; screenshots inspected.
- [x] Navigation/shortcuts, input/IME isolation, quick-slot assignment/reload/no consumption, sound persistence, marker-only guidance and existing full play-mode flow pass.
- [x] Build, 31-image/source audit and diff check pass; 57 HUD text samples, minimum 5.67:1; no unexpected console errors.
- [ ] Physical Safari/mobile devices/native browser zoom and actual owner acceptance remain unverified.

Evidence, exact commands and cleanup: [HUD task record](../tasks/10-hud-travel-kit.md).

## Woodland cottage and yard — 2026-10-13

Status: implemented and browser-verified candidate; **owner visual approval pending**.

- [x] One walkable home/yard slice, recognizable reading book and separate upgrade manual; unchanged collision/spawn geometry and existing IDs.
- [x] Actual approach/door/exit, reading→study→return/focus, storage conservation, rest, rejected/pending/accepted gathering and held-key handling checked.
- [x] 1440/1920/768/390/720 layouts and DPR2 emulated-touch 390/375/844, reduced motion, wall collision and short-landscape entry checked; final screenshots inspected.
- [x] 54 backend tests, production build, existing full game regression, final 25-capture cottage suite and skill frame client passed; no unexpected browser errors.
- [x] 31 source/runtime images unchanged; new original procedural artwork/source hash documented and audited. No new raster, font, sound or external acquisition.
- [ ] Physical Safari/iOS/Android and native browser zoom unverified.
- [ ] New upgrade appearances and furnishing-save expansion await owner's next authorization. Current candidate is not owner-approved.

Evidence and commands: [cottage prototype](../tasks/09-cottage-prototype.md).

## Study journeys — 2026-10-13

Status: implemented and browser-verified candidate; owner visual approval pending.

- [x] Plan/day/book history, reversible archive, title/time editing and recovery credential preview use real server state and existing Hearthwood art.
- [x] Desktop and phone layouts, 375px/landscape, large DOM text, focus containment, IME and reduced motion checked. Phone now prioritizes the selected chapter.
- [x] Real 62-second Chromium lifecycle freeze, second-tab pause, foreground/reload recovery, offline action rejection and lost-response retry checked.
- [x] Cookie-free recovery restores the latest server state with no repeated rewards; old v001 database survives migration to v002.
- [x] Twelve texture-sampled contrast cases / 302 text runs, minimum 4.89:1; 31-image source/hash audit passes.
- [ ] Physical Safari/iOS/Android lock-screen tests, native browser zoom and long background suspension remain unverified.
- [ ] Owner visual approval pending. Evidence and exact command outcomes: [study journey](../tasks/08-study-journey.md).

## Today study — 2026-10-13

Status: **implemented and verified; owner visual review pending**.

- [x] One complete learning-task/timer/record/growth/restore flow, existing art/tokens and authentic values; no duplicate completion rewards.
- [x] Actual desktop/mobile create, real-minute timer, pause/restore, failed/retried commands, association and unlock marker checked.
- [x] 1440/1920/768/390/720 layouts inspected; touch/DPR2, 375px/landscape, enlarged DOM text, keyboard/IME/Escape/focus and reduced motion checked.
- [x] 44 backend tests, production build, original full game smoke, frame client and 31-image audit pass. Final sampled text minimum 4.97:1 over 10 cases / 268 runs.
- [ ] Physical-device Safari/keyboard, actual browser-menu zoom and long-term operation remain unverified.
- [ ] Actual visual acceptance by owner remains pending.

Files, commands, screenshots, scoped provenance and retained preview services: [today-study report](../tasks/06-today-study.md).

## World-dialog candidate — 2026-10-10

Status: **implemented and verified; actual owner visual review pending**. User explicitly requested the six pictured dialogs after the earlier reference slices.

- [x] Wood/seed identities corrected with original 16px reproducible icons; stable IDs/quantities and all previous source hashes retained.
- [x] Distinct commission board, conversation, map, storage tray, repair order and efficient growth-recording compositions; shared Hearthwood controls/materials.
- [x] 1440×900 / 390×844 plus 768×1024 / 1920×1080 / 720×450 captured and inspected. Scrolling, no horizontal overflow, 44px DOM controls and keyboard place-marker alternatives checked.
- [x] Actual storage rejection/pending/retry/duplicates/conservation/persistence, focus/Escape/input ownership, emulated touch and isolated DEV preview checked.
- [x] Build, 32 backend tests, full smoke, RPG and journal regressions, 31-image asset audit and pixel rebuild check pass. Functional text sample minimum 4.65:1 across 36 cases.
- [ ] Physical-device Safari/touch, native mobile keyboard and browser-menu zoom unverified.
- [ ] Owner visual review pending; no further rollout.

Exact files, commands, recordings, limitations and final preview/cleanup: [task report](../tasks/05-world-dialogs.md).

Status values: `not started`, `implemented`, `verified`, `blocked`, `owner-approved`.
Do not pre-check a row because a component exists. Attach evidence and record the actual browser, viewport, scale, fixture, and commit.

## Reference record

- Candidate name: Hearthwood satchel inventory — 2026-10-10 (concept approved; actual render candidate)
- Commit or diff: uncommitted diff over `f1f9fe5`; no commit/push/deploy performed by this task.
- Primary world asset family: existing Ninja Adventure subset + project procedural art, unchanged; world reapproval outside this checkpoint.
- UI source family and exact selected files: original CSS + `styles/realquest-tokens.css` + generated `frontend/public/assets/hearthwood/satchel-shell-v1.webp` (source/prompt and lossless build recorded in manifest); existing `frontend/public/assets/ninja-adventure/icons/{seed,wood,stone,crop,plank,gold}.png`. Eight supplied UI PNGs remain source references only.
- Fixture/save identifier: isolated guest 林间旅人, appearance 0, position (240,320), seed 6 / gold 20; same cookie for before/after (`output/inventory-satchel/starter-session.json`, local only). Separate test guests for mutations.
- Viewports and device pixel ratios: Chromium 1440×900 / 390×844 / 1920×1080 / 768×1024 at DPR1; 390×844 emulated touch at DPR2; 720×450 effective reflow.
- Screenshots: [desktop candidate](../../output/inventory-satchel/after-1440.png), [phone tray](../../output/inventory-satchel/after-390.png), [phone details](../../output/inventory-satchel/after-390-details.png). Complete evidence in the task record.
- Interaction recording: `output/inventory-satchel/inventory-interaction.webm`; real action rejection/pending/commit snapshots and result JSON alongside it.
- Owner approval and date: **Satchel concept approved 2026-10-10; actual browser implementation not yet approved.**

## Visual checks

- [ ] World scale and HUD scale are independently correct.
- [ ] The player, doors, tools, and props have coherent proportions.
- [x] Pixel images are crisp; DOM text remains normally rendered.
- [x] The starter inventory works visually with only one occupied slot.
- [x] Empty slots do not overpower items or the primary action.
- [x] Title, quantity, selected state, and main action are readable.
- [x] Inventory has a compact timber nameplate, cloth silhouette, detached item tag and sewn pocket row; other screens were not redesigned.
- [x] Important text meets the contrast requirement on the real background.
- [x] Narrow layouts do not shrink desktop text or create horizontal overflow.
- [x] Inventory actions are in normal flow, with no sticky overlay covering content; world targeting is deferred.

## Interaction checks

- [x] Mouse, keyboard, and touch alternatives reach the same supported actions.
- [ ] Partial: selected/bound/depleted/pending/error states verified. Invalid world-target state is deferred to Pass B.
- [x] A quick-slot assignment does not consume the item.
- [x] A navigation action describes marking/pathfinding accurately.
- [x] Input fields and IME composition do not trigger world controls.
- [x] Escape dismisses the inventory and restores its opener; targeting cancellation remains deferred.
- [x] Blur and mode transitions clear held keys.
- [ ] Targeting shows an actionable valid plot, not an unrelated decoration.
- [x] Planting updates the actual inventory and world state.
- [x] Rejection, retry, duplicate activation, and reload are handled correctly.
- [ ] Sound and animation are optional, restrained, and nonblocking.

## Integrity and scope

- [x] Existing saves, item IDs, costs, and progression remain compatible.
- [x] Real before/after inventory is unchanged. Artificial stress fixtures are confined to the clearly labeled development preview.
- [x] Demo data cannot mutate a real save.
- [x] No new engine, full map rewrite, or unrelated economy change was introduced.
- [x] Original asset files remain unchanged and provenance is recorded.
- [x] Missing files/frames are documented rather than invented.
- [x] No source pack enters the runtime bundle. One generated lossless WebP shell is audited and packaged; original PNG/prompt stay outside public. Existing world assets are unchanged.

## Evidence

- [x] 1440 x 900 desktop captured.
- [x] 1920 x 1080 desktop checked.
- [x] 768 x 1024 tablet checked.
- [x] 390 x 844 mobile captured.
- [ ] Partial: DPR2, keyboard, reduced motion and 720×450 effective reflow verified; actual browser-menu zoom unverified.
- [x] A real touch test is recorded, or explicitly marked unverified.
- [x] Relevant build/type/test commands and outcomes are listed.
- [x] Browser console and failed network requests were examined.
- [x] Before/after captures use the same state and viewport.
- [x] At least one real operation flow was executed; not just screenshotted.

## Findings

| Severity | Observation | Evidence | Fix or deliberate exception | Status |
|---|---|---|---|---|
| Scope | Numeric shortcuts open inventory on a selected item, not a planting target | Existing scene/store + browser checks | Truthful labels; targeting remains Pass B | verified / deferred |
| Data | 24 cells are not a server-enforced capacity | `rules.py`, `types.ts` | Preserve cells; report owned types instead of false capacity | verified |
| Visual | Initial plain linen candidate felt like a dashboard | Owner-approved satchel concept and matched final images | Cloth shell, compact floating tag, sewn pockets; actual implementation needs review | verified candidate |
| Layout | Coin label overlapped the plaque during refinement | Final browser screenshot and new hit-test assertion | Anchored beside the close latch; earned-resource row tested on phone | verified |
| Asset | Supplied UI frames use unrelated saturated palettes | Contact sheet + source hashes | Keep source-only; use shared token CSS | verified |
| Access | Keyboard focus could leave inventory at the Tab boundary | Browser flow | Scoped focus loop + native Escape/focus return | verified |
| Limits | Real touch/Safari, actual browser-menu zoom, global world scale | Test scope record | Emulated touch/DPR2/reflow only; no broader approval | unverified |

Only extend this visual treatment across the application after the first reference has actual owner approval. A candidate screenshot is not a signed-off baseline.

Detailed commands, exact files, comparison, test outcomes and gaps: [Pass A task record](../tasks/01-inventory-slice.md). All checked items are scoped to this inventory candidate, not blanket approval of the application.

The current source of truth is the **Current checkpoint — satchel candidate** section of [the task report](../tasks/01-inventory-slice.md). Final visible text check: 21 samples, minimum 5.37:1 against opaque base colors. Physical Safari/touch and actual browser-menu zoom remain unverified. Concept direction approval does not authorize rollout before review of this rendered candidate.

## Character dossier reference — 2026-10-10

Current record: **verified implementation / owner review pending**. This is a separate character checkpoint, not a journal layout copied to another screen. Earlier inventory historical status is superseded by its recorded owner approval in `docs/tasks/01-inventory-slice.md`.

- [x] Real avatar/appearance, five attributes, EXP remainders, levels, thresholds and existing abilities/actions retained.
- [x] Single field-folder composition, live identity and growth marks, distinct from the journal spread.
- [x] 1440×900, 390×844, 768×1024, 1920×1080 and short 720×450 layout captured; mobile scroll and 44px controls checked.
- [x] Keyboard focus cycle/return, Escape, modal input ownership, non-teleporting markers and map action checked.
- [x] Actual learning/strength thresholds, level transitions, pending/rejection/retry, persistence and four-material collection checked.
- [x] 59 visible text runs checked against sampled actual texture beneath their ranges; minimum 4.63:1 after fixing legacy gold small text and faint supporting copy. This is scoped captured-state evidence.
- [x] Source/hash/pixel audit, build, 21 backend tests, existing RPG and journal regression passed.
- [ ] Physical-device touch/Safari and actual browser-menu zoom unverified (Chromium DPR2 touch and reflow checked).
- [ ] Matched old/new browser comparison unavailable: initial old-view capture was contaminated by hot reload; reconstruction attempts did not yield a reliable screenshot. Invalid evidence excluded. Final real views and unmutated starter state verified independently.
- [ ] Owner visual approval pending. No further dialog rollout.

See `docs/tasks/03-character-slice.md` for files, provenance, commands, screenshots and cleanup.

## Village arrival reference — 2026-10-10

Status: **verified implementation / owner review pending**. Owner approved the homepage concept and requested softer registration controls plus additional appearances; actual browser acceptance is separate.

- [x] Full-screen welcome illustration, live small traveler, signature line and six portrait tags, using Hearthwood paper/cloth/wood colors. Actual text/controls remain DOM.
- [x] Original IDs 0–2 remain byte-identical; three official CC0 walking sheets added as 3–5. All six create/reload/world/dossier flows checked; starter values unchanged.
- [x] 1440×900 / 390×844, 768×1024, 1920×1080 and short 720×450 screenshots inspected; no horizontal overflow; phone CTA visible and short-screen scrolling reaches action.
- [x] Keyboard, IME, reduced motion, 44px touch controls, rejection/pending/lost-response retry and duplicate-submit protection checked. Test contexts isolated from owner data.
- [x] Actual-background text sampling passes for desktop/phone default and hover, minimum 4.97:1. Build, 32 backend tests, existing RPG suite, game frame client and 29-image audit pass.
- [ ] Physical-device Safari/touch and native mobile keyboard/browser-menu zoom remain unverified.
- [ ] Actual render awaits owner visual approval; no further screen rollout.

See `docs/tasks/04-arrival-slice.md` for complete files, provenance, commands, captures, gaps and preview handoff.

## Health and stamina field journal — 2026-10-14

Status: implemented and browser-verified candidate; owner visual approval pending.

- [x] One daily exercise pledge, explicit manual records/linking, one health point, visible investment cost and capacity preview, real gathering/bed/time recovery.
- [x] Existing village/actor artwork and Hearthwood tokens; no bitmap/font/audio addition or fabricated possessions. Manifest reuse binding recorded; 31-image audit passes.
- [x] Desktop 1440/1920, tablet 768, phone 390, 720 reflow and DPR2 touch 375/844 inspected. Keyboard/IME/world ownership, focus return, scrolling, 44px buttons and reduced motion checked.
- [x] Failure, committed-response retry, duplicate linking, pending investment, persistence, zero stamina and marker-only bed navigation checked in an actual Chromium browser. Six contrast states / 190 text runs / minimum 4.97:1.
- [x] 64 backend tests, build, focused play-mode regression, full desktop/mobile game regression and skill frame client pass. No unexpected console errors.
- [ ] Physical Safari/iOS/Android, native browser zoom and actual owner acceptance remain unverified.

Files, exact commands, screenshots/video, rules and retained-preview/cleanup evidence: [task 11](../tasks/11-health-stamina.md).

## Noah acceptance, receipt and small talk — 2026-10-15

Status: implemented and browser-verified candidate; the three concepts are owner-approved, actual render acceptance pending.

- [x] Offer uses task slips, type illustration, exact pending reward/hour tokens and signing; receipt shows only server-confirmed credit, supports another promise/history/close; small talk shows actual dialogue and quest letter without reality quota.
- [x] Actual story acceptance/turn-in, claim rejection/retry/lost response, duplicate rewards, daily quota, topic persistence, keyboard focus/Escape, scrolling and DPR2 touch checked in isolated data.
- [x] Desktop1440/1920, tablet768, phone390/375 and720 reflow screenshots inspected; final phone CTA inside initial viewport,125% text and reduced motion checked.
- [x]48-capture feature suite/no unexpected errors,19 backend commission tests, build, existing play-mode flow, frame client and40-image hash/pixel audit pass. Actual texture:34 cases/690 runs/min4.68:1; computed46 cases/888 runs/min4.51:1.
- [x] Five textless built-in generated props retain original PNG/prompt/alpha and exact lossless runtime pixels; no vendor/font addition or invented possessions. Other NPC/world structures preserved.
- [ ] Physical devices/Safari, native browser zoom, actual screen-reader/device testing and owner render acceptance remain unverified.

Exact files, commands, source/prompt paths, screenshots, fixture disclosure and retained preview/cleanup: [task17](../tasks/17-commission-pages.md).

## Fine HUD/items and existing interiors — 2026-10-15

- [x] Five floating HUD surfaces share fine moss/linen/timber materials and native readable type; high-resolution original head/item art replaces coarse enlargements. Real counts and empty slots remain truthful.
- [x] All four existing rooms use fine floors/walls and independent furniture at two native pixels per world unit. Collision/door/action anchors, IDs and authoritative transitions retained; one exit caption.
- [x] Build,108 backend tests,21-capture village regression,12 HUD cases,23 room captures and inventory mutation/retry/reload checks pass. Desktop/phone images inspected.
- [x] Four viewport texture checks in default/hover states:8 cases /188 text runs, minimum5.47:1. Numeric pockets and short-landscape prompt placement corrected from actual rendered evidence.
- [x]33 original runtime assets /690,923 bytes, exact prompts/cuts/hashes and reproducible packing recorded;125 source/runtime images audited. Existing source packs/runtime image bytes preserved.
- [x] Final cottage25-capture suite and2-iteration game frame client pass; owned browsers/runners verified closed. Preview5211/API8043 intentionally retained for review; other active-task/shared tools preserved.
- [ ] Actual owner approval, physical Safari/mobile devices, native browser-menu zoom and multi-hour endurance remain unverified.

Evidence, commands, file scope and preview cleanup: [HUD/interior report](../tasks/19-hud-interiors.md).

## Village market and livelihood — 2026-10-15

Status: implemented and browser-verified candidate; owner visual approval pending.

- [x] Walkable shop/path/interior and Mira; server-priced trades, three daily deliveries and two story quests connect gathering/farming to income and home improvement.
- [x] Actual60-second farming, sales, all orders, home upgrade, persistence, rejection/retry, lost-response reconciliation and reward-once checks pass;124 backend tests pass.
- [x]25 flow captures across desktop/tablet/phone/short reflow, emulated DPR2 touch/reduced motion, focus/keyboard isolation and marker-only map navigation verified. Nine final layout states/357 actual-texture text runs pass, minimum5.53:1;44px controls, enlarged375px text and bottom-action scrolling checked.
- [x] Original generated shop/counter preserve exact sources/prompts/alpha with reproducible packing;211,708 runtime bytes. Final shared-tree audit133 images passes. Mira's appearance5 reuse is explicit, not claimed unique art.
- [x] TypeScript/build, skill frame client and diff checks pass. Owned test browsers/runners exited; fixed5295/API8095 isolated preview intentionally retained and health checked.
- [ ] Owner render acceptance, physical devices/Safari, native zoom, screen readers and multi-day economy/endurance unverified. Existing distant-exit HUD pointer overlap remains documented; keyboard door flow passes.

Exact files, commands, captures, fixtures, provenance, remaining scope and cleanup: [market report](../tasks/22-village-market.md).

## Village residents — 2026-10-16

Status: implemented/browser-verified candidate; actual owner render approval pending.

- [x] Three independent NPC identities across world/portrait/map/dialogue; six player sheets unchanged. Nine runtime PNGs/210,614bytes, exact prompts/crops/hash/rebuild and original alpha sources recorded;142-image audit passes.
- [x] Walkable daily routes, door transitions, midday gathering, evening whereabouts, neighbor book and marker-only navigation. Shared active world clock pauses for reading/background/leave; real deadlines and quotas remain separate.
- [x] Contextual topics, finite gifts/help, familiarity story gate, remote/stock/stamina rejection, concurrency, idempotent retry and preservation covered;140 backend tests pass. Shop counter remains usable while Mira is out; Noah's indoor quest/commission access verified.
- [x]20-capture actual browser flow,36 final desktop/landscape layout states,1061 actual-texture text runs/min4.79:1,44px controls, focus/world ownership, scrolling/close, DPR2 touch/reduced motion, build/frame-client/format/diff checks pass. Screenshots inspected.
- [x] Owned browsers/runners/fixture services closed; fixed5295 preview and normal8095 API intentionally retained/healthy. No player-data reset or commit/push/deploy.
- [ ] Physical devices/Safari/native zoom/screen readers, full-day/endurance and owner render acceptance remain unverified. Portrait phone review is outside current scope. Sleep/fainting/lodging/weather/seasonal schedules remain future work.

Exact scope, files, source prompts/provenance, commands, fixtures, screenshots/recordings and cleanup: [resident report](../tasks/25-village-residents.md).

## Departure and city lodging — 2026-10-16

Status: independent travel/lodging implementation verified candidate; owner visual approval pending. These historical task27 checks do not certify the village combat prerequisite; its later implementation and evidence are recorded separately in task28.

- [x] Existing save can accept the new chapter, choose bridge/ferry, prepare rope/current stamina, cross the mountain, deliver the letter, pay for a valid night, wake in the inn, return and claim once. Map navigation only marks direction.
- [x] Server quotes/rechecks arrival before01:00, shortfalls, daily work, permanent bridge/rope, proximity and day/location;15 new tests and174 retained tests pass, including rejected/concurrent/replayed mutations, old save conservation and reachable interaction/arrival points.
- [x] Original static Adu/Lanya are distinct from the existing cast; matching actors/figures/portraits and cliff/boat have immutable sources/prompts and reproducible hashes.10 runtime PNGs/599,517bytes;156-image audit passes. Old player/resident art retained.
- [x] Final production14-flow/23-capture browser suite and9-flow/16-capture prior sleep regression pass, zero unexpected browser errors. Desktop and landscape, keyboard/focus/held input, scrollable actions, DPR2 touch/reduced motion and morning-dismiss HUD behavior checked; actual images inspected. Supplied frame client passes2 iterations; TypeScript/build, formatting and diff checks pass.
- [ ] Owner render/gameplay balance, physical devices/Safari/native zoom/screen readers, multi-day endurance and production PostgreSQL load remain unverified. No combat, technology/magic effects or home expansion added. Combat-first integration awaits its own slice.

Source paths, exact commands, screenshots/recordings and cleanup: [task27](../tasks/27-departure-city.md).


## Village combat — 2026-10-16

Status: playable implementation candidate; owner visual and balance acceptance pending.

- [x] Four distinct weapon data/recipes, armory/equipment/spell panels, five-floor cave, original enemy geometry/telegraphs and unique boss key; no new third-party, raster, font or audio assets. Existing156-image audit passes.
- [x] Actual production keyboard run clears all five floors, collects the boss key and permanently opens the gate only at magic3; purchase retry, crafting shortages, menu pause and reload checked. Screenshots were inspected.
- [x] Control6-flow/7-capture suite checks initial sword/Boss phase2, defeat, DPR2 touch landscape, paused inputs, injected blur/resume and retreat; final cave frame client2 captures inspected. Task28 records exact scope and cleanup.
- [ ] Owner art/balance acceptance, native tab/OS focus, physical devices and long-run/production-load verification remain pending; build/test passes do not establish them.
