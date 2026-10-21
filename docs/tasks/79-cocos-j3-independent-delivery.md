# J3 独立重建与交付

后续更新：[任务80](80-cocos-j3-container-https.md)已补当前J3本机Linux arm64容器/回环HTTPS及主动中断清理；本文末尾“当前容器TLS待验证”为任务79结束时的历史状态，正式生产/CI/系统/实机与玩家范围仍保留。

2026-10-18，接续任务78及任务39 T2/T3/V6/V7。上一轮已完成当前J3原生45分钟证据，属于实际进展；本轮补J3独立重建及交付版本差距，不重复原27套全量或把I3交付结果称为J3结果。

短计划：用既有源码快照工具创建全新项目，有锁离线安装根依赖，在专属Creator用户目录真实重建；核对全部源与产物；给新包执行取景/启动/接续三套定向验证；创建保留旧版本的J3静态包，按既有公共入口依次验证Nginx接续/回退和固定七样本网络预算；终态后查看截图、核对哈希/测试库/所属进程退出。原5442/I3、玩家存档、用户浏览器和原Web保持。

## 独立重建已通过

`output/cocos-j3-delivery/cold-build.json` complete:true，工具session49106终态0。全新副本`output/cocos-toolchain/clean-source-xZHNO9`含903份当前源码输入，不含Git目录、原Web package/install/dist、旧Node依赖、Creator项目缓存/产物、玩家库或秘密文件。

Node22.23.2/npm10.9.8，`npm ci --offline --no-audit --no-fund`使用既有离线包缓存，副本本地独立安装Playwright1.64.0、TypeScript5.8.3和esbuild0.25.12；逐项realpath确认没有借用根node_modules。真实SDK类型/107绑定/402来源与既有Pillow无损纹理检查均通过。

官方Creator3.8.8在专属`realquest-cocos-cold-userdata`目录真实release构建完成，debug/sourceMaps关闭、MD5启用；不是复制既有包。903份输入前后未变化，269个产物/15,175,449字节与当前J3逐文件路径、大小和SHA256完全相同。`builtAt`保留真实独立时间，不修改产物或receipt获得一致性。

- source：`bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e`
- payload：`9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`

该副本不是已提交版本的干净Git检出或实际CI。后续浏览器测试明确借用根`backend/.venv`解释器/锁定Python库；后端源、QA数据库与Node依赖仍在副本。没有将此借用写成独立后端安装证明。

## 新J3交付包已封存

既有公共`tools/cocos-release.mjs`从当前J3生成`output/cocos-j3-delivery/candidate-j3`，保留I3候选的10个旧真实引擎版本，共11版本；未覆盖旧包。

- active：`260b75754510b58e843ffacb41fddc61a7f9f58c6e79ec97068c06103af065cf`
- artifact SHA256：`2f8e4a59e59767bb68f5cfd7e19ca0430f212aad537993ca6efab5368cc26df5`

记录为真实release静态包，不是镜像已构建/推送或已部署的证明。版本缓存和回退必须以随后的实际公共Nginx测试结果为准。

## 独立包与公共交付最终通过

工具session41272终态0，controller13888退出；`product-checks.json` complete:true，11:06:14.347–11:12:49.298UTC依次执行独立副本三套、公共交付、公共网络。正确性浏览器关闭后才做性能采样，没有并行构建或其他引擎检查。

| 实际运行 | 检查 | 截图证据 | 环境与结果 |
| --- | ---: | ---: | --- |
| 私有`run-MC1SAc` / combat-framing | 7 | 28 | 独立重建J3，Chromium156.0.8078.4，通过 |
| 同次私有运行 / boot | 6 | 13 | 真实故障/重试/同档/无脚本/WebGL，通过 |
| 同次私有运行 / session | 6 | 20 | 接续/重试/切旅程，通过 |
| 根`run-ANtede` / delivery | 9 | 5 | Nginx1.31.2、Chromium156，通过 |
| 根`run-qqjNXD` / network | 7样本 | 10 | 已安装Chrome155.0.8059.80、固定CDP预算，通过 |

独立包三套19组/61PNG，不冒充新27套完整回归；当前27套结果仍是任务77。交付9组覆盖实际MIME/immutable/no-store/gzip/真实404、同源Cookie与跨源拒绝、原Cookie/Bearer同档接续、真实移动/成长横屏、保留版本旧标签重载、第二真实版本及入口切回。旧版本为包中实际保留的`e28e1354…22aa1`，不称为人工5442/I3的实际切换。

公共网络预算仍使用未改的`tools/cocos-network-budget-v1.json`，没有参数覆盖或调宽限值。全部七份首次移动、同档/凭证/位置、恰好一次书页结算与检查的资源/三种余额保持，无预算失败或意外浏览器错误。

| 条件 | cold可用时间 | warm再次进入 |
| --- | --- | --- |
| 回环参考1份 | 2.548秒 | 2.571秒 |
| 10Mbps/80ms，三份 | 13.481 / 13.685 / 13.582秒 | 2.520 / 2.559 / 2.565秒 |
| 1.6Mbps/150ms，三份 | 58.111 / 58.314 / 58.009秒 | 2.565 / 2.579 / 2.556秒 |

每份cold HTTP10,264,103字节，warm301字节且实际命中HTTP缓存；HTTP观测不是整包大小、物理网络带宽或居民显存。条件是1440×900无头Chrome、真实Nginx gzip/cache、回环CDP限速与新QA库，不等于生产TLS/DNS/丢包、手机、正式SLA或p95总体。

终态`verify.mjs`核对原/独立J3当前源与269产物、私有903输入、根当前目录与后端指纹、11版artifact及旧10版本保留、准确检查/截图SHA和固定网络预算重算，全部通过。五份独立QA库均integrity ok/外键错误0；network库恰好7游客/每人1书页与1条study_create、活动记录0/三种点数0；session库的两角色属于原切旅程用例，不是替代游客。

首份汇总递归扫描交付`html/`时把891张运行素材混入截图；已按公共captures名单去重分类，交付实际5PNG、全轮76份截图证据。原报告与脚本保存在`verification-before-image-classification.json`及`verify-before-image-classification.mjs`，未改原游戏结果或删除素材；最终`verification.json`使用正确范围。

实际查看6张：独立740首领、入口故障、Nginx740成长页、入口切回后村庄、真实受限加载缓慢提示、同档唯一书页。文本/主要操作可见，空列表及书页未完成状态符合测试数据。`visual-review.json`保留检查范围，不扩大所有者批准。

`cleanup.json`只读核对559份可解析浏览器/1522份已结束PID记录，无所属遗留、活动浏览器或非预期读错误。原任务73唯一空坏JSON仍按精确路径/哈希/原证明分类保留。六个本轮BrowserServer正常关闭/非强制，各API/代理/Nginx组与Creator均退出，caffeinate随控制器退出。`manual-retained.json`核对原67850/67853/67854启动身份未变，5442/API8142/构建回执三项200；没有访问玩家库/玩家数据API或驱动用户浏览器。

实际入口（根Node22.23.2；构建封装只位于output）：

```sh
node output/cocos-j3-delivery/cold-build.mjs
node tools/cocos-release.mjs --build web-release-framing-j3/web-desktop --output output/cocos-j3-delivery/candidate-j3 --previous output/cocos-network/candidate-i3
node output/cocos-j3-delivery/verify-product.mjs
```

终态验证还执行`node output/cocos-j3-delivery/verify.mjs`、两个Python审计/人工健康脚本（实际同一Python内`runpy.run_path`顺序调用）、`node tools/cocos-sources.mjs --check`和`git diff --check`。来源检查仍为402文件/107绑定，空白检查通过。实验控制器以`runOwned`归属进程组及finally清理，源/测试/预算冻结到终态；没有为结果覆盖输入、重启活句柄或重复跑全量。

仓库更改仅本任务79、任务39/78、README/TODO/progress、`docs/cocos-local.md`、`docs/cocos-delivery.md`和`docs/art/REVIEW_CHECKLIST.md`等状态/命令说明；运行/验证脚本与新静态包均在output。无游戏/后端/规范套件/依赖锁/资产/规则/迁移改动，没有新素材或来源变更；此前其他工作树内容保留。

## 仍开放的范围

系统IME/读屏/原生缩放、其他品牌浏览器与物理横屏设备、玩家其余画面/战斗/远行手感，以及实际CI/目标容器TLS/生产库角色和部署范围继续按任务39核对。本轮所有者故障页确认不扩大为其他批准。

5442仍原I3/原库/Cookie，先前停止它以更新J3的动作被自动审批拒绝；等待已提出的明确授权，不重试或绕过、不重复提问。没有提交/推送/PR/部署/账户设置或默认入口切换，原Web继续保留。
