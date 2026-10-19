# Cocos 真人中文输入法与书页接续

2026-10-19，接续任务39 V5与任务95。**已验证当前macOS Chrome中，真人拼音选词→保存研习主题→刷新→找回同一本书页的一条代表流程。** V5保持开放：本轮没有覆盖登记姓名、取消候选/Escape、其他输入法/浏览器、读屏或物理横屏设备；观察到的三个compositionend均为isTrusted:false，其来源仍未确定。

短计划：使用独立空QA库和当前封存J3，在实际EditBox外被动记录输入事件；自动按键未触发系统组合输入后交给玩家操作。收到答复先归档事件和画面，再只读核对书页/结算与资源，正常刷新接续，最后关闭本轮标签和服务。没有为了通过测试生成组合事件或改写输入值。

## 环境与实际结果

- 既有正式Chrome进程661、macOS15.7.7/M4；只新增标签139944101，未关闭用户其他标签或操作用户profile。精确运行版本仍按任务95标为未核验，没有绕过其版本页策略限制。
- Node22.23.2、既有Python3.14.6后端环境、本机Nginx；独立`run-0pKW1I/suites/native-ime/test.db`、回环63826/API63827、唯一Cookie。没有复制原玩家档案或准备成长资源。
- 当前真实Creator3.8.8 release J3：source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e`，payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`，269文件；封包`77709984d30470abdf03af1e64937112a6e929ae580a4383994cd33a8f3a350d`未变。
- 临时验收页在封包之外，用同源iframe加载原始游戏，仅对预检框和游戏INPUT/TEXTAREA添加被动capture事件监听，日志显示在页面。没有修改游戏、引擎、静态包或规范自动化工具。

自动预检只得到普通拉丁输入`zhongwen`、八次keydown和零组合事件，不能算系统IME通过。尝试绑定系统输入菜单代理耗时163.616秒后超时，没有发生输入源切换；没有继续盲重试、安装输入法或修改设置。该既有系统进程及用户输入法进程的启动身份保持。

玩家答复“已输入并保存”。实际输入为`AI agent学习`，不是提示中的示例字符串；按真实内容核验。刷新前先保存`human-events.json`（123条连续事件）及`human-result.jpg`，再读取独立QA库。没有只凭答复或最终中文字符串认定组合输入。

| 证据 | 实际观察 |
| --- | --- |
| 真人组合输入 | 游戏研习主题有3次可信compositionstart、15次可信compositionupdate，分别形成AI、agent、学习。 |
| 中文选词 | 日志实际记录`x→xu→xue→xue'x→xue'xi→学习`；最后beforeinput/input均isTrusted:true、isComposing:true、inputType为insertCompositionText。没有insertFromPaste。 |
| 输入归属 | 中文组合中u/e/x/i/空格五次keydown标为isComposing:true，选词后仍在研习编辑流程；位置240/320未变，没有触发世界移动或额外成长。 |
| 保存 | 仅1角色、1书页；create和study_create回执各1。书页标题原样为`AI agent学习`，目标25分钟、未完成、奖励0。 |
| 刷新接续 | 正常reload→继续旅程→成长→打开该书页，标题与0/25分钟仍可读；只读库核对同save ID及同book ID。 |
| 数据完整性 | 金币20/种子6、XP及知识/健康/技能点均0；计时为空、活动/计划/约定/锻炼任务均空，integrity/FK通过。没有将创建书页当成已完成学习。 |

QA save ID为`f4e0e7d9-35e6-4ef0-80d9-e4f8119b9ddc`，book ID为`70c782b4-0c0e-2b8b-9d07-d9217ab38c56`。只读核验只针对本轮新库，没有读取原人工试玩的玩家库或玩家数据API。

![刷新后仍可打开的同一本研习书页](../../output/cocos-native-ime/reload-book.jpg)

实际查看真人保存结果与刷新后的原始JPEG，主题、进度与必要操作可读。一次打开详情后的早期AX快照尚无日期/进度，原样保留；后续最终AX及截图已显示完整0/25分钟，不将早期快照算完整状态。四条控制台观察无error。不是新增画面批准。

## 计数与事件来源限制

三个compositionend的isTrusted均为false，结束值分别AI、agent、学习。原始验收页仅累计“isTrusted:true的compositionend”，因此显示“预检0次／游戏0次”；**没有修改日志、把false改为true或追改计数冒充通过。** 上方预检框没有发生真人组合输入，不登记它通过。此计数不足以概括已经直接观测到的可信start/update/中文input及保存结果。

已检查当前J3实际引擎EditBox监听代码及随工具保留的Creator源码：该处理只锁定/解锁输入并通知delegate，没有在该段重新dispatch组合事件。故不能将false归因于Cocos重新派发、特定输入法或浏览器扩展；来源保持未确定，没有探查用户扩展或profile。`engine-observation.json`保存实际引擎文件哈希及对应片段。

本轮结果单独登记为`nativeChineseStudyFlowVerified:true`、`trustedCompositionEndVerified:false`、`independentProbeCompositionVerified:false`、`fullV5Verified:false`。代表流程的实际可用性已获得证据；事件末端来源及其他输入边界仍需各自证据，不扩大为全部系统IME合同通过。

## 收尾与可复核命令

先关闭专用Chrome标签139944101并确认不存在，再写本轮停止标记。主机session47369终态0；控制器85804、API85810、Nginx85813及其进程组退出，63826/63827无监听。07:29:22.042Z启动，07:48:14.839Z完成；交给真人后取消15分钟自动期限，本轮由明确停止标记收尾。QA库与证据文件保留，没有删除玩家数据。

一次性主机的子进程退出回调将初始停止原因覆盖成`service-exit:api`。第一次最终核验因严格期待`explicit-ime-finished`而失败，前像保留；没有改写原始closed记录。随后交叉核对关闭标签→写停止标记→服务结束的时间顺序、API实际SIGTERM/Nginx退出0、精确PID身份及端口，确认已退出。这是临时验收主机的记账限制，没有据此改动产品或规范生命周期结果。

全局只读收尾审计核对604份浏览器记录、1853份结束PID记录，未见所属遗留/意外读取错误；历史任务73精确空坏JSON负例仍保留。此统计不包括应关闭的用户浏览器：Chrome661、系统输入代理1771和既有输入法70060原身份保持，共享工具宿主继续保留。原5442/I3与独立J3取景53136/API53137共六个进程身份未变、五项主页/健康200；J3的IAB标签2继续供原人工问题复核。没有重试停止5442的拒绝操作。

实际执行：

```sh
node output/cocos-native-ime/host.mjs
python3 output/cocos-native-ime/audit.py
python3 output/cocos-native-ime/verify-final.py
node tools/cocos-sources.mjs --check
git diff --check
```

全部浏览器/原生UI交互通过CUA；Node文件I/O仅归档CUA返回的事件、AX和原始JPEG。沙箱内ps读取被拒后，通过只读权限审查运行退出核验，没有发出额外进程信号。`verification-final.json`记录上述限定结果与反证；`verification-ready.json`保留真人操作之前的未验证状态，不覆盖历史。一次性output主机包含已使用停止标记与旧PID，不当作可重复CI入口。

本轮仓库仅新增本报告，更新任务39、本地说明与progress；没有产品/后端/素材/依赖/规则/迁移变化，404来源/107绑定保持。没有重跑已经通过的全27套、构建或后端矩阵，也没有提交、推送、部署、默认切换或删除原Web。整体目标active，T2/T3/V2/V4/V5/V6/V7仍按原范围开放。
