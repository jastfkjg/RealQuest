# Cocos 恢复演练中断与数据保留

2026-10-18，接续任务73和任务39 V1/V7/T5。本轮本地完成：当前I3完整七组恢复、八种生命周期、检查程序自身取消、22份QA库/备份只读核验和四相关单元通过。前轮为真实修复/测试进展；没有外部提交、推送、CI或部署授权变化，完整退役门槛仍开放。

短计划：复用已存在的原Web比较包，核对其字节指纹；在独立QA库复现恢复工具中断；修复主控制器的信号归属/阶段退出回执；验证正常完整恢复、三信号、启动取消、当前003恢复激活与旧001升级后取消、API退出，并只读检查所有保留库。

## 实际负例与范围

现有I3 source `ff64b0e465f0a146ac60e2279a6f02bee40d0054dd2e7f2fd5cc77a183cf5301` / payload `8532777e89513d7bd5e187b2777118da1e4399d2de737414735c63b9e7084efe`有效。原Web比较包仍150文件，指纹 `87976774a366c2cecc87374ebcadb16ed5ebee9dadf8128e3b128ab924e84b04`，与任务56相同；不重新安装/构建原Web。

`run-N7mT96`（before探针18292终态0）读取到自有浏览器记录后，对恢复主程序88813发送SIGINT。真实主程序退出130、缺最终恢复报告；嵌套runOwned已通知Python宿主停服，等待宽限后未发现宿主/API/两个代理长期遗留，探针finally再次核对全部退出。与任务73不同，本次证明的是缺少最终阶段/清理回执，不能虚构有两个服务遗留。原记录、退出码和探针补充证据保留在`output/cocos-restore-lifecycle/before.json`。

已修复：恢复命令显式由主控制器处理SIGINT/SIGTERM/SIGHUP，关闭自己的浏览器打断等待，finally关闭所有上下文、宿主及三服务；阶段回执核对host进程组退出，并可补读刚就绪但尚未缓存的owned ready文件。取消时不启动新宿主、误标complete:true或丢失最终报告。

新增可选`cocos:test:restore:lifecycle`复用现有显式`--build`/`--web-build`。它不接收玩家库、外部地址或覆盖目标，每例由原工具新建独立test.db/三随机端口；只读检查其当前、备份、保留和legacy库的完整性/模式/表指纹。该兼容演练不接到普通Cocos候选CI，不给日常Cocos构建增加原Web安装/构建前提。

## 本轮验证

- [x] 当前I3完整七组原恢复/旧模式/双客户端流程通过，零替代Cocos游客，原两包不变。
- [x] SIGINT/TERM/HUP、启动取消、实际QA API退出；全部owned资源/回执可核验。
- [x] 当前003激活后取消完整指纹保持；旧001升级后取消原players/receipts保持，旧源和备份库仍完整。
- [x] 检查程序自身取消、四个备份/来源相关单元、所有临时进程清理；人工5442和原Web保持。
- [ ] 实际生产/目标库、外部授权/CI、系统/实机和玩家待答继续开放，不以模拟31类进度替代自然成长或生产迁移。

## 实际结果与复现

```sh
npm run cocos:test:restore:lifecycle -- --build web-release-network-i3/web-desktop --web-build output/cocos-regression/web-compat-current
```

两份包须已存在并与本机源码对应；通用准备见[备份与恢复](../cocos-backup.md)。入口不自动构建原Web、不接受玩家库路径，普通Cocos回归/候选CI保持独立。

最终`output/cocos-regression/restore-lifecycle-TxL8Sv/result.json`（26034终态0）八种基础设施路径均通过，三个源文件SHA在测试前后严格相同：

| 路径 | 实际结果 | 数据/资源检查 |
| --- | --- | --- |
| normal，`run-e0VIMe` | 0/complete:true，原七组/七PNG | 三次宿主阶段；零非预期Cocos游客；原Web与Cocos凭证/计时/当前和旧模式接续 |
| interrupt / terminate / hangup | 各1/cancelled:true/complete:false | 一宿主/三服务和浏览器自行退出，回执完整 |
| startup-cancel | 1/cancelled:true/complete:false | 观察到就绪启动阶段；无浏览器/服务遗留 |
| restored-current-cancel，`run-w8kcUF` | 1/cancelled:true/complete:false | 当前test.db完整六表/模式指纹等于backup-current；两阶段宿主均退出 |
| legacy-upgrade-cancel，`run-1HblK9` | 1/cancelled:true/complete:false | 原001升003后取消，players/receipts与backup-001相同；三阶段宿主均退出 |
| service-exit | 1/cancelled:false/complete:false | 仅结束QA API，真实错误保留；宿主关闭其余代理，浏览器退出 |

八例共22份独立test.db/database.sqlite均经只读SQLite完整性、外键、模式和全表指纹检查。所有存在的`original-preserved/test.db`与对应backup-current全指纹相等；`legacy/test.db`与backup-001全指纹相等，备份文件自身亦与manifest相同。当前003恢复后取消仍全指纹相等，旧001升级取消仅新增原迁移定义的表/版本、原玩家/结算表不变。正常后续UI访问允许的时钟/租约/revision变化沿用原严格边界，不借取消测试放松资源或记录比较。

正常七组保留任务56的原断言：31类确定性演练数据、原Web原生凭证下载、Cocos预览/取消/确认/刷新、无凭证Cookie查找、在线WAL/拒绝覆盖、完整六表恢复、两个Bearer/两个恢复键/删除回执/原幂等请求、运行计时与旧001/未版本化对照。备份时为2角色、2Bearer、2恢复键、1删除回执、20结算；结算次数是本轮真实事件量，未强行套用旧任务56的21。实际查看恢复后的现实成长及未版本化对照世界截图，7PNG不是新的玩家视觉批准。

额外父级取消`restore-lifecycle-SV76tb`/子演练`run-zEimxT`（2434终态1）两层都保留取消/失败结果，六份已产生的QA库只读检查通过，全部资源退出。四模块sqlite-backup/source-ownership/transition-protection/browser-configuration（72645终态0）通过，包含原10个SQLite边界合同；不称为全23单元或全26游戏套件通过。

`output/cocos-restore-lifecycle/verification.json`连接当前脚本SHA、八模式、原失败/父级取消、22库指纹、正常七组、四相关单元与两份构建。新增审计补读各suite恢复回执、分阶段宿主和嵌套备份操作：482条可解析浏览器/1336已结束PID，无所属活动、闲置或意外读取错误。任务73唯一空坏JSON仍以精确路径/原SHA单列，不修改历史失败记录。

本轮文件：`tools/test-cocos-restore-browser.mjs`、新增`tools/test-cocos-restore-lifecycle.mjs`、根`package.json`与生成的`docs/migration/cocos-source-inventory.json`（401来源/107绑定/93冻结Web输入）；另更新本报告、本地备份指南/任务39/TODO/进度。没有新增依赖、模型集成、游戏/素材/规则/迁移/玩家库改动；原I3和150文件Web比较包指纹保持。人工5442/API8142、原用户浏览器与共享工具宿主保留。

本轮是隔离SQLite数据与基础设施验证，不是新的自然成长、目标生产恢复、实际Git干净检出、远端CI或原Web退役批准。当前I3全26套游戏回归仍未在该版本完成一次全量，后续应按清单核对该缺口及其余实机/系统/外部授权/生产门槛；不重复已完成的7+7网络预算。
