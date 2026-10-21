# Cocos 过渡阶段保护合同

2026-10-17，task39 T6当前阶段已完成：保留原390文件基线和精确提取合同，新增435个原Git文件检查，封闭18条例外，并保护原Web启动、CI与部署。实际baseline、21单元模块、19个真实源副本负向夹具、106真实类型及378文件来源核对通过。

当前授权阶段仍是“Cocos为主、补齐并验证，原Web代码保留”。地图/找村民、底部回答、行囊四格及此前偏好的确认是指定界面检查点；本轮无运行时/画面、资产、依赖、API、规则、迁移或玩家数据改动，不授权删除、默认切换、提交、推送或外部发布。

## 实现与依据

原始保护基线继续使用`95371f2531162eecaec8db6ea4b9f5aeb7f7a99c`，没有重新生成或放宽。此前18条`allowed_extensions`会直接跳过，现在先执行完整过渡合同，再执行既有390保护、七个共享提取、日期/再出发原断言和原物品表合同。

- `tools/cocos-transition.mjs`从固定已提交参考`5e9d97d5a987b54b2a14587fb5793c51de924294`读取435个原文件的Git对象，检查原内容/执行权限、缺失与符号链接。包括原Web、样式、素材、服务端、原迁移、启动脚本及原CI/部署。原始基线的revision/records/scope单独固定；不能改名单来跳过新发现的漂移。
- `docs/migration/cocos-transition-policy.json`记录封闭18条例外、9处精确替代/追加及原因。原API插入区以外字节、原模型前缀必须等于已提交版本；Task40新增接口块、模型尾部和003迁移分别约束，不能放宽整份文件。
- 两份旧浏览器测试的适配按明确差异构造。TypeScript只解析源码，核对46个原assert调用仍按原顺序存在；更新适配元数据也不能掩盖删断言。它是具体源码合同，实际语义仍由行为测试验证，不声称任意程序等价。
- `clients/cocos/tools/check-baseline.mjs`接入新检查；`tools/cocos-unit.mjs`增加transition-protection模块；来源工具/策略/清单登记新增模块与合同。新CI候选仍独立，原默认启动/发布逐字节保留。

实际变更为上述两个新工具、新过渡JSON、baseline/单元/来源三个入口、来源策略及生成清单；游戏脚本、原Web源码、发布默认配置均未修改。

## 隔离验证与接入顺序

Task54生产矩阵运行时，先在`output/cocos-protection/staged/`实现并测试，不改其冻结源码。`staged-manifest.json`记录7个接入目标的前/后哈希；最终22套终止0后逐项核对才接入，旧入口另存`pre-apply/`，`applied.json`记录实际结果。

19个负向夹具在真实复制的源文件中验证：删除Web源码；改原规则、异步来源校验或模型；追加接口/模型漂移；改包装或弱化日期断言；更新适配元数据同时删旧断言；改默认启动目录、发布artifact名或生产前端镜像变量；重写基线或同时扩大两份例外表；缩小保留范围、偷换Git参考、符号链接、新迁移漂移与执行权限丢失。全部拒绝，fixture目录finally删除。

| 检查 | 实际结果/证据 |
| --- | --- |
| 新合同独立入口 | `output/cocos-protection/current-result.json`：435原文件、18例外、9精确形状、2适配器/46原断言、1新增迁移 |
| 统一单元 | `all-unit/result.json`：全部21模块通过，包括实际接入后的19个负向夹具；exec3425终止0已收取 |
| 原基线+过渡合同 | `baseline.log`：390原保护及全部精确提取/旧测试合同、新435文件合同均通过 |
| 类型/来源 | `typecheck.log`：106绑定/真实Creator类型；378文件、81PNG/25共享模块、93冻结Web输入/107静态引用、79场景输入通过 |
| 生产运行时不变 | `runtime-unchanged.json`：源872e903e/包7d98fcf4与task54完整22套完全匹配，candidate-ready静态包核验仍通过 |
| 收尾 | `cleanup.json`合并20报告/350个PID与启动时间、专属浏览器标记及Creator目录，无所属遗留；人工5442/API8142/原debug记录200 |

汇总`output/cocos-protection/verification.json`。原Web/默认发布与玩家库未改；保留原人工launcher89393/API89396/代理89397供继续试玩，用户已有浏览器和共享/归属不明宿主保留。没有新建浏览器或服务器。

本机实际命令使用Node22.23.2，官方Creator3.8.8已安装：

```sh
node tools/cocos-transition.mjs
node tools/cocos-unit.mjs --report output/cocos-protection/all-unit/result.json
node clients/cocos/tools/check-baseline.mjs
node tools/cocos-sources.mjs --write
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
```

完整游戏/原Web浏览器矩阵为Task54的22套/148组/639PNG，先于本轮纯工具接线完成；已核对运行时/产物逐字节不变，没有重复未改变的游戏矩阵或冒称重新跑后端232测试。此前18例外/20个原后端定义AST只读审计保留于`output/cocos-release/protection-readonly.json`。

## 继续开放的门槛

T6只关闭当前“保留原Web”阶段。真正归档/删除或更换默认发布时，仍须独立授权并调整相应合同和证据。T2/T3实际已提交CI、容器/目标HTTPS部署，以及V1–V7的备份恢复、自然成长/平衡、其他画面与物理设备/辅助技术等继续执行；Task54本地生产交付不能替代这些验收。
