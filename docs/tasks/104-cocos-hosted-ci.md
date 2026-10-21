# Cocos 已提交候选的真实托管基础 CI

2026-10-19，用户明确授权将封存的311文件候选提交到新 `codex/cocos-ci-bootstrap` 分支、推送并验证基础CI。本轮已执行授权范围，修复真实CI发现的上下文错误，GitHub托管Ubuntu基础作业通过。任务39 T3的实际干净检出基础检查条件已满足；T2的真实SDK构建CI及正式交付条件继续开放，整体体验反馈仍集中到最后。

短计划：核对获批清单和Git状态，创建分支并提交/推送；跟进唯一push运行、修复实际失败；核验真实job、上传的单元/JUnit回执和源码，再记录完成范围并清理本地工具。

## 已授权提交与首次失败

原HEAD/main为 `5e9d97d5a987b54b2a14587fb5793c51de924294`。311文件逐一核对字节和执行位，暂存为空、无清单外改动/活动提交hook，本地与远端指定分支均不存在。只暂存获批清单，初始提交 `e1aeed0d44bd78d764d620384c691e7c18bc128a` 的tree为 `4b6da4b50ffcbe008281b741ab01a8d931497ce4`，与原审查包完全一致；main未改。原Web源码/发布工作流和玩家库保留。

首次push实际产生[运行39248873982](https://github.com/jastfkjg/RealQuest/actions/runs/39248873982)，立即failure、job/check-run均0且没有运行日志。没有把它写作通过，也没有重复dispatch。官方actionlint1.7.12明确检出job env中不允许 `runner` 上下文；[GitHub上下文表](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#context-availability)也显示runner仅可用于相应步骤字段。

只将 `COCOS_USER_DATA` 的原表达式从candidate job env移到既有production build step env，其他值/命令/触发/权限不变；按正常命令重生唯一workflow来源记录。修复提交 `f5846859fc187630f53caac5e85ca5910b78c74a` 只有这两文件，3行增/3行删，工作树干净。独立检查原文件报错、修复后exit0；自托管标签 `cocos-3.8.8` 仅在本地lint配置明确声明，没有屏蔽表达式错误或注册运行器。

actionlint来自 `rhysd/actionlint` 官方v1.7.12的darwin_arm64包，SHA256 `aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f` 与官方checksums匹配，仅在本任务output运行，无全局安装/依赖或设置变更。未安装shellcheck/pyflakes，分别禁用其可选外部调用，没有声称它们通过；原九段bash语法检查保留。

## 实际通过范围

修复push自动触发[运行39249855662](https://github.com/jastfkjg/RealQuest/actions/runs/39249855662)，attempt1、head f584685、push事件。`Source, behavior and backend checks` 在GitHub Actions托管 `ubuntu-24.04` 作业118050704899中约1分钟成功；candidate作业118051151091为skipped，没有启动SDK或占用自托管机。

| 实际步骤/回执 | 结果 |
| --- | --- |
| 完整Git检出及根/后端依赖准备 | checkout完整历史；`npm ci`、新venv及锁定pip安装、doctor成功 |
| 同步/来源/原保护 | 正常sync、404来源/107绑定、390原检查/435文件保护成功 |
| 单元回执 | 下载的result.json complete:true、expected24，全部24模块exit0，无取消/超时 |
| 后端JUnit | 下载的backend.xml实际232个testcase，failure/error/skipped均0 |
| 干净检出检查 | `Verify checkout stays clean` 实际success，未使用原Web npm安装/构建 |
| 上传 | `realquest-cocos-check-results` artifact12185291315，未过期；仅测试日志/JUnit |

artifact元数据摘要为 `sha256:d4b0ce9cf5a4b5bc7d51d90afd20f7d648df862d54cb1320c66e6fd8c0f9a81e`；下载后逐文件SHA另记在 `output/cocos-authorized-ci/fix-ci-verification.json`。CI guest PID属于远端Linux，不能拿来清理本机Mac进程。没有把这次24模块/232项当新跑全27浏览器或真实Creator构建。

平台仍提示四个既有Actions的Node20入口被强制以Node24运行，实际作业成功；原日志保留该注释和依赖弃用信息。后端另有一条既有Starlette/httpx弃用警告，零失败。本轮未升级原发布Actions或项目依赖。

## 命令、证据与边界

实际执行了限定路径的 `git switch --create`、`git add --pathspec-from-file --pathspec-file-nul`、`git commit`、SSH batch-mode候选分支push；CI使用 `gh run view/watch`、只读run/job/artifact API及 `gh run download` 跟进。修复本地另执行 `npm run cocos:sources:write`、`npm run cocos:sources`、actionlint前后对照及 `git diff --check`。完整命令/终态/清单和失败保存在 `output/cocos-authorized-ci/`，首轮失败不覆盖。

任务103的“等待Git授权/真实CI未执行”为当时状态；本轮已经获得并执行这项授权。结果文档也在同一候选分支记录，最新分支检查可从[该分支Cocos运行列表](https://github.com/jastfkjg/RealQuest/actions?query=branch%3Acodex%2Fcocos-ci-bootstrap)核对。没有创建PR、合并、推送main、公开部署、注册运行器、改账号/系统/设备设置或退役原Web。

当前J3/77709984静态包、游戏/后端/素材/锁/迁移和浏览器用例未改变；仍复用其对应执行证据，不改旧receipt。仅关闭T3实际已提交干净检出基础链，任务39现16/22项按限定范围完成，T2、V2、V4、V5、V6、V7开放：SDK CI、系统/物理设备及目标预算、正式生产与整体玩家体验继续各自验收。

本轮没有新建浏览器、开发服务或容器；下载工具、CI日志和夹具回执留在output作非运行材料。所属CLI均等到终态后收尾，原5442/I3/原档和统一5443/J3/独立新档继续供接续与整体试玩；不读取玩家数据。

实际变更文件为Cocos workflow及唯一来源清单记录；结果文档为本任务、任务39/103、README、TODO、整体交付页、生产交付说明和progress。没有新增游戏素材或资产来源变化。
