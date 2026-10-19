# Cocos 跨引擎与离开页面时的暂停

2026-10-18，接续任务39 V3/V5/V6。状态：H2三引擎代表链、原故障回归、五分钟定向采样、容器TLS与独立重建通过；人工已同库更新H2。玩家/实机/CI与完整退役门槛继续开放。

短计划：补真实Firefox/WebKit代表流程，保留全部异常；定位页面离开请求，再以同一持久请求身份验证暂停/重载接续。原Web、规则与正式部署保持。

## 实际发现与修复

G2在Firefox157通过4组/6PNG；WebKit27.2四组操作/状态均走完，但真实重载产生 `XMLHttpRequest … due to access control checks` pageerror，因此严格判失败。原 `run-8U2Orb` 与补充追踪 `run-e1t7QJ` 保留，没有过滤错误或放宽断言。

原hide在已经暂停的Life页离开时也发送world_pause；改为仅对原本可见的world暂停。H第一轮使暂停页重复blur/pagehide不发单、Chromium/Firefox通过，但WebKit世界重载仍失败：真实离开时尚未hidden，走到了XHR分支。对应 `run-q9iA34` 的pageerror调用栈与后续同一待确认暂停重放保留。

H2将Web的world_pause统一用带12秒上限的fetch keepalive发送，避免依赖hidden时序；先持久化再发送和原request_id/save_id/Bearer保持，回包未观察到时仍由原outbox幂等接续。普通业务请求、mini/native分支和原XHR超时保持；两条传输复用同一JSON/HTTP错误解析。此能力符合[Fetch keepalive语义](https://fetch.spec.whatwg.org/#request-keepalive-flag)，实际效果以本轮三引擎重载证据为准。

产品改动仅 `clients/cocos/assets/scripts/Bootstrap.ts` 的hide拥有权与 `platform.ts` 暂停发送/共用解析，来源清单同步。没有新视觉处理、素材/字体/音频、依赖、规则或模式迁移；任务66原文UI逐字节保持，待玩家复核的范围不变。

## H2证据

实际Creator3.8.8：源 `e87902de34721c96914d876d5fc9a53942fcf74a0974846428d735ca6ca76ddc`，266产物SHA256 `9f1309edfdcbe18b57e373ef4e547895756fabb3aac03d3e383d044c51eb5b5f`。

- `run-Lu46V0`终态0，三种引擎各6组/6PNG：Chromium156.0.8078.4、Firefox157.0、Playwright WebKit27.2。实际中文登记/原外观与20金币、WebGL、真实移动保存、地图/行囊、原委托文本与返回、中文研习存1次、同凭证重载与740横屏；新增暂停页重复blur/pagehide零新增暂停回执、世界页实际重载暂停恰好结算1次。全部零意外错误。各自独立QA、无成长/强角色/改库夹具。
- `run-iTiTMA`终态0：原consistency5、session6、semantics5，共16组；实际存储异常、500、两次真实12秒XHR超时、损坏记录、会话切换/恢复、DPR2与原生键盘断言通过。
- 原core17组及16种当前/旧键损坏表示通过；106真实SDK类型/绑定、388来源/107引用通过。没有把这些定向证据冒充一次完整25套或三引擎完整矩阵。
- `run-XtBIB1`终态0：最新H2实际Linux arm64容器/回环TLS7组4PNG，2136份站点文件逐字节相同，原Cookie/Bearer/移动/Life/旧标签/两个真实版本切回保持，API19源相同。候选 `output/cocos-lifecycle/candidate-h2`，8个真实版本，active `7b41a61cb9288776a86c0b9900cadd635d8dbbc5c3e487c6b99df9f708fd21e9`，artifactSHA256 `921d8ccf46811711ba29d3f5a3515cf6efebc789973d537feacbbc08b55ffb11`。TLS证书范围和容器修复见任务67。

Firefox返回renderer“Apple M1, or similar”、WebKit返回“Apple GPU”，仅记录原始诊断值，不能据此声称测试过M1或其他设备。实际宿主仍为任务65盘点的M4/16GiB/macOS15.7.7。Playwright WebKit UA含Safari不代表已安装Safari/手机Safari；实际OS输入法、读屏器、浏览器缩放、其他设备/网络及发布预算继续开放。

## 正在运行与收尾

H2新暂停传输增加AbortController/计时器，因此独立进行一次真实5分钟UI循环/GC归一化采样：`run-QUI7sp`/session97539，14:03:18.570至至少14:08:18.570，未结束前不记通过。它不替代任务65独立F原生45分钟，也不声称H2已做45分钟。

14:05只读清理审计：412浏览器记录/886已结束PID记录，按PID/开始时间/专属归属匹配无闲置遗留；只保留H2五分钟与独立F原生45分钟所属浏览器。H2容器/TLS浏览器、容器和网络均退出；Docker Desktop第二轮正在正常停止，完成后核验。人工G2在5442/API8142供任务66复核，用户原Chrome/IAB保留。

复现入口均为现有根Node22/锁定Playwright1.64；新测试引擎下载到 `output/cocos-browser-engines`，没有安装系统浏览器或更改账号设置。源码/产物在各次run开始结束核对，原失败与实际版本独立保留。无提交、推送、CI触发、注册运行器、正式部署或Web删除。


## 本轮本地收尾完成（14:10）

H2短采样run-QUI7sp/session97539终态0，实际elapsed304378ms，2组，零意外错误。GC归一化堆17,346,980→17,616,244字节（约1.55%）；DOM1文档/213节点/108监听一致，Cocos纹理63,332,216/缓冲285,554,736字节保持。此五分钟样本不证明所有泄漏不存在，不替代45分钟、物理显存或发布预算。

全新clean-source-jeTk7g的887输入在有锁离线npm ci、官方Creator独立构建前后全部不变；无旧项目缓存或原Web依赖/产物，266生产文件14,833,619字节与主H2逐字节相同。cold-build.json/session23365终态0。原390/435保护和diff检查再次通过。

旧G2人工session10980正常退出后只读备份manual-before-h2，原六表/结构snapshot569ae498…36cb前后相同；新session36849/launcher42188/API42191/proxy42192在原5442/8142/原DB/Cookie供人工复核，四端健康200。原用户Chrome/IAB未动。任务66阅读界面与G2相同，不重新扩大批准范围；其问题仍待答。

当前汇总凭据output/cocos-lifecycle/verification.json核对18引擎组、16规范组、2短采样组、7容器TLS组、独立重建与人工同库交接。它不把不同范围相加冒充一次完整25套或品牌浏览器矩阵。汇总首轮误读容器回执并不存在的active字段而失败；修正为核对实际artifactSHA和TLS访问日志中的当前版本路径，原回执/断言未改，没有重跑已通过检查。

Docker第二轮已停止，原后台39771/39772/39773均退出、CLI确认服务未运行，既有镜像/容器保留；专属镜像缓存与引擎下载留作复现。14:10审计412浏览器/889已结束PID记录无闲置遗留；仅独立F原生45分钟浏览器继续运行（对应其原source50c9…/payload3851…），不是H2长会话。原生结束后追加最终清理。


## 14:18最终清理与原生基线补充

独立F实际Chrome155/M4 Metal45分钟已完成，2组/5PNG、elapsed2702214ms、零意外错误、末尾移动保存通过。首尾GC后DOM213/监听108一致；中间未GC样本有波动（最高625/267），堆约+6.27%，不能报告为全程DOM恒定或零泄漏。具体版本、全部采样与边界见任务65和native-baseline-f.json，不扩大为H2原生45或发布预算。

最终只读审计412浏览器/892已结束PID记录，无闲置遗留/活动自动化浏览器。原生控制器、API/代理与caffeinate均退出；Docker进程为空。唯一保留H2人工session36849/42188/42191/42192，5442/API8142健康200，原用户浏览器保持。final-retained-resources.json与cleanup-audit.json保存实际核验。

当前可继续的外部门槛包括真实Cocos运行器（实查0）及提交/推送授权、实际设备/系统检查、发布网络预算与生产演练；任务66玩家问题待答。依据AGENTS.md:22，尚未进行提交、推送、账号设置或部署。整体目标仍未完成。

后续定向补查已接入统一 `pause` 套件，专门验证新fetch传输的存储/500/丢回包/损坏JSON/实际超时/401/422；维护版本三引擎21组/42PNG和4相关单元通过。实际Safari后台环境限制及418浏览器/908已结束PID最终清理见[任务69](69-cocos-pause-regression.md)。普通XHR故障证据保持独立，不以旧XHR用例替代新传输验证。
