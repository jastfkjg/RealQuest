# Cocos 第一章：抵城、装备与委托追踪

2026-10-20。按用户在任务107复盘中选中的三项实施；Cocos 为唯一客户端。本轮范围为既有南门街至旅店的抵城链、武备台购买后装备，以及接取委托与追踪分开。成长门槛、战斗、价格、奖励、地图碰撞和玩家存档不在本轮调整范围内。

短计划：核对现有素材与交互；实现三项改动；构建真实 Creator 3.8.8 候选；用隔离 QA 库检查实际操作、失败重试和桌面/手机横屏；检查截图并清理本轮工具。

## 完成的行为

- **抵城识别**：现有南门、旅店门廊、补给台、告示牌有对应外观；地面铺路连接既有入口，路牌指向旅店和补给。点击旅店外观会走向原有门口，确认进入仍沿用原旅行报价。门牌、路标及人物姓名用固定屏幕字号的原生文本，独立于镜头缩放；进旅店时会清除室外路牌。
- **人物**：阿渡、岚姨接入已有正式单帧人物 PNG，不再显示几何占位人形；不声称具备行走动画或新日程。
- **购买后装备**：购买/打造页持有选中武器时，原页面出现“装备此武器”；确认成功后显示“已装备”并禁用重复操作。购买第二把武器保留旧装备，直到玩家明确装备。买入、打造、出售和原装备页仍使用服务器命令与资源校验；菜汤不显示武器装备动作。
- **接取与追踪**：服务器接取任务只改变接取状态，保留主线、支线或空追踪选择；成功反馈说明可手动选择追踪。委托列表/详情标明主线或支线、状态与当前追踪，接取之后可明确点击“追踪此委托”。切换屏幕尺寸时保持选中的委托可见。

## 实际改动位置

| 文件 | 内容 |
| --- | --- |
| `clients/cocos/assets/scripts/arrivalScene.ts`、同名 `.meta` | 南门街原生绘制、素材摆放、入口命中、路牌位置 |
| `clients/cocos/assets/scripts/Bootstrap.ts` | 场景接入、人物 PNG、固定字号原生路牌与姓名 |
| `clients/cocos/assets/scripts/ui/panels.ts` | 就地装备、主/支线标识、追踪反馈、横屏排版 |
| `backend/app/quests.py`、`backend/app/rules.py` | 任务类别、接取不覆盖追踪 |
| `shared/game/protocol.ts`、Cocos 自动同步副本 | 任务类别协议 |
| `clients/cocos/tools/sync.mjs`、`asset-bindings.json`、来源清单 | 两个人物的实际绑定、哈希及生成副本 |
| `backend/tests/test_quest_tracking.py` | 保留主线/支线/空追踪、重复接取、手动切换、持久化、资源守恒 |
| `clients/cocos/tools/smoke-chapter-friction.mjs`、浏览器套件注册、`tools/test-cocos-browser.mjs` | 三条真实交互、失败重试验收及新增套件注册合同 |
| `DESIGN.md`、素材计划/清单、验收清单、`TODO.md` | 本轮范围、素材来源和证据 |

## 素材与来源

没有下载、生成或改画图片；没有增加字体、音效或外部素材包。复用原有 cottage/shop/counter/board/fence/lantern/planter。阿渡和岚姨各自原有 `48×64` PNG 原样复制到 Cocos resources，使用原有 nearest/no-mipmap/no-trim 元数据；具体 SHA256、输出路径与来源在 `clients/cocos/asset-bindings.json`。原始生成来源、提示词和单帧定义继续由 `docs/art/departure-art-v1.json` 记录。

南门街为原生地面、石墙和路牌构图，建筑 PNG 保持两个源像素对应一个世界单位。人物采用与现有玩家一致的帧显示尺寸。没有新增地图、可交互对象或虚构商人。完整城市专属美术仍是后续可选工作，本轮画面尚未获得用户视觉批准。

## 验证与证据

最终候选：`clients/cocos/web-chapter1-friction/web-desktop`，真实 Creator 3.8.8 release，带当前源码/产物指纹回执。运行 SDK 前从保留的已验签输入创建独立工作副本，完整签名校验通过；未运行或修改保留输入。

| 命令 | 结果 |
| --- | --- |
| `cd backend && .venv/bin/python -m pytest -q` | 236 passed；仅现有 Starlette/httpx 弃用提示 |
| `npm run cocos:sync`、`npm run cocos:sources:write` | 109 绑定、410 来源；自动副本与原图字节一致 |
| `COCOS_CREATOR=<本轮工作副本>/Contents/MacOS/CocosCreator npm run cocos:check` | 109 绑定与真实引擎 TypeScript 声明通过 |
| `npm run cocos:art:check` | 原有 7 地面/地毯图、43 sprite 绑定及 9 物品图检查通过 |
| `npm run cocos:test:unit -- --only core,features,local-scene,guidance,places,inventory --report output/cocos-arrival-20261020/unit-result.json` | 6 模块通过 |
| `npm run cocos:test:unit -- --only browser-configuration --report output/cocos-arrival-20261020/browser-config-unit.json` | 新增套件注册、隔离库与端口等合同通过；共 7 个单元模块 |
| `COCOS_CREATOR=... COCOS_USER_DATA=... REALQUEST_COCOS_BUILD=web-chapter1-friction npm run cocos:build:release` | 真实构建成功；成功码 36 经既有适配器转为 0 |
| `npm run cocos:test:browser -- --build web-chapter1-friction/web-desktop --suite chapter-friction,story,travel` | 三套通过；3+9+2 组交互、11+20+17 张截图，无未预期浏览器错误 |
| `npm run cocos:sources`、`git diff --check` | 最终来源及差异检查通过 |

构建回执：275 个产物文件，源码指纹 `09a1be0279432a5129867ce2ffc1bb7e17e2bf87be921f347607ddb7e61135ff`；产物指纹 `f0f5284653113b2d46edad3b4ced2961cc3f6c1d290f87d7ade923f77fb1860b`。最终浏览器运行记录：[run-oEYOIO/result.json](../../output/cocos-regression/run-oEYOIO/result.json)。浏览器为 Chromium 156.0.8078.4；不是物理手机验证。

专项 11 张截图已全部实际查看，确认装备操作与反馈、主/支线与追踪状态、窄屏分页、旅店门牌/路径及人物；48 张并未全部逐图复审。代表截图：

- [桌面购买后装备](../../output/cocos-regression/run-oEYOIO/suites/chapter-friction/purchase-equip-desktop.png)、[横屏购买后装备](../../output/cocos-regression/run-oEYOIO/suites/chapter-friction/purchase-equip-landscape.png)
- [接支线保留主线](../../output/cocos-regression/run-oEYOIO/suites/chapter-friction/side-accepted-main-kept-desktop.png)、[横屏选中委托](../../output/cocos-regression/run-oEYOIO/suites/chapter-friction/side-accepted-main-kept-landscape.png)
- [南门抵城](../../output/cocos-regression/run-oEYOIO/suites/chapter-friction/city-arrival-desktop.png)、[旅店门口](../../output/cocos-regression/run-oEYOIO/suites/chapter-friction/inn-door-desktop.png)、[岚姨](../../output/cocos-regression/run-oEYOIO/suites/chapter-friction/lanya-desktop.png)
- [专项交互录像](../../output/cocos-regression/run-oEYOIO/suites/chapter-friction/flow.webm)

专项使用全新受保护 QA 库，只准备接近位置、前置委托/渡河资格、金币、绳索及翻山体力；买入、装备、接取/追踪、翻山、街道行走、进门、交信、订房和睡眠均实际操作。原有 travel 套件另从村东门开始实际渡河、翻山、住宿并返乡，验证原价格与资源守恒。没有重置、覆盖或连接玩家数据。

## 检查中发现并修正

第一次 Creator 导入新脚本生成 `.meta` 后，构建回执如实拒绝变化中的输入；元数据稳定后重新构建。受限执行环境无法启动浏览器/完整读取签名，改用同一操作的正常本机权限后通过，没有修改签名或浏览器设置。

第一遍浏览器检查完成购买/追踪两组，抵城到床边已实际到达；辅助脚本重复点击自动打开的床边交互而超时。修正辅助脚本的上下文处理后重跑。截图检查另发现世界字号缩放导致路牌发虚、门牌深度被遮和窄屏选中项不在当前列表页，已在源码修正并重新构建。失败轮次不作为最终通过依据。

新增套件后，原注册合同对旧数量的断言被检查发现并更新为 28 个当前 Cocos 套件，并明确验证本套件文件路径；该工具单元模块已通过。这不表示执行了其余全部套件。

## 收尾与剩余边界

两轮浏览器运行共核对 20 个已归属进程退出、8 个临时服务端口关闭；三套最终浏览器均正常关闭、没有强制结束。Creator 构建进程已退出，独立 SDK 工作副本已删除，保留输入未作为执行目录。清理记录：[cleanup.json](../../output/cocos-arrival-20261020/cleanup.json)。保留离线构建、截图/录像、隔离 QA 库和测试报告；本轮没有保留在线预览或浏览器，没有提交、推送或发布。

桌面为主要视觉验收范围；740×360 横屏验证了操作，但原有世界 HUD 在小屏仍会覆盖部分背景景物。本轮未扩大为所有世界 HUD/镜头重排，没有物理设备或手机竖屏验收。下一步是否继续成长/启门卡点或城市专属美术，由后续任务决定。
