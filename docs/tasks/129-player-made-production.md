# 玩家制作生产设施（任务129）

用户要求：将现有生产设施接入玩家制作体系，以不同建造等级打通图纸学习、制作、摆放与实际使用。Cocos为唯一客户端，本轮限四台现有加工机器，不扩展新地图或其他家具目录。

## 已实现规则

| 设备 / 背包物品ID | 建造等级 | 制作材料 | 加工用途 |
| --- | --- | --- | --- |
| 蛋黄酱机 `mayo_machine` | 1 | 木板4、石料8 | 鸡蛋、鸭蛋 |
| 织布机 `loom_machine` | 2 | 木板6、木材2、石料6 | 羊毛 |
| 压酪机 `cheese_press` | 3 | 木板6、石料12 | 牛奶、羊奶 |
| 榨油机 `oil_press` | 4 | 木板8、石料18 | 松露 |

1. 工坊木匠阿榆免费教授永久图纸；可提前学习，制作时才检查建造等级和材料。工作台确认后扣材料、产出一台背包设备；等级不足、材料不足或未学图纸均不扣料。
2. 牧场采购簿 → 加工 → 查看设备/摆放。加工地带东西两条带各7格，共14台；中间采购簿/出口道路和北侧动物区留空。计划选格只预览，确认才消耗背包设备。设备位置投影为真实碰撞，客户端与服务端几何一致。
3. 每台有稳定实例ID/版本，走近后选配方及普通/优质原料，投1份原料加工1份成品。六种既有配方、时间和价格保持。两台同类设备可以同时各加工一批，收取时必须回到对应实例。
4. 制造等级不重复约束已拥有设备的使用。加工或成品待取期间不能搬动、不能收回；空闲可移动或装回背包再摆放。回执重试、过期版本和并发请求保留权威事务边界。
5. 游戏时间和睡眠推进加工；Life/离线暂停。一整天的配方若06:03投料，次日06:00仍差3分钟，界面按实际剩余时间显示，不提前发成品。
6. 老档布尔设备和以设施类型为键的未完任务一次迁移为 `legacy_machine_*` 实例。原料已投入，不重扣；保留输出品质、完成tick、库存、储物箱和动物。无数据库表迁移。饮水池/拱土区仍是牧场基础设施；住所与小屋仍委托木匠。

## 实现与素材

- 后端：新增 `backend/app/production.py`；`construction.py`扩展图纸/制作/摆放分派，`ranching.py`加工路由到实例，`world.py`增加动态对象/碰撞；权威配方来自 `ranch_catalog.json`。
- 共享：`shared/game/construction.ts`、`navigation.ts`、`interaction.ts`、`items.ts`及生成目录。Cocos副本通过既有sync生成。
- Cocos：新增 `ui/production.ts`，接入 `ui/panels.ts`、`ui/ranching.ts`、`ui/construction.ts`、`ranchView.ts`、`Bootstrap.ts`。生产清单只标记目标，实际操作需要走近。加工面板固定显示实际任务配方与品质，断线时只保留一个恢复确认控件。
- 复用现有原创 `assets/derived/ranching-v1/facilities/{mayo,loom,cheese,oil}.png`。新增4个背包别名、无新增绘图/下载/字体，原图字节和出处不变；SHA与复制关系见 `docs/art/ranching-art-v1.json`、`docs/art/asset-manifest.json`、`clients/cocos/asset-bindings.json`。现有浅纸/苔绿组件继续使用。
- 测试：新增 `backend/tests/test_production.py`、`test-production.mjs`、`smoke-production.mjs`；原养殖后端及浏览器脚本按实体设备流程更新，木箱脚本适配新增图纸分页。完整养殖长流程本轮未重跑，不把脚本更新当作通过。

## 环境与隔离

Node22.23.2/npm10.9.8，Python3.14项目venv，官方Creator3.8.8。另一活动聊天同时在同一工作区实现铁匠柜台，保留其所有文件和服务，未向其他聊天发送消息。由于构建期间源码变化及未完成的来源登记，前两轮根目录候选无法作为稳定验收包，保留失败记录。

生产链使用 `output/production-129/checkpoint/` 源码快照、独立Creator候选和每套新建QA库。快照是真实代码复制，复用Node/Python依赖；不是干净Git或独立依赖安装。冻结输入清单见 `checkpoint-source.json`；最后运行来源/后端指纹由现有runner保存。快照中的工坊代码仅为复制时状态，其后铁匠改版不属于此包的验收范围。

## 验证记录

- `cd backend && .venv/bin/python -m pytest -q tests/test_production.py tests/test_construction.py tests/test_ranching.py`：62通过（`backend-focused-final.log`），含全部机器等级/成本、六配方两种品质、相同机器独立任务、失效版本、占位/道路/距离、防旧端点绕过、迁移、Life/睡眠与回执并发。
- 早轮全量431通过；并行铁匠入口改变期间曾有30项旧入口用例失败（`backend-final.log`）。对方完成入口适配后，最终合并工作区全量 **445通过**，见 `backend-merged-final.log`；旧失败记录保留，没有放宽断言。
- `npm run cocos:test:unit -- --report output/production-129/unit-final/result.json`：33/33组通过；含本轮设备几何/14格全满仍可接近出口采购簿与每台设备、任务配方/品质和恢复控件测试，以及同期已接入铁匠单元。
- `node tools/build_local_scene_art.mjs --refresh-manifest`：7张既有场景PNG、43绑定、7布局、81输入验证并仅刷新出处；没有修改场景图像。`npm run cocos:sources:write` 和真实Creator声明 `npm run cocos:check`：合并工作区300绑定/877来源通过（`check-final.log`），数量包括并行铁匠资产。
- 独立快照真实Creator稳定构建：`checkpoint-build-3.log`。首次导入改变meta的候选被回执拒绝，稳定轮前后来源一致；未修改或伪造回执。
- 木箱回归：`checkpoint/output/cocos-regression/run-kDPyQn/suites/construction/result.json`，9组通过；同轮runner的生产用例因错误假设“次晨即满足完整一日”失败，保留该记录。更早构建的脚本字段名、文字裁切已修复，未记为通过。
- 最终生产浏览器：`checkpoint/output/cocos-regression/run-lWu5lQ/result.json` 完整通过9组、32张截图与录像；与上述木箱回归使用相同运行源码指纹。代表实际截图已查看，包括背包设备、工作台、5台世界设备、断线恢复、加工/完成、移动与重摆、844/740横屏。`verification.json`列出组合证据，未将旧失败轮计入通过。所有图纸、制作、摆放、投料、真实床铺睡眠、收取、搬动、收回均通过UI执行。QA仅提供材料/建造等级和接近坐标；未伪造机器、加工或产物。
- develop-web-game提供的帧客户端仅沿用上轮Cocos准备/全页截图/finally清理适配，输入编排不变。稳定预览2次动作与状态通过，`frames-final/`；两张帧截图已查看。先前正在关闭的QA服务加载超时，浏览器仍已关闭，失败记录保留。

## 交付和边界

人工预览为 `http://127.0.0.1:5482` / API8182，位于独立快照，独立新档 `checkpoint/output/production-manual/preview.db`；服务身份见该目录 `ready.json`。没有给玩家库存、等级或设施注入测试物品。帧客户端的临时游客也在这个隔离库中，用户的新浏览器会话可正常开新旅程。旧5481建造试玩及5478养殖试玩不重启、不改库；根目录默认包不在本轮覆盖，避免覆盖正在进行的铁匠改版。当前浏览器5481需要改用5482体验本轮。

本轮完成生产设备切片；其他家具自制、设施升级、独立木匠人物美术和整套视觉/手感的玩家确认仍属后续。没有提交、推送或部署；模拟触控不等同实机，系统IME/读屏未新增验证。清理见 `output/production-129/cleanup.json`：97个已记录测试PID均已退出，6个浏览器profile均不存在；自有Creator副本和独立快照library/temp/profiles已删除。专用user-data路径未生成。独立预览5482保留PID15068及子进程15081/15082，另两预览保持；三个health均200。冻结源码、构建、QA证据和可复现的来源回执保留，未移除当前人工预览依赖。
