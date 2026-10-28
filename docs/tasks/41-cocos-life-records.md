# Cocos 现实成长历史与学习记录整理

> 启动入口现统一为 `start.command`，本文中的入口名称已更新；其余历史参数、端口和验证记录保留当时状态，当前用法见 [本地说明](../cocos-local.md)。

2026-10-17。按任务39继续实施 M3。保留原 Web 源码、服务端规则与存档格式；不切换默认启动或发布，不迁移玩家数据库。沿用 Hearthwood 纸面、苔绿控件与系统中文字体，没有新增图片、字体、音频、依赖或奖励。

## 实现的记录链

从 HUD「成长」或 L 直接进入，世界暂停。现实成长有研习书页、长期计划、手动记录、现实约定、活动历史五个入口，三种成长余额常驻。日期与额度采用北京时间。

- **现实约定**：前日/次日、月份日历、今天与全部/已结算/已取消/进行中筛选，显示所选领取日已结算/预留与今天可领取额度。直接找回跨天的当前约定；详情保留领取、到期、结算/取消时间、原始点数及未核验说明。两步取消可撤回；结算仍需到诺亚处，不新增远程领取。
- **研习书页**：今天、历史、归档分别查看，日期选择与分页。详情阅读完整主题、累计分钟和完成状态；编辑/归档/取回在短横屏也可操作。新建按精确 ID 选中，同名主题不会选到另一张书页。修改历史书页保留其历史筛选上下文。
- **关联原记录**：书页关联明细与候选列表独立；只发送服务器已有活动 ID，候选为同日、学习类型、未归属其他书页的记录。完成书页仍可关联；自身或所属计划归档后禁止计时、编辑和关联，取回书页不自动取回计划。关联与重试不重复增加经验、资源或成长点。
- **长期计划**：进行中/归档列表，编辑、归档、取回、查看全部历史及归档书页、翻开今天一页。修改默认时长只影响新书页；同计划同日翻页保持服务端唯一 ID。所属书页尚有计时则禁用归档。
- **计时归属**：本页显示实时读数；选择另一张书页时只能进入明确标注原主题的「当前计时」，不会误暂停或结束另一本书页。保留原计时/书页 ID，支持旧计时无关联书页。跨天完成仍按现有规则生成今天的活动并关联原书页。
- **活动与旧锻炼**：活动按日期回看，完整备注分段阅读，显示原始来源、未核验标记和经验。旧锻炼约定及其关联活动只读，不恢复旧锻炼发点。保留原有五类手动记录。

短横屏使用分页和独立详情，44px 控件与明确返回；Escape 逐层返回，Tab/Shift+Tab/Enter 支持自绘按钮并显示焦点。原生文字输入/组合输入继续拥有输入权。成长面板在可写、可见且没有文字输入时每15秒刷新服务器状态，日期筛选/表单草稿不随刷新重置。真实专注与现实约定时钟不随游戏暂停或测试帧推进改变。

## 文件与兼容边界

- `clients/cocos/assets/scripts/ui/life.ts`：独立原生成长面板；`ui/panels.ts`委派此模块，保留诺亚现场接取/结算与其他功能面板。
- `clients/cocos/assets/scripts/Bootstrap.ts`：成长面板刷新、反向焦点遍历、可观察焦点 ID。保留任务40延迟销毁修正及其数据管理流程。
- `shared/game/lifeRecords.ts`：无写入的筛选、访问限制、记录来源、长文本与分页；生成的`assets/scripts/core/lifeRecords.ts`按既有同步机制维护。
- `shared/game/lifeJournalDates.ts`：原 Web 日期/月份/额度 helper 逐字提取，仅调整类型导入；Web 原路径继续重新导出。原日期测试只改读取位置，所有断言保留；基线检查验证提取内容和原断言逐字一致。
- `clients/cocos/tools/{test-life-records,smoke-life-records}.mjs`、`package.json`：确定性行为用例及真实浏览器流程。浏览器脚本只连接5443，数据库严格限制在`output/cocos-life/test.db`，从脚本位置定位仓库，异常也在finally清理。
- `sync.mjs`、`asset-bindings.json`、`.gitignore`、`docs/migration/cocos-baseline.json`与`check-baseline.mjs`登记新增纯模块及明确的兼容提取。

没有新增API、规则、迁移或素材；共享日期 helper 是唯一原 Web 实现提取，原路径/功能和测试全部保留。Cocos 原成长实现重构为独立模块，不删除原 React/Phaser 实现。原素材来源见`docs/art/asset-manifest.json`，本切片没有素材来源变更。

## 环境与复现

实际环境：Node22.23.2、Python3.14.6、Creator3.8.8，沿用npm锁文件与已安装依赖。仓库根目录执行（另标工作目录者除外）：

```sh
node clients/cocos/tools/sync.mjs
node clients/cocos/tools/test-life-records.mjs
node frontend/scripts/life-journal-dates.mjs
node clients/cocos/tools/test-core.mjs
node clients/cocos/tools/test-features.mjs
node clients/cocos/tools/check-baseline.mjs
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
REALQUEST_COCOS_BUILD=web-life-records COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/build.mjs web-desktop
# backend/：完整回归
.venv/bin/python -m pytest -q
# frontend/：独立输出目录，避免覆盖正在提供预览的 dist
npm run build -- --outDir ../output/cocos-life/web-build --emptyOutDir
```

隔离测试需要已生成的构建；以下启动器管理自己的API8143/静态代理5443，Ctrl+C停止其子进程。浏览器用例在另一个终端执行：

```sh
python3 clients/cocos/tools/run-preview.py --build web-life-records/web-desktop --port 5443 --api-port 8143 --database output/cocos-life/test.db
node clients/cocos/tools/smoke-life-records.mjs
# 等价 package 脚本，工作目录 clients/cocos/：
npm run test:life-records
npm run test:life-browser
```

浏览器每次新建独立游客，仅针对这个save ID准备历史、旧锻炼、18张历史/归档书页及70秒的暂停计时夹具。随后通过实际UI编辑/关联/归档/计时，核对API真实记录。准备历史与缩短等待不代表真实玩家已获得成长、不替代一小时的实际节奏验收。测试不访问`output/cocos-data/local-preview.db`或`backend/realquest.db`。

技能提供的帧客户端复制到忽略目录，适配既有Playwright与Cocos就绪/入口，截图使用浏览器合成结果，finally关闭浏览器；不注入虚拟时间。分别验证成长面板隔离方向输入与世界仍能移动。

## 验证结果与剩余范围

最终验证结果、实际截图和进程收尾记录在下方。证据保留于忽略目录`output/cocos-life/`。任务39的M3针对功能和本地Chromium检查关闭；V1–V7仍按各自条件验收，不将本切片截图标作玩家批准。

未验证：真实手机、Safari/其他目标浏览器、原生IME完整组合流程、屏幕阅读器与系统字体放大、线上缓存/弱网、长会话、发布与回退。Canvas 自绘按钮的可观察 ID 和焦点不是 DOM/ARIA 语义；完整可访问方案继续属于V5。没有新增账号、AI、跨库合并、离线奖励或旧锻炼成长。

## 实际验证结果 — 2026-10-17

- 官方Creator3.8.8独立`web-life-records/web-desktop`构建完成；80项来源绑定及实际引擎声明检查通过。共享记录筛选/归属/分页、原CST日期/跨年/闰年/领取日额度、17组共享客户端、feature/scene/cave辅助测试通过。
- 基线检查通过：393项原Web/美术/规则/迁移字节保护、7项既有共享提取、日期helper逐字语义与原日期测试全部断言保护。只对日期helper与测试输入路径新增明确提取登记，不放宽其他保护。
- 后端完整`pytest -q`：232通过，保留既有Starlette/httpx弃用提示。原Web类型检查和独立输出构建通过，保留既有大chunk提示，没有覆盖5430正在提供预览的产物。
- 真实Chromium主流程 **8组 / 72张截图**：日/月/状态历史与跨天当前约定、二次取消/保留、完成书页关联、422拒绝/重试、归档父计划与书页限制、同名ID、80字中文、计划默认目标/每日唯一ID、旧锻炼与完整备注、跨天原书页计时、提交后两次丢失响应并重载。整理/关联/只读前后资源/经验/三种成长点逐项核对；计时和手动活动只按原服务端规则产生记录。
- 1920×1080、1440×900、1024×768、844×390、740×360；DPR2真实触控、减少动态。检查44px控件边界/无重叠，执行触控书页归档取回、手动记录/关联、计时暂停结束、计划编辑/归档取回/翻页与焦点遍历。亲自检查关键桌面/横屏、长中文、日历、空/多页列表、完整备注、错误/确认、计时与计划截图。无意外页面或静态资源错误；注入422和已提交丢包单独列为预期。
- 收尾定向复核：初始Shift+Tab定位末项、正反向绕回、Enter进入与返回；同一上下文保留真实命令结果，换页/根标签清除旧经验/计时提示。三张最新截图确认新计划表单与关联页不携带旧奖励提示、本页实时计时仍可读。主流程后这两处小修单独复核；未把先前截图冒充最终细节截图。
- 技能提供的帧客户端在成长面板与世界各两轮短右移/等待：成长面板玩家坐标保持240/320，世界仍向右移动。保留真实服务器时间，无虚拟计时奖励。最终成长帧与收尾截图已检查，浏览器均由finally关闭。

主截图：[委托月份历史](../../output/cocos-life/contract-month-history.png)、[跨天约定](../../output/cocos-life/crossday-contract-desktop.png)、[横屏历史书页](../../output/cocos-life/study-history-740.png)、[80字中文主题](../../output/cocos-life/study-title-740.png)、[关联失败可重试](../../output/cocos-life/link-rejected.png)、[最终关联页](../../output/cocos-life/final-link-feedback.png)、[最终计时](../../output/cocos-life/final-running-book.png)、[横屏归档计划](../../output/cocos-life/touch-plan-archived.png)。`result.json`、`final-probe-result.json`、构建与浏览器日志、`frame/`/`frame-world/`保留于同目录。

## 手工预览与收尾

5442现有标签页刷新即可体验；启动器保留给用户手工测试：

```sh
./start.command --build web-life-records/web-desktop --port 5442 --api-port 8142 --database output/cocos-data/local-preview.db
```

本次先备份原手工库到`output/cocos-life/preview-before-life.db`，再将旧预览正常退出并换用新构建。数据库路径与浏览器origin不变；重启后逐行状态快照哈希完全一致（当时手工库0个游客，没有为改善画面伪造角色/记录）。不将隔离测试夹具带入手工库。启动器54485/API54488/代理54489（会话42337）保留，5442与API8142健康检查200。原Web5430/Cocos5431/API8130预览继续保留，全部根页/健康检查200。

已核实并正常退出旧手工启动器41219及其41222/41223、测试启动器45262及其45265/45266；测试5443/8143监听已关闭。所有本次浏览器、Node测试/帧/Creator包装器退出，临时适配器与定向探针源码在输出目录清理，仅保留证据。未关闭用户已有浏览器、共享工具宿主或其他预览。后续手工预览仍由其启动器负责退出子进程。
