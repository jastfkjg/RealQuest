# 一次性 Cocos SDK CI 候选

2026-10-19 后续范围决定：用户明确表示“差不多就行了；基础迁移完就可以停了”。本任务停止在准备阶段，专项授权请求不再推进，未提交补丁与控制器保留为草稿；没有新增commit/push、注册token、运行器注册或SDK dispatch。下文是当时准备及待授权方案，不是后续执行指令。基础迁移收尾不等于本SDK CI或完整Web退役验收通过。

2026-10-19，接续任务104真实基础CI、任务105签名有效SDK输入。本轮已准备限定候选分支的手动SDK入口和一次性运行器控制器，完成本地验证；尚未提交/推送这些改动、请求注册token、注册运行器或dispatch SDK作业。T2与其余五项仍开放，16/22完成。整体体验反馈继续留到最后，原Web代码、玩家数据、main和正式发布入口保留。

短计划：冻结现有基础CI与SDK来源；准备只接一个专用作业的运行器路由；验证工作流和失败/取消收尾；封存具体补丁，最后取得SDK Git/账号操作所需单独授权。

## 已准备的改动

`.github/workflows/cocos.yml`的普通Ubuntu verify逐项保持，与已实际通过的基础CI相同。候选SDK入口要求workflow_dispatch、typed boolean `build_candidate=true`、精确分支 `codex/cocos-ci-bootstrap`、专用 `realquest-sdk-once-` 标记；普通push仍只跑verify。main原有手动入口与原专用标签路由保留，但本次不触发main作业。

一次性标记同时用于run-name、运行器名称和唯一标签。临时运行器注册参数为 `--ephemeral --no-default-labels --disableupdate`，只带本轮随机标签，不接收main的通用SDK标签任务。它不安装成系统服务，官方ephemeral模式限定一个job。每次开始前核对精确HEAD/已封存文件、远端候选SHA、SDK全量签名、磁盘余量；从官方归档重新解出干净运行器，SDK使用APFS独立工作副本，保留输入不执行。

SDK job改为核对本机已有Node22.23.2/npm10.9.8/Python3.14与Creator3.8.8，再执行原有新检出、有锁安装、真实类型、24单元模块、后端、release、交付/生命周期、规范27浏览器、网络和封包检查。仅SDK job移除setup-node/setup-python动作，避免临时运行器更改主机工具安装；原verify动作不变。没有删减SDK验证命令或放宽预算，没有新增依赖/全局安装/仓库变量/secret。

`docs/migration/cocos-source-inventory.json`按正常工具重生，404来源/107绑定不变，只更新workflow记录。其余待提交文件是任务105/106及任务39、整体/本地/交付/TODO/progress文档，共10文件；游戏、后端、素材、锁文件、迁移和浏览器用例未改，无新资产。精确清单与二进制补丁分别为 `output/cocos-sdk-ci-once/manifest.json`、`candidate.patch`。

## 运行器来源与控制器

官方[actions/runner v2.338.0](https://github.com/actions/runner/releases/tag/v2.338.0)的macOS arm64包128,562,863字节，SHA256 `df4cebda25c86a886ed204e49fee63f5c2e7cec5f447b5c98440a826bbdf9df2`，匹配官方release asset digest；本地只执行 `Runner.Listener --version`，得到2.338.0。没有运行config、listener或service。本轮读取[官方CommandSettings](https://github.com/actions/runner/blob/v2.338.0/src/Runner.Listener/CommandSettings.cs)确认token环境输入会被mask并从环境移除；[官方ephemeral说明](https://docs.github.com/en/actions/reference/runners/self-hosted-runners#ephemeral-runners-for-autoscaling)作为单job语义依据。

任务本地控制器为 `output/cocos-sdk-ci-once/controller.py`，默认只输出read-only-plan。它与测试、验证器均在被Git忽略的output内，不进入游戏、源码包或CI依赖。审批后的实际操作仍需明确执行参数、冻结manifest SHA和已推送新HEAD；参数本身不构成人工授权。

实际流程拟为：同候选分支提交/推送这10文件，先确认新基础CI成功；请求临时注册token，注册离线运行器；以唯一标记dispatch一次；按run名/HEAD/workflow/event/branch定位准确run，再启动listener。注册token只存在内存及配置进程环境，不进入argv、回执或worker；worker使用允许列表环境，保留真实HOME，不继承父进程的GitHub、模型、SSH及Node注入变量。

API不确定时不自动重发dispatch。成功、失败或取消均执行finally：只取消本轮准确run，停止本轮新进程组/精确私有路径且身份匹配的helper，确认临时运行器注销，复制自有夹具报告，删除临时凭据、SDK副本、依赖、浏览器、缓存和私有runner日志。归属不符不删除，进程尚未确认停止时保留私有工作目录并明确报错。远端注销或取消未确认时记录cleanupErrors，不宣称已清完。不会触碰现有5442/5443预览、玩家库、用户浏览器或其他任务运行器。

## 本轮实际验证

| 实际命令/检查 | 结果 |
| --- | --- |
| `node output/cocos-sdk-ci-once/validate.mjs` | Ruby YAML、actionlint1.7.12、10段bash语法、72个事件/分支/boolean/专用标签案例通过；不是GitHub调度执行 |
| 同一验证器结构比较 | verify精确保持；SDK既有check/build/27browser/delivery/network命令保持；原CI/deploy与根/后端锁SHA保持 |
| 实际SDK工具预检step | 用已签名SDK路径/Node/npm/Python执行通过，缺失SDK负例拒绝；未执行SDK |
| `python3 output/cocos-sdk-ci-once/test_controller.py` | 13项：默认只读、环境过滤、专用单job参数、run多字段匹配、不确定dispatch不重发、准确注销/取消、API失败收尾、身份变化不删、未停止时保留工作目录；含真实独立子进程超时退出 |
| `codesign --verify --deep --strict` | 保留的Creator3.8.8输入再次全量验签exit0 |
| `npm run cocos:sources`、`node tools/test-cocos-sources.mjs` | 404来源/107绑定及既有来源负向合同通过 |
| `npm run cocos:baseline` | 原390检查、435保护文件、18封闭例外/九精确替代/46旧断言通过 |
| `git diff --check` | 通过 |

actionlint本轮没有shellcheck/pyflakes，不声称这两工具通过。控制器的API故障使用隔离替身，真实子进程检查只运行短时Python，不注册或模拟Cocos构建通过。当前GitHub运行器只读查询仍0。任务104的GitHub基础CI、任务105本地真实SDK重建和本轮SDK CI准备分别记录，不能合并称真实SDK CI已经通过；没有新24/232/全27或新视觉批准。

## 所需授权与边界

需要单独授权的是：将这10文件在现有 `codex/cocos-ci-bootstrap` 分支提交/推送，并在本Mac为 `jastfkjg/RealQuest` 临时注册一个专用单job运行器、触发和核验一次手动SDK CI、随后注销清理。若首次dispatch在当前仓库状态被GitHub拒绝，保留失败证据并收尾，不绕到main合并、改账号权限或增加公开发布。

这次权限来源是仓库[AGENTS.md第22行](../../AGENTS.md:22)：`Do not commit, push, deploy, purchase assets, migrate engines, or change account settings without authorization.` 用户此前明确授权的是封存311文件候选分支与基础CI，任务104已经完成；它不自动扩大为本轮SDK改动、运行器账号注册和执行。此请求不要求逐屏体验反馈，不包含PR/main合并推送、生产部署、SDK上传、系统设置或原Web退役。

本轮未新建浏览器、开发服务、容器或listener；测试临时目录与短时子进程已退出。官方runner归档/未注册工具目录、已验签SDK输入和审查证据保留用于下一步；5442/I3与5443/J3两套人工预览继续保留。后续清理/健康与精确快照在 `output/cocos-sdk-ci-once/verification.json`，当前aggregate保留实际基础CI与SDK未执行的范围。
