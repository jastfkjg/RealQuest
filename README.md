# RealQuest · 现实副本

**Real Life is the Game.** 一个将现实成长与家园经营、探索相连接的中文像素 RPG 基础版本。

当前可以探索 1920×1280 户外世界，进入小屋、工坊、图书馆和旅人公会，接取与交付六个剧情委托，采集、种植、交易、制作与升级，并记录现实活动和学习计时。位置、任务、储物箱和资源会保存，兼容旧版存档。**AI 尚未接入；NPC 对话为明确标注的预设剧情。完整 MVP 的剩余工作统一维护在 [TODO.md](TODO.md)。**

## 本地开发

需要 Node.js 22+、Python 3.14。使用 SQLite，无须先安装 PostgreSQL。

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

## Docker Compose

```bash
cp .env.example .env
docker compose up -d --build
```

打开 [http://localhost:8080](http://localhost:8080)。包含 Nginx 前端、FastAPI 后端和 PostgreSQL 17；后端启动时执行 Alembic 迁移。数据库使用命名卷，`docker compose down` 保留存档。默认仅绑定本机地址；公开部署前设置强数据库密码、HTTPS、`COOKIE_SECURE=true` 和正确的 `ALLOWED_ORIGINS`。

## 环境变量

| 变量 | 用途 | 默认值 |
| --- | --- | --- |
| `DATABASE_URL` | 后端 SQLAlchemy 连接 | `sqlite:///./realquest.db` |
| `COOKIE_SECURE` | 仅通过 HTTPS 发送会话 Cookie | `false`，本地 HTTP 用 |
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
- 进入工坊后到柜台出售萝卜、购买种子、制作木板；小屋、工坊、图书馆的室内工作台可升级对应建筑。
- 现实成长面板可记录真实活动或开始学习计时。每属性每日现实奖励最多 100 EXP。
- 学识达到 25 EXP 后可解读图书馆东侧符文；体魄达到 50 EXP 后每次采集额外获得 1 份资源。

游戏采用全视口画布和浮动 HUD；触屏设备显示方向控制器。右上角可以开启/关闭音效，设置中可减少动态效果；这些偏好保存在当前设备。

游客凭证放在 HttpOnly Cookie 中。请保留浏览器 Cookie，清除后暂时无法自助恢复存档。设置面板可导出数据或永久删除当前游客全部数据。导出文件当前仅供查看与备份，不支持导入。

## 检查

```bash
# backend/
.venv/bin/python -m pytest -q

# frontend/
npm run build
npx playwright install chromium
REALQUEST_URL=http://127.0.0.1:5173 npm run test:smoke
REALQUEST_URL=http://127.0.0.1:5173 npm run test:visual
```

浏览器烟雾测试需要先运行前后端，会创建独立测试游客。推荐为测试后端设置单独的 `DATABASE_URL=sqlite:////absolute/path/to/test.db` 并先迁移，勿对正式数据库运行测试。测试截图写入被 Git 忽略的 `output/`。

## 项目文档

- [架构与数据流](docs/architecture.md)
- [玩法与数值规则](docs/game-design.md)
- [里程碑状态](docs/roadmap.md)
- [素材来源与许可证](docs/assets.md)
- [村庄视觉改造与验证记录](docs/visual-overhaul.md)
- [后续 TODO](TODO.md)

版本定位：M0–M3 的基础可玩切片。尚无完整目标/每日任务系统、AI Director、Demo 模式、账号恢复和多人功能；不要将此版本当作已加固的公网服务。
