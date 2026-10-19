# Cocos 旅途偏好与重要提醒

接续task39 M9（2026-10-17）。前一轮task47为真实进展，已完成行囊候选/验证/同库预览和清理，画面复核仍待玩家；原聊天task48亦待反馈。全清单目标继续进行，不以本切片替代全部M/T/V条件。

视觉主张：沿用旅程菜单的木/纸材料，以一本小随身书页管理声音、动态、画面与提醒，避免表格和统计卡片；不将行囊或对话布局推广到此页。
内容顺序：旅程菜单→旅途偏好→明确当前设置/系统状态→主动更改/试听或进入全屏→返回原处；世界中的重要提醒只显示短入口，展开后可读规则和真实去处。
交互主张：开关立即反馈，声音仅在允许的用户动作后播放并能关闭；动态跟随系统或主动减少；全屏反映实际浏览器状态，失败可见，不自动恢复全屏；提醒只读，不移动/休息/领取或声称现实行为已验证。

计划：先实现可测试的可选设备偏好/音效适配和只读提醒；接入原生书页、菜单/F和生命周期；独立库验证持久化/旧偏好/存储失败/系统变化/触屏/声音节点/全屏成功失败退出/输入归属/提醒及数据不变，再构建并交付同源人工预览。

边界：原Web源码/源素材/规则/数据库保留；不新增音频素材、外部包、依赖、AI或平台账号。浏览器合成声音测试不等于人耳音质/实机验收。实际画面与所有未验证T/V项保持开放。


## 实施与行为边界

`shared/game/preferences.ts`将本机偏好与旅程数据分开；默认静音、动态跟随系统，可主动总是减少动态，系统要求减少时不会被覆盖。可读原Web两个布尔偏好但不改原键，新设置写独立版本键；坏数据与可选存储失败有明确提示，仍可在当前窗口使用。跨标签本机偏好同步不替换会话。

`experience.ts`使用原工程短合成音，真实用户动作后才启用AudioContext；脚步只在世界实际移动时，关闭/失焦停声，结束断开音频节点，销毁关闭Context。物品与奖励音只比较同一旅程待处理命令的权威结果，刷新/登录/拒绝不冒充奖励；正向物品是item音，XP或成长点增加是reward音，不捏造采集XP。F/原生按钮使用实际Fullscreen API，等待/拒绝/能力缺失可见，Esc先退出全屏，重开不自动进入。

`ui/preferences.ts`通过旅程菜单打开声音/动态/画面/提醒四张短书页，沿用原菜单的木纸书本方向；桌面菜单展示全部十项，短横屏继续分页。提醒由服务端时钟/恢复后的体力/未结算约定ready_at只读派生：夜深标床、低体力标休息处、约定时段已到打开原记录列表。不会移动、休息、验证行为或结算发点。桌面提醒位于顶部状态/菜单之间；短横屏远行状态复用原本地紧凑状态结构，提醒与任务、方向键/战斗操作分开。环境夜景表现仍属V4，不以时间文字当作昼夜画面验收。

改动包括Bootstrap生命周期/输入/声音和提醒、platform能力适配、原菜单与原生偏好页、同步/共用纯逻辑、独立单测及浏览器矩阵。原Web、源图、后端规则/迁移和真实玩家数据保留；未提交/推送/部署。具体最终包/测试命令/截图/录像/预览与清理在下节完成后补充。


## 可复现命令与最终证据

保持既有Node22.23.2、Python3.14.6、Creator3.8.8、npm/锁文件，依赖仍借用frontend安装（T3未关闭）。以下从仓库根目录运行；先备好backend/.venv与既有锁定依赖。

```sh
node clients/cocos/tools/sync.mjs
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
node clients/cocos/tools/test-preferences.mjs
node clients/cocos/tools/test-core.mjs
node clients/cocos/tools/test-features.mjs
node clients/cocos/tools/test-inventory.mjs
node clients/cocos/tools/test-dialogue.mjs
node clients/cocos/tools/check-baseline.mjs
REALQUEST_COCOS_BUILD=web-preferences-final COCOS_USER_DATA=/private/tmp/realquest-cocos-preferences COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/build.mjs web-desktop
backend/.venv/bin/python clients/cocos/tools/run-preview.py --build web-preferences-final/web-desktop --port 5446 --api-port 8146 --database output/cocos-preferences/test.db
# 待构建结束、服务就绪后，在另一终端：
node clients/cocos/tools/smoke-preferences.mjs
node clients/cocos/tools/smoke-preference-layout.mjs
REALQUEST_DIALOGUE_REVIEW=preferences node clients/cocos/tools/smoke-dialogue.mjs
REALQUEST_INVENTORY_REVIEW=preferences node clients/cocos/tools/smoke-inventory-preview.mjs
node output/cocos-preferences/frame-client-used.mjs --url http://127.0.0.1:5446 --actions-json '{"steps":[{"buttons":["enter"],"frames":1},{"buttons":[],"frames":3},{"buttons":["right"],"frames":6},{"buttons":[],"frames":4}]}' --iterations 2 --pause-ms 250 --screenshot-dir output/cocos-preferences/frame
```

- 最终`web-preferences-final/web-desktop`的真实Creator构建退出成功；106源/素材绑定和真实Cocos类型通过。新偏好/音频/全屏/只读提醒4组单测、核心17组、原物品/功能/逐句保护通过。390原文件及登记表/wrapper精确保护通过。原Web/后端规则本轮未改；未将历史Web构建或后端测试说成本轮重跑。
- **偏好主链11组/38图**：默认静音、实际AudioContext及声音节点生命周期、只在实际世界移动时脚步声、即刻静音；模拟系统媒体偏好实时变化、主动减少和重载；1920/1440/1024/844/740；真实浏览器全屏/F、长按重复抑制、进入等待时重复F无假提示、Esc保留当前页、外部退出/拒绝/重试；原EditBox与合成IME输入归属。三种提醒只标床或打开原约定记录、不扣物/休息/核验/发点；状态变化后入口消失。可选存储写失败/重载、跨标签同步、旧Web偏好键保持、DPR2减动态触屏/失焦静音/点击恢复、无音频/全屏能力的诚实禁用均通过。
- **自然新游客提示音链**：实际走到落枝，422失败无成功音；已提交但响应丢失时同ID重放只获3木材、播一次物品音。再实际进家/出门/到告示板，明确交付原安家任务，权威XP/奖励仅播一次奖励音。没有给自然链预置位置、物品或截止时间；采集不捏造XP。
- **布局矩阵1组/12图**：村庄、城市、山洞安全入口在1440/1024/844/740的真实HUD，任务/触控/战斗操作与提醒没有控件重叠。初期发现并修复桌面任务和短横屏方向键遮挡。位置/夜晚/低体力是专属库自己的显示夹具，不能当作自然远行、战斗、夜晚等待或完整玩法证明；城市/昼夜环境美术仍归V4。
- **聊天3组/9图、行囊边界4组/11图**在同一最终包重新通过：原附着回答/镜头/逐句与DPR2触屏；真实固定田地、拒绝与两次丢包同ID重连、晚移动/晚成功提交不抢Life。两个旧套件只增加明确的QA输出/库选择，原断言保留。
- 原技能帧客户端Cocos适配2轮/2图：实际Tab到减少动态、Enter改变设置、方向输入不移动偏好页下的旅人，物品不变；真实服务器时钟，无虚拟加速。总计**19组浏览器检查/72个独立截图名**，零意外页面/控制台错误。检查实际短书页、全屏等待、夜深/三提醒、城市740、洞穴740与键盘焦点截图。`output/cocos-preferences/build-info.json`保存最终源码/脚本/编译JS哈希与完整图名，四份result、smoke-final/layout/reader/inventory-regression日志、`preferences-flow.webm`与`frame/`保存证据。早期部分失败的测试脚本与v1–v4不替代最终结果。
- 人工5442/API8142已同库交付；1个实际玩家完整players行切换前后指纹一致，原库只读一致备份在`output/cocos-preferences/manual-before-preferences.db`，两个地址健康。没有自动操作用户标签/旅程或清除会话；人工新包见`handoff-result.json`，保留launcher47723/API47725/代理47726，session41016。
- 本轮18个旧候选/QA进程已确认退出，5446/8146释放；所有浏览器finally关闭，系统无残留headless，专用Node/Creator工作进程结束。用户原浏览器/标签和归属不明的共享Node/MCP工具保留，不做批量清理。`cleanup.json`记录PID、父子关系、启动参数与保留服务健康。

## 仍开放的条件

2026-10-17玩家答复“这轮可以保留”，确认范围为本轮偏好页、操作、音量与音色。M9功能及此次检查点已满足；M9总项据此勾选。此确认不覆盖task48聊天、task47行囊、其他游戏画面、物理设备或原Web退役。没有声称听到了headless浏览器的实际扬声器输出，也不把合成IME/模拟媒体查询/DPR2模拟当成实机验证。Safari/Firefox/Edge/iOS/Android、系统IME/系统媒体设置/辅助技术/缩放、长会话/弱网、完整夜景/远行与自然章回、实际存档/发布回退仍按V1–V7验证。T1–T6工具链待继续，当前仍是debug/source-map本地包，不是发布交付。原Web保留，尚无退役、提交、推送或部署批准。


## 玩家确认更新

2026-10-17：玩家对“旅程→旅途偏好”的操作、音量和音色反馈“这轮可以保留”。保留该实现。其余画面/实机/发布验收仍按task39开放项执行，不能把本轮确认扩展到未问及的场景。
