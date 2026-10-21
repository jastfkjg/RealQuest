# Cocos 独立交付工具取消清理

后续2026-10-19：[任务88](88-cocos-native-edge-delivery.md)用当前J3/真实Edge补六模式，修复signal0 EPERM和缺服务回执/失败即停止清理；最终验证器明确拒绝清理错误。真实失败与注入失败均保留，原Web及其余V/T门槛保持。

2026-10-18，接续任务72和任务39 T2/T5/V6。本轮本地完成：真实负例复现、交付六种生命周期、检查程序自身取消、公共记录原子写入、原runner七生命周期及四相关单元通过。整个退役目标仍开放，没有外部提交/推送/部署授权变化。

短计划：用隔离交付实例复现取消；探针finally核对并关闭全部自身残留；修复独立服务拥有者的信号处理及浏览器记录；新增正常/三信号取消/启动取消/实际服务退出的可重复检查；核验原runner与试玩保留。

## 实际负例

`run-Mca4S1`由新的`probeDelivery`启动，真实Nginx/独立QA库/自有浏览器。读取到归属79919的浏览器记录后只对该子进程发送SIGINT。主进程退出130，没有最终delivery结果；API79946/端口65370与Nginx79948仍存留，捕获PID/PGID/启动时间/专属配置路径后正常SIGTERM清理，已确认退出。原5442人工服务不参与。

此次信号还将`browser-lifecycle.json`截断，控制器解析记录失败；原坏字节和探针`before/interrupt.json`的错误保留，不当作通过。信号前的完整内存观测仍保存在该文件。实际进程表随后确认无所属浏览器/服务残留，补充证明另存，不能伪造原finally已运行。

代码原因与任务72相同：默认Playwright/Cocos助手会退出进程，而交付命令自己拥有的API/Nginx清理还没执行。已改为显式由交付控制器处理SIGINT/SIGTERM/SIGHUP、关闭浏览器打断加载、执行finally并写入失败/取消结果；清理失败也不得保留complete:true。公共浏览器记录改为串行临时文件+原子rename，避免进程中断截断旧记录或并发更新倒退。

原子记录单独控制`run-R4wmsg`仍使用未修复的交付信号拥有者：退出130/缺最终回执/两个服务残留依旧，但浏览器记录可解析、探针清理无错误，分开证明两个问题。该次自身残留也由探针finally定向清理；原坏文件保持0字节/SHA256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`。

## 本轮验证

- [x] 实际正常交付原九组保持；新增WebP MIME断言，与PNG/JS/JSON/CSS/WASM、gzip/cache/保留版本/入口回退一起执行。
- [x] SIGINT/SIGTERM/SIGHUP、启动取消与真实API退出：失败/取消报告完整，主工具自行清理，不依赖探针补救。
- [x] 检查程序自身取消、原默认runner七生命周期、四相关单元与所属资源清理。
- [x] 人工I3、原Web和待答授权保持；本轮无游戏代码/素材/规则/存档变化。
- [ ] 实际远端CI、其余独立恢复工具的取消、玩家视觉/系统/实机/生产及完整退役门槛继续开放。

## 最终实现与证据

修改`tools/test-cocos-delivery.mjs`与`tools/cocos-browser-config.mjs`，新增`tools/test-cocos-delivery-lifecycle.mjs`；根`package.json`提供 `npm run cocos:test:delivery:lifecycle -- --artifact output/<封包>`。该命令只接收已核验的独立候选，启动六个各自新QA库/随机端口/浏览器的真实子任务。它保留子任务真实返回码/取消/错误，检查主工具自行关闭资源；探针finally仅作安全兜底，如实际需要兜底关闭则检查不能通过。自身SIGINT/TERM/HUP也会停止当前子任务并留下未完成回执。

候选工作流在上传前加入同一检查；只读main/手动触发和原Web发布链保持。仅做本地YAML语法与顺序核验，未提交/推送或触发CI。生成来源清单更新为400文件/107绑定/93冻结Web输入，未新增npm/Python依赖。原图库/包与人工服务未重建或重启。

最终矩阵`output/cocos-regression/delivery-lifecycle-YgOMdP/result.json`（session96034终态0）六种基础设施路径通过：

| 路径 | 子任务结果 | 清理与回执 |
| --- | --- | --- |
| normal | 0，complete:true，九项原交付检查/五PNG | 浏览器正常退出；API/Nginx组退出 |
| interrupt / terminate / hangup | 各1，cancelled:true，complete:false | 最终回执完整，无探针补救或残留 |
| startup-cancel | 1，cancelled:true，complete:false | 观察到启动阶段；未留下浏览器或服务 |
| service-exit | 1，cancelled:false，complete:false | 仅结束该QA API，真实错误保持；浏览器/Nginx清理 |

正常子任务`run-hVrKfW`仍是原I3 source `ff64b0e465f0a146ac60e2279a6f02bee40d0054dd2e7f2fd5cc77a183cf5301` / payload `8532777e89513d7bd5e187b2777118da1e4399d2de737414735c63b9e7084efe`，artifact `77ddbe92093b5c6e0e21ab5727b214115bdb58748bbd9e47e34b8e710c3f9184`。实际查看新世界截图，原场景及UI保持，不扩大玩家批准范围。首轮`delivery-lifecycle-yf5nKP`也通过六种，但后续补强探针取消记录后以最终矩阵为准，不将两轮合成十二项游戏覆盖。

额外检查程序取消`delivery-lifecycle-VH7PfN` / 子任务`run-DWxE4g`（88267终态1）保持两层cancelled/complete:false，所有资源退出。公共记录更新后的网络取消`run-H0oOOB`（98584终态1）也有完整取消/关闭回执；仅定向取消，没有重跑或扩充七样本预算结论。原runner七基础设施生命周期（46549）和tool-lifecycle/source-ownership/transition-protection/browser-configuration四模块（5373）通过，均终态0。

`output/cocos-delivery-lifecycle/verification.json`核对当前工具SHA、所有矩阵/负例、父级及网络取消、原runner/单元、原构建和artifact。最终`cleanup.json`核对473条可解析浏览器记录/1035已结束PID，无所属活动/闲置进程和意外读取错误；唯一原损坏JSON按精确路径与空字节SHA单独列为`expectedCorruptNegativeRecords`，未覆写或删除，也不声称其原记录通过。

5442/API8142的I3原人工服务67850/67853/67854与session19960保留，健康200；原用户Chrome/IAB和共享工具宿主保持，未调用玩家数据API。剩余独立恢复工具、外部授权、真实CI、设备/系统和其余门槛继续推进，本轮不代表退役批准。
