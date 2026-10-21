# Cocos 数据一致性逐项验收

2026-10-18，接续任务39 V3。本轮补上可复现入口差距：把旧F临时时钟实验中的快七天、慢七天、旧响应和真实断网四项检查并入现有`consistency`。逐项核对直接证据后，V3数据一致性验收完成；其他玩家、系统、设备、实际CI和生产门槛保持开放，原Web保留。

短计划已执行：读取原V3各项要求与实际断言；合入现有套件并收紧故障诊断过滤；冻结当前J3/测试/后端输入，执行更新后的单套真实浏览器、相关单元和服务端边界检查；核对结果、截图、数据与进程退出，再更新V3状态。没有新建平行套件或修改产品来使测试通过。

## 当前运行与范围

实际Node22.23.2、Playwright1.64.0/Chromium156.0.8078.4、Python3.14.6，使用现有根锁与`backend/.venv`。浏览器为独立QA库/随机回环端口/专属上下文；后端pytest由原fixture另建临时数据库。没有读取玩家数据库、调用玩家数据API或驱动用户浏览器。

当前J3 source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e` / payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`，Creator3.8.8真实release、269产物，与任务77–81相同。只修改测试，不需要重新构建。402来源/107绑定仍一致，冻结的412个来源与额外测试输入前后未变。

`run-AzdRQ9`于北京时间20:13:02–20:14:30实际通过9组、13份1440×900 PNG，session34488终态0，无意外console/pageerror。两次真实12秒XHR超时共24,217毫秒。快慢七天只改变QA浏览器`Date()`/`Date.now()`，不改变performance、系统或服务器时钟；两份书页均归服务器北京时间2026-10-18，而假本机日期分别为10-25与10-11。计时起点距服务器回包均不足0.25秒，暂停后未发成长点。

旧状态为真实早先捕获的revision3；当前13，回放旧响应后仍保留同一save与新书页，新鲜重连仍只有一本。真实`setOffline(true/false)`后明确点击原生保存，两个失败尝试和手动联网确认共三次使用完全相同请求体/ID；只落一条`study_create`和一本书页，待确认时保存按钮禁用，原资源不变。

相关四个单元模块通过：`source-ownership,browser-configuration,core,life-dates`。core原17组及16类损坏表示保护、CST日期边界均通过；没有把模块数当作断言数。当前九个后端模块新跑194项，失败/错误/跳过均0，保留一条既有Starlette弃用警告。跨日和01:00采用明确的确定性服务器时间夹具，不称为本轮自然等待过零点或核验了现实行为。

## 原V3要求与直接证据

| 原要求 | 实际验证位置及结果 |
| --- | --- |
| 幂等重复/双击、已提交但回包丢失、500/超时 | 本轮consistency原生连续Enter、真实先提交后双500和两次12秒XHR；原请求不变，三次明确研习分别仅一本/一条结算。任务77同产品同后端的pause七组另覆盖实际keepalive fetch的已提交丢回包/重载、500、格式错与超时。 |
| 422/401 | 任务77未改的world真实采集422后明确新尝试，随后丢回包重放只耗一次体力；pause实际401保留原单、422明确拒绝后新请求；session失效凭证以原文件恢复同一身份。core同时验证错误分类及待确认保护。 |
| 页面重载、真实离线重连、未确认丢单 | 本轮损坏会话/待确认记录的多次实际reload及原凭证恢复；真实离线原生保存→同一durable请求→联网手动确认一次。原pause已提交丢回包后reload接续；未确认时不换请求或静默丢单。 |
| 双标签页/切旅程、无串档 | 任务77 session的A↔B显式备份确认、旧标签阻止输入、原凭证接续，五尺寸移动丢回包后重放一次；core迟到恢复不能改另一旅程，后端`test_stale_tab_cannot_write_to_another_restored_journey`重新通过。 |
| 存储失败/损坏 | 本轮实际Storage写异常零发送、修复后先持久化再发送；损坏凭证原字节保留且无替代游客，明确原凭证恢复原save；坏outbox语法及null/数组/原始值均停止命令、保留坏字节/凭证与资源。core另覆盖16类当前/legacy/credential表示。 |
| 旧revision | 本轮实际revision3旧回包不能回退当前13或抹去新书页；core先5后2保持5，其他save回包拒绝。 |
| 跨北京时间零点 | 后端`test_plan_api_midnight_uses_server_day_not_client_day`忽略客户端假日期，23:59:30后完成计时归下一服务端CST日；knowledge/market/life_tasks分别验证旧书页/次日活动、每日订单不重复、领取日额度保留和跨日结算。life-dates涵盖CST/闰年/月年边界。任务77 life的跨日书页/计时/历史与取消亦有独立界面证据。 |
| 01:00昏倒及前后端时钟 | 后端昏倒20种地点/体力/生命组合、离线时间丢弃、Life暂停、并发昏倒/睡眠只过一夜、重复睡眠请求、战斗先处理昏倒不掉战利品全部重跑。当前浏览器Date±7天仍按服务器日期/计时锚点；不修改系统时钟来伪造自然旅程。 |
| 无重复奖励/扣物/花点 | 本轮四QA角色共六书页，结算数分别3/1/1/1，无活动/重复receipt，gold20/seed6和三种点数0保持。任务77未改world/inventory-preview验证丢回包采集/种植只扣一次；dossier实际422后按新报价确认，连续点击、已提交丢回包/重载仅扣一份成长点并升一级，其他财物/经验不变。后端并发同请求/领取取消等重新通过。 |
| 凭证/导出/删除只对测试游客 | 本轮只有新QA角色的损坏恢复/导出；任务77 data仅自有QA库，完整导出与凭证区分、删除丢回包重载同ID、原Bearer/恢复键失效而其他旅程保留。当前玩家库/凭证未访问。 |

既有证据引用的是`output/cocos-regression/run-UYqXl8`的实际报告和断言。独立核验确认它的产品与19后端源/锁摘要与本轮一致，26个未改测试SHA完全相同；只consistency从五组变为九组。登记仍为27个current +1可选原Web比较，**没有把本轮单套与历史其余26套合计成一次新的27套/176组**。任务77原27套/172组/702PNG范围不变。

## 保留的失败与修正

首次总控制器session5423终态1：四单元和194后端已通过，但浏览器`run-sPiEOC`在沙箱监听`127.0.0.1`被EPERM拒绝，consistency未执行。其原complete:false、unexecuted及日志保留；之后以工具审批允许的隔离回环环境执行，未触碰人工试玩。

第一次实际集成`run-vzjuR7`（session97096终态1）通过前八组，断网步骤超时。旧F实验假设此前`world_pause`尚未完成；本轮已稳定在Life表单，世界本已暂停，offline事件不会另发暂停。失败截图/状态显示ready、无待确认，而不是丢失了已发送请求。保留原脚本/来源清单到`attempt1`，改为等原暂停确已完成，再断网并明确按原生保存来创建`study_create`。不降低请求身份、禁重复、单次结算和资源相等断言，没有修改Bootstrap/client/platform或后端。原暂停故障链仍由独立pause七组覆盖。

console错误只在本轮主动500/真实XHR超时/真实离线阶段、且来自所属`/api/command`或`/api/state`并匹配网络错误时记作预期；其他错误照常失败。两个已经超时的拦截路由释放时产生的`Route is already handled`单独保留为测试清理观察，不混作应用错误或成功检查。

## 可复现命令与证据

根目录使用项目Node22（本机绝对入口`/Users/zilong/.nvm/versions/node/v22.23.2/bin/node`）；浏览器命令必须能监听本机回环并运行自有浏览器。正常入口：

```sh
node tools/cocos-browser.mjs --build web-release-framing-j3/web-desktop --suite consistency
node tools/cocos-unit.mjs --only source-ownership,browser-configuration,core,life-dates --report output/cocos-v3-audit/unit/result.json
```

后端cwd为`backend`，实际命令：

```sh
.venv/bin/python -m pytest -q tests/test_game.py tests/test_daynight.py tests/test_life_tasks.py tests/test_knowledge.py tests/test_market.py tests/test_residents.py tests/test_departure.py tests/test_combat.py tests/test_client_data.py --junitxml=../output/cocos-v3-audit/backend.xml
```

最终核验：

```sh
node output/cocos-v3-audit/verify.mjs
backend/.venv/bin/python output/cocos-v3-audit/verify-data.py
backend/.venv/bin/python output/cocos-v3-audit/audit.py
backend/.venv/bin/python output/cocos-v3-audit/manual-retained.py
node tools/cocos-sources.mjs --check
git diff --check
```

`verification.json`重算冻结412输入/当前构建、九实际检查/13PNG、时钟/旧revision/离线身份、四单元、历史26测试SHA与失败保留；`data-verification.json`核对194项JUnit/20昏倒组合、只读QA库integrity/FK及四角色/六书页/零重复receipt；两者complete:true。原失败控制器不覆写为成功。

实际查看本轮断网禁用保存、联网确认、快七天书页、旧回包存档面板四张，以及第一次集成失败图；已在`visual-review.json`记录检查范围。旧回包图本身是存档面板，不能据它推断书页存在；该结论来自实际状态/服务端断言。本轮无新素材、版式或新增玩家视觉批准。

最终清理审计563份可解析常规浏览器记录/1556份结束PID记录，无所属存活浏览器/子进程/owner或profile标记、无意外读错误；另沿用任务81 PG生命周期检查。历史任务73唯一空坏JSON原样分类保留。两次实际浏览器均非强制正常关闭，所有QA API/代理/工具退出；本轮没有启动Docker或保留新测试服务。原5442/API8142启动身份67850/67853/67854未变，主页/health/构建三项200，继续供玩家复核。

## 文件与剩余范围

产品外改动：`clients/cocos/tools/smoke-consistency.mjs`、生成的`docs/migration/cocos-source-inventory.json`；更新本任务、任务39/64、README/TODO/progress、Cocos README/本地说明及复核清单。详细回执、冻结输入/原脚本、截图和QA数据库只写`output/cocos-v3-audit`及两个实际浏览器回归目录、一份沙箱未执行回执目录。没有游戏/后端/共享运行时、规则、依赖/锁、资产或迁移变更；无提交、推送、PR、外部部署、默认入口切换或Web删除。

V3仅关闭数据一致性要求，不以测试代替真实行为核验或自然玩法平衡。V2其余手感、V4其他画面、V5系统IME/读屏/原生缩放、V6品牌浏览器/物理横屏、V7生产目标及T2/T3真实提交/CI等继续按原条目验收。任务63启动故障页“可以保留”仅限该页，其他既有批准范围不扩大。原5442换J3曾被自动审批拒绝，切换、任务66视觉及外部Git授权的原问题待答，不重问、重试或绕过；本轮无需中断它们即可完成隔离验证。
