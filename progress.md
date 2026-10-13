Original prompt: 按用户提供的《RealQuest｜现实副本 — 项目开发提示词》实现空仓库中的可玩版本；后续待完成部分写入 TODO.md 中。

## 2026-10-13 UI archetypes — candidate

- Owner requested all six existing screen archetypes. Implemented interactive map selection/destination dock, pinned notice index/detail, NPC scene with optional request, paired item grids, blueprint stages/materials, and utility growth workspace with actual source/reward receipt.
- Preserved the concurrent Today study feature, original dirty tree, inventory/journal/character/arrival compositions, player DB and authoritative commands. No new bitmap assets or save fields.
- Matched before/after fixtures at five viewports; actual game screenshots/recording; storage and quest mutation/input/persistence coverage; full fixed-build desktop/mobile smoke passes. Backend 44 tests, TypeScript/Vite build, 31-image audit and 36 contrast cases (921 text runs, min 4.56:1) pass.
- Detailed implementation, evidence, commands, limits and cleanup: `docs/tasks/07-ui-archetypes.md`. Final visual approval pending. No commit/push/deploy.

## 2026-10-10 World dialogs and item identities — current checkpoint

- Owner explicitly requested the six pictured dialogs and recognizable wood/seed icons. Shared Hearthwood materials, different layouts: pinned commissions, conversation, folded map, chest tray, repair order, efficient growth forms.
- Original 16px logs/seed pouch rebuilt by `tools/build_item_icons.py`; registry/quickbar/rewards/materials use the same identities. All previous source PNGs retained; new icon hashes/script and dimensions recorded. No world, rules, save or engine migration.
- DEV-only `/dev/dialogs` reuses actual panels, labeled fixtures generated from existing backend create/upgrade rules; tested zero API/cookie/localStorage writes and absent from production output.
- Isolated `output/dialogs-reference/test.db`, 5187/8021. Final build, 32 backend tests, full desktop/mobile smoke, RPG, journal, dialogs captures/interactions, 31-image audit/pixel rebuild and frame client pass. 36 contrast cases / 844 visible text runs, minimum 4.65:1.
- Real 1440×900/390×844 and 768/1920/720 captures inspected, including mobile bottoms. Storage rejection/pending/retry/duplicate/conservation/reload, actual touch recording, keyboard focus/input/Escape and non-teleporting markers verified. Physical Safari/touch/keyboard/zoom remain unverified.
- Candidate awaiting visual review; other menu/guide/settings/AI content untouched. Complete record in `docs/tasks/05-world-dialogs.md`. No commit/push/deploy; unrelated active database WAL/SHM preserved. Cleanup handoff is recorded in that report.

## 2026-10-10 Hearthwood inventory reference — Pass A

- Scope: audit, isolated component preview, real inventory only, matched starter screenshots; stop for owner visual approval before Pass B or other screens.
- Existing dirty tree preserved. Test services: frontend 5187 / backend 8021, isolated `output/inventory-pass-a/test.db`; original databases untouched.
- Audit: 24 is an existing UI tray size, not a server capacity. Only five non-currency item IDs exist. Numeric quick slots open details; navigation marks a destination. Preserve these behaviors and label them accurately.
- Composition: linen header/details, quiet moss-tinted tray, existing 16px item icons at 2x/3x, controlled button/selection transitions; mobile four-column tray and separate details view.
- Baseline starter session and before images captured at 1440×900 and 390×844. Final candidate evidence is recorded below.
- Completed candidate: scoped token CSS, shared inventory primitives, four-column mobile tray/detail subview, true quantities, depleted shortcuts, exact marker labels, and development-only isolated fixtures. No source PNGs, world tiles, rules, saves or engine versions changed.
- Eight supplied PNG hashes/blobs and all 21 existing PNG dimensions/bounds recorded; selected Kenney packs remain absent. Source samples were visually reviewed, retained as references, and not shipped as a skin.
- TypeScript/Vite build, 21 backend tests, inventory selection/input/persistence/preview checks, actual planting rejection/pending/idempotent retry, existing play-mode and full RPG flow regressions pass. Rendered text contrast: 44 samples, minimum 4.97:1. Full results and commands are in `docs/tasks/01-inventory-slice.md`.
- Desktop 1440×900 and phone 390×844 before/after use the same isolated starter guest. Additional 1920×1080, 768×1024, DPR2 emulated touch and effective 200% reflow checked. Screenshots inspected; recording saved. Real touch/Safari and actual browser-menu zoom remain unverified.
- Owner explicitly authorized restoration after concurrent deletion of design-kit sources; restored exact committed bytes. Work remains uncommitted over owner commit `f1f9fe5`.
- Stop at Pass A visual checkpoint. No rollout or Pass B targeting implementation. Retain isolated 5187/8021 services for owner review, with no automation browser retained; clean up these services after review.

## 2026-10-10 v0.2 Milestone A（当前请求）

- 用户提供双模式重构需求，但本轮仅授权 A，完成后等待视觉和操作方向验收，再继续 B–E。
- 已核查 React/Phaser、共享状态、规则/API/存档与 AI 缺口，具体计划记录在 docs/ux-overhaul-v0.2.md。
- 使用隔离 5185 / 8019 与 output/ux-v0.2/test.db 捕获四视口基线，不修改用户已有数据库与启动脚本。

## 实施记录

- 2026-10-09：确认仓库为空。采用 React / TypeScript / Vite / Zustand / Phaser，FastAPI / SQLAlchemy / Alembic。开发默认 SQLite，Docker Compose 使用 PostgreSQL。
- 视觉方向：原创程序绘制的温馨像素地图，草绿、米白与木色；游戏画布为主要工作区，任务日志为辅助栏，复杂操作通过面板展开。
- 交互方向：行走逐帧动画、环境水波、采集反馈；减少动态效果偏好关闭装饰动画。单一画布，提供 render_game_to_text 与 advanceTime 检查入口。
- 交付以实际完成和验证为准；后续事项统一维护在 TODO.md。

## 已实现

- React + Phaser 可玩地图、三种角色、两位预设 NPC、键盘/手机控制、存档恢复。
- 服务端规则、游客隔离、幂等回执、资源生产交易、三建筑升级、现实记录、学习计时与条件探索。
- 完成 TODO.md，按 P0 / P1 / P2 与验证缺口整理；AI 及任务系统未实现，不把预设对话标成 AI。
- 12 项后端测试、TypeScript/Vite 构建通过。Docker Compose 的 PostgreSQL/后端/前端实际启动成功。
- 使用技能自带 Playwright 客户端（原样复制到被忽略的 node_modules/.cache）验证移动与文本状态；新增脚本覆盖业务链与移动端。
- 截图检查发现原生 dialog 居中被 CSS reset 覆盖，已修正；修正游戏方向键滚页、交互等待位置同步、建筑升级渲染更新。

## 接续信息

- 核心后续任务详见 TODO.md，不重复维护另一份待办清单。
- 当前本地测试后端使用 output/playtest.db，8017 端口；Vite 5174 端口（系统已有其他项目占用 8000、5173，未修改它们）。
- Docker Compose 仅绑定 127.0.0.1:8080，使用独立 realquest_postgres_data 卷。
- AI 全部待实现；自定义现实目标/每日任务模型、正式 Demo、源同步、成长资源消耗等尚未具备。

## 最终验证

- 完整浏览器烟雾测试在 Docker/PostgreSQL 的 http://127.0.0.1:8080 通过，包含真实 60 秒作物成熟、资源恢复、收获、交易、建筑升级；控制台无错误。
- 桌面、375px 手机竖屏、844px 横屏截图已生成并检查；弹窗居中修复已验证。
- 前端 TypeScript/Vite 构建与后端 12 项测试通过。Phaser 体积提示、Starlette TestClient 的 httpx 弃用提示不会阻断运行，后续升级时处理。

## 2026-10-09 体验升级

- 用户要求优化像素美术/UI/交互，扩大地图，补足任务触发与可进入建筑。
- 根因：旧版 960×640 地图全景显示，只有新手里程碑；建筑只开升级面板。
- 本轮视觉方向：更饱满的暖色像素、瓦片屋顶/石基/木框细节、成簇植被与花草；木质边框和羊皮纸面板，游戏世界占据主视口。
- 内容结构：顶部精简状态、中心滚动世界、可收起任务追踪、底部快捷工具；不保留占据游戏空间的大标题区。
- 交互方向：点击寻路、邻近操作语义提示、任务图标和目标导航、进出建筑淡入淡出、采集浮字与作物成长提示。
- 扩展为 1920×1280 户外 + 小屋/工坊/图书馆/公会四个室内；确定性六任务的接取、进度、交付、一次性奖励；兼容旧存档。

- 体验升级测试修复：室内相机居中、缩放留白背景、公告板纸张比例、家具点击寻路的可站立网格、到达后清除旧导航目标、手机横屏画布高度。
- 增加服务端旧存档幂等迁移、任务解锁/领取/防重、仓储守恒、全地图可达性及支线进度测试，21 项通过。
- 新版 Docker Compose 已完成构建并更新本地 8080，PostgreSQL 存档卷保留。
- 游戏技能原始 Playwright 客户端在新版运行，输出位于 output/upgrade-final；综合浏览器测试扩展到四个室内、家具寻路、任务交付、地图导航与滚动镜头。
- 修复原地图两棵树阻塞扩展主路的问题，重新通过全部 21 项规则测试；5174 对应的旧开发后端已同步新版，原测试存档保留。
- 最终容器版桌面流程通过：四个室内、储物/休息、首个与 NPC 任务交付、地图/寻路、学习计时、真实作物成熟、出售/制作/升级、四项任务领奖和刷新恢复。手机专项发现提示条截获方向键点击，已改为非阻挡提示并上移，正在复测。
- 手机专项通过：375×844 竖屏、844×390 横屏的方向键实际移动、采集、活动面板、独立游客、无横向溢出、无控制台错误。成功提示不再截获点击，触控方向键按设备能力显示；修复窄屏/横屏高度并人工检查截图。
- 文档已同步：README 操作方式、game-design 六任务与地图规则、architecture 场景/存档升级、assets 新素材说明、roadmap 实际状态；未完成项继续集中在 TODO.md。
- 最终本地部署已更新。临时 8018/5184 测试进程已关闭；保留 8080 容器预览，以及使用原 playtest.db 的 5174/8017 开发预览。
- 最终 Docker/PostgreSQL 手机专项也通过，控制台无错误；综合烟雾测试创建的游客均通过自身会话删除（技能客户端使用独立测试库）。前端生产构建、21 项后端规则测试、桌面完整业务流程及手机横竖屏验证完成。

## 2026-10-09 参考村庄画风改造

- 实际运行隔离的 8018 / 5184 测试后端与前端，保存 `output/visual-overhaul/before.png`。
- 采用 Pixel-boy / Sparklin Labs 的 CC0 Ninja Adventure 像素贴图和完整四向角色动画；保留现有对象、碰撞和存档坐标。
- 新增独立 `village.ts` 地面烘焙与素材帧配置：取消棋盘随机着色、弯曲泥土路、细碎河岸、用途相关生活装饰、不同屋顶。
- 新增全视口 `game-ui.css`，浮动紧凑 HUD、短快捷栏、折叠追踪；清除常驻建筑标签，桌面不显示方向控制器。
- 已检查首次截图并修正树木裁切带入相邻对象、旧角色文件缺帧、四方向源文件帧排列问题。邻近 NPC 转向与 idle、逐字对话、采集/经验/升级反馈、静音默认的合成音效与减少动态效果设置已接入。
- 现有浏览器完整流程第一轮通过到森林探索；旧测试对相机 scrollX 的固定 900px 假设不适用于整数缩放，已改为检查镜头实际跟随。继续回归与多视口审查。
- 全业务浏览器烟雾通过：四个室内、任务、储物、真实成熟/收获、经济、现实计时、森林导航、刷新恢复，以及手机横竖屏；无控制台错误。21 项后端测试通过。
- 新增 `test:visual` 四视口检查通过，包括四方向帧、移动锁、NPC 对向、逐字/减少动态、偏好持久化、含 HUD 的全屏。截图均已打开审查；最后修正横屏隐藏设置入口、触控尺寸与对话消息重复，并将背包占位图换成可重建 PNG。
- 已记录两套 CC0 源、精确源提交、许可证、派生屋顶与图标重建脚本。完整 Tiled 权威地图迁移、室内家具贴图、NPC 日程、真实手机 Safari 仍为后续范围；不改变后端规则和存档结构。

- 最终构建、五视口（含 844×390 横屏与 44px 触控尺寸）通过；图标与对话截图已检查，`visual-result.json` 的错误列表为空。保留 5184 / 8018 隔离预览供查看；原有数据库未改动。

### v0.2 A 验收检查点

- 已完成自适应整数近景（1440 2倍、1920 3倍）、家园告示板/农田小路、默认简洁下一步、地图/音效/主菜单、现实成长可用入口。
- 统一 interaction.ts 的动作/状态/命中区域，原门口锚点与服务端规则不变；冷却、成熟、条件提示可见。修正面板/焦点/失焦的输入生命周期、移动帧、真实资源浮字与延后到返回游戏的 EXP 反馈。
- 前端构建通过；21 后端测试通过；五视口 visual、完整 smoke、A 专项 play-mode、技能客户端均通过，无浏览器错误。截图逐一检查并修正触控焦点、按钮访问名称、hover 对比度；最终截图和证据见 docs/ux-overhaul-v0.2.md。
- 正式数据未修改，无迁移；README、scripts/start.py、start.command 和原数据库 WAL 为用户已有改动，未触碰。
- 本轮停在 A；B–E 须等待用户视觉/操作确认。保留隔离预览 5185 / 8019（test.db），浏览器自动化全部 finally 清理；用户完成预览后仅清理本次服务和预览页。

## 2026-10-10 RPG 界面精修（当前用户请求）

- 用户进一步授权重做浮动 HUD、格子背包、角色创建与成长档案；这是对 A 的修正并覆盖 B 中上述面板，不涉及独立 Life / AI。
- 视觉主张：暖木框、亚麻色内容、深色物品槽；以整数像素人物和林间近景为视觉重心。
- 内容结构：头像徽章与资源、单条任务线索、快捷口袋；24 格背包 + 物品详情；人物档案 + 可选属性与真实能力。
- 交互：人物外观切换、物品选中/分类/快捷口袋配置、能力解锁进度与地图用途；尊重 reduced-motion。
- 首版完成：RpgPanels、独立 rpg-ui 样式、创建场景、紧凑 HUD；1440 桌面镜头 3 倍，减少地面碎纹与零散摆件。
- 能力遵循现有服务端：学识 25 解读符文、体魄 50 增加采集。其余是基础能力；不虚构等级解锁或装备数值。
- TypeScript / Vite 首轮通过。接下来运行隔离 5185 / 8019 服务上的多视口与业务验证；正式数据库不参与测试。
- RPG 新交互和六视口专项通过：24 格、分类、快捷顺序持久化、数字键、真实木板制作、学习/运动能力解锁、地图方向引导与手机固定操作。
- 原五视口 visual 通过，近景 play-mode 专项通过，21 项后端测试通过；技能帧步进客户端已运行并打开截图核查。
- 截图发现并修复：舞台贴图尺寸、误用装饰帧、背包页脚换行、角色技能按钮被全宽 text-button 挤压；手机属性收成横向选择栏。
- 完整 smoke 第一轮被开发热更新关闭地图面板打断；停止源码编辑后重跑。新增背包真实播种→成熟→收获→出售验证正在运行。
- 预览服务在 5185 / 8019，独立测试库 output/rpg-polish/test.db。保留给用户验收，自动化浏览器独立清理。
- 最终原有完整 smoke 通过：四室内、任务、镜头/导航、仓储、休息、学习计时、成熟收获、制作交易、存档恢复，以及手机横竖屏触控；控制台无错误。
- 最终扩展 RPG 回归通过：背包直接播种扣除 1 种子 → 真实等待成熟 → 收获 2 萝卜 → 柜台从背包出售 1 萝卜得到 8 金币；截图 inventory-sold.png。六视口布局检查再次通过。
- 最终生产构建与 git diff --check 通过。预览页面已通过 Codex 排队打开；仅保留用于验收的 5185/8019 服务，未改原数据库或启动脚本。
- 后续：真实设备 Safari 尚未验证；独立装备/技能升级经济、Life Dashboard 与 AI 保持原后续范围。此次所请求的 UI 与现有规则交互均完成。

## 2026-10-10 Satchel inventory implementation — current checkpoint

- Owner rejected the plain linen candidate as too much like a presentation/dashboard, then approved the generated satchel concept and requested inventory implementation first. Other dialogs remain outside this delivery.
- Visual thesis: a worn moss cloth organizer with linen slots, a detached item tag and sewn quick pockets. Interaction: short bag reveal, selected pointer/corner brackets, tactile presses; reduced-motion settings honored. Keep source world and real item counts.
- Implemented in the shared InventoryView / inventory.css: 6×4 desktop tray, four-column phone tray/detail subview, compact object tag, optional uses/source disclosure, four quick pockets, responsive real-resource labels. All semantic actions, localStorage keys and server transitions retained.
- Generated one textless shell with built-in image_gen from the approved concept; PNG source and exact prompt retained. Lossless WebP packaging checks pixel equality. Existing 21 PNGs unchanged, no Kenney files imported. Audit now verifies 22 entries.
- Visual inspection caught and fixed a currency-label overlap introduced during header refinement; browser test now verifies the coin label is actually unobscured. Texture contrast softened; high-balance/earned-resource mobile fixture checked.
- Build, 21 backend tests, inventory browser checks, rejection/idempotent retry, full RPG crafting/planting/harvest/sale + six viewports and skill frame client passed. Final evidence and remaining limits in docs/tasks/01-inventory-slice.md.
- Stop for review of the actual satchel screenshots, not blanket approval of other screens. No Pass B targeting. Actual touch/Safari and browser-menu zoom remain unverified. Keep only isolated 5187/8021 preview services for owner review, with test browsers closed.

## 2026-10-10 Journal reference — current checkpoint

- Owner explicitly approved the actual satchel, authorized journal next, and requested a distinct notebook layout before further rollout.
- Inspected six server quests, shared board/NPC actions, marker-only navigation, reward/retry behavior and actual activity provenance. New JournalPanel/JournalView presents a bound double page with cloth bookmarks; phone uses explicit index/detail and focus-returning Back. Same authoritative state, IDs, reward rules and existing actions.
- Generated one original textless book material using the approved project-generated satchel as palette/material reference. Source + exact prompt kept outside public; lossless WebP equality and manifest hashes verified. Eight vendor samples and all original runtime PNGs unchanged; 23 audited entries, no Kenney import.
- Added DEV-only `/dev/journal` with isolated presentation states and zero API/storage writes. Build excludes fixtures. Extracted shared quest actions without restyling NPC/board dialogs.
- Actual screenshots inspected at 1440×900 and 390×844, plus 768/1920/short landscape. Fixed phone footer near paper edge and long-text bitmap stretch using a clipped fixed-depth nine-slice; final long-text footer remains on paper.
- Journal layout/44px/focus/touch, real ready→claim→completed, board/NPC accept, failed tracking, pending deduplication, same-ID retry, persistence and manual growth pass. Existing inventory and play-mode suites pass; backend 21 tests pass; build, audit, game frame client and diff checks pass. Detailed evidence in docs/tasks/02-journal-slice.md.
- STOP at journal visual checkpoint; no rollout to other dialogs. Physical-device touch/Safari/browser-menu zoom unverified; generated material 1.33 MB. Keep isolated 5187/8021 for review, close automation browsers. Do not commit or deploy without authorization.

## 2026-10-10 Adventurer dossier — current checkpoint

- Owner authorized character panel next, preserving real stats/progression/actions and requesting a distinct dossier rather than the journal layout. Prior uncommitted journal work retained.
- Audited CharacterPanel, XP floors/remainders, strength50/wisdom25 gates, basic abilities, activity preselection and marker-only navigation. Pure CharacterView plus store adapter now presents identity photo, level stamp, growth marks and selected ability on a single cloth/paper dossier. PixelPerson extracted without changing creation/HUD behavior; character frame stays 4× source scale.
- One original blank material generated with built-in image_gen from the approved project satchel as material reference only; raw source/prompt saved and lossless runtime RGBA verified. Original21 assets unchanged, total24 audited; no external pack/world/font changes.
- Desktop/phone review fixed level-stamp/clip overlap, paper-edge footer and inherited low-contrast gold small text. Actual texture sampling now passes59 text runs, min4.63:1. Initial before capture was corrupted by concurrent HMR; unsuccessful reconstruction diagnostics excluded from evidence. Reliable final views and unchanged starter data are verified.
- Character five-viewport/44px/focus/touch/preview tests pass. Real study24→25, exercise49→50, XP100→Lv2, attribute50→Lv2, saved125XP, four-material gather, rejection/same-ID retry and appearance persistence pass. Existing RPG full flow, journal layout, backend21 tests, build, asset audit and frame client pass.
- DEV-only `/dev/character` has isolated starter/near/unlocked/veteran/long fixtures; no API or storage writes and no fixture strings in production JS.
- Stop at character visual checkpoint. See docs/tasks/03-character-slice.md. Physical Safari/touch and actual browser-menu zoom remain unverified; runtime material1.47MB. Retain existing5187/8021 preview for owner, close automation browsers. No commit/push/deploy.

## 2026-10-10 Village arrival — current checkpoint

- Owner approved the generated village-registration concept, asked for softer name/appearance controls and more actual characters. Implemented only the welcome flow, not other screens.
- WelcomeView/Welcome adapter now compose a full-screen static village illustration, live small traveler, blank clipped paper material, signature line, six offset portrait tags and one wooden entry button. DEV-only `/dev/welcome` is explicitly labeled and makes no API/storage writes. All actual controls/text remain DOM.
- Added three byte-identical CC0 sheets from the same fixed Superpowers/Ninja Adventure source: upstream 6, 9, 5 → IDs 3, 4, 5. Full first four animation rows audited; old IDs 0–2 untouched. Shared registry feeds DOM/HUD/dossier and Phaser textures; server create bounds expand to 0–5, no save migration or balance changes.
- Two generated blank welcome materials packaged losslessly with source/prompt provenance. Assets audit verifies 29 images; Kenney still absent; playable world unchanged.
- Browser checks cover all six create/reload/portrait/walk flows, blank name, keyboard/IME, rejection/pending/retry/idempotency, DPR2 touch and isolated preview. 32 backend tests and original RPG regression pass. Frame client capture inspected. Five viewport screenshots inspected. Mobile contrast findings fixed; default/hover text sampling passes, minimum 4.97:1.
- User databases and pre-existing `scripts/start.py` edits left untouched; all mutations ran against output/arrival-reference/test.db. Stop at actual homepage visual checkpoint. Further details/commands/limits in docs/tasks/04-arrival-slice.md.

## 2026-10-13 Today study — learning loop

- Authorized one end-to-end learning-task slice, with Hearthwood game-page feel. Added a full-screen two-leaf study journal reached from 现实成长 → 今日研习; mobile prioritizes timer actions. Reused the existing journal/actor art, original inline SVG hourglass, shared tokens, restrained motion and reduced-motion handling.
- Server JSON saves gain stable study tasks and record/timer identities. Existing timer produces linked activities; completion/retroactive association never awards XP again. Same-day linking, cumulative partial sessions, daily cap, cross-midnight finish-day settlement and legacy saves covered by deterministic tests. No SQL schema change or user-save mutation.
- First build and 44 backend tests pass. Real Chromium one-minute timer, create/finish lost-response retry, paused refresh, manual record association without re-award, world threshold marker, keyboard/IME/Escape, mobile touch and 5 viewport layouts pass. Contrast edge findings corrected: 10 texture-sampled cases now pass, minimum 4.89:1. 31-image source/hash audit and existing game skill movement client pass.
- Shared workspace continues to receive unrelated world-dialog changes. A broad smoke test was interrupted by HMR; preserved those edits and switched this task's 5193 frontend to a frozen production snapshot in output/study-reference/build. Backend 8023 uses only output/study-reference/test.db. Final fixed-build regression/cleanup and evidence will be recorded in docs/tasks/06-today-study.md.
- Final: original desktop/mobile smoke passed on the fixed build after concurrent dialog work's locator update. Study flow passed on production output; final complete state now uses a closing-book message. Final contrast: 10 cases / 268 text runs / min 4.97:1. Backend 44 passed, build/audit/diff checks passed. Evidence and scope recorded in docs/tasks/06-today-study.md.
- Handoff: fixed preview 5193 (Vite PID63576) + isolated backend8023 (PID67308) retained for manual review; preview uses realquest_study_preview Cookie to avoid other local guests. Both healthy. Own automation sessions/browsers exited; old own dev servers stopped. Other task 5189, independently running browser tests and unowned shared tool hosts preserved. No commit/push/deploy; physical Safari/native keyboard/browser-menu zoom remain unverified.

## 2026-10-13 Study journey — plans, daily pages and recovery

- Owner authorized plan → today's study → continue another day → archive/review plus saving/recovery/background validation. Started from a clean tree. Reused existing Hearthwood book, tokens and actor art; no assets/dependencies added.
- Added server-owned plans, deterministic plan/day page IDs, archive/restore, safe task edits and preserved existing reward/provenance rules. Old standalone pages stay usable. Recovery uses hashed bearer credentials and server identity preview, restores latest state into an additional session and never imports client balances. Migration 002 adds two tables without rewriting player JSON or receipts.
- Study page gains chapter bookmarks, book-spine index, selected chapter and dated memory leaves. Phone prioritizes current chapter/action; creation hides secondary shelf. Settings/welcome include recovery entry. Server-clock anchor uses monotonic time; focus/visibility/online resync and expected save ID prevent cross-save stale-tab writes.
- Final backend 54 tests and build pass. Fixed-build journey browser flow passed with 38 layouts, 62-second actual Chromium page freeze, second-tab pause, wrong local time, offline failure, retry deduplication, Cookie-free and existing-save recovery. Original full desktop/mobile smoke and skill frame loop pass; 31-image audit and 12 contrast cases (302 runs, min4.89) pass. Physical mobile lock-screen/Safari and independent database disaster recovery remain unverified/outside scope.
- Evidence/commands/limits/preview cleanup in docs/tasks/08-study-journey.md. New isolated fixed preview5195/backend8027 retained for owner review. No commit/push/deploy; user database not migrated or edited. Remaining: actual visual acceptance, physical device verification, broader Goals/History pagination and key management.
- Final legacy study regression also passed: original one-minute flow, manual record association/no repeated award, marker/focus/touch. Adapted the existing record-summary selector and awaited pending request completion before test interception teardown; original assertions retained. Tracked automation/Chromium/ffmpeg PIDs all exited, downloaded credential removed; new preview5195/backend8027 healthy and retained, earlier user preview5193 preserved.

## 2026-10-13 Cottage and yard — visual prototype in progress

- Owner authorized only a walkable/interactable home-yard sample and reading entry, stopping before new upgrade appearances/save work. Short plan and scope in docs/tasks/09-cottage-prototype.md.
- Baseline desktop/mobile screenshots captured in isolated output/cottage-prototype; user databases untouched. Existing npm/Vite/Phaser and Python environment reused, no dependencies or external artwork added.
- First pass adds original code-native Hearthwood cottage/yard/room, distinct study book on the existing table with separate retained upgrade manual, proximity brackets, ephemeral object responses and direct study entry. Furniture/collision footprints unchanged; no saved fields or economy changes.
- Initial build and all 54 backend tests passed. Skill frame client ran with cleanup-only wrapper, and actual desktop/mobile screenshots inspected. Found crop/scale issue in old outdoor/mobile camera and corrected; refining mobile indoor framing and foliage/roof before final interaction checks.
- Final candidate: original Hearthwood scene with direct reading entry, separate retained manual, confirmed object responses and unchanged collision/spawn geometry. Fixed production preview at 5197 with isolated backend8029; in-app tab opened using a dedicated `小屋试住旅人` guest and marked deliverable.
- Final validation: 54 backend tests, production build, existing full desktop/mobile game regression, 25-capture cottage flow and skill frame client passed. Actual 1440/1920/768/390/720 and DPR2 touch 375/844/reduced-motion captures; fixed low-landscape player/quickbar overlap. No unexpected console errors. Existing 31 rasters plus procedural source hash audited with bundled Pillow runtime.
- Stop for owner visual confirmation. No new upgrade stages, save fields or recovery logic; existing saves/economy/IDs remain. Physical Safari/native device/native zoom unverified. Detailed files, commands, artifacts, exclusions and cleanup in docs/tasks/09-cottage-prototype.md. No commit/push/deploy.

## 2026-10-13 HUD travel kit

- Owner approved the generated HUD concept and authorized implementation. Scope and short plan: `docs/tasks/10-hud-travel-kit.md`. Clean starting tree; existing cottage preview retained.
- Added a scoped travel-rail/nameplate/quest-note HUD skin and original code-native 24px icons; reuses actual actor appearance/item sprites, counts and all existing actions. New isolated 5199/8031 test services; no user DB modifications.
- Before and first-pass five-viewport screenshots captured. Reviewing responsive layout and controls; build found a nullable character type inside navigation callback, corrected with the existing component fallback.
- Final browser flow passes (12 captures): all four entries/shortcuts, quick assignment/depleted/reload without consumption, focus/held-key/IME ownership, sound persistence, marker-only quest guidance, tracking, actual gather/cooldown, DPR2 touch/reduced motion and long name. Existing play-mode regression and skill frame client pass. Five same-save final screenshots inspected; contrast57 text runs/min5.67 and31-image/source audit pass.
- Actual implementation remains a candidate for owner review. No modal contents/world/camera/backend/data changes. Commands/files/evidence/limits are in task10; physical Safari/devices/native zoom unverified. No commit/push/deploy.
- Handoff: new5199 frontend (Vite19702/npm19679) and8031 backend19652 retained for manual review; health endpoints pass. Browser tab opening queued in Codex. Own automation browsers/processes exited in finally; shared unowned tool hosts preserved. Earlier5197/8029 disappeared during the task without any stop action here. Final active/focus selectors scoped to HUD only.
