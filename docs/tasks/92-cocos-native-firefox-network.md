# 当前 Cocos 的原生 Firefox 弱网检查

后续：[任务93](93-cocos-canonical-firefox-network.md)已把本轮方法接入仓库命令，修复TCP半关闭截断、补FIFO/大载荷回归；Firefox158、实际默认156、同代码私有Chrome155各七样本、两个独立中断及五相关单元已通过。原系统Chrome未动，本任务旧七样本仍保持原源/预算范围，前像已核验，不能替代新入口证据。

2026-10-19，接续任务39 V6及任务84/90/91。原生Firefox158/BiDi通过经校准代理的七份冷/热启动、首次移动与同档唯一书页检查，零意外错误、零超限。结果只覆盖本机HTTP有效载荷模型的工程参考，不关闭完整V6。

短计划：确认当前原生BiDi能力，固定替代测量方法与预算；先校准共享限速/延迟/上传/取消清理，再用现有77709984候选包和真实Nginx执行1＋3＋3份冷/热导航、首次移动和同档唯一研习书页；终态后核对数据、原始传输、图片、签名、输入及退出。

## 方法与预先固定的范围

当前锁定Playwright1.64.0的原生Firefox158驱动只通过`emulation.setNetworkConditions`切换offline；当前[W3C BiDi规范](https://www.w3.org/TR/webdriver-bidi/#emulation-setNetworkConditions)也仅定义offline条件。[Mozilla说明](https://firefox-source-docs.mozilla.org/remote/Prefs.html)原生Firefox已移除CDP。本轮不把Chromium的CDP规则、缓存或字节计数冒用到Firefox，也不更改用户系统网络。

独立TCP回环代理放在浏览器与本轮Nginx之间，上下行各用一条跨所有连接的序列时钟限速，每次输入缓冲先施加半份延迟、再共享排队。它测的是应用层TCP有效载荷调度，不模拟握手、ACK、DNS、丢包、TLS、内核链路或物理设备。所有游戏页面、静态资源及浏览器API请求都经同一入口；准备health不在测量窗口中。原5442/I3保持。

沿用任务70原数值，预检前另存Firefox适用范围的`budget-v1.json`，原文件未改：reference一份，10Mbps/上行2Mbps/80ms三份，1.6Mbps/上行0.75Mbps/150ms三份；冷首屏15秒/60秒、热5秒/8秒、冷下载≤12MiB。HTTP有效载荷字节取自代理实际下行write，含HTTP头与重定向；缓存另看Firefox原生ResourceTiming。该方法与CDP计数和限速语义不同，不以同数值暗示同一实验或正式发布预算。

## 校准

初版校准只完成latency后，在单连接下载的吞吐下界检查失败，原源/日志/记录留在`calibration-attempt1/`。原因是每块读取后暂停到延迟写完，又给下一块重复增加半延迟；修正为有界流水缓冲，仍以每方向共享时钟限速。所有速率、延迟和校准上下界保持。首次失败没有保存失败项的数值明细，明确不补造；后续改为断言前留原始样本。

第二次八项校准通过并归档。最终校准另加入服务端上传字节核对、脚本/预算/计划前后摘要，八项全部通过；单连接与四并发的1MiB总下载在10Mbps约0.926/0.928秒、1.6Mbps约5.404/5.403秒，确认并发共享带宽。80/150ms最小往返、两上行速度和取消后socket/timer清空均通过。游戏控制器核对代理与该校准的脚本摘要完全相同后才启动。

校准仅为本机HTTP有效载荷模型的证据，不证明真实运营商带宽、手机性能、内核网络整形或生产SLA。没有启用/改写Firefox DevTools全局偏好。

## 实际结果

`caffeinate -di node output/cocos-firefox-network/controller.mjs`，session38903终态0；15分钟保护未触发。03:45:46–03:50:25Z，实际游戏`run-DZRJW4`。每份使用新原生Firefox userContext/空缓存，1440×900；同上下文热导航保留实际缓存/save ID/原凭证和书页。

| 样本 | 冷首屏ms | 热首屏ms | 冷HTTP有效载荷B | 热HTTP有效载荷B |
| --- | ---: | ---: | ---: | ---: |
| reference-1 | 2613 | 2639 | 10,264,241 | 439 |
| desktop-10mbps-1 | 13565 | 2582 | 10,264,241 | 439 |
| desktop-10mbps-2 | 13628 | 2565 | 10,264,241 | 439 |
| desktop-10mbps-3 | 13805 | 2612 | 10,273,401 | 439 |
| constrained-1.6mbps-1 | 58927 | 2624 | 10,264,241 | 439 |
| constrained-1.6mbps-2 | 58762 | 2585 | 10,264,241 | 439 |
| constrained-1.6mbps-3 | 58999 | 2619 | 10,264,241 | 439 |

全部逐份满足预先固定的原数值上限；不由均值或旧complete字段授予通过。冷请求264–265、15份gzip响应；第三份10Mbps多载入一份既有PNG，原始差异保留，未强制归一。热导航ResourceTiming可直接识别181份非零encodedBodySize且transferSize为0的资源；这是该判据的观测数，不冒称全部缓存命中数或CDP的263。

每份首次原生d移动均通过，没有用重试成功覆盖首按失败。每个QA游客新建手动12分钟书页恰好一次，再热导航恢复原角色/凭证/唯一书页与位置，库存和三种余额保持；没有完成计时、奖励经验或把手动页称为真实学习。

## 独立核验、图片与收尾

`verify.mjs`重新读取433份冻结输入与内层后端/工具摘要，核对原预算数值/Firefox适用预算、真实包/当前J3、浏览器/profile/签名前后。对八份校准与14份导航窗口的实际原始write事件，按序重新构造每方向共享时钟与字节总和，检查无提前超出3ms容差、真实上行/并发下载/延迟；再逐份判断游戏限值和数据，complete:true。没有CDP条件ID或字节计数伪字段。

只读QA库integrity/FK/请求唯一性通过：七个独立角色，各create1/study_create1/书页1，活动/计划/现实约定0、三种点数0、20金币/6种子/XP0。浏览器HTTP缓存/旧凭证和书页保持由实际UI与权威export共同检查，不是只看SQLite数量。

共10份实际PNG，独立核验PNG头/字节摘要；实际打开1.6Mbps缓慢加载、加载完成的登记、热重载后唯一书页和10Mbps书页详情四图。说明、重载按钮和保留凭证文字可读；继续等待能抵达真实登记，手动记录未完成/未发点。仅开发者复核，不扩大所有者画面批准，无新素材或UI处理。

BrowserServer正常exit0/非forced、临时Firefox profile删除；API/Nginx进程组退出；代理socket/待写/timer全0，取消校准的资源也清完，控制器没有补救浏览器清理。前后严格深度签名均exit0，Node/caffeinate随结束退出，没有系统网络/电源/Firefox全局设置更改，也未启动Docker。

只读审计598份可解析浏览器记录/1782份结束PID，无所属遗留、活动自动化或意外读错误；任务73精确空坏JSON仍是原负例。03:51:06Z原67850/67853/67854启动身份保持，5442主页/API8142 health/构建三项200，仍I3供人工复核。没有读写玩家库/玩家数据API或重试被拒的5442切换；用户浏览器、共享工具宿主和任务85默认profile保持。

实际命令：

```sh
node output/cocos-firefox-network/calibrate.mjs
caffeinate -di node output/cocos-firefox-network/controller.mjs
node output/cocos-firefox-network/verify.mjs
python3 output/cocos-firefox-network/audit.py
python3 output/cocos-firefox-network/manual-retained.py
node tools/cocos-sources.mjs --check
git diff --check
```

初校准28978终态1、第二次13899/最终26272均终态0；实际游戏38903与收尾31411终态0。原失败保留，没有游戏失败重跑或挑样。

## 交付边界

复用当前J3 source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e` / payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`、任务88封存包`77709984d30470abdf03af1e64937112a6e929ae580a4383994cd33a8f3a350d`的11个真实版本；本轮测当前入口，不再计旧标签/回退通过数。未改产品/后端/依赖/资产/迁移或包内容；本轮也不重建Creator、启动Docker、运行完整27套或194后端。

实验计划/源副本/限速器/校准/日志/QA库/图片放在忽略的`output/cocos-firefox-network/`及专属回归目录；本轮规范登记仍27 current加1 optional；这些Firefox替代测量在专项实验入口，尚未接入原CDP专用规范网络命令，不伪称新增规范套件。只更新10份任务/状态说明，无提交/推送/PR/部署、系统设置或默认入口切换。其他正式预算、Safari/物理横屏、系统IME/读屏/缩放、实际CI/生产与玩家条件仍按任务39开放，原Web保留。
