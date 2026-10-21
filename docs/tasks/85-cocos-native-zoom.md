# Cocos 原生浏览器缩放：窗口绑定未完成

2026-10-19后续：[任务95](95-cocos-native-chrome-zoom.md)另在已运行正式Chrome与专用新标签完成100/125/150/200%代表链、200%书页保存/刷新及原生重置100%。通过原生标签名与QA URL匹配后才输入；本页Firefox零检查与失败原样保留，没有重新走私有应用绑定。任务95不是Firefox结果、完整V5或系统IME/读屏/实机验收，运行中精确Chrome版本页亦因策略限制未核验。

2026-10-18，接续任务39 V5。**本轮原生缩放未验证，V5保持开放。** 失败发生在隔离窗口的原生辅助功能绑定，尚未进入游戏页面；零缩放检查、零游戏截图，不记作产品通过或产品失败。已保留全部失败回执并完成所属资源收尾。

原计划：使用已验证的官方Firefox158.0、新独立可见窗口/profile/QA库，不设置模拟viewport；通过原生菜单或快捷键检查100/125/150/200%及回到100%，比较原生百分比、实际DPR、画布/控件/中文表单和同档唯一书页。原生操作依据[Mozilla页面缩放说明](https://support.mozilla.org/zh-CN/kb/%E9%A1%B5%E9%9D%A2%E7%BC%A9%E6%94%BE)。这些档位均未实际执行，不能用CSS缩放或旧截图替代。

## 发生的事情

1. 开始时`cua.getState()`的运行应用清单没有Firefox。没有选择、连接或关闭用户已有Chrome及其标签。
2. 现有统一runner建立`run-uKVdSa`，当前J3/新库、回环50347/API50348；通过官方应用创建可见Firefox23661，新profile `playwright_firefoxdev_profile-reS97X`，`viewport:null`。只读采集脚本等待CUA原生操作，没有调用goto/键盘/点击来替代原生UI动作。
3. 调用`cua.getApp(项目内Firefox.app路径)`后出现异常长等待，工具报告wall time7042.2501秒。其返回是“欢迎使用Firefox”、`chrome://browser/content/spotlight.html`，不是QA网址，未见原生缩放值。没有在返回窗口输入、点击、导航、接受提示或继续测试。
4. 原QA的25分钟保护已先到期：13:17:30Z启动，13:42:34Z脚本记录未完成，13:42:35Z runner结束。Firefox23661正常退出0/非强制，其profile删除、API/代理子进程全部退出。session70566最终为1，原controller/report complete:false保留。
5. 返回后只读核对发现项目内Firefox27016于15:17:07Z另行启动，没有原QA参数；子进程明确使用默认Firefox profile，而非QA临时目录。这符合getApp在应用不存在时自动启动的行为，不能将返回窗口继续当成原测试会话。
6. 确认初始无Firefox、项目私有应用路径、原QA已退出、新进程的PID/父PID/启动时间/完整参数后，按本轮新启动资源处理。仅对当前身份仍匹配的27016发送一次SIGTERM，其10个记录助手/子进程随之正常退出，无额外信号。没有读取、删除或重置默认profile文件；它们全部保留，不声称默认profile启动没有留下自身状态。
7. CUA绑定/kernel已重置，不再对该路径重复同一绑定尝试。后续需先被动确认可识别的现有应用/窗口与PID/profile一致，并有可控的超时/退出机制，才能继续原生缩放；不要把getApp的自动启动当作归属证明，晚返回后必须重新验证身份。

这次绑定没有保持原QA隔离。安全收尾不等于原生缩放成功，也不将浏览器欢迎界面/绑定失败归为Cocos游戏问题。

## 实际状态与数据证据

- 当前游戏仍J3：source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e` / payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`，Creator3.8.8、269产物。未改产品、规则、依赖或素材。
- `output/cocos-regression/run-uKVdSa/result.json` / `suites/native-zoom/zoom-result.json`：complete:false，checks/captures/samples均为空。`zoom-result.process.closed:false`是启动时快照；最终状态必须读`browser-lifecycle.json`，其中closed:true/exitCode0，不改写原快照隐藏经过。
- `attempt-verification.json`：实际缩放检查0、PNG0。只读QA库players/receipts/guest_sessions/recovery_keys/client_deletions均0，integrity/FK正常；未进入游戏、创建角色或书页。没有调用玩家数据API或打开玩家库。
- `after-cua-processes.json` / `cua-launch-cleanup.json`：新默认profile启动的原始PID/时间/参数、逐个身份复核和11个进程退出证据。默认profile内容未检查/删除，不作为QA存档处理。
- `cleanup.json`：567份可解析常规浏览器记录/1598份结束PID记录，无所属浏览器/应用路径助手/Node子进程存活、无意外读取错误。历史任务73精确空坏JSON仍原样分类保留。上述常规记录与本次11个新进程有不同统计范围，不相加当唯一PID数量。
- `manual-retained.json`：23:24北京时间复核，原5442/API8142的67850/67853/67854启动身份未变，主页/health/构建均200，原I3/DB/Cookie继续保留给玩家。未中断或重启它们，用户Chrome/IAB及共享宿主保留。

本轮没有关闭共享应用/MCP宿主，没有清除任何用户profile文件，也未启动Docker或运行安装器、系统设置命令。当前无所属测试服务或浏览器运行；默认profile文件和失败证据均保留。首次运行欢迎页没有接受条款或权限提示。

## 命令与可复核性

实际运行：项目Node22.23.2、Playwright1.64.0与既有官方Firefox158.0；主命令`node output/cocos-native-zoom/controller.mjs`已终态1。`cua.getState`/getApp返回证据和时间异常在本任务及attempt-verification记录。不要用相同getApp路径再次启动本实验；先解决可识别隔离窗口与有界调用的问题。

实际收尾：

```sh
backend/.venv/bin/python output/cocos-native-zoom/close-cua-launch.py
backend/.venv/bin/python output/cocos-native-zoom/audit.py
backend/.venv/bin/python output/cocos-native-zoom/manual-retained.py
node tools/cocos-sources.mjs --check
git diff --check
```

定向关闭脚本是本次精确PID/启动身份的一次性收尾证据，**不要重放旧PID或按应用名批量关闭**。已验证退出，后续审计只读。脚本/回执未覆写为成功的缩放检查，也未修改游戏来迎合未执行的测试。

仓库仅更新本任务、任务39 V5补充、TODO/progress与本地说明；测试桥/失败日志/空QA库在output。没有规范套件/源清单/锁/运行时/后端/资产/迁移改动，没有提交/推送/PR、部署、默认切换或原Web删除。

本轮取得的是“现有原生窗口绑定路径无法保证QA隔离”的证据，以及保护超时/退出的实际结果。下一步不能重复同一路径等它变绿；原生缩放和系统IME/读屏仍未验证，其余独立清单继续按原要求推进。整体目标保持active，本轮不关闭V5/V6或整体目标。
