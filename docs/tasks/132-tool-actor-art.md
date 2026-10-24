# 工具专用人物动作美术

2026-10-24 用户再次指出task131的工具仍像挂件，要求必要时单独设计人物持握及使用工具的美术、参考武器实现。已完成全身姿态替换并发布默认 `http://127.0.0.1:5443/`；开发者检查完成，玩家主观美术与手感认可仍待反馈。

原短计划：审计剑动作与六人物→生成/实看专用姿态→可重建图集与运行绑定→实际Cocos动作/劳动/武器回归→保留玩家库并发布5443。使用内置imagegen、develop-web-game及ui-ux-pro-max；后者仅采用动作连续性和减少动态建议。原工作树其他改动均保留，起点 `output/tool-poses-132/baseline.json`。

## 最终实现

- 新增 `clients/cocos/assets/scripts/toolActor.ts`：四工具×六外观各有专用全身动作图集；四朝向、准备握持、起手、接触、随挥、恢复与行走关键帧。双手、握柄、屈肘、转肩和弯腰实际画在同一人物帧中。工作仍使用原480ms节拍和服务端接触结算；减少动态保留固定工作姿态，停步回到握持帧。
- `Bootstrap.ts`：参照既有剑动作在Player节点换完整精灵帧，脚底与原玩家位置一致。人物可见高度保持36世界单位；112px透明动作画布以2/3比例显示，脚底锚点(56,96)。收起工具恢复原空手图，武器和骑乘保持原流程。
- `toolView.ts`：移除旧工具、原生胳膊和手套叠层，继续负责原资源变化、接触粒子与种子包。没有新增劳动、体力、经济或存档规则。
- `clients/cocos/tools/sync.mjs`、`tools/cocos-sources.mjs`、`tools/cocos-unit.mjs`：接入图集、来源与专项。新增 `test-tool-poses.mjs`；更新 `smoke-tool-art.mjs`；剑专项的直接入洞夹具补上真实入洞会选择的手持武器，避免只改equipped造成错误前提。
- 规范与来源同步更新：`DESIGN.md`、`docs/art/ASSET_PLAN.md`、`asset-manifest.json`、`tool-actor-art-v1.json`、Cocos绑定/来源清单及验收记录。

## 美术与来源

内置imagegen生成24张原创1536×1024透明源表，准确提示词同名保存在 `assets/generated/hearthwood/tool-poses-v1/`。仅以现有项目原创六人物、四基础工具和已接受的剑动作风格作参考；无第三方下载、字体或付费素材。生成结果对应关系为 `output/tool-poses-132/generation-records.json`。

`tools/build_tool_actor_art.py` 使用alpha阈值、实际连通轮廓（包括超出名义格子的完整工具）、靴底支撑点、统一站立高度和最近邻处理，输出 `assets/derived/tool-poses-v1/` 的24张672×448图集，共576槽、2,480,654字节。Python没有新画动作、拼手臂或改写源图。原始源表不进入运行包；具体源/结果/脚本/提示词哈希、裁切和脚点在 `docs/art/tool-actor-art-v1.json`。

源图并非每帧都适用：举过头顶的水壶起手不绑定，使用有效直立收回姿态；四个漏工具的行走格使用有效握持过渡；银发斧头正面随挥缺刃，采用完整接触帧，西向使用有效东向整个人物帧由Cocos镜像。另生成一张定向修正草稿仍未解决朝向/步态，原图和提示词保存在 `docs/art/references/tool-poses-v1/axe4-repair-draft.*`，明确不进入运行。没有把重复槽或镜像宣称为独立绘制的全套高帧率动画。

升级档位共享全身动作与工具几何；真实等级、名称、功能和原16个独立工具图标保留。新版全身图中的金属没有分别重绘四档材质，这是当前美术范围的限制。原矿石/树木阶段图与剑图未修改。源风格参考不等于玩家批准新版动作。

## 验证

实际环境：Node22.23.2/npm10，既有Python虚拟环境，官方Creator3.8.8。冻结候选 `output/cocos-toolchain/clean-source-CftKVt`；构建使用本任务专用官方SDK克隆，完成后已删除。

| 命令/检查 | 结果与证据 |
| --- | --- |
| `python3 tools/build_tool_actor_art.py --check` | 24图集/576槽及来源逐字节复现，`output/tool-poses-132/art-rebuild-check.log` |
| `npm run cocos:sync`、`npm run cocos:sources:write`、`npm run cocos:check`（指定官方COCOS_CREATOR） | 361绑定、317PNG、7WebP、37共享模块、81场景输入、1065来源；实际引擎类型通过，`types-final.log` |
| `node tools/cocos-unit.mjs --only tool-poses,tools,local-scene,inventory,sword-motion --report output/tool-poses-132/unit-final/result.json` | 5相关模块通过；覆盖动作终止、换工具/外观、持有条件、骑乘/洞穴排除、步态、减少动态、原规则 |
| 候选中 `REALQUEST_COCOS_BUILD=web-tool-poses COCOS_CREATOR=<专用官方克隆> COCOS_USER_DATA=/private/tmp/realquest-tool-poses-132 node clients/cocos/tools/build.mjs web-desktop --release` | 第二次release成功，`build-2.log`；第一次官方导入给24张新图补全meta，收据按设计拒绝来源漂移。冻结官方meta后重建，未将第一次计为有效发布 |
| `node tools/cocos-browser.mjs --build web-tool-poses/web-desktop --suite tool-art` | `run-Rz1EQS`：5组/113图，六外观×四工具×四方向、四档、步态停步、收起/种子恢复、740×360及减少动态 |
| 同包 `--suite tools` | `run-qqsoJq`：11组/32图；实际连续砍树/树桩/采石/铜铁矿、门槛、升级、播种/浇水/补水/范围、体力、丢回复幂等、持久化、失焦/Life取消、DPR2触控 |
| 同包 `--suite sword-motion` | `run-YrLql8`：12组/26图；原剑四向动作/伤害、步态、闪避、延迟/拒绝、输入归属、五尺寸和触控，以及其他武器/人物范围 |
| 提供的帧客户端 | `node output/tool-poses-132/frame-client.mjs --url http://127.0.0.1:5508 --actions-file output/tool-poses-132/frame-actions.json --iterations 1 --screenshot-dir output/tool-poses-132/frame-final` 退出0；实看截图和文本状态，十字镐整个人物帧正确。沿用技能脚本的加载等待、finally关闭和WebGL合成器截图适配 |
| `git diff --check`；默认包verifyBuild；实际5443收据/API | 通过，`default-entry-verified.json` |

最终三套浏览器合计28组/171图、错误0。同一运行来源指纹及包指纹，测试源码哈希各自保留。早期姿态 `run-z1EJOO` 在行走时跨两帧读取了状态和图集矩形，造成误报；改为同一浏览器求值读取后完整重跑，失败轮未混算通过。后端规则未改，本轮没有重跑全部后端或全部世界专项。

已直接查看源表、归一化图、四工具代表姿态、多个外观、实际劳动截图、默认5443和帧客户端画面。代表最终截图在三套成功运行目录内，包含 `appearance0-axe-dir2.png`、`appearance0-pickaxe-dir2.png`、`appearance4-axe-dir2.png`、`landscape-axe.png`、`reduced-motion-pickaxe.png`；完整工作与剑的WebM保留于各套目录。

## 默认5443、原存档与清理

候选校验后将包提升 `clients/cocos/web-current/web-desktop`，旧默认包保留为 `output/tool-poses-132/default-build-before`。当前源码/正式包/实际5443响应一致：

- source：`c39bae2ce93a0738fa72d3a606328a57a3c57070b66bd391142f00c262513682`
- payload：`c8d8265a3d53aa19d9f3ea41e47dffb3ba456cc176250c2c487b691fd9f6f8a7`

发布时发现原5443/8143进程（6506/6538/6539）已全部退出且端口空闲；按原 `output/cocos-local/local-preview.db`、`realquest_cocos`、5443/8143配置恢复默认服务。新PID57646及子进程57680/57681留供人工体验。恢复命令完整记录在 `default-ready.json`、`default-service.log`，没有切换到QA库。

原库在线备份 `player-before-publish.db`，发布前后两名玩家库存逐项相同，原快捷1种子/5锄/6斧/7镐/8空及手持斧保留。用户原游戏标签已自行关闭，使用原Chrome同一凭证新开5443并“继续旅程”，实际回到原林间小屋、原角色与新版斧头，整图 `output/tool-poses-132/5443-axe.png`。没有执行劳动或购买；人工预览中正常游戏时钟会推进，不声称整个存档字节、时钟或生命/体力不变。

末尾补拍裁切图时，浏览器自动审批超时（未判定不安全），未绕过；保留已取得的默认整图与完整候选证据。为避免预览继续走时，主动关闭本任务新建标签139944923，并核实已消失；中断时自动关闭的139944919不再保留。未关闭用户其他Chrome标签/浏览器。CUA连接在最后观察后释放。

成功与失败回归的浏览器均finally退出，4个临时profile消失，33个记录测试PID退出；帧QA5508/8208已停止，专用SDK/候选library/temp/profiles已删，完整证明 `cleanup.json`、`frame-cleanup.json`。仅保留默认5443/8143服务；其他任务与共享宿主未动。物理设备、原生IME/读屏及玩家最终视觉/手感认可未推定通过。未提交、推送或外部部署。
