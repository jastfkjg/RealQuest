# RealQuest · 现实副本

RealQuest 是连接像素 RPG 与现实成长记录的中文游戏。自 2026-10-20 起，**Cocos Creator 3.8.8 是唯一客户端**；React/Phaser 应用已退役。后端继续使用 FastAPI、SQLAlchemy 和 Alembic，共享规则在 `shared/game/`。

## 本地准备

仓库使用 `.nvmrc` 中的 Node 22.23.2、npm 10 和 Python 3.14：

```sh
nvm use
npm ci
python3.14 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements.lock.txt
npm exec -- playwright install chromium
npm run cocos:doctor -- --browser
```

重新构建前先停止正在使用同一构建目录的预览，或用 `REALQUEST_COCOS_BUILD` 指定新目录。仅启动已有包不需要 Creator。首次构建或修改 Cocos 源码后，配置官方 Creator 3.8.8 的可执行路径：

```sh
export COCOS_CREATOR="/你的路径/CocosCreator.app/Contents/MacOS/CocosCreator"
npm run build
```

`build` 依次同步资源、检查来源与真实引擎类型、生成 release 包 `clients/cocos/web-current/web-desktop`；debug/sourceMaps 关闭，MD5 缓存开启。`COCOS_CREATOR` 指向可写工作副本，保留的签名 SDK 输入不直接用于执行。详见 [本地说明](docs/cocos-local.md)。

## 启动

```sh
./start.command --check
./start.command
# 等价入口：npm start 或 ./start-cocos.command
```

打开 <http://127.0.0.1:5443/>；API 为 8143。本地库为 `output/cocos-local/local-preview.db`，首次启动自动迁移，Ctrl+C 同时停止本次前后端。此预览服务没有源码热更新，不是生产服务器。

可用 `--build`、`--database`、`--port`、`--api-port` 指定独立配置；`--check` 只读检查，不创建数据库。旧试玩库和旧玩家数据已按用户授权清理，不再提供旧版入口。

## 测试

```sh
# Cocos/共享规则单元 + 后端测试
npm test

# 真实引擎类型与来源检查（需要 COCOS_CREATOR）
npm run check

# 当前包完整 Cocos 浏览器回归
npm run test:browser

# 定向回归
npm run cocos:test:browser -- --build web-current/web-desktop --suite inventory,life

# 实际启动、重启和中断清理
npm run cocos:test:startup -- --build web-current/web-desktop
```

浏览器控制器分配回环端口、创建每套独立 QA 库，并在 finally 中关闭浏览器/API/代理。不要把人工库传给测试。报告在 `output/cocos-unit/`、`output/cocos-regression/` 和 `output/cocos-startup/`。不再安装、构建或验证旧客户端。

## 素材与共享代码

- `assets/runtime/`：从原目录迁出的素材，保留原字节与授权来源。
- `assets/generated/`：原始项目美术与提示词；不作为源素材包发布。
- `tools/scene-art/`：独立离线 Canvas 绘制与布局源，无 Phaser 依赖。
- `shared/game/`：规范规则和类型；修改后用 `npm run cocos:sync` 生成引擎内副本。
- `docs/art/`：许可证、裁切、尺寸、哈希及生成记录。

```sh
# 路径或规范源有意修改后，先审查再更新来源清单
npm run cocos:sources:write
npm run cocos:sources
# 像素和布局重建核验，会启动并自行关闭浏览器
npm run cocos:art:check
```

## 静态包与 Docker

先构建并封装当前 Cocos 包：

```sh
npm run cocos:package -- --build web-current/web-desktop --output output/cocos-delivery
npm run cocos:package -- --verify output/cocos-delivery
cp .env.example .env
docker compose up -d --build
```

打开 <http://localhost:8080/>。Compose 前端直接使用已验证 Cocos 静态包；API 与 PostgreSQL 17 保留。默认 CI 执行根目录检查/单元与后端测试；实际 SDK 构建使用预置的 `cocos-3.8.8` runner，镜像推送需要显式手动选择，服务器部署仍单独手动触发。见 [交付](docs/cocos-delivery.md)与[部署说明](docs/deployment.md)。

## 当前边界

游客仍可直接开始。欢迎页「登录 / 接续旅程」或随身页的存档入口 →「账号登录」，支持用户名密码注册、绑定当前游客旅程、登录预览与明确接续、退出保留存档。用户名3–24位英文字母/数字/下划线，不区分大小写；密码15–128字符，暂不提供邮箱验证或自助找回。注册绑定会使旧游客凭证失效，账号旅程使用用户名密码接续；完整数据仍可导出。换设备需连接同一服务器，公开部署必须使用HTTPS。

启动器自动执行新增的004账号迁移，保留原存档ID与游戏历史；退出不删数据，明确删除旅程会撤销会话并保留账号，再登录从空白旅程开始。账号专项实现与验证见[任务116](docs/tasks/116-cocos-username-accounts.md)。

游戏世界、行囊、任务、洞穴/旅行、现实成长、学习记录和存档管理均属于 Cocos。AI 尚未接入；NPC 为预设剧情。浏览器回归通过不等于系统输入法、读屏或物理设备验收，服务器发布也不由本地构建代替。

当前清理与验证记录见 [任务109](docs/tasks/109-cocos-only-client.md)。历史任务保留当时证据描述；已清理的本地 QA 文件和旧构建不再保证可打开，其历史兼容门槛不适用于新任务。

种植体系：12种种子均在风铃杂货铺购买，种植0–5级分批开放播种。家园户外点击「装备锄头」或按H，直接点按/拖动合适草地开垦，每块仅4体力；按住空格配合WASD可连续挥锄，Esc停止并收起。道路/水面/建筑/树干/设施受保护，不设家园等级田地配额，旧田地和作物保留。收起锄头后点田地播种、浇水或收获。新作物按游戏时间/睡眠生长，离线暂停，成熟不枯萎。见[锄头改进报告](docs/tasks/122-cocos-free-hoe.md)与[完整种植报告](docs/tasks/120-cocos-farming-system.md)。

武备体系（task123）：基础冷兵器、科学、魔法三路线，共18把武器与6件护具饰品。村庄武备台提供前期成品和永久图纸；苔桥城精密工坊提供城市武器、精密材料与研究图纸。使用条件和制造条件独立，四格快捷栏点击或1–4直接装备，普攻免体力、空手不能攻击；旧档保留原物品与能力。详见[装备规则](docs/balance/equipment-v1.md)与[实现和验证记录](docs/tasks/123-cocos-equipment-system.md)。

养殖体系（task125）：从家园南侧的牧场入口进入向阳牧场，从牧场手记查看禽舍、畜棚、马厩工程与幼崽采购，按现场指引办理。鸡、鸭、绵羊、奶牛、山羊、猪、马按养殖0–6级开放，各有幼年／成长期／成年形态；饲料可购买或由小麦、玉米加工。走近动物添粮、抚摸、收集，成年马可骑乘；蛋、奶、羊毛、松露可继续加工并在杂货铺出售。缺食暂停，离线与现实模式不消耗口粮。见[养殖规则](docs/balance/ranching-v1.md)与[实现和验证记录](docs/tasks/125-cocos-ranching-system.md)。

银金经济（task127）：100银币=1金币，钱包自动换算；村庄收支、任务回礼和经营投资已同步调整。新手牧场使用一次施工/领养援助，旧余额与已接契约保留。数值、回本口径与兼容规则见[经济v1](docs/balance/economy-v1.md)。
