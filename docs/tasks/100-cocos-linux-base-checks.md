# Cocos 基础检查的独立 Linux 验证

2026-10-19，接续任务98的SDK无关CI与任务39 T2/T3。用户要求工程先推进、整体反馈留后。本轮用新的Linux环境验证有锁安装与基础命令的平台兼容性，没有提交、推送或触发远端CI，也没有关闭T2/T3。

短计划：确认并保存Docker原停止状态/旧资源；建立独立候选副本与固定工具镜像；在隔离Linux容器执行完整基础链并导出报告；核对源码、结算范围及原资源，正常清理并恢复Docker。

## 实际环境与输入

本机既有Docker Desktop，实际Docker Engine29.3.1；任务前API不可达、桌面进程0。本轮通过官方CLI启动，原18个容器均停止。现有经验证API载体镜像固定ID `7697a1455e27eeb9d4e0ab1c446059bc741b211679630fa6adfdb2a6ca6532c9`，实际Python3.14.8、Debian13.7/trixie、aarch64。没有将本机Python3.14.6版本写作容器版本。

Node使用[官方Node镜像](https://github.com/nodejs/docker-node)的22.23.2-bookworm-slim，实际注册表index摘要 `48e4b67d85f87bd551df43704e24d252f56cc5f8e9718841aace50f19948f0f9` 固定后再复制工具。新检查镜像 `e217590209e5f87dc2640cb4af40e22b638ac43f3f52a3fb96c2b605435a54c5` 在构建中直接断言Node22.23.2/npm10.9.8；API载体的原RootFS层逐项保持。镜像没有嵌入候选副本或测试库，测试期间也没有commit容器。

规范 `cocos-clean-source.mjs` 新建906输入副本 `clean-source-pVNoKB`，额外逐字节复制21份原保护合同所需文件，共927份/151,133,729字节。原Web清单/锁仅作为435文件保护输入保留；根npm安装不读取它们，未安装或构建React/Phaser。没有复制玩家DB、依赖、Creator缓存、历史产物或私密env。

候选副本、原Git历史和本次runner均只读挂载；容器内复制到 `/work` 后执行，所有生成物只在容器内。Git仅为源保护读取原历史，`safe.directory=/work`只对该容器进程生效，未改宿主配置。容器不挂载Docker socket或玩家库，不启用privileged，不发布端口，限2CPU/3GiB。Linux PID属于独立容器命名空间，不能拿其数字对照macOS进程去清理。

## 执行与结果

独立根 `npm ci`、新建 `backend/.venv` 后有锁pip安装；venv明确 `include-system-site-packages=false`，即使载体有既有依赖也不从系统site-packages继承。随后执行与基础CI对应的命令：

```sh
npm run cocos:doctor
npm run cocos:sync
npm run cocos:sources
npm run cocos:baseline
npm run cocos:test:unit
(cd backend && .venv/bin/python -m pytest -q --junitxml=../output/cocos-linux/backend.xml)
```

session33146 terminal0，独立容器 `70f5ee5b2108…` ExitCode0、非OOM：

- 24模块全部通过；不是只选易过的模块，原Git保护与负向夹具也实际运行。
- 后端232项全部通过，28份freeze与原锁完整一致；有一条既有Starlette/httpx弃用警告，未为提示更换依赖。
- doctor实际creator/browser为null；基础链不需要SDK、浏览器二进制、Nginx或原Web安装。
- 404来源/107绑定及390原来源/435保护合同通过；容器执行前后和宿主、副本的927输入逐份SHA256一致，原启动/发布保留。
- 前端安装目录/dist始终不存在；运行后原代码、游戏规则、素材、后端/依赖锁和候选包均未改。

Docker构建另有一个 `SecretsUsedInArgOrEnv`启发式警告，命中Git标准环境变量 `GIT_CONFIG_KEY_0`；该值实际只是非秘密配置键名 `safe.directory`，没有注入凭证。保留原构建日志，不篡改或将警告登记成测试失败。

原始unit/JUnit/环境/依赖与source-after均导出在 `output/cocos-linux-checks/reports/`；完整命令、真实操作PID/起止、镜像/只读mount与退出状态在 `result.json`，逐项核验在 `verification.json`。脚本只用于这次已有状态的本地实验，不当作无条件可重放的生产发布器。

## 收尾与范围

控制器finally导出证据并移除所属容器，没有遗留运行容器。Docker Desktop由本任务启动；停止前重新核对同一引擎、桌面主进程启动时间在本次启动区间、18个旧容器完整状态/StartedAt/image一致、无运行负载，以及卷/网络清单一致。通过官方 `desktop stop`正常恢复原停止状态，session49709 terminal0、桌面进程0、Docker API不可达。没有对旧容器、卷、网络或共享工具发出批量清理。工具镜像/构建缓存只作为非运行复现材料保留。

最终全局只读审计606份浏览器/1900份结束PID记录，无所属遗留、活动自动化或意外读取错误；原精确空JSON负例保持。容器内PID不送入宿主PID归属判断，Docker/Safari另按启动身份核对，最终六个保留进程与六项主页/构建/health通过。证据见 `output/cocos-final-candidate/{cleanup,services,verification}.json`。

当前J3/77709984封包、原5442及统一5443服务与玩家档保持。无新视觉、素材或玩家批准；无新游戏/后端/规范测试代码、锁文件、默认入口或发布流程修改。文档更新本任务、任务39、`docs/cocos-delivery.md`、`docs/cocos-handoff.md`与 `progress.md`，实际输入README/DESIGN不改，以保留上述927文件的一致性。

本轮证明的是**本机Debian13 arm64上的独立安装与完整基础检查**。它不是Ubuntu24.04/x64托管运行、干净已提交检出、实际GitHub Actions或Creator生产重建；没有执行Git干净断言，也没有改掉候选CI的该断言。T2/T3的实际CI、正式生产/其他架构与系统/设备及整体人工验收继续按任务39保留。

收尾最后一次CUA标签保留/应用清单请求返回Mac锁屏，未继续原生界面或尝试解锁；本轮专用应用退出此前已由精确PID/CLI终态/端口核验。该次标签保留标记未能确认，不据此声称新的界面检查通过，5443服务与链接仍按上述健康证据保留。
