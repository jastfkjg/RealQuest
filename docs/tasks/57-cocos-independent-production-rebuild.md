# Cocos 当前生产包独立重建

2026-10-18，接续 task39 V7/T3。玩家确认地图与找村民、底部交谈回答、行囊四格可以保留；既有 task49 偏好确认继续有效。此次只验证构建工具，不扩大视觉批准范围。

计划：

1. 从当前工作树生成独立源码快照，排除原 Web 安装/构建、玩家数据库、依赖目录、Creator 缓存与旧产物；按根锁文件独立安装工具。
2. 使用既有官方 Creator3.8.8、全新项目缓存和专属 userdata，按 task54 相同生产选项构建；记录真实退出状态、源文件前后哈希和所有产物字节差异。
3. 核验新产物并实际加载，保留差异诊断和来源边界；原仓单独执行需要 Git 历史的保护。收尾检查所属进程，保留 5442 人工试玩及原库。

这是包含未提交工作树的源码快照，不是已提交的干净 CI 检出；复用既有官方 SDK、Python 环境与浏览器不能表述成全新工具安装。目标 PostgreSQL17、容器、HTTPS、真实 CI 与实机仍按开放清单处理。本机 Docker socket 不存在，未启动 Docker Desktop 或改变宿主设置。

## 完成结果

本机 macOS arm64、Node22.23.2/npm10.9.8，既有官方 Creator3.8.8；Python3.14.6 锁定 venv 在构建完成后显式软链接复用，Playwright1.64.0 使用既有锁定 Chromium。没有安装原 Web 工具或构建 React/Phaser。

独立快照为 `output/cocos-toolchain/clean-source-zgReeN`：882 个源文件、150,067,813 字节。初始无 `.git`、`frontend/package.json/node_modules/dist`、后端 venv、Creator library/temp、构建包和专属 userdata。第一次默认 npm 缓存的离线安装因 TypeScript 包未缓存失败；保留 `npm-ci.log`，随后按同一锁文件、独立缓存从 registry 正常安装五项工具依赖，未更新版本或全局 npm。`npm-tree.json` 记录实际安装树。

使用与 task54 相同构建名 `web-release-ready-task54` 和生产参数，专属 userdata 为 `/private/tmp/realquest-cocos-repro-task57`。真实 Creator 返回成功码36，现有构建包装器返回0，所属进程组退出；总用时约19.7秒。没有复制旧引擎产物，也没有对比前改写或规范化文件。

| 检查 | 本轮实际结果 |
| --- | --- |
| 当前运行时源 SHA256 | `872e903e5f8a922204cd87580ebf6806daf59847293a24800a8d60fc8f2d2e1b`，两项目一致 |
| 产物 SHA256 | `7d98fcf44dd00bf4441f7c8f52eb86a27f5b96e9201e10611afa88fbeee72784`，两次独立引擎构建一致 |
| 逐文件核验 | 266 文件、14,812,110 字节；新增/缺失/字节变动均为0，无 sourcemap；两个真实 receipt 各自重新核验源与实际文件 |
| 快照输入 | 构建前后及全部测试后882源文件哈希完全相同；新生成的项目缓存独立留在快照内 |
| 真实类型/来源 | 副本106绑定与真实Creator类型通过；384来源文件、107静态引用、93冻结Web输入、79场景输入核验通过 |
| 副本单元 | 21模块通过，包含10项SQLite合同；需要真实Git历史的transition-protection没有伪造在副本执行 |
| 原仓历史保护 | 原390基线/精确提取、435原Git文件/18封闭例外/9精确形状/46旧断言通过；原启动发布保留 |
| 新包真实浏览器 | `run-Twyeox/result.json` complete:true，session5组＋原技能帧客户端2组、13PNG；零意外控制台/页面错误，全部浏览器与测试服务退出 |

实际执行中文登记/资源未就绪焦点保护、当前凭证备份后切旅程、双标签页阻止旧旅程操作、失效凭证恢复，以及1440/740丢包后同一请求重试、只读地图打开/关闭、恢复操作。真实服务器时间未缩短；沿用 `develop-web-game` 原客户端的已记录真实时钟/配置/关闭适配，没有新增游戏规则或快捷输入。实际查看740重连画面和1440地图；740成功结果提示仍局部被四格挡住，沿用V5已有待办，不把本轮构建验证扩大为布局验收。

证据集中在 `output/cocos-reproducibility/`：`snapshot.json`、`rebuild.json`、`creator.log`、`verification.json`、`npm-tree.json`、`cleanup.json`；完整单元/浏览器结果位于副本 `output/cocos-reproducibility/unit/result.json` 和 `output/cocos-regression/run-Twyeox/result.json`。`rebuild.mjs`/`verify.mjs`/`audit.py`是本轮带固定证据路径的实验脚本，不是新的日常产品入口。长期复现方法见 [交付说明](../cocos-delivery.md#独立生产重建)。

清理核对14份报告、38个PID和启动时间、专属浏览器标记/项目路径/Creator userdata，无所属后台进程遗留；所有执行会话终态0已收取。保留的人工5442/API8142、原debug构建记录均200，原89393/89396/89397进程与原库继续保留供玩家试玩，没有读取/备份/重启或修改它。用户既有浏览器、共享工具及其他任务资源未关闭。

## 仍开放的门槛

此次完成V7的**当前候选在本机独立生产重建**部分。它不是跨系统/架构可复现性、全新SDK/Python安装、已提交CI克隆、目标容器/HTTPS或生产数据库切换证据。产物字节与task54最终22套/148组候选完全相同，因此没有再次重复完整游戏矩阵或未改的232项后端测试。

本机只发现PostgreSQL18及libpq18工具，目标生产配置固定PostgreSQL17；未用18的结果替代17，也未启动Docker Desktop。T2/T3实际CI、V1目标数据库、V2/V3完整行为边界、V4剩余玩家画面/手感、V5布局/可访问性、V6设备/预算和V7目标部署仍开放。无新UI、素材、依赖、游戏/API/迁移规则改动；原Web默认启动、发布、源文件与玩家库保持原状。
