# 28 · 村庄武器、五层洞穴与离村石门

状态：已实现可玩候选；本页列明的自动化实机验证已通过，用户视觉／手感与正式平衡确认仍待进行。城市进阶未制作。

授权范围：按[数值v1](../balance/village-progression-v1.md)实现武器购买与等级打造、5层山洞、3类普通怪与Boss，以及Boss魔法石＋魔法3级开启石门。保留工作区已有旅行段、素材与其他未提交改动；不提交、推送、部署或修改玩家数据库。原始文件基线保存在忽略目录 `output/village-combat/baseline/`。

## 可玩链与实际改动

工坊武备台购买／查看图纸 → 装备武器 → 旧采石场旁主动进入石根山洞 → 逐层清理与掉落 → 3层平台短休、清理后开放绳梯 → 4层清理开放深层通路 → 5层石壳守卫 → 首胜门钥魔法石 → 村东石门核验Boss记录、持石、魔法3级 → 一次嵌石、永久通行，接续已有旅行。离村日志新增守卫、魔法与石门目标，标记导航不会传送。

- `backend/app/combat.py`、`combat_world.py`：4款武器24／96／120／120金币、等级／材料／加工费打造、装备与出售、8金币菜汤、8金币火花术、固定5层地图和15只普通怪／1只Boss、预兆／伤害／掉落／冷却／短休／撤退／战败／次日刷新／永久门与补领。Boss生命160、护甲2；首次保底石1＋金30＋晶屑3，后续游戏日金8＋晶屑1。
- `rules.py`、`main.py`、`world.py`、`market.py`、`journey.py`、`quests.py`：追加存档与快照、服务入口、普通材料出售、旅行前置与日志。沿用事务和请求防重；战斗仅接受方向与动作意图、owner／遭遇标识／连续序号，服务端按接收时间推进。普通tick仅保留最后重试凭证，物品变化仍记Receipt。原旅行记录只兼容通行，不生成Boss战果或关键石。
- `frontend/src/game/cave.ts`、`WorldScene.ts`、`GameCanvas.tsx`：复用单Phaser画布，洞穴碰撞、绕柱追击、点击寻路／选怪、攻击／蓄力／飞弹／受击数字；服务器位置协调与输入清理。空格攻击、Q施法、R用汤；触控有方向、攻击、目标、施法、喝汤、装备暂停与撤退。
- `components/CombatPanels.tsx`、`combat.css`、`App.tsx`、`Residents.tsx`、`Atlas.tsx`、`JourneyAtlas.tsx`、`InventoryPanel.tsx`：武备台／装备／术式／洞口／石门面板，属性与等级短缺，HUD、地图与背包入口。菜单、Life Mode、后台和失焦暂停整场战斗。滚动主体不遮关闭按钮。
- `types.ts`、`services/api.ts`、`stores/game.ts`、`game/items.ts`、`game/interaction.ts`、`game/navigation.ts`、`main.tsx`：类型、共享视图owner、物品／快捷栏、服务交互、日志导航、样式绑定。
- `backend/tests/test_combat.py`、`test_departure.py`、`frontend/scripts/village-combat-{smoke,controls}.mjs`、`frontend/package.json`：新增村庄验证与旧旅行后置夹具；`npm run test:combat` 依次跑完整洞穴与控制检查。README／TODO／路线／设计／架构／素材与本报告同步，进度写入 `progress.md`。

没有新增依赖、SQL迁移或点数来源；现实委托、每日合计5点与计时规则保留。没有扩展城市能力、职业树、护符树、机甲、烹饪或自由建造。

## 试玩发现与修正

1. 绕柱追击与遮挡／射程反馈：首轮第三层的自动操作隔柱空挥，消耗了过多体力；增加服务端绕柱路径与视线判断，界面明确提示绕行／走近。
2. 点击寻路接近最终路点时曾反复越过路点：改为可见路段合并与接近减速，完整楼梯／平台流程重跑通过。
3. 面板独立滚动、桌面与横屏HUD间距、短屏消息位置、Boss条避让时钟、角色近Boss定位符已修正。短按攻击／Q／R锁存到下一次意图发送，防止被网络采样漏掉；关闭／失焦清除输入。战败后由静默战斗轮询转为明确的回洞口／30%生命提示，避免洞内HUD消失后不知发生什么。
4. 自动化运行时在有／无窗口、关闭焦点模拟后仍将两个页面报告为有焦点；因此明确注入blur／focus事件检查应用暂停／恢复契约，未冒称原生标签／操作系统失焦通过。应用明确失焦暂停，并在洞穴循环检查焦点。旧旅行日志使用兼容通行说明，避免将旧旅程豁免写成新Boss成就。
5. 短杖安全距离过强，Boss实现基础追击速度由58改96世界单位／秒；玩家160，两阶段保持同速。保留v1武器、价格、配方、Boss生命／伤害和魔法3级。

最终短杖键鼠自动操作的各层战斗耗时约6.7／9.7／11.0／13.3／15.7秒，含本层接近，不含跨层行走和成长准备；Boss结束生命100，体力44。它展示了熟练风筝仍很安全，**没有达到短杖30–60秒的原目标**。初始短剑站桩并等待晶屑阶段约33.1秒胜出，也短于原60–100秒目标。不能宣称Boss难度或45–75分钟整体成长已平衡；后续玩家试玩优先检验退让／远程安全性、恢复节奏与经济，避免仅堆生命拖长时间。

## 环境、验证和证据

沿用npm／package-lock、React19、Phaser3.90、Vite6.4.4、Node22.23.2（直接脚本；npm子进程报告25.9.0）与Python3.14虚拟环境。API仅监听127.0.0.1:8103，生产预览127.0.0.1:5403；数据库只用 `output/village-combat/test.db`，独立cookie。浏览器创建独立游客；只注入隔离成长／材料／位置／日期／生命条件，不注入敌人死亡、Boss结果、掉落或开门结果。没有等待3小时现实委托，不把测试夹具冒充用户现实活动。

| 命令／流程 | 实际结果 |
| --- | --- |
| `.venv/bin/python -m pytest -q`（cwd `backend`） |215通过，含26项村庄测试；覆盖数值、配方守恒、重复／并发、seq／遭遇／owner、暂停、受击／汤／战败、Boss阶段与一波一次伤害、次日掉落、补领、开门、旧存档、01:00优先级及路径可达。仅既有Starlette/httpx弃用提示。 |
| `npm run build`（cwd `frontend`） | TypeScript与生产构建通过；既有Phaser分块体积提示保留。 |
| `REALQUEST_URL=http://127.0.0.1:5403 REALQUEST_TEST_DB=/Users/zilong/Developer/projects/RealQuest/output/village-combat/test.db npm run test:combat`（cwd `frontend`） | 完整洞穴16组／16截图通过：零等级购买、丢失响应重试、三款进阶打造、装备／学习、5层实际键鼠清理、固定72金币及普通材料／首胜石、3层短休、两种石门短缺、永久开门与刷新、单画布。唯一预期ERR_FAILED来自主动丢失购买响应，其余错误为零。控制专项6组／7截图／零错误通过：初始短剑Boss与第二阶段、后续游戏日奖励、实际受击战败、DPR2横屏真实触摸事件、滚动关闭、键盘所有权、注入失焦／恢复、撤退／单画布／无横向溢出。 |
| 原 `day-night-smoke.mjs` 的隔离路径副本 `output/village-combat/sleep-regression.mjs` |9组／16图／零错误：睡眠、短休、重试、时钟与生命／体力、Life／离线／pagehide、01:00昏倒恢复、旧时钟迁移与DPR2横屏。业务断言未改。 |
| `python3 tools/audit_inventory_assets.py` |156张既有图像的来源／运行哈希、尺寸与源像素保留通过，无新增位图。 |
| Prettier、`git diff --check`、本地文档链接 | 新文件格式、差异空白通过；117条本地文档链接全部有效。 |

逐帧技能客户端复用原客户端，仅适配本地Playwright、隔离storage与finally清理；它不跳过服务端真实时钟。第一轮村庄帧图已检查，最终洞穴2次移动／攻击输入、画布截图与文本状态采集通过并已检查；仅作渲染与接口检查，全战斗通过以真实计时主流程为准。完整实机记录 `output/village-combat/report.json`；控制结果 `controls-report.json`；日夜结果 `sleep-regression/result.json`。

截图实际打开检查过：[武器图纸](../../output/village-combat/03-crafted-staff.png)、[洞口](../../output/village-combat/06-cave-entry.png)、[第五层清理](../../output/village-combat/floor-5-cleared.png)、[Boss预兆](../../output/village-combat/boss-phase2-tell.png)、[晶屑弹](../../output/village-combat/boss-phase2-shards.png)、[横屏触控](../../output/village-combat/landscape-touch-combat.png)、[横屏滚动](../../output/village-combat/landscape-equipment-scroll.png)、[持石但魔法2级](../../output/village-combat/09-stone-but-magic2.png)、[永久开门](../../output/village-combat/11-open-gate-world.png)。最终全洞录屏：[WebM](../../output/village-combat/videos/page@77196e3141f1c89f8a89cc5eff0a9198.webm)。失败迭代的文件保留作诊断，成功结果以报告为准。

## 美术与未验证项

洞穴地形／入口／石门、敌人和9款新物品符号使用原创程序几何／SVG。640×448世界地形绘在1280×896画布、0.5世界缩放，旧角色源帧／尺度保留；不会把当前程序跳动宣称为正式怪物动画。素材清单记录来源和绑定；未下载、购买或生成外部素材，未上传第三方源包，未安装字体。正式洞穴美术、音效和完整动画仍需独立审阅。

用户画面／手感确认、完整3–7小时现实成长与多日经济、所有武器的新手通关时长、原生标签／操作系统失焦、实体手机／Safari／屏幕阅读器／原生缩放、长期内存／断网耐久和生产PostgreSQL负载未验证。手机竖屏不在本轮范围。任务27旅行／住宿单元回归通过，但本轮没有从新角色未经夹具走完现实成长、全旅行、住宿、返乡的整章实机；不把历史旅行证据算作新整链验收。

## 最终收尾

最终控制专项6组／7图再次通过，包含战败提示显示；215项后端、构建、格式、差异与117条文档链接检查通过。最终洞穴帧图2次，战败提示版本另补1次村庄帧图；实际截图已查看。该提示改动后重跑控制专项，核心全洞结果仍以上表完整生产流程为准。

所有浏览器／上下文在finally关闭。API8103（reloader96562、worker5458、resource tracker96572）与预览5403（npm405、Vite437、esbuild438）通过原工具会话Ctrl-C正常退出；记录过的测试Node／Chromium子进程均已退出，两端口无监听，无本任务runner残留。身份／父子关系／启动时间／参数／CWD在 `output/village-combat/owned-runtimes.json`，最终核验在[cleanup.json](../../output/village-combat/cleanup.json)。没有保留本任务人工预览；没有停止或重启共享宿主／其他任务服务。旧记录中的5295／8095在核验时未监听，未擅自启动。临时探针浏览器也在finally关闭。

没有提交、推送、部署、自动审批拒绝或玩家数据编辑。可使用仓库既有 `./start.command` 启动当前本地版本，按“工坊武备台 → 石根山洞 → 魔法3级石门”继续玩家试玩；常规启动使用既有存档配置，不会载入本次隔离夹具。
