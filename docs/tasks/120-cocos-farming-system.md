# 完整种植体系 — 2026-10-22

用户要求：超过10种作物，所有种子商店可买，等级仅限制播种；每种独立种子、完整田间生长和背包收获物美术；自由开垦及买种→播种→收获→出售闭环，参考星露谷的经营结构，使用原创资产。

## 实施计划

1. 12作物统一目录；沿用技能点与无限可扩的种植等级，首批作物0–5级。所有购买开放，服务端校验播种等级、位置、库存、体力与田地。
2. 原6田稳定ID、家园可耕网格自主选择位置；保留道路/树木/河流与设施。家园1/2/3级分别18/30/42田上限。开垦4金币+木石各1+4体力，恢复空田不返材料。
3. 新作物按唯一游戏时钟生长，睡眠/短休/昏倒推进，离线与Life暂停；成熟不枯萎，每轮可选一次浇水缩短10%。旧作物保留原现实到期和一次留种。原种子/收获物ID seed/crop保持。
4. 3张原创内置image_gen透明源表，每表4作物×6列；每种种子/初芽/幼苗/生长/成熟/背包产物，共72运行时图。保留原图、提示词、确定性切片脚本与哈希。
5. Cocos商店等级说明、耕作手记、世界网格、快捷播种、背包/储物/出售接入；保留任务119的行囊材质改动。独立Creator工作副本与构建目录，隔离QA库验证，不动原试玩数据。
6. 规则、失败重试/并发与旧存档、实际桌面/短横屏浏览器交互、美术与控制台检查；完成后关闭本任务自动化资源，保留明确交付的试玩。

## 数值和范围

权威目录为backend/app/crops.json，tools/generate_crop_catalog.py生成共享TypeScript目录，Cocos sync分发。种植等级沿用每次升级花目标等级技能点，不新增刷菜发技能点。基础作物首熟0.5–1.5游戏日，高级2–4日；番茄/草莓3轮、玉米/茄子2轮、蓝莓4轮，其他单轮。家园2级25%加速保留；售价沿用工坊每级+1。详见目录。没有季节死亡/病虫害/新增货币/AI/平台接入。

## 当前验证

进行中。所有图片与真实构建仍属候选，未标记玩家视觉认可。实际命令、失败修正、截图、数据和清理在完成时追加。


## 已完成实现与美术

- 后端：`backend/app/crops.json`为12作物权威目录；`farming.py`负责土地、等级、体力、成熟/浇水/再生/收获，`rules.py`接回原玩家锁与请求回执；`market.py`开放全部购种/作物出售；`world.py`提供原6田+43合法新位置，`main.py`投影真实种植状态。JSON存档增补不需SQL迁移，不修改原玩家库。
- 共享规则：`cropCatalog.ts`由`tools/generate_crop_catalog.py`生成，sync自动运行生成；`farming.ts`统一土地表现/四阶段/时间推导，items/inventory/interaction/navigation/places/protocol/client接入真实物品、远程标记、快捷播种、地图和跨日动作保护。
- 客户端：`ui/farming.ts`为原生耕作手记；Bootstrap提供世界网格、点击走近、动态图形/生长图和全部种子快捷使用；shop显示购买与播种门槛区别，dossier显示下一档种子。背包/储物/出售沿用实际数量与原布局，保留任务119全部材质与可读性修改。
- 美术：内置image_gen原创新增3张源表及3份精确提示词，`assets/generated/hearthwood/farming-v1/`；`assets/derived/farming-v1/`72个不同哈希PNG，538,717字节，物品64px/植物96px，源图不入包。`docs/art/farming-art-v1.json`记录测得裁切、alpha处理、最大连接植物去邻格碎片、尺寸、源/衍生/脚本/提示词哈希。原seed/crop图片保留，只更新Cocos表现绑定。未下载/复制第三方图、字体或付费资源。
- 工具：原SVG物品渲染器支持新增模块导入；来源图谱追踪作物目录/生成器/新美术；浏览器快照同时锁定后端Python与JSON定义。

## 已执行检查和修正

- `npm test`：24组工具/共享单元全部通过；后端272项通过（含12项种植，覆盖12种各轮产销、等级拒绝、开垦/容量/恢复、离线/睡眠/浇水、旧作物、同回执重放与不同请求并发的恰好一次结算）。既有Starlette弃用警告仍在。
- `npm run cocos:check`（官方Creator3.8.8声明）：196绑定、613来源文件及严格引擎类型通过；release构建使用独立`output/cocos-sdk/farming-120.app`工作副本与`web-farming-120/web-desktop`，不执行只读原SDK。
- `npm run cocos:art:check`：7张原场景图/76完整输入与9个原SVG物品核验通过；运行时场景像素未改。`.../dependencies/python/bin/python3 tools/build_farming_art.py --check`：72图逐字节重建一致。
- 技能提供的frame client以最小适配执行：真实Cocos登记等待、BrowserServer/PID归属与finally关闭、WebGL实际page截图。2轮左右移动/释放和render_game_to_text通过，实际图已打开检查，browser-cleanup.json证明PID37978正常退出。未使用测试时间钩子推进权威生产/奖励时钟。

中间失败均保留，没有冒算通过：首次pytest工作目录错误后改用backend工作目录；新增图片的Creator首次导入改变meta导致构建回执拒绝，随后真实重建；目录/美术更新时旧来源/旧绑定核验拒绝，生成器重建并重新sync后通过；新增套件数和白萝卜命名替代旧固定期望；发现背包远程种子标记错误并修复；实际截图发现邻格碎片及0库存目录参考图问题后修正；原frame client读WebGL丢弃帧缓冲得到黑图，改用真实page截图后通过。与任务119并行的最后两行文字对比修正使旧包被来源检查拒绝，已合并真实重建。后续为修正种子到种植分支的入口，主动SIGINT停止run-am8Fgc并验证finally清理，保留取消记录，不计最终回归。


## 最终验证、截图与交付

最终成本/空田修正后的真实包：`output/cocos-regression/run-c6OrOd/result.json` **complete:true**，farming 6组、inventory-preview 4组、landscape 3组、places 8组，共21组。此前`run-87oUam`的完整inventory 12组及dossier 8组也已通过；最后改动只涉及耕作成本说明/恢复确认、0田计数和地图测试对未开垦网格的分类，相关四套已在最终包重跑。六类相关回归合计41组公开行为检查，不把早期失败或取消轮计为通过。地图首轮仍把所有未开垦格当成设施，是旧断言；已改为保留全部真实服务/资源/已开垦田地，而未开垦土地通过耕作网格选择。

最终补齐快捷播种2体力、世界收获1体力与恢复草地2体力/材料不返还的明确报价；恢复确认独立展示“保留田地/确认恢复”，断线仍可重连。空田计数使用真实0而非默认6。实际恢复报价、0田庭院、桌面与740横屏已打开检查。

- 美术总览：`output/farming-120/art-contact.png`，逐张查看原表及衍生图，无邻格碎片，72张不同哈希。
- 实际种植截图：`output/cocos-regression/run-c6OrOd/suites/farming/`下`garden-stage-1/2/3/4.png`、`shop-all-seeds-purchasable.png`、`grade-gated.png`、`seed-opens-planting-growth.png`、`free-till.png`、`watered-sprout.png`、`harvest-sale.png`、`restore-cost-quote.png`、`zero-field-yard.png`及`farm-1920/1024/844/740.png`。12作物同时展示与阶段时钟属于明确的隔离视觉夹具，不代表玩家自然获得。实际购买、费用拒绝、丢回包播种、浇水、床铺睡眠、收获和出售由真实服务端命令验证；位置/初始资金准备只在受test_guard保护的QA库中进行。
- 流程录像：最终farming目录的`video/`，其他套件有各自录像；屏幕尺寸1440×900、1920×1080、1024×768、844×390、740×360，DPR2触控/减动态与键盘/IME隔离沿用真实测试。
- 最终frame循环：`output/farming-120/frame-final/`两轮实际page捕获/状态，无控制台错误；浏览器PID48591正常退出。临时5462/API8162及其launcher/API/proxy均已停止。
- 最终严格类型、613来源/196绑定、原场景/SVG及72图确定性核验、`git diff --check`通过。完整原始证据与源/载荷指纹见`output/farming-120/verification.json`。

默认`clients/cocos/web-current/web-desktop`已与最终候选逐字节核对，旧默认包保留在`output/farming-120/previous-default/`；复制前确认没有预览使用默认目录。新人工试玩为 **http://127.0.0.1:5452/**、API8152，独立新库`output/farming-120/manual-preview.db`、cookie `realquest_farming120`，launcher49889/API49893/proxy49894（session90307），健康检查通过。已请求在当前聊天浏览器面板打开，桌面端返回queued。它是正常新档，未塞入QA财物/等级。

清理核验：96个已记录的本任务自动化浏览器/测试/启动器/API/proxy/最终npm进程均已退出；生命周期与子进程证据在各run报告、frame-cleanup及verification.json。仅保留5452人工试玩和其三个Python进程。自己的Creator工作副本与独立user-data缓存已删除，官方SDK保留。未操作其他聊天的预览；最终核验时原5448端口已经不再监听，原因未归因于本任务，也没有擅自重启。原玩家数据库从未被本任务读写或重置。

已完成本次要求的工程与本地验收；实际美术/手感/经济数值仍待玩家试玩反馈，物理移动设备、Safari、长期运行与正式服务器/PostgreSQL负载未作为本次通过项。未提交、推送或部署。
