# Hearthwood Review Checklist

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
