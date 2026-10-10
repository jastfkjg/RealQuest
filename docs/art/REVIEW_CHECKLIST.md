# Hearthwood Review Checklist

Status values: `not started`, `implemented`, `verified`, `blocked`, `owner-approved`.
Do not pre-check a row because a component exists. Attach evidence and record the actual browser, viewport, scale, fixture, and commit.

## Reference record

- Candidate name:
- Commit or diff:
- Primary world asset family:
- UI source family and exact selected files:
- Fixture/save identifier:
- Viewports and device pixel ratios:
- Screenshots:
- Interaction recording:
- Owner approval and date: **Not obtained yet**

## Visual checks

- [ ] World scale and HUD scale are independently correct.
- [ ] The player, doors, tools, and props have coherent proportions.
- [ ] Pixel images are crisp; DOM text remains normally rendered.
- [ ] The starter inventory works visually with only one occupied slot.
- [ ] Empty slots do not overpower items or the primary action.
- [ ] Title, quantity, selected state, and main action are readable.
- [ ] No giant default title slab is repeated across every screen.
- [ ] Important text meets the contrast requirement on the real background.
- [ ] Narrow layouts do not shrink desktop text or create horizontal overflow.
- [ ] Fixed actions do not cover content, targeting, or the player.

## Interaction checks

- [ ] Mouse, keyboard, and touch alternatives reach the same supported actions.
- [ ] Selected, bound, depleted, pending, and invalid states are distinct.
- [ ] A quick-slot assignment does not consume the item.
- [ ] A navigation action describes marking/pathfinding accurately.
- [ ] Input fields and IME composition do not trigger world controls.
- [ ] Escape exits the topmost appropriate context and restores focus.
- [ ] Blur and mode transitions clear held keys.
- [ ] Targeting shows an actionable valid plot, not an unrelated decoration.
- [ ] Planting updates the actual inventory and world state.
- [ ] Rejection, retry, duplicate activation, and reload are handled correctly.
- [ ] Sound and animation are optional, restrained, and nonblocking.

## Integrity and scope

- [ ] Existing saves, item IDs, costs, and progression remain compatible.
- [ ] No fake inventory or real-life achievements were added for screenshots.
- [ ] Demo data cannot mutate a real save.
- [ ] No new engine, full map rewrite, or unrelated economy change was introduced.
- [ ] Original asset files remain unchanged and provenance is recorded.
- [ ] Missing files/frames are documented rather than invented.
- [ ] Runtime bundles contain only the required asset subset.

## Evidence

- [ ] 1440 x 900 desktop captured.
- [ ] 1920 x 1080 desktop checked.
- [ ] 768 x 1024 tablet checked.
- [ ] 390 x 844 mobile captured.
- [ ] HiDPI, DOM zoom/reflow, keyboard, and reduced-motion checks recorded.
- [ ] A real touch test is recorded, or explicitly marked unverified.
- [ ] Relevant build/type/test commands and outcomes are listed.
- [ ] Browser console and failed network requests were examined.
- [ ] Before/after captures use the same state and viewport.
- [ ] At least one real operation flow was executed; not just screenshotted.

## Findings

| Severity | Observation | Evidence | Fix or deliberate exception | Status |
|---|---|---|---|---|
| | | | | |

Only extend this visual treatment across the application after the first reference has actual owner approval. A candidate screenshot is not a signed-off baseline.
