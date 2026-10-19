# Cocos 整体候选

2026-10-19 用户明确要求以基础迁移完成为终点，当前基础迁移已完成并收尾。Cocos核心功能/数据管理/旧档接续/现实成长与学习记录已补齐，真实托管基础CI已通过；无需继续任务106 SDK CI授权。下方完整SDK/系统实机/生产与整体验收仍是未完成的后续清单，不冒称通过，也不再阻塞本轮结束；原Web及正式入口保留。

[任务106](tasks/106-cocos-one-time-sdk-ci.md)已准备候选分支的单次SDK CI入口、官方运行器与自动注销控制器，72策略/13生命周期检查及SDK验签通过；未提交、注册或执行SDK CI。精确10文件补丁与操作边界已封存，等待该部分Git/账号操作授权，不要求逐屏反馈。当前远端仍是任务104基础CI通过的提交；16/22完成状态保持。

[任务105](tasks/105-cocos-signed-sdk-input.md)已准备签名有效的Creator3.8.8输入副本，并在独立工作SDK/906源码/新依赖中实际重建；107绑定和真实类型通过，269产物与当前J3完全一致。当前输入由 `output/cocos-sdk-ci-preparation/pristine.json` 定位，旧SDK和本轮工作包后来已缺失，相关后续字节复核明确未完成。SDK CI仍未注册/执行；本轮文档未提交，T2和其余五项继续。

[任务104](tasks/104-cocos-hosted-ci.md)已按明确授权在 `codex/cocos-ci-bootstrap` 提交并推送候选，修复首次CI上下文错误；[真实托管基础CI](https://github.com/jastfkjg/RealQuest/actions/runs/39249855662)通过24模块、232后端、来源保护及干净检出，下载回执已核验。T3完成，现16/22项完成；SDK作业skipped，T2和其余五项门槛继续开放。下文任务102/103的等待Git授权为历史阶段，main与原发布保持。

2026-10-19，现有功能与已完成的本地验证已汇总为一个整体候选，后续验收证据继续补入本页。按用户要求，画面、手感与完整节奏集中留到整体反馈，不再逐屏请求确认。本页是当前交付入口；历史任务中“等待逐屏反馈/保留专项服务”的描述以本页为准。原Web退役仍按[任务39](tasks/39-cocos-primary-retirement.md)，本次没有删除代码或切换正式入口。

后续[任务99](tasks/99-cocos-keyboard-coverage.md)补直接键盘覆盖：1440×900及740×360、15轮正反向Tab/142个可用控件位置，禁用保存跳过、真实编辑框Tab离开与草稿恢复，最终11检查/14PNG通过。游戏与试玩包未变；此前输入法末端来源和系统读屏仍未验证。

[任务100](tasks/100-cocos-linux-base-checks.md)进一步通过Debian13 arm64独立安装/基础链：24模块、232后端项、28锁定依赖及927输入一致性核验。Docker和测试容器已收尾，原18容器/卷/网络保持；实际Ubuntu托管CI与干净提交检出仍未执行。

[任务101](tasks/101-cocos-amd64-delivery.md)补当前包/API的amd64镜像、回环HTTPS/同档/更新回退七项和独立中断，实际x86_64运行于arm64 Docker Desktop仿真；4PNG、19 API源/28锁定版本及427输入验证通过。测试资源和Docker已收尾，未把仿真当原生硬件性能或正式上线。

[任务102](tasks/102-cocos-source-review.md)已准备限定范围的提交前补丁，实际从基准归档还原、正常同步、404来源/107绑定、390/435原保护及J3源码指纹一致；原仓HEAD/暂存区/配置保持。最终补丁与验证目录见 `output/cocos-source-review/latest.json`。这是后续审查材料，未创建提交或执行真实CI。

[任务103](tasks/103-cocos-ci-bootstrap.md)修补首次CI入口：获授权推送 `codex/cocos-ci-*` 候选分支可自动运行普通verify，SDK仍仅main显式手动勾选。十个静态事件/条件、YAML/九shell及原保护通过；只有workflow清单记录变化，游戏与试玩包保持。新补丁更新当前审查指针，旧快照保留；真实CI仍待Git操作授权。

## 一个试玩入口

[打开当前J3候选](http://127.0.0.1:5443/)，API8143。已在实际浏览器确认欢迎页正常、无控制台警告或错误，停留在登记页，未替玩家创建角色。可按正常新旅程依次体验村庄、地图找人、交谈、行囊、现实成长与研习。

这份试玩使用独立新库 `output/cocos-final-preview/local-preview.db` 和cookie `realquest_cocos_final`。原[5442试玩](http://127.0.0.1:5442/)仍为I3，继续使用原库 `output/cocos-data/local-preview.db` 和原cookie，适合接着已有进度游玩。两者没有搬库或共享玩家数据；旧角色凭证依赖对应服务器数据库，不能用凭证把旧档导入这份空库。旧Web→Cocos连续性已经在专用隔离夹具验证，真实玩家库不参与自动化。

![当前候选的实际欢迎页](../output/cocos-final-candidate/welcome.jpg)

已关闭读屏50230/50231与首领取景53136/53137专项主机，保留原始证据和QA数据库；对应专项标签在清理时已不在浏览器清单。保留当前5443标签/服务供整体试玩，保留原5442及用户已有浏览器。系统读屏没有启用。

## 本地启动和检查

根目录使用Node22/npm10与锁定依赖，后端使用已准备好的Python3.14 `backend/.venv`；构建需官方Creator3.8.8。完整首次准备见[README](../README.md)，路径与存档规则见[本地说明](cocos-local.md)。当前服务已运行，无需另启动同端口；日后服务正常退出后，可用相同独立库重启：

```sh
./start-cocos.command --check --build web-release-framing-j3/web-desktop --database output/cocos-final-preview/local-preview.db --port 5443 --api-port 8143 --cookie-name realquest_cocos_final
./start-cocos.command --build web-release-framing-j3/web-desktop --database output/cocos-final-preview/local-preview.db --port 5443 --api-port 8143 --cookie-name realquest_cocos_final
```

预检不会迁移或创建库，正式启动执行既有迁移并检查API/代理就绪；Ctrl+C只关闭本次启动的服务。不要删除数据库或清Cookie来排查问题。预览不热更新，也不是生产服务器。

常用检查从仓库根运行：

```sh
npm run cocos:doctor
npm run cocos:sync
npm run cocos:sources
npm run cocos:baseline
npm run cocos:test:unit
(cd backend && .venv/bin/python -m pytest -q)
npm run cocos:test:browser -- --build web-release-framing-j3/web-desktop
npm run cocos:package -- --verify output/cocos-final-candidate/static
```

完整浏览器矩阵耗时较长；统一控制器自行准备独立测试库并清理浏览器/API，不需要使用5442或5443玩家库。真实类型检查需配置 `COCOS_CREATOR` 后运行 `npm run cocos:check`；改运行源码后必须用新构建目录真实重建，不能改旧receipt使其通过。

## 功能与证据

| 范围 | 当前候选包含 | 验证来源 |
| --- | --- | --- |
| 数据与接续 | 导出、恢复凭证、同服务器旧旅程接续、明确删除范围及失败重试 | 任务40、56、74、81；SQLite/WAL及固定PG17确定性夹具 |
| 现实成长 | 历史日期/月筛选、三种余额、今天/历史/归档、学习计划及书页编辑关联、旧锻炼记录 | 任务41、82；跨日/旧响应/丢包/双标签等数据合同 |
| 游戏入口 | 六外观登记、完整档案/培养、指南/任务、地图/移动村民、交谈、四格行囊、偏好/提示 | 任务42–49；地图找人/底部回答/行囊四格及偏好已获限定范围的玩家确认 |
| 当前生产引擎 | Creator3.8.8 J3、269产物，debug和sourceMaps关闭、MD5开启 | 任务77全27套；之后consistency采用任务82、semantics采用任务99，其余25套现行用例/引擎/后端指纹重新核对 |
| 桌面与网络 | Chrome/Edge/Firefox代表链、各自45分钟会话、固定七样本网络与回环容器HTTPS | 任务78–93，分别保留环境和测量边界，不合称生产或物理设备通过 |
| 原生输入 | Chrome100/125/150/200%代表链及恢复100%，真人中文研习保存/刷新 | 任务95/96；IME结束事件来源及其他链未完整验收，浏览器AX不等于系统读屏 |
| 最近检查 | 任务98的24组单元/232项后端、YAML/9段shell语法与封包；任务99的键盘11检查/来源单元/原保护 | [任务98](tasks/98-cocos-overall-candidate.md)、[任务99](tasks/99-cocos-keyboard-coverage.md)、`output/cocos-final-candidate/verification.json` |
| 独立Linux基础链 | Debian13 arm64、Node22.23.2/npm10.9.8/Python3.14.8，927输入、24模块/232后端、28依赖锁一致，原Web未安装/构建 | [任务100](tasks/100-cocos-linux-base-checks.md)、`output/cocos-linux-checks/verification.json`；非实际GitHub/Ubuntu或干净提交检出 |
| amd64交付功能 | 当前静态包与API两镜像的x86_64运行、HTTPS/原Cookie旅程/移动保存/旧版本/回退与中断 | [任务101](tasks/101-cocos-amd64-delivery.md)；宿主arm64仿真、Mac Edge客户端，不作为原生目标性能/实际CI |

任务98/99没有游戏运行代码、规则、依赖或素材变化；键盘扩展已用现有套件单独复验，其余保留当前J3的原执行证据，不冒称又执行了一遍全27套。任务98后端有一条既有Starlette/httpx弃用警告，测试零失败。

## 封存与交付准备

可核验的静态生产候选在 `output/cocos-final-candidate/static`，11个保留版本、2946站点文件，整体SHA256为 `77709984d30470abdf03af1e64937112a6e929ae580a4383994cd33a8f3a350d`，与任务88–93所验证封包相同。当前活动版本 `260b75754510b58e843ffacb41fddc61a7f9f58c6e79ec97068c06103af065cf`。打包及传输后可用上方 `--verify` 校验；候选不包含玩家数据库。生产Nginx/镜像/回退复现方法见[交付说明](cocos-delivery.md)。

独立Cocos CI分为普通Ubuntu `verify` 和显式勾选的SDK `candidate`。用户已授权候选分支提交/推送，基础层已在GitHub实际通过；SDK层当前本地补丁已准备精确候选分支/专用单次标签的手动入口，尚未提交或执行；远端已提交版本仍仅main手动勾选。原CI、部署工作流、main及默认Web入口保持，真实SDK/生产门槛继续。

最近设备只读核对识别到一台已配对iPhone，但通道unavailable，USB没有移动设备项，本机无可用ADB；专用SDK运行器最近查询仍0。没有更改配对/信任/系统设置、注册运行器或启动设备应用，详见任务102/104。设备与SDK限制不需要用逐屏反馈来替代。

## 整体反馈与环境验收

工程候选已准备好，无需先回答此前每个专项问题。整体试玩后再集中评估完整节奏、战斗手感、引导与剩余画面；此前确认只按原范围保留，不自动扩展成整体验收。

尚未验证的环境项是Safari/iOS/Android与物理横屏、多指及完整系统可访问性/IME范围、真实SDK构建CI、正式生产角色/数据库/域名证书/发布回退和相应发布预算。它们保留在任务39，既不伪称通过，也不以缺少逐屏反馈阻止工程。已执行的Git授权仅为候选分支和基础CI；没有合并、发布、账号/系统设置变更或原Web退役。

Safari当前环境限制已另用纯诊断页核实：普通/前置/全屏及页面获焦后均报告hidden，短暂有动画帧不等于可见游戏会话，详见[任务69补充](tasks/69-cocos-pause-regression.md)。诊断资源已关闭，后续待可见控制环境变化再试，不反复重开相同预检或改浏览器安全设置。
