# 当前 I3 全量 Cocos 回归

2026-10-18，接续任务39 V2/V3/V5/V6和任务70–74。本轮目标是当前I3、当前26个Cocos套件的一次完整统一回归。历史F的25套18+7合并结果、I3定向检查与基础设施负例不当作本轮全量通过。前轮恢复验证属于实际进展；整个退役目标仍active。

短计划：核对空间/当前包/登记套件；使用统一runner的独立QA库执行全部26套，保留全部失败；冻结源码/资产/测试/后端输入，完成后核对当前性、实际截图、游戏与基础设施覆盖范围以及所属资源退出。若发现问题，先保存原结果再修复，不放松数据断言。

## 采样前环境

磁盘实际26GiB可用；不删除旧证据或代码。当前I3 `web-release-network-i3/web-desktop`经verifyBuild有效：source `ff64b0e465f0a146ac60e2279a6f02bee40d0054dd2e7f2fd5cc77a183cf5301` / payload `8532777e89513d7bd5e187b2777118da1e4399d2de737414735c63b9e7084efe`，Creator3.8.8真实release（debug/sourceMaps关闭、md5启用）。源码清单401文件/107绑定/93冻结Web输入。Node22.23.2，根有锁Playwright；浏览器版本以实际回执为准。

```sh
npm run cocos:test:browser -- --build web-release-network-i3/web-desktop --suite current --continue-on-failure
```

选择26个当前Cocos套件，不执行可选原Web兼容套件，也不要求原Web安装/构建。continue-on-failure只保留其他独立套件的可用证据，不改变失败判定；最终任一失败、未执行、输入变化或资源未退出都不能complete:true。每套随机端口/独立test.db/专属Cookie和BrowserServer，人工5442不参与。

套件：consistency、pause、textures、boot、semantics、data、session、world、story、depths、landscape、life、dossier、guidance、places、travel、rest、atlas、neighbors、dialogue、inventory、inventory-preview、preferences、preference-layout、village-art、cave-art。

## 最终结果

2026-10-18 16:14:05–16:39:09（北京时间），一次统一执行 `run-FOC5tp` 全部26套通过，165组检查、674份实际PNG证据文件、26份独立QA库，无失败或未执行项。主命令session23759终态0，controller93963已退出。实际执行命令如下；上方npm命令是相同入口的复现方式。

```sh
/Users/zilong/.nvm/versions/node/v22.23.2/bin/node tools/cocos-browser.mjs --build web-release-network-i3/web-desktop --suite current --continue-on-failure
```

实际浏览器为有锁Playwright Chromium156.0.8078.4；没有把此前Chrome155、Firefox/WebKit定向采样说成本次26套品牌浏览器验证。每套 `testSourceSHA256` 与现文件一致，构建verifyBuild、source inventory原始字节/哈希及全部后端输入前后一致。当前I3源/269产物保持本页首段指纹，没有重建、改断言或重跑合并。

| 套件 | 检查组 | PNG证据文件 |
| --- | ---: | ---: |
| consistency | 5 | 8 |
| pause | 7 | 14 |
| textures | 4 | 5 |
| boot | 6 | 13 |
| semantics | 5 | 3 |
| data | 7 | 20 |
| session | 6 | 20 |
| world | 9 | 9 |
| story | 9 | 20 |
| depths | 9 | 27 |
| landscape | 3 | 22 |
| life | 8 | 72 |
| dossier | 8 | 56 |
| guidance | 8 | 79 |
| places | 8 | 69 |
| travel | 2 | 17 |
| rest | 2 | 4 |
| atlas | 3 | 7 |
| neighbors | 6 | 33 |
| dialogue | 3 | 9 |
| inventory | 11 | 59 |
| inventory-preview | 4 | 11 |
| preferences | 11 | 38 |
| preference-layout | 2 | 17 |
| village-art | 11 | 21 |
| cave-art | 8 | 21 |

计数来自最终 `result.json` 与实际PNG文件，未直接加总可能含同名覆盖的captures数组；不是逐断言数，也不是所有者批准截图数。故障注入、准备角色和日期夹具仍按每套原报告标记；人工/计时/导入的现实行为未核验，游戏测试通过不等于学习行为获核验。本轮没有复跑全部单元或后端测试，也未执行可选原Web兼容套件；当前I3与原Web的恢复对照单独见任务74。

实际查看11张代表图：语义中文录入、740故障提示、1024长备注、740书页记录、1440装备比较、实际地图、1920行囊、740底部回答、图书馆、首领预兆和740洞穴。中文长备注可完整阅读，所查看短横屏表单/回答与行囊操作可见。740首领上部与顶部导航处于同一区域，留作V4/V5战斗可见性复核；控件边界/触控检查不等于该画面视觉验收。没有据此扩展视觉处理或所有者批准。启动故障页“可以保留”仅限此前问题范围。

## 证据和收尾

- `output/cocos-regression/run-FOC5tp/result.json`：最终26套、165组，complete:true/cancelled:false/unexecuted:[]；各套原始测试日志、配置、截图和浏览器/服务生命周期保留。
- `output/cocos-current-regression/verification.json`：独立核对26个准确ID、每套真实检查/零意外错误、源/后端/构建指纹、独立QA路径和全部674PNG的哈希。
- `output/cocos-current-regression/visual-review.json`：上述实际查看文件/哈希与视觉复核边界。
- `output/cocos-current-regression/cleanup.json`：只读PS启动时间/专属owner与profile审计509份可解析浏览器记录、1389份已结束PID记录，issues/activeBrowsers/非预期readErrors均为空。历史Task73负例的0字节JSON按精确路径、空字节哈希和原before proof单独列为expectedCorruptNegativeRecords；没有修写、删除或掩盖。
- `output/cocos-current-regression/manual-retained.json`：67850/67853/67854启动身份与原回执相同，5442主页/构建指纹与8142 health均200；保留I3、原DB/Cookie供人工试玩。未重启、读写玩家库、调用玩家数据API或驱动原用户浏览器。

本轮改动仅为本任务报告、task39/TODO/README/local入口及progress验收记录；无新增素材/来源变更、依赖、玩法、服务端规则或数据库迁移。所有本轮自动化浏览器/服务/Node已结束，原用户Chrome/IAB和共享工具宿主保持，人工5442/API8142继续保留供待答复核。原Web/default入口与部署保持；未提交、推送、合并、部署、注册运行器或删除代码。

## 结果使用边界

本轮只对当前I3执行默认Chromium的26套游戏浏览器检查；不把之前三引擎定向结果、F原生45分钟、任务74原Web/恢复演练或单元/后端测试合并为同一次全量运行。那些结果保留各自版本、环境与范围。本轮没有新增功能、素材、依赖、规则或模式迁移，没有重新构建或更新人工预览。

后续仍需分别关闭：实际已提交的干净CI检出/运行器；目标部署、生产数据库与外部切换/回退；品牌浏览器与iOS/Android横屏实机；操作系统IME、读屏和原生缩放；当前版本长会话及发布设备/网络预算；其余画面、引导和战斗手感的所有者确认。任务66原文阅读复核、提交/推送/草稿PR授权问题继续等待原答复，不重复提问，不把启动故障页批准扩展到这些事项。原Web删除与默认入口切换未获授权。
