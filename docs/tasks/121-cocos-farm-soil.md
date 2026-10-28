# 田地土壤表现优化 — 2026-10-22

玩家反馈：六块棕色圆角地块更像木板，看不出田地。范围限定世界中的土地表现；保留原田地位置、42×36世界单位绘制范围、点击范围、作物锚点、规则与存档。

计划：审查当前绘制与素材 → 替换土面、垄沟与土边 → 实际Creator构建与种植流程验证 → 检查桌面/短横屏截图、清理自动化资源。

## 实现

- `clients/cocos/assets/scripts/farmPaint.ts`：项目原创代码美术，通过已有`paintGraphics`绘制阶梯土边、四道有厚度的土垄、凹沟、碎土。半世界单位的细节遵循村庄每世界单位两源像素密度；每地块ID生成固定纹理，不逐帧随机。
- `Bootstrap.ts`复用现有地块状态失效缓存，空田/作物/浇水变化时重绘；湿土使用同一几何和更深的土色。初始节点不再短暂绘制旧圆角底板。选中反馈、作物图片、位置与深度不变。
- 无新增栅格、字体或第三方素材；来源、状态、比例及脚本哈希记录于`asset-manifest.json`。作物继续使用task120的72图。
- `smoke-farming.mjs`复用受保护的独立QA库与真实种植流程，补充真实浇水后的世界截图，以及原六块空田在1440/1920桌面和844/740短横屏的截图。夹具明确标注，未读写原玩家数据。

## 验证

- `npm run cocos:sources:write`、`npm run cocos:check`通过：614来源、196绑定与官方Creator3.8.8严格类型。`node clients/cocos/tools/test-farming.mjs`通过12作物/72图绑定、土地状态、四阶段、暂停/离线边界及旧作物兼容。
- 最终真实release命令：`COCOS_CREATOR="$PWD/output/cocos-sdk/soil-121.app/Contents/MacOS/CocosCreator" COCOS_USER_DATA="$PWD/output/soil-121/creator-userdata" REALQUEST_COCOS_BUILD=web-soil-121 npm run cocos:build:release`，官方Creator完成；最终日志`output/soil-121/realquest-soil-121-build-final.log`。初次受限环境运行退出1且无Creator日志，正常本地执行后完成；未使用假引擎。
- `npm run cocos:test:browser -- --build web-soil-121/web-desktop --suite farming`最终报告`output/cocos-regression/run-efBRZF/result.json`，`complete:true`，6组通过、控制台错误为空。覆盖12种买种、播种等级拒绝、开垦、丢回包后同请求重试恰好一次、浇水、床铺睡眠/成熟、收获/出售、二次确认恢复/重载、Escape与Life输入隔离。
- 实机截图均在最终run的`suites/farming/`：`soil-detail.png`、`soil-dry-world-1440/1920/844/740.png`、`soil-watered-world.png`、`garden-stage-1/2/3/4.png`；各图已经打开人工检查。原耕作手记的1920/1024/844/740布局回归也通过，有`video/`流程录像。空田为正常原6田夹具，12作物四阶段属于明确的隔离视觉夹具，不代表玩家自然获得。
- 第一轮`run-NZRrL4`同样通过流程，但截图仍有较直条纹；自查后进一步降低反差、将土垄改为参差土块并重跑最终包。第一轮截图不作为最终效果。
- 通过实际载荷指纹核对后，默认`clients/cocos/web-current/web-desktop`已更新；原默认包备份`output/soil-121/previous-default`。切换前确认默认目录未被正在运行的预览使用，回执在`output/soil-121/default-build.json`。

## 清理与交付

两轮共12个已记录控制器/测试/浏览器/服务进程均已退出；最终浏览器PID59031正常退出、无强制清理，`browser-cleanup.json`确认进程组退出。Creator工作副本和独立user-data已删除，官方签名SDK保留。未创建额外node_repl/Playwright MCP；共享宿主无法归属本任务，保持原状。完整核验`output/soil-121/verification.json`。

仅新增保留人工预览`http://127.0.0.1:5453/`、API8153，独立正常新档`output/soil-121/manual-preview.db`、cookie`realquest_soil121`，launcher59236/API59247/proxy59248（session47104）；均健康，浏览器面板打开请求返回queued。既有5452/API8152与原存档未改动，5452健康检查200。测试仅操作受test_guard保护的新QA库，没有重置、迁移或读取原玩家数据。

交付包完成时`git diff --check`通过。未提交、推送或部署。工程与本地浏览器验收已完成；实际美术待玩家反馈，物理移动设备/Safari未在本次验证范围内。短横屏沿用原世界HUD避让与裁切，没有扩大到其他界面重排。

### 收尾时的并行源码变化

22:54收尾核验发现另一项任务122“自由开垦”已开始修改`backend/app/world.py`、种植规则/共享协议、`ui/farming.ts`与地形绘制等文件。因此最后一次`npm run cocos:sources`报告`backend/app/world.py`来源哈希不一致；`verifyBuild`也正确拒绝把本次包认作当前工作区最新源码。此前本任务的类型/来源检查与最终真实回归全部通过，报告中保留了当时的客户端、后端与载荷指纹；没有用新哈希绕过检查，也没有同步、回滚或混合构建另一项未完成改动。

默认包和5453服务对应已完成的任务121检查点；5453在这批源码变化前已完成加载，未开启后端自动重载。工作区当前全量集成状态留待任务122完成其真实构建与回归；不能将任务121的通过记录当作任务122的验收。
