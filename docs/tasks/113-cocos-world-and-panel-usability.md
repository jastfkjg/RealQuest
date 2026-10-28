# 世界、行囊与页面可用性 — 2026-10-21

用户授权：继续优化世界HUD、快捷栏语义，同时排查各页面/弹窗的溢出、数据展示感和交互问题。保留task112未提交成果、原数据库和Hearthwood素材。

计划：
1. 世界保留状态、一个目标、附近行动和直接成长入口；存档归旅程，村民按需找，移动教学在实际走过后收起。
2. 快捷栏明确查看/可用/耗尽/空位，保留旧引用与数量；新旅程不预填零库存材料。行囊自适应列数、弱化空槽，储物箱优先真实物品。
3. 检查桌面/窄桌面/短横屏实际页面与文本几何，修复确切越界和裁切；优先商店、制作、研习等日常操作页的独立构图，沿用共享材料。
4. 真实浏览器操作、截图和资源一致性回归；同版本预览交付并清理自有测试进程。

状态：实现、最终复核与清理完成，试玩服务保留供人工检查。视觉与体验待用户查看，不声明批准。未新增资产、后端规则或依赖。

## 实现与文件

- `Bootstrap.ts`：非战斗世界合并状态，移除常驻存档及三人头像；村民通过一个按钮/N打开已有寻找页，成长/L仍直接可达。附近没有对象时不再挂无用禁用提示。真实走过48世界单位后收起移动教学，偏好按存档隔离。短横屏以整体镜头把角色放在快捷栏上方，不缩放单个物件，不改世界坐标。
- `shared/game/inventory.ts`及生成的`core/inventory.ts`：仅新建偏好默认放种子，三个空位；已有偏好不覆写。`ui/inventory.ts`、`Bootstrap.ts`：逐格标识查看/可播种/已耗尽，空位可整理，旧耗尽引用可看详情/清空；稀疏行囊按物品数收短、动态列数分页，去掉重复空格图案。翻页有浅色底签。
- `ui/storage.ts`：目录按背包与箱子的实际持有并集展示，保持双容器数量与原存取命令；单页不显示无效分页。
- `ui/panels.ts`：商店短横屏保留物品图标，加减数量与真实缺额/交易后余额；非法数量/不足资金禁用确认。工坊用木板与现有材料说明下一步，研习页在短横屏也显示真实门槛。
- `ui/journeyMenu.ts`、`ui/dossier.ts`、`ui/life.ts`：长中文名完整换行且身份/点数/目录分区；世界存档入口迁到旅程中的“存档与备份”。成长空说明两行不裁切。
- `ui/questBoard.ts`：纸条三行完整，木板上的翻页文字有浅色底签。`ui/materials.ts`登记实际纸面边界；公共按钮两行行距与44px高度相容。
- `ui-layout-audit.mjs`从实际Cocos Label检查文字框/换行高度；`ui-navigation.mjs`测试真实旅程→存档路径。更新界面、行囊、邻里、对话、存档和场景测试以匹配新操作，保留资源/失败/重试断言。
- `asset-bindings.json`和来源清单仅同步共享快捷栏源码哈希。既有素材尺寸、来源及字节未变。

## 环境与验证

Node22.23.2/npm10、根package-lock、Python3.14项目venv、官方Creator3.8.8。Creator使用独立`output/cocos-sdk/usability-working.app`副本；主SDK保留。

- `npm run cocos:sync`、`npm run cocos:sources:write`、`COCOS_CREATOR=... npm run check`：123绑定、453来源、真实引擎类型通过。
- `npm test`：23组工具/共享规则与236后端用例通过，保留既有Starlette/httpx弃用警告。一次自动审批超时后按提示重试成功，不是测试失败。
- `COCOS_CREATOR=... REALQUEST_COCOS_BUILD=web-usability-final npm run cocos:build:release`及默认release：真实Creator成功。两份载荷317文件逐字节相同，见`output/cocos-usability/build-equality.json`。
- `npm run cocos:test:browser -- --build web-usability-final/web-desktop --suite interface-refresh,inventory --continue-on-failure`：`run-DoZMJk`通过5+12组，101+60截图。覆盖1920×1080、1440×900、1056×627/515、1024×768/600、844×390、740×360；实际Cocos文字、控件目标/不重叠、真实书页/行囊边界、长中文名与实际商品购买。此后仅补翻页浅底，最终复核见下。
- `run-IUuNt9`：横屏3、键盘语义11、对话3、播种确认4组通过（其行囊组曾检测到说明行距不足，已修正，不称整轮全绿）。
- `run-nJpUSP`：现实记录8、档案8、存档6、出发链5组通过（其界面长姓名、行囊旧默认断言曾失败，已修正，不称整轮全绿）。最终成长页身份排版已由`run-DoZMJk`重新实际检查。未重跑全部31套浏览器矩阵。
- `python3 output/cocos-usability/run-skill.py`：复用develop-web-game原动作客户端的既有生命周期/合成截图适配；最终构建动作、状态及已查看截图在`skill-delivery-check/`。首次重复运行因ready文件必须新建而退出，改用独立证据文件后成功，未修改玩家库。

检测/修复历史如实保留：`run-KCGiDG`的检查把短横屏纸面误认为书本叶；`run-POnTDM`为单独横屏通过（重复`--suite`只取最后一项，后续改逗号列表）；`run-RB6BMG`行囊旧测试试图清空已经为空的槽；`run-IUuNt9`发现快捷说明第三行裁切；`run-nJpUSP`发现长中文名挤压成长书页及旧默认断言。没有通过削弱资源、失败重试或存档隔离断言来隐藏问题。

## 试玩、数据与边界

新版默认试玩http://127.0.0.1:5443/，API8143，原`local-preview.db`与`realquest_cocos` cookie。切换前只读备份`output/cocos-backup/usability-preview-before/`，切换后全表哈希一致，2位玩家与455张回执不变，见`save-preservation.json`。

已核验旧试玩PID70746及API70749/代理70750归属后正常SIGINT退出。新试玩PID93533/API93536/代理93537保留供人工检查。测试均为独立QA数据库；地图位置、材料和长文本夹具明确属于测试准备，不代表玩家实际获得。物理设备、系统读屏与完整系统IME体验未据模拟事件宣称通过；手机竖屏仍不在范围。

本轮未提交、推送、部署或购买素材。Task112既有未提交改动保留。


## 最终交付证据

`run-vvMEFw`为最后翻页对比修正后的完整通过：界面5组/101截图、行囊12组/60截图，文本裁切/越界检查与控制台错误均为0。实际源指纹`0c3a163af714c20785fea199e3e881cf34c13a40cc188f7fd7655d212b4bfc3c`，载荷`d30cb2a23abc2826f944ea383130814a0fe7219179cf5d7a1888a7b2e77cd46e`。所有新构建的实际截图均为隔离QA数据；默认试玩载荷与该候选相同。

重点截图在`output/cocos-regression/run-vvMEFw/suites/`：
- `inventory/world-learned.png`、`world-740.png`：收敛HUD与短横屏角色可见区域。
- `inventory/starter-satchel.png`、`satchel-740.png`、`exhausted-reference.png`：稀疏行囊、图鉴分页和耗尽引用。
- `interface-refresh/shop-quantity-740.png`、`workbench-1440.png`、`spellbook-740.png`：具体物件、条件与操作。
- `interface-refresh/menu-1056.png`、`study-empty-1056.png`、`audit-journal-1024.png`：长中文名、真实书页和完整纸条。

截图已实际打开检查；录像在对应suite的video目录/`inventory-flow.webm`（以实际输出文件名为准）。Skill末次实际世界图为`output/cocos-usability/skill-delivery-check/shot-0.png`。

清理回执`output/cocos-usability/cleanup-final.json`核验121个自有测试/旧试玩PID已退出，无Creator工作进程；临时SDK副本删除，官方SDK保留。仅保留新版人工试玩PID93533及其API/代理，最终HTTP200。未创建node_repl或Playwright MCP宿主；共享工具进程与用户已有浏览器不作关闭。
