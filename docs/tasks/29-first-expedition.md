# 29 · 安家后的第一次初探

状态：已实现可玩候选；下列自动化与实机检查已通过，实际画面与手感待用户确认。

用户授权范围：安家交付 → 理解离村条件 → 武器准备 → 洞穴首层 → 带材料返村。完善新手引导和衔接，沿用现有成长、购买／打造、战斗、掉落、石门和存档规则。

## 实现计划

1. 复用任务追踪、告示板、武备台和洞口面板，加入可收起、可恢复、服务器保存的初探里程碑。
2. 按真实状态引导购买／打造、主动装备、必要恢复、首层清理、带胶质回工坊并查看用途；不强迫完成教程，不封锁深入探索。
3. 用独立数据库验证真实安家／购买／首层战斗／返村链，以及拒绝／重试、刷新、旧存档、输入所有权和桌面／横屏布局。

视觉：沿用 Hearthwood 的亚麻纸、苔绿和可读中文；只在既有表面加入短提示，不新增全屏教程。
内容：当前行动 → 原因 → 一个明确动作；详细启门条件只在告示板／石门阅读上下文显示。
交互：复用已有标记、面板及按压／焦点反馈；进度改变时更新指引，尊重手动追踪的支线与独立地图标记，无强制镜头或移动。

## 边界

- 不更改魔法3级、现实委托每小时1点／每日合计5点、武器价格、怪物或奖励。
- 不增加点数、赠装、额外金币或教程奖励；回顾不会消耗材料。
- 无新增素材、字体、音效、依赖或数据库表迁移；只复用已有素材和 Lucide。
- 不提交、推送、部署或修改玩家数据库。旧洞穴进度默认收起初探，可在旅人指南继续；已开门存档保持自由探索，不假造教程完成记录。

## 已实现流程与文件

- `backend/app/village_intro.py`、`rules.py`、`combat.py`：服务端保存说明已读、首层清理、携胶质回工坊和回顾进度，以及可收起偏好。首层清理只由真实战斗结算产生；洞口不算回村。回顾在武备台附近校验已清理与实际返村，不另发或扣除物品。旧存档依据真实通路推导既有首层进度，保留原存档与所有余额。
- `frontend/src/game/villageIntro.ts`、`components/VillageIntro.tsx`、`village-intro.css`：状态驱动的下一步、展开引导、远行条件说明、准备提示和材料用途回顾。金币不足有采集／出售入口；已有武器需主动装备；生命或体力偏低先回家；胶质存箱则先取回。阅读和标记不执行购买、移动或成长。
- `Quests.tsx`、`CombatPanels.tsx`、`App.tsx`、`navigation.ts`、`WorldScene.ts`、`GameCanvas.tsx`、`stores/game.ts`、`types.ts`、`main.tsx`：接回既有表面、任务导航与单画布。默认追踪随引导变化，主动追踪支线时保留支线；只有属于上一引导步骤的标记会随进度清理。指南可恢复引导，刷新继续原进度。首层清理后明确提供带材料回洞口的动作，仍可自由深入。
- 新增 `backend/tests/test_village_intro.py`、`frontend/scripts/village-intro-{state,smoke,controls}.mjs`，登记 npm 检查脚本。README、TODO、DESIGN、素材登记和本任务报告同步；不改短剑价格、成长时长、怪物、掉落或经济。

## 验证环境与命令

沿用 npm/package-lock、React19.3.0、Phaser3.90.0、Vite6.4.4、Python3.14虚拟环境。没有独立 lint 脚本。测试 API 仅绑定 `127.0.0.1:8104`，生产预览 `127.0.0.1:5404`；只有 `output/first-expedition/test.db`，cookie 为 `realquest_intro_test`。正常玩家数据库未打开或修改。

初始化命令（cwd `backend`）：`DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/first-expedition/test.db .venv/bin/alembic upgrade head`。

API 命令（cwd `backend`）：`DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/first-expedition/test.db SESSION_COOKIE_NAME=realquest_intro_test ALLOWED_ORIGINS=http://127.0.0.1:5404 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8104 --no-access-log`。

预览命令（cwd `frontend`）：`REALQUEST_API_TARGET=http://127.0.0.1:8104 npm run preview -- --host 127.0.0.1 --port 5404 --strictPort`。首次沙盒禁止本机监听，授权运行后成功；没有自动审批拒绝。

| 检查 | 实际结果 |
|---|---|
| `backend/.venv/bin/python -m pytest -q`（cwd 改为 backend 后使用 `.venv/bin/python`） |224通过，含9项初探检查：进度、资源守恒、远程／未完成拒绝、重复回顾、偏好、部分掉落／跨日、携物回村及旧存档续接。既有 Starlette/httpx 弃用提示。|
| `npm run build` |TypeScript与生产构建通过；既有大分块提示保留。|
| `REALQUEST_URL=http://127.0.0.1:5404 npm run test:intro` |19项状态决策；6组实机流程／19张截图。新游客未注入位置、成长、击杀或掉落：实际进家／采集／交付，32金币购买24金币短剑并装备，真实键盘清理3苔团获得3胶质与6金币，步行返村并回顾。刷新、收起／恢复、阅读输入、标记不传送、503拒绝／重试与回顾回执重放通过，零非预期浏览器错误。|
| `REALQUEST_URL=http://127.0.0.1:5404 REALQUEST_TEST_DB=/Users/zilong/Developer/projects/RealQuest/output/first-expedition/test.db npm run test:intro:controls` |隔离UI条件夹具，7组专项／4张截图：金币短缺、材料出售、日志装备入口、低体力、存箱取回、支线追踪、DPR2横屏真实触摸／减少动态／关闭与Life切换。不是额外的真实成长或战斗验证。|
| develop-web-game 原始逐帧客户端 |只适配本地Playwright、隔离会话与finally关闭；最终2次移动／画布／文本状态采集通过，单画布、已完成引导和零错误已核对，截图已打开检查。适配副本在忽略目录 `frontend/node_modules/.cache/intro-frame-client.mjs`。|
| `python3 tools/audit_inventory_assets.py --output output/first-expedition/asset-audit` |156张既有图像的来源／尺寸／哈希与源像素保留检查通过，无新增素材。|
| Prettier新文件检查、`git diff --check` |通过。|

新引导展开状态另采集15条实际可见文字及隐藏文字后的真实背景像素，对比度最低6.80:1；正文／说明至少14px，动作至少44px。结果在 `output/first-expedition/contrast-report.json`，范围仅为1440×900展开初探追踪，不宣称其他界面或所有背景均通过。最终字号修正后重跑7组控制专项与2次逐帧采集通过，截图已检查。

主流程桌面1440×900／1920×1080，横屏844×390／720×450。实机截图已检查：[启门说明](../../output/first-expedition/01-briefing-1440.png)、[武器装备](../../output/first-expedition/03-equipped-next-cave.png)、[首层完成](../../output/first-expedition/06-first-floor-cleared.png)、[返村回顾](../../output/first-expedition/08-material-review-1440.png)、[展开引导](../../output/first-expedition/controls-expanded-guide.png)、[横屏触摸](../../output/first-expedition/controls-touch-recap.png)。完整成功录屏：[WebM](../../output/first-expedition/videos/page@1f74a98175a64d98cb0280c66d1c9ecb.webm)。过程失败截图／录像保留用于诊断，最终结论以 `report.json` 和 `controls-report.json` 为准。

最初脚本误用了场景切换中的旧相机与不可见坐标、隐藏的旧指南按钮，以及未等待装备响应；已改为等待场景／服务端确认、使用主菜单和真实键盘沿路行走。没有通过注入位置或战果跳过问题。画面检查另修正了新引导继承的过小字号，作用域仅限初探追踪。

## 保留边界

本次通过的是安家至首层回村切片，不是完整3小时现实成长、全洞平衡或离村整章重新验收。没有确认真实学习行为。实体设备／Safari／原生缩放／屏幕阅读器、断网长时运行和生产PostgreSQL负载未验证；实际玩家手感和视觉确认待用户试玩。手机竖屏不在范围内。

## 收尾

所有浏览器／上下文均在finally关闭。工具会话Ctrl-C已关闭API8104（初次21480，最终22960）及预览5404（npm21495、Vite21518、esbuild21519）；逐帧runner24132和后续本任务runner均已退出。`output/first-expedition/owned-runtimes.json`记录身份／父子关系／启动时间／参数／工作目录；`cleanup.json`确认已记录PID、任务runner与两个监听端口均无残留。没有保留本任务预览服务，没有关闭用户原有浏览器或共享宿主。78条本地文档链接有效。没有提交、推送、部署或自动审批拒绝。
