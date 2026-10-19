# Cocos 数据管理与旧旅程接续

2026-10-17。用户授权按任务39推进，先完成数据管理和原Web存档接续；本切片不删除原Web代码、不切换默认部署、不迁移玩家数据库。

## 范围与实现

沿用现有「存档」入口，分为「接续与凭证」「数据管理」。继续使用既有Hearthwood颜色、系统中文字体和Cocos原生控件；没有新增图片、字体、音频或外部依赖。

- **完整数据导出**：下载现有`GET /api/export`返回的真实存档和结算流水（`realquest-save.json`）。与`realquest-recovery.json`旅程凭证分别命名和说明；完整数值JSON不接受为恢复凭证。导出等待已排队请求，拒绝未确认写入和并发身份切换。
- **明确删除**：先展示当前旅程名称/短ID，点击删除后再次说明角色、活动、计时、世界、流水和全部会话/凭证失效范围，提供取消与最终确认。删除仅授权当前Bearer对应、且save ID一致的旅程；不使用另一个原Web Cookie，也不清除它。
- **删除响应丢失**：发送前持久保存请求ID，服务端在删除事务中保存最小确认回执（token哈希、request ID、save ID、时间，无明文凭证或玩法数据）。刷新只重试这个请求；成功确认后清理该旅程本机状态，回欢迎页，明确点击开始才会新建旅程。已明确拒绝的4xx保留旅程并允许取消/恢复，不能永久卡在待删除状态。其他旅程/无关存储不清理。
- **现有凭证接续**：保留文件预览/取消/确认流程；切换离开已有旅程前，必须下载它的凭证并主动确认已保存。欢迎页直接选择接续也会先读取已有Cocos会话，不能绕过备份检查。无效、数值导出、其他服务器凭证报错但不替换当前旅程。
- **同浏览器原Web接续**：显式点击查找，通过原Cookie只读查询已登记旅程，预览姓名/短ID/计划与记录，再确认交换Cocos会话；不创建角色、不更换原Web Cookie。服务端核对预览的save ID，Cookie切换后须重新查找。没有Cookie、Cookie失效或连接另一数据库时，提示去原Web导出凭证并连接同一服务器。
- **同库约束**：凭证识别的是该服务器已有存档，不搬运数据库；独立本地小样不能读取`backend/realquest.db`里的玩家。此切片提供接续能力及隔离证据，不代表已完成真实玩家迁移。

新增API：`POST /api/client-from-web`（仅Cookie、显式save ID）；`POST /api/client-delete`（仅Bearer、显式save ID和幂等request ID）。原`/api/session`、`/api/recover`、`/api/client-recover`、`/api/export`行为保留，原Web源代码不变。

新增Alembic **003**，仅创建`client_deletions`确认回执表；001/002不修改。迁移用例先写入001旧JSON/流水，再写入002凭证与会话，最后两次升到head，确认原记录原样保留。未执行玩家数据库迁移；正常启动器会按既有流程升级指定数据库，实际发布另行授权。

## 改动文件

- `shared/game/client.ts`：数据操作与持久删除意图、查找/接续原Cookie旅程、token与save ID双重会话保护、恢复的迟到响应防串档。
- `clients/cocos/assets/scripts/{Bootstrap,platform}.ts`：存档面板、下载/确认/取消/重试、本机相应会话/待确认记录清理；`core/client.ts`由同步脚本生成，`asset-bindings.json`记录新哈希。
- `backend/app/{main,models}.py`、`backend/migrations/versions/003_client_deletions.py`：明确接续与幂等删除API、最小回执。
- `backend/tests/{test_client_data,test_migrations}.py`、`clients/cocos/tools/{test-core,smoke-data,check-baseline}.mjs`：隔离行为验证与保护合同。
- `clients/cocos/tools/run-preview.py`支持`--build`选择现有独立构建；默认路径不变。`clients/cocos/.gitignore`排除本切片构建。
- `docs/migration/cocos-baseline.json`：登记本次API/回执扩展，`models.py`原定义必须逐字节保留为前缀；没有取消原Web、规则、美术和原迁移的保护。

## 环境与复现

沿用Node22.23.2、Python3.14.6、npm/package-lock、Creator3.8.8及现有依赖。所有命令从仓库根目录运行，另标工作目录者除外。

```sh
node clients/cocos/tools/sync.mjs
node clients/cocos/tools/test-core.mjs
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
node clients/cocos/tools/check-baseline.mjs
REALQUEST_COCOS_BUILD=web-data-management COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/build.mjs web-desktop
# backend/：完整后端回归；之后因补强迁移断言单独重跑迁移测试
.venv/bin/python -m pytest -q
.venv/bin/python -m pytest -q tests/test_migrations.py
# frontend/：原Web类型检查和构建
npm run build
```

浏览器用例仅连接API8141 / Cocos5441、Cookie `realquest_data_test`、`output/cocos-data/test.db`和`clients/cocos/web-data-management/web-desktop`；脚本拒绝其他URL，不将测试删除指向手工预览或玩家库。先在`backend/`执行：

```sh
DATABASE_URL="sqlite:////absolute/path/to/RealQuest/output/cocos-data/test.db" .venv/bin/alembic upgrade head
DATABASE_URL="sqlite:////absolute/path/to/RealQuest/output/cocos-data/test.db" SESSION_COOKIE_NAME=realquest_data_test ALLOWED_ORIGINS=http://127.0.0.1:5441 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8141
```

其他终端从根目录运行代理及测试：

```sh
python3 clients/cocos/tools/serve.py --port 5441 --api-port 8141 --build web-data-management/web-desktop
node clients/cocos/tools/smoke-data.mjs
```

用例通过原Web API创建独立Cookie游客/真实计划与活动，再经实际Cocos UI接续、下载、确认/取消和删除；仅测试创建的游客被删除。它不是对真实玩家存档的迁移操作。

技能提供的帧客户端复制到忽略目录，适配本地Playwright路径、实际Cocos就绪/进入/数据面板和finally清理；保留服务器真实时间，不使用虚拟时间推进奖励。两次短右移/等待输入验证打开面板时世界输入被隔离，截图使用真实Canvas/页面。临时适配器不作为新的业务客户端。

## 验收与限制

最终命令结果、截图检查和进程收尾在本节下方记录。任务39中M2可按本切片的行为证据关闭；V1仍需覆盖更全面的历史存档样本和实际目标部署环境，不能因隔离游客接续通过而整项勾选。功能保留不等于玩家已经接受画面。

本次没有新增玩法/奖励、账号/AI/平台登录、离线游玩或跨库合并。物理设备、Safari、屏幕阅读器/原生文字缩放、PostgreSQL实机并发和线上HTTPS/缓存/切换回退仍不由本次Chromium与SQLite用例认证。手机竖屏不在本切片范围。

## 实际验证结果 — 2026-10-17

- 完整后端`pytest -q`：**232通过**，现有Starlette/httpx弃用提示保留；补强001→002→003记录保留断言后，迁移测试再次通过。没有运行玩家库迁移。
- 共享核心：**17组通过**，包括持久重试、失效鉴权、存储拒绝、导出期间切换、删除明确拒绝/待确认/重载、旧Cookie接续和恢复迟到响应保护。平台存储用例确认只清理匹配旅程，保留其他outbox/无关偏好。
- 官方Creator3.8.8真实Web构建、**78项绑定及实际引擎声明检查通过**；**395项原Web/美术/规则/迁移保护与7项共享提取语义检查通过**。原模型定义按字节前缀保护，003只新增表。原Web类型检查/构建通过，保留既有大chunk提示。
- Chromium主用例**7组/20张截图**：真实文件下载、备份后的主动确认、欢迎页直接恢复检查、两向接续、取消、401/404凭证错误、导出失败再试、删除回包丢失后重载确认及真实触控最终删除。删除仅针对本次创建的隔离游客；原Web Cookie对应其他旅程保持可访问，同一被删旅程的其他会话/凭证均失效。
- 桌面1920×1080、1440×900、1024×768和横屏844×390、740×360；DPR2触控/减少动态。检查控件边界、无重叠及44px目标，亲自打开检查数据页、失败、凭证预览/备份、删除确认、待确认、刷新后的明确动作及完成提示。**无意外页面/静态资源错误**；无Cookie401、无效凭证404、注入503和提交后丢包是用例预期。
- 额外下载返回探针在200/600/1200ms捕获失败页。发现立即detach已安排销毁的旧UI会短暂把缓存几何绘在错误位置；改为停用/改名旧节点并保留父级到Cocos延迟销毁完成。200ms实际截图已正常；没有以等待一秒来掩盖错位。此生命周期修正不改服务器或世界坐标。
- 技能帧脚本在数据面板与正常世界各运行两次短输入；真实时间保持不变，数据面板不移动角色，世界移动仍工作。最初Canvas `toDataURL`得到非持久WebGL黑图，改用浏览器合成截图后重新检查，不把黑图当视觉通过。

证据在忽略目录`output/cocos-data/`：`result.json`、构建/回归日志、`frame/`、`frame-world/`、下载返回探针和20张主流程截图。测试临时凭证下载文件在finally删除，不在测试报告/渲染钩子中输出任何token或recovery key。主截图示例：[数据管理](../../output/cocos-data/data-740.png)、[确认删除](../../output/cocos-data/delete-740.png)、[删除结果待确认](../../output/cocos-data/delete-uncertain.png)、[刷新后的明确动作](../../output/cocos-data/delete-retry-welcome.png)。


## 收尾与人工预览

- 保留 **Cocos http://127.0.0.1:5442**、API8142，用于玩家手工验收；启动器41220、API41222、代理41223，exec会话14886。使用`output/cocos-data/local-preview.db`，与测试库/玩家库分离；根页、代理health及直连health均200。启动方式为上文`--build web-data-management/web-desktop`的新参数；默认入口/发布链没有切换。
- 原Web5430、Cocos5431、API8130仍返回200，旧预览/存档保留。原Web回归构建已运行；没有改它的业务源码，也没有替换原Cocos手工构建。
- 初始测试API34233（后换35632）及代理34247、最终finally托管40976/40977和各独立探针API/代理均已退出；测试端口5441/8141已核验关闭。两次临时手工启动器37919、38626及子服务在重建前正常退出，原示例库保留后再次启动最终版本。
- 自动化浏览器全部通过finally关闭；已结束的Node/Creator/帧/探针启动器没有残留。临时脚本适配器已移除，截图/JSON/日志保留。未按名称批量清理进程；不可归属的共享工具宿主和用户原有资源保留。
- `git diff --check`、67处本地文档链接检查通过。任务39的M2关闭；V1/V7、物理平台及玩家画面确认仍开放。没有提交、推送、部署或真实玩家迁移。
