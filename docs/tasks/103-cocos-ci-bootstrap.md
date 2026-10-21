# Cocos 首次候选分支 CI 入口

2026-10-19后续：[任务104](104-cocos-hosted-ci.md)已获Git操作授权并完成候选分支提交/推送；首轮无job失败暴露job env的runner上下文错误，修复后真实托管基础CI通过、回执核验，T3完成。下文等待授权与静态验证对应本任务103当时快照，不替代后续实际结果。

2026-10-19，接续任务39 T2/T3。发现纯手动Cocos工作流的首次启动缺口：GitHub要求workflow_dispatch文件先存在于默认分支，只把候选推到新分支不能首次手动启动。已补限定候选分支push基础检查入口，SDK仍仅main显式手动勾选。没有提交、推送、触发CI或改默认分支；整体体验反馈仍留到最后。

短计划：核对远端和设备状态，查证首次触发条件；补分支入口并验证事件/SDK条件；重核来源保护、封存新补丁，最后单独取得真实Git操作所需授权。

## 变更与依据

`.github/workflows/cocos.yml`只新增 `push.branches: ['codex/cocos-ci-*']`，并给candidate条件显式加上 `github.event_name == 'workflow_dispatch'`。该前缀分支push只运行Ubuntu24.04 verify；main、其他/嵌套分支或tag push不属于新范围，pull_request没有新增入口。SDK仍依赖verify成功、main、typed boolean输入true和原专用运行器。

权限、并发策略、两个job的步骤/命令/超时/运行器及上传保持。原 `ci.yml` 只有main push/面向main的PR/手动入口，原 `deploy.yml` 只有手动入口；候选分支push没有新增原Web镜像或部署触发。未使用pull_request_target、workflow_run、写token或新secret。

GitHub的[workflow_dispatch说明](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#workflow_dispatch)要求默认分支文件，并说明首次执行后才可按branch/tag手动dispatch。这里据此推断首次验证需要不依赖默认分支合并的事件，选择限定前缀push；尚未通过真实远端执行验证该方案。

`docs/migration/cocos-source-inventory.json`按正常命令重生，404清单仅workflow记录变更，107绑定及来源计数相同。运行代码、后端、素材、迁移、依赖和浏览器用例未变，当前J3/77709984包无需重建。任务100的927输入Linux证据仍对应当时快照，不能视为新workflow已在Linux执行。

## 实际检查

| 命令/检查 | 结果 |
| --- | --- |
| `node output/cocos-ci-bootstrap/verify.mjs` | Ruby YAML解析、九段bash语法、十个静态事件/条件案例通过 |
| 同一验证器结构比较 | verify逐项保持；candidate除if外保持；原CI/部署和根/后端锁文件摘要保持 |
| `npm run cocos:sources:write` / `npm run cocos:sources` | 正常重生/检查404来源、107绑定；对本轮前清单只有workflow记录变化 |
| `node tools/test-cocos-sources.mjs` | 既有引用/URL/冻结源及PNG/WebP负向合同通过 |
| `npm run cocos:baseline` | 原390检查、435文件、18封闭例外、九精确替代与46旧断言保持 |
| `git diff --check` | 通过 |

十例覆盖候选push（无输入及伪带true）、main/其他/嵌套分支/tag push、PR，以及main手动false/true和候选分支手动true。条件取实际YAML，用其等值/与运算子集评估；分支glob核对单星不跨slash。这是静态策略验证，不是完整GitHub解释器或scheduler执行。actionlint未安装，没有宣称其通过；不重跑未变的24模块/232后端或27浏览器全矩阵。

初始只读核对表明候选自任务102封存后无字节变化、HEAD不变、暂存为空；远端仍两原工作流/运行器0，已配对iPhone通道unavailable。中途 `output/cocos-completion-after-source-review/turn1.json` 暂记no progress，随后发现并修复本报告缺口，最终本轮为progress，连续无进展计数归零，不复用历史blocked审计。

本轮前workflow/清单副本和验证在 `output/cocos-ci-bootstrap/{before-workflow.yml,before-inventory.json,workflow-validation.json}`。任务102补丁原样保留；另生成包含新workflow、清单及文档的当前快照，最终目录由 `output/cocos-source-review/latest.json` 指向。新补丁实际从原HEAD归档还原、同步并通过原保护/J3指纹，未创建真实commit/tag/ref或写原暂存区。

## 后续授权与收尾

拟将最终候选按清单文件提交到新 `codex/cocos-ci-bootstrap` 分支并推送，观察Cocos verify真实结果。仓库[AGENTS.md](../../AGENTS.md)明确禁止未授权commit/push；这项Git动作需单独授权，没有把“继续目标/整体再反馈”解释为此项同意。没有直接写main、合并、发布、注册运行器或改系统/设备设置。

本轮未创建浏览器、开发服务、容器或长期后台工具，CLI结束后无新增后台资源；原5442/I3/原库及整体5443/J3/新库保留，玩家库不参与检查。T2/T3真实CI、V5/V6系统实机和预算、V7目标生产及V2/V4整体体验仍未关闭，原Web完整保留。
