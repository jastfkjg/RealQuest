# 人物工具握持与动作修正

2026-10-24用户截图反馈：斧/镐横向伸得过长，像贴在身边而没有握在手中。目标是贴身待机、手掌固定握柄、行走同步、四向正确遮挡和自然的作业弧线；锄头/斧头/十字镐/水壶一起校正。沿用既有16工具与6角色源图，无新增或修改位图、字体和经济/劳动规则。

短计划：校正真实握点和世界比例→工具/手套分层、与人物脚底轴共享倾斜→四向待机/行走/作业实机检查→完整工具劳动回归→发布并验证默认5443、保留原玩家库与快捷栏。UI/UX流程只采用空间连续性与减少动态效果建议，不改变Hearthwood构图。

已完成并同步默认入口 `http://127.0.0.1:5443/`。起点源码快照：`output/tool-hold-polish/baseline.json`；候选：`output/tool-hold-polish/candidate.json`。开发者已检查实际画面，玩家主观视觉/手感认可仍待反馈。

## 实现与素材

- `clients/cocos/assets/scripts/toolView.ts`：锄头/斧/镐/壶分别使用24/22/24/18世界单位，依据原96px源图的真实握点绑定；待机改为腿侧垂握。工具柄、角色、手套独立分层，背面手套随角色遮挡；工具与手臂共享脚底轴和身体倾斜，消除悬空握持。行走跟随原角色7Hz步态，停步立即静止；蓄力、接触、随挥、收势围绕手腕旋转，减少动态时关闭额外晃动/倾斜。
- `clients/cocos/assets/scripts/Bootstrap.ts`：传入实际位移和统一倾斜；工具操作、体力、升级、物品及服务端存档规则未改动。
- 新增 `clients/cocos/tools/smoke-tool-art.mjs`，在 `tools/cocos-browser-suites.mjs` 注册 `tool-art`；更新 `DESIGN.md`、`docs/art/ASSET_PLAN.md`、`docs/art/asset-manifest.json`、来源清单与验收记录。
- 沿用task130的16张工具和6张角色源PNG，未修改位图/字体、未下载或生成新素材。源文件与许可沿用资产清单 `tools_and_resources_v1`，本次只补充 `held_pose_revision` 的握点、尺寸与层次元数据。

## 验证与证据

运行环境：Node22.23.2/npm10、既有Python3.14虚拟环境、官方Creator3.8.8。构建在冻结源码 `output/cocos-toolchain/clean-source-edqmaR` 进行，使用专用Creator克隆避免污染共享SDK，完成后已清理克隆与编辑器缓存。

| 命令/范围 | 实际结果 |
| --- | --- |
| `npm run cocos:sources:write`；`node tools/cocos-sources.mjs --check` | 963文件、337绑定、293PNG、7WebP、37共享模块、81场景输入通过 |
| `COCOS_CREATOR=<官方3.8.8程序> npm run cocos:check` | 实际Creator类型通过，`output/tool-hold-polish/types-final.log` |
| `REALQUEST_COCOS_BUILD=web-tool-hold-polish COCOS_CREATOR=<专用官方克隆> COCOS_USER_DATA=/private/tmp/realquest-tool-hold-polish node clients/cocos/tools/build.mjs web-desktop --release` | 正式release成功；`output/tool-hold-polish/build-1.log` |
| `node tools/cocos-unit.mjs --only tools,local-scene,inventory --report output/tool-hold-polish/unit/result.json` | 相关3模块通过 |
| 候选中 `node tools/cocos-browser.mjs --build web-tool-hold-polish/web-desktop --suite tool-art` | `run-ses2bw`：4组、73图、控制台错误0；四工具×四档×四向、行走停步、六角色、740×360横屏及减少动态 |
| 同候选 `node tools/cocos-browser.mjs --build web-tool-hold-polish/web-desktop --suite tools` | `run-scU6aj`：11组、32图、控制台错误0；连续砍树/树桩/采石/铜铁矿、等级限制、真实材料升级、播种/浇水/补水/范围、失败与丢回复、持久化、失焦取消及实际DPR2触控 |
| `node output/tool-hold-polish/frame-client.mjs --url http://127.0.0.1:5507 --actions-file output/tool-hold-polish/frame-actions.json --iterations 1 --screenshot-dir output/tool-hold-polish/frame-final` | 技能提供的帧脚本成功；只沿用就绪等待、finally关闭和WebGL合成器截图适配。实看 `shot-0.png` 与文本状态，十字镐正确垂握 |
| `git diff --check`；`verifyBuild(web-current/web-desktop)`；5443实际收据/API | 全部通过，`output/tool-hold-polish/default-entry-verified.json` |

两套浏览器结果分别位于冻结源码的 `output/cocos-regression/run-ses2bw/result.json` 和 `run-scU6aj/result.json`，合计15组/105图。姿态专项最后一组使用触控布局但鼠标选取；实际触屏输入证据来自完整 `tools` 专项，未混称。早期 `art-browser-1.log` 在构建完成前被收据检查拒绝，未启动测试服务或浏览器；不计为通过。未改后端，本轮未重跑全469后端或全部世界专项。

已直接查看四向斧/镐、多档锄/壶、六角色代表姿态、短横屏、减少动态、实际劳动接触以及帧脚本画面。默认5443在用户原Chrome和原存档实见新版斧/镐，原图为 `output/tool-hold-polish/5443-axe.png`，细节为 `5443-axe-detail.png` / `5443-pickaxe-detail.png`。没有将截图存在等同于视觉通过。

## 默认交付与清理

候选与根工作区运行源码逐字核对后提升为 `clients/cocos/web-current/web-desktop`，实际5443响应与当前源码/包均一致：

- source：`bcec724d7066c27677dbecb318eddf917c3353c8c46f22e373e69654536dd3fe`
- payload：`eec92d41aa2fb3080320591eba3c204894ffdc21d2e7be93460177f755b33781`

原默认包保存在 `output/tool-hold-polish/default-build-before`，在线SQLite备份为 `player-before-publish.db`。不重启原服务、不重置数据：发布前后两名玩家库存逐项相同；原用户快捷5锄/6斧/7镐/8空保留，检查后恢复原手持锄头，未执行劳动/购买。世界时钟正常推进，不声称整个数据库逐字不变。

两套测试浏览器均finally正常关闭、临时profile消失、QA服务子进程退出；帧测试5507/8207已定向停止。核验16个记录测试PID全部退出，专用Creator克隆及候选library/temp/profiles已删除，CUA连接已释放而用户Chrome/标签保留。`cleanup-audit.json`、`frame-cleanup.json`、`cache-cleanup.json` 与 `final-verification.json` 汇总证据。仅保留原5443/8143服务（PID6506/6538/6539）用于人工体验；其他任务和共享宿主未动。

物理设备、原生IME/读屏、玩家实际观感/手感仍未验收。本次未提交、推送或外部部署。
