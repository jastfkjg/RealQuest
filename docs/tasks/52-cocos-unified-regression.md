# 当前 Cocos 统一回归与隔离生命周期

2026-10-17，task39 **T5 本地技术验证完成**。最终冻结执行 `run-ojHM8V` 的21套当前Cocos回归和1套独立原Web界面兼容全部通过，共147组、638张PNG。单元、后端、生命周期和源码副本验证分别报告，不计入147组。整体退役目标继续；T1/T2/T3实际CI/T6和V项仍开放。

玩家确认task49偏好页、操作、音量与音色“这轮可以保留”；此批准仅覆盖该轮偏好。聊天、行囊等画面、实机与发布仍按task39验收。原Web代码、默认启动和部署保留；没有提交、推送或部署。

## 实施范围

本轮链路：真实构建与指纹→集中套件配置→全新测试库/端口/会话→API及代理归属核对→公共行为回归→分层报告→验证浏览器与服务真实退出。

- 根 `package.json` 增加统一浏览器和生命周期入口；`tools/cocos-browser{,-config,-suites,-cleanup}.mjs` 集中21+1登记、选择、超时、取消、错误与清理。20个Cocos浏览器脚本、2个双端美术脚本中的当前Cocos路径使用受控配置；Cocos旧npm别名委托到控制器。双端美术脚本保留历史Web默认路径。
- `tools/cocos-build-info.mjs` 与 `clients/cocos/tools/build.mjs` 仅在真实Creator构建成功后记录源码/模板/产物身份；拒绝缺失、过期、篡改或构建期间源码变化的包。兼容套件单独记录原Web产物哈希。
- 每轮每套件创建 `output/cocos-regression/run-*/suites/<id>/test.db`，使用独立cookie和回环端口。JS配置与 `clients/cocos/tools/test_guard.py` 拒绝人工库、错误配置或跨目录软链接；不接受玩家数据库参数。`run-preview.py` 核对端口、ready父子PID与库路径，并关闭自己启动的API/代理。
- BrowserServer公开接口管理专属浏览器，finally关闭并验证物理进程；唯一运行标记、profile与进程组仅用于明确归属的故障兜底。服务异常退出会取消测试。共享宿主和用户已有浏览器保留。
- `tools/test-cocos-{browser,build-info,runner}.mjs`、Cocos `runner-probe.mjs` 与18模块统一单元入口覆盖配置、构建身份和生命周期。来源策略/清单更新到366文件、106绑定、93冻结Web输入、87处引用，完整79场景读取项保留。

## 回归发现并修复的产品问题

1. **网络恢复控件被覆盖**：重连按钮与目标追踪重叠，面板返回又因断线禁用。`Bootstrap.ts` 在待确认时暂停追踪提示、将重连放到状态下方；没有实际在途动作时允许本地关闭，与既有Esc语义一致。桌面及740横屏验证两次丢包→地图→指针返回→三份相同完整请求恢复，只提交一次。
2. **预测移动拐角被服务器拒绝**：连续预测位置间的直线可能切过河岸。规范源 `shared/game/localScene.ts` 新增适配器辅助 `pendingSafeMove`，同时检查已确认位置、在途目标到候选点的路径和220距离，保留沿墙滑动，转弯前先确认安全点；Bootstrap串行提交。生成副本、绑定哈希及 `test-local-scene.mjs` 同步，原七个精确提取模块及服务端规则保持不变。
3. **洞内自动走近误判**：到达后仍用插值中的演员位置判断范围。最后路点在3像素内完成，并以服务器位置判断洞内交互。五层战斗、楼梯、平台与门石实际链随后通过。

测试按当前公共操作适配四格、姓名/备份确认、NPC逐句阅读和话题/赠礼、学习页层级、字段结束编辑、对象真实hitbox及小憩返回世界；保留资源/消耗/请求身份断言。world故障注入改为固定首个持久request_id拒绝，用户重试使用新ID，丢包重放完整请求一致且仅结算一次。锁定通路验证当前禁用按钮、不换图且不改库存。没有放宽服务端碰撞、距离、奖励或资格规则。

没有新图片、音频、字体或依赖。81PNG字节不变；25共享绑定中的localScene按规范源同步。场景7PNG/43sprite/7布局及9原SVG衍生图标校验通过，素材来源继续使用既有manifest与task47/task51记录。

## 环境与命令

实际环境：macOS、Node22.23.2/npm10.9.8、根锁定Playwright1.64.0/Chromium、官方Creator3.8.8、既有Python3.14.6虚拟环境。当前真实构建 `clients/cocos/web-regression-navigation/web-desktop`：

- 源SHA256：`6c1230de659a4e888918f156f72734524a1ef257f11b4c9383bcf99cb3f5cf69`
- 产物SHA256：`1132a5f655708522ed004155ba211371d9dc721ea7bdfddae23db02925bdb099`
- `web-desktop/debug:true/sourceMaps:true`；是本地候选，不是生产发布配置。旧current/recovery包已过期。

根目录使用Node22/npm10，先准备锁定依赖、Chromium和既有后端环境；`COCOS_CREATOR` 指向官方可执行文件：

```sh
npm ci
npm exec -- playwright install chromium
npm run cocos:sources
npm run cocos:check
npm run cocos:baseline
npm run cocos:test:unit
REALQUEST_COCOS_BUILD=web-regression-navigation npm run cocos:build
npm run cocos:test:browser -- --build web-regression-navigation/web-desktop
npm run cocos:test:runner -- --build web-regression-navigation/web-desktop
npm run cocos:art:check
```

默认浏览器命令执行21套Cocos，无需安装/构建原Web。`--list`列登记，`--suite session,inventory`选子集；可显式 `--port`/`--api-port`，仍只使用控制器新建测试库。报告保存实际版本、构建、后端/测试源身份和退出证明。

本轮比较包在 `frontend/` 以既有锁与 `npm run build -- --outDir ../output/cocos-regression/web-compat-current --emptyOutDir` 独立构建，未覆盖 `frontend/dist`。随后根目录实际执行：

```sh
npm run cocos:test:browser -- --build web-regression-navigation/web-desktop --suite all --web-build output/cocos-regression/web-compat-current
```

仅重跑比较可用 `--suite compatibility`。后端实际在 `backend/` 执行 `.venv/bin/python -m pytest -q`。不要直接复用历史脚本的固定端口/库。

## 最终证据

总报告：[verification.json](../../output/cocos-regression/verification.json)；最终冻结执行：[run-ojHM8V/result.json](../../output/cocos-regression/run-ojHM8V/result.json)、[日志](../../output/cocos-regression/final-all-identity.log)。`complete:true`，预期22套全部执行，零意外浏览器错误，全部专属浏览器/API/代理已退出。

| 套件 | 通过组 | PNG |
| --- | ---: | ---: |
| data | 7 | 20 |
| session | 4 | 8 |
| world | 9 | 9 |
| story | 9 | 20 |
| depths | 9 | 27 |
| landscape | 3 | 22 |
| life | 8 | 72 |
| dossier | 8 | 56 |
| guidance | 8 | 79 |
| places | 8 | 69 |
| travel | 2 | 17 |
| rest | 2 | 4 |
| atlas | 3 | 7 |
| neighbors | 6 | 33 |
| dialogue | 3 | 9 |
| inventory | 11 | 59 |
| inventory-preview | 4 | 11 |
| preferences | 11 | 38 |
| preference-layout | 1 | 12 |
| village-art | 11 | 21 |
| cave-art | 8 | 21 |
| compatibility | 12 | 24 |
| 合计 | 147 | 638 |

录像保存在对应套件目录，复制件不另算一次录制。实际查看了本轮网络恢复740、诺亚交谈、Life长备注740、附着回答740、声音740、布袋740与原Web返回等代表图；前批当前同源包的洞内待确认740和帧客户端恢复画面亦已查看。截图存在本身不代替交互或玩家批准。

| 独立检查 | 实际结果与证据 |
| --- | --- |
| 单元 | 18模块通过，`navigation-all-unit/result.json` |
| 类型/保护 | 106绑定及真实Creator类型通过，`navigation-typecheck.log`；390保护及原七模块/注册表/测试合同通过，`navigation-baseline.log` |
| 后端 | 232通过、1条既有Starlette弃用警告，`backend-tests.log` |
| 素材 | `scene-art-check-elevated.log`、`inventory-art-check-elevated.log`通过；初次沙箱浏览器启动失败留档，不算通过 |
| 真实生命周期 | `lifecycle-z75hIV/result.json`七类通过：正常、故意失败、硬超时、服务退出、运行中取消、浏览器尚未完成启动时取消、端口占用。占用哨兵保留且未迁移测试库；属于基础设施验证 |
| Python归属守卫 | `guard-negative-hpb191q8/result.json`五类通过：所属路径、缺配置、人工库名、错误库名、指向外库的软链接；只操作空夹具并清理，没有打开人工或玩家库 |
| 提供的帧客户端 | `run-bwUgqa/result.json`，真实时钟输入循环2组/4图；仅调整受控连接、整页截图和finally关闭，实际地图/恢复检查通过 |
| 独立源副本 | `clean-proof.json`：864声明源文件、无frontend package/install/dist/编辑器缓存，离线npm ci安装5项；106类型、全新Creator导入/构建、统一session浏览器4组通过；源指纹与主候选一致，声明源字节不变 |

上述相对证据均位于 `output/cocos-regression/`。独立副本为 `output/cocos-toolchain/clean-source-41WuSD`，显式软链接复用既有锁定Python venv，以及已安装Creator/Chromium；不冒称全新Python/SDK安装或已提交CI克隆。副本证明当前运行时与Cocos公共入口，不声称执行了后来调整故障夹具/可选兼容脚本的最终22套。

失败诊断完整保留：初始 `run-86Vk5f` 14/21通过，后续 `run-GVGVj5` 暴露拐角/洞内范围；导航批次 `run-40k9bZ` 与兼容 `run-eJ06q3` 推进适配。首次全量 `run-8lLI5u` 在world故障夹具停止，修正请求身份绑定后单项 `run-UwBrY2` 通过，最终才得到 `run-ojHM8V` 的22/22。旧失败或分批通过没有充作最终全量成功。

## 人工预览、存档与收尾

最终22套通过后，人工 **http://127.0.0.1:5442/** / API8142切到上述navigation候选，仍使用 `output/cocos-data/local-preview.db` 与原cookie `realquest_polish_local`。用户现有浏览器标签未被自动操作，刷新即可继续。

确认旧launcher/API/proxy身份、启动时间、父子关系、工作目录和端口后，向旧launcher47723正常SIGTERM，47723/47725/47726全部退出。停服后只读SQLite备份到 `output/cocos-regression/manual-handoff-before.db`（0600，618496字节）；重启前后所有表和模式逻辑SHA256相同：`8149187673acc40afc2cdbcb015e8179c3821d53cf6ad24663d888dd5364de4a`，1角色、764条结算记录保留，迁移头003。证据为 `manual-handoff-before.json`、`manual-handoff-before-after.json`，没有重置、删除或导入存档。

保留launcher84208、API84210、proxy84211，终端session41807，供人工试玩；root/health均200，`manual-ready.json`记录身份。旧preferences候选仍保留作本地回退。自行重新启动时使用：

```sh
./start-cocos.command --build web-regression-navigation/web-desktop --port 5442 --api-port 8142 --database output/cocos-data/local-preview.db
```

[cleanup.json](../../output/cocos-regression/cleanup.json)核对51份运行记录、浏览器唯一标记/profile和专属Creator目录，并核对300个控制器/测试/服务/单元PID及启动时间：没有匹配的已结束任务进程遗留。共享/无法确认归属的Node/MCP宿主、用户浏览器和其他任务资源保留。仅上述人工服务因试玩继续保留。

收尾再次只读核验root/API health/构建记录均200，源指纹一致；文档 `git diff --check` 和366文件来源检查通过。沙箱初次阻止回环访问，随后获准的只读检查成功，未访问创建游客或写存档接口。

## 仍开放

T1主启动与存档策略、T2生产构建/CI/缓存/回退、T3实际提交的干净CI检出、T6授权阶段保护合同继续；V1–V7完整验收、其他玩家画面、物理设备/系统IME/实际后台、Safari/辅助技术/性能与发布演练仍待完成。准备成长角色、缩短deadline、网络故障、受控blur/focus和展示夹具有明确范围，不能代替自然完整节奏、实机或实际发布。此次只完成T5，不批准原Web退役或默认切换。
