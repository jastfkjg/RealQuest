# Firefox 弱网的仓库复验入口

2026-10-19，接续任务39 V6与任务92。已完成：仓库正式Firefox入口、代理TCP半关闭/保序修正、五相关单元、Firefox158/实际默认Headless Chromium156/同字节私有Chrome155各七样本及两种独立SIGINT收尾均通过。原系统Chrome包的Finder元数据签名前置失败保持，未改原包；私有代码副本另经严格验签、独立profile复验，不混同原包环境修复。完整V6和整体目标仍开放。

短计划：把任务92的校准模型、字节/共享时钟核验与固定范围预算移入根工具，扩展已有`cocos:test:network`的显式浏览器选择；增加传输完整性、严格证据、取消和参数单元；复验当前原生Firefox七样本、原默认Chrome七样本，以及有浏览器/校准中的独立SIGINT，最后核验图片、数据和资源退出。原5442/I3、原Web、游戏和后端保持。

## 实现

现有命令仍默认Chromium/CDP，增加`--browser firefox`。Firefox必须显式设置`REALQUEST_FIREFOX_EXECUTABLE`，采用原生`moz-firefox`/BiDi，记录真实UA并核对版本主号。没有静默切到维护版引擎或自动下载安装浏览器。旧artifact参数仍兼容，拒绝未知/重复参数、数据库、样本数和预算覆盖。

新根模块`tools/cocos-network-proxy.mjs`提供共享双向代理、八项自动校准、原始write共享时钟/字节重构和Firefox逐样本预算判断；校准与代理均支持收尾。加入HTTP页面资源的同代理来源检查。浏览器输入、书页保存和热接续共用原网络脚本的完整流程，没有复制另一套游戏规则。

Firefox专用固定范围预算在`tools/cocos-firefox-network-budget-v1.json`，与任务92、原Chrome预算的各速率/延迟/次数/耗时/字节数字相同，方法说明分别保留。它仍是本机HTTP应用层有效载荷参考，不模拟内核握手/ACK/丢包/DNS/物理链路，不合称容器HTTPS弱网或正式发布预算。

新增`network-proxy`根单元模块，统一单元登记23→24，浏览器登记仍27 current加1 optional。五相关单元session55517终态0：tool-lifecycle/source-ownership/browser-configuration/network-budget/network-proxy。实际四并发载荷逐字节一致、总吞吐上界、幂等关闭与下载中的校准取消/端口关闭通过；无新依赖或锁变化。

来源清单402→404，只增加两个根MJS工具/测试，并更新四现有工具摘要；预算JSON由真实命令明确冻结。改动前五文件在`output/cocos-firefox-canonical/before/`，任务92的433输入在编辑前已逐份核对，原七样本结果保持自己的源码/预算范围，不拿它当本轮新入口通过。

## 当前验证

当前J3/同77709984封存包。首轮Firefox158 `run-BWeDKC`/session95574终态1：reference后第二冷启动引擎JS转发报NS_ERROR_UNEXPECTED并超时，原错误/4PNG/QA库/源码前像保持，浏览器/profile/服务均已退出。

独立半关闭复现给出524350字节响应，旧代理只收到335404字节；上游close直接销毁另一端，未等延迟队列排空。修正为每流FIFO并在响应队列排空后转发EOF，同一响应逐字节完整524350、摘要一致；新增非均匀大载荷回归和原始write每流顺序检查。`failure-before-fix/`及`stream-reproduction-before.json`保留旧数据，原负例complete只表示复现完成、identical:false明确失败，不给代理授予通过。

修正后五相关单元session22073终态0，完整Firefox158 `run-G42YRm`/session55853终态0、七组/10PNG。10Mbps冷约13.7秒，1.6Mbps三份58757/58628/59036ms，全部原数值参考内，无意外错误，移动/同档书页通过。

原系统Chrome155.0.8059.80在session39570签名前置失败：resource fork/Finder information，不存在游戏worker/QA库/浏览器新实例；没有清理用户应用扩展属性或改写应用。另只读确认锁定Playwright1.64实际默认headless-shell revision1248/156.0.8078.4，预先记录`default-plan.json`、原数值适用范围后，清空可执行文件覆盖运行实际默认分支。该阶段`run-auKj25`/session36182终态0、七组/10PNG；它不称为原生Chrome155或官方安装包签名通过。


## 完整复验证据

| 范围 | 结果 | 10Mbps冷首屏 | 1.6Mbps冷首屏 | 热首屏 |
| --- | --- | --- | --- | --- |
| 当前原生Firefox158/BiDi、校准代理 | run-G42YRm，7组/10PNG | 13682/13626/13729ms | 58757/58628/59036ms | 2550–2619ms |
| 真实默认HeadlessChromium156/CDP | run-auKj25，7组/10PNG | 13646.4/13599/13626.9ms | 58135.9/58152.3/58114.6ms | 2638.6–2694.3ms |
| 同字节私有原生Chrome155/CDP | run-kdBdSr，7组/10PNG | 13663.8/13638.7/13525ms | 58396.2/58156.1/58376.9ms | 2517.7–2593.9ms |

原系统应用前置失败后，使用`ditto --norsrc --noextattr --noacl`在本任务目录创建私有Chrome副本。原包复制前后、私有副本697个普通文件共1,507,446,485B的全部字节、POSIX权限和符号链接相同；Finder/资源叉附加元数据不复制，原应用没有写入。严格验签通过，实际开发者为Google LLC、TeamIdentifier `EQHXZ8M8AV`，未重新签名、导入信任或更改默认浏览器/用户profile。没有将此描述为原系统应用元数据已修复，也未冒称本轮Apple公证新检查。

私有Chrome155 `run-kdBdSr`/session74226终态0，独立QA profile、原预算七样本通过，副本前后严格验签及1128输入/整副本文件摘要保持。reference冷4591.7ms/热2568.5ms原样保留；原reference项没有耗时上限，未删掉或重采此样本。副本文件作为可复核工具留在忽略的output，没有运行进程，不进入游戏包或Git。

Firefox冷/热代理有效载荷10,264,241/439B，默认CDP计数10,264,103/301B，两种语义分别保留。全部逐份满足原数字参考，首按移动、原凭证/save ID、位置/库存/三种余额和唯一手动研习结算通过。没有用均值、既有通过数或恢复重试替代失败；没有现实行为核验或奖励。

`run-dAJkNN`/session83364：独立父级在已核实PID/PPID/nonce/profile及reference完成后，只对该worker发送SIGINT。原结果exit1、cancelled:true、complete:false，1项已完成检查/3PNG；代理socket/timer/队列0，浏览器/profile与API/Nginx自行关闭，没有父级补救或超时。它只通过预期中断合同，不算七样本通过。

`run-tmny29`/session25699：在实际校准传输阶段定向SIGINT，原结果exit1/cancelled:true/complete:false、0项游戏检查/0图；校准端口/队列关闭，未创建QA数据库或浏览器。两父级验收器按预期终态0，未伪造原中断结果为complete:true。

`verify.mjs`独立重读正常Firefox/中断各428份、默认429份、私有Chrome1128份冻结输入，核对源/预算/当前J3/封存包、实际版本、原始共享时钟/保序/字节、全部原数值参考、图片、权威数据与清理。首次失败和任务92的原输入通过保存的前像分别核验，不假装历史SHA等于当前工具。旧524350→335404截断与修正后同摘要完整字节也分别保留，独立核验complete:true。

五份只读QA库integrity/FK/重复请求正常：共23角色，各create1/study_create1/书页1，活动/计划/现实约定0、点数0、20金币/6种子/XP0；三份完整运行各7，首次失败与就绪中断各1。校准中断与原系统Chrome原包签名前置均没有玩家库。37份实际PNG（三正常30＋就绪中断3＋首失败4）已核验摘要/格式，实际打开首失败、修正后缓慢加载/唯一书页、默认引擎详情及私有Chrome热接续五图；文本可读、记录与QA一致，不扩大所有者视觉批准。

五个临时profile均删除，所属浏览器/API/Nginx/Node/caffeinate退出，校准取消也清完，controller没有浏览器补救。04:46:08Z只读审计603份可解析浏览器记录/1838份结束PID，无所属遗留、活动自动化或意外读错误；任务73精确空坏JSON保留。原67850/67853/67854启动身份未变，5442/API8142/构建三项200，仍I3。用户浏览器、共享宿主与任务85默认profile文件保持，未读写玩家数据、改系统Chrome扩展属性或绕过5442更新拒绝。

本轮只更改8份规范工具/配置/来源文件，以及本任务/任务39/92、README/TODO/progress、Cocos README与本地/交付说明。来源404/107，catalog `f189c471be8fae2528df7c540840998693cfaa100ed3ebaa31c94bc3e005a8a9`；新增两个MJS、四旧工具摘要变化，无移除。新预算JSON显式冻结；原预算SHA `1b867f45b1e9c686a238393f062711a9c3546357054958f01ce26ff8f4ced778`，Firefox范围预算 `3a94bb129b063c809d1b387401cd870521aab8676de3121e611c8ccf7db326d1`。J3源码bd5385…/产物9ed7…与77709984包11版保持，没有Creator、全27、194后端或新CI通过数。

实际验证命令：

```sh
node tools/cocos-sources.mjs --write
node tools/cocos-sources.mjs --check
node tools/cocos-unit.mjs --only source-ownership,browser-configuration,network-budget,network-proxy,tool-lifecycle --report output/cocos-firefox-canonical/unit-after-stream/result.json
node output/cocos-firefox-canonical/reproduce-stream.mjs
caffeinate -di node output/cocos-firefox-canonical/controller-next.mjs firefox final
caffeinate -di node output/cocos-firefox-canonical/controller-default.mjs chromium
node output/cocos-firefox-canonical/prepare-private-chrome.mjs
caffeinate -di node output/cocos-firefox-canonical/controller-private.mjs chromium
node output/cocos-firefox-canonical/private-identity.mjs
caffeinate -di node output/cocos-firefox-canonical/controller-next.mjs interrupt
caffeinate -di node output/cocos-firefox-canonical/controller-next.mjs calibration-interrupt
node output/cocos-firefox-canonical/verify.mjs
python3 output/cocos-firefox-canonical/audit.py
python3 output/cocos-firefox-canonical/manual-retained.py
git diff --check
```

首次失败95574/系统Chrome前置39570均终态1；修正后单元22073、Firefox55853、实际默认36182、就绪中断83364、校准中断25699、私有复制21257/原生副本74226与最终收尾77062均终态0。原源、失败、负例、日志和QA数据保留在output，不应重放旧PID或覆盖封存包。五相关单元覆盖本次变化，未宣称24个模块全部重跑。

公开命令形式（需要本机实际原生Firefox路径和已生成候选包）：

```sh
REALQUEST_FIREFOX_EXECUTABLE="/absolute/path/to/firefox" npm run cocos:test:network -- --artifact output/<release> --browser firefox
npm run cocos:test:network -- --artifact output/<release>
```

公开命令本身只依赖仓库工具与显式候选包/浏览器；一次性验收器、初始源副本、原始记录和收尾证据放在忽略的output。未提交/推送/PR/部署、启动Docker或更新人工试玩；没有新画面处理或扩大玩家批准。任务39其余系统/实机、Safari、完整发布预算、实际CI/生产与原待答门槛继续开放。
