# Cocos 行囊与精简物品签（任务118）

2026-10-22。玩家认可概念预览并要求实现，明确“不需要整理快捷栏按钮”。范围仅为行囊/快捷口袋链。

## 已实现的候选

- 默认打开行囊只显示布袋；选中真实物品后出现264×200px短物品签，包含名称、数量、短用途、原主要动作与用途来源。详情×只收起详情，布袋×关闭背包；Escape由当前子上下文逐层退出并返回焦点。
- 取消原右侧1–4、装入、清空与整理确认页，没有“整理快捷栏”按钮。整理物品入口位于左侧；选中物品后点口袋可安排，左侧可移出当前口袋。整理模式的前/后一格按钮、点按和原生键盘替代拖动。
- 既有拖到空格/占格交换、口袋交换/拖回、面板移动和分旅程本机偏好保持。数量、播种/加工报价、失败/重试仍读原服务器命令；不改权威数据或经济规则。
- 钱袋完整数量、用途/来源分页、显式旧偏好预览/取消/带入、耗尽引用、可选存储失败、失焦/模式取消继续可用。物品图鉴只供查阅，不接受物品格拖入。

## 美术与实现来源

用户批准的概念参考为[行囊预览](../art/references/inventory-context-tag-v1.png)，由本聊天内置imagegen在用户提供的原界面截图上生成，仅作为参考图保存在文档；用户的最终变更是删除图中的“整理快捷栏”按钮。没有把概念图当背景/字体或整张运行时面板。

实际实现沿用未改写的ui/satchel、原物品/金币PNG、Hearthwood颜色和原生Graphics/Label/Button，没有新增运行时图像、字体、音频、依赖或外部素材。参考图中的新村庄构图没有导入游戏。

改动：`clients/cocos/assets/scripts/ui/inventory.ts`；`Bootstrap.ts`的背包拖动边界和物品格语义提示；`ui/panels.ts`的可选提示参数；`smoke-hud-drag.mjs`与`smoke-inventory.mjs`改走新的公开点按流程、保留权威数量/失败重试/持久化断言。来源清单与设计/检查记录同步。

## 环境与验证过程

使用既有Node22.23.2/npm10、根锁定依赖、backend/.venv Python3.14与官方Creator3.8.8的本任务工作副本`output/cocos-sdk/inventory-118.app`。初期登录页任务117仍在修改同目录，保留其全部更改，以HEAD+本行囊修改建立`output/cocos-inventory-118/source`隔离副本。117结束后，回到当前完整工作区（含其原样登录页改动）构建和验收，未覆盖其源码。

- 隔离真实类型、124绑定、release构建通过。首轮run-hkzZ0F中拖放8组通过；背包尺寸断言发现短横屏头部与物品格2px重叠，保留失败并下移网格修复，没有放松非重叠断言。
- 隔离复跑run-yk7E4q在当前完整工作区就绪后主动SIGINT退出，由根工作区最终回归接替；控制器finally关闭自身QA资源，不把取消轮标记为全通过。
- 相关inventory/core单元通过。当前完整工作区的真实类型/release构建通过；后续最终回归与交付如下。

## 数据与验收边界

所有fixture只写统一运行器拥有的QA库；木材3份只是两物品拖放夹具，不声称自然获得。没有重置玩家库、提交、推送、购买或部署。原注册页/账号代码保留；实际画面和物理设备验收不能用编译或模拟触控代替。

## 最终验证与交付

- 当前完整工作区真实Creator3.8.8 release为`clients/cocos/web-inventory-118/web-desktop`，debug/sourceMaps关闭、MD5缓存开启。`node tools/cocos-sources.mjs --write`、`COCOS_CREATOR=... node clients/cocos/tools/check.mjs`通过124绑定/459来源文件和真实引擎严格类型。未引入React/Phaser或新依赖。
- 根工作区首轮run-B3lXgs中，拖放与背包核心10组通过；删除本套件B旅程后，原117登录页WelcomeNote高度32px容不下两行提示，保留原失败证据。只将桌面提示高度改为44px，横屏把换行合成一句；按钮、输入与人物选择保持其原实现，原截断断言不放松。
- 最终命令`node tools/cocos-browser.mjs --build web-inventory-118/web-desktop --suite hud-drag,inventory,inventory-preview,semantics`：**run-fF2eVC complete:true，4套35组全部通过**（8+12+4+11），没有意外页面/控制台错误。覆盖默认无右栏/点选出现短签/双关闭、44px目标和几何、四格点按/拖放/移除、排序、刷新/跨旅程隔离、完整用途分页、耗尽/存储失败、输入归属、实际播种/加工/出售、拒绝/丢回复同ID重试以及原生Tab/焦点返回。
- 实际查看1440×900未选中/已选中、740×360已选中、浮影、DPR2减动态触控画面。最终代表图在`output/playwright/inventory-118/`；完整截图/JSON/录像和控制器资源回执在`output/cocos-regression/run-fF2eVC/`。这是真实Cocos画面，不是概念图替代截图。
- 默认`web-current/web-desktop`与已验证候选源码/载荷指纹逐字节一致，旧默认包完整保留为`web-before-inventory-118`，交付记录为`output/cocos-inventory-118/delivery.json`。`./start.command --check`在允许本机端口探测的环境中通过；初次受限沙箱返回Operation not permitted未当作端口占用结论。没有新建或改写默认人工库。
- **同地址人工试玩：http://127.0.0.1:5448/**，API8148，session43181。原task115 launcher92685/API92697/proxy92698已按参数、目录和ready回执核对后正常停止，正式SQLite在线备份保存在`output/cocos-inventory-118/manual-before-backup/`。
- 新预览继续使用同一旧预览库和cookie，没有换成空旅程。当前后端正常追加已实现账号功能的004迁移：仅新增账号相关三表，原players1行、receipts34行及其余五张原业务表的完整列/数量/值哈希全部相同。前后校验为`manual-data-preserved.json`。没有注册/登录、删除或代操作真实玩家。
- 新人工预览保留launcher17202/API17207/proxy17208，`/api/health`200。`cleanup.json`核验本轮57个控制器、浏览器/API/代理和旧试玩所属PID已退出；自动化浏览器全部finally关闭，独立Creator工作副本及两份专用临时配置已清理，原SDK保留。共享/无法归属宿主和其他任务未按进程名称清理。

用户批准的是概念布局及删去多余按钮的方向；最终实际画面仍供玩家试玩。物理手机、Safari和系统辅助技术未在本轮实机验证，手机竖屏不在范围。没有宣称重跑未改动的后端259项全套。
