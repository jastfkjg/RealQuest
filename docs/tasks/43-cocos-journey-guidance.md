# Cocos 当前目标与旅途手记

2026-10-17。任务39的M4切片。沿用原Web初探、再出发和归来判断，接到原生Cocos界面；原Web、服务器规则、存档和其他未提交修改保留。完整目标仍含M5–M7/M9、T1–T6、V1–V7，不因本切片完成而关闭。没有提交、推送或部署。

## 实现链与边界

- 世界HUD常驻当前目标、真实检查项/计数、查看详情、明确标记与收起恢复。优先级沿用初探→再出发→当前委托；手动追踪支线拥有优先权。引导创建的标记随步骤结束清理，独立地图标记保留。洞穴使用单个小入口，避开战斗控件。
- 旅程菜单可重新打开指南，分行走、家园、洞穴、记录接续、初探进度。展示实际Cocos快捷键、现实计时与游戏时钟的边界；引导开关发送已有`intro_toggle`，不丢服务器进度。
- 告示板、武备台、洞穴与石门有初探入口。到告示板/石门明确确认条件，按现有规则接取远行信或`intro_brief`；清理首层并回工坊后，到武备台确认`intro_review`。远程只提供标记，不替代到场。短屏读完说明才可确认。
- 再出发手记分整备、洞穴、成长三个书签，显示真实装备/材料/图纸、已探索深度/永久通路、当前现实约定与知识点/魔法等级。比较只读；后续行为分别打开现有装备/档案/成长记录、选择魔法报价或标记诺亚/武备台/洞口/石门。领取、花点、购买、启门仍需原有明确确认。
- 归来提示只占HUD原目标位置，不打开弹窗或改变当前面板。每个save ID独立保存可选的收起/离开摘要；仅成功的前台服务器读取可生成提示。后台刷新和失败读取不消耗离开时间，支线追踪、引导收起、石门完成或HUD折叠保持安静。可选本机存储失败不妨碍原存档游玩；删除只清理对应save的偏好。
- 前后台统一清理移动/战斗输入，成功归来刷新后清理同一次连接错误。阅读指南/成长面板暂停游戏，真实约定/研习计时仍按服务器时间继续。

没有新增API、迁移、奖励、图纸、依赖或图片/字体/音频。所有素材沿用`docs/art/asset-manifest.json`现有来源。武备列表翻页在本切片一并提高到44px，并保留列表与翻页间距。

## 文件

- `shared/game/nextDeparture.ts`：原实现逐字提取，只调整类型导入；原Web路径重新导出，原测试只改读取位置。基线检查逐字核对实现和原断言。
- `shared/game/guidance.ts`、`continuation.ts`：只读目标描述/现场判定和可选存档偏好；按既有`sync.mjs`生成Cocos core副本。
- `clients/cocos/assets/scripts/ui/guidance.ts`：指南/目标/初探/三书签/比较；`ui/panels.ts`委派并保留原现场操作，`ui/life.ts`提供学习/当前约定直达。
- `Bootstrap.ts`、`platform.ts`：HUD、标记归属、焦点/可见性、确认后归来读取、对应存档偏好清理；不接管权威进度。
- `tools/test-guidance.mjs`、`smoke-guidance.mjs`、`package.json`、同步/基线元数据与文档。

## 环境与复现

Node22.23.2、Python3.14.6、官方Creator3.8.8，沿用npm锁文件和已安装依赖。根目录执行：

```sh
node clients/cocos/tools/sync.mjs
node clients/cocos/tools/test-guidance.mjs
node frontend/scripts/next-departure-state.mjs
node clients/cocos/tools/test-core.mjs
node clients/cocos/tools/test-life-records.mjs
node clients/cocos/tools/check-baseline.mjs
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
REALQUEST_COCOS_BUILD=web-guidance COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/build.mjs web-desktop
python3 clients/cocos/tools/run-preview.py --build web-guidance/web-desktop --port 5445 --api-port 8145 --database output/cocos-guidance/test.db
# 另一个终端；必须使用上述隔离数据库/端口：
node clients/cocos/tools/smoke-guidance.mjs
```

`backend/`执行`.venv/bin/python -m pytest -q`；`frontend/`执行`npm run build -- --outDir ../output/cocos-guidance/web-build --emptyOutDir`，避免覆盖既有手工预览。Cocos目录提供`npm run test:guidance`及`test:guidance-browser`。

浏览器脚本从脚本目录定位仓库，强制5445和`output/cocos-guidance/test.db`，只准备自己新建游客。安家/采集/回礼、购买/装备、首层全血敌人战斗/材料/初探标志实际执行；只预置洞口/工坊的长距离接近。后续支线、两知识点、进行中/到期约定、守卫首胜/魔法石/魔法3及旧通路是明确的UI条件夹具；不能以此宣称自然完成全部成长或真实等待三小时。归来仅在会话接续前调整本机可选摘要时间；正常pagehide会保存当前摘要，测试不绕过此行为。所有浏览器/上下文在finally关闭。

本环境Chromium（有头和无头）对每个标签都返回`document.hidden=false`与`document.hasFocus()=true`，关闭聚焦模拟也没有恢复真实标签语义。因此归来重试使用独立第二页、延迟初始resume响应与受控window blur/focus事件，验证事件处理、16秒保持、失败读取与重试、不抢已有指南面板。该证据不等同实际系统后台/标签可见性；物理设备/目标浏览器检查继续开放。

## 验证状态

本地候选验证完成，证据目录`output/cocos-guidance/`：

- 官方Creator3.8.8真实Web构建、84源绑定与真实类型检查通过。`build-info.json`记录源码与产物SHA256。无额外素材，目标文字深色底与纸白字的纯色对比为9.70:1。
- 391份受保护Web/素材/规则/迁移原文件、7份原共享提取、日期与再出发实现/原测试断言保护通过。新guidance/continuation行为、原再出发策略、17组核心、Life记录及feature/local-scene/cave检查通过。
- 232后端测试通过（既有1项warning）；原Web独立类型/构建通过（既有大chunk提示），未覆盖原预览dist。
- 完整浏览器8组/79张截图通过，无意外浏览器错误。实际初探链、拒绝/已提交丢包重放、五视口所有指南/书签/比较分页与44px目标、收起持久化、受控前后台重试、手动支线/独立标记、原约定历史/显式研修/到场结算/启门及旧通路均有结果。错误注入单独记录，不当成真实服务故障。证据：`result.json`、`final-browser.log`、`guidance-flow.webm`。
- 在本候选族上重跑任务41现实历史/学习整理：8组/72张截图通过，无意外错误；涵盖同日关联/归档/长中文/跨天计时、未知结果恢复、DPR2真实触屏与键盘。脚本仅适配5445和当前隔离库/证据目录；结果位于`life-regression/`。
- 供应技能帧客户端按既有方式适配Cocos就绪、真实服务器时间、合成截图及finally清理，指南与世界各2次动作突发通过：指南不移动、世界正常移动，无console错误。对应`frame/`与`frame-world/`，代表截图已实际打开检查。

桌面1920×1080/1440×900/1024×768、横屏844×390/740×360及DPR2触屏都有证据。实际检查代表性指南、当前目标、短屏比较、约定详情、魔法报价、归来重试、旧通路及任务41整理书页截图；不把截图存在当成全部像素通过。最后只增加桌面标记文字深底，另以4组/10张定向流程复核该读数层与原有导航/成长链（`final-marker.log`、`remainder-result.json`），84绑定/类型与差异检查再次通过。

物理设备、Safari/其他目标浏览器、系统IME/读屏器/原生缩放、长时间节奏、玩家画面/手感批准、PostgreSQL与发布/回退仍属任务39对应V/T项，未在本切片通过。未删除原Web或迁移玩家数据库。

## 交接与清理

手工预览继续使用`http://127.0.0.1:5442`、API8142和原`output/cocos-data/local-preview.db`；只把构建从`web-dossier`更新为`web-guidance`。切换前SQLite只读备份为`output/cocos-guidance/preview-before-guidance-145811.db`，前后玩家行数均为0、原始行SHA256一致。`handoff-before.json`、`handoff-result.json`记录备份、哈希和健康结果；不以空样本声称真实玩家迁移通过。

保留launcher73229/API73231/代理73232，session85722，供玩家刷新预览。原5430/5431/API8130及launcher21626保留。六个根页/health检查均200。旧手工63424/63426–63427及测试66678/66680–66681正常退出，5445/8145已关闭；本次浏览器、Node测试/帧/诊断、Creator进程均退出，五个临时适配脚本已移除，正式测试脚本与结果/截图/录像保留。无法归属的共享应用工具未关闭。不提交、推送、发布或删除原源码。
