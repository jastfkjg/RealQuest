# 木箱与木匠工程（任务128）

用户授权：认可玩家自制收纳/家具/设施、NPC承接结构工程的分工；先完成木箱制作、摆放、存取和移动，再接入木匠建筑委托。

## 本轮切片与规则

1. 工坊中的阿榆免费教授木箱与加固木箱图纸；在工坊工作台制作。普通木箱建造0级，3木板＋2木材，12种物品；加固箱建造2级，6木板＋4石料，24种物品。每种物品占一格、每格上限9999，不新增技能点来源。
2. 家园手册打开屋内平面预览，确认后消耗背包中的箱子。服务器检查坐标、家具、门口、早晨落点、人物位置、箱体占用和通路连通；真实世界使用相同碰撞几何。当前只在小屋内摆放，不扩展到户外或其他地图。
3. 走近独立箱体可单份/整组存取、中文改名、移动。箱体ID与内容独立持久化；移动保留内容，旧家园储物箱和原库存保留。金币留在钱袋；现有装备移除校验继续生效。
4. 工坊木匠的报价单承接小屋修缮及禽舍/畜棚/马厩1–3级工程，同一时刻一项；不要求玩家建造等级。支付后出现工单与施工标记，次日游戏06:00完工，睡眠可推进；离线与Life暂停。已有建筑、动物、筹建援助保留，旧即时升级入口不能绕过工单。
5. 小屋工程沿用现有等级效果，本轮没有新增房间；页面明确说明。牧场设施加工方式及其他家具的完整制作留待后续切片，不能把本轮当成整个建造目录完成。

## 实现文件

- 权威规则：`backend/app/construction.py`；`rules.py`、`world.py`、`daynight.py`、`main.py` 接入存档默认值、事务分派、动态碰撞、睡眠结算和只读投影。无数据库表迁移。
- 共享：`shared/game/construction.ts`、`navigation.ts`、`interaction.ts`、`items.ts`、`protocol.ts`；Cocos core副本由 `npm run cocos:sync` 生成。
- Cocos：`ui/construction.ts`、`ui/storage.ts`、`ui/panels.ts`、`ui/ranching.ts`、`Bootstrap.ts`。
- 验证：`backend/tests/test_construction.py`；更新养殖/经济/任务链测试以执行真实工单与游戏时间结算；`test-construction.mjs`、`smoke-construction.mjs`；更新主线与世界浏览器脚本的真实入口。
- 工具：`sync.mjs`增加共享绑定与2个现有箱图别名，单元/浏览器注册加入建造模块；来源清单更新。

## 美术与视觉边界

无外部资产、付费资源、字体复制或新增生成图。箱子复用已有原创 `assets/runtime/hearthwood/detail/interiors/chest-closed.png`，两项物品图是同源字节绑定，哈希见 `clients/cocos/asset-bindings.json`。平面图家具复用既有 desk-96/hearth/planter/bed；网格和施工文字为原生图形与中文文本。

阿榆是独立NPC交互对象，目前临时复用 `noah-actor` 的既有原创造型，名称牌明确区分；独立人物美术与作息尚待后续制作。本轮功能与截图不代表玩家已批准新NPC造型。

## 验证与收尾

- 环境：Node22.23.2/npm10.9.8（沿用package-lock），Python后端venv，实际Cocos Creator3.8.8；Cocos是唯一验收客户端。
- 后端最终 `cd backend && .venv/bin/python -m pytest -q`：417通过，含14项建造用例与并发/回执重试、失败不扣料、满箱、独立库存、距离/等级、睡眠/离线/旧档。
- `npm run cocos:sync`、`npm run cocos:sources:write`、实际Creator声明 `npm run cocos:check`：292绑定、851来源文件、35共享模块通过。
- `node tools/cocos-unit.mjs`：现有30组通过；新增建造组另轮通过，共31组分轮证据。报告 `output/construction-128/unit-final.json` 和 `unit-construction.json`。
- 官方Creator独立候选 `web-construction-128/web-desktop` 已稳定构建；首次导入/同步导致meta变化的构建被回执拒绝，未伪造通过，稳定轮前后运行来源哈希一致。默认包构建及最终浏览器结果补录于下方。
- 浏览器截图实际查看：木匠教学/报价、制作、摆放、存取、带内容移动、中文改名，1440×900、844×390、740×360；修正首轮空白网格和大留白。记录在 `output/cocos-regression/run-OWV3f5/`。
- develop-web-game提供的帧客户端仅适配Cocos准备、全页截图和finally关闭，输入编排原样保留；2轮真实帧截图/状态已查看，`output/construction-128/frames/`。第一次沿用已结束服务连接失败，浏览器仍在finally退出；改用当轮活动QA服务后通过。
- 所有QA材料与接近位置使用独立测试库夹具；图纸、制作、箱体、存取、移动、工单和睡眠通过真实UI执行。未修改玩家库、提交、推送或部署。物理设备、系统IME/读屏、独立NPC美术与玩家手感验收未验证。

### 最终结果

- 最终独立Creator候选与默认 `web-current/web-desktop` 均由官方3.8.8构建，运行源码指纹相同；`build-final.log`、`build-default.log`、`build-comparison.json` 保存证据。同期其他任务清理了其ranching SDK副本，末轮改用本任务独立 `construction-128-working.app`，完成后已删除；原始SDK保留。
- 最终建造专项：`output/cocos-regression/run-Pie0oA/result.json` 完整通过9组、20张截图及录像。覆盖实际教学、材料制作、只读摆放预览、独立世界箱体、中文改名/输入焦点、失败/已提交丢回包重放、单份/整组存取、带内容移动、重载、桌面/844/740横屏、木匠报价/施工/实际睡眠完工，以及明确标注为夹具的满级页面。已查看代表全尺寸截图，包括实际新箱体、移动结果、工地标记和满级禁用；截图生成和结构审计不替代人工观感判断。
- `run-OWV3f5` 的行囊12组通过（58图）；同轮主线实际完成木板、小屋工单、援助禽舍与首次喂养，后续洞穴脚本死亡返回洞口，不能记作完整主线通过。旧world/story脚本仍断言首个奖励后32银，当前经济实际30银，因此该组失败；保留原始断言及失败记录，未用放宽判定伪造通过。两项超出本次建造链的整体回归问题仍需后续处理。
- 最后补充改名草稿按旅程ID、箱体ID和版本隔离的渲染测试，避免切换存档串用草稿。`unit-construction.json` 通过；与既有30组分轮合计31组。
- 清理：`output/construction-128/cleanup.json` 的99个已记录测试PID均退出，记录的浏览器profile无残留；自动化浏览器/服务已关闭。SDK工作副本与专用Creator user-data目录已删除并核验。原始SDK、测试包与证据保留。
- 人工试玩：保留 `http://127.0.0.1:5481` / API8181，PID及子进程见 `manual-ready.json`，独立新档 `output/construction-128/manual-preview.db`，用途是体验本轮功能；无注入物品、奖励或建筑。原有5478/8178其他任务预览未操作，两个health均200。默认启动仍是 `npm start`，用户完成试玩后清理5481这套服务。
