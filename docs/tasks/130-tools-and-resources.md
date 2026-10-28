# 工具、手持与场景资源体系

用户授权（2026-10-23）：完整实现背包工具、当前手持格、8格快捷栏，锄头/斧头/十字镐/水壶，砍树和开采消耗体力且连续操作，配套动作与资源变化美术、升级和存档；本轮不做耐久损坏。

## 范围与环境

只实现 Cocos 客户端与共享规则/后端这一条工具劳动闭环。开始时存在铁匠、木匠、牧场、生产设备改动，全部保留；未重置玩家库，未提交、推送或部署。起点快照见 `output/tools-130/baseline.json`。Node22.23.2/npm10.9.8，既有 Python venv，官方 Cocos Creator3.8.8 release 构建。独立源码快照 `output/cocos-toolchain/clean-source-NoEb1o` 隔离构建和浏览器 QA，不改其他任务的运行中预览。

## 完成的交互链

- 四件工具是真实不可消耗的背包物品，数量各1；独立手持位显示实际拿着的工具、种子或武器。八格快捷栏引用真实库存，1–8切换，背包内可分配/交换；旧四格排列原样保留，新增空位补入缺失工具。工具选择本身不攻击、不扣体力。
- 斧头砍树，十字镐敲岩石/铜铁金矿；自动靠近后执行起手、命中、收势，按住鼠标或空格连续作业。松开、移动、Esc、菜单、Life Mode、失焦、IME输入都按各自输入所有权停止或取消后续作业。工具动作无逐块确认弹窗。
- 树木受击留下切口、摇动；砍倒得到木材与树种并留下树桩；清桩后取消碰撞、释放可耕地。矿石有完整、受损、耗尽碎石阶段，逐击保存工作量。旧地上定时木石材料产出入口停用。
- 家园清理永久保持；橡树种子可在合适的空草地补植，幼苗3个游戏日长成，幼苗占种植位置且可步行穿过。野外岩石/铜/铁/金耗尽后分别2/3/4/5游戏日恢复；野树清桩2日后长苗，再3日成树；离线、后台与Life Mode暂停生长时钟。
- 锄头在家园合法草地直接开垦，只扣体力；种子快捷栏选中后可点空田直接播种；水壶对生长作物浇水，扣体力和水量，河湖边E/补水按钮免费装满。十字镐可恢复已收完的空田。
- 工坊找阿焰→工具升级→查看前后对比/材料/余额→确认，完成永久升级。武器仍用既有装备和铁匠体系，洞穴进入时拿起已装备武器，避免手持工具时出现武器幽灵攻击。

| 工具 | 基础体力/次 | 升级效果 |
| --- | --- | --- |
| 锄头 | 4 | 可切换1/3/5/9格作业，精钢为3×3 |
| 斧头 | 2 | 每次工作量1/2/3/5，砍树和清桩更快 |
| 十字镐 | 3 | 工作量1/2/3/5；铜镐采铁，铁镐采金 |
| 水壶 | 2 | 范围1/3/5/9格；容量20/40/60/100 |

相关种植/建造技能每3级降低1点体力，最多降低2点，最低1点。成功作业才结算；每格范围作业分别扣体力/水。升级锄/壶可按G切换单格与最大范围，鼠标方向在一次手势内保持，切换手持物品恢复单格。范围作业按逐格队列执行，可移动靠近，无远程瞬间改地。

铜制：30银、铜矿石6、木材6；铁制：100银、铁矿石8、石料8；精钢：300银、金矿石6、铁矿石12。报价含冶炼与锻造，立即完成，不新建独立冶炼工期。目录为 `backend/app/tool_catalog.json`，生成共享 `toolCatalog.ts`，避免两套价格。

## 保存和数据完整性

新增 `state.tools` 保存版本、手持、四件等级、水量、资源阶段/工作量/版本、树苗和动作序号。首次旧档升级只补发背包与仓储均缺失的基础工具；不改余额、作物、建筑、装备或既有成长。历史拾取锚点变树干时，仅将正好站在碰撞中的旧位置就近移出，不重置地图。

资源距离、工具持有、等级门槛、版本、共享动作间隔、体力均由服务端校验；升级核对距离/报价等级/材料。沿用命令收据幂等与SQLite事务。丢回包后重复同一请求，只结算一次；不同请求竞争同一资源版本/工具等级只允许一个成功。失败不扣材料、体力、水或资源进度。基础工具无耐久字段和损坏流程。

## 美术与文件

原创两张透明源图，35张运行精灵：16张工具等级图、15张资源状态图、4张矿石/树种背包图。源图与精确提示词在 `assets/generated/hearthwood/tools-v1`，衍生图在 `assets/derived/tools-v1`。`tools/build_tool_art.py` 用固定格裁切、连通区域清理、最近邻缩放可重复生成；尺寸和SHA256见 `docs/art/tool-art-v1.json`。未向生成服务上传第三方源素材，未复制商业游戏美术/字体。

工具动作采用原生四向手臂/握持关节、起手/命中/收势、工具角度和木屑/石屑/水滴；复用既有六角色身体图，并非重新绘制六套全身工具帧。树木沿用既有树图，新增倒树/树桩/幼苗和开采阶段呈现。原有7张地形/地板/地毯PNG字节保持一致，去除旧场景定时材料堆的显示。

主要改动：

- 后端：新增 `tools.py`、`tool_catalog.json`；接入 `world.py`、`farming.py`、`rules.py`、`equipment.py`、`combat.py`、`main.py`、`market.py`、`quests.py`。
- 共享：新增 `shared/game/tools.ts`、`toolCatalog.ts`；修改协议、动态碰撞/土地、库存偏好、物品意图、地点资源条目；由既有sync复制到Cocos core。
- Cocos：`Bootstrap.ts` 的输入/手持/8格/作业队列，新增 `toolView.ts` 和 `ui/tools.ts`；接入铁匠、背包、农田、战斗与场景显示。沿用Hearthwood纸木和可访问语义。
- 工具：新增目录生成、美术处理、工具单元/浏览器套件；更新行囊、预览、农田和锄地回归以匹配新手持语义。

## 工程验证

- `PYTHONPATH=backend backend/.venv/bin/python -m pytest -q backend/tests --tb=short`：469通过，1条现有Starlette/httpx弃用提醒。含24项工具参数用例，覆盖旧档、开采门槛、阶段/碰撞、家园释放、补植/生长、四工具全部等级、失败/冷却/版本、API收据与并发。
- `npm run cocos:test:unit`：34模块全部通过，记录 `output/cocos-unit/2026-10-23T05-44-58-492Z-c366d503/result.json`。
- `npm run cocos:sources:write`、`COCOS_CREATOR=.../CocosCreator npm run cocos:check`：337绑定、293PNG、7WebP、37共享模块、81场景输入，真实Creator类型检查通过。
- 官方 Creator3.8.8 `node clients/cocos/tools/build.mjs web-desktop --release`：真实release成功，来源/包哈希收据完整；未使用替代引擎。隔离构建变量 `REALQUEST_COCOS_BUILD=web-tools-130`。
- `tools/build_tool_art.py --check`：35图及来源哈希通过；`node tools/build_local_scene_art.mjs --check`：7张图/41绑定/7场景/81输入通过。
- 附带运行旧 `node tools/build_inventory_art.mjs --check` 未通过：它遍历所有物品SVG并要求历史上不存在的 `assets/derived/inventory-icons/alloy.png`。起点快照也不存在该衍生图，原inventory manifest未改；当前Cocos武器/材料使用其他正式绑定，337绑定校验通过。本轮新增35图验证不受影响，未为旧校验器另造重复武器图。

## 实机验收证据

`tools` 套件：11组、32张截图、无页面/控制台异常，`output/cocos-toolchain/clean-source-NoEb1o/output/cocos-regression/run-TrgcUb/result.json` 为complete:true。实际走通入包/切换、按住砍树清桩、开采、所得木材铜矿升级、铁/金门槛、开垦播种浇水补水、铜锄/壶三格精确扣量、1920/1440/1024/844/740布局、体力拒绝、Life/blur取消、两次丢回包重连、DPR2触控与减少动态效果。升级仅补充QA银币30；铜矿和木材由实际劳动获得；位置/技能/体力专项fixture在结果中明确记录，未混入玩家库。

截图均已实际打开检查。精选在 `output/tools-130/acceptance/`：

- `inventory-eight-1920.png`：真实四工具与8个引用位。
- `hand-and-eight-740.png`：740×360横屏手持与4×2快捷栏，44px目标。
- `axe-raise-contact.png`、`pickaxe-raise-contact.png`：实际工具动作。
- `stump-cleared.png`：砍树清桩后碰撞/产物状态。
- `tool-upgrade-740.png`：窄横屏报价与操作。
- `copper-can-three-cells.png`：三格浇水，17/40水、76体力。
- `uncertain-world-reconnect-740.png`：丢回包后的重连入口。

各图同名JSON为对应实际状态；完整桌面和触控WebM在该成功套件的 `video/`、`touch-video/`。技能提供的帧输入脚本保留原操作流程，仅加加载就绪、finally关闭及WebGL合成器截图适配，见 `output/tools-130/frame-client.mjs`；最终截图/状态在 `output/tools-130/frame-hand-final/`。早期直接toDataURL捕捉到清空的WebGL缓冲，未将黑图计作视觉通过。

同一release与后端哈希下分轮通过7专项、56组、206张截图，所有页面/控制台错误集合为空：

| 专项 | 成功记录 | 组/截图 |
| --- | --- | --- |
| 工具 | run-TrgcUb | 11/32 |
| 锄地 | run-1rkWMX中的hoe | 12/13 |
| 种植 | run-1rkWMX中的farming | 6/22 |
| 背包 | run-1rkWMX中的inventory | 12/62 |
| 物品固定目标预览 | run-izJYpH | 4/11 |
| 装备/18武器实际攻击 | run-Mn2YFP | 6/30 |
| 铁匠 | run-FGjlli | 5/36 |

运行命令为 `node tools/cocos-browser.mjs --build web-tools-130/web-desktop --suite tools`、`--suite hoe,farming,inventory,inventory-preview,equipment,blacksmith` 及后续 `--suite inventory-preview`、`--suite equipment`、`--suite blacksmith`。中间旧测试遗漏world helper、旧装备fixture只改equipped而没有设置手持物品，均保留原失败记录并修正测试前提后重跑；另有未刷新来源清单被preflight拒绝的记录。`run-1rkWMX`整体complete:false，只有上表前三项子专项成功，未将失败整轮冒充通过。最终聚合同时核对Cocos源码、构建包、后端与逐专项测试源码哈希，见 `output/tools-130/final-verification.json`。

## 试玩与清理

已复制真实release至 `clients/cocos/web-tools-130/web-desktop`，与成功回归构建包字节/哈希相同；根工作区与隔离候选比较832个运行/后端文件，差异为空，见 `output/tools-130/root-candidate-parity.json`。收尾diff检查发现并清除一处行尾空格后，用官方Creator重新构建；唯一区别是源码的这一空格，编译输出逐字节相同，无需重启人工试玩服务。来源差异与包等价证据为 `output/tools-130/delivery-equivalence.json`。现有默认包和其他聊天运行中的预览保持；此独立包可用下列命令启动：

```sh
backend/.venv/bin/python clients/cocos/tools/run-preview.py --build web-tools-130/web-desktop --port 5491 --api-port 8191 --database output/tools-130/manual-preview.db --cookie-name realquest_tools130_manual
```

人工试玩： http://127.0.0.1:5491 ，独立新库 `output/tools-130/manual-preview.db`，原存档未修改。快捷1–8拿起，H锄头，按住鼠标或空格连续；G切范围，E河岸补水，Esc停止/收起。找工坊铁匠阿焰升级。独立手持不占8个快捷栏引用位。此预览已通过首页、代理API和直连API健康检查并在Codex排队打开。

本任务浏览器均finally关闭，所有QA API/proxy均由控制器停止。额外帧脚本的三次QA服务器也逐PID停止并验证。收尾审计134个已知测试/浏览器/服务/单元进程均已退出，浏览器临时profile均已消失；仅保留人工试玩PID50503及子进程50506/50507。已删除本任务独立Creator克隆、缓存和profile；原SDK、源码/截图/录像证据和其他任务预览保持。共享node_repl宿主不能可靠归属本任务，未擅自关闭。最终清理与保留项随聚合JSON记录。

工程/实机检查完成；未部署、未提交代码；用户视觉与手感验收仍待试玩，未声明用户已批准。


## 2026-10-24 默认入口修复

用户在5443截图仍见4格且无工具。实查默认web-current为2026-10-23 02:36 UTC旧包，源码回执未包含toolView/core/tools；web-tools-130与当前Cocos源码完全相符。原用户数据库已经有四件工具各1，只是旧客户端不识别；未补发、未改物品，也未清空或换库。

已用验证过的真实工具release替换默认web-current；旧包保留在output/tools-130-default-fix/previous-web-current，SQLite在线备份为同目录player-backup.db。5443/API8143/cookie/数据库和原服务PID6506/6538/6539均保持。通过用户原Chrome标签刷新并继续原旅程，实际背包显示四工具，木材9/石料9/种子6不变；旧快捷排列保留，工具在5–8格。前后比对全部现存角色库存一致，截图original-save-tools-visible.png。

新增run-preview.py只读构建校验：启动已过期／无来源回执／损坏包，在打开或迁移玩家库前拒绝，并指向npm run build；不自动重置存档。test-preview.py增实际无回执/旧回执拒绝和玩家文件字节保持测试，保留其他聊天将start-cocos改为start.command的调整。启动单元13项、真实进程9组启动/重启/端口/租约/异常退出/超时清理通过，实际进程报告output/cocos-startup/run-h4zjx0oq/result.json；来源和默认包完整性校验通过。测试未使用玩家库，所有测试launcher/子进程已退出。没有新增Chrome标签或测试浏览器，保留用户原标签和原人工服务。证据与详细核对在output/tools-130-default-fix。
