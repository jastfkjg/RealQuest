# 铁匠柜台与独立锻造工作台

用户授权（2026-10-23）：认可 `docs/art/references/workshop-counter-preview-v1/preview.png`，要求按图实现，新增专门铁匠 NPC 负责武器与图纸买卖，工作台仅负责打造。

## 实现计划

1. 村庄工坊新增独立铁匠交互对象；原 `armory_counter` 稳定 ID 与位置保留为锻造工作台。服务器分开校验交易与打造地点，保留存档、价格、永久图纸与装备规则。
2. 原生 Cocos 柜台匹配已批准概念：店招与铁匠、成品/图纸/出售、4×2实物武器架、右侧详情与图纸签、底部报价确认；短横屏采用清晰分页。
3. 生成原创无字工坊环境和独立铁匠美术，复用已审计装备/纸木材料；记录原图、提示词、确定性处理、哈希与绑定，不把概念文字烘焙进运行资源。
4. 小型确定性后端/模型检查，真实 Creator 构建与浏览器交易/打造/失败重试/桌面横屏验证；逐张查看实际截图，记录差异并清理自有工具。

视觉目标：暖石墙、深木货架与苔绿布衬，物品优先，纸签短而清楚。内容顺序：铁匠身份 → 陈列 → 所选装备详情 → 一次交易确认。交互沿用共享悬停/按压/焦点反馈；点选只更新详情，资源变更等待权威回执，减少动态偏好保持有效。

## 工作区与范围

开始时有建造/加工设施相关未提交改动，基线保存在 `output/blacksmith-counter/baseline/`，增量接入并保留。Node22.23.2/npm10.9.8，Python后端venv，Creator3.8.8。无表迁移、价格变化、付费素材、提交、推送或部署。村庄为本次视觉切片，既有城市研究/精密材料功能保留。

## 进度与验证

已实现并通过固定来源的最终构建、后端与实际浏览器验证；运行画面等待用户反馈。

### 已完成的行为

- `backend/app/world.py` 在工坊增加 `blacksmith`（阿焰）服务NPC，保留原 `armory_counter` 为锻造工作台；两者相距96世界单位，服务器交互半径72，不能站在一处远程使用另一处。
- `backend/app/equipment.py` 返回交易/打造两个目标并校验实际位置；成品购买/装备出售支持1–99件，保留旧客户端不传数量时的1件语义。价格、使用能力、永久图纸和存档ID不变；买武器不自动装备，卖完最后一件自动卸下，图纸不因打造而消耗。
- `shared/game/{protocol,interaction,navigation,villageIntro,nextDeparture,inventory,items,places}.ts` 更新动作和目标文案。首次购武备去铁匠，初探复盘仍在工作台；标记不瞬移。
- Cocos `ui/blacksmith.ts`、`blacksmithModel.ts` 实现独立柜台，`expeditionGear.ts` 的 `forge` 页面只确认图纸/材料并打造。`panels.ts`、`Bootstrap.ts` 接入静态NPC、资源加载、纸木按钮和原生输入。货架是真实在售商品，未持有不会伪造为库存；短横屏分页和完整条件页保留信息。
- 村庄既有菜汤在次级补给页继续售卖，城市精密工坊原研究/材料/打造入口保留。

### 原创素材与复现

`assets/generated/hearthwood/blacksmith-v1/` 保存无字环境、透明人物原图、展示托架与准确提示词。`assets/derived/blacksmith-v1/` 保存头像、静态全身像和托架派生图。`tools/build_blacksmith_art.py` 的裁切/alpha阈值/最近邻缩放可逐字节重建，来源、尺寸、哈希与4个绑定见 `docs/art/blacksmith-art-v1.json`。复用已有装备、纸木和布袋资源；没有外部下载、付费、字体复制或烘焙中文。NPC没有宣称动画、作息或社交剧情。

### 已取得的证据

- 后端（工作目录 `backend`）：`.venv/bin/python -m pytest -q`，445 passed，1条既有Starlette依赖弃用警告；日志 `output/blacksmith-counter/backend-final.log`。包括13项铁匠目标/距离、数量有效性、准确费用、最后一件卸下和失败资源守恒检查。
- Node22：`node tools/cocos-unit.mjs`，33组全部通过，含铁匠报价/目录模型；回执 `output/cocos-unit/2026-10-23T04-04-19-827Z-9fc86954/result.json`。
- `node clients/cocos/tools/sync.mjs`、`node tools/cocos-sources.mjs --write` 和带官方3.8.8 `COCOS_CREATOR` 的 `node clients/cocos/tools/check.mjs`：300来源绑定、877输入文件与真实Cocos类型通过。生成副本由同步工具管理。
- `/Users/zilong/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 tools/build_blacksmith_art.py --check`：3派生PNG与清单逐字节通过。
- 初轮真实Creator检查在独立源码快照 `output/cocos-toolchain/clean-source-2lgxCC`，避免其他任务同时更新运行文件。第一次素材导入更新元数据，构建工具正确拒绝过期回执；稳定源重建成功，没有伪造或改写回执。
- v2专项 `run-15F6aa` 的铁匠5组/36图通过，包含422失败守恒、已提交但丢失响应的相同请求重放、批量购买、真实走动到另一工作台打造、出售二次确认/卸下、刷新持久化、五尺寸、保留菜汤与零意外控制台错误。截图已直接查看，1024顶部问候签与余额重叠随后在最终版修正。
- 同轮旧装备脚本在844横屏寻找已改为循环分类的 `filter-magic` 而失败；已适配实际 `smith-filter` 控件后重跑。此前三组购买/图纸/打造、快捷切换、能力门槛/独立装备槽已执行通过；该失败不记为整套通过。
- 游戏开发技能的原始帧驱动客户端由任务输出中的适配脚本调用，使用实际Cocos `advanceTime`、独立新档位置夹具、20银真实买8银图纸与完整页面截图。`output/blacksmith-counter/skill/shot-0.png` 已查看；浏览器和服务退出证明分别为 `skill-browser-cleanup.json` 与 `skill-service-cleanup.json`。这不是角色数据或资源注入，也没有替换技能原文件。

所有QA位置/资金/能力夹具均使用带ownership校验的新建测试数据库，不接触用户档；不把布置夹具描述为自然成长。旧guidance/quest-chain/landscape/story脚本中的服务入口已按新契约调整并通过语法检查，未据此声称全主线重跑。


### 最终来源与并行任务边界

主工作区的最终客户端 `web-blacksmith-v3` 正式构建成功，铁匠5组/36图通过；但运行 `run-qeJsR4` 期间，另一项task130工具/资源开发修改了 `equipment.py`、`farming.py`、`main.py`、`rules.py`、`world.py`，新客登录返回500，来源检查也正确拒绝整轮通过。该运行不记为最终整体验收；所有自有服务子进程已退出。没有回滚或修补另一任务的进行中改动。

最终验收与人工预览使用 `output/cocos-toolchain/clean-source-2lgxCC` 的独立稳定源码，包含本轮最终 `blacksmith.ts`、`blacksmithModel.ts`、`expeditionGear.ts`（与主工作区逐字节相同）及开始时的建造/加工改动，不包含进行中的task130。独立副本的后端445项再次通过（34.01秒），真实Creator3.8.8最终构建、300绑定/877输入/类型与美术复现检查均通过。并行开发完成后的全工作区集成仍由其最终构建验证，不把本轮证据冒充未完成工具系统的通过记录。

实际画面快捷入口：`output/blacksmith-counter/final/browse-1440.png`、`diagram-1440.png`、`blacksmith-world.png`、`forge-1440.png`、`browse-1024-funded.png`、`browse-740-funded.png`。均是原始Cocos截图副本，无后期修改。1440、1024和740原图已直接查看，1024问候/余额碰撞与短横屏交易提示重叠已修正。

人工试玩保留 http://127.0.0.1:5486 ，API8186，独立新档 `output/blacksmith-counter/manual-preview.db`，cookie `rq_blacksmith_preview`。服务从稳定副本运行，无测试资源注入，初始角色按正常新游戏流程创建；进入工坊，阿焰在右上、锻造铁砧在右下。ready/日志位于稳定副本 `output/blacksmith-counter/manual-ready.json`、`manual-service.log`。该保留仅用于玩家实际预览，不迁移或覆盖原进度。

### 最终验收与清理结果

- 稳定副本命令：`PATH=/Users/zilong/.nvm/versions/node/v22.23.2/bin:$PATH node tools/cocos-browser.mjs --build web-blacksmith-v3/web-desktop --suite blacksmith,equipment,expedition-chain --continue-on-failure`。最终 `run-SHynoq` 三套全部通过，共16组/99张截图；铁匠5组36图、装备6组30图、出发链5组33图。构建来源/载荷与后端源哈希、测试脚本哈希、日志、录像、生命周期证据均在该运行目录。根目录便捷回执为 `output/blacksmith-counter/browser-result-final.json`。
- 验证包含独立NPC/工作台、20银不足24银报价、图纸422失败及已提交丢回复重试、批量购买/出售最后装备、永久图纸、实际走动打造、刷新持久化、桌面1920/1440/1024与横屏844/740、城市研究/材料、18种实际武器攻击、现实模式输入隔离、装备与山洞进退。不存在意外控制台错误。对本轮铁匠的五尺寸代表截图、图纸与打造页直接复核，不将99张图的存在等同于每一页的主观验收。
- `output/blacksmith-counter/cleanup-final.json` 核对81个有记录的测试PID全部退出；各套浏览器与服务子进程退出，临时Creator SDK副本已移除，原官方SDK/共享配置保留。没有创建node_repl或npm/npx后台会话。仅保留本次5486/8186人工试玩（PID21554，子进程21566/21567）；原5478其他任务预览未动，两者健康检查均200。未创建或保留自动化浏览器；Codex浏览器面板已排队打开供人工预览。
- 源码、图像、测试、文档已落入主工作区，保留其他任务修改；无提交、推送、部署、用户档重置、外部消息或购买操作。实际主工作区与同时进行的task130最终合并验证、系统IME/读屏/物理手机、玩家主观画面与手感仍不冒充已验收。本次独立驻店NPC无作息/社交剧情，城市页面未推广新视觉。
