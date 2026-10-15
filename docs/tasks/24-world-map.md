# World map: approved concept implementation

Status: implemented candidate, 2026-10-15. The owner approved `docs/art/references/world-map-concept-v1.png` as the direction. Approval of this actual browser render remains a separate checkpoint.

## Scope and behavior

The world map now has a fine-pixel terrain chart with existing village silhouettes, an attached destination leaf, a collapsed place index, zoom, recenter and map panning. Markers, names, selected state, current position, tracked quest flag, rune lock and explored/visited states come from existing world and player state. Native Chinese text stays outside the artwork. The default library selection is presentation only. Selecting another place changes only the map UI; “标记方向并返回” calls the existing navigation action, closes the map and does not teleport or mutate inventory, XP or player position. Mouse, touch and keyboard retain their established input ownership.

Changed implementation: `frontend/src/components/Atlas.tsx`, new `frontend/src/components/atlas.css`, CSS import in `frontend/src/main.tsx`, map heading in `frontend/src/App.tsx`. No backend, save schema, semantic IDs, route geometry or economy rules were changed for this slice. Existing unrelated in-progress changes in shared files were preserved.

## Art and provenance

Built-in `image_gen` made one original, textless 1536×1024 terrain image using the owner-approved project-generated map concept and project-generated fine-village reference. Source and exact prompt: `assets/generated/hearthwood/world-map-terrain-v1.png` and `.prompt.txt`. Runtime copy: `frontend/public/assets/hearthwood/world-map-terrain-v1.png`. The copies are byte-identical, RGB PNG, 3,885,267 bytes, SHA-256 `285a0cc5003355322880638113e828996c16ab42cf57b3cae4ee922480e18d61`. Existing village building/bridge art is reused unchanged. `docs/art/asset-manifest.json` and `docs/art/ASSET_PLAN.md` record the binding and provenance. The illustration is a travel chart, not a claim about walkable routes. No third-party artwork, font, sound or purchased pack was added.

## Verification and review evidence

- `cd frontend && npm run build` — passed; the existing large Phaser chunk warning remains.
- `cd frontend && node scripts/world-map-review.mjs` — passed. Eight inspected captures across 1440×900, 1920×1080, 390×844 DPR2 touch, 768×1024 and 720×450; selection, index, 44px controls, pan, zoom, recenter, explored-state update, Escape, no horizontal overflow and no browser errors. Evidence: `output/world-map/review/`.
- `cd frontend && node scripts/world-map-real.mjs` — passed against an isolated migrated SQLite database and Vite/API on 5391/8097. Actual game opened the map, selected an unexplored place, marked a direction, returned to play with the same position/inventory/XP and one Phaser canvas, then opened/closed it on the phone viewport. Evidence: `output/world-map/real/map-1440.png`, `direction-1440.png`, `map-390.png` and `world-map-flow.webm`.
- Bundled Python `tools/audit_inventory_assets.py --output output/world-map/audit` — passed, 133 image records; source/runtime bytes verified independently with `cmp`.
- `git diff --check` and formatting checks — passed. Automated browsers and isolated preview services were closed after capture; no user save was used.

Physical devices, Safari, native browser zoom, long-session performance and owner approval of the actual render are still unverified. The approved concept is a reference, not a substitute for this review.
