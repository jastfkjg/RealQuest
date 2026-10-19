# RealQuest Design System

**Direction:** Hearthwood — a cozy pixel-life adventure with a practical life companion.  
**Version:** 1.0, 2026-10-10.  
**Status:** Hearthwood direction and actual satchel inventory owner-approved (2026-10-10). Journal and adventurer dossier implemented. Village arrival concept approved; welcome implementation is the current visual checkpoint. See the scoped task records for individual approval and evidence.

## 1. Purpose and boundaries

On 2026-10-17, the owner selected Cocos as the primary client direction and requested a source-based feature-gap and retirement checklist. Keep the original React/Phaser implementation for comparison, save continuity and rollback during transition; do not delete code or switch deployment as part of this audit. Required functional, validation and tooling gates live in [task39](docs/tasks/39-cocos-primary-retirement.md). This direction does not imply visual approval of the current Cocos candidate or completion of migration.

On 2026-10-19, the owner asked for the overall candidate to be completed before providing further feedback. Continue independently within the authorized development and verification scope, collect the remaining visual/gameplay review into one final handoff, and do not block engineering on per-screen replies. Existing scoped approvals remain valid; deferred owner acceptance is not recorded as passed. System/account changes, external Git/publication actions and original Web retirement retain their separate authorization requirements.

The owner authorized an independent Cocos migration prototype on 2026-10-16 and permits UI/design improvements rather than reproducing the current pages exactly. Keep the existing Web implementation available. The prototype may simplify the travel HUD, inventory composition and dialogue while retaining Hearthwood materials, readable Chinese, truthful actions and direct Life access. Its render/feel remains a new checkpoint, not inherited owner approval; broad migration follows that checkpoint. Local scope and evidence: `docs/tasks/34-cocos-local-spike.md`. Phases2–3 are subsequently authorized: shared core, durable network/session/recovery and existing room/travel rendering. Keep this as a scoped candidate; see `docs/tasks/35-cocos-shared-world.md`. The owner subsequently authorized phases4–5: functional quest/economy/NPC/equipment/Life panels and the existing five-floor combat loop. Preserve the same server rules and original Web. Native layouts remain scoped candidates; actual render/feel approval is still open. See `docs/tasks/36-cocos-features-combat.md`.

RealQuest combines a playable RPG world with real-life growth. It must feel like a place to inhabit, not a beige task dashboard with a tilemap behind it.

This specification was prepared from product discussion and screenshots, not a repository audit. Treat descriptions of current code as hypotheses until inspected. Preserve working systems, player saves, identifiers, and balance rules. This document does not authorize a framework migration, full map replacement, or new progression economy.

Use this file as the visual and interaction specification. Read `AGENTS.md` for implementation rules and `docs/art/ASSET_PLAN.md` for asset acquisition and provenance. Implementation values below are project defaults, not claims about a third-party asset's dimensions or an external standard. An approved, recorded exception may refine a default; it must not silently create a second design system.

The owner confirmed the next gameplay direction on 2026-10-16: a remote starting village, monsters only in explicitly entered combat locations such as caves, purchasable or craftable weapons with different actual stats, and a large stone gate blocking the common departure route. Weapon crafting requires building level plus the recipe's science or magic level. First departure requires a specific magic stone and a minimum magic level; the first cave's bottom-floor boss is the proposed guaranteed stone source. Science-focused characters also need this basic gate-opening magic. Village introductions can be mixed, followed by river-and-mountain travel, city technology/magic advancement and an expandable home. Keep ordinary village spaces, outdoor roads and city streets free of monsters. Gameplay rules, material examples, growth requirements and provisional values live in [docs/game-design.md](docs/game-design.md); implementation order lives in [TODO.md](TODO.md). Day/night (task26) and the independent travel/lodging segment (task27) are implemented candidates. Caves, weapon systems, the stone gate and city advancement remain planned; neither design confirmation nor implementation implies owner visual approval.

## 2. The selected art direction

### 2.1 Hearthwood in one sentence

A small, sunlit woodland settlement: clear pixel silhouettes, moss-green accents, warm timber, pale linen, useful objects, and gentle feedback that makes everyday progress tangible.

**World:** orthographic top-down 2D with front-facing building elevations, one consistent source-pixel density, and handcrafted-looking composition. Use a 16-pixel terrain grid for new work unless the audited primary world pack requires a different coherent grid. Do not resample an existing coherent 32-pixel pack simply to meet this number.

**Game interfaces:** tactile but restrained. A backpack is a compact tray of objects; a quest journal is an index and a selected entry; a map is an interactive collection of places. They share tokens and controls, not an identical large modal with a dark title slab.

Different gameplay functions must not be expressed through one repeated generic modal template.
A quest board, a dialogue event, a world map, a storage chest, a blueprint page, and a life dashboard must have distinct interaction archetypes and visibly different layout structures, even when they share the same palette and design tokens.

**Life interfaces:** readable, efficient, and quiet. Use modern layout and typography with the same palette, avatar, icons, and reward vocabulary. Forms are appropriate here. Do not turn text entry or a focus timer into an elaborate fantasy prop.

### 2.2 What to retain and what to stop

Retain the current cozy setting, recognizable player, usable item icons, and any licensed, coherent world assets. Reduce heavy frame repetition, oversized source pixels, extreme empty-slot contrast, and always-expanded task descriptions.

Do not introduce photorealism, isometric buildings, neon/glass UI, random per-object pixel scales, full-screen parchment on every page, or decorative text baked into art. Do not reproduce a commercial game's characters, exact map, music, or distinctive interface artwork.

Dark source-pixel outlines are acceptable where they belong to the chosen world family. New original art should favor colored dark outlines. Do not globally blur, filter, or recolor every sprite to force a match; inspect a small scene first.

### 2.3 Visual priority

In the world: **player and current action > nearby interactive object > route and landmarks > ambient decoration**.

In a menu: **selected content and next action > available content > explanation > container decoration**.

Empty inventory slots are intentionally quiet. A one-item starter save must still look deliberate. Never invent extra possessions, rewards, or completed quests to make a screenshot look richer.

### 2.4 Fine village, HUD and rooms

The fine-village direction extends to the five in-world HUD surfaces and the four existing interiors (task19). Preserve moss cloth, thin timber/brass edges and pale linen, with native readable Chinese text. UI object illustrations and original-source head crops are64px; fine room scenery is authored at two native pixels per unchanged world unit. Utility controls use the existing fine native stroke family. Do not enlarge a16px item to stand in for detailed artwork.

Retain the480×368 room footprints, furniture collisions, object anchors and saved identities. Depth-sort furniture independently. Small screens follow the actor at a readable common camera scale; do not shrink individual furniture to fit. Exit prompts print an identical object/action caption once. Numeric quick-slot labels need their own quiet contrasting ground so a pale object cannot obscure a real quantity. Phone portrait and short-landscape layouts keep the status, quest note, toast, action prompt and menu clear of one another.

## 3. Palette, materials, and typography

The companion `styles/realquest-tokens.css` supplies initial implementation values. Scope the theme to RealQuest; do not overwrite unrelated global application styles.

| Token | Value | Use |
|---|---|---|
| Ink | `#27392F` | Main text on light surfaces |
| Muted ink | `#56614F` | Supporting text, still readable |
| Linen | `#F4EFDE` | Reading surfaces and selected details |
| Linen raised | `#FFFBF0` | Inputs, highlights, small foreground areas |
| Canvas | `#DEE3CF` | Inventory tray and secondary surfaces |
| Slot | `#D0D7BF` | Empty item-slot fill |
| Moss | `#3F6348` | Primary controls and active navigation |
| Moss hover | `#34533D` | Hovered primary control |
| Pine | `#233D31` | Compact HUD background |
| Timber | `#8F6E4D` | Limited material accents; not body text |
| Amber | `#D3A450` | Selection, reward accents, small highlights |
| Divider | `#B4B89C` | Quiet separation; not sufficient for every control boundary |
| Control border | `#687455` | Actionable boundaries on light surfaces |
| Success | `#376443` | Confirmed result |
| Danger | `#934537` | Error and destructive action |
| Water | `#60989E` | Map/water accents, not tiny body text |

Material rules:

- Use one primary material treatment per component. A linen surface may have a light timber edge; it does not also need a heavy inner frame, bevel, glow, and shadow.
- Large reading surfaces stay visually calm. Texture is optional and must not interfere with text.
- Do not stretch corner artwork. Use measured nine-slice borders or equivalent CSS where appropriate. Do not assume a source filename containing `nine_path` provides correct slice margins for every use.
- A technical NineSlice guide is in [Phaser documentation](https://docs.phaser.io/phaser/concepts/gameobjects/nine-slice); CSS [`border-image`](https://developer.mozilla.org/en-US/docs/Web/CSS/border-image) is an alternative for DOM controls. Check the installed Phaser version and renderer before using a specific API.
- Pixel artwork gets nearest-neighbor treatment. DOM text does not inherit `image-rendering: pixelated`, bitmap transforms, or a downscaled canvas.

Typography defaults, measured in CSS pixels at browser zoom 100%:

| Role | Size / line height | Treatment |
|---|---|---|
| Page title | 28 / 36 | Restrained display treatment; no giant marketing headline in menus |
| Panel title | 22 / 30 | Semibold |
| Section title | 18 / 26 | Semibold |
| Body / action label | 16 / 24 | Normal or medium |
| Supporting information | 14 / 20 | Normal |
| Compact numeric badge | 12 / 16 minimum | Short, nonessential information only |

Use a local system CJK-capable sans-serif stack for body text. A system serif stack may be used sparingly for titles. No font binaries are supplied. Do not make font downloading a prerequisite to a usable UI. If the project already has a licensed font, preserve it when it meets these rules. UI copy remains Simplified Chinese through the existing localization layer; engineering documentation and identifiers remain English.

Normal text must meet at least 4.5:1 contrast; large text at least 3:1 under the relevant [WCAG contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Check composited colors over real backgrounds. Amber and timber are not automatically safe text colors. Selection and errors must not rely on color alone.

## 4. Pixel scale and camera contract

### 4.1 Separate the three coordinate systems

Keep world units, source sprite pixels, and CSS interface pixels distinct. Device pixel ratio is a backing-buffer concern, not a reason to double gameplay zoom. Avoid scaling the entire page or React overlay with the world camera.

For the 16-pixel-grid baseline, initial camera targets are:

| Viewport in CSS pixels | Initial world scale | Intended visible player height |
|---|---|---|
| 1440 x 900 | About 3 CSS pixels per source pixel | Roughly 48-72 CSS pixels, depending on actual silhouette |
| 1920 x 1080 | About 4 CSS pixels per source pixel | Roughly 64-96 CSS pixels |
| 768 x 1024 | About 2 CSS pixels per source pixel | Roughly 32-48 CSS pixels |
| 390 x 844 portrait | Start at 2; verify usable context | Roughly 32-48 CSS pixels |

These are initial review targets, not a hardcoded multiplier for every object. Measure the visible silhouette, not transparent frame padding. If a sheet has a 48-pixel frame containing a 16-pixel character, the frame does not define the character's body size.

Do not enlarge a character independently of doors, props, and terrain to fix a camera issue. Review ratios: a doorway should admit the character; a bench should not look like a building; a loose branch should not dominate the street. Crop the world to the viewport rather than squeezing the entire map into it.

### 4.2 Motion and framing

**Approved fine-village exception (2026-10-15):** the owner approved `docs/art/references/village-fine-concept-v1.png` and requested the current village with fewer flowers/grass. Outdoor scenery now uses two native art pixels per world unit; actors use 48×64 frames at 2/3 world scale with a 54-native-pixel (36-world-unit) silhouette. Gameplay grid and saved coordinates remain unchanged. Outdoor camera fit uses width/640 and height/400 in half-step zooms (minimum 1.5), independently of DPR. At zoom 2/2.5 this gives 72/90 CSS-pixel actor height and approximately 1.33/1.67 CSS pixels per actor source pixel. This supersedes the coarse 16px actor baseline for this village; do not enlarge old 16px sprites to reproduce it. Exact cuts, palettes, real directional walk poses and processing are recorded in `docs/art/village-art-v2.json` and task 18. Interior layouts are outside this checkpoint.

Use a stable follow camera with a small dead zone and sensible bounds. Subpixel physics may be continuous; quantize the final display appropriately rather than rounding every physics update. Prevent visible shimmer and seams. Do not add camera shake to ordinary walking, opening menus, or recording a habit.

The spawn composition should reveal the home entrance, one nearby person or landmark, and a plausible next route. Do not spawn beneath a panel or behind an opaque foreground object. Fixed HUD belongs to screen space; world interaction prompts must be transformed and clamped correctly.

## 5. World composition and asset consistency

Use one primary world family. Preserve audited, licensed existing assets first. The selected fallback acquisition source is Ninja Adventure by Pixel-Boy and AAA; adopt a coherent subset only after a side-by-side audit. Its availability is not permission to replace every existing asset in one pass.

Create one polished yard before expanding the map. Use paths to join actual destinations, cluster vegetation in small purposeful groups, and give buildings role-specific props. Preserve collision clearance and walkable approaches. Sparse decorations are better than random noise.

At least three scales of detail should be readable: landmarks such as a home or bridge; usable objects such as a board or farm plot; quiet ground accents such as a flower cluster. Avoid repeated straight rows of identical trees unless the location intentionally represents an orchard.

Use feet-based depth for actors and sortable props where appropriate. Trees may require separate trunk and canopy layers. When foreground occlusion hides an important interaction, use a deliberate occlusion treatment rather than rendering every actor above every building.

Idle/walk directions must be real frames or a clearly documented temporary fallback. Do not claim new animations exist because a static sprite was translated. Ambient loops should be sparse; add water, a single smoke source, and one NPC idle behavior only after movement and input are stable.

## 6. Shared interface primitives

Implement these in the existing component structure; names below describe responsibilities, not mandatory new filenames:

- `GameSurface`: shared spacing, material edge, and reading contrast; composable variants, not a universal modal layout.
- `GameButton`: default, hover, pressed, focus-visible, disabled, and pending states where relevant.
- `ItemSlot`: empty, occupied, selected, quick-bound, depleted, and invalid-target states.
- `ItemDetails`: selected item identity, quantity, uses, and context-sensitive actions.
- `QuestEntry`: title, type, state, progress, and selected detail.
- `MapMarker`: world-linked destination, focus/selection, reachable or unavailable state.
- `InteractionPrompt`: current valid object and supported input.
- `RewardNotice`: confirmed delta and optional world-event link.

Primary controls use moss, light text, and a short pressed response. Selection uses a two-part cue such as an inset outline plus a corner marker. An empty slot has a quiet edge; do not fill it with repeated decorative dots. Disabled controls remain explanatory, not merely faded beyond readability.

Prefer DOM buttons and text for interactive overlays. Give dialogs a name, return focus to their opener, trap focus only where appropriate, and provide Escape dismissal. Hide or make underlying controls inert while a modal is active. A pointer-transparent HUD container must explicitly restore pointer handling for its interactive children.

## 7. Screen specifications

### 7.1 Play Mode

The world fills the playable viewport without document scrolling. Keep the player unobscured in the default view.

At 1440 x 900, start with a compact top-left status cluster around 240-300 CSS pixels wide and 64-80 high, a top-right utility cluster, a collapsed tracker showing one objective, and a centered bottom quickbar. Sizes are fit targets, not absolute-position instructions for every screen.

The quickbar distinguishes four assignable item slots from menu actions. `1-4` selects an equipped quick item during gameplay; it does not mean an undocumented teleport or item consumption. Reserve a clearly labeled Life Mode switch. Do not rely on an unlabeled plus or leaf icon for a core mode transition.

Desktop controls: movement, interact, inventory, journal, map, and Escape must be discoverable. Preserve established bindings unless a real conflict requires change. In touch mode, show controls based on input capability and user preference, not viewport width alone. Touch controls and desktop hints must not fight for the same space.

### 7.2 Inventory — the first reference screen

Intent: inspect an object, assign it, and use it in the world.

Desktop target: width up to 940 CSS pixels with responsive sizing. The owner-approved [satchel concept](docs/art/references/inventory-satchel-concept.png) refines this inventory contract: a moss cloth bag with stitched edges and leather buckles, a small timber nameplate, a linen tray, a detached item tag, and four sewn quick pockets. At 1440×900 the candidate uses a 600px bag and a 280px tag separated by world space. Keep the tag as tall as its content, not a full-height report sidebar. The decorative shell is an original generated asset; title, tabs, items, quantities and actions remain real DOM controls. Do not propagate this treatment to other screens until the actual inventory render is approved.

Respect the authoritative inventory model. The audited server has no capacity limit; the existing 24 display cells are a presentation tray, arranged 6 × 4 on desktop, not an asserted capacity. Start with 56-64 CSS pixel cells and 6-8 pixel gaps. Icons use integer scaling and clear counts. The apparent empty tray should be lighter and quieter than the occupied item. Quantity is bottom-right; the quick-slot marker, when present, is top-left. Do not show an item as possessed merely because a stale shortcut references its type.

The selected tag begins with icon, name, actual quantity, a short purpose and the most relevant action. Longer description, recipe, growth time and source are available under “用途与来源”. Gold stays visible in the compact header; earned energy and shards use a separate label row when needed. Empty quick pockets retain their stored references without depicting absent possessions. Their contents and assignment behavior remain accessible through labels and the help control. Do not copy selected-item identity into a large footer.

On narrow screens, use four columns with 52-60 pixel cells and a selected-details section below or in a deliberate subview. Keep actions reachable without introducing nested horizontal scrolling. Do not simply shrink the desktop layout.

Required interaction: select seed -> assign to an existing quick slot -> return to world -> select that quick slot -> preview a valid adjacent farm plot -> confirm planting -> reconcile quantity and plot state. Drag-and-drop is optional, never the only way to assign. Escape cancels targeting before it closes unrelated UI.

A button labeled as navigation must describe whether it marks a destination or begins pathfinding. Do not silently teleport. A use action cannot succeed remotely from an inventory panel when gameplay requires proximity.

### 7.3 Quest journal

Desktop: compact task index on the left, selected task details on the right. Mobile: index and detail subviews with an obvious Back action. Never fully expand every quest as one long report by default.

Distinguish available, active, ready to turn in, completed, and locked. Show the actual current objective and numeric progress where meaningful. Locked content is subdued and concise. Rewards use existing item icons plus accessible text. A tracked quest is not automatically a completed or accepted quest.

Tracking controls set a navigation target and world marker. Remove duplicate actions that produce the same result. The journal does not grant rewards by itself; use existing authoritative quest transitions.

### 7.4 World map

The map is the main navigation surface. Derive marker positions, route data, and player location from the same world coordinate system. Use recognizable building silhouettes or small portraits for points of interest. Reserve full descriptions for the selected marker.

A location index is a compact optional aid, not a large bank of buttons beneath a passive diagram. Unexplored regions are visually distinct. If safe pathfinding is not implemented, show a destination marker and state that limitation; do not draw a decorative route through obstacles. Do not add fast travel unless separately authorized.

Current archetype candidate (2026-10-13): the adventure map is the primary surface. Pointing at a landmark selects it in place; the destination dock's explicit “标记方向并返回” sets the existing direction marker and closes the map. The optional place index starts collapsed. Current position uses a filled navigation arrow, selection an amber bracket/ring, the tracked quest a flag, and rune requirements a lock. Unexplored landmark regions use hatching and question marks derived from persisted `discovered_*` events; buildings use `visited_*`. This is landmark discovery, not continuous fog-of-war. Undiscovered destinations remain navigable. Map geometry and anchors use authoritative coordinates; the travel chart compresses the vertical scale, with small leader lines for crowded markers. Touch uses a pannable surface with the same >=44px markers; zoom and recenter controls also work by keyboard.

**Approved map concept checkpoint (2026-10-15):** `docs/art/references/world-map-concept-v1.png` is approved for implementation. The map uses a textless fine-pixel terrain illustration and existing village silhouettes. A selected place is presented on an attached linen leaf with one explicit direction action. Map labels, place details, discovery/visit/quest/rune indicators, player position, zoom, pan, and navigation remain live DOM/state. The decorative terrain does not claim a verified walkable route; the action marks direction and returns to world play. Default selection may show the library as an example without changing navigation or save state.

### 7.4a Interaction archetypes

**Cocos conversation correction (2026-10-17, task46, candidate):** owner rejected the prior fixed-column dialogue as data/PPT-like. Actual actors/room now frame the encounter; one compact low speech surface reveals phrases, explicit continuation opens separate replies, and confirmed numeric social outcomes remain outside spoken words. Camera/facing are cosmetic; original positions, routines, commands and saves remain authoritative. Reduced motion reveals immediately. This does not approve other native panels or retirement of the original Web.

**Requested refinement (2026-10-16, task30):** keep the board title outside its content layout and fit the pinned index and selected sheet within the desktop/landscape viewport. Use explicit pages for long objectives and preparation notes. The market uses shelves plus a checkout strip, bedside rest uses the existing bed illustration and two choices, and equipment uses moss cloth with a truthful empty rack. These four requested surfaces share a thin timber edge. The square control geometry is superseded by task31 below. World NPC activity/road placards are removed; the existing interaction prompt and neighbor book retain their information. Buildings sort at the solid facade edge so a traveler at the door is visible. Ordinary world notices sit at the lower edge for about1.8s; persistent errors remain dismissible. Actual-render acceptance is separate.

**Overall control refinement (2026-10-16, task31):** the owner requested softer, more game-like buttons and content surfaces across existing pages. Shared primitives now use restrained asymmetric soft corners, painted-moss timber actions, linen secondary actions, round utilities and attached bookmark tabs. Market objects sit on small timber shelves with selected name tags; rest actions are compact beside their choices. Inventory pockets, reading entries, dossier, map/storage/blueprints, encounters, travel/preparation, Life/study/training and menu controls retain their distinct compositions and truthful values. Calendar cells and page spreads keep the geometry needed for their meaning. Hover, physical press, keyboard focus, disabled/pending and reduced motion remain distinct. No new art, palette, font, gameplay or reward rule is introduced. See [task31](docs/tasks/31-living-controls.md) for actual-render evidence; owner acceptance remains pending.

**Functional popup compositions (2026-10-16, task32):** the owner requested full redesign of the remaining generic popup family. Armory uses a timber rack, moss-cloth object display and one selected paper work order, with purchase/craft/handbook tabs. Spell, cave and gate have an illustrated side plus a decision sheet; cave/gate rules use explicit handbook pages. Storage keeps paired actual containers with six item types per leaf. Building separates its blueprint/materials from the workshop counter; travel shows one real quoted option at a time. Menu, guide, settings and the inactive AI page reuse village timber/paper framing, with guide/settings split into native pages. All Chinese values and authoritative actions stay live. This extends the shared materials, not the inventory/diary/NPC layouts. Actual-render acceptance remains pending; evidence is in [task32](docs/tasks/32-field-panels.md).



Owner-approved board/Lia direction (2026-10-15): the village board is a timber object with short pinned notices and one open illustrated parchment. Lia's conversation uses an actor-free library stage, the actual traveler and Lia, a compact nameplate/portrait and one low dialogue surface. The optional quest expands within the paper; Escape first folds it and returns reply focus. Noah retains his existing commission composition. All state and text remain native controls; actual render review is separate. References and evidence: `docs/tasks/21-board-library-dialogue.md`.

Share palette, item identities, readable Chinese typography, focus/pressed/pending/error behavior, and modal focus ownership. Do not share a fixed header/body/footer composition. A new screen must first choose its interaction archetype:

| System | Composition | Primary interaction |
|---|---|---|
| World map | Interactive geography, landmark silhouettes, compact destination dock; collapsed index | Select a landmark, then explicitly mark direction |
| Quest board | 2–4 short pinned notices on timber, one open selected commission | Choose, inspect progress/rewards, accept or turn in |
| NPC encounter | Character/place stage beside a low dialogue surface; optional request below | Reveal dialogue, continue to the request, accept or leave |
| Storage chest | Two item grids, one shared selected-item transfer strip | Select an item, move one unit between backpack and chest |
| Building upgrade | Moss drafting grid, existing building image, current/next effects, icon-first materials | Check exact shortfall and start an authoritative upgrade |
| Growth recording | Full-height utility workspace, timer and manual form, recent actual reward receipt | Record an action with explicit source; read saved reward |

On phone the board has a short row of notices above selected details; storage stacks its two compact containers. NPC identity moves above dialogue. Never expand all quests into articles or substitute a resource-row table for item transfer. Blueprint art represents the existing building, not a fabricated next-stage asset. Full Life Mode planning/history and the separate Today study feature are outside this visual pass.

Noah commission direction approved on 2026-10-14: a warm wooden board holds a riverside character stage and one paper commission. Topic tabs and authoritative daily quota lead into three short task slips, wooden hour tokens, an exact reward preview and one acceptance action. Rules expand on demand; active countdown, settlement, cancellation and the story topic use the same board. On phone, identity becomes a compact scene strip above the paper. The river illustration is presentation only. Other NPCs retain their encounter layout. Actual candidate evidence: `docs/tasks/15-commission-board.md`.

The second approved preview replaces the active/ready right pane with a signed parchment on moss cloth: one hourglass with server-time-derived sand, a small time note, a state ribbon and a sealed pending-reward tag. Waiting offers “收起委托”; reaching the server deadline offers the existing settlement action. Cancellation and rules stay secondary. Duplicate acceptance notices are suppressed while the contract itself confirms acceptance; errors remain visible. The same promise closes/reopens without cancelling, and all text/actions remain DOM. Evidence: `docs/tasks/16-commission-contract.md`.

Wood/seed and other imagery reuse the audited registry unchanged. This pass adds no bitmap assets, fonts, purchases, currencies, or save fields. The actual render is a **candidate**, awaiting owner visual review. Evidence: `docs/tasks/07-ui-archetypes.md`.

### 7.5 Character sheet

The owner approved the illustrated dossier treatment on 2026-10-15 (`character-dossier-concept-v2.png`). A left identity/resource column faces open knowledge/skill medallions with adjacent point balances and one contextual growth slip. Native labels, levels, selection rings and controls remain separate from five textless illustrations. On small screens identity becomes compact and selecting an ability focuses its detail. Insufficient points open commission guidance, a marker-only Noah action and the existing growth journal; acceptance/settlement still require proximity. Escape first dismisses expanded guidance and restores focus. Implementation and actual-render evidence: `docs/tasks/23-character-dossier.md`.

Owner approved the point-allocation concept on 2026-10-14. The dossier presents identity, current/max vitality and stamina, science/magic levels, planting/ranching/building levels, and unallocated health/knowledge/skill points. Select an ability freely; one explicit action shows server-priced cost, next level/capacity, and remaining balance. Do not show EXP progression in this sheet. Vitality/stamina capacity cost one health point for +5; knowledge retains one point per level; each skill upgrade costs its target level. Preserve legacy EXP and world gates without converting them. Original rule implementation evidence is in `docs/tasks/14-character-points.md`.

Do not add fake equipment slots, unimplemented effects, or a decorative radar chart to fill space. Vitality and skill levels are persisted state; levels alone do not imply gameplay effects. Village weapons, recipe requirements and localized cave combat are implemented as the task28 candidate; ranching gameplay and other skill bonuses remain future work. Real-life attributes are game abstractions, not claims about a user's intelligence, health, or worth.

### 7.6 Character creation

One composed scene with a character preview, name field, small appearance selection, and one primary entry action. Keep the preview proportionate to the surrounding environment. Do not upscale a tiny walking sprite into a giant substitute for a portrait. Use a licensed matching faceset only when the selected actor actually has one.

Offer a quick start; life-goal planning is optional after entry. Explain guest-save behavior according to actual storage architecture. Do not promise local-only storage if the server stores the save.

Current welcome reference: full-bleed village illustration with a live, modestly scaled traveler; one linen registration sheet, signature-line name input, six slightly offset portrait tags and a moss-painted wooden entry button. The selected character updates immediately and remains the same in gameplay and the dossier. IDs 0–2 are preserved, IDs 3–5 are audited additions; appearances do not change attributes. Use an opaque-enough canopy shade behind mobile brand text. The illustrated arrival is separate from the playable tilemap. Source and evidence: `docs/tasks/04-arrival-slice.md`.

### 7.7 Life Mode

Life Mode is a first-class view, not a tiny dialog over the world. Provide Today, Goals, and History as the initial information structure; AI planning belongs near a goal or an explicit planning action.

A returning user can start a timer or log an activity without walking to an NPC. Design target: reach the recording action within two deliberate navigation actions from the Life home view. Clearly display manual, timer, imported, and demo provenance.

Show three kinds of outcome separately: recorded real activity, granted game rewards, and a newly available world action. Never imply that a possible unlock is already executed. A natural-language goal becomes a reviewable suggestion before it becomes a committed plan.

Switching modes preserves the authoritative character, inventory, timers, and world state. Life Mode releases world input. Whether the Phaser scene remains mounted or is cleanly reconstructed is an implementation choice; a persistent instance is not mandatory. Avoid duplicate listeners and replayed rewards.

### 7.7a Today study — first functional Life slice

The owner requested a game-like learning loop on 2026-10-13. The full-screen “今日研习” reuses the journal material with a selected learning promise on one leaf and an hourglass/focus action on the other. Enter through 现实成长 → 今日研习, without walking. Mobile places the selected title, timer and pause/finish actions before the record details. The blank state asks only for a topic and a short duration choice; record association and provenance are progressively disclosed. This implements learning tasks, not the entire Today/Goals/History system.

The journal, actor and palette are reused without changing their source pixels. The hourglass is original inline SVG. Page entrance, button press and the server-confirmed completion seal respect reduced motion. All functional text remains DOM. Stable tasks and timer identities restore after refresh; `#study` restores the view. Existing manual recording stays available. Linking an existing activity and completing a task cannot grant a second activity reward. See `docs/tasks/06-today-study.md` for evidence and limits; visual acceptance remains a separate owner checkpoint.

### 7.7b Study journeys — plans, daily leaves and recovery

The owner authorized the multi-day study chain on 2026-10-13. Extend the same book with chapter bookmarks: today's study, study plans, archived memories and recovery. The plan index uses book spines and a single selected chapter; history uses dated leaves and one readable memory. Do not add a task table, KPI mosaic or a second palette. Plan/day opening is a server action with one page per day; yesterday's progress stays on its own leaf. Editing and reversible archive are disclosed under “整理”. Completion never duplicates activity XP; the separately authorized knowledge reward is defined below.

On phones the selected plan or new-plan writing surface precedes the book index. History selection scrolls/focuses the chosen page; all controls remain native, at least 44 CSS px and usable without dragging. A downloaded recovery credential opens the latest server-side journey, with an identity preview and confirmation after backing up the current journey. Recovery is also reachable from welcome and settings without creating a character. It does not restore a lost database. Existing journal texture, tokens, actor frames and Lucide icons are reused; no asset acquisition. See `docs/tasks/08-study-journey.md` for evidence. Visual approval remains pending.

### 7.7c Health and stamina field journal — 2026-10-14

The authorized growth slice uses a dedicated “行前手札”: existing woodland arrival illustration and the actual traveler on one leaf, one daily exercise pledge on the facing linen leaf, and a health seal with a concrete capacity preview. Phone compresses the scenery and keeps the pledge action prominent; recording details and history disclose on demand. Default choices are intentions, never pre-recorded exercise. Manual minutes require an explicit entry; completion seals and point balances reflect server-confirmed state. Health investment explicitly shows its one-point cost and +5 capacity/current benefit. The HUD's formerly unused exploration-energy display now presents actionable current/max stamina; legacy energy remains in the inventory.

The page is reached directly from the stamina HUD, character dossier or Life Mode. Modal input ownership, focus return, accessible native controls, reduced motion, readable Chinese and truthful marker-only bed navigation are required. No life/knowledge/skill controls appear before implementation. Reuses existing approved material direction; actual page render is a candidate for owner review. See `docs/tasks/11-health-stamina.md`.

### 7.7d Knowledge research — 2026-10-14

The owner authorized learning completion → knowledge points → science/magic growth. Add “知识研修” to the existing book. A real point seal connects to two selectable discipline marks; the facing leaf shows one selected discipline, current → next level, real earned level marks and one explicit spending button. Selection is free and never spends implicitly. A confirmed result stamps the actual level. The completion leaf offers a direct research action; the character dossier shows both actual levels and another entry.

Reuse the existing journal nine-slice, tokens and installed Lucide symbols. Connecting paths are original inline SVG; no new bitmap, font or fictional equipment. Phone compacts the marks and navigation, keeps text inside the paper's readable region and puts provenance below the primary action. Completion feedback lives on the page instead of a duplicate toast covering the research button. All controls remain native, keyboard/touch accessible and at least 44 CSS px, with reduced-motion states. Task reward provenance distinguishes newly awarded knowledge from historical completed pages. Future tools/spells are explicitly not presented as unlocked. Evidence: `docs/tasks/12-knowledge-growth.md`.

### 7.7e NPC reality commissions — owner request, 2026-10-14

This request supersedes the earlier form-based growth/reward entry in 7.7–7.7d. Noah's existing encounter scene offers three dialogue choices (study, exercise, work), then hour tokens and an explicit acceptance. Active promises show a server-based countdown and settlement eligibility; cancellation is reversible only by starting a new promise, with its time reset. A confirmed receipt shows actual awarded points, and five filled growth marks end today's offers. The existing HUD growth entry becomes a dated journal of current, settled and cancelled commissions, with a truthful marker to Noah. This is a scoped exception to the earlier direct-recording target, explicitly requested by the owner.

Reuse existing actor art, the encounter vignette, linen/moss tokens and native controls. Phone keeps the task choices and acceptance prominent; hours use two-line tokens deliberately. Health investment and knowledge research remain accessible, while legacy notes/records and already earned assets are preserved. No new raster or font. Evidence and exact rules: `docs/tasks/13-life-commissions.md`. Actual visual acceptance remains pending.

### 7.7f Daily growth journal — approved concept, 2026-10-15

The owner approved `docs/art/references/life-journal-concept-v1.png`. The HUD growth entry uses an asymmetric bound journal: a monthly calendar index on the narrow leaf, the selected acceptance day's current promise and closed records on the wide leaf. Record markers, selected/today states, previous/next day, month navigation and return-to-today use real records and China Standard Time. An overnight active promise stays on its acceptance date and is reachable through an explicit current-promise link from other dates. Today quota and current wallet balances remain labelled separately from the selected historical day.

On narrow screens the selected day's task comes first; the calendar opens on demand, with native day buttons, keyboard arrows/Home/End/PageUp/PageDown and explicit previous/next controls. Cancellation uses the existing authoritative command and confirmation; failure/success feedback stays in the reading flow. The Noah action only marks a location. Text, filters, countdown, quota and actions are DOM. A blank generated asymmetric book reuses the material direction; existing ledger, icons and sand-clock art are unchanged. Concept approval is recorded; actual-render acceptance is a separate checkpoint. Evidence: `docs/tasks/20-life-journal.md`.

### 7.8 Next departure journal — 2026-10-16

The authorized continuation after the actual first-floor workshop recap uses an illustrated packing place facing a linen preparation leaf. Three native bookmarks connect owned equipment and optional upgrades, permanent five-floor cave routes, and the actual growth wallet/promise. The default leaf and compact tracker follow a single state-aware next action; magic growth and cave exploration can proceed independently. Reading, comparing and marking never spend resources, move the player or assert completed growth. Existing armory, NPC settlement and explicit research remain the mutation surfaces.

Reuse the village arrival vignette, backpack/book props, magic emblem and existing item symbols unchanged. Only this journal and its small return slip gain the new composition. Desktop1440/1920 and1024 keep each leaf fitted; short landscape keeps bookmarks and the primary action fixed while the one reading leaf scrolls, with a fade and explicit scrolling cue. Keyboard focus,44px main actions, touch and reduced motion apply.

After at least five minutes away, an optional per-save device bookmark may trigger a small continuation slip only after a successful current server snapshot. It never steals focus or replaces an open page, respects dismissed guidance and manual side-quest tracking, and does not auto-claim or spend. Background polling cannot consume the absence. Device metadata stores only timestamp/depth/magic, independently of authoritative save state; unavailable storage simply omits the slip. Exact scope and evidence: `docs/tasks/33-next-departure.md`. Actual owner render/feel approval remains pending.

## 8. Interaction, timing, and sound

Represent top-level input context explicitly, using the existing architecture: world play, overlay, dialogue, targeting, or Life Mode. A keyboard event must not activate two contexts. Ignore gameplay shortcuts during text input, content editing, and IME composition. Clear held movement on blur, visibility loss, and mode transition.

Feedback targets:

| Event | Target behavior |
|---|---|
| Hover / focus | Clear state within about 80-120 ms; no layout jump |
| Button press | Immediate short displacement or frame change; stable hit area |
| Overlay open / close | About 140-180 ms; reduced-motion alternative |
| Pickup | Brief local effect and a quantity delta after confirmation |
| Invalid planting | Clear target cue plus a short reason; never color alone |
| Confirmed growth | 500-900 ms nonblocking notice, with optional replay in history |
| NPC text | Skippable reveal; first continue reveals full text, next advances |

Durations are design targets, not exact test assertions. Do not play a sound on every pointer movement or every streamed token. Honor mute and reduced-motion preferences. Unlock browser audio after a user gesture. Optional SFX failure never blocks an action.

Selection feedback may be immediate. Inventory, rewards, and plot changes must follow server confirmation or an explicitly reversible optimistic transaction. Pending actions prevent accidental duplication. Errors restore state and provide a useful explanation.

## 9. Shared state and truthful growth

The same item definition supplies art and meaning across world pickups, inventory, recipes, task rewards, and the quickbar. Stable semantic IDs belong to the game; source filenames are replaceable presentation bindings.

Activity recording, reward settlement, and world unlocks must remain traceable and idempotent. A completed timer records elapsed session time, not proof that the user learned. Browser backgrounding is not automatically cheating. Do not add surveillance, mandatory screenshot submission, or financial incentives for larger spending.

World-event notifications may be marked as viewed separately from the underlying unlock. Switching modes cannot grant the reward twice. AI receives only the context needed for the task, suggests plans, and produces bounded dialogue; it does not directly edit balances or certify real-world behavior.

No penalty for missing a day should be introduced by this visual pass. Demo fixtures are isolated and visibly labeled. Deleting or editing a real activity requires a defined reconciliation policy before implementation, not a client-only subtraction of arbitrary XP.

### 9.1 Departure, daily life and home — future interaction contracts (2026-10-16)

First-expedition guidance is implemented as a scoped candidate in [task29](docs/tasks/29-first-expedition.md): existing board, armory, cave and tracker surfaces explain the departure requirements, follow actual weapon/recovery/first-floor/return state, and allow dismiss/resume. Keep it optional, readable and server-persisted; it grants no resources and must not overrule a deliberately tracked side quest. This does not approve a new visual treatment for unrelated screens.

These contracts govern scoped work; day/night, bedside sleep/short rest and morning outcomes are implemented candidates in [task26](docs/tasks/26-day-night-sleep.md), and independent departure/lodging is a candidate in [task27](docs/tasks/27-departure-city.md). Caves, weapons, the stone-gate prerequisite, city advancement and home expansion remain future scope. Prioritize desktop web and reasonable phone-landscape support. Follow the gameplay document for conditions and settlement rather than duplicating balance values here.

- **Departure and travel:** show the sealed common exit, the required magic stone and its cave source, current versus required magic level, and the actual next action. Opening the stone gate is an explicit, authoritative action with pending/failure feedback and a visible permanent result; bridge and boat routes cannot bypass it. River crossings distinguish bridge work from boat passage; mountain preparation distinguishes current stamina, capacity, equipment and expected arrival time. Show exact shortfalls before commitment. Existing village bridges and accessible destinations remain usable; preserve already-departed saves. Map selection marks a direction, and travel happens at a usable crossing or exit.
- **Combat locations and weapons:** clearly mark cave entry, exit, retreat and known danger before the player enters. Monsters remain inside designated combat locations and never spill into ordinary roads or living spaces. Compare actual weapon damage, attack interval and reach, plus any real costs or use requirements. Distinguish purchase price from crafting materials, building level and the recipe's science/magic level; unmet crafting conditions cannot consume resources. Show the boss-stone acquisition and possession states separately from ordinary crafting materials.
- **Day and night:** keep the 24-hour clock and game-day label legible within the shared HUD. Night lighting must preserve readable paths, characters and interaction cues. Use staged bedtime reminders with a route to home or a valid lodging place; avoid flashing or color-only warnings. Life Mode retains its direct entry and pauses the game world while real commissions continue. Reading pauses, input ownership and focus restoration follow the gameplay contract.
- **Sleep and lodging:** distinguish free home sleep, paid lodging and an already booked bed. Display the price and applicable night before payment, and the next morning's actual recovery or fainting loss afterward. Pending, failure and retry cannot charge twice. Label vitality as “生命值”, stamina as “体力” and reality-growth currency as “健康点”; do not imply a real health diagnosis.
- **Technology and magic:** keep the character dossier's actual levels separate from learned spells, owned equipment and known blueprints. Blueprint crafting, spell learning and combat targeting need their own appropriate interaction structures using shared primitives. Do not display future weapons, spells or mechs as usable without implemented effects and valid ownership. Preserve the village's Hearthwood materials and atmosphere as these disciplines appear.
- **Home:** show the current building, the next real stage, precise costs and resulting effects. Furnishing has a reversible placement preview, clear invalid-placement feedback and an explicit save/cancel action. Keep doors, beds and required workstations reachable; restore focus and clear held keys when leaving placement. Preserve stored items, upgrade levels and stable object identities.

Each new composed screen or world treatment needs its own actual-render checkpoint before spreading to unrelated screens. Chapter art, city assets, changed home stages and animations remain production gaps until audited and recorded; this design update adds no assets and approves no reference image. The historical inventory-first rollout below remains its original checkpoint, while the next gameplay sequence is maintained in TODO.md.

## 10. Asset production and acquisition rules

Read `docs/art/ASSET_PLAN.md` and `asset-manifest.json`. They distinguish source files actually supplied from selected external packs and missing project-specific assets. The supplied source PNGs are not finished RealQuest components.

Use an audited asset registry with semantic ID, source pack, upstream path, local path, license, checksum, dimensions, frame geometry, visible bounds, pivot, animation mapping, and status. Store actual values after inspection. Never fabricate atlas coordinates or slice margins from a screenshot.

Keep original source files separate from generated runtime atlases. Transformations must be reproducible and documented. Load only the runtime subset; do not ship every downloaded pack to the browser. Do not mix independent crop, character, and terrain families merely because all use a 16-pixel grid.

For missing planting stages, request or create a small coherent sequence: prepared soil, seeded soil, visible growth, mature crop, and harvest feedback. Define exact silhouettes and frame sizes after the existing crop system is audited. This kit does not claim to contain those production assets.

## 11. First implementation slice

Implement `docs/tasks/01-inventory-slice.md` first. Scope: a component preview, a polished real inventory, and the seed-to-soil action chain. Preserve actual quantities and existing balance. Use a temporary implementation branch or equivalent reviewable diff; do not merge, deploy, or replace approved baselines without authorization.

The first visual checkpoint should show the same save in the old and new inventory at 1440 x 900 and 390 x 844, plus all meaningful slot/button states. Get explicit owner approval before applying this treatment to every screen. Ordinary engineering work inside the approved slice does not need repeated permission requests.

After approval: quest journal, map, character UI, then the corresponding Life Mode patterns. Do not start another all-screen redesign.

## 12. Acceptance and evidence

Run checks at 1440 x 900, 1920 x 1080, 768 x 1024, and 390 x 844. Include a HiDPI check, browser zoom/reflow check for DOM interfaces, reduced motion, and a real touch pass when available. Test touch targets against the project's 44 x 44 CSS pixel usability target; this is deliberately larger than the baseline described by [WCAG target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), not a claim that 44 pixels is the AA minimum.

Acceptance requires:

- Player, item, and text scales are coherent; the screen is neither a whole-map overview nor an accidental extreme close-up.
- A starter inventory with one item has a clear visual focus without fake content.
- Selection, quantity, quick binding, pending state, and failure are distinguishable.
- A player can complete seed selection and planting with mouse/keyboard and a touch alternative.
- Menus do not move the player, duplicate actions, trap focus, or lose the save.
- Reload and mode switching preserve the committed outcome.
- The journal has a real index/detail hierarchy; the map has directly actionable markers.
- No inaccessible text, unintended horizontal scroll, clipped primary action, or decorative false button remains in the changed scope.

Provide screenshots, a short interaction recording when possible, exact commands and results, browser errors, and remaining gaps. Capture the same viewport, state, and camera position for comparison. Use seeded fixtures and a test clock where needed, but also review normal motion. Do not certify gameplay from a screenshot or visual quality from a successful build.

Keep the checklist in `docs/art/REVIEW_CHECKLIST.md`. New reference screenshots start as `candidate`, not `approved`. Record approval and commit only when actually obtained.

### Woodland cottage checkpoint — 2026-10-13

Candidate only; owner visual review pending. The home yard and interior use original two-world-unit pixel drawing with the existing actor sheets. The stepping-stone approach, low garden borders and warm timber room share Hearthwood materials. Existing collision/spawn geometry stays intact. The table's open book (`home_reading`) opens the existing study journal; its separate closed manual retains the `home_desk` upgrade action. Storage, rest and direct Life entry retain their behavior. Object brackets and short opening feedback reflect actual interactions; reduced motion keeps stable feedback. Desktop outdoor framing reveals the roof; the home room pans at readable scale on phones and short landscape. DOM controls remain in CSS pixels. New upgrade appearances/furnishing saves require the next owner checkpoint. Evidence: `docs/tasks/09-cottage-prototype.md`.

### Travel-kit HUD — 2026-10-13

Owner approved `docs/art/references/hud-concept-v1.png`; actual browser implementation is a candidate. Floating HUD uses a single light timber/moss rail with pixel-object navigation and readable linen labels, a compact traveler identity/resource plate, three utility keys and a clipped linen next-step note. `hud.css` owns the final skin after legacy world/dialog styles. Native labels/actions and actual values remain authoritative; character navigation reflects the current appearance. Compact phone/landscape layouts retain direct Life access and existing world controls. Opened inventory, dossier and journal layouts retain their own contracts. Source, evidence and limitations: `docs/tasks/10-hud-travel-kit.md`.

### Noah offer, receipt and small talk — approved direction, 2026-10-14

The remaining encounter states share Noah's timber desk and moss cloth. Three small pinned slips select the reality task type, then one illustrated scroll carries the exact promise, reward tag and wooden hour tokens. A server-confirmed settlement replaces the offer with a ledger and stamped native receipt; another commission explicitly returns to selection, while history and dismissal remain secondary. The receipt survives a topic switch within the same encounter. It never implies an unconfirmed reward.

Village small talk has a nameplate and dialogue parchment, with an actual story-quest letter and two replies. It does not display reality quota. Opening the letter uses the existing quest objectives, actions and authoritative status; closing it restores the reply's keyboard focus. Other NPCs and the active hourglass contract retain their structures. Text is DOM, generated props are textless, and reduced motion removes paper/seal motion. Evidence: `docs/tasks/17-commission-pages.md`.

### Village market livelihood — 2026-10-15

Authorized connected slice: the general store, Mira, real inventory trading, dated material orders and home goals. Shop uses existing Hearthwood linen/moss controls and a small illustrated keeper beside one transactional surface; native text shows quantities, price and resulting balance before commitment. Orders display actual needs, owned quantities and confirmed completion. Navigation marks locations without teleportation. Original shop/counter sprites retain two native pixels per world unit; Mira's former appearance5 fallback is superseded by the unique resident art in task25. Other screens keep their contracts. Actual rendered acceptance remains pending; see task22.

### Resident life checkpoint — 2026-10-16

The three current residents have independent NPC-id character sheets, figures and portraits, separate from all player appearance IDs. Existing encounter structures remain recognizable: Lia's library conversation, Noah's timber commission desk with a separate daily-life tab, and Mira's store with a social tab. The neighbor book exposes current whereabouts, preferences and a readable routine; navigation follows a resident through door transitions without teleporting the player.

Routines use the shared server-owned `world_clock`: active world play advances it, reading and background/leave events pause it, and a bounded heartbeat freezes it after disconnection. Reality deadlines/quotas and current production rules stay in their real-time domain. The first resident-clock implementation is a foundation for the planned day/sleep slice, not completion of sleep, lodging or fainting. Native Chinese text, minimum44px controls, visible focus, reduced motion, server-confirmed social mutations and preserved player assets are required. Actual render is a candidate; evidence/provenance/limits are in task25.

### Local cave polish checkpoint — 2026-10-17

Authorized slice: cave entry, battle and safe retreat in both Web and Cocos. Shared original chipped stone, moss, warm shelter lamps, actual route objects and four distinct creature silhouettes replace the temporary checkerboard and blocks. Quiet terrain leaves amber tells, the player and native confirmed damage text readable. Preserve world coordinates, collisions, actor scale and all authoritative stats/drops. No camera shake or predicted hit/reward.

Cave status is compact; short landscape uses the target line for boss HP rather than a second central meter. Click/T selects without attacking; held attack repeats across receipts, release never adds a hit, and independent touch pointers retain their remaining direction. Cast progress uses server times. Panels, Life and blur own input; reduced motion keeps static silhouettes/numbers. Candidate render/feel approval remains open before broader visual rollout. Evidence: `docs/tasks/37-cave-polish.md`.

### Local village/home polish checkpoint — 2026-10-17

Authorized coherent flow: village road → home doorway → storage/reading/rest → return in Web and Cocos. Retain the existing fine-village/fine-interior family. Cocos consumes reproducible derivatives of the existing Web terrain, plaster/oak floor and measured nine-patch rugs, with furniture/props still independently sorted. Reuse real facade/furniture hit areas and reachable approaches; no teleport, new house tier or furnishing progression. Existing source sprites, coordinates and collisions remain unchanged.

The player, selected route and usable object lead. Keep native labels and a compact identity/time/action surface; short landscape must leave the doorway/action area free. Route marks indicate intent, not guaranteed arrival. Escape/manual movement/blur cancels it. Cocos chest/books respond to the actual interaction; count transfers reconcile with the server. Village walking uses existing directional frames and returns to idle on release; reduced motion uses stable direction poses and marks. Storage has two actual containers and one selected item/transfer direction, truthful zero counts and explicit paging. This is a scoped candidate, not owner render approval or full Cocos world-art parity. Evidence: `docs/tasks/38-village-interior-polish.md`.

### Cocos Life history and study organization — 2026-10-17

Authorized task39 M3 slice: direct Life entry preserves the separate practical experience. Native Hearthwood paper/list/detail views expose dated reality commissions separately from activities, and today/history/archive study pages with their original linked records and plan context. Desktop and short landscape must retain editing, archive/restore and explicit current-timer ownership. Keep provenance, complete Chinese text and server-owned identities/rewards; reading/linking never reissues rewards. No new visual family or assets. This is a browser-verified candidate, pending owner render acceptance; evidence and broader accessibility/device limits are in `docs/tasks/41-cocos-life-records.md`.

### Cocos registration and read-only dossier — 2026-10-17

Task39 M1/M8 connects existing six appearance IDs and preserved Chinese/blank-name drafts with an authoritative dossier and explicit quoted point allocation. Retain original actors/home art and Hearthwood native primitives. The later M8 checklist explicitly requires level/experience visibility: the read-only Cocos dossier may show the original Web HUD level and cumulative journey EXP as historical accumulation, without an EXP progress bar/countdown or conversion into points. Allocation remains a separate context showing only current capacities/levels, server quotes, balances and confirmed results. No new economic rule or asset; owner render acceptance remains open. Scope/evidence: `docs/tasks/42-cocos-registration-dossier.md`.

Task39 M4 keeps a compact, foldable current-goal HUD and reopenable native paper guide. Reuse original intro/preparation decisions and manual quest ownership; only guide-owned markers expire with their step. Board/gate briefing and workshop review require original service proximity and explicit confirmation. Preparation links to existing equipment, reality history, Noah and quoted magic allocation; reading/navigation never settles, purchases, invests or opens a gate. Optional per-save return cues occupy the HUD without stealing modal/input focus and require a confirmed foreground read. Existing legacy passages remain open without repeated intro or investment. No new art family or assets; scope and environment-specific focus limitations: `docs/tasks/43-cocos-journey-guidance.md`.


Task39 M5/M6 uses the explicitly allowed native place-index alternative: all authoritative maps/objects and server travel quotes remain queryable with current location, locks and marker-only bearings. Stable duplicate-place labels and moving-person keys keep choices distinguishable. Neighbor pages expose real familiarity, preferences and all routine phases. Actual encounter replies are paginated presets, and topics/gift/help stay reachable in short landscape with original proximity/daily/receipt guards. No new visual family/assets or travel permissions. Successful rest returns to world with a confirmed result; inn sleep requires current-day booking. Candidate evidence and remaining owner/device/remote-art gates: `docs/tasks/44-cocos-places-neighbors.md`.


### Cocos map/encounter feedback correction — 2026-10-17

The owner rejected the index-only map candidate: M must open spatial geography with actual landmark positions and a selected destination leaf; the complete place index remains secondary. Reuse existing terrain/building/portrait art, distinguish the low encounter composition from the map and illustrated neighbor handbooks, and use scoped linen/painted-moss timber controls. Preserve44px targets, explicit marker-only action and original social/receipt rules. This correction applies to the map→place/neighbors→encounter chain; broader propagation still requires its own visual checkpoint. Task44 records the new candidate and evidence.


### Cocos resident discovery and scene conversation — 2026-10-17

Owner feedback after the map correction: NPCs were hard to find, and interactions still felt like data reports. Task45 adds visible resident portraits/N, truthful room/door bearings, fixed-screen-size world names and actual same-room walking into conversation. The scene stays dominant behind a low speaker surface and unboxed response choices; gifts use a real item tray. Relationships/routines stay opt-in reference material; direct practical Life access remains. This is a new scoped candidate, not approval of prior maps or permission to propagate it across other screens.


**Cocos行囊候选（2026-10-17，task47）：**沿用获准原Web布袋/短物品签/四格口袋方向，实际Cocos画面另行复核。四格是按旅程隔离的引用，安排/交换/清空/选择不消费；未知或重复ID应被净化，耗尽引用显示名称/0且不可伪装持有。旧全局配置只预览，玩家选择来源后主动带入。桌面24展示格与短横屏12格分页不表示容量上限，图鉴明确区分未持有。金币/能量/知识碎片可查看完整余额。

播种、工坊制作和出售先预览固定现场目标、费用、收益或成熟时长，确认才调用原命令；远处只标记。预览时画面必须同时保留实际目标与旅人，侧签不能遮住对象。目标/地点/报价变化使原预览失效，拒绝与不确定结果可核对重试。直接Life入口不受阻，离开预览后迟到的结果仅更新权威状态，不抢回页面。物品图标、数量、口袋作为一个对象响应按压，沿用共享木/纸/苔布状态，减动态仍保留明确反馈。任务47记录本地验证与玩家检查点；不据此认定原Web可退役。


**Cocos旅途偏好与提醒候选（2026-10-17，task49）：**菜单中的声音、动态、画面和提醒分为四张短书页，复用原木/纸/书本素材和按钮状态，不推广行囊/聊天布局。声音默认关闭，只在用户操作后启用；静音、失焦与销毁停止并释放节点。已确认物品/XP或成长点变化才有对应提示音，拒绝/刷新不冒充收获。动态可跟随系统或总是减少，系统要求减少时优先。F/按钮展示实际浏览器全屏与等待/失败/不可用，Esc先退出全屏，重开不自动进入。

提醒只读派生真实夜晚时间、当前可恢复体力和未结算约定时段；可标记真实床或打开原约定列表，不自动移动/休息/核验/结算。桌面提醒使用顶部状态与菜单间空位，横屏远行复用紧凑状态、洞穴使用右上空位，均避开任务/触控与玩家。画面与音色/音量仍需玩家复核；系统IME/实机/跨浏览器和环境昼夜美术仍由开放V项验收。

**Cocos世界反馈布局（2026-10-18，task58）：**确认/错误纸签在控件、四格说明等固定HUD之外显示，文字绘制优先于世界指路标记。短横屏保留四格及其实际用途，重复说明可收为“1–4 查看”；方向键使用固定位置，不随提示的出现/消失移动。重连待确认期间使用原已收起目标的位置提供明确操作；成功后目标恢复，同文案的再次确认仍应显示，村庄结果纸按原显示期收起。反馈不改变世界坐标、请求身份或结算规则。此项只修正HUD链，既有三处画面/task49偏好确认继续有效，新增位置与其余场景仍按task39验收，证据见[任务58](docs/tasks/58-cocos-world-feedback-layout.md)。


**Cocos网页启动恢复（2026-10-18，task63）：**准备阶段由一张原生Hearthwood纸面拥有输入；正常首帧与语义控件完成后移除。真实12秒未完成显示“仍在准备”，允许继续等待或重载；明确脚本/资源失败与WebGL不可用显示原因和原生重新载入按钮。不展示伪造百分比。重载保留本机凭证与待确认操作，不能清除或替换玩家数据。无脚本使用浏览器原生GET表单回到当前文档；以实际构建/导航结果验证，不能仅凭按钮可见。所有者已确认保留本轮故障页，范围不推广到其他画面或原Web退役。


**Cocos首领取景候选（task76，2026-10-18）：**短横屏近距离首领以同一整体相机保留玩家与首领原绘制/血条，避开实际HUD控件；横向覆盖原房间，较窄房间居中留边，外沿使用现有深苔底色。世界坐标、碰撞、人物/怪物源比例、按钮与输入语义不变，远处/非当前首领和其他界面仍用普通镜头。四姿态图形边界覆盖减少动态，固定几何可缓存，不能用假状态或单个sprite缩放掩盖取景问题。仅是当前洞内候选，需实际画面/手感复核后才考虑其他屏幕；证据与预览尚未切换原因见[任务76](docs/tasks/76-cocos-combat-framing.md)。
