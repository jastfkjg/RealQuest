# 原生 Edge 更新、回退与交付清理

后续：[任务89](89-cocos-edge-container-network.md)已完成本文新77709984包的本机Edge/linux arm64/回环HTTPS与独立固定HTTP七网络样本；本文“尚待容器/HTTPS/网络”是任务88结束时的历史状态。正式生产/其他目标/实机/系统/CI和玩家条件继续开放。

2026-10-19，接续[任务87](87-cocos-native-edge-network.md)和任务39 V6/V7。上一轮固定网络七样本属于实质进展。本轮最终完成真实Edge的九项Nginx交付检查及六种生命周期；发现并修复旧页面根图标404、取消时存活探测/清理回执与失败即停止清理的问题。整体目标继续active。

短计划：复用现有公共交付/生命周期入口补实际Edge选择和严格版本核验；用当前J3及保留的真实旧版本完成接续→移动→旧标签重载→进入旧版本→切回；逐项保留故障和修复证据，最终核对来源、QA数据、截图与所属进程退出。原5442/I3、玩家数据、用户浏览器和原Web保持。

## 实现与真实缺口

`tools/test-cocos-delivery.mjs`现在与网络入口一样支持`REALQUEST_CHROMIUM_EXECUTABLE`，回执保留实际Browser.getVersion产品/完整版本。`validateChromiumProduct`位于共用`tools/cocos-browser-config.mjs`；原`validateNetworkBrowser`以导出别名保留，完整版本核验逻辑逐字相同。Chrome/HeadlessChrome/Edg可用，不能将Edge内核版本当产品版本。没有伪造UA、安装系统应用或修改默认profile。

首轮真实Edge `run-P2r0gF`只有八项/五PNG，complete:false。旧保留版本`e28e1354…22aa1`未声明图标，Edge会额外请求根`/favicon.ico`；Nginx access.log:575证明它实际收到404，浏览器错误使最后一项失败。这不是人为missing.js等404夹具，未过滤该错误，也未将八项算九项。

`deploy/cocos/nginx.conf.template`增加精确根图标空响应：204、空body、no-store、nosniff，与当前页面的data空图标一致。版本路径下不存在的JS/PNG/WASM/map仍须真实404，无游戏HTML回退。公共交付检查新增对应HTTP断言；最终access.log也证明真实Edge旧页面请求得到204，不只验证Node请求。未添加/替换素材，没有在旧HTML里补标签或覆盖旧包。

第二轮`delivery-lifecycle-483Ki2`中normal `run-f0BiFp`九项/五PNG已过，但interrupt `run-4ZiZK4`报`service cleanup: kill EPERM`，缺services回执，旧验证器随后TypeError；其余四模式未执行。初修只处理发送信号仍不完整，进一步检查确认signal0存活探测也会抛EPERM，finally中的状态映射同样受影响。

最终交付清理规则：

- 存活探测遇EPERM保守地视为仍存活，与现有网络工具一致；只有ESRCH证明进程组已消失。
- 一个组的信号失败也继续清理其他组；有界等待正常退出后，仅对本次所属残留组执行原有强制兜底。finally总是记录服务状态。
- 发送信号失败后，只能在复核已无该组时作为消失情况记录；仍存活则保留失败。`cleanupSignalErrors`不能授予通过。
- `validateDeliveryProbe`明确拒绝缺服务状态、清理错误、信号错误、实际残留或探针补救，避免把清理失败算作预期取消成功。正常/三种信号/启动取消/API退出仍是原六模式，未缩减。

## 有控制的失败验证

仅在output诊断脚本中，对专属QA API的一次SIGTERM注入EPERM，signal0和其他组保持真实；记录注入来源与精确PID/控制器，不修改系统权限。它与前述真实原生失败分开。

| 注入尝试 | 原始结果与含义 |
| --- | --- |
| `run-kizsSD` | 首次发现清理遇错提前返回，两个服务句柄使控制器不能退出；90秒探针保护触发，按原PID/启动身份补救清理两组。脚本14966终态1，原false/超时/补救记录保留，不计通过。 |
| `run-zUI2vd` | 初修后仍因signal0 EPERM丢失最终服务状态，诊断脚本94494终态1；无探针服务补救。原false保留。 |
| `run-8qXj5F` | 最终规则下，子任务明确1/complete:false，保留一条注入信号错误；API经所属SIGKILL兜底、Nginx正常退出，探针补救0。最终验证器拒绝这个清理错误，诊断脚本52043终态0。 |

这证明失败不会被吞掉、其他资源仍清理；不是一次游戏通过，也不是实际OS拒绝权限的证明。首次两个补救事实未改写成原工具自行清理成功。各阶段源/回执在`attempt1/`、`attempt2/`、`permission-first/`、`permission-second/`等保留。

## 最终六模式与封包

`caffeinate -di node output/cocos-edge-delivery/controller.mjs`的session20629终态0；18:18:39.197–18:19:19.556UTC完成，生命周期矩阵`delivery-lifecycle-iv8pfd` complete:true。官方签名Edge155.0.4283.62，实际CDP `Edg/155.0.4283.62`，headless1440×900/740×360、macOS arm64，Nginx1.31.2。官方包来源沿用[任务83](83-cocos-native-edge.md)，最终执行前后codesign严格深度校验均退出0。

| 模式 | 实际子任务 | 结果 |
| --- | --- | --- |
| normal | `run-yHfpif` | 0/complete:true，九项交付/五PNG、无浏览器错误 |
| interrupt | `run-PWLtwo` | 1/cancelled:true/complete:false |
| terminate | `run-Z7ilhA` | 1/cancelled:true/complete:false |
| hangup | `run-2ebsK1` | 1/cancelled:true/complete:false |
| startup-cancel | `run-0uO4FM` | 1/cancelled:true/complete:false，浏览器未启动 |
| service-exit | `run-WV0q03` | 1/cancelled:false/complete:false，真实API退出 |

后五项是基础设施负例，非额外游戏覆盖。最终六模式无清理错误/残留/探针补救；五个BrowserServer正常退出0、非forced，12个API/Nginx组退出。原来的失败轮和normal通过片段未拼成这次完整矩阵。

新封存包`output/cocos-edge-delivery/candidate-j3-edge`：

- artifact SHA256 `77709984d30470abdf03af1e64937112a6e929ae580a4383994cd33a8f3a350d`。
- active仍`260b75754510b58e843ffacb41fddc61a7f9f58c6e79ec97068c06103af065cf`，保留11个真实引擎版本。
- 与原`output/cocos-j3-delivery/candidate-j3`相比，只改`nginx.conf`/`nginx.conf.template`；全部2946份站点文件/版本路径、大小和SHA一致。
- 原包SHA `2f8e4a59e59767bb68f5cfd7e19ca0430f212aad537993ca6efab5368cc26df5`保持。没有覆盖已封存包或更改内容身份下的资源。

J3引擎仍source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e` / payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`，269文件/15,175,449字节。新封包不是一次Creator重建或新镜像。

九项实际覆盖269个运行资源HEAD/MIME/immutable、gzip字节、入口302/no-store/查询参数、真实404及空图标兼容、同源Cookie/no-store与跨源拒绝、原Cookie/Bearer同档/ledger接续、真实移动保存/740成长页、旧标签重载、进入第二真实引擎版本及根入口切回。没有倒灌数据库、创建替代旅程或清空凭证。

## 独立复核与收尾

`verify.mjs`重算426冻结输入、五份实际来源变动、共用版本核验逻辑/网络别名、当前J3与两份完整封包、全部六模式/五张PNG/临时profile、旧失败及最终注入负例，complete:true。来源数量仍402/107绑定，规范登记仍27 current加1 optional原Web比较，没有冒称新全量回归。

四相关单元（source-ownership、browser-configuration、release-packaging、network-budget）通过；路由修复后source-ownership/release-packaging两模块复验通过。随后工具清理变化由真实六模式和注入负例验证，来源/语法/空白检查通过。未重跑194后端、全27套、七份网络或Creator；原网络预算字节未变。

`all-qa-and-profiles.json`只读核对本轮全部12个隔离QA库：integrity ok、外键/重复结算0，共3个各一create的角色，均原姓名/外观、gold20/seed6、三种点数0、书页/计划/活动/现实约定0；其余9库无角色。11个临时浏览器profile均已删除。没有访问玩家库/玩家数据API。

实际查看最终740空成长页、旧标签和入口切回三图，以及首轮失败的真实旧版本场景；空列表/状态/主要按钮可读，角色/资源保持。`visual-review.json`记录四张检查范围，没有新的所有者批准或美术新增。

最终只读审计582份可解析浏览器记录/1674份结束PID，无所属遗留/活动测试/意外读错误；历史任务73精确空坏JSON仍按原负例保留。原67850/67853/67854启动身份未变，5442主页/API8142 health/构建三项200，仍I3供人工复核；用户Chrome/IAB及共享宿主保留。本轮没有新运行服务保留，包/解包应用/QA证据为非运行文件。

主要实际命令（均已结束）：

```sh
node tools/cocos-sources.mjs --write
node tools/cocos-sources.mjs --check
node tools/cocos-unit.mjs --only network-budget,source-ownership,browser-configuration,release-packaging --report output/cocos-edge-delivery/unit/result.json
node tools/cocos-unit.mjs --only source-ownership,release-packaging --report output/cocos-edge-delivery/unit-after-favicon/result.json
node tools/cocos-release.mjs --build web-release-framing-j3/web-desktop --output output/cocos-edge-delivery/candidate-j3-edge --previous output/cocos-j3-delivery/candidate-j3
node output/cocos-edge-delivery/permission-final.mjs
caffeinate -di node output/cocos-edge-delivery/controller.mjs
node output/cocos-edge-delivery/verify.mjs
python3 output/cocos-edge-delivery/audit.py
python3 output/cocos-edge-delivery/manual-retained.py
```

控制器调用原公开`tools/test-cocos-delivery-lifecycle.mjs --artifact <新包>`；保留的原生失败和两次不通过诊断均如上，不计入最后命令的通过数。

实际代码变化：`deploy/cocos/nginx.conf.template`、`tools/test-cocos-delivery.mjs`、`tools/test-cocos-delivery-lifecycle.mjs`、`tools/cocos-browser-config.mjs`、`tools/cocos-network-budget.mjs`及生成来源清单；另更新本任务与状态/本地交付说明。无产品/后端/规则/依赖锁/资产/迁移更改，无新下载、安装、Docker启动、Git外部写入、部署、默认入口切换或Web删除。

## 仍开放

本轮是本机原生Edge/HTTP交付和工具生命周期；新包尚未做其自身的容器/HTTPS/七网络复验，任务80旧包TLS和任务87旧包网络保留为各自真实历史范围。其他目标品牌、物理横屏、系统IME/读屏/原生缩放、正式发布预算、实际CI/生产和玩家其余验收继续按[任务39](39-cocos-primary-retirement.md)。原5442切J3停止动作的审批拒绝与原三个待答问题保持，不重问或绕过；原Web保留，整体目标未完成。
