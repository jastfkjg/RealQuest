# 127 · 银金钱包与村庄经济

2026-10-23。玩家授权100银币=1金币、自动钱包换算，并同步调整任务回礼、种植养殖收益和消费价格。实现为第一版经济候选；工程通过不等于长期平衡或玩家视觉批准。

## 已实现的链路

- 服务端保留稳定`gold`字段，以整数银币记账；新增`economy_version=1`。一个钱包自动显示银/金、自动找零，完整保留零头。客户端所有钱包、通用材料/回礼、装备、商店成交/剩余余额采用同一格式；服务端交易和缺款提示采用相同面额。
- 新手主线：20开局+10安家+16萝卜交付−30建房+8建房回礼+12养殖回礼−24首剑=12银。原160现金回礼改8银、3饲料及一次禽舍/小鸡援助；原建造/领养动作按服务端0成本报价执行，一次性资格与设施/动物在同一事务中保存，拒绝和重复请求不会重复领取。已有对应设施/动物不补发同项资格。
- 12种作物重定价；工坊按100/110/120%报价并逐件向下取整。六块萝卜田重新购种一轮净收益84→36银。种子价格、作物阶段和睡眠/暂停规则保留。
- 养殖产物和加工增值降低；小麦/玉米制饲料为4/12份。单只普通鸡扣采购饲料后6银/产出日，60银购入价10个产出日回本，另计幼年成长、住所和材料。禽舍/畜棚/马厩扩建提高支出；新手首项援助避免强制刷钱。
- 普通建筑升级改30/120银；首剑24银，加固短剑120银，科技长矛/微光短杖150银，相关图纸同步。村庄订单和部分支线回礼下调，保留旅途基本消费与免费恢复。
- 旧存档余额数字、物品和统计原样保留，统一按银币解释；不是把旧余额乘100。新价格属于统一重平衡。旧已接渐进任务通过`quest_contracts_v2.json`固定原条款，最早v1契约仍保留；未接任务使用新版。已接旧160现金回礼仍依约结算，不另发援助。

完整数值、回本口径与假设见[经济v1](../balance/economy-v1.md)。游戏日可经睡眠推进，不能把产出日误报为现实等待或实际主动游玩耗时。

## 变更文件

- 服务端：`backend/app/economy.py`、`quest_contracts_v2.json`、`rules.py`、`quests.py`、`market.py`、`crops.json`、`ranch_catalog.json`、`ranching.py`、`equipment_catalog.json`、`equipment.py`、`combat.py`、`journey.py`。
- 共享与生成目录：`shared/game/currency.ts`、`features.ts`、`items.ts`、`inventory.ts`、`dossier.ts`、`villageIntro.ts`、`protocol.ts`、`ranching.ts`和三个`*Catalog.ts`；Cocos `core/`由既有同步工具生成。
- Cocos界面：`Bootstrap.ts`及`ui/shop.ts`、`shopModel.ts`、`panels.ts`、`expeditionGear.ts`、`ranching.ts`、`farming.ts`、`guidance.ts`、`questBoard.ts`、`dossier.ts`。
- 测试：新增`backend/tests/test_economy.py`、`clients/cocos/tools/test-currency.mjs`、`smoke-economy.mjs`；更新受数值影响的后端/客户端单元和商店/任务链回归，登记现有测试控制器。
- 同步与规范：`clients/cocos/tools/sync.mjs`、`asset-bindings.json`、来源清单；更新README、DESIGN、游戏设计与经济说明。旧装备/牧场数值文档增加现值索引。

保留任务开始前大量已有工作树更改；同目录的养殖聊天在本轮仍活动，其牧场界面修改保留，未重置或覆盖。没有提交、推送或发布。

## 资产

本任务没有新增或修改位图、字体、音频，没有外部上传。既有金币图标继续作为通用钱币图标，原生文字标注银/金。`local-scene-art-v1.json`只更新已有`backend/app/ranching.py`依赖的源哈希，图像输出未重绘。

## 实际命令与证据

- `npm run test:backend`：403通过；独立临时SQLite夹具，不使用试玩数据库。新增覆盖面额边界、援助拒绝/重试/重载、旧契约与余额幂等迁移、跨100收支及回执复用、收益约束。
- `npm run cocos:test:unit`：30模块全部通过。回环网络检查在本机授权环境运行；第一次沙箱中的EPERM不作为测试通过。报告：`output/cocos-unit/2026-10-23T01-27-27-418Z-85da4524/result.json`。
- `tools/generate_crop_catalog.py`、`generate_ranch_catalog.py`、`generate_equipment_catalog.py`→`npm run cocos:sync`→`npm run cocos:sources:write`：目录和绑定同步。
- `COCOS_CREATOR=.../output/cocos-sdk/ranching-125-working.app/Contents/MacOS/CocosCreator npm run check`：实际3.8.8引擎类型和来源检查通过，无模拟声明。
- 用`REALQUEST_COCOS_BUILD=web-economy-127-final`、独立`COCOS_USER_DATA=/private/tmp/realquest-economy-127-creator`构建release；最终源/产物指纹验证通过。保留已有SDK签名输入，使用已有工作副本。
- 初次构建遇到新脚本元数据和另一个活动聊天修改`ui/ranching.ts`，构建回执正确拒绝了变化中的源；待源稳定后重新构建，没有修改回执绕过检查。
- `npm run cocos:test:browser -- --build web-economy-127/web-desktop --suite economy,shop,quest-chain,farming`：银金边界、商店、新手链三个模块通过；种植模块揭示商店100份数量标签截断。该批次末尾因后续金额标签修正导致源指纹变化，整体不记为通过。保留原失败报告以便追溯：`output/cocos-regression/run-FIgzWt/result.json`。
- `npm run cocos:test:browser -- --build web-economy-127-final/web-desktop --suite economy,equipment`：完整通过，报告`output/cocos-regression/run-G1gsHS/result.json`。实际装备购买/图纸丢包重试/城市材料采购/研究/打造/装备、18武器输入回归通过。已查看`city-materials.png`确认单份和批量价格面额；之后仅修正商店数量标签，保持本项交易行为。
- 商店数量标签改用格内足宽右对齐区域，避免100被挤成两行。不会更改持有数量。修正后重建并重跑受影响的银金、商店与种植模块；最终结果见收尾段。

## 已检查截图

实际Cocos：`output/cocos-regression/run-FIgzWt/suites/economy/`。

- `starter-silver.png`：初始20银。
- `gold-boundary-shop.png`、`gold-boundary-hud.png`：实际卖出后1金2银；重载保留。
- `wallet-1920.png`、`wallet-844.png`：买入找零回到98银，桌面和844×390横屏检查。
- `coop-assistance.png`、`chicken-assistance.png`：援助真实报价、明确领取、只消费一次。

已打开截图人工检查金额、中文和控件，没有将文件存在视为视觉验收。首次边界测试仅准备98银/2木材及位置，所有交易由真实UI/后端执行；援助夹具由正常新手规则命令产生，均隔离在QA旅程。

## 交付与边界

独立候选启动：`./start.command --build web-economy-127-final/web-desktop`。默认5443/API8143；若已有其他试玩占用，按README选择独立端口、cookie与数据库。保留正常玩家库，未重置任何旅程。

当前仅完成本地代码、构建和候选验证。长期存钱速度、更多田地/大量动物经营和玩家对投资价格的主观感受仍需实际试玩；无新增地图、付费、税收或现实成长奖励兑换。手机竖屏和物理设备不在本轮验收范围。

启动预检：`./start.command --check --build web-economy-127-final/web-desktop --port 5447 --api-port 8147`在本机授权环境通过，只读检查，没有创建/改写默认玩家数据库。沙箱下端口探测曾返回EPERM，未将它误记为实际端口占用。

## 最终验证与清理

- 数量标签修正版的`economy`、`shop`模块通过（`output/cocos-regression/run-wA7V6r`）。该批种植的旧断言仍期待小麦12银，已改为本轮6银；没有更改生产结果来迎合旧测试。
- 最终包定向重跑：`npm run cocos:test:browser -- --build web-economy-127-final/web-desktop --suite farming`完整通过，报告`output/cocos-regression/run-9VA1rX/result.json`。覆盖12种种子购买、低等级播种拒绝、丢包重试、浇水、真实睡眠/收获/出售、地块恢复、12种作物4生长阶段展示、1920×1080/1024×768/844×390/740×360与输入所有权。
- 新手任务链已在首批实际浏览器完成；其报告某条描述仍写旧“grants25”，实际执行断言、回礼配置和保存余额均已核对为16银，测试源描述也已修正。
- 最终构建指纹：`b6cca7fc606825bf67e64b49e84c91c4c4f60c98867bd2bd7c4fa70b15f7dd3e`；产物指纹：`c0678f99f50c9ba1c2c6ceb576b631c539023ce0be312cd840316fd72a971793`。`output/economy-v1/final-build-verification.json`验证源码与产物一致。`git diff --check`通过。
- 再次查看`run-wA7V6r/suites/farming/shop-all-seeds-purchasable.png`，100份数量完整显示；查看`run-G1gsHS/suites/equipment/city-materials.png`与`city-research.png`，普通材料、批量采购与8金币图纸显示清晰。
- 4批浏览器测试（含失败批次）全部服务子进程已退出、所有已知浏览器进程组已退出；`output/economy-v1/cleanup.json`保存逐套证明。按PID/父子归属和独立运行标记核对，无本任务Creator/测试进程残留。没有为人工预览保留服务或浏览器，其他聊天资源保留。未启动node_repl，不结束共享工具宿主。

数值候选已完成代码、真实构建与相关流程验证。后续应由玩家试玩评估攒钱/投资节奏，不把自动化通过解释为长期经济平衡已经获准。
