# Cocos HUD 与行囊拖放（任务115）

2026-10-22。用户指出状态/任务区与右上入口不够美观，并要求背包和物品支持拖动放置或整理。本次范围为世界HUD与行囊整理链；视觉候选待玩家体验，不继承其他页面的实际渲染批准。

## 已实现

- 状态区沿用苔绿布面、细木边与缝线；地点、真实金币、生命/体力条和时间/连接分层。任务纸笺收敛大面积主按钮，详情与标记仍是两个明确操作。
- 旅程、行囊、成长、找村民合为右上单行工具栏，保留原入口、快捷键、原生语义和焦点；集中面板仍隐藏世界HUD。
- 拖动行囊标题移动整个布袋及物品签，边缘钳制在视口内；点击标题也可用四向按钮和居中操作调整。
- 实际持有物品可拖入安静空格，拖到已占格交换；拖到四格口袋安排快捷引用，口袋之间交换，拖回物品格移除快捷引用。拖放不消费物品、发奖或请求经济命令。
- 手势阈值、浮影、落点描边与按下期间保留源控件；无效落点取消。失焦、缩放、模式变更、销毁取消。Cocos3.8.8会把源控件外的松手改为节点CANCEL，用保留的原始事件码区分真实取消和松手。
- 排列、四格与位置是按saveId隔离的可选本机偏好；原v2偏好无新增字段也可读取。校验未知/重复ID、越界位置与存储失败，数量仍读服务器。原点按分配/清空保留，另有前后移动物品入口，拖拽不是唯一操作。

## 来源与实际文件

没有新增图片、字体、音频、外部包或生成服务，没有改写源美术、物品ID、经济/播种规则或玩家数据。使用现有行囊、金币与物品PNG，新增外观由原生Graphics/Label绘制。

手写实现：`clients/cocos/assets/scripts/Bootstrap.ts`、`ui/inventory.ts`、`ui/panels.ts`、新`ui/drag.ts`及meta、`shared/game/inventory.ts`。生成源：`core/inventory.ts`与绑定/来源清单。验证：`test-inventory.mjs`、新`smoke-hud-drag.mjs`、`smoke-semantics.mjs`的实际可访问名称焦点核对与`tools/cocos-browser-suites.mjs`的独立套件登记。设计与本报告记录范围，不记录玩家批准。

## 隔离与环境

同工作区另一个活动聊天正在实现账号登录，涉及Bootstrap、共享客户端、后端迁移与清单。用户明确允许协调，已向该聊天告知修改范围。保留其全部改动；本任务先以HEAD加上述界面文件建立`output/cocos-hud-drag-115/source`独立工程，使用原HEAD后端、独立QA库/端口/浏览器和`web-hud-drag-115/web-desktop`候选，避免把半成品账号变更算作本界面的验收。

使用锁定Node22.23.2/npm10、根node_modules、backend/.venv与官方Creator3.8.8工作副本`output/cocos-sdk/task115-working.app`。未新装依赖、提交、推送或部署；原5443/8143玩家试玩未停止或改库。

## 验证记录

- 相关3个单元模块（core、inventory、preferences）通过：`node tools/cocos-unit.mjs --only inventory,core,preferences --report output/hud-drag-unit.json`（隔离工程）。新偏好断言覆盖空格/交换、四格、刷新/跨旅程隔离、脏字段净化和权威数量不变。
- `node clients/cocos/tools/sync.mjs`、`node tools/cocos-sources.mjs --write`、`COCOS_CREATOR=... node clients/cocos/tools/check.mjs`通过124绑定与真实引擎严格类型。
- `REALQUEST_COCOS_BUILD=web-hud-drag-115 COCOS_USER_DATA=/private/tmp/realquest-cocos-task115 COCOS_CREATOR=... node clients/cocos/tools/build.mjs web-desktop --release`真实构建成功；release/debug/sourceMaps/MD5及载荷回执由现有工具核验。
- 首轮run-nEHfNV明确失败：全局输入被Cocos控件吞掉，没有真实拖动。检查本机3.8.8引擎分发代码后接入源节点MOVE/END/CANCEL，保留原失败证据。
- run-25gyHC新增7组真实浏览器检查全部通过：跨时钟拖放、占格交换、四格与拖回、无效落点、位置/排列/快捷刷新、blur取消、点按替代、桌面/横屏、DPR2减动态触控。随后收紧任务笺的点击区域。run-t1yW3i的拖放7组、背包12组、物品预览4组和目标引导8组通过；该整轮因语义套件仍用旧按钮caption核对aria名称而失败，未标记整轮通过。

## 边界

鼠标与模拟触控不等于物理手机、系统读屏/Safari验收；手机竖屏不在范围。本任务没有修改后端逻辑，未将另一聊天的账号测试或迁移当作本任务完成。当前工程验证与最终实际观感分开记录。

## 最终交付与复验（19:03 CST）

- 恢复真实`InventoryTitle`原生文字，避免可拖动标题丢失行囊对话框名称；大额金币显示万/亿，语义保留完整数值；禁用导航有明确文字状态；图鉴不接受拖回物品格。最后差异保存在`output/cocos-hud-drag-115/final-polish.patch`，没有覆盖另一聊天的账号段落。
- 最终真实构建为隔离工程`web-hud-drag-115-final/web-desktop`。run-s2YjJw **complete:true，3套30组**：拖放7、原生键盘/焦点11、原背包/数量一致性12；零意外页面/控制台错误。最终相关3个单元模块及套件注册/配置单元均通过。任务笺/标记和物品确认另有收尾前4+8组证据，其核心流程未在最后样式修正中变化；不伪称它们与最终3套是同一整轮。
- 根工作区（含另一个聊天的当前账号代码）最终来源与真实引擎类型检查也通过：124绑定、459来源文件。此次并未把独立候选称作账号功能整体验收；账号聊天继续其验证与默认包合并。
- 实际打开检查最终桌面HUD、拖拽浮影/落点、移动后的行囊、DPR2触控与短横屏画面。代表截图为`output/playwright/hud-drag-115/`，录像在最终hud-drag套件的`video/`及inventory套件；构建日志为`output/cocos-hud-drag-115/build-final.log`。详细源码比对及回执路径在`output/cocos-hud-drag-115/validation.json`。
- 人工试玩保留 **http://127.0.0.1:5448/**（API8148，独立预览库，session28398；launcher92685/API92697/proxy92698），最终ready文件记录真实包/库/子PID。已向当前聊天排队打开预览标签供人工使用。默认5443/8143原试玩仍健康，本任务没有操作其玩家数据。
- `cleanup.json`核验本轮57个控制器/浏览器/API/代理/旧试玩PID均退出，全部自动化浏览器关闭；闲置SDK工作副本与专用Creator临时目录已删除，原签名SDK保留。共享或无法归属的MCP/Node宿主与另一个活动账号任务保留，未批量结束。最终5448试玩和标签因人工体验需要保留，用户完成后再清理。

实际构建、回归、截图不等于玩家视觉批准；物理设备、Safari/系统读屏和竖屏仍按前述边界记录。
