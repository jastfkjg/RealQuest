# RealQuest Repository Guidance

## Scope and source of truth

From 2026-10-20 onward, Cocos is the sole client source of truth for implementation, playtesting, and acceptance. Do not add React/Phaser work or legacy-client compatibility gates to new tasks; shared backend and game rules remain in scope.

RealQuest has two connected experiences: a playable cozy pixel RPG and a practical real-life growth interface. Preserve both. Do not turn the world into a dashboard or force life recording through in-world navigation.

Before changing visual or interaction code, read:

1. `DESIGN.md` for the Hearthwood direction and screen contracts.
2. `docs/art/ASSET_PLAN.md` and `docs/art/asset-manifest.json` for assets and provenance.
3. `docs/art/REVIEW_CHECKLIST.md` for acceptance evidence.
4. The specific task document and any owner-approved reference screenshots.

These documents describe intended behavior; they do not establish that any implementation already exists. Inspect the repository and running application. Respect applicable parent and nested instructions. If this file is being introduced into an existing project, merge it with existing valid guidance rather than silently replacing commands, security rules, or workflow requirements.

## Establish the actual environment

Inspect the Git status, README, package manifests, lockfiles, Python configuration, database migrations, Cocos entry points, build provenance, and Creator version. Reuse the established package manager, scripts, ports, and dependency versions. Do not assume `npm`, `pnpm`, or a particular test command exists.

Find the real development and test commands and record them in the task report. Start services in the authorized environment when possible. A URL on the owner's localhost is not automatically reachable from another runtime. Report unavailable services accurately; do not claim browser testing when only a build ran.

Preserve unrelated working-tree changes. Never reset or delete player data to make a visual test pass. Do not commit, push, deploy, purchase assets, migrate engines, or change account settings without authorization.

## Default local delivery

- The user's single local entry is `http://127.0.0.1:5443/`, serving `clients/cocos/web-current/web-desktop` with API8143. Every completed feature and fix must reach this default entry; an independent preview alone is not delivery.
- Isolated candidate builds, ports and disposable saves are for internal QA. After validation, integrate the feature into the default build and preserve the existing default database, cookie name and browser credentials. Never switch the user to a fresh save to expose an update.
- Before reporting completion, verify the default build's current-source receipt and payload, confirm5443 actually serves that build, and check the changed flow there. If an update needs a service restart, preserve its save configuration; retain a rollback build and avoid partially overwriting a served package.
- If the default entry cannot be updated or verified, report that remaining gap explicitly. Do not describe a candidate-only feature as delivered or substitute another port in the handoff.

## Implement one coherent slice

Unless the task explicitly changes scope, implement one screen or one end-to-end interaction chain. The initial slice is defined in `docs/tasks/01-inventory-slice.md`. Do not expand it into new maps, combat, currencies, social features, or unrelated AI work.

Make a short plan, then implement. Prefer existing components and APIs over parallel replacements. A missing asset should produce a documented gap or a clearly marked temporary fallback, not an invented path or a fake working control.

Do not ask for permission for every small engineering choice. Obtain an explicit visual checkpoint before rolling a new treatment across unrelated screens, and confirmation before destructive, paid, or externally visible actions.

## Visual implementation rules

- Prioritize desktop web display for future UI design, implementation, and visual review. Provide reasonable support for phones in landscape orientation; phone portrait layouts and testing are out of scope.
- Use the shared tokens and Hearthwood component states. Do not invent a new palette, font scale, or frame treatment for each page.
- Share primitives, not identical layouts: inventory, journal, map, dialogue, and Life Mode have different structures.
- Keep world units, source pixels, and CSS pixels distinct. Do not scale DOM text with the camera or resize individual world objects to hide a camera problem.
- Keep pixel imagery crisp and text readable. Never enlarge a tiny sprite indefinitely to simulate higher-detail art.
- Make empty space and empty slots intentional. Never fabricate possessions or achievements to improve a screenshot.
- Interaction semantics come first. A navigation button must not secretly teleport; a quick slot must accurately describe whether it selects an item or opens details.
- Implement relevant default, hover, pressed, selected, focus, disabled, pending, success, and failure states. Do not add meaningless states merely to satisfy a checklist.
- Preserve readable Chinese localization through existing text resources; do not bake text into artwork.

## Asset handling

Treat the bundled Ninja Adventure PNGs as unmodified source references until mapped and visually accepted. Selected Kenney packs are acquisition entries, not files already installed in this repository.

Audit existing artwork before downloading replacements. Use official creator sources and record license, upstream file, dimensions, and hashes. Never claim a filename, animation, slice margin, or atlas frame exists without checking it. Keep semantic game IDs stable while replacing presentation bindings.

Use only authorized assets. Do not upload restricted third-party assets to external generation services or redistribute paid source packs without permission. Do not copy fonts from a developer machine. Existing approved system-font fallbacks are sufficient for this slice.

Keep source packs out of runtime bundles. Changes to sprites, palettes, or atlases need reproducible processing and provenance. Do not modify source files in place.

## Input, state, and lifecycle

Use explicit input ownership for world play, dialogs, targeting, and Life Mode. Ignore gameplay shortcuts while text inputs, editable content, or IME composition own focus. Clear held keys on blur and mode change. Escape should dismiss the topmost relevant context and return focus appropriately.

Avoid duplicate Cocos instances and listeners, but do not mandate keeping the same instance alive. A clean remount is acceptable if state, focus, timers, and performance remain correct. Do not synchronize every frame of player movement through UI state.

Preserve authoritative inventory, quest, reward, and world-state transitions. UI selection can be immediate; resource mutations must reconcile with the server. Handle pending actions, retries, and rejection without duplicate rewards or item consumption. Keep saves and stable identifiers compatible.

## AI and real-life data

AI may propose plans and narrate supported state. It must not mint currency, rewrite balances, claim behavior was verified, or invent unlocks. Important plan changes remain reviewable. Keep manual, timer, imported, and demo provenance explicit; simulated data stays isolated.

Keep provider secrets on the server. Minimize personal data sent to models. Do not add surveillance, payment access, health-platform integrations, or economic incentives during a visual task. Core play and manual recording remain usable without a model connection.

## Tests and visual review

Test public behavior and data integrity with small deterministic fixtures. Cover input ownership, selection, quick-slot assignment, failed/retried mutations, persistence, and mode switching. For AI, check schemas and safety boundaries; do not assert exact wording, search terms, reasoning, or arbitrary tool-call order. Keep semantic quality evaluation separate.

Run relevant lint/type/build/backend checks using discovered scripts. For visual changes, use the actual browser when available and capture the changed screen at the documented viewports. Inspect screenshots yourself; do not treat their existence as proof of quality. For interaction changes, execute the flow and record it when possible.

Use accessible roles and stable semantic selectors. Avoid exact framebuffer assertions for every animated pixel. Control fixtures and time for comparison without hiding broken normal behavior. Check keyboard, touch alternatives, focus, scrolling, contrast, reduced motion, and console errors.

A build pass is not a visual pass. A static screenshot is not an interaction pass. If a check cannot run, label it unverified and explain the missing dependency.

## Completion report

Report actual changed files, the implemented flow, asset additions and provenance, commands with outcomes, screenshots/recordings, and remaining gaps. Distinguish completed, preview-only, blocked, and unverified work. Never mark a reference screen as owner-approved without that approval.

Keep `AGENTS.md` short and durable. Put detailed visual specifications in `DESIGN.md`, task progress in task documents, and source metadata in the asset manifest. Do not append the entire development history here.
