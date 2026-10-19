# 新交付包的 Edge 容器、HTTPS 与网络复验

后续：[任务90](90-cocos-firefox-container-profile.md)补同包/既有镜像的原生Firefox158 HTTPS与中断，profile识别/归属清理及相关基础设施验证通过。本文Edge七网络不作为Firefox预算或性能结果，正式目标/设备/玩家门槛仍开放。

2026-10-19，接续[任务88](88-cocos-native-edge-delivery.md)和任务39 V6/V7。上一轮修复真实根图标404和交付清理，属于实际进展；本轮对其新77709984静态包补真实Linux arm64镜像/原API/Edge回环HTTPS，以及随后独立执行的固定七份网络样本。两阶段均通过，整体退役目标仍active。

短计划：核对Docker原停止状态；临时启动并记录原工作负载；用既有工具构建新镜像、核验API、执行正常HTTPS和有归属中断；清完自身资源并恢复Docker停止；再以同一静态包执行原公共网络七样本，最后复算/看图/查QA库与进程。原5442/I3、玩家数据、用户浏览器及原Web保持。

## 精确候选与工具来源

- 静态包：`output/cocos-edge-delivery/candidate-j3-edge`，artifact SHA256 `77709984d30470abdf03af1e64937112a6e929ae580a4383994cd33a8f3a350d`。
- active `260b75754510b58e843ffacb41fddc61a7f9f58c6e79ec97068c06103af065cf`；11个真实版本、2946份站点文件不变，没有覆盖旧2f8e4a59封包。
- 原J3 source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e` / payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`，269产物/15,175,449字节；Creator3.8.8 release身份不变，没有新引擎重建。

容器脚本从[任务80](80-cocos-j3-container-https.md)的实际脚本复制到`output/cocos-edge-container/`，原源文件及SHA保留。只适配证据目录、精确新包、官方Edge可执行文件/严格CDP版本、根图标204断言和保守EPERM存活探测；原七项与独立ready阶段中断保留。网络控制器复用任务87，仍调用根公共`tools/test-cocos-network.mjs`，不改规范工具、样本或预算。`plan.json`在执行前声明范围；425份容器输入、426份网络输入在各自阶段冻结。

Node22.23.2、Playwright1.64.0，实际官方Edge155.0.4283.62，CDP `Edg/155.0.4283.62`；不是默认Chromium或改UA代替品牌。网络阶段前后codesign严格深度校验均通过，其前校验也发生在容器浏览器退出之后。应用来源沿用[任务83](83-cocos-native-edge.md)，binary/Info哈希与运行版本有回执；未系统安装或使用默认profile。

## 新镜像与真实 HTTPS 已通过

工具session6225终态0，容器阶段18:37:52.790–18:38:46.027UTC。Docker29.3.1/Linux aarch64临时启动；使用锁定digest、`--pull=false --network none`构建，不推送。日志保留DockerHub基础镜像元数据解析及既有层CACHED；不能把构建RUN禁网称为全程离线。原API镜像复用并实际核验，未重建或改规则。

| 镜像 | 实际不可变身份 |
| --- | --- |
| 新Web linux/arm64 | `sha256:e43f1ce36a9a9ca4c2a70dba9f04b8c584c17adb45155490e723a548644b5afb` |
| 原API linux/arm64 | `sha256:7697a1455e27eeb9d4e0ab1c446059bc741b211679630fa6adfdb2a6ca6532c9` |

实际容器Nginx1.31.7/Alpine3.24.2/aarch64，API Python3.14.8；19份后端源码及28个锁定依赖版本与根目录一致。所有2946份镜像内站点文件逐份SHA匹配新包，活动版本269资源HEAD/MIME、immutable、gzip解压字节、真实404均通过。

临时一日回环证书只供本轮：Node单请求CA校验、Edge进程内精确SPKI绑定，没有系统信任导入或全局忽略证书错误。真实TLS socket授权、相对302/查询参数/no-store、Secure/HttpOnly/Strict Cookie、同源接续/跨源403、混合内容错误检查均通过。实际Edge旧版本请求根图标收到204，版本路径下不存在的资源仍为404。

| 实际运行 | 结果与范围 |
| --- | --- |
| `run-vquWn6` normal | 七项/四PNG，complete:true；原Secure Cookie接续、真实移动保存、740成长页、旧标签重载、第二真实引擎版本、同凭证切回均通过。 |
| `run-h69ogl` interrupt | 在自有容器/网关/Edge全部ready后仅给所属worker发SIGINT；130/cancelled:true/complete:false，保留前五项基础检查，无游戏截图。各资源自行退出，控制器补救0。 |

后者是预期中断清理证据，不计为额外游戏通过。两轮各自新QA库、容器、网络、TLS网关和临时profile；没有访问生产域名、证书、PG或全局角色。

## Docker 恢复后固定网络已通过

原Docker处于停止状态，初始18个容器均未运行；最终同一Desktop session、容器ID/状态、160份卷名称、网络清单和原镜像身份均保持。两轮业务案例的4个容器、2个网络、2个TLS网关及一次性API核验容器均按归属退出/删除；原数据卷内容未读取。Desktop正常停止并核验进程/API退出；此后才开始性能采样，不与镜像构建/容器浏览器并行。

网络session31470终态0，18:41:01.540–18:45:30.913UTC，`run-cgbNRw`一次七样本/七检查/10PNG，零错误/超限。仍用`tools/cocos-network-budget-v1.json`原字节，SHA256 `1b867f45b1e9c686a238393f062711a9c3546357054958f01ce26ff8f4ced778`；原Chrome155范围保留，执行前已声明同数值用于Edge的本机工程参考。

| 固定条件 | cold可用时间 | warm再次进入 |
| --- | --- | --- |
| 回环参考1份 | 2.560秒 | 2.553秒 |
| 10Mbps/80ms三份 | 13.644 / 13.680 / 13.825秒 | 2.520 / 2.526 / 2.521秒 |
| 1.6Mbps/150ms三份 | 58.224 / 58.185 / 58.091秒 | 2.569 / 2.558 / 2.540秒 |

逐份满足cold≤15/60秒、warm≤5/8秒和cold HTTP≤12MiB。每份cold HTTP10,264,103字节、warm301字节/263条真实缓存命中；gzip、实际限速规则ID和5000条ResourceTiming缓冲无溢出。七份首次原生移动/保存均过，未靠诊断重试取通过；原凭证/save ID/位置/物品及三种点数保持，手动书页恰好写入一次。

这组是独立宿主Nginx1.31.2/回环HTTP/CDP限速，前组为真实容器/回环HTTPS；没有合并称为“HTTPS弱网”、物理网络、生产发布SLA、多设备或总体p95。原固定工程参考没有因当前结果放宽。

## 复核、清理与实际文件

`verify-container.mjs`、`verify-network.mjs`均独立通过：复算真实源/构建/封包/镜像记录、425/426输入、原始各样本、TLS证书/SPKI、版本/PNG/QA库与正常退出；规范源清单仍402/107绑定，源码清单SHA与任务88相同。三份隔离SQLite integrity ok、外键/重复结算0；总9名QA角色、9条create、7份手动书页/7条study_create，活动/计划/现实约定及三种点数0，gold20/seed6保持。手工书页不是核验过的学习行为。

四张实际查看：HTTPS下740空成长页、保留旧引擎世界、真实缓慢加载提示、warm后唯一书页。中文、返回/主要操作可读，空列表和0/12分钟未完成状态符合QA数据；`visual-review.json`不扩大玩家批准，无素材新增。

3个BrowserServer正常退出0/非forced，3个临时profile已删除；容器/API/网关/宿主网络服务、Node与caffeinate均退出，没有本轮新运行服务保留。只读审计585份可解析浏览器记录/1702份结束PID，无所属遗留、活动自动化或意外读错误；历史任务73精确空坏JSON继续按原负例保留。原67850/67853/67854启动身份不变，5442主页/API8142 health/构建三项200，仍I3供人工复核；未读玩家库/玩家数据API，用户Chrome/IAB/共享宿主保持。

本轮仓库只更新本任务、任务39/80/88及状态/本地交付文档；实验脚本、来源副本、日志、镜像身份、截图、QA库/临时证书等在output。根产品/后端/规范工具/来源清单/锁/资产/迁移未改，未重新运行单元/194后端/全27套或Creator。新镜像为非运行本地缓存，不是已推送/部署；无外部Git写入、默认入口切换或Web删除。

实际主要命令：

```sh
caffeinate -di node output/cocos-edge-container/run-all.mjs
caffeinate -di node output/cocos-edge-container/network-controller.mjs
node output/cocos-edge-container/verify-container.mjs
node output/cocos-edge-container/verify-network.mjs
python3 output/cocos-edge-container/audit.py
python3 output/cocos-edge-container/manual-retained.py
node tools/cocos-sources.mjs --check
git diff --check
```

`run-all`顺序执行临时Docker启动、公开封包对应镜像构建、API核验、正常/中断矩阵，并在finally按归属恢复Docker；网络控制器随后调用公开`tools/test-cocos-network.mjs --artifact <77709984新包>`。保留原始来源/命令和真实返回码，不能盲重放旧PID或覆盖已封存包。

## 仍开放

本轮补齐任务88新配置在本机Edge/linux arm64/回环HTTPS和独立HTTP网络下的缺失证据。正式域名/可信生产证书、目标生产PG/角色、amd64、实际已提交CI、其他品牌与物理横屏、系统IME/读屏/原生缩放、正式发布预算和玩家其余验收仍按[任务39](39-cocos-primary-retirement.md)完成。原三个待答问题及5442停止/切换的审批拒绝边界保持，不重问或绕过；V6/V7及整体目标未关闭，原Web保留。
