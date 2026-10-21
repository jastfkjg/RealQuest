# 当前 J3 容器与回环 HTTPS

后续：[任务89](89-cocos-edge-container-network.md)将本机容器/HTTPS和中断证据更新到任务88的新77709984配置及真实Edge，并完成随后独立七网络样本；原本文2f8e4a59包及其环境回执不改。正式生产、其他目标与实机/系统/玩家门槛仍开放。

后续更新：[任务81](81-cocos-pinned-postgres-restore.md)已补当前J3、固定生产模板Alpine镜像和模板角色/库名的隔离恢复；V1按原允许的夹具范围关闭。本文中这些待办是本任务结束时的历史范围，真实生产/全局角色及其他开放门槛不变。

2026-10-18，接续任务79与任务39 T2/V6/V7。本轮本地完成：当前J3实际Linux arm64容器、受本轮证书约束的回环HTTPS和主动中断清理验证通过；实际CI、生产域名/证书、生产库/角色、amd64、系统/实机和玩家验收仍开放。

短计划：核对Docker原状态与既有工作负载；用新标签构建已封存J3、固定API镜像ID；沿用既有容器七项检查并补WebP MIME、取消时的输入/资源清理；正常流程后另起独立中断例；核对产物/源码/锁定依赖/QA库与截图，确认资源退出并恢复Docker原停止状态。5442/I3及玩家存档不参与测试。

## 当前输入与真实环境

`candidate-j3`是任务79已封存的11版静态包，active `260b75754510b58e843ffacb41fddc61a7f9f58c6e79ec97068c06103af065cf`，artifact SHA256 `2f8e4a59e59767bb68f5cfd7e19ca0430f212aad537993ca6efab5368cc26df5`。当前J3 source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e` / payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`，269文件，未重新构建/修改游戏。

只读预检确认Docker Desktop停止、API socket不存在且无Desktop后台进程。受限沙箱首查无法创建CLI日志，提升权限后的只读核对仍确认停止；不是把权限错误当作引擎未运行证明。随后正常启动已有Desktop，无许可接受、账户、系统信任或设置修改；Docker29.3.1/linux aarch64，0运行容器，原18个停止容器保留。

构建使用包内原固定Nginx索引digest `892bb2152464f0c5d8972593a5f5afaf8054552580b699d95f8ff4af08c2d33d`，新标签 `realquest-cocos-qa-j3:20261018-8b53869b0309a565`，镜像ID `sha256:c1dbce62775a127bce00952e9263cd95e6ed344069278ea04037085e9c9f9104`。未覆盖旧镜像、推送或部署。Docker镜像存储的基础digest初次查询缺失被如实记录；真实构建随后通过，不将该查询失败称为构建失败或省略构建验证。

API复用固定ID `sha256:7697a1455e27eeb9d4e0ab1c446059bc741b211679630fa6adfdb2a6ca6532c9`，没有重建或修改它。实际前端Nginx1.31.7/Alpine3.24.2/aarch64；API实际Python3.14.8/Linux arm64。另以该API镜像运行一次无网络、无端口、无数据库挂载的临时检查：19份Python源与根目录逐字节一致，requirements.lock SHA相同，28项已安装依赖版本全部匹配锁文件；该临时容器自动移除。

## 正常产品链与中断结果

image-build工具session96353终态0；主矩阵session42138/controller15828终态0，两个不同run/nonce/网络/容器/端口/Cookie/QA库顺序执行：

| 运行 | 结果 | 范围 |
| --- | --- | --- |
| `run-5HeDKZ` | exit0，complete:true，7组/4PNG | 当前J3实际容器HTTPS完整链 |
| `run-DhveHJ` | 期望exit130，complete:false/cancelled:true；中断验收成功 | 浏览器已真实启动且页面就绪、两容器/网关存在时，对精确归属worker发SIGINT；前5项准备检查不是新的产品全量通过 |

正常七项检查为：

1. 在实际前端容器逐份SHA核对全部11版本的2946个站点文件，无基础默认页或额外文件；不是只核对文件数量。
2. 在正在运行的实际API容器核对19份当前Python源。
3. Node请求对本轮CA完成真实TLS验证，入口302保持相对地址及no-store。
4. 当前269资源的MIME（含WebP）、immutable、真实gzip解压哈希和缺失资源真实404/no-store。
5. HTTPS API的Secure/HttpOnly/SameSite严格Cookie、同源和跨源拒绝。
6. 当前真实引擎接续测试Cookie游客、保留同一身份，真实键盘移动由服务端保存、740成长页可用。
7. 实际容器Nginx reload切换两个真实版本、保留旧标签页路径/Cookie/Bearer和检查的资源，再切回当前J3。保留版本使用原有Canvas输入，未声称旧版本已具备后续DOM语义。

浏览器均为实际Playwright Chromium156.0.8078.4，不是品牌Safari/Edge/手机证明。QA新建角色、0点数和空记录保持来源，不冒充自然成长、真实学习或玩家手感确认。

## 生命周期与数据

实验worker从任务68的既有`output/cocos-lifecycle/container-delivery.mjs`复用七项检查；原文件未改，来源SHA及新SHA在`worker-provenance.json`。本轮在output增加显式SIGINT/TERM/HUP拥有权、关闭默认Playwright退出处理、原子owner/资源/结果文件、精确nonce容器/网络与网关进程组清理；补WebP MIME，不放宽游戏结果。

两例均由worker自身关闭浏览器、停止并移除两容器与所属网络、关闭TLS网关。控制器按label/不可变镜像引用/独占名称/配置路径核对，没有补救容器、网络、网关或浏览器遗留；两个BrowserServer均closed:true/forced:false。故意中断的worker保留complete:false和错误原因，不伪装产品通过，也未把其中5项准备检查与正常7组相加。

两份QA库只读integrity ok、外键错误0，各1名原测试游客/1次create结算；无活动记录、三种成长点均0。玩家试玩库及玩家数据API未访问。原始失败/当前回执不被覆盖，私有证书/密钥只在本轮权限受限的output中，未放入发行包。

TLS由本轮独占原生Nginx终止并转发至实际Alpine前端容器。一天回环证书仅由本轮Node请求的CA和所属浏览器单张SPKI约束使用；没有关闭全局TLS验证、导入系统信任或改变用户浏览器。不是生产公开可信证书/域名、真实网关信任配置或手机结论。

独立`verification.json`核对当前源/包、全部2946原始容器哈希、两例准确结果与关闭记录、证书/SPKI、19份API源/28锁定依赖、QA库、冻结输入及Docker收尾，complete:true。实际查看正常例的桌面世界、740成长页及740入口切回三张，文本与操作可读；`visual-review.json`只记录开发检查，不扩大已限定的玩家批准。

## 实际命令与收尾

根Node22.23.2、Python3.14.6、Docker29.3.1；脚本均为本轮output实验，不新增正式CI/用户启动入口。

```sh
docker desktop start --timeout 60
node output/cocos-j3-container/build-image.mjs
node output/cocos-j3-container/controller.mjs
node output/cocos-j3-container/verify-api-image.mjs
node output/cocos-j3-container/stop-desktop.mjs
node output/cocos-j3-container/verify.mjs
backend/.venv/bin/python output/cocos-j3-container/audit.py
backend/.venv/bin/python output/cocos-j3-container/manual-retained.py
node tools/cocos-sources.mjs --check
git diff --check
```

Docker停止前核对同一Desktop会话、0运行工作负载且原18个停止容器ID集合完全相同，才执行正常stop；session27698终态0。停止后Desktop后台进程为空、API不可达，恢复原停止状态；保留原容器及新/旧镜像缓存，不prune或批量删除。临时检查与主矩阵容器/网络均无遗留。

审计561份可解析浏览器/1535份已结束PID记录，无所属遗留、活动自动化浏览器或非预期读错误；原任务73唯一空坏JSON继续按精确路径/哈希/原证明分类保留。原5442/I3 launcher67850/API67853/proxy67854启动身份不变，主页/health/构建三项200；用户Chrome/IAB、共享工具宿主保持。这里只保留原人工试玩供待答复核，无本轮测试服务需要继续运行。

实际仓库更改仅任务80、任务39/79与README/TODO/progress、本地/交付说明和美术复核清单中的状态记录；实验/镜像/回执位于output及Docker私有缓存。没有游戏/后端/规范套件/锁文件/素材/规则/迁移变更，无新资产或来源变化。原Web、默认入口和发布仍保持，没有提交/推送/PR/部署或账户设置。

## 尚未关闭

此轮补的是当前J3本机Linux arm64与回环TLS。生产PostgreSQL目标镜像/角色配置、正式域名/证书/可信代理、amd64、实际CI和干净提交检出、系统IME/读屏/原生缩放、品牌浏览器/物理横屏设备及玩家其余画面/战斗/远行验收，继续按任务39逐项要求。

此前中断5442以更新J3被自动审批拒绝，等待已发出的明确授权；本轮未重试/绕过或重复提问。task66视觉和外部Git授权同样待原答复。原Web保留，不因为本轮通过扩大退役/删除授权。
