# Cocos 找人到交谈：第二轮玩家反馈修正

2026-10-17 最新玩家验收：在5442现有试玩复核后，玩家确认“这三处都可以保留”，范围为当前地图与找村民、底部交谈回答、行囊四格。此前task49偏好页/操作/音量音色的确认继续有效。以下早期拒绝与待复核记录保留为迭代历史，以本段为当前范围；不扩大到其他画面、战斗/远行手感、实机或原Web退役。

2026-10-17，本地功能修正已验证，但玩家明确拒绝本轮聊天视觉：“还是感觉没有游戏感觉（现在有点偏数据展示或ppt的感觉）”。继续修正见task46；本轮不算视觉批准。用户再次拒绝地图/手记/对话候选：找不到NPC，若干页面与按钮仍像数据展示，缺少游戏感。先处理找人→实际走近/进门→交谈/话题/心意这一条链，M7暂缓；不把未批准样式推广到其他页面，不改变存档、作息、社交资格或结算。

视觉主张：让真实场景与人物占主要画面，低位台词面配有方向性的回答选项；资料只在主动查看时展开，保持Hearthwood纸/木/苔绿和已有角色图。

内容顺序：世界HUD可见的村民头像入口→单人位置与明确的找人动作→持续可辨的下一门口和真人姓名→台词、回复选择与实际物品赠送。界面围绕“找谁、去哪里、说什么、送哪件”，不默认展开关系/报价/规则报告。

交互主张：头像/回答行有克制的悬停与按压；对话以台词推进，选择回答进入下一段；所有动态尊重减少动态偏好，触点至少44px。实际世界/存档与服务器原动作继续为准。

当前证据：用户IAB5442标签页仍显示早期欢迎画面；仅执行安全刷新后已确认载入现旅人登记候选，未在用户旅程内移动或结算。当前手工旅程位于村庄南侧、游戏早晨，村民按原作息在室内。现有地图默认只分页显示部分路标，世界缺少直接找人入口，短横屏标记没有目的地文字，确实不易找人。

计划：补直接找人/世界身份/下一门口；把交谈、话题和礼物改为角色场景中的行动选择；在独立构建/数据库验证找人实际步行和室内到场、长中文/每日限制/拒绝重试、桌面与短横屏截图。保留5442现有库和原Web，最终再交玩家复核。


## 已实现的链路

- 世界右上角是三位村民的头像/姓名，按N同样可找人。先看真人当前位置和一句去处说明；跨房间只标真实门口，短横屏也持续显示进门/出口提示；同房间明确选择“走近…聊两句”才沿原寻路实际走近并发送原talk命令。没有传送或把室内NPC摆到室外。世界真人头顶显示固定屏幕字号的姓名。
- 对话以当前真实场景为背景，低位台词面、人物像/姓名和右侧回答行组成；剧情、诺亚现实约定、米拉小铺仍可进入原功能。长台词继续分页，短台词不放一整排禁用按钮。关系/作息留在主动查看的资料入口。
- 四个话题是自然回答选项；礼物是五件已有实物图的选择托盘，真实数量、消耗1份、熟悉度结果与每日上限保留。帮助、资格不足、会面失效和丢包原单重试继续由原服务器验证。
- 头像按钮保留语义名称，不把名称叠印在图片后；回答行有悬停、键盘焦点和按压状态。测试发现按住控件跨时钟重绘会丢失松手操作，已保留活动手势目标到释放/取消；方向盘沿用稳定节点，继续更新HUD并可持续按住。减动态偏好保留直接状态反馈，去掉按压位移。
- 本地静态预览加no-store，减少切换候选时继续引用旧页面资源；无服务端游戏规则、API或迁移变更。用户原标签页仅安全刷新，没有代操作旅程。

## 文件与复现

`shared/game/places.ts`增加只读neighborRoute，原同步生成core；`ui/places.ts`的找人/低位交谈/选项/物件赠送替换旧的重复对话实现；`ui/panels.ts`委派；`Bootstrap.ts`接头像/N、实际走近、姓名、下一门口和手势生命周期；`serve.py`只调整本地静态缓存头。`test-places.mjs`扩展真实门口/只读断言，`smoke-neighbor-encounter.mjs`新增自然链和手势回归，原smoke-places支持专属输出目录。原Web文件完全保留。

沿用Node22.23.2、Creator3.8.8、既有npm/package-lock及Python3.14.6：

```sh
node clients/cocos/tools/sync.mjs
node clients/cocos/tools/test-places.mjs
node clients/cocos/tools/test-core.mjs
node clients/cocos/tools/test-guidance.mjs
node clients/cocos/tools/check-baseline.mjs
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
REALQUEST_COCOS_BUILD=web-neighbor-encounter-final COCOS_USER_DATA=/private/tmp/realquest-cocos-neighbor-encounter COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/build.mjs web-desktop
python3 clients/cocos/tools/run-preview.py --build web-neighbor-encounter-final/web-desktop --port 5446 --api-port 8146 --database output/cocos-neighbor-encounter/test.db
# 构建完成、测试服务就绪后，另一个终端：
REALQUEST_PLACES_REVIEW=neighbor-encounter node clients/cocos/tools/smoke-places.mjs
node clients/cocos/tools/smoke-neighbor-encounter.mjs
```

Cocos目录另有`npm run test:neighbor-browser`。所有测试强制5446/专属test.db，只操作自己新建的游客，finally关闭专用浏览器/上下文；不使用5442手工库。

## 验证及边界

主流程8组/63张通过，覆盖15图/原报价、只读不变、完整作息/话题/长回复、赠礼拒绝/已提交丢包单次消费、每日帮助/往事/过期会面、五视口和DPR2触屏。自然找人链以全新默认旅程真实走小路、过桥、到门口按进入，再在图书馆沿原寻路走近莉亚，实际交谈/送出一份种子，没有预置位置/余额/时段/deadline。其额外矩阵包括回答hover/press/keyboard、跨1.25s重绘长按、赠礼拖出取消、Life入口长按与原方向盘持续按住/松手。最终自然链5组/31张通过，含方向盘持续按住/松手和赠礼取消；与主矩阵截图使用不同前缀，无同名覆盖。

测试中的第一处地面点击误落在真实落枝上，脚本如实失败后改为绕开物件；点击交互锚点会停在门前，随后使用实际可见的“进入”动作。没有为截图修改玩家位置或把失败当成功。已亲自检查桌面/740px对话、话题、物件托盘、NPC姓名和找人图。

仍开放：用户本轮画面/手感复核、其他未重做的旧交互页、实际系统/标签后台、物理设备/IME/读屏/原生缩放、其他目标浏览器、完整自然成长战斗节奏、M7/M9及T/V退役门槛。不以本地单条自然链证明完整退役；继续保留原Web和手工旅程。


## 最终证据和收尾

- 独立最终包为`web-neighbor-encounter-final/web-desktop`。原包在验证期间保持不变；最终仅对找人/交谈/话题/礼物调轻遮罩，让真实角色/场景保持可见。最终包重新通过主矩阵8组/63张和自然链5组/31张，共94个独立截图名、无意外浏览器错误。实际打开检查最新明亮场景、图书馆真人/姓名、回答行、礼物托盘和740px/DPR2图片。
- supplied游戏帧客户端使用原脚本的Cocos适配，实际时钟/合成截图/finally关闭；找人页与世界各2轮，4张截图。前者Right输入不移动，后者正常移动。使用的静态适配源保存在`output/cocos-neighbor-encounter/frame-client-used.mjs`供复现；没有后台浏览器/Node工作进程。
- Creator3.8.8真实最终构建/92源绑定/真实类型通过；地点/真实门口/只读/作息/社交限制、核心17组、原引导、391原文件及既有抽取保护通过。`build-info.json`记录最终源、构建及测试文件SHA256；`result.json`、`neighbor-result.json`、`final-browser.log`、`final-neighbor.log`和两段各自录像可追溯。无新图片/字体/音频/依赖。本轮未改后端规则/Web代码，也不把旧232后端测试或旧全旅途测试说成本次重跑。
- 初次帧检查与构建重叠，资源尚在改写时超时；随后等待构建终止，在独立最终目录完整重做。最终流程避免边服务边改写包。自然截图统一`natural-`前缀，避免和并行社交矩阵覆盖。
- 5442/API8142最终继续使用原`output/cocos-data/local-preview.db`，停旧服务后只读一致备份；切换前后**1个实际手工旅程**完整player行指纹相同。`handoff-before.json`/`handoff-result.json`记录备份与健康，不把逐行保护检查当作全部旧存档/设备迁移已验收。
- 保留launcher14748/API14750/代理14751、session71040供人工复看；原5430/5431/API8130仍健康。旧候选96307/96309–96310及8468/8470–8471均退出；旧测试214/216–217和最终测试14242/14249–14250均正常退出，5446/8146关闭。专用Playwright/Node/Creator工作进程均已退出；临时编修脚本已移除，Cua绑定已reset，用户原标签未关闭。未知/共享工具宿主保留。`cleanup.json`记录定向核验。
- App底部预览打开请求返回queued，不能声称已实际搬到横向区域；用户原IAB欢迎页已安全刷新，没有代建/移动/赠礼。人工复看应使用可横向展开的5442预览。原Web/原素材/原存档保留，没有提交、推送、部署或玩家库迁移。

本轮不是全界面视觉批准。玩家此前两轮明确需要调整；新NPC链仍待实际反馈。其余旧弹窗、M7/M9和T/V门槛继续，完整目标保持开放。
