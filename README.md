# RealQuest · 现实副本

后续[任务99](docs/tasks/99-cocos-keyboard-coverage.md)补现有键盘回归：11检查、15轮正反向Tab/142个可用控件位置及草稿恢复通过，含740×360；游戏包/试玩不变，系统输入和完整V5仍按清单验收。

当前可整体试玩的Cocos候选已统一为 [5443](http://127.0.0.1:5443/)（独立新档）；原 [5442](http://127.0.0.1:5442/) 保留已有存档，仍是I3。功能、启动/测试命令、封包和剩余验收见[整体候选交付](docs/cocos-handoff.md)。本轮24组单元/232项后端通过，基础CI与真实SDK构建已拆开，未提交或执行远端CI。按用户要求整体反馈，不再逐屏等待；原Web代码、默认启动与发布保持。

<details>
<summary>此前工程与验证记录（按各任务当时范围，当前入口以上方交付页为准）</summary>

[任务93](docs/tasks/93-cocos-canonical-firefox-network.md)已把Firefox弱网接入仓库命令，修复代理半关闭截断并补保序/取消回归。五相关单元、Firefox158/实际默认156/同字节私有Chrome155各七样本及两个中断合同通过；原系统Chrome未改，私有副本严格验签和全字节核对。测试资源清理，原5442/I3、原Web及其余验收保持。

[任务92](docs/tasks/92-cocos-native-firefox-network.md)完成原生Firefox158的七份本机HTTP弱网专项：共享双向限速经校准，10Mbps冷13.57–13.81秒、1.6Mbps58.76–59.00秒，热缓存与同档唯一书页通过。仅工程参考；所属资源清理，原5442/I3、原Web及其余发布/系统/实机条件保留。

[任务91](docs/tasks/91-cocos-native-firefox-session.md)完成原生Firefox158的单次45分钟长会话，94采样/7图、同档与会话后移动保存通过。全部所属临时资源已退出；Firefox弱网、实机/系统及完整发布预算等继续，原5442/I3和原Web保留。

[任务90](docs/tasks/90-cocos-firefox-container-profile.md)已补原生Firefox158的同包容器/HTTPS七项及中断清理，修复Firefox自动化profile追踪，并通过相关单元与Chromium生命周期。Docker和测试资源已收尾，5442/I3与原Web保留；完整V6仍开放。

[任务89](docs/tasks/89-cocos-edge-container-network.md)已补任务88新交付包的真实Edge容器/HTTPS七项与独立七份固定网络样本；新本地arm64镜像、同档接续和中断清理均通过，Docker恢复停止。5442/I3和原Web保留，正式生产/CI/实机及其余验收继续。

[原生Edge更新与回退](docs/tasks/88-cocos-native-edge-delivery.md)已通过九项交付和六种生命周期；补齐旧页面图标兼容及取消清理，保留全部旧版本/存档。新配置尚待容器/HTTPS/网络复验，5442/I3试玩与原Web保持。

[原生Edge弱网验收](docs/tasks/87-cocos-native-edge-network.md)已通过固定七样本/10PNG：冷启动10Mbps约13.5秒、1.6Mbps约58.1秒，刷新同档与唯一学习书页保持。公共网络工具现支持严格Edge产品版本核验，原预算未调宽；测试资源已退出，5442/I3试玩保留，完整V6仍开放。

当前J3桌面品牌代表流程已补：[Edge八组/17PNG](docs/tasks/83-cocos-native-edge.md)、[原生Firefox七组/15PNG](docs/tasks/84-cocos-native-firefox.md)，含中文研习保存与刷新、五尺寸检查。[Edge独立45分钟](docs/tasks/86-cocos-native-edge-session.md)另通过94采样/7PNG及固定本机工程参考。测试浏览器/profile/服务均退出，5442原试玩保留；Safari、物理设备及完整V6/系统要求继续。

[V3数据一致性逐项验收](docs/tasks/82-cocos-consistency-acceptance.md)完成：常规consistency已补时钟/旧响应/断网，共9组/13PNG；四相关单元与194后端项通过。保留失败证据，27套登记数不变；人工5442/I3、原Web及其他未完成门槛保持。

[固定PostgreSQL镜像恢复](docs/tasks/81-cocos-pinned-postgres-restore.md)已通过当前Linux API/J3七项/12PNG，V1按清单允许的隔离夹具要求关闭；不等于真实生产迁移。Docker已恢复停止，原试玩/18旧容器和两份QA数据卷保留，原Web保持。

[当前J3容器与回环HTTPS](docs/tasks/80-cocos-j3-container-https.md)已通过七项实际检查与独立中断清理验证，全部测试资源退出，Docker恢复原停止状态；原5442/I3供复核，原Web保留。正式生产、CI/系统/设备和玩家门槛继续按清单。

[J3独立重建与交付](docs/tasks/79-cocos-j3-independent-delivery.md)已完成：新源码副本269产物逐字节相同、独立包19组、Nginx9组及固定网络七样本通过；原人工5442/I3继续保留，实际CI/系统/设备/目标部署和玩家门槛未全部关闭。

[当前J3原生长会话](docs/tasks/78-cocos-j3-native-session.md)已通过单次真实45分钟：同档记录保持、94份采样、7PNG、固定工程限值与进程清理核验通过。只补本机Chrome/M4证据，其余退役门槛仍按清单。

工作区[首领取景J3候选](docs/tasks/76-cocos-combat-framing.md)已完成[当前27套全量回归](docs/tasks/77-cocos-j3-full-regression.md)：一次172组/702份PNG，源与构建一致，所属自动化已退出。5442仍保留I3供原复核；预览更新被自动审批拒绝，尚未中断或切换，待明确允许。实际CI/系统/实机/生产和其余验收仍开放。

网络预算已有正式入口：`npm run cocos:test:network -- --artifact output/<release封包>`。固定七样本的启动/缓存/同档/唯一学习记录必须全部通过，已接到候选工作流上传前；默认Chromium和900输入独立源码副本的Chrome各七样本、取消清理及默认runner生命周期通过。命令与本轮范围见[任务72](docs/tasks/72-cocos-network-regression.md)，尚未触发远端CI；5442游戏I3和原存档保持。

2026-10-18当前试玩为I3：地表逐像素无损编码使首屏HTTP下载约减少23%，原固定预算的七次冷/热/同档链通过；重连刷新期间误提交旧坐标的竞态已修复。三测试引擎纹理/回退、规范会话、真实Nginx交付和独立重建通过，5442已同库更新。详见[任务70](docs/tasks/70-cocos-network-budget.md)、[任务71](docs/tasks/71-cocos-reconnect-position.md)。最新[任务75](docs/tasks/75-cocos-current-full-regression.md)当前I3一次26套Cocos浏览器回归通过（165组/674份PNG），源/后端/构建一致、所属测试资源已退出；可选原Web比较单独登记。实机、实际CI/生产和其余退役门槛仍开放。

SQLite整库备份/核验/新路径恢复工具与隔离恢复演练已提供；原Web/Cocos接续、旧模式升级及未版本化角色7组通过。命令见[备份与恢复](docs/cocos-backup.md)，结果与目标生产库待验范围见[任务56](docs/tasks/56-cocos-save-backup-restore.md)。

当前I3生产候选已在原项目与全新896输入源码副本独立重建，269文件逐字节一致，原PNG保留作回退；最新结果见[任务70](docs/tasks/70-cocos-network-budget.md)。复现方法与实际CI/目标部署边界见[交付说明](docs/cocos-delivery.md#独立生产重建)，历史工具链验证见[任务57](docs/tasks/57-cocos-independent-production-rebuild.md)。

历史任务58验证：该阶段真实生产候选完成22套/150组/655PNG及Nginx9组，修复横屏反馈遮挡；5442已同库更新，六表/模式指纹一致。435原文件/18封闭例外的过渡保护继续生效。原Web代码/默认启动和发布保留，实际CI/目标部署、设备及其余验收见[任务39](docs/tasks/39-cocos-primary-retirement.md)、[任务58](docs/tasks/58-cocos-world-feedback-layout.md)。

</details>

**Real Life is the Game.** 一个将现实成长与家园经营、探索相连接的中文像素 RPG 基础版本。

当前可以探索 1920×1280 户外世界，进入小屋、工坊、图书馆、旅人公会和杂货铺，接取与交付九个剧情委托，采集、种植、交易、制作与升级，通过 NPC 现实委托积累知识、健康和技能点，保留学习手札与计时。位置、任务、储物箱和资源会保存，兼容旧版存档。**AI 尚未接入；NPC 对话为明确标注的预设剧情。完整 MVP 的剩余工作统一维护在 [TODO.md](TODO.md)。**

村庄战斗已实现可玩候选：工坊武备台提供4款武器购买、按建造与科学／魔法等级打造，以及菜汤；图书馆可研习火花术。旧采石场旁的石根山洞有5层、3类普通怪与底层守卫。首次击败守卫保底取得门钥魔法石，魔法3级时在村东石门嵌石，永久开放离村通路。空格攻击、Q施法、R喝汤，点击怪物选择目标；菜单／现实成长／后台暂停战斗，随时可撤离，3层平台可短休。

既有离村旅行候选保留：安家后在告示板接取「山那边，灯火正亮」，开门后修桥或乘船、备绳索翻山，到苔桥城交信住宿并返乡。已经离村的旧存档继续通行；城市科技／魔法进阶未制作。实现、数值与验证边界见[任务28](docs/tasks/28-village-combat.md)、[数值v1](docs/balance/village-progression-v1.md)及[任务27](docs/tasks/27-departure-city.md)。洞穴美术与平衡仍为待玩家确认的候选。

## 本地开发

客户端方向已确定为 **Cocos 为主**。原 React / Phaser Web 保留用于迁移对照、存档接续与回退，暂不删除代码；当前默认启动和发布链尚未切换。两端实际功能差距、必须补齐与验证的条件，以及工具链依赖，统一见 [Cocos 主客户端与原 Web 退役清单](docs/tasks/39-cocos-primary-retirement.md)。

Cocos 工具现在从仓库根目录安装，使用 Node 22（`.nvmrc` 为22.23.2）和 npm 10；无需安装或构建 `frontend/`。先按下文准备 Python 3.14 的 `backend/.venv`，并使用官方 Creator 3.8.8；根目录执行：

```sh
nvm use
npm ci
# 首次浏览器测试需要下载锁定版本的 Chromium
npm exec -- playwright install chromium
export COCOS_CREATOR="/你的路径/CocosCreator.app/Contents/MacOS/CocosCreator"
npm run cocos:doctor -- --browser
npm run cocos:sync
npm run cocos:sources
npm run cocos:check
npm run cocos:test:unit
REALQUEST_COCOS_BUILD=web-local npm run cocos:build
# 自动化：每个套件自动创建独立测试库、分配端口并关闭浏览器/服务
npm run cocos:test:browser -- --build web-local/web-desktop
# 人工预览：先只读检查，再启动固定地址和自己的预览库
npm run cocos:preview -- --check --build web-local/web-desktop --port 5448 --api-port 8148 --database output/cocos-local/local-preview.db
npm run cocos:preview -- --build web-local/web-desktop --port 5448 --api-port 8148 --database output/cocos-local/local-preview.db
```

打开 `http://127.0.0.1:5448/`，Ctrl+C 停止这组服务。预览只服务已有构建，没有源码热更新；重建时使用另一个构建名。当前人工试玩使用5442/API8142、`web-release-network-i3/web-desktop`和同一 `output/cocos-data/local-preview.db`，勿把自动化测试指向该库。`cocos:sources` 可单独核对来源，`cocos:check` 已包含该检查；素材与冻结输入归属见[任务51](docs/tasks/51-cocos-source-ownership.md)。单元检查不启动浏览器。统一浏览器入口默认执行27个当前Cocos套件（含无损纹理、暂停请求故障、启动恢复、存储故障与原生语义键盘链），`--suite session,inventory`可选择子集，`--list`列出登记项；结果与清理证明保存在新的`output/cocos-regression/run-*`中。当前包必须带真实构建产生的`realquest-build.json`且源码/产物哈希匹配。可用`--port`/`--api-port`指定测试端口；不接收人工库路径。原Web UI兼容单列为`--suite compatibility --web-build <独立Web产物路径>`，常规Cocos回归无需先构建Web。最新I3全部26套在同次运行通过，165组/674份PNG，详见[任务75](docs/tasks/75-cocos-current-full-regression.md)。此前各版本、独立重建、三测试引擎、恢复与交付证据保留各自范围，不合并为本次26套结果；独立入口基础见[任务52](docs/tasks/52-cocos-unified-regression.md)和[任务50](docs/tasks/50-cocos-independent-tooling.md)。实际CI仍缺运行器，品牌浏览器/实机、系统输入与其余发布门槛开放。`start.command` 和生产部署入口仍按原 Web 运行。

Cocos 人工主入口、只读预检、构建/预览/自动化的区别、可配置端口与数据库、原Cookie/凭证的同库接续条件见[本地启动与存档说明](docs/cocos-local.md)。启动器只在API和代理实际可用后报告ready，同库启动锁覆盖迁移与退出清理；原 `start.command` 默认Web入口继续保留。启动链的11项单元、9组真实进程及会话/生命周期证据见[任务53](docs/tasks/53-cocos-startup-save-paths.md)。

生产候选另有显式 `cocos:build:release`（关闭debug/sourceMaps、启用MD5）和 `cocos:package`，默认开发构建不变。版本目录、静态Nginx/API/cache配置、独立候选CI与验证范围见[生产候选与交付](docs/cocos-delivery.md)及[任务54](docs/tasks/54-cocos-production-delivery.md)。原Web默认CI/镜像/部署仍保留，当前工作流文件不是实际CI或上线证明。

Cocos 数据管理与旧旅程接续已实现候选：完整数据导出、明确删除/丢失响应重试，以及凭证导入或同浏览器原Web旅程接续。独立构建、预览方式和验证范围见[任务40](docs/tasks/40-cocos-data-management.md)；接续需要同一服务器数据库，不会自动搬运独立预览库或玩家库。

Cocos 现实成长历史与学习整理已接入：按日/月和状态查看现实约定，整理今天/历史/归档书页、长期计划与同日记录关联，读取旧锻炼记录。构建、同一手工存档的预览命令及验证边界见[任务41](docs/tasks/41-cocos-life-records.md)。

Cocos 六种外观登记与旅人档案已有本地候选，包含容量/累计经验/能力概览和按服务端报价主动培养；既有角色接续不会被欢迎页选择覆盖。验证、预览命令与后续范围见[任务42](docs/tasks/42-cocos-registration-dossier.md)。

Cocos 当前目标、可重开的旅人指南、初探回顾与再出发手记见[任务43](docs/tasks/43-cocos-journey-guidance.md)。成长书签直达原现实约定或魔法报价；标记、阅读和归来提示不自动领取、消费或开启石门。

Cocos 地点索引与邻里名录已覆盖全部15张现有地图、完整旅行报价、作息/关系/喜好，以及横屏全部话题、五种心意选择和帮助。实际渡口→旅店→睡眠→返乡和一次扣费验证见[任务44](docs/tasks/44-cocos-places-neighbors.md)，标记不传送。 玩家反馈修正候选现提供真实地形地图、建筑/人物路标、附图手记和头像对话；5442手工地址沿用原存档，当前地图/找村民已获玩家确认。 本轮[任务45](docs/tasks/45-cocos-neighbor-encounter.md)补世界头像/N找村民、门口提示、真实走近交谈和物件赠礼，保留实际场景与原存档；同5442预览；玩家已确认当前地图与找村民、底部交谈回答、行囊四格可以保留，此前偏好页确认有效。其余视觉/实机/退役门槛保留。

另有独立的 [Cocos Creator 本地迁移小样](clients/cocos/README.md)，可通过根目录 `start-cocos.command` 启动已构建的小样。它使用独立游客会话和独立数据库，原 Web 版与本节启动方式继续保留；阶段 4–5 继续接入任务、交易制作、村民、装备成长、研习与手动记录，以及原有五层洞穴战斗；功能迁移证据见[任务36](docs/tasks/36-cocos-features-combat.md)。洞穴美术、战斗 HUD、选目标/按住攻击和多指操作的本地打磨见[任务37](docs/tasks/37-cave-polish.md)；构建后用 `./start-cocos.command --web-port 5430` 同时预览 Web（5430）与 Cocos（5431），使用独立 API8130 和本地小样数据库。村庄细路、同源室内材质、储物箱选择与存取、自动走近及停步反馈的最新打磨见[任务38](docs/tasks/38-village-interior-polish.md)；刷新上述预览即可体验，沿用原本地小样存档。

安家交付后会接上「第一次初探」引导：了解离村条件、准备并装备武器、清理山洞首层，再带材料回工坊查看用途。引导可在追踪栏收起、在「主菜单 → 旅人指南」继续，刷新保留进度；不另发奖励，也不要求初探前提升魔法。实现与验收见[任务29](docs/tasks/29-first-expedition.md)。

完成工坊初探回顾后，会翻开「再出发手记」，连接装备改善、永久洞穴通路与现实成长；之后可从主菜单再次打开。下一步按真实准备更新，学习计时期间仍可探洞，到期后需找诺亚结算，再主动投入研修。同一设备离开至少5分钟后，成功同步存档会显示可收起的归来提示；手动追踪支线或收起引导时不打扰。不增加奖励或改变成长规则，见[任务33](docs/tasks/33-next-departure.md)。

以下为保留的原 React/Phaser Web 开发入口；Cocos人工入口使用上文 `start-cocos.command` / `cocos:preview`。需要 Node.js 22+、Python 3.14。使用 SQLite，无须先安装 PostgreSQL。

一键启动：在 macOS Finder 中双击根目录的 `start.command`，或在终端运行：

```bash
./start.command
```

脚本自动创建虚拟环境、按需安装依赖、执行数据库迁移，并启动前后端。
打开它输出的网址；按 `Ctrl+C` 同时停止两个服务。首次运行需要联网安装依赖。
可用 `./start.command --check` 只检查环境和端口。默认端口被占用时，先停止对应服务，
或运行 `REALQUEST_BACKEND_PORT=8019 REALQUEST_FRONTEND_PORT=5175 ./start.command`。

也可以手动分别启动：

终端一：

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.lock.txt
alembic upgrade head
uvicorn app.main:app --reload --host 127.0.0.1 --port 8017
```

终端二：

```bash
cd frontend
npm ci
npm run dev -- --host 127.0.0.1
```

打开 Vite 输出的网址，默认 [http://localhost:5173](http://localhost:5173)。前端将 `/api` 代理到 `http://127.0.0.1:8017`。后端数据库默认保存在 `backend/realquest.db`，先运行迁移再启动。Vite 自动选择其他端口时，需要将该前端来源加入后端 `ALLOWED_ORIGINS`。

## Docker Compose（本地）

```bash
cp .env.example .env
docker compose up -d --build
```

打开 [http://localhost:8080](http://localhost:8080)。包含 Nginx 前端、FastAPI 后端和 PostgreSQL 17；后端启动时执行 Alembic 迁移。数据库使用命名卷，`docker compose down` 保留存档。默认仅绑定本机地址；公开部署前设置强数据库密码、HTTPS、`COOKIE_SECURE=true` 和正确的 `ALLOWED_ORIGINS`。

## 生产部署

腾讯云 `tencent-prod` 发布配置见 [部署指南](docs/deployment.md)。生产使用独立 Compose、固定 PostgreSQL 卷、HTTPS Cookie 和已验证镜像；main CI 只验证并发布镜像，服务器发布由手动工作流执行。主机初始化、GitHub/ACR 凭据、真实域名验收和存档迁移尚未执行。

## 环境变量

| 变量 | 用途 | 默认值 |
| --- | --- | --- |
| `DATABASE_URL` | 后端 SQLAlchemy 连接 | `sqlite:///./realquest.db` |
| `COOKIE_SECURE` | 仅通过 HTTPS 发送会话 Cookie | `false`，本地 HTTP 用 |
| `SESSION_COOKIE_NAME` | 本机多个隔离预览可使用不同会话 Cookie，避免端口间相互覆盖 | `realquest_session` |
| `ALLOWED_ORIGINS` | 允许写入请求的前端来源，以逗号分隔 | localhost/127.0.0.1 的 5173、8080 |
| `REALQUEST_API_TARGET` | Vite 开发代理目标 | `http://127.0.0.1:8017` |
| `POSTGRES_PASSWORD` | Compose 数据库密码 | 仅供本地的示例密码 |

本地命令通过 shell 导出变量；后端不自动读取 `.env`。根目录 `.env` 由 Docker Compose 读取。`LLM_BASE_URL`、`LLM_API_KEY`、`LLM_MODEL` 计划在 AI 阶段接入，当前设置不会启用 AI。

## 怎么玩

- **WASD / 方向键**移动，**Shift** 快走，靠近对象按 **E** 交互；点击地面寻路，点击可见对象会靠近并互动。**M** 打开地图，**J** 打开任务日志，**F** 切换全屏，**Esc** 关闭面板。
- 第一项任务自动接取：进入林间小屋、采集 3 份木材，再到村庄告示板交付。其余委托在村庄告示板、莉亚、诺亚与公会委托台接取，完成后回到发布者领取奖励。
- 走近建筑门口按 **E** 进入，走回室内下方门口按 **E** 离开。小屋的箱子可以存取物品；床铺提供休息与保存。
- 户外面积是旧版的 4 倍。沿主路向东到微光林地，向南到风铃湖、旧采石场；全域地图可标记目的地，角色移动时镜头跟随。
- 手机上使用方向按钮与交互按钮。
- 落枝与矿石每 30 秒恢复。种子在小屋南侧农田种植，60 秒成熟；收获 2 份萝卜并返还 1 份种子，离线不枯萎。
- **风铃杂货铺**：在村庄东南侧，地图或旅途菜单可标记方向。进店找米拉或使用寄售柜台，购买种子、出售萝卜／木材／石料／木板；「村民订单」每天提供三份额外酬谢的材料需求，「安家心愿」引导你完成第一笔生意、累计三份订单并修缮小屋。每天北京时间零点刷新订单，无漏签惩罚。米拉外出时柜台照常可用，剧情委托则需找到她当面聊。
- 进入工坊后仍可到柜台出售萝卜、购买种子、制作木板；小屋、工坊、图书馆的室内工作台可升级对应建筑。
- **村民日常**：莉亚、诺亚和米拉有各自独立的形象、喜好与作息。点击顶部的村庄时间或菜单里的「村民近况」，查看位置和日程、标记方向；可以聊近况、送一份心意，或花 4 体力搭把手。熟悉度达到 5 可聊个人故事，送礼与帮忙每人每天各一次，按北京时间刷新。
- **村庄时间与睡眠**：24小时制，新旅程06:00开始，01:00前到家中床边睡觉。正常睡到次日06:00，体力补满、生命恢复最多20；未睡会昏倒返家，生命−10（最低保留1），体力不恢复。床边也可免费小憩30游戏分钟，恢复最多20体力／10生命。沿用30现实分钟／24游戏小时速度，正常可活动日约23分45秒；阅读面板、现实成长、后台与离线暂停游戏时间，断联不补算昏倒。旧存档保留，现实委托、每日额度、作物与资源计时独立运行。旅馆尚未开放。
- **现实委托**：找到诺亚当前所在的位置并交谈，选择学习／运动／工作及 1–5 小时，分别获得知识点／健康点／技能点，每小时 1 点。领取后必须等服务器计时到期，再回诺亚身边结算；关闭页面仍继续计时。同一时间只能进行一项，三类每天合计最多 5 点，结算 2 点后当天最多再接 3 小时。
- 领取时预留额度，取消释放额度、不发部分奖励；可在 NPC 对话或「现实成长」中取消。额度按领取日的中国标准时间计算，跨天仍可结算，已结算额度不因花掉点数恢复。
- HUD 的「现实成长」（L）打开成长手记：从月历快速查阅每天的约定，按领取日归档，支持前后一天、切换月份、回到今天及已结算／已取消筛选。跨天约定可从「查看当前约定」找回；手机可展开月历。今日额度与三种点数余额分别显示，也能标记诺亚的位置。标记只指路，不传送。
- 点击 HUD 的体力条或「现实成长 → 体力培养」，主动投入健康点，每点使体力上限与当前体力各增加 5。旧锻炼约定保留为历史，不再发点。
- 初始体力 100；成功采集木材消耗 4、石料消耗 6，失败不扣。走路、对话和整理背包不消耗体力。家中睡眠与短休按上述规则恢复；每12分钟现实时间仍自然恢复1点，离线有效，满体力不储存恢复量。睡眠推进游戏日，不推进真实作物时间或现实成长日期。旧属性、探索能量与知识碎片保留，生命值初始100/100，可在角色档案中单独提升上限。
- 小屋的研习手札仍支持学习计划、专注计时和旧记录回看；旧手札不再发知识点，已有经验、碎片和点数保持原值。新的成长点数只通过诺亚的现实委托结算。
- **冒险者档案**：显示生命／体力的当前值和上限、科学／魔法等级、种植／养殖／建造等级，以及尚未分配的三类点数。选择项目不花点，确认时显示准确消耗与升级后余额；生命或体力每次用 1 健康点提升当前值与上限各 5，技能升级到 N 级消耗 N 技能点。技能从 0 级开始独立保存，技能加成、养殖玩法与战斗伤害尚未开放。旧 EXP 不转换成点数。
- 在研习手札的「知识研修」选择科学或魔法，再主动投入 1 知识点，使对应等级 +1。等级从 0 开始、永久保存；选择方向不消耗点数。角色档案也可直接打开研修。历史已完成任务不自动补发，旧学识经验、知识碎片与符文解锁不变；科学／魔法道具与法术效果尚未开放。
- 在研习手札的「研习计划」装订一个学习主题，之后每天翻开一页，沿用上次主题和默认时长。同一计划一天一页；过去未完成的记录保留，休息不扣成长。可整理未完成书页、归档计划或书页，再从「归档回看」取回。
- 学识达到 25 EXP 后可解读图书馆东侧符文；体魄达到 50 EXP 后每次采集额外获得 1 份资源。

游戏采用全视口画布和浮动 HUD；触屏设备显示方向控制器。右上角可以开启/关闭音效，设置中可减少动态效果；这些偏好保存在当前设备。

游客会话放在 HttpOnly Cookie 中，进度自动保存到服务器。在「研习手札 → 存档与恢复」或设置中下载**旅程凭证**；清除 Cookie 或换浏览器后，在初始登记页选择「已有旅程凭证？找回存档」，导入文件、核对角色，再恢复服务器上最新的进度。当前已有角色时，先下载并确认保存当前旅程凭证，再切换；原旅程不会被删除。

旅程凭证相当于进入存档的钥匙，请自行保管；服务端仅保存其哈希。凭证不能重建已删除或丢失的服务器数据库，也不是任意 JSON 数值导入。普通「导出存档与结算记录」仍供查看，不能用于恢复。删除游客数据会同时撤销其全部凭证与会话。

当前 Alembic head 为 `003`：`002` 增加恢复凭证/会话表，`003` 增加Cocos删除确认回执表；保留旧存档 JSON、奖励回执、凭证与会话。一键启动会升级指定数据库；手动启动前在 `backend/` 执行 `.venv/bin/alembic upgrade head`。

## 检查

```bash
# backend/
.venv/bin/python -m pytest -q

# frontend/
npm run build
npx playwright install chromium
REALQUEST_URL=http://127.0.0.1:5173 npm run test:smoke
REALQUEST_URL=http://127.0.0.1:5173 npm run test:visual
REALQUEST_URL=http://127.0.0.1:5173 npm run test:journey
REALQUEST_URL=http://127.0.0.1:5295 npm run test:market
REALQUEST_URL=http://127.0.0.1:5207 REALQUEST_TEST_DB=/absolute/path/to/RealQuest/output/character-points/test.db npm run test:character
REALQUEST_URL=http://127.0.0.1:5205 REALQUEST_TEST_DB=/absolute/path/to/RealQuest/output/life-commissions/test.db npm run test:life
REALQUEST_URL=http://127.0.0.1:5401 REALQUEST_TEST_DB=/absolute/path/to/RealQuest/output/day-night/test.db npm run test:sleep
```

浏览器烟雾测试需要先运行前后端，会创建独立测试游客。推荐为测试后端设置单独的 `DATABASE_URL=sqlite:////absolute/path/to/test.db` 并先迁移，勿对正式数据库运行测试。测试截图写入被 Git 忽略的 `output/`。

## 项目文档

- [架构与数据流](docs/architecture.md)
- [玩法与数值规则](docs/game-design.md)
- [里程碑状态](docs/roadmap.md)
- [素材来源与许可证](docs/assets.md)
- [村庄视觉改造与验证记录](docs/visual-overhaul.md)
- [后续 TODO](TODO.md)

版本定位：M0–M3 的基础可玩切片。尚无完整目标/每日任务系统、AI Director、Demo 模式、账号绑定和多人功能；不要将此版本当作已加固的公网服务。
