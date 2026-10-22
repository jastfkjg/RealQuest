# Cocos 行囊减法与材质修正（任务119）

2026-10-22。用户指出任务118实际画面与概念仍不一致，要求去掉“移出口袋”“随身物品”与金币显示，修正突兀关闭入口。

## 本次计划

视觉：沿用苔绿布袋、木牌与亚麻物品签，让真实物品成为视觉重点。结构：标题下直接放物品格，下方一条轻提示，四个缝线口袋与一个整理入口；点物品才出现短签。交互：拖动保持原位置和落点反馈，按钮有悬停/按下/焦点，减动态遵循原设置。

1. 删除行囊钱袋/分类/移出按钮，重排留白，复用原木板和纸页资产；关闭入口改为44px皮扣样式，中文与图标均为原生绘制。
2. 用口袋本身完成点按放入/收回，拖回物品区仍可移除；保留排序箭头、标题位置调整、用途来源和旧偏好显式导入，不动服务器数量或用户自选格位。
3. 实际Creator3.8.8构建、类型与相关浏览器流程检查；查看桌面/短横屏截图，再切换原地址试玩并核对旧数据库完整值。

## 素材边界

复用已绑定的ui/satchel、ui/notice-timber、ui/notice-paper与原64px物品。边距沿用已测量的九宫格设置；新缝线/关闭小皮扣由Graphics绘制。没有新增图片、字体、外部资源、授权或资产处理；概念图不充当实际运行截图。本次用户反馈修改概念中的金币/分类等元素，不把旧概念中的这些元素再作为验收要求。

## 验证与交付

- 实现文件：`ui/inventory.ts`去掉钱袋/分类/清空按钮与对应分支，网格上移、桌面72px格/横屏48px格、底部一个工具行；物品签按点选显示，文字收起只关详情。口袋点击已选物品的同一格可收回，耗尽引用也可收回，数量不变。旧偏好导入移至标题的摆放上下文，避免污染日常布局。`Bootstrap.ts`新增布面格、缝线口袋和皮扣皮肤，保持44px目标和原生焦点/按下；`ui/panels.ts`只扩展皮肤类型。
- 原钱袋/图鉴不再作为背包入口。世界HUD和商店的原货币仍可用；用途/来源、真实加工/出售/播种、失败重试和耗尽说明保留。关联`smoke-hud-drag/inventory/semantics`改走新公开流程并覆盖无多余控件、同格收回/耗尽收回及所有14种真实物品的横屏分页；`smoke-phase45/landscape`去掉失效分类点击，其余断言保留。
- 使用Node22.23.2、根package-lock、既有Python3.14环境和官方Creator3.8.8。起初根目录真实类型/124绑定、core/inventory单元与release构建通过。SDK复制先遇到沙箱扩展属性限制，首个不完整副本的启动没有产出包；补全本任务副本后真实构建通过。初次自动审批超时后重试成功，没有把超时记作安全拒绝或构建通过。嵌套副本使用显式Node22路径，未用默认Node25跑测试。
- 期间聊天“规划种植体系扩展”开始修改同一根目录。用户明确允许协调，已两次发消息说明文件/构建/数据库边界。以提交`841244c`加本任务11个文件冻结在`output/cocos-inventory-119/source`，保持并行种植所有改动；后续两个小绘制修正仅按精确补丁同步根目录和冻结副本，没有整文件覆盖。根目录Bootstrap/inventory/panels同时包含双方修改，种植素材与来源清单由任务120维护。
- 冻结副本`node tools/cocos-sources.mjs --write`与`COCOS_CREATOR=... node clients/cocos/tools/check.mjs`：459来源/124绑定和真实引擎严格类型通过；`REALQUEST_COCOS_BUILD=web-inventory-119 ... node clients/cocos/tools/build.mjs web-desktop --release`成功，debug/sourceMaps关闭、MD5缓存开启。最终包为`output/cocos-inventory-119/source/clients/cocos/web-inventory-119-final/web-desktop`，不是仍在更新的根目录种植包。
- 前两轮使用`--build web-inventory-119/web-desktop`，最终使用`--build web-inventory-119-final/web-desktop`，运行命令为`node tools/cocos-browser.mjs --build ... --suite hud-drag,inventory,inventory-preview,semantics`。`run-Ydyu1a`、`run-0IWL8r`与最终`run-KEnIEU`均complete:true、**4套35组全部通过**，零意外页面/控制台错误。首轮截图发现缝线不明显，改用原生填充小线段，并放大皮扣×、去掉纸签旁悬空尖角，再构建运行完整4套。满背包截图进一步发现纸面翻页样式在布面上太暗，将翻页和耗尽引用改为浅色文字，在独立final包目录重新构建并完整复跑4套。没有放宽几何、文字、权威数量或重试断言。冻结副本最终core/inventory单元2模块也通过。
- 实际查看最终1440×900默认/点选、740×360点选、14物品横屏分页、口袋收回与拖放/触控画面；代表图在`output/playwright/inventory-119/`，完整截图/状态JSON/录像/清理回执在冻结副本`output/cocos-regression/run-KEnIEU/`。其中wood3/seed6是套件拥有的QA夹具，不称为玩家当前库存。
- **人工试玩仍为 http://127.0.0.1:5448/（API8148）**，session6810；launcher38998/API39011/proxy39012。沿用原task115/118同一SQLite库、cookie与浏览器本机排列偏好，服务使用冻结后端，避免并行新种植规则升级真实玩家。两次正式在线备份在`output/cocos-inventory-119/manual-before-backup/`与`manual-readable-backup/`（最终切换前）；启动前后9张表（玩家1行、receipts1035行，schema004）完整列/数量/值哈希全部一致。没有代操作、重置或删除玩家。
- 本任务不把旧种植规则的隔离包覆盖根目录`web-current`；已协调由任务120把双方改动合并构建后更新默认包。`output/cocos-inventory-119/delivery.json`明确记录此边界；本次行囊实现已在根源码中，独立实际试玩已完成交付。
- `cleanup.json`核验本轮67个QA/单元控制器、浏览器/服务PID和原17202/17207/17208及过渡30672/30684/30685均已退出；所有自动化浏览器由finally关闭。两份专用Creator工作副本清理，指定临时配置目录已不存在；签名源SDK、其他任务/共享宿主保留。只保留上述人工试玩及其冻结源码/包/依赖，不另开浏览器会话。

未提交、推送或部署，没有新增运行时资源或依赖。用户批准的是减法和材质方向，本轮实际画面继续供其验收；物理手机、Safari、系统读屏未在本轮实机验证，手机竖屏不在范围。根目录并行种植合并包的整体测试由任务120另记，不用本次冻结结果冒充。
