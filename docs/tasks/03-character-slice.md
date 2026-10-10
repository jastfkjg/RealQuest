# Adventurer dossier — candidate checkpoint

Owner requested character panel next on 2026-10-10: keep Hearthwood materials/colors, create a distinct adventurer record rather than a journal layout, preserve real attributes/progression/actions, then review.

Plan: audit CharacterPanel and server thresholds; compose a single field dossier with identity, growth marks and selected ability; retain existing actor and game rules; add isolated DEV preview; inspect desktop/phone and test recording, unlocks, navigation and persistence; pause at visual checkpoint.

Visual thesis: an issued personal field record, moss cloth backing and warm paper held by brass clips. Content order: identity/avatar → experience → five selectable growth marks → selected ability and action → existing map/collection tools. Motion: subtle entrance, pressed controls, selected-attribute pointer and short progress transitions, all disabled under reduced motion.

The previous uncommitted journal work remains intact. Details and evidence follow after verification.

## Implementation and behavior

| Files | Result |
|---|---|
| `frontend/src/components/CharacterView.tsx`, `CharacterPanel.tsx` | Pure dossier layout plus authoritative-store adapter: identity, current outfit, level stamp, journey EXP, five selectable attributes, selected capability and existing actions. No new state/economy or equipment system. |
| `frontend/src/game/characterGrowth.ts` | Existing labels, five effects, thresholds and destinations moved from `RpgPanels.tsx`. Navigation wording explicitly says “标记”. Numeric rules remain identical. |
| `frontend/src/components/PixelPerson.tsx`, `RpgPanels.tsx`, `stores/game.ts` | Existing sprite component and attribute names factored/re-exported for reuse. Character creation/HUD retain their original imports and behavior; no actor PNG changed. |
| `frontend/src/character.css`, `App.tsx`, `main.tsx` | Scoped cloth-backed document with portrait insert and level stamp; normal-flow phone scroll. Native dialog focus cycle extended to character; close/escape restores the opener. Shared tokens and reduced-motion settings used. |
| `frontend/src/dev/CharacterPreview.tsx` | DEV-only `/dev/character`, same component, clearly labeled starter/near/unlocked/veteran/long-name fixtures. No API or localStorage writes. Production JS excludes fixture content. |
| `frontend/scripts/character-{smoke,growth,contrast}.mjs`, `frontend/package.json` | Browser layout/behavior/growth/contrast evidence; `test:character` runs smoke + growth. All owned browser contexts close in `finally`. |
| `frontend/scripts/rpg-ui-smoke.mjs` | Only two navigation-label selectors updated to the explicit marker wording. Assertions and flows retained. |
| `tools/build_inventory_skin.py`, `tools/check_character_contrast.py` | Existing lossless packaging accepts the dossier; Pillow analyzes actual rendered texture beneath text ranges, without editing artwork. |
| `docs/art/asset-manifest.json`, `ASSET_PLAN.md`, `REVIEW_CHECKLIST.md`, `DESIGN.md`, task record and `progress.md` | Source/provenance, current scope/checkpoint and evidence recorded. Prior journal work preserved. |

Growth calculations are unchanged: adventure level `1 + floor(totalXP / 100)`, remainder `totalXP % 100`; attribute level `1 + floor(attributeXP / 50)`, remainder `% 50`. Wisdom **25** enables rune exploration, strength **50** grants **+1** material per collection. Craft/stewardship/bond capabilities remain basic abilities, not invented unlocks. Existing `rune_awakened` changes the rune entry to the completed interpretation state. Further attribute levels do not claim extra bonuses.

Existing actions remain: preselected growth form for learning/exercise/creative/management, current map, collection location, ruins, workshop, home plot and Lia markers. Markers never move the player. Recording and retries still use the existing command queue, unique request IDs and authoritative server response. No migrations, balance edits, engine changes or production database operations.

## Assets

One original blank backing made with **built-in image_gen**; the previously generated/approved satchel was used only for material/color reference. No vendor artwork was sent to generation. Source [PNG](../../assets/generated/hearthwood/character-dossier-v1.png) and [exact prompt](../../assets/generated/hearthwood/character-dossier-v1.prompt.txt) are saved outside public. Source **1448×1086 RGBA**, **2,411,527 bytes**; runtime lossless [WebP](../../frontend/public/assets/hearthwood/character-dossier-v1.webp) **1,473,240 bytes**. Pixel equality asserted; hashes, alpha bounds and nine-slice values recorded in the manifest.

The background contains only cloth, blank paper, brass clips and leather corners. Portrait uses the original character's 16px frame at **64 CSS px (4×)**. Names, levels, bars, attributes, ability states and all controls are DOM, not baked art. Eight raw source samples and all existing PNG hashes are unchanged. The audit now has **24 entries** including the three generated materials; no Kenney pack, font, world tile or new actor was imported.

## Visual evidence

Local evidence is under `output/character-reference/` (gitignored).

- `character-1440.png`, `character-390.png`, `character-390-bottom.png`: actual game UI and real starter values (0 attributes/XP, gold20, seed6). Inspected final images; phone primary action is reachable in normal flow.
- `character-1920.png`, `character-768.png`, `character-720.png`: additional viewport/reflow captures. No horizontal overflow; short screens intentionally scroll vertically.
- `real-wisdom-24.png`, `real-wisdom-25.png`, `real-strength-49.png`, `real-strength-50.png`: real threshold transitions through the existing forms and backend.
- `real-level-2.png`, `real-bonus-gather.png`, `real-unlocked-390.png`: real adventure level2, actual four-wood collection after strength50, phone unlocked view.
- `preview-*.png`, `preview-long-mobile-{top,bottom}.png`: clearly isolated samples; completed rune state is a fixture here, not a claim that this test walked to the rune.
- `character-result.json`, `growth-result.json`: behavioral assertions; zero page errors. Layout run also checks unexpected console errors.
- `contrast-{text,background,result}.*`: actual texture sampling under **59 visible text runs**, minimum **4.63:1**. Fixed inherited gold small text and supporting copy that initially fell below 4.5:1. Evidence applies to the captured starter view, not every possible state or a blanket accessibility certification.
- `asset-audit.json`, `asset-contact-sheet.png`, `game-client/shot-0.png`, `game-client/state-0.json`: asset checks and short movement/idle game check. Game image/state inspected, one canvas and input listener.

Inspection also fixed a level-stamp label overlapping the right paper clip and the explanatory footer falling onto the cloth edge. Initial intended “before” screenshots were contaminated by HMR while implementation began. Reconstructing original components in an isolated browser did not produce reliable old-view captures; those images/scripts are kept only in `diagnostics/` and **not presented as baseline evidence**. Matched old/new screenshot comparison remains unavailable. Final real-state screenshots and behavior were verified independently.

## Checks and actual environment

Preserved the existing uncommitted journal work over owner commit `7539291`. Reused npm lockfiles and scripts, React19.3, Phaser3.90, Vite6.4.4, TypeScript, Playwright1.64, backend `.venv` Python3.14 / FastAPI / SQLAlchemy. No dependency changes. Existing preview services **5187 → 8021**, isolated database `output/inventory-pass-a/test.db`; no duplicate services started. Main browser mutations use new guests and delete only their own test session.

| Command | Outcome |
|---|---|
| `npm run build` in frontend | TypeScript/Vite pass; existing large Phaser chunk warning. Production JS excludes DEV fixture strings. |
| `.venv/bin/python -m pytest -q` in backend | **21 passed**, existing Starlette/httpx deprecation warning. |
| `node frontend/scripts/character-smoke.mjs` | Pass: five viewports, 44px controls, attribute selection without mutation, focus trap/restore, Escape, world input ownership, no teleporting markers, map, reload, one canvas; isolated fixtures and DPR2 touch. |
| `node frontend/scripts/character-growth.mjs` | Pass: wisdom24→25, strength49→50, XP100 level2/remainder0, wisdom50 attributelevel2, correct form kinds, appearance2 retained, rejection/pending/same-ID retry grants only1, reload preserves125XP, actual gather gives4 wood. |
| `node frontend/scripts/character-contrast.mjs` then bundled Python `tools/check_character_contrast.py` | Pass: 59 text runs sampled against rendered texture, minimum4.63:1. |
| `REALQUEST_URL=http://127.0.0.1:5187 npm run test:rpg-ui` in frontend | Existing full RPG flow passes: character unlocks, inventory/shortcuts, crafting, real planting/maturation/harvest/sale, persistence, six viewports. |
| `node frontend/scripts/journal-smoke.mjs` | Pass: journal five viewports, focus, touch, no-mutation browsing and marker semantics. Prior journal retained. |
| Cleanup-wrapped game skill client | `node node_modules/.cache/inventory-game-client.mjs --url http://127.0.0.1:5187 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":6},{"buttons":[],"frames":4}]}' --iterations 1 --pause-ms 250 --screenshot-dir ../output/character-reference/game-client` from frontend; pass, screenshot/state inspected, no recorded errors. |
| Bundled Python `tools/build_inventory_skin.py --asset character-dossier-v1` | Pass, unchanged decoded RGBA pixels. |
| Bundled Python `tools/audit_inventory_assets.py --output output/character-reference` | Pass, 24 entries, all original hashes and generated source/runtime pairs verified. |
| `git diff --check` | Pass. No standalone lint script exists. |

## Handoff and gaps

**Candidate, awaiting visual review.** Open **http://127.0.0.1:5187** and click **角色**, or use **http://127.0.0.1:5187/dev/character** for marked component samples. Stop here before any further screen redesign.

Physical-device touch, Safari and actual browser-menu zoom remain unverified; Chromium DPR2 touch, keyboard, reduced motion and viewport reflow were checked. Matched before/after images are unavailable as noted above. The generated material remains approximately1.47MB lossless; broad asset optimization is outside this slice.

Keep existing preview services5187/8021 for owner review. Automation browsers/context processes closed; do not stop other tasks' services. No commit, push or deployment performed.
