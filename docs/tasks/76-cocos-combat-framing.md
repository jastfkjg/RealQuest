# Cocos 首领短横屏取景候选 J3

2026-10-19后续：[任务94](94-cocos-owner-framing-review.md)已提供单独53136/53137与新QA演示角色的当前J3人工入口，三检查通过、玩家取景确认待答。它未停止或替换原5442/I3，不接续原玩家数据；本任务下文记录的原预览更新拒绝和待答范围保持。

2026-10-18，任务39 V4/V5后续。**本地修复与相关验证完成；5442仍保留I3，切换预览被自动审批拒绝，待明确授权。** 原Web、默认入口与部署、原玩家库和用户浏览器保持。

## 修复及范围

原I3在740×360、玩家(320,300)/首领(400,224)的真实截图中，首领上部超出视口且被存档/行囊遮挡。J3仅在短横屏洞内世界、当前首领距离192世界单位以内时，为玩家和首领全身/血条寻找固定HUD之间的可用取景；先保留较大整体比例，再选择离普通镜头最近的位置。横向覆盖原房间，较窄房间居中留边；底部控件需要的纵向留边使用原有深苔底色，不新增地面或碰撞。远处/非当前首领和普通怪物保留原镜头；不声称所有敌人或全地图始终在屏幕内。

视觉主张是保留安静石地、苔绿与暖色预兆，让世界主体可读。顶部旅程/存档/行囊/成长、状态与底部方向/攻击/施法/药汤均保留原尺寸、职责和输入规则。整个场景由相机取景，不单独缩放怪物、文字或改变世界坐标。没有新素材、字体、依赖、玩法、音效或服务端规则/迁移；actual-render仍待玩家确认。

交互保持原生选敌、移动/松键、直接Life入口与Escape返回、失焦暂停和触控。相机不提交任何游戏命令；四姿态图形包围盒按种类/预备状态缓存，相同几何/HUD只缓存一个镜头结果，避免站立时重复求解，不保留移动历史。UIUX本地ux检索命中固定导航不能遮内容、固定元素需预留空间；只采用可见性原则，未套用网页padding或新设计体系。

## 实际改动文件

- `shared/game/localScene.ts`：纯取景函数，区分世界单位与CSS像素，根据真实遮挡矩形和原房间宽度求解；不改原导航、碰撞或localCamera基础比例。
- `clients/cocos/assets/scripts/Bootstrap.ts`：复用普通镜头恢复入口，仅近距离首领采用保护；缓存结果，房间外沿用深苔底色。
- `clients/cocos/assets/scripts/combatView.ts`：从原monsterArt四姿态缓存图形边界，不改任何怪物绘制。
- `clients/cocos/assets/scripts/core/localScene.ts`、`clients/cocos/asset-bindings.json`、`docs/migration/cocos-source-inventory.json`：规范同步/来源元数据。
- `clients/cocos/tools/smoke-combat-framing.mjs`：新增受归属守卫保护的独立QA套件，测真实身体/血条、HUD与房间边界，4方位×5尺寸，原生鼠标/移动/模式/触控和可选技能帧客户端。
- `clients/cocos/tools/test-local-scene.mjs`、`tools/cocos-browser-suites.mjs`、`tools/test-cocos-browser.mjs`：可见性/世界输入不变合同和套件登记。现27个Cocos套件加1可选Web比较；普通CI没有本机技能文件依赖。
- 本报告、DESIGN、README、TODO、task39、local说明、review checklist及progress：候选、真实结果和待答边界。

## 保留的失败与修正

| 原始回执 | 实际结论 |
| --- | --- |
| I3 `run-y2dscs` | 测试将HUD中心当成左上角，初始洞穴日号又触发正常重建；原报告保留，其玩家遮挡/固定HP判断不采信。已用正确坐标归一化与服务端clock_view初始化隔离夹具日号。 |
| I3 `run-rFphyY` | 规范负例：首领顶部y=-74.1且被存档/行囊遮挡，exit1。准确固定位置/100HP，不改规则。 |
| J1 `run-nH1xsG` | Node单位通过而真实Creator出现黑屏/非有限相机x。Creator loose转换将Set展开当成单个对象；改显式Array.from。原包/编译片段/失败保留。 |
| J2 `run-2eMhUa` | 4方位×5尺寸身体/HUD检查通过，但看图发现房间边缘大片单侧黑区，不能据几何pass判视觉合格。 |
| J2 `run-kL6KLk` | 8个检查入口执行后，InitScript在about:blank写localStorage导致报告失败。现仅同源页写本次QA凭证，错误未过滤。已按精确controller1293正常SIGINT取消剩余回归，exit130/未执行项保留；不算六套通过。 |
| J2 `run-Xp4udx` | 新增房间边界负例在north-844失败，exit1；未放松原身体/血条/HUD断言。J3限制横向镜头。 |
| J3首次技能帧PNG | 两张toDataURL回读为黑图，保留为无效视觉证据；原生场景截图正常。只修改output内技能副本为原生合成截图，安装技能/游戏/规范测试断言不变；同源同包单套重新验证。 |

## 最终实际验证

当前J3为真实Creator3.8.8 release，debug/sourceMaps关闭、MD5开启，269文件。source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e` / payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`。与I3相比，仅Bootstrap、combatView及生成的core/localScene三份运行时脚本变化；219个PNG/WebP/导入元数据（含脚本meta）字节不变，原monsterArt代码也未改。来源402文件/107绑定/81PNG+1WebP/25共享模块/79场景输入/93冻结Web文件。

| 检查 | 实际结果 |
| --- | --- |
| `run-OqLpDS` | 一次6套：combat-framing、cave-art、landscape、session、dialogue、inventory-preview，32组，complete:true/无未执行/零意外错误；原攻击丢回包、施法/药汤/暂停/撤离、多指触控、重连和双标签保护保留。 |
| `run-u6b2ZV` | 相同游戏/测试源码的取景单套8组复验，零意外错误；两段技能按键仍真实执行，原生合成截图已查看。重复检查不合并成40组新覆盖。 |
| 107实际类型/来源 | 官方SDK检查通过；I3与J3运行时/资源差异由verifyBuild和原始记录核对。 |
| 六相关单位 | 最终`unit-j3/result.json`6模块通过：source-ownership、transition-protection、browser-configuration、features、cave-view、local-scene。 |
| 原保护 | 原390基线/七精确提取及435原文件/封闭例外合同通过；未改基线隐藏漂移。 |
| 独立结果核验 | `verification.json`连接两正例/负例/取消、准确套件和测试SHA、相同source inventory/后端输入、当前构建、单位和技能原件/副本哈希。 |

实际命令均在仓库根，以Node22.23.2执行（npm复现入口仍为cocos:test:browser/cocos:test:unit）：

```sh
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
REALQUEST_COCOS_BUILD=web-release-framing-j3 COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/build.mjs web-desktop --release
REALQUEST_FRAME_CLIENT=/Users/zilong/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js node tools/cocos-browser.mjs --build web-release-framing-j3/web-desktop --suite combat-framing,cave-art,landscape,session,dialogue,inventory-preview --continue-on-failure
REALQUEST_FRAME_CLIENT="$PWD/output/cocos-framing/supplied-native-screenshot.js" node tools/cocos-browser.mjs --build web-release-framing-j3/web-desktop --suite combat-framing
node tools/cocos-unit.mjs --only browser-configuration,local-scene,cave-view,features,source-ownership,transition-protection --report output/cocos-framing/unit-j3/result.json
node clients/cocos/tools/check-baseline.mjs
```

可选技能副本只绕过WebGL清空的toDataURL回读，仍由本次归属BrowserServer/页面执行原技能的按键、文本与错误检查，外层finally清理；副本在忽略的output内，原件哈希/逐行改动/副本哈希见`supplied-client-provenance.json`。默认27套不需要安装该技能。

## 实际画面与范围

已实际查看规范I3失败、J1黑屏、J2 north/south/west/edge、J3 north/edge短横屏和native-moving、两轮技能帧截图。最后一张技能按键图已走到距离206世界单位，按明确范围恢复普通镜头，远处首领不保证完整；不是近距离保护的通过图。近距离截图中，玩家/首领/HP可见，较窄房间居中、没有大片单侧黑区。

- [J3 740近距离](../../output/cocos-regression/run-u6b2ZV/suites/combat-framing/north-740.png)
- [J3 740世界边缘](../../output/cocos-regression/run-u6b2ZV/suites/combat-framing/edge-740.png)
- [原I3相同位置失败](../../output/cocos-regression/run-rFphyY/suites/combat-framing/north-740.png)
- [真实洞穴操作录像](../../output/cocos-regression/run-OqLpDS/suites/cave-art/cocos-flow.webm)

这些是准备角色与长预兆的隔离夹具，不是新自然首领战/平衡或现实学习被核验。PNG存在不等于视觉通过；原两张黑图由`capture-verification.json`明确分类，补拍图内容和真实状态已核对。仅完成本轮局部候选；未执行新27套全量、当前J3原生45分钟、网络/交付/独立重建或后端全套复跑，历史I3/F证据不扩为J3。

## 预览、审批与清理

原I3人工服务67850/API67853/代理67854（5442/API8142）仍保留，启动身份与原回执相同，主页/构建/health均200。任务66原文阅读和commit/push/draftPR仍待原问题答复，没有重复询问或推断批准。

拟同库更新J3前，已只读在线备份至私有`output/cocos-framing/manual-before-j3`；完整六表/模式snapshot `569ae498edd557c4a8a9791ad30d8dc761a7e8fbe3dc4a98436555bbf2ce36cb`，没有恢复/覆盖源库。随后停止原预览的命令被自动审批在创建进程前拒绝：没有明确完成复核或授权中断当前保留预览的证据。命令未运行，未发送SIGINT，未切换或重启服务。拒绝与原I3继续健康的证明在`approval-block.json`/`manual-retained.json`。原最新健康回执被旧只读助手刷新为真实新时间，未伪造旧时间；本轮另存上下文记录。待用户明确允许后再更新，不能绕过拒绝。

本轮全部自有自动化浏览器、API/代理、Node与Creator均退出；只读精确PID/启动时间/owner-profile审计523份可解析浏览器记录、1438份已结束PID记录，issues/active/非预期readErrors为空。历史Task73的唯一0字节JSON按精确路径/空字节哈希/原before proof保留为已知损坏负例，不修写/删除。原用户Chrome/IAB与共享工具宿主保留。

全目标仍active：本轮有真实负例、修复、图形与交互验证进展；不因这一轮本地结束关闭任务39 V1–V7、实际CI/系统/实机/生产或原Web退役门槛，未提交/推送/合并/部署/注册运行器/删除代码。
