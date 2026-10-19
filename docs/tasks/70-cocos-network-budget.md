# Cocos 网络预算与无损地表编码

2026-10-18，接续任务39 V6。本地本轮完成：地表逐像素无损编码已接入，最终I3全部七次冷/热/同档链符合原固定工程预算；重连位置竞态的负/正控制、规范会话、三引擎纹理、Nginx交付和独立重建通过。5442已同库更新。没有关闭V6或改变退役范围。下文失败基线保留原阶段结论。

短计划：先固定候选预算；用真实Nginx压缩/缓存和独立QA库测量；保留全部失败；定位大资源并验证逐像素一致的编码；保留PNG回退，生成新候选后完整复验。人工5442和原Web保持。

## 测试条件先于结果固定

`output/cocos-network/budget-v1.json`在采样前创建并冻结SHA。它是工程候选门槛，尚非玩家批准的发布SLA或真实网络性能结论：

| 条件 | 下载/上传 | 延迟 | 冷启动到可用欢迎页 | 同上下文再次进入 |
| --- | --- | --- | --- | --- |
| 回环参考，1次 | 不限 | 0ms | 仅记录 | 仅记录 |
| 桌面候选，3次 | 10/2 Mbps | 80ms | ≤15秒 | ≤5秒 |
| 受限网络候选，3次 | 1.6/0.75 Mbps | 150ms | ≤60秒 | ≤8秒 |

每次冷启动HTTP层接收计数另设≤12 MiB。使用已安装Chrome155.0.8059.80、锁定Playwright1.64、1440×900无头视口、本机Nginx1.31.2真实gzip/immutable缓存、同源API与专属新SQLite。通过[CDP Network协议](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/pdl/domains/Network.pdl)固定限速并记录实际规则ID，单位为字节/秒；没有修改系统网络设置、CPU/页面时钟或玩家数据。HTTP回环没有包含生产TLS、DNS、丢包/抖动/基站、多设备CPU等条件，不能冒充这些结果。

从根入口跳转计时到Cocos实际loaded且启动提示已移除，检查可用原生控件；随后真实创建QA游客、按键移动保存、保存一张研习书页并暂停。再次从根入口进入，保留真实HTTP缓存、原凭证/save ID/位置/唯一study_create和原资源/点数。辅助API读取不计入浏览器操作耗时。

导航前将ResourceTiming缓冲增至5000，另记CDP每请求完成字节、重定向、压缩与缓存。字节是浏览器HTTP层观测，不是物理网络全部开销。没有用路由拦截停用缓存或模拟成功回包。

## 保留的失败基线

实际命令 `node output/cocos-network/check.mjs --artifact output/cocos-lifecycle/candidate-h2`，session93923终态1，`run-JmHz1I`/`suites/network/result.json`明确complete:false。

| 样本 | 冷启动 | 冷HTTP接收 | 再次进入 | 实际结果 |
| --- | --- | --- | --- | --- |
| 回环参考1 | 2.598秒 | 13,284,039 B | 2.455秒 | 同档/单书页通过；额外favicon 404 |
| 10 Mbps 1 | 15.964秒 | 13,283,285 B | 2.552秒 | 同档/单书页通过；超冷启动/字节门槛 |
| 10 Mbps 2 | 15.894秒 | 13,283,285 B | 2.565秒 | 同档/单书页通过；超门槛 |
| 10 Mbps 3 | 15.947秒 | 13,283,285 B | 2.578秒 | 同档/单书页通过；超门槛 |
| 1.6 Mbps 1 | 73.280秒 | 13,283,285 B | 2.549秒 | 同档/单书页通过；超门槛 |
| 1.6 Mbps 2 | 73.144秒 | 13,283,285 B | 未完成 | 一次250ms按D未发生位移，严格失败 |
| 1.6 Mbps 3 | 未执行 | — | — | 不补写为通过 |

共6次冷启动、5次完整同档链、11个候选门槛失败；11PNG中实际查看慢载、同档书页和失败世界。当前模式ready/无待确认，但失败位置仍240,320；未采到输入事件/DOM焦点证据，不能断言产品移动有bug或仅是脚本问题。下一次先原样重试并记录焦点/实际keydown-up，核对Enter开始后世界应有的输入归属；如果焦点未归还，应修复真实键盘链，不能仅额外focus后就宣布原问题关闭。原服务端位移断言保持。

真实Chrome还请求了未提供的 `/favicon.ico`，HTTP404与控制台错误均完整保留；没有过滤为预期。完整运行还须消除此无谓请求。弱网中真实12秒后出现已批准的缓慢提示，之后载入成功；没有提前移除提示或快进时间。

旧记录恰好250条ResourceTiming未设置扩容，本轮实际冷资源262–263条、CDP请求264–265条。任务61/65的旧字节和值保留为当时的有限观测，不能再作为完整首屏下载量；本轮的计数包含导航和重定向，与旧资源合计也不能直接等同。

三大PNG实际接收约9.4 MB，UUID已映射至现有来源：地图1536×1024（3,885,267 B）、行囊1254×1254（2,170,323 B）、地表3840×2560（3,358,715 B）。Cocos当前首屏一次加载它们；原PNG和素材源均未修改。

## 实现前的沙盒编码证据与计划

`output/cocos-network/encoding-probe.py`使用已有Pillow12.3.0，所有输出只在output，逐一重解码为RGBA，尺寸/每个像素和原源文件哈希均核对一致。session67153终态0。

| 同一图像 | 原PNG | PNG optimize | lossless WebP，exact=true |
| --- | --- | --- | --- |
| 地图 | 3,885,267 B | 3,991,338 B | 2,888,846 B |
| 行囊 | 2,170,323 B | 1,965,864 B | 1,414,574 B |
| 地表 | 3,358,715 B | 2,863,533 B | 338,120 B |

没有采用更大的地图PNG或将试验文件当正式资源。下一步优先仅接入地表无损WebP，保留原PNG作为不支持平台的回退；原地理、图像尺寸/像素、图层和游戏ID不变。Cocos官方[图像与压缩说明](https://docs.cocos.com/creator/3.8/manual/en/asset/compress-texture.html)指出WebP的适用范围及格式回退，且这类文件压缩不降低GPU纹理内存；本轮不会据文件变小声称显存下降。此方案尚未进入运行时或通过实际Creator构建。

待实现与验证：

- 可复现的锁定Pillow编码器、来源/像素/原PNG保留合同；独立衍生文件与manifest，不改生成原图或原Web。
- Cocos同步/来源检查支持该明确的lossless WebP，依实际WebP能力选择同一地表展示，其他平台使用原PNG。资源失败仍走真实故障页，不伪造加载成功。
- 修复favicon元数据，补输入焦点/事件诊断；存在性探测的EPERM须按真实进程归属核对，不能放宽资源退出要求。
- 新独立候选真实Creator构建及三测试引擎的实际解码像素/地图/行囊/世界/PNG回退、资源失败接续；按原固定预算完成全部7次冷/热/同档链，不放宽超限值。

## 清理与证据范围

原借用的测试清理函数在进程组存在性探测中抛出EPERM，原因未建立；原回执的services字段因此缺失。随后全进程表按PID/PGID核对49308控制器、49323 API、49341 Nginx及其组均不存在，50872/50873关闭；49346 Chrome正常退出0/非强制。`cleanup-attempt1.json`保存这个补充证据，没有改原失败回执。最终审计419浏览器/911已结束PID记录，无所属闲置遗留/活动自动化浏览器。

`verification-attempt1.json`确认原worker/预算/来源/后端等冻结输入前后不变，真实H2构建/交付哈希保持；6次冷/5次同档、11PNG、编码输出和退出证据可核对，但performanceOrBehaviorPassed=false。原输入另存attempt1-inputs，不覆盖或删除失败。

以上为首次失败基线阶段：当时仅新增output实验及任务/测量范围说明，运行时尚未修改。后续实现与复验如下，历史失败不覆盖。

## 已接入的无损编码

本轮实现文件：运行时`clients/cocos/assets/scripts/Bootstrap.ts`、模板`clients/cocos/build-templates/web-desktop/index.ejs`；编码/读头/同步/来源工具`tools/build_cocos_textures.py`、`tools/cocos-textures.mjs`、`tools/cocos-image-info.mjs`、`clients/cocos/tools/sync.mjs`、`tools/cocos-sources.mjs`；来源与绑定`docs/art/cocos-lossless-textures-v1.json`、`docs/art/asset-manifest.json`、`docs/migration/cocos-source-policy.json`、`docs/migration/cocos-source-inventory.json`、`clients/cocos/asset-bindings.json`、衍生WebP及其Cocos副本/meta。检查维护涉及`tools/test-cocos-sources.mjs`、`tools/test-cocos-browser.mjs`、`tools/cocos-browser-suites.mjs`、`clients/cocos/tools/smoke-textures.mjs`、根`package.json`的新编码脚本；重连部分另见任务71的两个文件。其余是README、本地说明、美术/退役清单和进度记录；没有覆盖现有其他未提交变更。

新增`tools/build_cocos_textures.py`和`tools/cocos-textures.mjs`，通过已有`REALQUEST_ART_PYTHON`选择独立美术Python环境，不改变后端环境或新增npm依赖。锁定Pillow12.3.0/libwebp1.6.0，核对原baker来源SHA和PNG元数据，使用lossless/exact/method6编码；重解码完整RGBA逐字节比较，`--check`只核验、不写入。

原地表PNG3,358,715字节保留；新增衍生`assets/derived/cocos-textures/terrain-lossless.webp`338,120字节，仍3840×2560，RGBA SHA256 `57d17f42cfb4eea64e7da1ae581460bec2ca010b55415878a58b8ef5a08e3482`。源/输出/处理器完整信息在`docs/art/cocos-lossless-textures-v1.json`。不缩图、不换图、不改世界/图层/字体；原全部PNG和既有metadata保持。

sync/source检查明确支持经过核验的单VP8L无损WebP和尺寸，生成独立稳定UUID及nearest/no-trim元数据。Bootstrap仅在Web且实际`sys.hasFeature(WEBP)`时将同一`scenes/terrain`展示键绑定到`scenes/terrain-web`；其他平台/无能力仍用原PNG。失败继续原启动故障/重载流程。HTML增加data favicon，实际Chrome不再请求缺失favicon。文件压缩不改变GPU纹理内存；由于保留PNG，完整包反而从266文件/14,833,619字节增加到I3的269文件/15,172,820字节，不能把启动下载减量写成整个包或显存减量。

独立`textures`套件已登记，现26个Cocos套件加1个原Web比较套件。I2实际Chromium156/Firefox157/WebKit27.2三测试引擎`run-06NhnR`/`run-FzyGeA`/`run-hgiD7y`各4组5PNG，共12组15PNG、零意外错误：正常仅请求WebP；实际浏览器两格式完整RGBA哈希相同；真实503故障/重载保持凭证、角色和资源；明确关闭WebP能力的fixture仅请求原PNG并实际移动。该fixture不冒充真实旧设备；测试WebKit不冒充品牌Safari。实际查看WebKit地图、故障和PNG回退世界截图。

## I2完整预算结果与修复接续

`run-MMBDp8/suites/network/result.json` complete:true，原budget-v1不变、七次首D及同档/唯一书页链全部通过，无预算失败或意外错误。每次cold HTTP10,262,844字节，相比无favicon的H2基线约减少22.74%；warm只收到301字节根跳转并使用实际HTTP缓存。

| 条件 | 三次cold | 三次warm |
| --- | --- | --- |
| 回环参考，1次 | 2.630秒 | 2.592秒 |
| 10Mbps/80ms | 13.334 / 13.416 / 13.519秒 | 2.578 / 2.584 / 2.562秒 |
| 1.6Mbps/150ms | 57.984 / 58.045 / 57.996秒 | 2.538 / 2.548 / 2.436秒 |

首次D偶发未移动另行诊断：原H2五个正常/五个API限速新上下文首D均通过；冻结H2独立副本`run-GDFsMJ`在全资源受限条件下三次首D也通过，但仍约73秒且有favicon/预算失败。原现象未复现，不称为已修复。新worker只等待真实Canvas取得焦点并记录原生键事件，没有额外调用focus或取消严格位移断言。

I2会话回归捕获真正的第4次move和旧位置回退；已以真实刷新持有负例证明并在I3修复，详细证据与长期规范回归见[任务71](71-cocos-reconnect-position.md)。I2其余semantics、landscape、inventory-preview、places、preference-layout五套共22组通过，但不声称I2首次七套全部通过。

复现锁定编码检查：`REALQUEST_ART_PYTHON=<Pillow12.3.0环境的python> npm run cocos:art:textures -- --check`。三引擎检查使用`npm run cocos:test:browser -- --build <自己的候选>/web-desktop --suite textures`及已安装引擎设置，不要求构建原Web。原玩家库不作为夹具。提交/推送授权和任务66阅读视觉仍待答；实际CI/生产/实机和其余V门槛继续开放。

## 最终I3结果、试玩与清理

真实Creator3.8.8独立候选`web-release-network-i3/web-desktop` source `ff64b0e465f0a146ac60e2279a6f02bee40d0054dd2e7f2fd5cc77a183cf5301` / payload `8532777e89513d7bd5e187b2777118da1e4399d2de737414735c63b9e7084efe`。输出`candidate-i3`保留10个真实版本，active `14928ca15b836bbe16692e77d80137a7980ba821bc0ba166a3de5ce552cad1eb`，artifact SHA256 `77ddbe92093b5c6e0e21ab5727b214115bdb58748bbd9e47e34b8e710c3f9184`。

`run-Al4h5n`全部七份cold/warm/同档/首D/唯一书页通过，complete:true、errors和budgetFailures均为空；cold10,262,849字节，warm301字节实际缓存。最终复测在独立重建结束后执行，未并行启动其他引擎/构建负载；仪器/固定预算不变，不将小样本写成p95或正式SLA。

| 条件 | cold | warm |
| --- | --- | --- |
| 回环参考1 | 2.597秒 | 2.505秒 |
| 10Mbps/80ms三次 | 13.378 / 13.444 / 13.447秒 | 2.553 / 2.558 / 2.558秒 |
| 1.6Mbps/150ms三次 | 58.094 / 58.096 / 57.994秒 | 2.578 / 2.483 / 2.583秒 |

最终I3补查：

- `run-o3aBvL`/`run-OV6feS`/`run-83zTu6`三个测试引擎的textures各4组5PNG，共12组15PNG通过；I3实际解码/PNG回退/503后原凭证和资源保持。查看I3地图截图，原图像和布局保持。
- `run-9DxZP8`真实Nginx1.31.2交付9组5PNG通过：压缩/immutable/no-store/同源Cookie、旧标签页从保留路径重载、第二真实版本接续和入口切回，零意外错误。该I3结果不冒充历史H2容器TLS或生产TLS复测。
- 规范session六组与额外500ms控制通过；五个相关单元、396来源/107绑定/93冻结Web输入及实际SDK类型通过。新注册26+1套，不声称全27套跑过。
- 全新896输入快照、有锁离线npm安装及独立Creator用户目录重建269文件/15,172,820字节逐字节一致，副本输入前后未改；源码快照包含当时说明文档，后续只更新报告。I1首轮Importer触发源变化守卫和错误浏览器路径的0检查运行均保留，不改失败回执。
- `source-preservation-i3.json`核对原H2资源PNG及Importer metadata共168文件均未变；新WebP/meta独立增加。

实际命令包括`node output/cocos-network/check-i3.mjs --artifact output/cocos-network/candidate-i3`、`npm run cocos:test:delivery -- --artifact output/cocos-network/candidate-i3`、`npm run cocos:test:browser -- --build web-release-network-i3/web-desktop --suite textures`、`... --suite session`及五模块单元；真实Creator类型检查和独立重建的详细日志保存在`output/cocos-network/`。网络worker是本轮output测量脚本，尚未成为正式CI预算任务。

15:26人工更新：先通过旧session36849正常停止42188/42191/42192；只读私有整库备份`output/cocos-network/manual-before-i3`，再以原DB/Cookie/5442/API8142启动I3。完整六表/结构指纹前后均 `569ae498edd557c4a8a9791ad30d8dc761a7e8fbe3dc4a98436555bbf2ce36cb`，仍1角色/974结算；未恢复覆盖、重置或操作用户浏览器。新保留session19960、67850及子进程67853/67854，供人工试玩。原H2证据和备份保留。

`verification-i3.json`将实际来源/运行/预算/交付/独立重建/同库回执连起来核验；`cleanup-i3.json`核对445浏览器与980已结束PID记录（包含所有独立副本），无所属闲置遗留/活动自动化浏览器。测试API/Nginx组均报告退出。保留5442人工服务及用户原Chrome/IAB；共享工具宿主不按名称清理。原Web/default入口/部署未改，未提交/推送/注册运行器/正式部署/删代码，完整V1–V7剩余门槛继续开放。
