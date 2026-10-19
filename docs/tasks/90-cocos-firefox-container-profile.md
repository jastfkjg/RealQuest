# 原生 Firefox HTTPS 与临时 profile 清理

后续：[任务91](91-cocos-native-firefox-session.md)已补当前J3原生Firefox158单次45分4.35秒/94采样/7PNG及同档移动保存。该Python代理会话与本任务HTTPS分开，不合称HTTPS长期性能；RSS仅诊断、GC堆/监听器与正式预算未覆盖，Firefox弱网继续。

2026-10-19，接续任务89和任务39 V6。本轮完成原生Firefox158.0在相同77709984包/既有Linux arm64镜像下的七项HTTPS交付及独立中断，并修复共用自动化工具遗漏Firefox profile的问题。整体目标继续active，Firefox弱网/长期性能、系统与物理设备、实际CI/生产及玩家门槛仍开放。

短计划：核对上一轮终态和原生Firefox；补精确profile记录/归属校验；验证相关单元、原七种Chromium生命周期和一次真实Firefox活进程清理；临时Docker中复用精确镜像，执行HTTPS接续/旧版本/入口回退及中断；按实际状态核对截图、QA库和全部进程/临时目录。

## 实际修复与失败保留

任务84的真实`run-v4uyx0`回执没有profile字段，但其`native-result.json`已从实际Firefox进程另记`--profile`目录，原记录仍保持。共用工具之前仅解析`--user-data-dir=`，活浏览器兜底也只认这一种形式；这使原生Firefox的归属校验和临时目录追踪不完整。`prior-firefox-profile-gap.json`保留该直接证据，不伪造历史清理失败。

本轮代码：

- `tools/cocos-browser-config.mjs`从实际spawn argv记录Chromium的`--user-data-dir=`、原生Firefox的`--profile`和维护版Firefox的`-profile`；缺值/冲突不猜测。
- `tools/cocos-browser-cleanup.mjs`保留nonce/父PID/进程组要求，并以准确标记或已知profile辅助确认；不按应用名清理。signal0 EPERM保守地视为仍活，不能据此声称已退出。
- `tools/test-cocos-browser.mjs`检查三种真实参数形状、元字符/空格记录、缺失/冲突、相邻路径与错误参数。

首轮四模块运行在browser-configuration处失败，发现未经引号区分的ps文本会把空格路径前缀误当完整值。原日志/源在`unit-attempt1/`保留，complete:false，network-budget当时未执行。最终规则完整记录argv，但有空格的ps路径单独不足以证明归属；不明情况保留进程并报错，不能把测试期望改成宽松接受。

最终四模块tool-lifecycle/source-ownership/browser-configuration/network-budget均通过，session2880终态0。生成源清单仍402文件/107绑定，只有上述三份工具条目摘要变化；源码清单SHA256为`d930eb590ffb39d62aa0acfee68453af7547936dd4d874eb7c9430439125dd26`。没有产品/后端/运行时/依赖锁/素材更改，也没有引擎重建。

## 实际生命周期验证

session98256终态0，`infrastructure-result.json` complete:true。

| 范围 | 实际证据 |
| --- | --- |
| 原七种Chromium生命周期 | normal、failure、timeout、service-exit、cancel、startup-cancel、occupied均按原合同通过；后六项是预期失败/取消，不是游戏通过数。 |
| 原生Firefox活进程清理 | `run-cqLEiv`使用真实隔离API/QA库和已加载的Cocos入口，新Firefox profile被正确记录。父任务只清理这一个明确归属的活浏览器组；helper记录`owned-profile-and-process-group`，进程收到SIGTERM退出，worker随后写closed:true，profile删除。 |

第二项专门验证之前缺失的Firefox路径；它的父级清理一次是预先设计的基础设施行为，不混入产品案例“无需补救”的结论。原native profile只是自动化新目录，未连接用户已有profile。实际进程使用官方二进制、`--remote-debugging-port=0`及BiDi通道，没有juggler；未调用CUA窗口绑定。

Chromium timeout负例的worker按预期被终止，原BrowserServer回执保持closed:false，实际浏览器组已消失。该例留下一个本轮Playwright临时目录；核对nonce/父PID/出生时间、临时目录范围、进程组/ps无匹配、该QA库0角色后，收尾仅删除这一精确目录。`timeout-profile-cleanup.json`保留补充操作，不把它改称worker finally自行清理。

## Firefox 真实容器 HTTPS 已通过

session64346终态0，19:35:14.429–19:36:01.573UTC。前后Firefox深度严格codesign均退出0；复用[任务84](84-cocos-native-firefox.md)的官方Mozilla签名/公证158.0应用，仅在output，没有系统安装或默认profile操作。锁定Playwright1.64.0的`moz-firefox`/WebDriver BiDi实现及binary/Info均冻结。

使用与任务89完全相同的候选和镜像，未新构建、拉取或推送：

- 包SHA256 `77709984d30470abdf03af1e64937112a6e929ae580a4383994cd33a8f3a350d`，11真实版本/2946站点文件。
- Web镜像 `sha256:e43f1ce36a9a9ca4c2a70dba9f04b8c584c17adb45155490e723a548644b5afb`。
- 原API镜像 `sha256:7697a1455e27eeb9d4e0ab1c446059bc741b211679630fa6adfdb2a6ca6532c9`；19后端源/28锁版本在容器内实际核验一致。
- 原J3 source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e` / payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`，269产物仍相同。

实际Firefox版本158.0/UA Firefox158.0/原生BiDi进程与profile一致；UA的MacIntel/10.15是兼容字符串，不当作宿主架构证明。Docker29.3.1/Linux arm64，容器Nginx1.31.7/Alpine3.24.2、API Python3.14.8。

临时一日回环证书：Firefox仅在新QA userContext通过`acceptInsecureCerts`例外接受，Node请求独立验证精确QA CA；未向系统信任库导入。证书/SPKI哈希作为证书内容记录，不称为Firefox浏览器SPKI绑定，也不证明公开生产证书链。

| 运行 | 实际结果 |
| --- | --- |
| normal `run-FazvTS` | 七项/四PNG，0/complete:true，无浏览器错误或混合内容。 |
| interrupt `run-nAmbrg` | 新容器/网关/Firefox ready后只给所属worker发SIGINT；130/cancelled:true/complete:false，保留前五项，无游戏截图；浏览器/网关/容器/网络自行清理，控制器补救0。 |

七项覆盖全部2946文件字节、269运行资源HEAD/MIME/immutable/gzip、真实404及根图标204、TLS相对302/查询参数/no-store、Secure/HttpOnly/Strict Cookie与跨源拒绝、原Cookie/Bearer同档接续、实际移动保存/740现实成长、旧标签重载/第二真实引擎版本/入口切回。核对的角色、物品、任务、成长余额等稳定字段保持。实际Firefox旧页根图标请求在TLS日志中收到204。

## 数据、截图与清理

`verify-container.mjs`及`verify-infrastructure.py`独立通过：426冻结容器输入、当前源/构建/包/镜像、原始生命周期、协议/profile/证书、QA库和图片核验。九个实际SQLite库均integrity ok、外键/重复结算0，共2个由准备API创建的接续QA角色，各一条create，20金币/6种子和三种点数0；没有学习书页、活动、计划或现实约定。occupied负例没有创建库。没有读写玩家库/玩家数据API。

实际查看Firefox740空成长页、旧版本世界和切回当前J3三图；中文/主要操作可读，空列表和资源符合夹具状态。四份实际PNG的路径/哈希已核验，`visual-review.json`只记录开发者复核，不扩大玩家批准，也未新增素材。

九个临时profile均移除（六Chromium、三Firefox，其中一个目录按上述补充收尾）；两TLS BrowserServer正常退出0/非forced，活清理Firefox如实保留SIGTERM状态，原timeout closed:false也未改。只读审计594份可解析浏览器记录/1757份结束PID，无所属遗留/活动自动化/意外读错误；任务73精确空坏JSON继续按原负例保留。

Docker临时启动后，按归属移除业务案例的4个容器/2网络/2TLS网关及一次性API核验容器，再核对原18容器状态、160卷名称、网络和原镜像身份，恢复原停止状态。没有访问原卷内容或结束用户工作负载。本轮没有新运行服务保留。

原67850/67853/67854启动身份不变，5442主页/API8142 health/构建三项200，仍I3供人工复核；用户Chrome/IAB/共享宿主与任务85默认Firefox profile均保持。

## 实际入口与范围

```sh
node tools/cocos-sources.mjs --write
node tools/cocos-sources.mjs --check
node tools/cocos-unit.mjs --only source-ownership,browser-configuration,network-budget,tool-lifecycle --report output/cocos-firefox-container/unit/result.json
caffeinate -di node output/cocos-firefox-container/run-infrastructure.mjs
caffeinate -di node output/cocos-firefox-container/run-all.mjs
node output/cocos-firefox-container/verify-container.mjs
python3 output/cocos-firefox-container/verify-infrastructure.py
python3 output/cocos-firefox-container/audit.py
python3 output/cocos-firefox-container/manual-retained.py
git diff --check
```

首轮单元失败session15934终态1、最终单元2880/基础设施98256/容器64346均终态0。产物/原始源副本/签名/日志/图片/证书/QA库在忽略的output，复用实际镜像，不能重放旧PID或覆盖封存包。

实际仓库变化只有三份共用工具、生成来源清单及本任务/任务39/84/89和状态/交付说明；未改游戏、后端、规则、锁、资产或迁移。规范登记仍27 current加1 optional原Web比较；没有本轮全27、194后端、Creator、Firefox弱网或45分钟通过数。任务89的Edge七网络仍为它自己的真实环境，未当作Firefox结果。

Firefox弱网/长会话、其他目标品牌、物理横屏、系统IME/读屏/原生缩放、正式发布预算、实际CI/生产域名证书/PG角色与玩家其余验收继续按[任务39](39-cocos-primary-retirement.md)。原三个待答和5442停止/切换审批拒绝边界保持；没有提交/推送/PR/部署/默认入口切换或原Web删除，整体目标未完成。
