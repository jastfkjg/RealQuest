# Adventurer dossier — 2026-10-15

Owner approved the preview in this chat: “可以，就按这版预览图实现个人档案页，保留现有数据和升级规则。” The concept is `references/character-dossier-concept-v2.png`; actual implementation is a separate visual checkpoint.

Scope: one character screen, using existing character appearance, authoritative resources/quotes, and upgrade commands. Preserve all existing player data, balances, pricing, legacy EXP and gameplay. Concurrent market, HUD, encounters and Life journal changes are out of scope.

Plan: audit/reuse materials; generate five textless ability emblems; implement identity/status column, grouped selectable abilities and one contextual upgrade slip; verify actual layouts and selection/spending/retry/navigation with an isolated database; record evidence and clean up automation.

Visual thesis: a calm moss-cloth field dossier with a woodland portrait, open ability medallions, and a single inserted growth note. Content: identity/resources → knowledge/skills with adjacent balances → selected next level, exact cost/balance and action. Motion: restrained panel arrival, medallion hover/press, and server-confirmed success stamp; reduced motion removes these.

No source pack/font/dependency change, backend rule change, commit, push or deployment. Production text and controls remain native DOM. The concept is not a runtime screenshot.

Status: implemented and verified in Chromium; actual render awaits owner review.

## Implemented flow

- Left: actual saved actor/name, reused woodland vignette, current/max vitality and stamina, and health-point balance. Right: science/magic and planting/ranching/building medallions with their actual levels and adjacent currency balances.
- Selection costs nothing. A single growth slip reads the existing server quote, exact current/next value, cost and remaining balance. Health still costs 1 point for +5 current/max, knowledge 1 per level, skills the target level. The existing `CharacterPanel` command, in-flight guard and rejection/retry reconciliation were retained.
- Zero balance shows the real shortfall and opens inline commission guidance. Marker action sets the existing Noah navigation target without changing position or claiming rewards. Journal action opens existing Life Mode. Actual acceptance/settlement retain the server's proximity requirement. Escape first dismisses guidance and synchronously restores focus; the next Escape closes the dossier.
- Native button semantics, visible selected/focus states, pending lock, nearby error/success feedback, keyboard containment and reduced motion are retained. Small screens scroll the full growth slip into view after selection and reveal the confirmed receipt after spending. The primary button remains the same DOM control across balance changes; if the browser released focus while disabled, completion restores it unless the user moved to another control. No skills, items, achievements, equipment or bonuses were invented. The visual representation describes categories, not possessions.

## Files and artwork

- `frontend/src/components/CharacterView.tsx`, `frontend/src/character.css`: dossier structure, five medallions, responsive layout and contextual note/guidance.
- `frontend/src/components/CharacterPanel.tsx`: six lines connecting existing journal/marker navigation and real journal data. Upgrade logic unchanged.
- `frontend/scripts/character-points.mjs`: adapt zero-point assertions and add guidance/Escape/focus/navigation coverage; keep purchase/retry/persistence checks. `REALQUEST_DOSSIER=1` selects the new isolated evidence folder/database guard.
- `frontend/scripts/character-dossier-visual.mjs`: six viewport/large-text/guidance visual cases and actual-texture contrast capture, with browser/context cleanup in `finally`.
- Original generated source: [character-emblems-v2.png](../../assets/generated/hearthwood/character-emblems-v2.png), 1536×1024 RGBA. [Exact built-in image_gen prompt](../../assets/generated/hearthwood/character-emblems-v2.prompt.txt). The approved generated concept was the reference; no external source pack was uploaded.
- Runtime: five 512×512 lossless WebPs under `frontend/public/assets/hearthwood/character/`, totaling **1,273,356 bytes**. `tools/build_character_art.py --check` verifies exact decoded RGBA equality to the five source cells. No source edit, alpha modification, recolor or resize. Full metadata: [character-art-v2.json](../art/character-art-v2.json).
- `tools/audit_inventory_assets.py`: includes the new manifest in the existing shared source/runtime audit. `DESIGN.md`, art plan/manifest/checklist and `progress.md` record this slice and preserve concurrent changes.
- Reused unchanged `character-dossier-v1.webp`, `arrival-village-v1.webp` and the selected fine actor image. Portrait is rendered through existing `PixelPerson`; text and controls are never baked into art. No runtime source sheet, font or dependency was added.

## Environment and actual verification

Reused npm/package-lock, React19.3, Vite6.4.4, Phaser3.90, Playwright1.64, TypeScript and backend `.venv` Python3.14. Existing Alembic001/002 used only on a new isolated database. No standalone lint script exists.

| Command | Result |
| --- | --- |
| `npm --prefix frontend run build -- --outDir ../output/character-dossier/build` | Pass. TypeScript and fixed Vite production build; existing large Phaser chunk warning. Initial build briefly encountered a concurrently created Atlas CSS import; repeated after that file existed. |
| `.venv/bin/python -m pytest -q tests/test_character_points.py tests/test_knowledge.py tests/test_health.py` in backend | **35 passed**, existing Starlette/httpx warning only. |
| `DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/character-dossier/test.db .venv/bin/alembic upgrade head` in backend | Pass. Dedicated test database; no user DB touched. |
| `REALQUEST_DOSSIER=1 REALQUEST_URL=http://127.0.0.1:5293 REALQUEST_TEST_DB=/Users/zilong/Developer/projects/RealQuest/output/character-dossier/test.db node frontend/scripts/character-points.mjs` | **16 captures, no unexpected errors.** Free selection; no reward/position mutation from guidance; Escape/focus; health/knowledge/skill purchases; rejection/pending/lost-response replay with identical request ID; stale quote sync; reload and legacy XP/inventory conservation; keyboard containment and375/DPR2 touch/reduced motion pass. |
| `REALQUEST_URL=http://127.0.0.1:5293 node frontend/scripts/character-dossier-visual.mjs` | **16 visual cases**,1440×900,1920×1080,1128×830,768×1024,390×844,720×450, selected/help and larger text. No horizontal overflow; primary action/footer fit normal1440 desktop. |
| Bundled Python `tools/check_character_contrast.py --output output/character-dossier/visual/<case>` for all16 cases | **834 visible text runs, minimum5.70:1** on actual rendered texture. Sampling is clipped to the dialog's visible area and excludes hidden captions. Not a blanket accessibility certification. |
| `node frontend/scripts/.character-frame-client.mjs --url http://127.0.0.1:5293 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":6},{"buttons":[],"frames":6}]}' --iterations 1 --pause-ms 250 --screenshot-dir output/character-dossier/game-client` | Existing game skill client with cleanup-only `finally` wrapper; passes and actual screenshot/state inspected. Temporary runner removed. |
| Bundled Python `tools/build_character_art.py --check` | Five exact source crops, dimensions, RGBA and hashes pass. |
| Bundled Python `tools/audit_inventory_assets.py --output output/character-dossier/asset-audit` | **132 images** audited, source hashes and previous runtime content preserved. Count includes concurrent project assets. |
| Scoped Prettier check and `git diff --check` | Pass for this slice. |

The first browser attempts were blocked by missing local-Origin whitelist configuration; the task backend was corrected before all final runs. Actual screenshot review found the title too close to the brass clip and inherited button gaps causing excessive height. These were corrected. An Escape focus assertion caught a requestAnimationFrame race; focus restoration is now synchronous and the full flow passes. Final touch inspection also caught inherited sticky-hover colors on the stable action button. Explicit primary hover/focus colors now preserve readable contrast, and the full16-capture flow (including a touch-action contrast assertion) and frame client pass again after that correction.

## Evidence and limitations

Actual screenshots: [desktop starter](../../output/character-dossier/visual/1440-top/screen.png), [phone starter](../../output/character-dossier/visual/390-top/screen.png), [phone selected detail](../../output/character-dossier/visual/390-selected/screen.png), [commission guidance](../../output/character-dossier/visual/1440-help/screen.png), [successful upgrade](../../output/character-dossier/purchase-saved.png), [pending](../../output/character-dossier/purchase-pending.png), [rejected](../../output/character-dossier/purchase-rejected.png). Test data is isolated; upgrade fixtures are named as tests. Fresh starter screenshots retain actual100/100 resources, Lv.0 abilities and zero points.

Results, texture samples, recordings and frame-loop artifacts live under `output/character-dossier/`. Desktop, tablet, phone, short-landscape, larger text and transaction screenshots were visually inspected. Physical devices/Safari, native browser-menu zoom, screen readers and long-session endurance are unverified. Actual owner-render approval remains pending. No broad world regression is claimed beyond the scoped input/state and skill-frame checks.

## Preview and cleanup

Manual preview: **http://127.0.0.1:5293/** → enter the isolated test world → click **角色**. This is a distinct test save, not the owner's existing journey.

Retained for manual review: fixed-build Vite preview5293 (PID29680, session90110) and isolated API8093 (PID29974, session30316). Startup commands, in their respective frontend/backend directories:

```sh
REALQUEST_API_TARGET=http://127.0.0.1:8093 node node_modules/vite/bin/vite.js preview --outDir ../output/character-dossier/build --host 127.0.0.1 --port 5293 --strictPort
DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/character-dossier/test.db SESSION_COOKIE_NAME=realquest_character_dossier ALLOWED_ORIGINS=http://127.0.0.1:5293 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8093
```

Listeners/PIDs/start times/working directories and proxied health=`ok` verified. The earlier task-owned DEV server and two superseded backend processes were stopped and their exits confirmed. All task browser contexts/runners/recordings close in `finally`; the two temporary browser runners were removed. No task-owned headless browser remains. Shared app MCP/node_repl hosts cannot be safely attributed to this completed slice and were preserved, along with other tasks' services. No broad process termination, commit, push, deployment, account setting change or user-save write.
