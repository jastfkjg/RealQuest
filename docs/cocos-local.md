# Cocos 本地启动与存档

[任务95](tasks/95-cocos-native-chrome-zoom.md)的Chrome原生缩放代表链已完成并恢复原值100%；60199/API60200测试服务、专用标签均已关闭，QA库仅保留作证据。借用用户已有Chrome但只操作新测试标签，没有新建/清理用户profile。精确运行版本页因URL策略未核验，不绕过限制；下述两份人工试玩继续保留。

当前整体试玩见[统一交付说明](cocos-handoff.md)：[5443](http://127.0.0.1:5443/)加载当前J3，API8143，独立新库 `output/cocos-final-preview/local-preview.db`、cookie `realquest_cocos_final`，已验证欢迎页正常且未登记。原5442/I3/原玩家档继续保留。此前任务94取景53136/53137和任务97读屏50230/50231专项主机已正常关闭，原QA库/证据保留；统一入口替代逐屏验收。原凭证不能将旧库角色搬进5443空库。

[任务93](tasks/93-cocos-canonical-firefox-network.md)已提供仓库Firefox网络入口，无需output临时脚本。Firefox158、默认156、同字节私有Chrome155各七样本与取消合同完成，运行资源全退；只保留非运行的验收证据/工具副本，原5442/I3三健康200且未重启。

[任务92](tasks/92-cocos-native-firefox-network.md)已用独立本机Nginx/API/共享限速代理及Firefox临时profile完成七组弱网专项，全部所属资源退出；原5442/API8142身份/健康保持且仍I3，没有新增运行服务留给玩家。

[任务91](tasks/91-cocos-native-firefox-session.md)已用随机端口/独立QA库和临时profile完成原生Firefox158的1/45分钟会话，所属资源全退出、原5442/API8142健康且仍I3。没有新运行服务保留，不因本次测试更新人工试玩或接触玩家数据。

当前5442/API8142人工包为 `web-release-network-i3/web-desktop`，使用原试玩库和Cookie；并非源码热更新。只读备份及更新前后完整六表/结构指纹一致。无损地表/网络预算/交付与独立重建见[任务70](tasks/70-cocos-network-budget.md)，重连位置修复见[任务71](tasks/71-cocos-reconnect-position.md)。原Web默认启动/部署保持。


Cocos 的人工入口是根目录 `start-cocos.command` 或 `npm run cocos:preview -- ...`，两者复用同一个启动器。原 `start.command` 继续启动 React/Phaser 开发服务，默认发布也继续保留；最终切换须先完成[任务39](tasks/39-cocos-primary-retirement.md)的其余门槛。

## 启动、构建与自动化

已有包的预览需要准备好的 Python3.14 `backend/.venv` 和 `backend/requirements.lock.txt` 对应依赖；不会自动安装依赖。构建/工具使用根 Node22/npm10、有锁安装和官方 Creator3.8.8，具体准备见根README。

源码修改后先同步、检查，再用独立构建名生成包。不要在人工服务正在使用的目录上重建：

```sh
npm run cocos:sync
npm run cocos:check
REALQUEST_COCOS_BUILD=web-local npm run cocos:build
```

人工启动前先只读预检，再运行同样参数：

```sh
./start-cocos.command --check --build web-local/web-desktop --port 5448 --api-port 8148 --database output/cocos-local/local-preview.db
./start-cocos.command --build web-local/web-desktop --port 5448 --api-port 8148 --database output/cocos-local/local-preview.db
```

`--check`校验路径、后端锁定依赖、端口和同库启动锁，不安装、不迁移、不创建数据库/父目录/锁/就绪文件，不启动API或代理。真正启动会对所选SQLite库执行现有Alembic迁移；输出绝对库路径、构建路径、地址和cookie名称，API与代理实际健康检查通过后才报告ready。打开输出地址，Ctrl+C同时停止本次启动的服务。它只服务已有包，没有源码热更新，也不是生产HTTP服务器。

自动化必须使用统一控制器创建的全新测试库，不需要手工启动上述服务：

```sh
npm run cocos:test:unit
npm run cocos:test:browser -- --build web-local/web-desktop
npm run cocos:test:startup -- --build web-local/web-desktop
```

最后一个命令测试启动/重启/中断等真实进程行为，默认不打开浏览器；可显式加 `--web-build output/my-web-comparison` 验证两端同API。结果分别位于 `output/cocos-unit/`、`output/cocos-regression/run-*/`、`output/cocos-startup/`。浏览器套件的详情及可选原Web比较见[任务52](tasks/52-cocos-unified-regression.md)。默认`cocos:build`生成debug/sourceMaps开发包；`cocos:build:release`显式生成关闭debug/sourceMaps并启用MD5的生产候选。本机真实Nginx静态包与缓存切回已有验证；实际CI、目标容器/HTTPS部署和其余V6/V7门槛见[交付说明](cocos-delivery.md)。

## 保留哪一份存档

| 用途 | 数据位置与行为 |
| --- | --- |
| 原人工试玩（已有进度） | `output/cocos-data/local-preview.db`，5442/API8142、cookie `realquest_polish_local`；沿用它才能继续当前试玩，不把它传给测试脚本 |
| 当前整体候选 | `output/cocos-final-preview/local-preview.db`，5443/API8143、cookie `realquest_cocos_final`；独立新档，J3候选 |
| 新建独立试玩 | 上述5448/API8148及 `output/cocos-local/local-preview.db`；与原Web/现有试玩分离，不会自动出现旧角色 |
| 统一自动化 | 每轮每套件独立 `output/cocos-regression/run-*/suites/<id>/test.db`，唯一cookie和回环端口；没有玩家库参数 |
| 原Web开发 | 未显式设置 `DATABASE_URL` 时为 `backend/realquest.db`；原Cookie默认 `realquest_session`。不在自动化中打开此库 |
| 已部署服务器 | 保持原数据库/卷、会话与API；本地预览不会搬运部署数据，切换由独立发布/回退流程处理 |

当前5442服务已经在运行，直接刷新使用。若它已停止，继续原试玩的命令为：

```sh
./start-cocos.command --build web-release-network-i3/web-desktop --port 5442 --api-port 8142 --database output/cocos-data/local-preview.db --cookie-name realquest_polish_local
```

先正常停止原启动器，再将同一数据库交给另一个API；启动器不会为抢占端口而杀掉其他服务。新版启动器用数据库旁的 `.preview.lock` 做互斥，迁移、中断清理和API退出都结束后才释放。锁文件保留为空闲记录，是否占用以操作系统锁为准，不能根据文件存在或其中旧PID判断活跃。它只能约束使用这套租约的启动器，不能识别历史启动器或任意外部数据库进程。

原Web接续需要**同一服务器数据库和仍有效的会话**。同浏览器Cookie还需要原主机名、cookie名称/路径和HTTP/HTTPS条件匹配；端口改变不会自动迁移Cocos的localStorage。只改前端地址或复制凭证文件不会复制服务器存档。欢迎页可显式核对并接续原Web旅程；跨浏览器/主机名或已有Cocos旅程时使用旅程凭证，按备份→预览→确认流程恢复。完整数据导出用于留档，不是可导入的数值存档。不要清Cookie/localStorage来排查问题。

需要从原Web库演练时，先停止原服务，用SQLite一致性backup或停服后的完整备份建立独立副本，再指向该副本并使用正确cookie名称；不要让两个迁移进程并行操作同一个库。生产数据复制、数据库恢复与切换仍按V1/V7执行，不把本地空夹具视为完成演练。

## 配置与故障

参数始终优先于以下环境变量；路径相对仓库根目录解析，也支持显式绝对路径：

| 参数 | 环境变量 | 未指定时的历史默认 |
| --- | --- | --- |
| `--build` | `REALQUEST_COCOS_PREVIEW_BUILD` | `web-village-polish/web-desktop` |
| `--database` | `REALQUEST_COCOS_DATABASE` | `output/cave-polish/local-preview.db` |
| `--port` | `REALQUEST_COCOS_PORT` | 5431 |
| `--api-port` | `REALQUEST_COCOS_API_PORT` | 8130 |
| `--cookie-name` | `REALQUEST_COCOS_COOKIE` | `realquest_polish_local` |

为保留旧样例，没有改这些历史默认；新运行始终按上文显式选包/库/端口。构建名环境变量 `REALQUEST_COCOS_BUILD` 只用于构建，区别于预览路径 `REALQUEST_COCOS_PREVIEW_BUILD`。启动器不会使用继承的 `DATABASE_URL` 选择库，会在输出中标出其被忽略；选择库使用 `--database`。不要继承生产 `COOKIE_SECURE=true` 来做HTTP Cookie接续；保留生产环境设置，在独立本地命令环境中使用适合HTTP的配置。

`--web-port` 与 `--web-build` 可选地服务独立原Web产物，三个端口必须不同，两个前端使用同一所选API/库/cookie；不要求普通Cocos预览先构建Web。`--startup-timeout` 默认45秒，`--migration-timeout` 默认90秒，均须为有限正数。

端口或同库锁冲突时，原服务和库保留；选择别的测试端口或正常停止原启动器。缺包、后端锁定依赖不匹配、非SQLite文件、数据库软链接和公开产物目录内的数据库都会拒绝。API或代理启动失败、意外退出、迁移超时/中断会收回所属进程，不会自动重置或替换存档。`--ready-file`仅用于拥有者记录，必须是output内的新文件，全部服务可用后才写入；旧记录不等于进程仍活跃。

当前实现、测试与人工备份证据：[任务53](tasks/53-cocos-startup-save-paths.md)。


## SQLite备份与恢复

整库在线备份、核验和恢复到新路径使用根`cocos:backup`；命令与范围见[SQLite备份说明](cocos-backup.md)。当前隔离演练已覆盖原Web/Cocos/旧001模式与未版本化状态，实际生产库/切换仍独立验收。人工预览库不作为自动化夹具。

## 网页键盘操作

[任务62](tasks/62-cocos-native-semantics.md)候选在现有画面上补原生按钮语义与具名对话框。Tab／Shift+Tab选择可用操作，Enter／空格激活；到“编辑…”后Enter进入真实Cocos输入框。输入中文或WASD/M/I/N等字母时，由文本框拥有输入。Escape先结束编辑，再按原面板历史返回并恢复入口焦点；F仍切换全屏，Escape先退出全屏。世界Canvas恢复焦点后继续原WASD/方向键操作。

只测该链可运行`npm run cocos:test:browser -- --build <新候选>/web-desktop --suite semantics`。当前登记27个Cocos套件，另有1个原Web比较套件；历史23/25套通过记录保留各自原版本/范围。该浏览器键盘/AX检查不等同真实系统读屏器、操作系统输入法或实机验收。

暂停存档请求故障可单独运行 `npm run cocos:test:browser -- --build <新候选>/web-desktop --suite pause`，覆盖实际fetch的持久化失败、服务错误、回包丢失、超时、401与422；默认Chromium，选择其他已安装测试引擎可设置 `REALQUEST_ENGINE=firefox` 或 `webkit`。测试自动新建隔离QA库并清理所属服务，不使用5442人工库。范围及品牌Safari预检限制见[任务69](tasks/69-cocos-pause-regression.md)。

无损地表解码、WebP能力/PNG回退与资源故障接续使用 `--suite textures`；原PNG保留，锁定美术Python可运行 `REALQUEST_ART_PYTHON=<Pillow12.3.0环境的python> npm run cocos:art:textures -- --check`。地表不改变图像尺寸或像素，也不降低GPU纹理内存。[任务70](tasks/70-cocos-network-budget.md)保留完整网络预算/失败基线；`--suite session`包含重连刷新忙碌期间不得多发旧位置的五尺寸回归，见[任务71](tasks/71-cocos-reconnect-position.md)。

已有release封包可执行 `npm run cocos:test:network -- --artifact output/<候选包>`，完整运行七份固定冷/热网络预算和同档接续，默认有锁Chromium、真实Nginx/独立QA库，取消后自动清理。此命令独立于26套游戏行为回归，不使用5442人工服务或玩家数据；要求和预算范围见[交付说明](cocos-delivery.md#固定网络预算)、[任务72](tasks/72-cocos-network-regression.md)。

原生Firefox使用 `REALQUEST_FIREFOX_EXECUTABLE="/absolute/path/to/firefox" npm run cocos:test:network -- --artifact output/<候选包> --browser firefox`。会先校准共享双向代理，按固定Firefox范围预算执行同一输入/书页/热接续链；程序不自动安装浏览器、不接受预算或玩家库覆盖，结果范围见[任务93](tasks/93-cocos-canonical-firefox-network.md)。


2026-10-18最新完整回归：I3 `web-release-network-i3/web-desktop` 一次26套/165组检查通过，674份实际PNG，源码/后端/产物前后冻结一致。命令、截图抽查与清理证明见[任务75](tasks/75-cocos-current-full-regression.md)；只覆盖本次Chromium环境，不扩大到品牌浏览器、实机、实际CI/生产或所有者批准。


当前源码另有J3首领取景候选 `web-release-framing-j3/web-desktop`：新增 `--suite combat-framing` 真实身体/血条/HUD边界与鼠标/触控验证。当前6套相关检查和单套截图复验通过，未执行新27套全量；可选技能帧客户端不属于普通CI依赖。5442仍I3，自动审批未允许中断原预览，因此没有切换或重启；不要仅刷新5442就以为已看过J3。图片、录像与待答范围见[任务76](tasks/76-cocos-combat-framing.md)。


最新J3完整结果：`--suite current` 一次27套/172组/702实际PNG通过，默认取景7组无需技能文件，源/测试/后端/构建前后不变，全部所属资源退出。见[任务77](tasks/77-cocos-j3-full-regression.md)。当前人工5442仍I3，待允许中断原预览后才能切J3；完整回归不等于已切换、原生长会话、实机、CI或玩家批准。

当前J3本机原生Chrome155/M4 Metal真实45分钟与1分钟预检已独立通过，测试角色与人工库分离，所有所属测试服务/浏览器退出；5442仍原I3，等待已有的预览更新授权。此轮仅output实验入口，不增加日常启动命令，详见[任务78](tasks/78-cocos-j3-native-session.md)。

任务79已实际完成当前J3独立安装/Creator重建（269产物相同）与副本三套定向验证；根公共Nginx交付/固定七样本网络也通过，所有所属测试服务退出。新静态包仅在output，未更新原5442/I3。详见[任务79](tasks/79-cocos-j3-independent-delivery.md)。

任务80已实际验证当前J3的Linux arm64容器与回环HTTPS、同档/旧标签/回退及主动中断清理；所属容器/网关/浏览器已退出，Docker Desktop恢复原停止状态，原18停止容器和5442/I3保持。它是本机测试证据，详见[任务80](tasks/80-cocos-j3-container-https.md)。

任务81已完成固定PG17 Alpine/模板角色库名与当前J3的隔离接续/备份恢复，V1夹具验收关闭；原Web比较为已有包，不增加日常Cocos安装/构建前提。原5442/I3保持，Docker恢复停止，两份新QA数据卷保留非运行服务。见[任务81](tasks/81-cocos-pinned-postgres-restore.md)。

## 数据一致性回归

`node tools/cocos-browser.mjs --build web-release-framing-j3/web-desktop --suite consistency`会新建隔离QA库/回环端口/专属浏览器，结束后关闭服务与浏览器；需项目Node22及允许本机监听的环境。现有套件已含九组存储/500/真实超时/凭证/旧响应/Date±7天/真实断网检查，运行不会访问人工试玩库。任务82单套9组/13PNG、四相关单元/194后端及V3逐项证据见[任务82](tasks/82-cocos-consistency-acceptance.md)；不是一次新全27套。5442/I3保持，原Web/default入口未改。

## 额外品牌浏览器证据

[任务83](tasks/83-cocos-native-edge.md)的项目内官方Edge155.0.4283.62已通过当前J3八组/17PNG；复用现有运行器与隔离QA库，结束后关闭浏览器/代理/API。已验证包仅作本机实验工具，`node output/cocos-edge/native-edge-run.mjs`可新建一轮同流程证据；依赖已保留的签名解包工具，不代表干净检出或CI，也不是日常安装前提。原人工5442/I3、用户浏览器和原Web保持。原生Firefox当前证据见下段；Safari及iOS/Android物理横屏、系统与完整交付/性能继续验收。

[任务84](tasks/84-cocos-native-firefox.md)已补官方Firefox158.0/原生BiDi/current J3七组15PNG，同档研习、五尺寸和WebGL2.0通过，所属profile与DMG只读挂载均已清理。本机保留工具可用`node output/cocos-firefox/native-firefox-run.mjs`新建隔离证据目录，不增加规范27+1套数，也不是日常安装/已提交CI或手机证明。

## 原生窗口归属限制

[任务97](tasks/97-cocos-system-reader-preparation.md)已准备[独立系统读屏QA](http://127.0.0.1:50230/)及Chrome“🔊 Cocos 读屏验收”专用标签，当前停在空白研习表单。只等待临时VoiceOver/字幕面板的具体确认；系统设置尚未改变，AX可读不等于实际读屏通过。50230/API50231为本项明确保留的预览，完成或拒绝后按归属关闭；原5442/I3与J3取景入口保持。

[任务96](tasks/96-cocos-native-ime.md)另已验证现有Chrome中真人中文研习主题的输入法选词、单次保存和刷新接续，事件先归档再刷新。它使用封包之外的被动观察页、新QA库和本轮专用标签；验收页与63826/63827已关闭，不能再作为人工入口。可信start/update/中文input已有证据，但三个end为isTrusted:false、来源未定；原预检计数0保持，不将最终字符串或玩家答复单独当完整IME通过。登记、取消候选/Escape、读屏和实机等继续验收，原5442/I3与独立J3取景试玩保持。

[任务85](tasks/85-cocos-native-zoom.md)的原生缩放尚未验证。CUA getApp路径绑定异常长等待后会返回新默认profile窗口，不能直接当成CLI创建的QA会话。先被动确认运行应用/窗口和PID/profile一致；若晚返回超过QA有效期，应停止操作并重新核验归属。不要重复本轮绑定流程、重放旧PID或清除默认profile。原QA和新启动进程已退出，原5442/I3健康；本轮零游戏检查不改变已有品牌代表流程结果或V5状态。

## 原生Edge长会话证据

[任务86](tasks/86-cocos-native-edge-session.md)的官方Edge155/current J3 headless/M4单次45分钟通过，94采样/7PNG、固定工程候选参考与同档/后续移动保存有独立回执。复用保留的output工具可运行`caffeinate -di node output/cocos-edge-soak/controller.mjs 1`先预检，再选45；每轮新QA库/profile，结束关闭浏览器/API/代理/防休眠。不要拼接取消片段，不把GC/短帧或引擎分配当作持续帧分布、实际显存或已批准的生产/设备预算。原5442/I3保持，原生缩放仍按任务85未验证。

## 原生Edge固定网络入口

[任务87](tasks/87-cocos-native-edge-network.md)在正式`npm run cocos:test:network -- --artifact output/<release>`通过当前J3真实Edge155七样本/10PNG。用`REALQUEST_CHROMIUM_EXECUTABLE`显式指定现有Chrome/Chromium/Edge可执行文件；工具核对完整CDP产品版本，Edge内核版本不能代替产品版本。原Chrome155预算文件不变，其他目标应采样前声明工程参考范围；不能据此关闭实机/生产预算。每轮独立库/端口/profile，结束全清，人工5442/I3保持。

## 原生Edge版本切换与清理

[任务88](tasks/88-cocos-native-edge-delivery.md)的当前J3真实Edge九项交付/五PNG、六模式生命周期通过。`REALQUEST_CHROMIUM_EXECUTABLE`也适用于`cocos:test:delivery`和`cocos:test:delivery:lifecycle`，与网络共用准确产品版本核验。最新候选`output/cocos-edge-delivery/candidate-j3-edge`仅改Nginx根图标兼容，旧包与11版内容保持；它尚待自己的容器/HTTPS/网络复验。错误不能靠清理器返回或预期取消掩盖，详见原始失败/注入负例。所有所属测试资源已退出，5442/I3仍供人工复核。

## 新封包容器与固定网络证据

[任务89](tasks/89-cocos-edge-container-network.md)已为77709984封包补本机Edge/新linux arm64镜像/原API回环HTTPS七项和独立中断，再于Docker恢复停止后跑公开七份HTTP网络样本，全部按原参考通过。实验入口在output，每次依次创建自己的QA库、标记容器/网络、临时证书和profile，并按归属finally清理/恢复；不要盲重放已结束PID或将本机临时证书当生产信任。5442/I3不参与这些实验，正式目标/系统/实机/CI/玩家等继续开放。

## Firefox profile 与 HTTPS 证据

[任务90](tasks/90-cocos-firefox-container-profile.md)补原生Firefox158/BiDi的同包容器HTTPS、旧标签/回退及独立中断；复用既有镜像、不新增安装。共用自动化工具记录实际spawn argv中的`--profile`/`-profile`和Chromium profile；ps的空格路径本身不足以授权结束进程，仍须准确run标记或已知profile/PGID等归属。实际活Firefox清理及原七Chromium生命周期已过，补清超时负例的一个精确QA临时目录时保留原失败记录。证书例外只在新QA上下文，无系统信任变更；这不是Firefox弱网/长会话、系统IME/缩放或物理设备证明。5442/I3保持。
