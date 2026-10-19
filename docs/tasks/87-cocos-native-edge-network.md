# 原生 Edge 固定弱网与存档接续

2026-10-19，接续任务86和任务39 V6。上一轮原生Edge单次45分钟已有直接证据；本轮补相同品牌、当前J3真实版本化静态包在固定弱网下的启动、缓存及同档学习记录接续。整体退役目标继续active。

短计划：核对已结束任务及原试玩身份；在现有公共网络入口补严格Edge产品版本识别和负例单元；按原预算一次执行全部七样本；独立复算、查看实际截图和只读QA库，最后验证浏览器/服务/profile退出。原5442/I3、玩家数据和原Web保留。

## 工具变化和固定合同

公共入口仍为`npm run cocos:test:network -- --artifact output/<release>`。原工具虽支持`REALQUEST_CHROMIUM_EXECUTABLE`，但CDP断言只接受Chrome/HeadlessChrome，会在真实Edge的`Edg/`产品名处拒绝。现在由`tools/cocos-network-budget.mjs`导出的`validateNetworkBrowser`核对四段完整版本和Chrome/HeadlessChrome/Edg准确前缀；不能用Edge的Chromium内核版本代替Edge产品版本，也不接受后缀、未知产品或缺失版本。

`tools/test-cocos-network-budget.mjs`增加相应正负例；`tools/test-cocos-network.mjs`调用同一核验，测量、限速、输入、资源与结算断言不变。生成来源清单仍402文件/107绑定，只有上述三份工具条目的摘要变化。没有更改产品、后端、构建模板、依赖锁或资产，不需要重新构建同字节J3。

采样前`output/cocos-edge-network/plan.json`固定将任务70的数值工程参考应用到真实Edge155/headless1440×900/M4。`tools/cocos-network-budget-v1.json`的原Chrome范围和全部字节保留，SHA256仍为`1b867f45b1e9c686a238393f062711a9c3546357054958f01ce26ff8f4ced778`。不是将它改称所有者已批准的Edge/生产发布预算。

- 回环参考1份；10Mbps/80ms三份，cold≤15秒/warm≤5秒。
- 1.6Mbps/150ms三份，cold≤60秒/warm≤8秒；每份cold HTTP≤12MiB。
- 每份都必须完成第一次真实移动、一次中文学习书页保存、热导航后原凭证/同档/位置/原物品与三种点数保持，以及恰好一条`study_create`结算。不能靠第二次移动诊断、均值或漏样取得通过。

真实Nginx gzip/cache、独立同源API、新QA库/随机端口和浏览器临时profile，不接收玩家库、外部URL、预算或样本覆盖。固定CDP限速与HTTP层字节不是物理带宽、TLS/DNS/丢包、手机或总体p95证明。

## 实际结果

三个相关单元模块（network-budget、source-ownership、browser-configuration）已通过，报告`output/cocos-edge-network/unit/result.json`。`caffeinate -di node output/cocos-edge-network/controller.mjs`的工具session82462终态0，controller41563；实际公共套件`run-OBhDky`一次七样本/七检查/10PNG全部通过，complete:true/cancelled:false，errors与budgetFailures均为空。17:43:41.211–17:48:11.656UTC完成，非多轮拼接。

官方Edge包与本地解包应用沿用[任务83](83-cocos-native-edge.md)来源；前后codesign深度严格校验均退出0。锁定Playwright1.64.0连接实际CDP `Edg/155.0.4283.62`，不是默认Chromium或伪造UA。实际宿主macOS15.7.7/M4，Nginx1.31.2；UA中的Intel Mac/10_15_7为浏览器兼容字符串，不据此推断宿主硬件。本轮没有安装系统应用或修改默认profile/设置。

| 固定条件 | cold可用时间 | warm再次进入 |
| --- | --- | --- |
| 回环参考1份 | 2.554秒 | 2.540秒 |
| 10Mbps/80ms三份 | 13.507 / 13.457 / 13.584秒 | 2.552 / 2.537 / 2.591秒 |
| 1.6Mbps/150ms三份 | 58.160 / 58.086 / 58.085秒 | 2.562 / 2.584 / 2.533秒 |

每份cold HTTP10,264,103字节、15份gzip响应；warm301字节、263条实际缓存命中。请求数每次264，原始CDP规则ID/响应/字节及5000条ResourceTiming缓冲保留，无bufferFull；不把HTTP层字节称为完整269文件包大小。所有七份首次原生d移动均保存成功，诊断重试没有参与取得通过。

原J3包`output/cocos-j3-delivery/candidate-j3`：active `260b75754510b58e843ffacb41fddc61a7f9f58c6e79ec97068c06103af065cf`，artifact SHA256 `2f8e4a59e59767bb68f5cfd7e19ca0430f212aad537993ca6efab5368cc26df5`，11个真实版本保持。

当前构建`web-release-framing-j3/web-desktop`：source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e`，payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`，269个文件/15,175,449字节。本轮不称为新的Creator独立重建、全27套回归或实际CI。

## 独立复核与清理

`node output/cocos-edge-network/verify.mjs`独立重算全部原始样本、固定预算、实际Edge产品与版本、426冻结输入/规范工具30输入、当前运行时和11版静态包、准确10张PNG的哈希及正常浏览器退出，complete:true。来源清单前后只有三份工具条目变化，产品/后端/原预算字节保持；注册仍27个current加1个可选原Web比较套件。

只读本轮SQLite：integrity ok、外键错误0、恰好7个QA游客，每人一份手动书页和各一条create/study_create，无重复request_id、活动/计划/现实约定0、三种点数0、gold20/seed6。原凭证和同档/位置/物品/余额关系由每份实际冷/热链断言；没有接触玩家库，也没有将手工创建书页称为核验过的学习行为。

实际查看三张：1.6Mbps真实12秒后缓慢提示、warm同档唯一书页列表、10Mbps中文书页详情。中文/重载/保留凭证提示可读，日期为服务端CST2026-10-19，书页0/12分钟、未完成、计时结束控件禁用与测试状态一致。记录为`visual-review.json`，不扩大玩家批准，不新增素材。

BrowserServer正常退出0/非forced，临时profile已删除，所属API/Nginx组、Node及caffeinate均退出；控制器补充browserCleanup无额外清理目标。只读审计571份可解析浏览器记录/1619份结束PID，无所属遗留/活动自动化/意外读错误；任务73的精确空坏JSON仍按原负例保留。`cleanup.json`、`manual-retained.json`和`verification.json`均在`output/cocos-edge-network/`。

原67850/67853/67854启动身份保持，5442主页/API8142 health/构建三项200，仍I3供人工复核。用户Chrome/IAB/共享宿主保留；没有新的运行服务保留，官方包/解包应用/QA证据仅为非运行文件。

主要实际命令：

```sh
node tools/cocos-sources.mjs --write
node tools/cocos-sources.mjs --check
node tools/cocos-unit.mjs --only network-budget,source-ownership,browser-configuration --report output/cocos-edge-network/unit/result.json
caffeinate -di node output/cocos-edge-network/controller.mjs
node output/cocos-edge-network/verify.mjs
python3 output/cocos-edge-network/audit.py
python3 output/cocos-edge-network/manual-retained.py
```

控制器通过既有runOwned调用根公开`tools/test-cocos-network.mjs --artifact output/cocos-j3-delivery/candidate-j3`，唯一浏览器选择为已核验的任务83 Edge可执行文件。新增实验控制器/计划/原三份工具与旧catalog快照/日志/复算/截图检查记录位于output。没有新增下载、npm/Python安装、后端测试、全量浏览器回归或Creator构建；不要把上轮194后端数称为本轮重跑。

## 仍需完成

V6完整多品牌/系统/物理横屏、目标HTTPS/生产发布预算和其他V/T条目继续按[任务39](39-cocos-primary-retirement.md)验收。任务85的原生缩放仍未验证，不重复无界CUA窗口绑定，也不以CSS缩放代替。原视觉/试玩切换/外部Git问题仍按已提问的范围等待，不重试被拒绝的5442停止动作；没有提交、推送、PR、部署、默认入口切换或Web删除。
