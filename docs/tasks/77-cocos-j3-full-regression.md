# J3 当前27套完整回归

2026-10-18，接续task76已验证的局部首领取景候选与任务39。前轮完成真实修复/六套相关32组与截图单套复验，属于实际进展；本轮补当前J3全部27套的一次统一回归，不把历史I3全26或J3定向检查合并冒充本轮全量。

短计划：确认实际Git/构建/套件/磁盘状态；冻结当前402来源、脚本、资产及后端；用统一runner执行全部27个Cocos套件，保留失败与未执行；完成后核对准确套件、当前性、截图与资源退出。不接触5442人工库，不启动原Web构建，不改变断言或重新构建以覆盖原回执。

预检：磁盘26GiB可用；verifyBuild确认 `web-release-framing-j3/web-desktop` source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e` / payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`，Creator3.8.8真实release、269产物。登记27 current +1可选Web比较；本轮只current，明确不启用可选技能帧客户端。

实际入口（Node22.23.2，仓库根；npm等价入口为cocos:test:browser）：

```sh
env -u REALQUEST_FRAME_CLIENT node tools/cocos-browser.mjs --build web-release-framing-j3/web-desktop --suite current --continue-on-failure
```

continue-on-failure仅保留其他独立套件的证据，任何失败/未执行/源变化/资源未退出都不能complete:true。每套新QA库/随机端口/专属会话与浏览器，真实凭证/导出/删除只操作测试角色；准备角色和日期夹具不代表自然玩法或现实行为核验。

## 最终实际结果

2026-10-18 17:08:53–17:35:13（北京时间），`run-UYqXl8` 一次完整27套全部通过，172组检查、702份实际PNG证据文件、27份独立QA库；主session88140终态0，无失败/未执行/取消。实际Playwright Chromium156.0.8078.4；不是原生Chrome155/其他品牌或物理手机证明。

新增取景在这次普通入口独立通过7组，report无frameClient：没有技能文件/可选帧客户端依赖，也没有两张旧toDataURL黑图。其余26套均同次执行，不把task76的六套/单套复验拼接成当前全量。单元/后端全套与Web比较不包含在本次27套计数。

| 套件 | 检查组 | 实际PNG文件 |
| --- | ---: | ---: |
| consistency | 5 | 8 |
| pause | 7 | 14 |
| textures | 4 | 5 |
| combat-framing | 7 | 28 |
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

计数来自最终checks和实际文件，避免captures数组同名覆盖重复计数；PNG是证据文件，不等于每张已获玩家认可。准备角色、长预兆和日期等夹具均保留原来源，不能替代自然游戏平衡或将学习行为标为已核验。

`verification.json`独立核对27准确ID、当前测试SHA、每套检查/零意外错误、独立QA路径、702PNG哈希及最终构建；源inventory原始字节/哈希、后端全部输入和269产物前后一致。28个归属BrowserServer均正常关闭/非强制，全部服务子进程退出，框架未补救遗留浏览器。

实际查看本轮8张：740近距离首领、740书页记录、1024长备注、实际地图、740底部回答、1920行囊、图书馆和740洞穴。所查看图片中文字/关键操作可见；近距离首领与玩家不再像I3被截断/遮挡。这是开发者检查，玩家战斗手感/本轮取景、其余画面和实机批准仍开放。

## 回执及清理

- `output/cocos-regression/run-UYqXl8/result.json`：完整27套/172组，complete:true/cancelled:false/unexecuted:[]，原日志/配置/QA数据和图像均保留。
- `output/cocos-current-j3-regression/verification.json` / `visual-review.json`：源码/构建/结果/真实PNG核验与实际查看范围。
- `output/cocos-current-j3-regression/cleanup.json`：全输出只读精确PID/启动时间、owner-profile审计551份可解析浏览器记录/1493份已结束PID记录；issues/activeBrowsers/非预期readErrors为空。原Task73唯一0字节JSON仍按精确路径/空字节哈希/beforeproof分类保留，不修写或删除。
- `output/cocos-current-j3-regression/manual-retained.json`：旧67850/67853/67854启动身份未变，原I3主页/构建/health三项200；本轮未停止、重启、读写玩家库、调用玩家数据API或驱动原用户浏览器。只保留原人工预览和用户/共享资源，本轮自动化全部退出。

本轮仅更新task77、task39/TODO/README/local说明与progress验证记录；无新游戏/服务端/依赖/素材/规则/迁移，无新Creator重建、提交/推送/部署或默认入口切换。



5442/API8142仍原I3/原DB/Cookie/用户浏览器。自动审批已拒绝中断该保留预览，切换授权问题待答，不重问或绕过；task66视觉与提交/推送/草稿PR也仍待原答复。当前完整目标继续active；实际CI/系统/实机/生产、J3长会话/交付等各门槛保持原范围，本轮全量不能替代所有者批准。


17:13–17:14只读刷新GitHub API：自托管运行器total_count=0；远端仅ci.yml/deploy.yml两工作流，没有本地未提交的cocos.yml。回执在 `output/cocos-current-j3-regression/github-{runners,workflows,state}.json`；未触发CI/注册或设置账户。实际CI门槛仍开放，原授权问题待答。


## 后续准备与未验证

后续更新：任务78已完成原生1分钟预检及单次45分钟J3测量，终态通过；以下prepared/executed状态是任务77结束时的历史记录，最新终态和范围以[任务78](78-cocos-j3-native-session.md)为准。

当前J3长会话跟进仅准备了 `output/cocos-j3-native/preparation.json`：903份源码快照 `clean-source-fx2gZQ` 和逐字节复制的J3包，经私有verifyBuild匹配；明确借用根Playwright依赖与backend/.venv。**prepared:true/executed:false**，未启动原生浏览器/QA服务或45分钟采样，不是独立Creator重建、干净Git检出或CI证据。方案仅在output/plan.md，后续需1分钟预检、原生Metal/实际45分钟/数据与清理证据，不能借用旧F45分钟冒称J3。

实际CI/运行器、原生长会话与发布预算、系统IME/读屏/缩放、品牌浏览器与物理横屏设备、目标交付/生产及玩家验收仍按任务39开放；不因本轮全27通过关闭整体目标或批准原Web退役。
