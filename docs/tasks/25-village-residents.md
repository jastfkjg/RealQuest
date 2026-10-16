# 村民生活切片 — 2026-10-16

状态：**已实现、已做实际浏览器验证；实机美术仍待用户验收**。本地预览，未提交、推送或部署。

用户要求：每位 NPC 都有独特且唯一、也不与玩家重复的形象，并加入日常作息和更多互动，让村庄更有生活气息。

## 计划与交付

先核对三位现有 NPC 与六种玩家外观，再实现一个完整的“找人 → 交谈 → 送心意／帮忙 → 熟悉 → 听故事”链条，接入原有店铺、剧情和现实委托。保留现有地图、经济、资源、角色 ID 和 Life Mode。

| 村民 | 独立形象 | 日常生活 |
| --- | --- | --- |
| 莉亚 | 紫棕盘辫、圆眼镜、奶白围巾、书袋 | 图书馆整理借阅／书架、门前给旧书透气、午后相聚、湖边阅读、灯下读书 |
| 诺亚 | 灰卷发与短胡子、头带、橄榄绿背心、帆布挎包 | 公会准备行囊、巡看河岸与林地、和邻居聊天、傍晚听湖风、回公会歇脚 |
| 米拉 | 铜色头巾、长辫、绿围裙与钱袋 | 开店清货、去广场透气、整理订单、到公会吃晚饭、回店收拾 |

- 三套独立行走图、人物图和头像按 NPC ID 绑定。世界、邻里簿、地图和对话都使用同一身份；六种玩家形象与原有源图均保留。
- 每人有完整循环日程、可通行路线与进出门过程。三人在午后相聚，莉亚和诺亚傍晚到湖边，晚上能在歇脚处找到本人。靠近时显示当前活动；轻微晚间明暗与门灯仍保持世界可读。
- 顶部时间按钮／旅途菜单打开「村民近况 · 邻里簿」，查看所在地点、当前活动、喜好与日程。地图用室内建筑入口表示人在屋内；标记持续指向本人当前所在的房间或位置，玩家通过步行前往。
- 近况随时段变化；另可聊兴趣、日程和熟悉后解锁的个人故事。送心意扣除真实物品，搭把手扣除真实体力；失败、并发与重试受服务器规则约束。
- 米拉离店时寄售柜台照常买卖／交每日订单，剧情委托需找本人；诺亚可以在公会等当前地点办理现实委托与剧情任务。原「去河岸找诺亚」的固定地点提示已更正。

参考的是生活模拟游戏的日程、喜好与邻里联系这类机制：[官方 Wiki 的村民说明](https://wiki.stardewvalley.net/Villagers)、[友谊说明](https://wiki.stardewvalley.net/Friendship)。具体人物、文字、数值、地图与美术均为本项目内容。

## 时间与数据规则

同日仓库更新了第一章长期设计，要求游戏时间与现实时间分开。本切片将 NPC 作息接入一个服务端维护的 `world_clock`，作为后续日夜切片的基础；没有另建一套离线推进的 NPC 时钟。

- 每份存档有自己的有效游玩累计时长。完整一天为30分钟，第一次到访从08:30开始。
- 世界视图每3秒续期。读面板、后台、离页时发送暂停，整个村庄的日程随之暂停；正常离页暂停已实测。断联／异常关闭最多计入10秒续期余量，随后冻结，不补算离线数小时。
- 服务器按实际经过时间结算，忽略客户端自报时长；多个视图共享同一累计值，旧视图的暂停不能覆盖较新的活跃视图。多视图所有权规则已做确定性测试；未做长时间多窗口人工耐久。
- 聊天有可续期、最长5分钟的有界会话，旧 token 的释放请求不能结束新会话。阅读时世界暂停，关闭后从原处继续走，不把村民传送到新日程点。
- 现实委托、每日额度、村民订单、作物和资源恢复沿用既有真实时间规则。没有改变睡床、生产速度、金币或成长点来源；睡到次日、旅馆、01:00昏倒属于后续 P0 日夜切片。

| 社交动作 | 规则 |
| --- | --- |
| 每日首次问候 | 沿用熟悉度+1、联结EXP+5；每位 NPC 每个北京时间日期一次 |
| 送心意 | 消耗背包中1份物品；最爱+2熟悉度，其余+1；每人每天一次 |
| 搭把手 | 消耗4体力，熟悉度+1；每人每天一次，无额外金币或成长点 |
| 心里的故事 | 熟悉度达到5后开放，由服务器再次校验 |

莉亚最爱木板，诺亚和米拉最爱萝卜。游戏日循环不刷新真实日期的社交／经济额度。旧关系、问候日期、物品和任务保留，不从历史余额猜测进度。新增字段为 JSON 默认值，无新增 SQL 表／迁移；实际玩家数据库未重置或编辑。

## 改动文件

初始 Git 树干净；期间另一个工作流更新了第一章设计与排期。保留了这些更新，只在相关文档补充本切片的实际状态，没有将未来睡眠／离村／战斗计划标成完成。

- 服务端：新增 `backend/app/residents.py`，修改 `main.py`、`rules.py`、`world.py`；新增 `backend/tests/test_residents.py`。原有测试文件最终无改动。
- 时间／场景／导航：`frontend/src/game/{residents.ts,GameCanvas.tsx,WorldScene.ts,navigation.ts,interaction.ts,village.ts}`、`types.ts`、`stores/game.ts`、`services/api.ts`。
- 界面：新增 `components/{NpcPerson.tsx,Residents.tsx}`、`residents.css`；修改 `App.tsx`、`main.tsx`、`components/{Atlas.tsx,LibraryEncounter.tsx,MarketPanel.tsx,WorldPanels.tsx}`。`CharacterView.tsx`、`TrainingPage.tsx`仅更正寻找诺亚的两处提示。
- 美术：三张原图及相邻准确提示词位于 `assets/generated/hearthwood/npc-life/`；九张运行 PNG 位于 `frontend/public/assets/hearthwood/residents/`；新增 `tools/build_resident_art.py`、`docs/art/resident-art-v1.json`，扩展主素材清单与审计工具。
- 自动化：新增 `frontend/scripts/{residents-smoke.mjs,residents-visual.mjs}`、`tools/serve_resident_fixture.py`，增加 npm 的 `test:residents`／`test:residents:visual`别名。
- 文档：本报告、README、DESIGN、TODO、玩法与路线图实际状态、素材计划／清单／验收清单、progress。

## 美术来源与复现

使用内置 **image_gen**，每位 NPC 独立一次生成，无第三方素材或参考上传，无字体／音频／依赖添加。

- 准确提示词：`assets/generated/hearthwood/npc-life/{lia,noah,mira}-v1.prompt.txt`。
- 不修改的原图：同目录三个 `*-v1.png`，均1024×1536，实际透明 alpha。
- 每图12个已检查的完整身体姿态（四方向×站立／两步），复用站立行，打包为现有的48×64、idle/A/idle/B帧约定。Mira下方一行的分界实测为488px，避开邻格伸出的鞋尖。
- 处理仅为 alpha160阈值、裁切、脚底对齐与最近邻归一化；源图保留。头像来自同一人物正面，不另造人物身份。

| 每人运行资产 | 尺寸 | 数量 |
| --- | --- | ---: |
| `*-actor.png` | 192×256，16帧 | 3 |
| `*-figure.png` | 48×64 | 3 |
| `*-portrait.png` | 128×128 | 3 |

九图总计 **210,614bytes**。来源、准确切块、提示词／原图／运行图／构建脚本 SHA256 和六张原玩家图保留哈希见 `resident-art-v1.json`；主审计覆盖。复现命令：用带 Pillow 的现有 Python 运行 `tools/build_resident_art.py`。旧复用 NPC 资产不再绑定到 NPC，但保留原文件及来源记录。形象表：`output/npc-life/identities.png`。

## 验证命令与结果

实际环境：既有 npm／package-lock、React19.3.0、Vite6.4.4、Phaser3.90.0；后端现有 Python3.14 `.venv`、FastAPI／SQLAlchemy／SQLite。无包或引擎升级。没有独立 lint 脚本，TypeScript检查由 build 执行。

| 命令 | 结果 |
| --- | --- |
| `cd backend && .venv/bin/python -m pytest -q` | **140 passed**，包括16个新村民用例；仅已有 Starlette/httpx 弃用提示 |
| `npm --prefix frontend run build -- --outDir /Users/zilong/Developer/projects/RealQuest/output/npc-life/build` | TypeScript与生产构建通过；已有 Phaser大块和外置outDir提示 |
| `node frontend/scripts/residents-smoke.mjs` | **20张实机捕获，无意外错误**；三人真实交谈、送礼、帮忙、拒绝重试、已提交响应丢失重试、锁定／开放故事、持久化、找人／方向、室内外与现实委托结算、世界暂停／恢复／离页、DPR2横屏触控 |
| `node frontend/scripts/residents-visual.mjs` | **36个布局／纹理状态通过**；1440×900、1920×1080、844×390；三人默认／选中悬停／操作滚动与邻里簿；44px控件、关闭按钮可达、无横向溢出 |
| Bundled Python `tools/check_character_contrast.py --output output/npc-life/visual/<case>`，遍历36个目录 | **1061段可见文字，最低4.79:1**；采样实际纹理背景，排除明确aria-hidden装饰和被裁切的字形 |
| Bundled Python `tools/audit_inventory_assets.py --output output/npc-life/audit` | **142条图片记录通过**；旧素材／玩家哈希、源图／运行图／脚本／提示词检查通过 |
| `node output/life-commissions/game-client.mjs --url http://127.0.0.1:5295 --click-selector '#start-btn' --actions-json '{"steps":[{"buttons":["right"],"frames":6},{"buttons":[],"frames":6}]}' --iterations 1 --pause-ms 250 --screenshot-dir output/npc-life/game-client` | 带finally清理的既有技能客户端通过，画面与文本已检查，无错误文件 |
| 本地 Prettier `--check` 新增UI／脚本；`git diff --check` | 通过 |

测试覆盖的关键服务端边界：每段路线可通行／门口切场景／任何时刻每人只在一个地图；真实时间不能冒充游戏时间；旧视图不能暂停新视图；会话释放／过期；送礼／帮忙一次性、库存／体力不足、远程拒绝、故事门槛；并发请求／回执重放只扣一次；店主离店柜台可用；诺亚在公会接剧情、领取／结算现实委托。

实机主流程用公开命令寻路，实际UI交互和资源扣除；时间阶段与下一真实日用**明确隔离的时钟夹具**，不声称实际等待一整天或一小时。布局用例显式为其新建测试玩家准备确定库存，目的为检验可用控件和排版，不是用户物品或成就。两脚本先校验 `npc-life-v1` 夹具身份，SQLite修改限制为 `output/npc-life/test.db` 和当前测试save_id。夹具要求 `REALQUEST_NPC_QA=1` 与精确数据库路径；正常API不加载它。

故意注入一次422拒绝和一次已提交响应丢失；它们的网络报错为预期。最终没有意外JavaScript／网络错误。实际截图促成了诺亚日常区底色、时钟token作用域、邻里簿滚动复位和横屏商店关闭按钮修正。

## 已检查的画面与录屏

均位于 `output/npc-life/`：

- `identities.png`：三位独立人物与方向姿态；与所有玩家绑定的去重审计分开记录。
- `lia-daily.png`、`noah-daily.png`、`mira-daily.png`、`lia-gift-rejected.png`、`mira-memory.png`：实际三人互动、失败与关系故事。
- `noah-walking.png`、`neighbors-midday.png`、`mira-outside.png`、`unattended-counter.png`：行走、相聚、离店与柜台可用。
- `noah-evening-guild.png`、`noah-commission-away.png`、`noah-indoor-receipt.png`：夜间公会接头与真实时长委托结算。
- `map-mira-inside.png`、`roster-{lia,noah,mira}.png`：实际所在房间与非传送方向。
- `roster-landscape-dpr2.png`、`noah-landscape-topic.png`：Chromium触控横屏／减少动态效果。
- `visual/book-1440-lia/view.png`、`visual/noah-1440-top/view.png`、`visual/lia-1920-top/view.png`、`visual/mira-844-actions/view.png`及36个case目录：最终布局、操作滚动与对比度依据。
- `resident-desktop-flow.webm`、`resident-landscape-flow.webm`：最终通过流程的录屏副本；录制器按默认比例输出800×500和800×368，原CSS视口为1440×900与844×390，不能把视频分辨率当成测试视口。
- `result.json`、`visual/result.json`、36份`contrast-result.json`、`game-client/{shot-0.png,state-0.json}`。

未制作同存档、同镜头的旧版／新版成对截图；不把已有概念或这些候选实机图称为用户批准的基线。

## 剩余范围

- 天气、节日、周别／季节日程、工作工具动作、更多人物、连续关系分支／合作任务与复杂事件仍未实现。本轮是三位现有村民的完整日常基础。
- 正式日夜／睡眠／昏倒／旅馆及生产时钟迁移尚未完成，不能因已有时钟和傍晚明暗而标记P0完成。
- 真机Safari／iOS／Android、原生浏览器缩放、实际读屏、多小时与完整30分钟日程耐久未验证。路段与阶段边界有程序验证，关键时段有实机检查。
- 按用户最新约定优先桌面，支持手机横屏；手机竖屏不在本轮范围。实际美术仍待用户试玩验收。

## 启动、交付与清理

**正常试玩：http://127.0.0.1:5295/；正常API：http://127.0.0.1:8095。** 刷新原试玩页，点顶部时间或菜单里的「村民近况」找人。

- 预览：PID41314，01:22:43启动，cwd `frontend`；`REALQUEST_API_TARGET=http://127.0.0.1:8095 node node_modules/vite/bin/vite.js preview --outDir /Users/zilong/Developer/projects/RealQuest/output/npc-life/build --host 127.0.0.1 --port 5295 --strictPort`。
- 正常API：PID44137，01:52:34启动，cwd `backend`；`DATABASE_URL=sqlite:////Users/zilong/Developer/projects/RealQuest/output/npc-life/test.db SESSION_COOKIE_NAME=realquest_npc ALLOWED_ORIGINS=http://127.0.0.1:5295 .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8095 --no-access-log`。
- 两者专为用户手动试玩保留；预览HTTP200、API `status:ok`、cwd／监听端口核对通过。最终 `/api/npc-fixture` 为404，试玩已切回正常真实时钟。
- 重跑时钟夹具仅用于自动化：在项目根目录，以同一独立DB、cookie、来源和 `REALQUEST_NPC_QA=1` 启动 `backend/.venv/bin/uvicorn serve_resident_fixture:app --app-dir tools --host 127.0.0.1 --port 8095 --no-access-log`，再运行两项脚本；不要加载到正式服务。初始隔离SQLite用现有模型 `Base.metadata.create_all` 建立，没有触碰玩家库。
- 所有自建浏览器／上下文在finally关闭。最终PID／父进程／启动时间／参数检查未发现本任务headless浏览器、测试运行器或夹具API。三个被替换的自有测试API均正常退出；临时启动／检查脚本已删除。
- 本任务未启动node_repl、npx或Playwright MCP宿主；已有共享／其他任务进程因归属或使用情况不明确而保留。没有批量kill，没有关闭用户原浏览器标签。现有玩家数据、并行文档更改和其他服务保留；未提交、推送、部署。
