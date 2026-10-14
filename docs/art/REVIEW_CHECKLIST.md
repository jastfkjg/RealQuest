# Hearthwood Review Checklist

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
