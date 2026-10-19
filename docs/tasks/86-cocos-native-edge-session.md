# 当前 Cocos 的原生 Edge 长会话

2026-10-18启动、10-19完成，接续任务39 V6、任务78与83。官方Edge155.0.4283.62/current J3的独立1分钟预检和单次完整45分钟均通过；长会话94份采样/7PNG，无意外错误，固定工程参考限值、同档数据与会话后移动保存检查通过。此前一次误判断造成的取消片段保留，不计入45分钟。

短计划已执行：复用任务78实际运行过的单次1/45分钟循环与固定预算；改用官方Edge独立headless profile/current J3，先预检再测量；核对真实M4/Metal、同场景GC/堆/DOM、引擎分配/短帧样本和分钟输入链；终态后复核数据、截图、冻结输入、签名和进程退出。未更改产品、依赖或玩家存档。

## 输入、预算与边界

- 实际Edge155.0.4283.62，CDP为`Edg/155.0.4283.62`，UA含Edg155，使用任务83官方签名/Apple公证且仅解包在output的应用。本轮前后codesign均通过，二进制/Info.plist冻结相同。
- 宿主macOS15.7.7（24G720）、Apple M4/arm64、16GiB RAM；每份采样另断言M4/Metal、页面报告visible/hasFocus。这里是headless虚拟页面状态，未冒称真实可见窗口、其他设备或本轮原生缩放。
- J3 source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e` / payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`，Creator3.8.8真实release、269产物。根项目当前源码/锁定Node22.23.2/Playwright1.64.0与backend/.venv，不是新的独立安装、Creator重建、干净Git或实际CI。
- 三轮分别新QA库/随机回环端口/Cookie/nonce/独立profile。测量前一次性准备第五层首领100HP、微光杖和长预兆，测量期间无夹具/系统或服务器时钟改写；不是自然战斗平衡、现实行为核验或通过练习发点。
- 每分钟执行成长→地图→成长→中文草稿/wasdmiln输入→取消→世界→角色→返回成长；交替740×360/844×390，验证输入归属、暂停与玩家/首领取景。草稿从不保存；结束后实际右移由原服务端保存。
- 每轮427份当前来源/脚本/预算/后端/应用身份输入冻结，三轮完全相同。原task78的private907输入与Chrome45结果仍是它自己的证据，本轮没有借用其时长或通过数。

`budget-v1.json`与任务78原字节一致，SHA256 `f606f3ae0623e2e503c0538fad5f4ffcd46245d9b6d77e75a9a541d2bd044ca4`。保留原Chrome/M4工程范围描述，本轮在预检前明确将同一数值作为Edge155 headless/M4候选参考，不说它已获玩家批准为Edge/生产/手机发布预算，也未在结果出来后调宽。

| 工程参考项 | 原数值 |
| --- | --- |
| 每份120间隔帧样本 | median≤20ms、p95≤33.4ms |
| 引擎纹理/缓冲 | ≤128MiB / ≤512MiB |
| 同场景同740视口GC后堆 | 结束≤开始×1.2＋2MiB |
| GC后DOM | 文档数相同，节点/监听器不增长 |
| 分钟采样间隔 | ≤90秒，拒绝休眠后拼接 |

## 实际完整结果

| 运行 | 实际测量 | 采样 | PNG | 检查 |
| --- | ---: | ---: | ---: | ---: |
| `run-uok9Gc`预检 | 64,178.87ms | 6 | 5 | 3 |
| `run-jVYgGh`独立长会话 | 2,704,238.33ms（45分4.24秒） | 94 | 7 | 3 |

预检session47816终态0。长会话session27865终态0，测量从北京时间10-18 23:58:08.863开始，最终GC/移动保存与清理至10-19 00:43:21左右完成。45分钟为单次连续monotonic计时，未拼接预检或取消片段。世界分钟样本最大间隔约63.41秒，低于90秒；真实跨过CST零点，没有修改墙钟或缩短计时。

三项实际检查分别覆盖持续输入循环/同档凭证及库存经验记录不变、同场景GC和固定资源/短帧参考、会话结束后的真实移动与原服务端保存。无页面/console意外错误，全部浏览器关闭正常/非强制，API/代理子进程退出，controller无补救浏览器清理。

长会话GC结果：

| 场景 | 起始堆字节 | 结束堆字节 | 增幅 | 首尾文档/节点/监听器 |
| --- | ---: | ---: | ---: | --- |
| 成长页 | 16,270,716 | 17,129,932 | +5.28% | 均1 / 216 / 108 |
| 世界 | 16,626,740 | 16,908,600 | +1.70% | 均1 / 198 / 105 |

引擎纹理峰值62,966,600字节，缓冲峰值77,890,952字节。四份120间隔样本median均约16.7ms、p95为16.7–16.8ms。中间未经GC的堆/DOM波动原样保留；这些末值未超限不等于零内存增长、无泄漏证明、连续45分钟p95或实际GPU显存占用。

两份成功QA库均只读核验integrity/FK正常：各1角色、登记create恰好1条，书页/计划/活动/现实约定和三种点数均0，没有study结算。人工准备的微光杖/首领不冒充玩家赚取；位置/revision及正常暂停/恢复回执随操作变化，未宣称整库字节不变。

实际查看预检740世界/成长页，以及长会话15/30/45分钟世界、结束世界和移动保存后画面共7张。玩家/首领和主要操作可见；移动后镜头可见拉远。几何和操作通过不替代玩家对取景/战斗手感的确认，也不扩大既有画面批准。

## 一次错误中断与更正

`run-VjqnMV` / session87668被主动SIGINT取消，终态130、complete:false/cancelled:true，14份采样及原始记录保留，资源正常退出。该片段未达到45分钟，不作通过或拼接时长。

取消原因判断有误：最初看到`snapshot().life_journal.date`随CST日期更新，误以为会触发原资源相等断言；继续读取真实`/api/export`函数与取消后的只读QA原始state后，确认该接口返回持久player.state，不包含派生life_journal。旧断言不会因此误报，不需要修游戏或改比较条件。

原`midnight-stop.json`中的错误理由保持不动，`midnight-stop-correction.json`明确记录错误及源码/数据依据。没有调整worker、预算或任何断言；预检、取消与最终45分钟427输入完全一致。确认旧控制器/浏览器/API已经终态且退出后，才启动新的独立完整45分钟。这是一次不必要的中断，未包装成发现并修复了产品问题。

长会话跨过真实零点，但未新建/结算计时任务；不能据此替代跨日奖励/额度边界测试。V3对应证据仍来自任务82。

## 命令、核验和收尾

实际根目录入口（项目Node22）：

```sh
/usr/bin/caffeinate -di /Users/zilong/.nvm/versions/node/v22.23.2/bin/node output/cocos-edge-soak/controller.mjs 1
/usr/bin/caffeinate -di /Users/zilong/.nvm/versions/node/v22.23.2/bin/node output/cocos-edge-soak/controller.mjs 45
node output/cocos-edge-soak/verify.mjs
node output/cocos-edge-soak/post-signature.mjs
backend/.venv/bin/python output/cocos-edge-soak/audit.py
backend/.venv/bin/python output/cocos-edge-soak/manual-retained.py
node tools/cocos-sources.mjs --check
git diff --check
```

两次45启动分别对应取消87668与完整27865，不隐去前者。签名前检查57888、预检47816、完整测量27865、后签名61608均终态0。caffeinate只随本轮控制器临时防休眠并已退出，没有改全局电源设置。原有CUA绑定失败路径没有重试，本轮没有任何CUA操作或默认profile启动。

`verify.mjs`独立重算预算/427输入、当前构建、两轮准确样本/四帧序列/实际PNG、GC比较、间隔、原生版本、只读QA库和正常退出，complete:true；原取消仍保持false，并验证其输入与成功轮完全一致。`visual-review.json`记录7张实际检查与像素哈希，`profiles-closed.json`核验三个临时profile均已删除，`app-signature-after.json`保留后签名进程退出0。

最终只读审计570份可解析常规浏览器记录/1609份结束PID记录，无所属浏览器/应用助手/Node/孤儿caffeinate遗留、无活动测试或意外读取错误；历史任务73精确空坏JSON继续分类保留。三个Edge/API/代理/防休眠及本轮工具退出，无新运行服务保留。原用户Chrome/IAB和共享宿主保留。

10-19 00:46复核，原5442/API8142的67850/67853/67854启动身份未变，主页/health/构建三项200，原I3仍供玩家复核；未读取玩家库或玩家数据API，未中断/重启原试玩。已发起的切换/视觉/外部Git授权问题保持原范围。

仓库只更新本任务、任务39/78/83、README/TODO/progress、Cocos README/本地说明和复核清单；实验脚本/预算/日志/图片/QA库在output。无产品/后端/规范套件/源清单/依赖/资产/迁移改动，无提交/推送/PR/部署、默认入口切换或原Web删除。402来源/107绑定仍通过。

本轮补Edge155/M4/headless长会话的工程候选证据，V6仍需其他目标对应的完整交付/弱网/长期性能与物理设备条件、可信目标发布预算；Safari、系统IME/读屏/原生缩放、实际CI/生产和玩家其余确认仍未全部完成。任务85的原生缩放继续未验证，不能用本轮headless测量替代。整体目标继续active。
