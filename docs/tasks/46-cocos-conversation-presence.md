# Cocos 现场对话与台词推进

2026-10-17，玩家明确反馈task45聊天仍像数据展示/PPT。本轮候选交付后，玩家进一步指出回答框位置奇怪、UI还可优化，继续修正见task48；不是视觉批准。此前功能验证保留，但视觉未批准；M7后移，先完成同一条交谈链的修正。

视觉主张：真实房间和相对而立的两个人成为主画面，底部只有一条紧凑台词，不再固定左右分栏。

内容顺序：走近并停步→镜头靠近两人→姓名与一句台词→主动继续→回答选择→原话题/委托/礼物。资料和规则由主动入口查看。

交互主张：短镜头过渡、逐字台词（可立即揭示）、读完才出现回答；鼠标/触屏/空格/E均可推进，减少动态时直接显示。动效只改呈现，不移动服务器人物、不伪造行走/讲话帧。

计划：原生Cocos读句状态与镜头聚焦；专属新构建/测试库验证读句、跳过、重绘/缩放、输入归属、返回/镜头恢复及原社交结算；实际截图检查桌面与短横屏。保留5442库、原Web和全部退役门槛。

参考：DESIGN 7.4a、task21获准方向与library-dialogue-concept-v1（仅参考，不代表本次Cocos已批准）；原有Hearthwood角色/室内图片，无新增资产。


## 实现与验证记录（进行中）

- Cocos原生对话收起常规HUD，以真实房间/当前旅人和实际NPC为现场。镜头只有呈现缩放/构图与相向帧，不改坐标/作息/碰撞/存档；退出恢复原镜头。桌面与短横屏分别安排完整人物和回复区，避免菜单/位置牌挡人。
- ui/dialogue.ts管理逐字、揭示整句、下一句、回答四个阶段；跳过不同时触发回答，时钟重绘保留进度，重排保留已读，减动态立即显示但仍主动继续。E/空格/台词触点/继续按钮推进；按住不反复跳句，焦点和IME沿用原输入归属。
- 底部单一台词面与独立回答菜单取代固定两栏；话题同样围绕现场选择。名字不在正文重复，原服务端熟悉度/体力结果单列为已确认反馈，不再作为最后一句角色台词。礼物/剧情/现实约定/小铺仍用原接口和原资格，没有新增台词/奖励/资产。
- 首轮镜头水平坐标出错，实机截图显示人物到边缘，已修正；随后截图又发现短横屏位置牌和回复菜单挡人，补了图形遮挡断言与按露出舞台宽度构图。初次读句用例误把“末句已读→展开回答”当失败，已改验不执行回答及数值不变；失败日志保留，不能当通过证据。

本轮无新图片/字体/音频/依赖，所有图仍是现有审计的Hearthwood资源；原Web代码/素材/规则全部保留。本次不拓展其他旧弹窗，完整退役目标仍开放。


## 文件与复现

本轮变更：`Bootstrap.ts`接对话镜头/相向、收起HUD、读句输入与镜头恢复；`ui/places.ts`重构台词/回答/话题；`ui/panels.ts`传Label、减动态与逐帧文字更新；新增`ui/dialogue.ts`纯读句状态/原数值反馈分离及Creator生成meta。没有修改世界状态协议或服务器动作。

测试：新增`test-dialogue.mjs`和`smoke-dialogue.mjs`；既有`smoke-neighbor-encounter.mjs`/`smoke-places.mjs`增加新专属目录与主动读完台词步骤。`package.json`加两条测试脚本。README、DESIGN、task39/45、review checklist与progress如实记录反馈/范围。

```sh
node clients/cocos/tools/sync.mjs
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
node clients/cocos/tools/test-dialogue.mjs
node clients/cocos/tools/test-core.mjs
node clients/cocos/tools/test-places.mjs
node clients/cocos/tools/test-guidance.mjs
node clients/cocos/tools/check-baseline.mjs
REALQUEST_COCOS_BUILD=web-conversation-reviewed COCOS_USER_DATA=/private/tmp/realquest-cocos-conversation COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/build.mjs web-desktop
python3 clients/cocos/tools/run-preview.py --build web-conversation-reviewed/web-desktop --port 5446 --api-port 8146 --database output/cocos-conversation/test.db
# 独立终端，构建完成且服务就绪后：
node clients/cocos/tools/smoke-dialogue.mjs
REALQUEST_CONVERSATION_REVIEW=1 node clients/cocos/tools/smoke-neighbor-encounter.mjs
REALQUEST_PLACES_REVIEW=conversation node clients/cocos/tools/smoke-places.mjs
```

工具沿用Node22.23.2、Creator3.8.8、现有npm/package-lock和backend/.venv Python3.14.6。测试固定5446/API8146和本轮test.db；自己创建新游客，reader夹具只设置该游客到早晨实际NPC附近，原状态不预置物品/奖励/截止时间。自然链无位置/余额/时段夹具。所有自动化浏览器在finally关闭。


## 最终证据与边界

- 独立最终包`web-conversation-reviewed/web-desktop`。Creator构建、92源绑定/真实类型、读句状态、核心17组、地点/原引导与391文件/既有抽取保护、diff检查通过。此轮没有后端/Web规则改动，不把历史后端232项说成本轮重跑。
- `reader-reviewed.log`/`reader-result.json`：3组9张，原生逐字/E重复抑制/带焦点空格、时钟重绘/重排、资料返回、镜头/移动恢复，1920/1440/740和DPR2减动态真实触屏；专门断言两个人不被回答控件遮挡。已打开检查实际桌面/短横屏图。
- `natural-reviewed.log`/`neighbor-result.json`：6组33张。新默认游客实际走路/过桥/进门/走近莉亚，读句后回应、原话题、实际种子赠礼只扣1份/熟悉度+1，长按/拖出取消、键盘/触屏和多视口；无位置/余额/deadline夹具。`neighbor-flow.webm`记录实际链。
- `places-reviewed.log`/`result.json`：8组63张，15图/地点、全部人物/完整作息、原话题/往事/每日帮助、真实五物件与拒绝/已提交丢包原单重放、过期会面、短横屏与DPR2。`places-flow.webm`及截图可复查。
- 技能原游戏帧客户端的Cocos适配执行2轮/2张：方向键不移动对话中的旅人，空格推进读句，真实时钟/合成截图，无错误文件；`frame-client-used.mjs`、`frame-result.json`保留复现。总计107个独立命名截图；早期失败日志/图片不计通过。最终源码/构建/测试SHA256见`build-info.json`。
- 使用现有Hearthwood角色、室内与图像；无新增图片/字体/音频/依赖。数值结果仅从原服务端已确认消息提取到反馈行，没有生成新的数值、对白、奖励或物品。
- 仍开放：本轮实际画面/手感复核、其他旧交互页面、物理设备/系统切后台/IME/读屏/原生文字缩放、其他浏览器和完整退役M7/M9/T/V。此前多次“需要调整”的反馈不会被自动化通过覆盖；原Web继续保留。

## 人工预览与收尾

5442/API8142已切到上述最终包，同一`output/cocos-data/local-preview.db`。停旧服务后只读一致备份，切换前后1个实际玩家的**完整player行**指纹相同；`handoff-before.json`/`handoff-result.json`记录备份、指纹与新服务200健康。没有重置玩家、代玩、导入任意数值或清空Cookie。

保留新launcher28744/API28746/代理28747、session60194供人工刷新复看，用户已有浏览器/标签保留。本轮未新建人工浏览器。原对照服务21626/21637–21639在收尾检查时已经退出，5430/5431/8130未监听；此轮未向这些PID发退出信号，外部原因未知，未擅自重新启动。原代码、构建和库保留，不声称这些旧服务仍健康。

旧候选14748/14750–14751和本轮各测试预览20488/20491–20492、22913/22915–22916、23982/23984–23985、26948/26950–26951、28265/28267–28268已正常退出；5446/8146释放。自动化浏览器finally关闭，测试Node/Creator工序均终止；归属不明/共享工具宿主保留，未批量杀进程。最终进程/端口核验见`cleanup.json`。

本轮是聊天候选修正，不是全界面批准或原Web退役批准；完整推进目标仍开放。
