# Cocos 整体候选与基础CI

2026-10-19后续：[任务103](103-cocos-ci-bootstrap.md)补 `codex/cocos-ci-*` push基础检查入口，首次远端验证无需先把纯手动workflow合并默认分支；SDK仍仅main显式手动。下文“仅手动”对应任务98原始快照，当前触发规则以任务103为准。

2026-10-19，用户明确要求先整体完成、之后统一反馈。本轮完成当前可独立推进的交付准备，统一入口与测试说明见[整体候选](../cocos-handoff.md)。没有继续逐屏问答，也没有把待人工判断的项目改成通过。

短计划：拆开基础检查与真实SDK构建，执行相关本机验证，封存当前已验证J3包并启动独立正常试玩，关闭被替代的专项服务，汇总一次交付。

## 实现

原候选workflow所有步骤都绑定 `self-hosted,cocos-3.8.8`；没有SDK运行器时，来源/单元/后端也不能执行。现在增加Ubuntu24.04 `verify`：完整历史检出、Node22/Python3.14有锁安装、无SDK/browser二进制的doctor、同步/来源/原保护、24模块、后端JUnit、干净工作树断言，始终上传已生成检查日志。真实类型、Creator release、Nginx与浏览器等依然属于真实SDK层，没有用静态检查替代它们。

新手动boolean `build_candidate` 默认false。真实 `candidate` 显式依赖 `verify` 成功，且仅main勾选后运行；保留原专用标签、真实引擎检查、交付/生命周期、27套及七网络样本，成功后才上传静态候选。工作流仍只读权限、仅手动触发，不修改原 `ci.yml`、`deploy.yml` 或发布器。采用GitHub的[typed inputs与依赖语义](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts)，不使用会把false变成非空字符串的 `github.event.inputs` 判断。

来源清单重新生成，404文件/107绑定/81PNG/1WebP/25shared/79scene/93冻结Web/107引用保持；与本轮开始相比仅workflow记录SHA变化。游戏/后端/锁文件/素材未改，仍用原真实J3构建。新封存目录是既有77709984包的可核验完整封包，保留11个历史版本；不新建伪造构建receipt。

实际文件：`.github/workflows/cocos.yml`、`docs/migration/cocos-source-inventory.json`；执行约定记入 `DESIGN.md`、任务39；当前入口/边界更新 `README.md`、`TODO.md`、`docs/cocos-local.md`、`docs/cocos-delivery.md`、任务94/97和 `progress.md`，新增本任务及 `docs/cocos-handoff.md`。无新素材/授权来源变化。

## 本轮实际检查

| 命令/检查 | 结果与范围 |
| --- | --- |
| `node tools/cocos-doctor.mjs` | Node22.23.2、锁定esbuild0.25.12/PW1.64.0/TS5.8.3；creator/browser为null的基础诊断通过 |
| `node clients/cocos/tools/sync.mjs` / `node tools/cocos-sources.mjs --write` / `--check` | 107绑定、404来源；运行输入保持 |
| `node clients/cocos/tools/check-baseline.mjs` | 390原来源、435保护基线、18封闭例外/9替换/2适配器/46原断言；原启动/发布保留 |
| `node tools/cocos-unit.mjs --report output/cocos-portable-ci/unit/result.json` | 全24模块通过，09:41:23–09:41:39 UTC，session92919 terminal0；日志和子进程身份保留 |
| 后端 `.venv/bin/python -m pytest -q --junitxml=../output/cocos-portable-ci/backend.xml` | 232通过/1既有弃用警告，session68167 terminal0；此前无XML同组也通过 |
| Ruby YAML解析/结构核对、9段 `bash -n` | 通过；无actionlint，未验证GitHub调度器、Ubuntu执行或干净检出 |
| `node tools/cocos-release.mjs --build web-release-framing-j3/web-desktop --previous output/cocos-edge-delivery/candidate-j3-edge --output output/cocos-final-candidate/static` | session27688 terminal0；与原封包身份77709984…一致，11版/2946站点文件 |
| 现行引擎/后端/测试输入核验 | J3 source bd5385fe…、payload9ed7cc7f…、269文件；20后端输入与历史执行一致；consistency采用82，其余26采用77，不称本轮全27重跑 |
| 正常试玩 `run-preview.py --check` 后启动同参数 | 新5443/API8143/新DB/cookie实际就绪；CUA实际欢迎页1280×720、未登记、零控制台warn/error；`welcome.jpg`已查看 |

本机预检首次sandbox绑定返回EPERM，未视作端口被占或停止其他进程；经授权回环预检成功后正常启动。不能把本机等价命令通过称为GitHub Actions通过；未提交、推送、触发工作流或注册运行器。完整日志、源前后对比与最终核验分别在 `output/cocos-portable-ci/`、`output/cocos-final-candidate/`。

## 清理与保留

统一入口ready后，核对旧主机PID、启动时间、参数和端口，保存active原文。读屏90682使用自身stop标记，取景69980仅对核验身份发SIGTERM；各自finally关闭所属API/Nginx/worker，session80082和63937均terminal0。旧标签139944108/IAB2清理时已不存在，未操作用户原标签。QA库和证据保留，未清数据、系统读屏未启用。取景host原始 `stoppedBy:service-exit:api` 是退出回调覆盖初始SIGTERM的既有记账限制，原样保留；单独的cleanup-request记录实际动作，不改原回执。

5443控制器14321/API14324/代理14325，session76544保留供整体试玩；原5442控制器67850/API67853/代理67854身份不变且健康。对原5442的历史更新拒绝不重试、不绕过；新的5443是独立库，不承接原凭证或原玩家档。共享工具宿主/用户Chrome保留，归属不明进程不关闭。

最终只读清理审计核对604份浏览器记录、1882份结束PID记录（含新24模块及两专项closed回执），无所属遗留、活跃自动化浏览器或意外读取错误，按PID与启动时间防止误判PID复用；历史精确空坏JSON负例原样保留。两专项四端口不可连接、所属组均退出，六个保留进程身份与六项主页/构建/健康检查通过。结论见 `output/cocos-final-candidate/cleanup.json`、`services.json`。

`verification.json`最终为 `complete:true`，范围明确限定本地工程交付核验：24/232、404来源中仅CI记录变化、269真实产物、27现行用例的历史执行来源、20后端输入、11版/2946站点文件及77709984封包均直接校验。`git diff --check`通过；没有用这一字段表示任务39整体或正式上线完成。

## 完成边界

本地工程交付准备完成，系统/设备、实际CI与正式生产条件仍未验证；完整节奏、战斗手感和剩余画面留待用户整体反馈。T2/T3/V2/V4/V5/V6/V7没有虚假勾选。原Web代码/启动/发布保持，没有提交、推送、部署或退役。
