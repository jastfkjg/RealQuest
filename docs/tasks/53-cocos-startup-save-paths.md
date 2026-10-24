# Cocos 主启动与存档路径

> 启动入口现统一为 `start.command`，本文中的入口名称已更新；其余历史参数、端口和验证记录保留当时状态，当前用法见 [本地说明](../cocos-local.md)。

2026-10-17，接续task39 **T1 本地启动链完成**。Cocos人工主入口、只读预检、明确库/来源、真实就绪、同库互斥与退出清理已实现并验证。[长期使用说明](../cocos-local.md)区分源码构建、预构建预览、统一自动化与生产交付。原 `start.command` 和默认Web发布保留，实际切换继续由其余T/V门槛约束。

本轮计划已执行：复用现有启动器补环节→新库真实进程测试→公共会话/生命周期回归→同库备份重启人工预览→记录收尾。没有改游戏画面、运行时资产、API规则、模型或迁移；未提交/推送/部署，没有删除代码或重置数据。

## 改动与行为

- `clients/cocos/tools/run-preview.py` 重构为可预检的单一入口，继续由根 `start.command` / `cocos:preview` 调用。`--check`验证包/数据库/后端锁定依赖、端口、同库租约，不安装/迁移/创建目录或文件，不启动API/代理。
- 显式参数覆盖Cocos专属环境变量，输出绝对库/包路径、端口、cookie和来源。历史默认包/库/端口保留，文档明确要求新运行显式选择。继承的 `DATABASE_URL` 不用于选择库，避免环境意外指向其他数据库；不打印其值。
- 校验端口范围/重复/占用、SQLite文件、数据库软链接、公开产物目录内的数据库和ready文件位置；错误在迁移前拒绝。同库 `.preview.lock` 使用操作系统互斥锁，记录PID但不靠旧PID判断活跃；锁覆盖迁移、启动与所有服务关闭。该租约只能约束使用同一新启动器的进程，历史/外部服务仍须先正常停止。
- 迁移、依赖检查、API与代理进程统一登记；迁移有限超时、SIGINT/SIGTERM及失败均进入finally。清理只针对直接创建且无需reload派生的进程；正常退出后才释放库锁，必要时仅定向强制回收该子进程。重复中断不会打断清理。
- API、Cocos根与代理health（可选原Web亦同）实际200后才写ready；启动前失败/超时不产生就绪记录，运行中某个服务退出会停止所属同伴。保留原ready字段，新增实际状态/来源信息。
- `clients/cocos/tools/test_guard.py` 增加迁移前控制器归属检查，将配置、run/nonce、父PID、目标新test.db、ready文件、包与端口绑定；已有夹具写入守卫保留。`test-preview.py`、`tools/test-cocos-preview.mjs`提供纯单元和真实启动回归，根 `cocos:test:startup` / Cocos `test:startup`可运行，`tools/cocos-unit.mjs`增加启动模块。`.gitignore`排除数据库租约文件，来源清单显式刷新到368文件/106绑定/93冻结输入/87引用。
- 根与Cocos README、TODO、清单和progress更新；详细进展在本任务，长期命令/接续条件在 `docs/cocos-local.md`，没有向AGENTS追加历史。

## 实际环境与命令

macOS，Node22.23.2/npm10.9.8、既有Python3.14.6锁定venv、Playwright1.64.0/Chromium。复用task52真实Creator3.8.8 `web-regression-navigation/web-desktop`，运行时源仍为 `6c1230de659a4e888918f156f72734524a1ef257f11b4c9383bcf99cb3f5cf69`，包仍为 `1132a5f655708522ed004155ba211371d9dc721ea7bdfddae23db02925bdb099`；公共校验入口确认指纹匹配。仅工具变化，无需把同一个运行时重新构建冒充新画面验证。

根目录，Node22/npm10：

```sh
npm run cocos:sources:write
npm run cocos:test:unit -- --report output/cocos-startup/all-unit/result.json
npm run cocos:test:unit -- --only preview-startup,source-ownership --report output/cocos-startup/final-units/result.json
npm run cocos:test:startup -- --build web-regression-navigation/web-desktop --web-build output/cocos-regression/web-compat-current
npm run cocos:test:runner -- --build web-regression-navigation/web-desktop
npm run cocos:test:browser -- --build web-regression-navigation/web-desktop --suite session
npm run cocos:baseline
npm run cocos:check
```

`cocos:check`使用显式官方 `COCOS_CREATOR` 路径。初次遗漏该环境变量按设计拒绝，随后配置真实路径通过；不把该拒绝当产品失败或类型通过。真实进程/浏览器运行需要允许本机回环监听；本轮已在获准环境中实际执行。未新增下载或依赖。

## 结果与范围

| 检查 | 实际结果/证据 |
| --- | --- |
| 统一单元 | `output/cocos-startup/all-unit/result.json`，19模块全部通过；启动单元从10扩充到11项后，`final-units/result.json`定向复核2模块通过，无ResourceWarning |
| 启动单元11项 | 新库预检无创建、check无副作用、无效/重复端口、缺包、非SQLite/软链接保留、公开库拒绝、ready位置、cookie/超时、环境覆盖、既有库字节及活跃租约、控制器错误库/端口/ready/父PID迁移前拒绝；只操作自建空夹具并清理 |
| 真实启动9组 | [run-7dk0x2vz/result.json](../../output/cocos-startup/run-7dk0x2vz/result.json) complete:true。只读无创建、端口占用不迁移、两端真实health与Cookie→Cocos同save ID/完整导出、同库第二启动拒绝、正常退出、同库重启Cookie与Bearer/全部表指纹保留、API意外退出、迁移中断、迁移硬超时均通过 |
| 浏览器会话 | [run-NTWYsm/result.json](../../output/cocos-regression/run-NTWYsm/result.json)，4组/8PNG，实际恢复/双标签/凭证异常/指针返回等既有断言通过；全部专属浏览器和服务退出。已查看 `suites/session/network-recovered-740.png` |
| 生命周期 | [lifecycle-LkOo0V/result.json](../../output/cocos-regression/lifecycle-LkOo0V/result.json)，正常、故意失败、硬超时、服务异常、运行中取消、启动取消、端口占用7类通过；故意FAIL日志为基础设施夹具，不算游戏失败或覆盖 |
| 保护/类型/来源 | 390原Web/素材/规则/迁移保护及精确提取/注册表合同通过；`typecheck.log`为106绑定/真实Creator类型；368文件来源核验通过，81PNG/25共享/79场景读取不变 |

真实启动检查走公开HTTP会话/命令/导出接口，使用独立生成的测试角色，不是浏览器UI或真实玩家迁移证明；完整数据指纹在无客户端写入的测试重启前后比较。迁移取消/超时通过仅本轮 `PYTHONPATH` 下的等待模块制造可观察进程，不修改Alembic、数据库规则或人工环境。未重跑后端232项或全22套游戏矩阵；它们是task52同运行时的独立证据。本轮针对改变的启动链、会话公共入口和生命周期复核。

本轮新增素材/字体/音频/依赖为0；未改任何画面，没有扩大task49偏好批准范围。

## 人工预览与清理

此前人工84208/84210/84211通过PID、启动时间、父子关系、cwd、命令与5442/8142监听核实，向launcher正常SIGTERM后全部退出，旧终端session41807收尾为0。记录 `output/cocos-startup/manual-old-exit.json`。

停服后只读一致性备份 `output/cocos-startup/manual-before.db`（0600，774144字节）；新启动前后全部表及模式逻辑SHA256同为 `e40d02d55219fd9b5a88fb16d60e80d962c45c4d9d37efbae786ade7ab9fb36a`，**1角色/974条结算记录**，头003，`manual-before-after.json`为unchanged:true。没有覆盖、删除、恢复或重置人工存档；用户此前新增记录也已保留。

人工 **http://127.0.0.1:5442/** / API8142仍为同一个navigation包、同一 `output/cocos-data/local-preview.db` 和cookie `realquest_polish_local`，仅改用新启动器。当前launcher89393/API89396/proxy89397，终端session29885，为持续试玩保留；新ready已在实际health后写入 `output/cocos-startup/manual-ready.json`，库租约由新launcher持有。用户既有浏览器标签未被操作。启动期API尚未监听时的health502被等待逻辑吸收，未提前写ready或报告可用。

[cleanup.json](../../output/cocos-startup/cleanup.json)核对15份本轮报告、74个已结束任务PID及浏览器唯一owner/profile标记，均无存活遗留；旧人工3进程亦确认退出。保留新人工3进程，root/API health/构建记录最终均200。共享/无法确认归属的Node/MCP宿主、用户浏览器及其他任务保留；未使用广泛杀进程命令。

收尾 `git diff --check`、Python语法和368文件来源检查通过；汇总见 [verification.json](../../output/cocos-startup/verification.json)。

## 后续

T1完成的是本地主入口/配置/库策略/停止行为，并不提前切换原默认入口。T2生产构建/CI/静态或容器发布/缓存回退、T3实际提交CI检出、T6阶段保护合同以及V1–V7继续；生产数据库副本恢复、实际Cookie条件、设备/系统/性能、其他画面和正式发布不以本轮HTTP夹具替代。整体目标继续，原Web退役尚未获准。
