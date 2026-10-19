# Cocos 生产候选与交付

2026-10-19 用户决定基础迁移完成即可停止，本轮已收尾。本文更完整的SDK CI/生产交付范围保留为后续资料，不继续触发、注册运行器、部署或要求授权；任务106的未提交方案仅为草稿。当前原Web代码/发布入口与候选产物均保留，未把后续未验证项登记为通过。

[任务106](tasks/106-cocos-one-time-sdk-ci.md)补限定候选分支的专用单次SDK CI路由，保留原完整构建/27浏览器/交付/网络命令；72静态策略与13控制器检查通过。准备补丁尚未提交，临时运行器未注册、SDK CI未执行；既有真实基础CI和本地SDK重建各自保留证据，未扩大为生产发布。

当前整体候选见[统一交付说明](cocos-handoff.md)。本地封存目录为 `output/cocos-final-candidate/static`，11个保留版本，内容身份与任务88–93实际验证的包一致；5443只提供独立新档的本地试玩，不是生产Nginx部署。原5442及其存档继续保留。

[任务100](tasks/100-cocos-linux-base-checks.md)已用独立Debian13 arm64容器完成根/后端有锁安装、24模块及232后端项，927输入前后SHA一致、28依赖匹配；原Git历史只读供保护检查，原Web未安装/构建。Docker恢复停止、18旧容器/卷/网络保持。这是本机Linux证据，Ubuntu托管/干净提交检出/实际CI和SDK层仍未验证。

[任务101](tasks/101-cocos-amd64-delivery.md)进一步用当前封包和原规则API构建amd64镜像，实际x86_64/HTTPS七项与独立中断通过，2946站点文件、19 API源/28版本和427冻结输入保持。宿主Docker为arm64，属于仿真功能证据；没有变为原生目标性能、正式PG/域名/可信证书或实际CI通过，原Web发布保持。

[任务93](tasks/93-cocos-canonical-firefox-network.md)已将Firefox替代测量接入正式网络命令并修半关闭/FIFO；Firefox158、实际默认156、同代码私有Chrome155各七样本及两独立中断合同通过。原系统Chrome包Finder元数据签名前置失败保留，697文件字节一致副本严格Google签名/独立profile通过，原应用未改；不能据本机结果关闭完整发布/系统/实机/CI门槛。

[任务92](tasks/92-cocos-native-firefox-network.md)补当前77709984包的原生Firefox158七份HTTP代理弱网样本：10Mbps冷13.57–13.81秒、1.6Mbps58.76–59.00秒，原候选数值与同档唯一书页均过；八项校准验证共享带宽/延迟/上行及取消收尾。与任务90容器HTTPS、任务91原始代理长会话分开，不合称HTTPS弱网/长期性能或完整发布预算。

[任务91](tasks/91-cocos-native-firefox-session.md)补当前J3的原生Firefox158单次45分4.35秒/94采样/7PNG，固定适用工程参考、权威回执/同档/移动保存通过。这是Python回环代理长会话，不与任务90的容器HTTPS合称HTTPS长期性能；GC堆/监听器未测、RSS仅诊断，正式目标/预算与Firefox弱网继续。

[任务90](tasks/90-cocos-firefox-container-profile.md)补同77709984包/既有arm64镜像的原生Firefox158七项HTTPS与独立中断；浏览器仅在新QA userContext接受临时证书，Node单请求精确CA校验，不称为生产信任或Firefox SPKI绑定。共用profile记录/清理支持实际Firefox参数并保留保守归属规则，相关单元/生命周期通过，Docker恢复停止。Firefox弱网/长期性能、正式目标/系统/实机与完整V6/V7继续开放。

[任务89](tasks/89-cocos-edge-container-network.md)已完成下述新77709984候选的真实Edge/linux arm64/回环HTTPS七项及独立中断、随后固定HTTP七网络样本；新镜像e43f1ce3…、原API7697a145…与2946站点文件核验通过。Docker恢复停止，原容器/卷/网络清单保持。任务88条目“尚未复验”为当时历史状态；本轮仍非生产域名/证书、实际CI/PG角色、amd64、其他目标和物理设备验收，也不把分开的HTTPS/HTTP网络实验合称HTTPS弱网。

[任务88](tasks/88-cocos-native-edge-delivery.md)最新Nginx候选修复真实Edge加载旧页面时的根图标404，并通过九项交付及六种清理生命周期。新封包`output/cocos-edge-delivery/candidate-j3-edge`的11版/2946站点文件与原J3包完全相同，只改两份Nginx配置；它尚未构建新容器镜像或复验自身HTTPS/七网络。任务80/87以下证据保留各自旧封包范围，不冒称这次新配置已覆盖。

[任务81](tasks/81-cocos-pinned-postgres-restore.md)补齐固定生产模板PG17 Alpine镜像与模板realquest角色/库名的隔离恢复，当前Linux API/原Web/J3七项通过；不是实际生产数据/全局角色或公开HTTPS部署。任务80回环HTTPS与本轮PG恢复是分别执行的证据，未合并称为同一次正式生产演练。

[任务80](tasks/80-cocos-j3-container-https.md)已补当前J3的真实Linux arm64容器/回环HTTPS：2946站点文件逐份一致，七项产品检查/4PNG及独立中断清理通过；API19源码/28锁定依赖匹配，Docker恢复原停止状态。此结果不代替生产域名/证书、生产PG/角色、amd64、实际CI或实机。

当前J3本机交付证据见[任务79](tasks/79-cocos-j3-independent-delivery.md)：新903文件副本独立有锁安装/真实Creator重建269产物逐字节相同，11版静态包通过真实Nginx9组与固定七样本网络预算；旧标签/双真实版本/同档/回退均有实际回执。当前包本机arm64/回环TLS后续见任务80；实际CI和正式目标生产范围仍待相应验证，未公开部署或切换默认入口。

2026-10-18更新：当前H2已完成实际Linux arm64 Nginx/Alpine/API容器及回环TLS、8个保留版本的切换/回退和独立源码重建；具体镜像、来源、限制和清理见[任务67](tasks/67-cocos-container-tls.md)、[任务68](tasks/68-cocos-browser-lifecycle.md)。实际CI仍无Cocos运行器，生产域名/证书、目标生产库、amd64及正式切换继续开放。以下命令和原任务54历史记录保留供复现。


此链路生成独立候选，保留原Web默认CI、镜像和部署入口，不自动推送镜像、发布站点或切换数据库。交付证据见[任务54](tasks/54-cocos-production-delivery.md)，当前候选的独立生产重建见[任务57](tasks/57-cocos-independent-production-rebuild.md)，退役条件继续按[任务39](tasks/39-cocos-primary-retirement.md)。

## 生成可核验的包

使用官方Creator3.8.8、根Node22/npm10及有锁依赖；准备与本地启动相同的Python3.14后端环境。普通Cocos路径不安装或构建React/Phaser应用。

```sh
npm ci
npm run cocos:sync
npm run cocos:sources
npm run cocos:check
npm run cocos:test:unit
REALQUEST_COCOS_BUILD=web-release-candidate npm run cocos:build:release
npm run cocos:package -- --build web-release-candidate/web-desktop --output output/cocos-candidate
npm run cocos:package -- --verify output/cocos-candidate
```

`COCOS_CREATOR`须指向实际官方可执行文件，`COCOS_USER_DATA`可指定本次构建专属的用户数据目录。构建脚本保留原debug默认，只有显式 `cocos:build:release` 才使用 `debug:false/sourceMaps:false/md5Cache:true`；这些选项符合[Creator命令行构建说明](https://docs.cocos.com/creator/3.8/manual/en/editor/publish/publish-in-command-line.html)。版本记录区分模式，不能把debug包改名当生产包。

包必须有真实构建写出的 `realquest-build.json`，且当前源/产物指纹匹配。打包拒绝debug、缺记录/过期/篡改、sourcemap及引用、源文件/私有文件、软链接和覆盖已有输出。失败只清理本次新分配的目录，不改构建包、历史产物或存档。

交付目录包含：

- `html/releases/<内容身份>/`：原Creator产物字节和最小公开 `release.json`，不公开完整源码文件清单形式的构建记录。
- `nginx.conf`：容器默认 `/usr/share/nginx/html` 与私有 `backend:8000` API代理；`nginx.conf.template`保留同一配置的参数化来源，供独立静态主机生成配置。
- `Dockerfile`、`.dockerignore`：只复制静态产物和Nginx配置，无Node/Creator/原Web构建或数据库；官方基础镜像固定到 `deploy/cocos/base-image.json` 记录的digest。
- `release-manifest.json`：活动版本、保留版本、完整逐文件哈希及整体身份。发布/传输前后运行 `--verify`，不要直接编辑已封存包。

需要保留旧标签页的资源时，把已核验旧候选作为输入，生成新的目录：

```sh
npm run cocos:package -- --build web-next/web-desktop --output output/cocos-next --previous output/cocos-candidate
```

旧版本按相同路径逐字节保留。新入口和旧资源必须一起交付，不能只复制活动目录覆盖原站点。此工具不自动删除历史版本；保留期、下载预算和旧标签更新策略仍须完成V6/V7后确定。相同内容身份下的资源不能原地改写。

## 独立生产重建

[任务105](tasks/105-cocos-signed-sdk-input.md)另以严格验签的官方资源输入重建当前J3：906源/107绑定和真实类型、独立依赖及269产物一致。SDK输入在 `output/cocos-sdk-ci-preparation/pristine.json`，执行应使用其独立工作副本；旧SDK路径已缺失，不能只复用旧绝对路径。后续旧/工作包字节审计的缺口独立记录，不冒称实际SDK CI通过。

重复封包只证明封包确定性。要核验引擎重建，应在原仓先运行 `node tools/cocos-clean-source.mjs`，使用其JSON输出的全新 `destination`；它排除原Web安装/构建、数据库、依赖目录、Creator缓存和旧产物。进入该副本后独立 `npm ci`，保留外部既有官方 `COCOS_CREATOR` 路径，指定新的专属 `COCOS_USER_DATA`，再运行：

```sh
npm run cocos:sources
npm run cocos:check
REALQUEST_COCOS_BUILD=web-release-candidate npm run cocos:build:release
```

比较时两次使用相同构建名、平台和生产参数；分别通过各自的 `tools/cocos-build-info.mjs` 中 `verifyBuild()` 重新核验源与磁盘文件，再比较两个 `realquest-build.json` 的 `source.sha256`、`payloadSha256` 及全部 `payload` 路径/大小/SHA256。`builtAt`是独立构建时间，不属于游戏payload；不要修改文件、移除差异或改写receipt来获得一致结果。还应核对快照 `source-manifest.json` 中全部输入在构建前后未变化，并用新包运行隔离浏览器检查。

源码快照没有Git历史，不能运行需要历史的transition保护或冒称干净CI克隆；这项保护在原仓单独运行。可通过 `cocos:test:unit -- --list` 选择其余适用模块。浏览器需要的既有锁定Python环境若显式复用，应记录这一条件，不声称全新后端安装。真正已提交的完整检出仍须执行全部检查。

task57在同一macOS arm64/Creator3.8.8环境完成当前候选的全新项目导入与独立生产重建：266文件逐字节一致，882快照输入未改；副本21单元、106类型/绑定及7组真实浏览器检查通过，Git历史保护在原仓通过。它补齐本机重建证据，跨架构、实际CI与目标部署继续开放。详细命令、指纹和收尾见[任务57](tasks/57-cocos-independent-production-rebuild.md)。

## HTTP与静态主机

入口 `/` 返回**相对**302并 `Cache-Control: no-store`，避免HTTPS网关后错误生成HTTP绝对跳转。进入 `/releases/<身份>/` 后，各资源使用版本路径和长期immutable缓存；API始终走同源绝对 `/api/`，保持Cookie/Bearer与后端权限。Nginx返回正确MIME、按需gzip和nosniff，缺文件真实404且不缓存，不用游戏HTML冒充JS/图片。缓存头行为依据[Nginx官方headers说明](https://nginx.org/en/docs/http/ngx_http_headers_module.html)，并用实际HTTP验证。

包内Nginx配置为 `http` 上下文中的server块。容器路径准备好后可单独构建前端镜像：

```sh
docker build -t realquest-cocos-candidate output/cocos-candidate
```

任务54当时Docker守护进程未运行，此命令未执行；后续任务67/68已在相同固定digest上完成实际arm64容器验证，不能扩大为其他架构或正式部署。基础镜像digest来源为[Docker官方镜像元数据](https://raw.githubusercontent.com/docker-library/repo-info/master/repos/nginx/remote/alpine.md)，实际容器拉取/运行、多架构及镜像晋升仍待验证。

独立Nginx主机可使用同一包内模板，明确文档根、监听和已有API后生成新的外部配置，不修改封存包。例如在仓库根目录生成供审核的server块：

```sh
node --input-type=module <<'JS'
import fs from 'node:fs/promises';
import {verifyRelease,renderNginx} from './tools/cocos-release.mjs';
const artifact=await verifyRelease('output/cocos-candidate');
const template=await fs.readFile(artifact.directory+'/nginx.conf.template','utf8');
const config=await renderNginx({active:artifact.active,directory:'/srv/realquest/html',port:8080,upstream:'127.0.0.1:8000',template});
await fs.writeFile('output/cocos-site.conf',config,{flag:'wx'});
JS
```

这是配置生成，不会安装Nginx、拷贝到系统目录、开放端口或部署。实际启用前需核验API/数据来源、在独立环境 `nginx -t` 并联调，HTTPS终止和可信网关继续由正式部署配置处理；不要把开发Python代理作为生产服务器。

本地真实Nginx交付回归：

```sh
npm run cocos:test:delivery -- --artifact output/cocos-candidate
```

需要已安装Nginx（可用 `REALQUEST_NGINX` 指定可执行文件）及锁定Chromium。测试新建独立库、随机回环端口和专属Nginx进程/日志/临时目录；验证全部资源HEAD/MIME、gzip、404、API来源/Cookie、真实生产引擎接续/移动/成长横屏及入口切换/回退。若产物含两个真实版本，还会实际进入另一引擎版本并核对同一凭证/角色与完整稳定状态/原ledger，再切回活动版本；首次无历史产物时，下一入口仅为明确的最小HTTP夹具并在报告标明，不冒称双引擎验证。旧真实游戏标签始终重新加载其保留版本。finally关闭专属浏览器、API、Nginx及worker，不操作人工5442或原玩家库。

独立交付生命周期可运行 `npm run cocos:test:delivery:lifecycle -- --artifact output/cocos-candidate`：正常交付、SIGINT/TERM/HUP、启动取消和实际QA API退出共六种，子任务必须自行关闭服务/浏览器并保留失败或取消回执；探针如需要补救清理则不通过。检查程序自身也处理取消。候选工作流在上传前运行此入口，实际本地结果和保留的取消/坏JSON负例见[任务73](tasks/73-cocos-delivery-lifecycle.md)；不将基础设施负例算作游戏覆盖或远端CI证据。

## 独立CI与回退边界

`.github/workflows/cocos.yml` 是独立Cocos工作流，权限只读，不改原 `ci.yml` 或正式部署。[任务98](tasks/98-cocos-overall-candidate.md)将其分成两层：普通 `verify` 在GitHub托管Ubuntu24.04上执行有锁安装、基础工具诊断、同步/来源/保护、24组单元和后端测试，不要求Creator、Nginx或浏览器二进制。它始终上传本轮单元日志与后端JUnit报告（若已生成）。

[任务103](tasks/103-cocos-ci-bootstrap.md)补首次接入入口：推送 `codex/cocos-ci-*` 分支可直接触发基础verify，无需先合并默认分支。[首次手动触发限制](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch)仍适用，只把新的纯手动文件推到候选分支不足以首次dispatch。main/其他分支/tag push不属于新入口，没有新增PR或发布触发。后续任务104已获明确Git授权，并完成候选分支和基础CI验证，详见下文。

真实引擎 `candidate` 必须等 `verify` 成功，且仅在main手动勾选 `build_candidate` 时执行，默认不勾选。它仍要求明确注册的 `self-hosted,cocos-3.8.8` 运行器、有效官方Creator安装/使用条件、Python/Node、已安装Nginx与Chromium系统依赖，以及仓库变量 `COCOS_CREATOR` 路径；不会安装SDK、修改账号/许可证或启动宿主Docker。

两层均检出完整历史并检查工作树干净。真实候选层保留源/真实类型/单元/后端、release构建、封包、Nginx交付及生命周期、当前27套浏览器回归和七样本网络预算；全部成功后才上传独立 `realquest-cocos-candidate`，不推送镜像、不调用原发布器、不上传测试库或个人资料。

任务98的原本地结果仍对应其快照。[任务104](tasks/104-cocos-hosted-ci.md)获明确授权后，候选分支f584685已在真实GitHub托管Ubuntu24.04通过24模块、232后端、来源保护和工作树干净断言，回执已下载核验；T3实际干净检出基础链完成。首轮job env误用runner导致无job失败，已将该变量移到实际构建step env并通过actionlint及实际基础CI。SDK job仍skipped，不作为真实Creator构建CI或生产通过，T2继续开放。

原生产发布器仍只接受原 `ci.yml` 的受核验镜像artifact，不会误接纳此静态候选。后续接入应保留repo/revision/run/attempt与不可变镜像校验，不能靠改一个artifact名称跳过来源检查。没有main合并、正式部署或SDK运行器注册。

入口回退只切静态站点/镜像与已保留资源，不能删除Cookie/localStorage、创建替代旅程或倒灌数据库。生产库、迁移、HTTPS/Caddy缓存、多架构容器、外部切换和备份恢复演练继续由V1/V6/V7验收；本轮Nginx/SQLite夹具不替代真实部署。没有自动清库、downgrade或 `down -v` 操作。

## 固定网络预算

```sh
npm run cocos:test:network -- --artifact output/cocos-candidate
REALQUEST_FIREFOX_EXECUTABLE="/absolute/path/to/firefox" npm run cocos:test:network -- --artifact output/cocos-candidate --browser firefox
```

需要已有真实release封包、Nginx和锁定Playwright Chromium。该独立命令使用新测试库/端口和真实gzip/cache，不接收玩家库、目标URL、预算或样本数覆盖参数。版本化预算在`tools/cocos-network-budget-v1.json`：参考1次、10Mbps/80ms三次cold≤15秒/warm≤5秒、1.6Mbps/150ms三次cold≤60秒/warm≤8秒；每次cold HTTP≤12MiB。七份首移动、同档、唯一研习书页和资源余额检查都必须完成；每份超限分别失败，均值不掩盖慢样本。

默认浏览器为根依赖安装的Chromium；`REALQUEST_CHROMIUM_EXECUTABLE`可明确选择已有Chrome/Chromium/Edge可执行文件，`REALQUEST_NGINX`选择已有Nginx。回执保留实际CDP产品和完整版本，并严格核对Chrome/HeadlessChrome/Edg产品版本；Edge内核版本不能代替其产品版本，不把无头Chromium当品牌Chrome。原预算文件仍保留Chrome155校准范围；应用到其他目标时，应在采样前声明工程参考范围，不能改称已批准的目标发布预算。预算尚非玩家发布SLA、p95、多设备或物理网络证明。

`--browser firefox`要求显式原生Firefox二进制，使用BiDi并记录实际UA/版本。每次先自动校准共享双向回环代理，再使用`tools/cocos-firefox-network-budget-v1.json`的相同数字参考；缓存来自原生ResourceTiming，HTTP有效载荷来自代理实际write。它与CDP的条件/字节语义分开，不模拟TLS/DNS/丢包/内核链路或手机。校准、来源检查、数据、性能或清理失败均不能通过；不依赖忽略的output实验脚本。实现与本轮复验证据见[任务93](tasks/93-cocos-canonical-firefox-network.md)。

报告/截图位于新的`output/cocos-regression/run-*/suites/network/`；finally关闭所属浏览器、API与Nginx组，取消/错误/清理失败均不能给出通过。SDK候选工作流在上传前调用相同命令，该远端SDK层仍未执行；任务104通过的普通基础CI不包含网络矩阵。实现、真实结果和边界见[任务72](tasks/72-cocos-network-regression.md)，原测量与失败基线见[任务70](tasks/70-cocos-network-budget.md)。

[任务87](tasks/87-cocos-native-edge-network.md)补当前J3官方Edge155的七份固定网络样本，10Mbps冷启动13.46–13.58秒、1.6Mbps58.09–58.16秒、warm2.53–2.59秒，HTTP10,264,103/301字节；同档/首次移动/唯一学习结算全部通过。原预算SHA不变，实际官方包/前后签名、三相关单元、426冻结输入/QA库/截图/清理均有证据。它只补本机Edge工程参考，不将其他目标、正式生产预算或实际CI变为已验收。

交付与生命周期入口同样支持`REALQUEST_CHROMIUM_EXECUTABLE`选择已有Chrome/Chromium/Edge并保留严格CDP产品版本；不通过改UA声明品牌。精确根`/favicon.ico`现在返回204空body/no-store/nosniff，兼容未声明图标的保留旧页面；`/releases/`下不存在的资源仍须404，不能扩大成通用HTML或204回退。服务存活探测EPERM保守地算仍活，清理尝试全部所属组并总是记录服务状态；清理/信号失败或探针补救均不能使六模式验收通过，见任务88。
