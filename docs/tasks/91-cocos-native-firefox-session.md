# 当前 Cocos 的原生 Firefox 长会话

后续：[任务92](92-cocos-native-firefox-network.md)已补同J3原生Firefox158的经校准代理七份HTTP弱网与同档唯一书页。它与本任务长会话、任务90容器HTTPS分别测量，不合称HTTPS弱网或长期性能；正式预算/系统/实机等仍待验收。

2026-10-19，接续任务39 V6及任务84/90。官方Firefox158.0/current J3独立一分钟预检与单次45分钟均通过，长会话94份采样/7PNG，无意外错误；同档、凭证、资源与结束后移动保存检查通过。仅补本机工程候选证据，不关闭完整V6。用户再次确认启动故障页可以保留，范围仍仅限该页。

短计划：复用任务86的单次1/45分钟交互循环，按原生Firefox实际能力固定测量项；独立QA库/回环端口/Cookie/profile，先预检再完整45分钟；终态后独立核对输入、数据、截图、签名和进程退出。原5442/I3人工试玩保持不动。

## 固定输入与测量范围

- 官方Firefox158.0 zh-CN，项目内私有应用、原生`moz-firefox`/WebDriver BiDi，Playwright1.64.0。没有安装到Applications、连接用户profile或更改系统信任/默认浏览器。
- 当前J3 source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e` / payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`，269产物；Python回环代理，不是容器HTTPS或弱网测试。
- 预先固定`output/cocos-firefox-soak/budget-v1.json`：四份120间隔帧样本median≤20ms/p95≤33.4ms，引擎纹理≤128MiB/缓冲≤512MiB，分钟间隔≤90秒，同场景同视口连接DOM元素不增长。前三类数字沿用任务78适用的工程参考；没有在结果后放宽，也不是所有者批准的发布/手机预算。
- Firefox页面实际不暴露`performance.memory`和`measureUserAgentSpecificMemory`。本轮不测CDP强制GC堆、全部DOM/监听器或实际显存。另记本次浏览器及后代RSS总和，仅供诊断：共享页可能重复计入，不等于JS堆、私有物理占用或已满足发布内存预算。
- 一次性准备隔离游客、第五层100HP首领/微光杖/长预兆，之后不改夹具或时钟。每分钟成长→地图→成长→中文草稿/wasdmiln输入→取消→世界→角色→成长，740×360/844×390交替；结束后真实移动并向原服务端保存。不是自然战斗、现实行为核验或学习发点测试。
- 首次失败预检冻结428输入；修正后预检与45分钟冻结429输入，包含402来源、后端、驱动、脚本、预算及应用身份。独立核验确认两成功轮冻结集逐份相同、当前402来源/107绑定通过，catalog仍为`d930eb590ffb39d62aa0acfee68453af7547936dd4d874eb7c9430439125dd26`；没有借用任务86的时长或通过数。

## 预检与测试修正

`run-P1Rjby`完成一分钟采样后失败，`complete:false`/worker exit1，原始六份采样、五图、日志及脚本副本保留。失败的断言是客户端请求正文计数0而预期1。

当前锁定Playwright的`BidiRequest`实际将`postDataBuffer`设为null；不能用`request.postDataJSON()`数原始create正文。只读QA库有且仅有一个角色/一条create回执，未有书页、活动或点数。修正只在output测试：改由权威`/api/export`回执断言create恰好一次、study_create为0且非world回执保持；请求正文可用性仅记录诊断。没有修游戏或放宽性能标准，原失败也不改成通过。

修正后`run-jLD4or`/session12181终态0：64,457.27ms、六份采样、五PNG、三检查，无意外错误；160个command事件正文均不可见，服务端create回执为1、study_create为0。已实际查看740世界与空成长页。浏览器正常0/非forced，profile删除，服务子进程退出、控制器无补救清理。

沙箱内只读codesign曾报invalid signature，原输出另存`pre-signature-sandbox/`；宿主同一只读命令session30892终态0，深度严格签名通过。未修改应用或将沙箱失败隐去。

## 实际完整结果

`run-aEgYEe`/session27654终态0。计时起点`2026-10-19T02:49:31.980Z`，单次monotonic测量2,704,345.54ms（45分4.35秒），最终比较/移动/关闭至03:34:44，未拼接预检或失败片段。

| 实际指标 | 结果 |
| --- | --- |
| 采样/截图/检查 | 94 / 7 / 3 |
| 成长页首尾连接元素 | 38 / 38 |
| 世界首尾连接元素 | 35 / 35 |
| 引擎纹理/缓冲峰值 | 62,966,600B / 77,891,912B |
| 四份120间隔帧样本 | median约16.66ms，p95为17.20–17.54ms |
| 最大分钟世界采样间隔 | 63,727.32ms，低于90秒 |
| 同save ID/凭证/非world回执/资源与记录 | 保持；create恰好1、study_create为0 |
| 会话后移动 | 实际右移，原服务端保存成功 |

RSS诊断范围810,576–2,550,176KiB，成长页首尾2,549,440/869,184KiB、世界2,508,560/886,336KiB。原始波动保持；不能把下降当作零泄漏证明，也不能把sumRSS当作GC堆或物理显存。Firefox隐去/概括的renderer字符串不能证明实际M4/Metal后端；宿主型号与浏览器报告分开解释。

独立`verify.mjs`重算两成功轮的429冻结输入/预算/构建/94与6采样/四帧序列/间隔/12张实际PNG/原生版本/权威回执/QA库与退出状态，complete:true；同时核对首次失败的原始428输入与归档脚本、保持失败和不计时长。草拟verifier首次用错verifyBuild返回字段而退出1，原稿/错误留在`verify-draft1*`；改用真实sourceFingerprint/payloadFingerprint后通过，worker/controller/预算未变。

`all-qa-verification.json`只读核对三份QA库：integrity/FK/唯一请求正常，各1角色/create1，书页/计划/活动/现实约定与三种点数均0，20金币/6种子、XP0。人工准备的微光杖不算赚取奖励；正常位置/revision/暂停恢复回执会随操作变化，未宣称整库字节不变。

实际打开六张图：预检740世界/空成长页及完整会话15/30/45分钟和移动保存后画面。中文与主操作可读，玩家/首领可见；最后移动后镜头拉远，主要对象仍在视口。`visual-review.json`只记录开发者复核，未扩大所有者对J3取景/战斗/其他画面的批准。无新资产或视觉改动。

## 收尾与未覆盖项

宿主应用后签名session79201终态0；严格深度签名前后均通过。三轮BrowserServer均正常exit0/非forced、profile均删除、API/代理子进程退出，控制器没有补救浏览器清理。防休眠随控制器退出，未改全局电源设置。

只读审计597份可解析浏览器记录/1772份已结束PID记录，无所属遗留、活动自动化或意外读错误；任务73精确空坏JSON继续作为原负例保留。没有使用CUA或重试任务85的默认profile路径。本轮未启动Docker；用户浏览器、共享宿主与原人工预览保持。

03:35:43Z核验原67850/67853/67854启动身份不变，5442主页/API8142 health/构建三项200，仍为I3供人工复核。没有读写玩家库或玩家数据API，没有中断/更新5442，也未绕过此前自动审批拒绝。原待答授权不重问。

实际入口：

```sh
caffeinate -di node output/cocos-firefox-soak/controller.mjs 1
node output/cocos-firefox-soak/pre-signature.mjs
caffeinate -di node output/cocos-firefox-soak/controller.mjs 45
node output/cocos-firefox-soak/verify.mjs
node output/cocos-firefox-soak/post-signature.mjs
python3 output/cocos-firefox-soak/audit.py
python3 output/cocos-firefox-soak/manual-retained.py
node tools/cocos-sources.mjs --check
git diff --check
```

本轮仓库变化仅本任务及相关状态/验收说明，实验文件均在output；未更改游戏/后端/规则/锁/资产/迁移、规范登记仍27 current加1 optional，未重建Creator或重跑规范27套/194后端。实验脚本/预算/QA库/图片保存在忽略的output。没有提交/推送/PR/部署、默认入口切换或删除原Web。V6完整发布预算/Firefox弱网、Safari与物理设备、V5系统输入/读屏/原生缩放及其他实际CI/生产/玩家门槛仍按任务39开放。
