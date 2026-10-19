# Cocos 生产候选与独立交付

本地生产候选验证完成：真实Creator3.8.8 release、版本化静态包、真实Nginx两版本接续/切回9组，以及最终22套/148组/639PNG全部通过。实际已提交CI、容器/目标HTTPS与实机门槛仍开放，未切换原Web默认发布。

2026-10-17，接续task39 T2/T3的独立生产交付链。上一轮T1本地启动链完成，原默认Web入口/发布仍保留；本轮不提交、推送、外部发布或切换正式服务，不操作人工5442数据库。

计划：

1. 扩展现有真实Creator构建入口，保留debug默认，显式release关闭debug/sourceMaps并启用产物文件指纹；构建身份区分两种模式，旧有效debug包不因工具扩展冒称过期或release。
2. 制作独立、可核验静态发布包：只接受真实当前release记录；版本目录保留原字节、入口可更新、资源长期缓存、API同源无缓存、缺失资源真实404，保留旧版本支持在途标签页。
3. 用本机真实Nginx和隔离API/库验证MIME、gzip/缓存、404、API/Cookie/Bearer、版本切换和回退；实际浏览器验证生产引擎加载与操作。测试资源finally退出，人工服务不动。
4. 准备独立CI/容器入口和长期发布说明，保留原Web默认发布；CI需实际已提交检出和可用官方SDK运行器才算通过，不把本地工作树副本、容器语法或Nginx测试冒称实际CI/容器验证。

本机：官方Creator3.8.8已安装，Node22/npm10和Python3.14 venv既有；Nginx1.31.2/OpenSSL可用，Docker当前本机Unix socket不存在。优先实际静态路径，不启动Docker Desktop或改账号/宿主设置；容器证据暂不可用。整体T2/T3/V门槛保持开放，按实际结果收尾。

## 已实施的候选

- `clients/cocos/tools/build.mjs`显式支持web-desktop `--release`，debug默认与其他平台行为保留；`tools/cocos-build-info.mjs`仅在存在md5Cache参数时扩展构建身份，原debug包仍能匹配既有身份。真实Creator构建退出成功，debug/sourceMaps关闭、md5Cache开启。
- `tools/cocos-release.mjs`校验当前真实release记录及源/产物、拒绝覆盖/软链接/map/私有文件；新包按内容身份存放Creator原字节，私有manifest校验全部文件，公开release.json仅最小身份。`--previous`保留历史版本且不改字节，失败只删除本次新建目录。相同真实构建在两个新输出目录的清单/全部文件哈希完全相同。
- `deploy/cocos/`保存Nginx模板、Dockerfile模板和官方基础镜像digest来源。入口no-store相对302，版本目录immutable，API同源不缓存，MIME/gzip/nosniff、缺失资源404而非游戏HTML；模板随包记录，实际Nginx测试从包内模板生成，仅替换本地根/端口/API。固定镜像未拉取/执行，不能作为容器通过证据。
- `tools/test-cocos-release.mjs`覆盖纯封包/身份/历史/损坏/私有边界；`test-cocos-delivery.mjs`实际启动专属API/Nginx/浏览器，临时目录/端口/库均独立，记录进程组并finally验证退出。根单元现在20模块，来源登记375文件/106绑定，93冻结Web输入/87引用及79场景项保留。
- 根/Cocos包增加release命令，独立手动 `.github/workflows/cocos.yml`准备只读main候选CI，使用完整历史、根锁定工具和官方SDK运行器，不构建原React应用或推送镜像，不改变原ci/deploy工作流。模板/CI有明确来源归属，干净源码选择器包含这些输入。
- 长期构建/交付/缓存/CI说明为 [docs/cocos-delivery.md](../cocos-delivery.md)。无新图片/音频/字体/依赖或API/规则/迁移改动；仅修复登记时资源尚未就绪可抢占输入焦点的时序，原Web代码和默认发布保留。

## 构建与已完成的证据

实际环境：macOS、Node22.23.2/npm10.9.8、Python3.14.6、官方Creator3.8.8；真实HTTP测试为本机Nginx1.31.2，非未运行的容器内1.31.7。Chrome为锁定Playwright1.64.0的实际浏览器。

当前构建：`clients/cocos/web-release-ready-task54/web-desktop`，实际266文件/14,812,110字节、无.map；`debug:false/sourceMaps:false/md5Cache:true`。源SHA256为 `872e903e5f8a922204cd87580ebf6806daf59847293a24800a8d60fc8f2d2e1b`，产物 `7d98fcf44dd00bf4441f7c8f52eb86a27f5b96e9201e10611afa88fbeee72784`。

封包候选 `output/cocos-release/candidate-ready`：活动版本 `e3e7d59cb1f024050a5f3632f1a455ec354cff9c04d8a9aef3fd00dbc1597a8e`，整体SHA256 `9c0119142af3d35e29cde63c39de070c6274661f83a4e2db4d344d1d59a30c11`。`candidate-ready-repro`清单/文件完全相同，`reproducible-ready.json`明确它是同一真实引擎构建的确定性封包，不是两次独立引擎重建。

| 已完成检查 | 实际证据 |
| --- | --- |
| 真实构建 | `output/cocos-release/creator-ready-build.log`，独立新目录及专属userdata，实际退出成功；原navigation/debug包未覆盖 |
| 单元 | `output/cocos-release/all-unit/result.json`，20模块通过。封包夹具明确是元数据测试，不冒充引擎构建 |
| 类型/保护/来源 | `ready-typecheck.log`为106绑定及真实Creator类型；`ready-baseline.log`为390保护、原提取/注册表/测试合同通过；来源375文件核验通过 |
| 真实交付 | `output/cocos-regression/run-BY7TjV/suites/delivery/result.json` complete:true，9组/5PNG、无意外浏览器错误、API/Nginx/worker/浏览器全部退出 |
| HTTP覆盖 | 全部266原始资源HEAD/缓存/MIME；真实JS gzip及解压后字节哈希；入口query/相对302/no-store，版本immutable，缺失JS/PNG/WASM/map真实404/no-store；Cookie/同源API和错误Origin403 |
| 实际游戏 | 真实生产引擎加载，旧Cookie核对/接续保持同save ID与全部稳定业务数据/旧结算；仅允许明确的world_resume时钟与revision变化。真实移动已存服务器、Life740横屏、旧真实标签保留版本重载、两个真实生产引擎接续及入口切回通过 |
| 画面 | 已查看production-world-1440.png、production-life-740.png。另三张为old-tab-after-entry-switch.png、retained-engine-version-continuation.png、production-after-rollback.png；不新增玩家批准 |
| 工作流 | YAML已解析，manual/read-only边界已核对；尚未提交/触发/配置运行器，不声称实际CI通过 |

当前候选保留两个真实Creator生产版本：前一版candidate-current及登记就绪修复版。真实Nginx更改根入口后，原真实标签按其固定版本URL重新加载；随后从根入口进入另一真实引擎版本，同一Cookie/Bearer/save ID与完整稳定业务状态、原ledger保持；再切回当前版本。首次无历史产物时工具仍用明确的HTTP夹具并在报告标识，不能冒称双引擎验证。当前证据不替代实际容器、HTTPS网关/数据库恢复演练。

保留两次失败：`run-dw8p1h`发现Nginx自动绝对HTTP跳转（现加absolute_redirect off），旧candidate-a仅作诊断；`run-lMsa5W`错误地把正常world_resume引起的时钟/revision/结算记录也要求完全不变，测试现仅明确允许该生命周期变化，保留全部稳定状态及原ledger的严格比较，未修改后端或弱化资源断言。失败所属进程亦已退出。

## 登记就绪修复与最终全量结果

第一次生产全矩阵run-QgWVeC在前20套通过后，cave-art因测试选在敌人蓄力末尾且固定向左走而未命中。仅Cocos测试改为等待新蓄力窗口并按敌人的真实方向后退，保留原12伤害/4体力/冷却/掉落断言；生产定向cave-art8组+原Web兼容12组及debug对照8组通过。没有修改战斗规则。

随后run-gqDIZB在session发现实际登记时序：加载标志刚变true，姓名已聚焦，保护输入的延迟重绘让旧禁用开始按钮滞留。Bootstrap现在只在画面资源就绪后开放姓名EditBox，保留原IME重绘保护；不打断正在输入的内容、不改布局/角色/存档。测试实际截留PNG，点击禁用输入后验证未获焦点，放行后中文登记一次成功；完整接续/跨标签/凭证/丢包恢复5组通过run-YG7dhf。新增测试适配期间的run-psm2Ux（拦截器提前移除）、run-dopB97（未等观察接口创建）失败记录保留；测试修正后浏览器与服务均退出。

最终新生产构建为上表ready包。定向3单元+最终source/release2模块、106真实类型/390保护通过；真实时钟帧客户端run-kT47sE两组/4图通过。最终生产全矩阵run-R0sQYv已终止0，日志all-browser-ready.log：21当前Cocos+1原Web兼容全部通过，148组/639PNG；源/后端/测试/旧Web产物前后检查一致，零意外浏览器错误，全部所属浏览器与服务退出。verification.json汇总逐套数量与实际身份，exec16376终止状态已收取。

玩家已确认当前地图与找村民、底部交谈回答、行囊四格，task49偏好批准继续有效；此次生产工具和登记就绪修复不扩大确认范围。人工5442/API8142继续保留原已确认debug候选和同一玩家库，本轮不把它用于自动化；因为运行时修复，旧debug构建不再代表当前源码，仍可继续体验已确认界面。

T2/T3仍不勾选：实际已提交CI、容器/多架构、HTTPS/Caddy、性能/设备、正式发布及数据库恢复仍开放。没有提交、推送、外部部署、改默认Web或删除源码。

最终清理核对：cleanup.json检查19份已结束报告、329个PID/启动时间及专属浏览器标记/用户目录，无所属遗留。5442/API8142与原debug构建记录均200，人工服务及用户既有浏览器保留，未操作玩家库。原Web启动/发布7文件与HEAD相同、原后端20顶层函数/异步函数/类AST一致，证据protection-readonly.json；T6随后已按[任务55](55-cocos-transition-protection.md)接入新保护；该轮仅修改工具/合同，真实运行时和生产包指纹再次核对不变，完整游戏矩阵不因纯工具接线重复运行。


实际复现命令（本机使用Node22.23.2的完整可执行路径）：

```sh
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" COCOS_USER_DATA=/private/tmp/realquest-cocos-ready-task54 REALQUEST_COCOS_BUILD=web-release-ready-task54 node clients/cocos/tools/build.mjs web-desktop --release
node tools/cocos-release.mjs --build web-release-ready-task54/web-desktop --previous output/cocos-release/candidate-current --output output/cocos-release/candidate-ready
node tools/test-cocos-delivery.mjs --artifact output/cocos-release/candidate-ready
node tools/cocos-browser.mjs --build web-release-ready-task54/web-desktop --suite all --web-build output/cocos-regression/web-compat-current --continue-on-failure
node tools/cocos-release.mjs --verify output/cocos-release/candidate-ready
```

封包输出必须是新目录；上面的实际目录已存在，不可覆盖。Creator构建、两份确定性封包、真实Nginx和全22套已分别有成功证据；原Web比较包是task52隔离构建，原frontend/dist未改。当前单元/来源工具的后续接线结果见task55（21模块、378文件/107引用），本报告生产矩阵保留其冻结时375文件/87引用身份。

实际查看本轮登记加载锁、740重连、1440底部回答、740四格、740长历史备注与原Web返回，以及交付的世界/成长/另一实际版本画面。740重连成功后的短暂结果提示仍有局部遮挡，留作V5布局整理；不影响已验证的重连操作，也不把此次截图检查扩大为所有画面或实机批准。
