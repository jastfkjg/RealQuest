# Task 01 — Inventory to Soil Reference Slice

## Outcome

Produce one believable Hearthwood inventory and a reliable seed-to-soil interaction. Do not redesign all screens. The visual direction is selected; do not reopen an unrestricted style search. The first rendered screen still needs owner signoff.

## Inspect first

Read the root guidance and asset plan. Identify the actual inventory model, item registry, quickbar, planting API, server transaction behavior, input ownership, and current sprite sources. Capture the current inventory with the same starter save used for the new reference. Do not change balances or seed quantities for appearance.

## Pass A: component and inventory reference

Create or reuse a development-only UI preview route, such as `/dev/ui`, gated from production. It should show the relevant button, slot, tooltip, selection, disabled, and pending states. Use the existing icon family and the supplied tokens. Audit the bundled source samples and import the selected Kenney UI pack only when its matching elements improve the chosen treatment. Do not render every available skin together.

Implement the inventory layout in DESIGN.md: compact header, quiet tray, clear occupied item, selected details, and an understandable quickbar. Reuse true quantities and capacity. Add a sparse starter fixture, a full fixture, a long-label fixture, and a rejected-action fixture in the development preview only.

Capture desktop 1440 x 900 and mobile 390 x 844. Evaluate icon size, contrast, focus, empty-slot emphasis, and primary action placement. Supply a brief comparison and stop at this visual checkpoint for owner approval before broad rollout.

## Pass B: complete the action chain after the checkpoint

1. Select the existing seed item.
2. Assign it to an existing quick slot without consuming inventory.
3. Close inventory and resume world input at the same position.
4. Select the quick slot and show a valid nearby planting target.
5. Confirm planting using the existing server contract.
6. Show a short pending state; block accidental duplicate activation.
7. On success, update the seed count and plot presentation together.
8. On rejection, retain or restore the correct inventory and explain the reason.
9. Reopen inventory, switch modes, and reload to verify the committed state.

If the existing game has no planting action, report that gap. Implement only the smallest compatible action needed after confirming scope; do not disguise a preview animation as persisted farming.

## Required tests

- Selection and quick binding do not consume items.
- Clicking, keyboard selection, and a touch alternative reach the same supported action.
- Empty/depleted items cannot be consumed; stale shortcuts remain truthful.
- Typing and IME input never move the player.
- Escape cancels targeting before closing an unrelated screen.
- Duplicate confirmation and retry after a timeout do not double-consume.
- A rejected request does not leave a false planted plot.
- Reopening and reload preserve actual quantities and plot state.

## Deliverables

Actual component changes; asset binding updates; recorded license/source metadata; screenshots at matched state; a short interaction capture when possible; exact check results; remaining limitations. Update the review checklist without pre-checking unexecuted tests.

## Out of scope

New crops, new currencies, drag-and-drop frameworks, equipment systems, full map rebuilding, global asset replacement, economic rebalancing, new AI agents, and engine migration.
