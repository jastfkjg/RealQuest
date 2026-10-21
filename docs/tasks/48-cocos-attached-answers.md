# 对话回答位置与控件优化

2026-10-17 最新玩家验收：在5442现有试玩复核后，玩家确认“这三处都可以保留”，范围为当前地图与找村民、底部交谈回答、行囊四格。此前task49偏好页/操作/音量音色的确认继续有效。以下早期拒绝与待复核记录保留为迭代历史，以本段为当前范围；不扩大到其他画面、战斗/远行手感、实机或原Web退役。

2026-10-17，玩家反馈task46“回答选项框的位置有点奇怪，UI也可以优化”。上一轮有功能/截图证据，但未获画面批准。

视觉主张：回答直接接在同一张底部台词面里，保持人物和场景为主体，去掉悬在房间中的独立选择框。

内容顺序：逐句听完→保留一句上下文→在同一对话面回应；话题同样用附着的回答区，心意/帮忙/返回在下面，数值结果单列。

交互主张：回答有清晰悬停/按压/焦点，读句阶段不提前露出答案；短横屏按剩余舞台调整只读镜头，不为菜单把人物推到侧边。

计划：替换独立浮框为附着回答；验证回答/话题/礼物/原委托入口、逐句/返回/重复按键和短横屏；独立包与测试库检查实际截图，通过后同库更新5442。原Web/实际旅程保留。

M7/task47行囊逻辑和原生页面目前是未接入、未验证草稿，未替换现有行囊。物品登记表原样抽取及严格原Web保护仍需自己的验证；本轮不把这些草稿当作完成或交付画面。


## 实现

- 原生PlacesPanels回答直接位于同一底部台词面中，保留最后一句上下文，再排两行自然回应；不再另画漂浮的绿色选项框。话题同样附着，心意/帮忙/返回保持真实原动作。
- 回答控件用同一纸面/苔绿状态：默认、悬停、按下、焦点和禁用可区分。触屏也有按压状态；减少动态去掉位移。回答按钮按压保留不透明文字/底面，避免原淡化降低对比。
- 镜头保持两个人居中，按底部实际高度留下场景空间；短横屏话题页缩放整个真实场景，屏幕文字独立保持字号。坐标/碰撞/租约/作息/结算没有改动。M7草稿未接入，没有新行囊入口或图片加载。
- reader浏览器断言回答控件位于底部台词面内、两个人不被控件挡住；原place/social矩阵增加莉亚剧情、诺亚约定和米拉商店的实际入口与返回验证。

资产：本轮没有新增图片、字体、音频或外部依赖；原Hearthwood角色/房间、纸/木/苔绿tokens复用。三个回答面实色文字对比度最低4.71（包括禁用），hover/focus/pressed为5.90；这是本控件实色检查，不是全界面或WCAG认证。

## 复现

```sh
node clients/cocos/tools/sync.mjs
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
node clients/cocos/tools/test-dialogue.mjs
node clients/cocos/tools/test-core.mjs
node clients/cocos/tools/test-places.mjs
node clients/cocos/tools/test-guidance.mjs
node clients/cocos/tools/check-baseline.mjs
node clients/cocos/tools/test-inventory.mjs # M7核心草稿，不能当成其UI已通过
REALQUEST_COCOS_BUILD=web-attached-answers-final COCOS_USER_DATA=/private/tmp/realquest-cocos-attached-answers COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/build.mjs web-desktop
python3 clients/cocos/tools/run-preview.py --build web-attached-answers-final/web-desktop --port 5446 --api-port 8146 --database output/cocos-attached-answers/test.db
# 独立终端，等待构建终止/服务就绪：
REALQUEST_DIALOGUE_REVIEW=attached node clients/cocos/tools/smoke-dialogue.mjs
REALQUEST_CONVERSATION_REVIEW=attached node clients/cocos/tools/smoke-neighbor-encounter.mjs
REALQUEST_PLACES_REVIEW=attached-answers node clients/cocos/tools/smoke-places.mjs
# 原Web兼容性构建：cd frontend
npm run build -- --outDir ../output/cocos-attached-answers/web-preservation-build --emptyOutDir
```

保持现有Node22.23.2/Creator3.8.8/Python3.14.6/npm及锁文件版本。专属5446/API8146和test.db，仅自己的新游客；reader测试标注近NPC位置夹具，自然链不改位置/余额/截止时间。全体自动化浏览器finally关闭。原Web仅登记表原样共享抽取与重导出，独立构建通过；未覆盖frontend/dist。其余390原文件hash保护和原登记表/重导出精确断言通过。


## 最终验证与收尾

- 最终独立包`web-attached-answers-final/web-desktop`的真实Creator构建、94绑定/真实类型、原读句、核心17组、地点/原引导、390原文件及原登记表精确抽取保护通过；原Web独立生产构建通过（已有大包提示保留）。M7核心草稿单测通过，UI未接入/未验证，保持该边界。
- 最终reader3组/9张：回答实际控件处于底部台词面内、两人无遮挡，原生逐句/E重复抑制/空格焦点/资料返回、镜头恢复、1920/1440/740及DPR2减动态触屏通过。
- 自然链6组/33张：新默认游客真实走路/过桥/进门/走近交谈，原话题、实际种子赠礼、长按/拖出取消、键盘和触屏通过；未预置位置/余额/时段或deadline。检查实际桌面/短横屏、hover/pressed/focus图，绿色悬停/按压保留可读文字。
- 原地点/社交8组/69张：增加莉亚剧情、诺亚约定、米拉商店的回答入口与返回截图；原15图/作息/报价、长话题、每日帮助/往事、赠礼422和已提交丢包重放/过期会面等通过。prepared social fixtures仅自己的新游客，不能当成自然跨日证据。
- 原游戏帧客户端Cocos适配2轮/2张，真实时钟、方向键不移动对话中的旅人，空格推进，finally关闭。`frame-client-used.mjs`/`frame-result.json`可复现。合计113个独立截图名，无意外浏览器错误；`reader-final.log`、`natural-final.log`、`places-final.log`、3份result、2段录像和`build-info.json`记录最终证据。没有后端游戏规则变更，也不把历史后端测试说成本轮重跑。
- 5442/API8142同库切换已完成：停旧服务后只读一致备份；1个实际玩家完整player行切换前后指纹相同，两个地址200健康。`handoff-before.json`/`handoff-result.json`记录原库、备份、指纹和最终包。没有代操作用户旅程、重置数据库或清除会话。
- 保留launcher33047/API33049/代理33050，session66119供人工复看。旧5442候选28744/28746–28747与首轮QA31230/31233–31234、最终QA32770/32772–32773均正常退出；5446/8146释放。所有本轮专用浏览器finally关闭，测试Node/Creator结束，用户浏览器/既有标签与共享归属不明工具宿主保留。精确核验见cleanup.json；原对照5430/5431/8130此前已停，未擅自重开。

当轮交付时仍是回答区候选，待玩家实际画面/手感反馈（当前底部回答已确认，见页首）；不代表其他页面、完整迁移或原Web退役批准。M7草稿需继续接入，M9/T/V门槛保持开放。没有提交、推送、发布或删除原Web。
