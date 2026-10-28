# 三路线武器与装备体系 — task123

状态：实现与工程验证完成，最终包已交付原5452试玩地址；实际美术与手感等待玩家反馈，不认定已获视觉批准。

## 实现的完整流程

基础冷兵器、科学、魔法为三条路线，攻击方式单独定义。18把武器覆盖剑、长矛、锤、弓、连弩、火铳、手枪、冲锋枪、激光枪、附魔近战和法杖；6件护衣/鞋靴/饰品可实际穿戴。目录和数值详见[装备规则v1](../balance/equipment-v1.md)，规范源是backend/app/equipment_catalog.json，客户端目录由工具生成，不维护第二份权威规则。

- 村庄武备台提供前期成品与商人图纸；现有苔桥城新增实际可走近互动的精密工坊柜台，提供城市成品、图纸、精密材料和高级研究。村庄不显示或出售手枪、冲锋枪、激光枪、动力机甲；伪造地区/远程交易请求也被服务器拒绝。
- 图纸永久学会，打造不消耗图纸。商人、石壳守卫首胜、沉睡符文和城市研究均有实际获取路径。研究资格、报价、材料与工作台地点由服务器校验，重复购买与回执重试不能重复扣钱。
- 使用条件与制造条件独立：使用看永久体力上限、科学/魔法；制造看建造、知识等级、图纸、材料和地点。基础冷兵器无需科学/魔法制造等级；当前体力不使武器突然失效。旧旅程保留原四武器图纸和已持有旧武器的使用资格，补回已应得特殊图纸，稳定物品ID不变。
- 主手、护衣、鞋靴、饰品四位真实生效；防护、闪避冷却、受击保护和菜汤恢复均参与服务器计算。出售/存入最后一件会卸下。动作期间禁止换装，跨换装保留攻击冷却；普通攻击免日常体力，空手普攻和进攻火花术均不可攻击。已学火花术可配合任一可用武器，保留原4体力成本。
- 四格口袋点击或1–4直接装备，不攻击、不打开菜单；行囊详情可直接装备。选中种子不卸下主手，原播种预览/拖放/保存恢复和Life Mode输入所有权保持。
- 箭矢、子弹、法弹和激光经过真实弹道接触与地形阻挡；激光贯穿最多3个目标。固定效果实现碎甲、三击共鸣、减速、余烬和穿甲。灯坠恢复+5，菜汤实际恢复25时也报告25。

本轮没有新增地图、敌人、随机词缀、耐久、弹药货币、AI、支付或外部账号设置。建造继续承担工艺能力，没有额外收一种锻造点。动力机甲作为可穿戴外骨骼护衣实现，未引入载具操作；角色沿用原形象和肩部穿戴细节，没有新增完整服装动画组。

## 美术和实际界面

使用frontend-skill、ui-ux-pro-max、imagegen和develop-web-game工作流。内置image_gen生成一张原创1536×1024透明24格源表；原图与完整提示词在assets/generated/hearthwood/equipment-v1/。tools/build_equipment_art.py按256px格切片、alpha≥160、最近邻缩放并居中，生成24张96×96透明PNG；同一原画用于目录、行囊、口袋和实际角色持握，四向朝向与攻击姿态采用原生节点变换。未下载/上传第三方资产、复制字体或购买素材；源表不进入运行包。处理、尺寸、裁切、哈希和Cocos nearest/不裁切绑定见docs/art/equipment-art-v1.json、asset-manifest.json和asset-bindings.json。

武备台沿用原Hearthwood纸/木材质，按成品、图纸、打造、出售、材料组织，三路线与护具可筛选；完整条件可翻页。横屏在操作前显示图纸/研究报价，装备完成后能从武备台标记山洞。行囊保留原简洁布袋构图。4种精密材料明确复用原有材料图的别名，不声称有独立新原画。

实际检查了1920×1080、1440×900、1024×768、844×390、740×360。截图和录像来自隔离QA：货币、材料、技能、位置和部分高生命静态目标是明确夹具；获取、扣费、打造、装备、攻击、伤害、奖励与恢复由真实UI/服务器完成，不冒充玩家赚取。最终高生命目标同时设置正确max_hp，避免夹具制造超长血条；普通怪和首领原数值未改。

代表截图位于output/cocos-weapons-123/screenshots/：village-armory-1440.png、village-science.png、equipment-four-slots.png、armory-740.png、city-pistol.png、laser-crafted.png、combat-stone_sword.png、combat-prism_rifle.png、combat-frost_staff.png、village-diagram-740.png、city-research-740.png、charm-soup-25-740.png。完整流程录像output/cocos-weapons-123/equipment-flow.webm，美术总览art-contact.png。

## 文件分工

- backend/app/equipment_catalog.json、equipment.py：规范目录、图纸、门槛、地区报价、四位装备、兼容和真实加成。
- backend/app/combat.py、rules.py、journey_world.py：通用攻击/弹道/固定效果、交易与存储生命周期、特殊图纸和城市实际柜台。
- shared/game/gearCatalog.ts、protocol.ts、items.ts、inventory.ts、caveView.ts：生成展示目录、协议、物品说明、装备意图、姿态与轨迹；Cocos core由sync生成。
- clients/cocos/assets/scripts/ui/expeditionGear.ts、panels.ts、inventory.ts、combatDock.ts，以及Bootstrap.ts、combatView.ts、arrivalScene.ts：原生界面、快捷换装、持握美术和状态反馈。
- tools/generate_equipment_catalog.py、build_equipment_art.py、cocos-sources.mjs、sync.mjs：规范生成、可复现美术和来源绑定；原24图/生成meta归属明确。
- backend/tests/test_equipment.py、test_combat.py、clients/cocos/tools/test-equipment.mjs、smoke-equipment.mjs；原战斗/出发准备夹具补齐新增知识或图纸前提，原行为断言保留；工具/浏览器套件登记和说明同步。

原工作区task120–122的种植、土壤、锄头修改保留；没有提交、推送或部署，没有删除玩家记录。

## 环境与实际验证

Node22.23.2/npm10.9.8、项目Python3.14 venv、官方Creator3.8.8；美术处理使用已捆绑Pillow12.3.0。首次独立快照登录shell误取Node25的失败记录保留，最终构建与测试均显式使用Node22。使用本任务独立SDK工作副本，原签名SDK未执行。

1. `npm run cocos:sync`、`npm run cocos:sources:write`、`COCOS_CREATOR=... npm run check`：217绑定、181PNG/7WebP、29共享模块、671来源文件、真实引擎严格类型通过。没有独立lint脚本，未杜撰lint命令。
2. `npm run cocos:test:unit`：25组工具/规则单元全部通过；报告output/cocos-unit/2026-10-22T15-25-19-983Z-363ba70d/result.json。
3. `npm run test:backend`：最终333项通过，保留既有Starlette/httpx弃用警告；最终日志output/cocos-weapons-123/backend-final.log。覆盖24件获取/打造/使用/保存、地区与库存拒绝、永久体力、特殊图纸、固定效果、实际远程碰撞、护具/仓储、空手阻止和并发图纸回执。
4. `REALQUEST_COCOS_BUILD=web-weapons-123 npm run cocos:build:release`：真实Creator release构建；对冻结源码验证，未改回执绕过检查。最终主工作区、独立候选与默认web-current运行源/载荷完全相同，见build-delivery.json和root-frozen-final.json。
5. 冻结目录中的 `npm run cocos:test:browser -- --build web-weapons-123/web-desktop --suite equipment`：最终run-3uW5ih完整6组通过，逐一执行18把武器真实攻击并确认实际持握PNG可见，购买/图纸丢回包/打造/快捷键/护具/城市研究/空手和Life输入通过，控制台错误0。首轮run-2NRU1s也完整通过，最终报价/入口调整后另跑，未拿首轮冒充最终。
6. 同命令 `--suite combat-experience,expedition-chain,inventory,inventory-preview,life`：run-ZwtYLz完整5套44组通过。普通100HP玩家用初始短剑真实移动/闪避击败160HP首领、精确首胜奖励、弱网预测与同请求重试、触控减少动态、实际走出工坊入洞、行囊播种/交易/拖放/持久化、跨日学习与输入隔离通过。
7. 最后修正灯坠菜汤成功文字后，最终333后端再次全过；同客户端最终服务端 `--suite combat-experience`：run-UZ0hDj完整15组通过。此前其余套件是该文字修正前同运行包的验证，未声称一次统一重跑37套。
8. `.../dependencies/python/bin/python3 tools/build_equipment_art.py --check`：24图逐字节重建通过。横屏补充脚本用独立QA服务/原生触控，实际验证63金币图纸、800金币+6晶屑研究及灯坠菜汤25HP/15体力一次恢复，共3组，截图与result.json在冻结output/layout-weapons-123/。
9. develop-web-game提供的动作客户端在ignored output复制适配：保留原脚本SHA，增加finally清理、真实引擎就绪、原生Canvas语义坐标点击、浏览器合成截图，未改技能源。两轮动作帧/状态与实际截图通过，控制台无错误，见冻结output/skill-weapons-123/；没有用清空WebGL缓冲的黑图当视觉通过。

中间失败如实保留：沙箱Creator/离线浏览器无法启动；构建期来源/导入元数据变化导致拒绝写当前回执，改为稳定快照实际重建；早期测试持有apply深拷贝后的陈旧引用，改为读最新状态，未改伤害断言；旧保存的特殊图纸恢复改为仅迁移时执行，避免失败操作额外改状态。补充帧脚本的就绪文件必须位于本项目output，首次被保护拒绝；后续DOM镜像不能接收指针，改按实际Canvas坐标操作。失败日志与前像均在output/cocos-weapons-123/和冻结output中。

## 交付、存档与清理

试玩继续使用 **http://127.0.0.1:5452/**、API8152、原output/farming-120/manual-preview.db与realquest_farming120 Cookie。接管前原5452进程已退出、端口预检空闲，未停止其他预览。已在线SQLite备份到output/cocos-weapons-123/save-before-preview/，启动/健康检查后原数据库9张表的模式和值哈希全部相同，见save-preservation.json；没有在原库执行自动化玩法。

最终源指纹`e9ea11d4324da457eb2116ff669ecb6bc5736beb4a7daeb8df9ab974661bbd69`，载荷`187ae68d94827f227885ded1622267f5a1f7a222eeb8f405297369901709798f`；默认与独立候选逐项相同。保留launcher85837/API85840/代理85841（会话59622）和人工预览页，供用户刷新试玩。原5453预览仍HTTP200。

79个已记录单元/自动化/测试服务PID退出，统一运行器确认所有已知浏览器进程组和服务子进程退出；补充脚本在finally关闭浏览器和服务，未发现本任务标记残留。本任务SDK副本和冻结library/temp缓存已删除，原SDK、源码、包与证据保留。共享MCP宿主的参数无法证明任务归属，保留以免终止其他聊天或依赖；未按名称批量结束进程。清理与保留项见cleanup-final.json，完整机器可读结果见verification.json。

剩余边界：玩家对实际美术/手感与数值节奏的反馈；完整全身服装动画、载具机甲、物理设备、系统IME/读屏、正式服务器/发布不在本轮自动验收。4种精密材料暂复用已有图标，24件装备本身均有独立新图。没有把自动化或概念源表当作玩家视觉批准。
