# Cocos 完整战斗体验优化（任务114）

2026-10-22。用户目标：完整优化战斗体验。实现与本地工程验证完成，默认包为真实 Cocos Creator3.8.8 release；实际观感保留给玩家试玩，不冒称已批准。

## 已实现的完整链路

保留现有五层洞穴、稳定物品/敌人/存档ID、原金币/打造/成长/石门条件，覆盖准备与进入、交战、菜汤/短休、暂停、失败重试、战败、逐层解锁、首领奖励、开门与安全撤离。村庄/道路仍安全，现实成长入口仍直接可达。

- 洞内使用160世界单位/秒的本地预测和回包校正，0.35秒无确认即停止外推，预测距离有界。表现层不改保存位置、生命、伤害、体力或奖励。
- 普攻免日常体力且不重置其恢复时间。短剑0.48秒横扫最多3只；长矛0.70秒窄幅刺穿最多2只；短杖0.72秒发出需要实际接触的飞弹。价格/打造材料不变；具体伤害/射程和旧值替代关系见数值文档。
- 空格/按钮可按住连击，轻触也锁存。短按在首次发送后有0.22秒动作缓冲，等待前一请求时不会提前丢失；新按下不被旧回包清掉。Q/R每次按下只施放/饮用一次。
- V向按下时的移动方向闪避，无方向时后撤；移动中Shift也可触发。方向即使在发送前松开仍锁存，服务端独立校验。闪避持续0.18秒、前0.14秒免伤、冷却1.15秒，不能穿墙柱，可取消尚未消费的菜汤。
- 普通敌人有安全击退和0.12秒受击硬直，已锁定的前摇不被每刀无限取消。苔团压缩/扑向锁定位置，蝙蝠保留直线突进，石壳虫收招显露暖色壳缝并暂失护甲。首领保留160生命/护甲2和原奖励，远距离以有1秒预兆的晶屑回应风筝。
- 原生武器轮廓/挥击弧线/刺击/杖晶、起手姿态、确认命中/受击/死亡反应、独立声音；减少动态时仍保留必要范围/姿态/反馈。靠近首领重叠时直接保护人物与武器绘制顺序，避免仅靠透明度仍遮住角色。键盘焦点有原生可见描边，五个横屏动作按钮有44px以上目标与明确状态。
- 贴身6世界单位内处理零方向退化；仍需合法距离/视线，背向范围不扩大。伤害、掉落、恢复消费、受击保护、序号和同请求回执均为服务端权威，丢包/重试不重复移动、消费或发奖。

## 美术与声音来源

没有新增图片、字体、音频文件、外部包、下载或生成服务。现有源PNG/WebP字节未改。武器/轨迹是项目原创确定性Graphics标记，角色沿用原有站立/行走帧并做原生姿态变换，不伪称新精灵帧。声音为项目原创WebAudio振荡器/包络，沿用显式开关、浏览器解锁、静音/失焦/释放生命周期。来源记录为asset-manifest.json的cocos_combat_experience；124绑定、26共享模块、91PNG/7WebP经来源检查。

## 环境与实际命令

使用既有npm/根package-lock、Node22.23.2/npm10.9.8、backend/.venv Python3.14及官方Creator3.8.8工作副本；未装新依赖、改迁移或重置玩家库。后台只有当前Cocos/共享规则，无React/Phaser新实现或旧客户端门槛。

| 命令 | 实际结果 |
| --- | --- |
| `npm run cocos:sync` / `npm run cocos:sources:write` | 规范源同步；最终124绑定、456来源文件核验 |
| `COCOS_CREATOR=... npm run check` | 最终真实Cocos声明严格类型及来源通过 |
| `COCOS_CREATOR=... npm run cocos:build:release` | 真实3.8.8、debug/sourceMaps关闭、MD5开启，默认web-current包生成且回执核验 |
| `npm test` | 23组工具/共享单元全部通过；248后端用例通过（仅既有Starlette/httpx弃用提示） |
| `REALQUEST_FRAME_CLIENT=<既有技能脚本> npm run cocos:test:browser -- --build web-current/web-desktop --suite combat-experience,cave-art,depths,landscape,combat-framing,session,semantics,preferences --continue-on-failure` | run-GIqrPb中七套成功，横屏发现贴身判定边界；整轮明确为失败，未伪报全绿 |
| `npm run cocos:test:browser -- --build web-current/web-desktop --suite landscape,combat-experience,cave-art,depths --continue-on-failure` | 贴身修复后run-FjzeIl四套35组，complete:true，无意外控制台/页面错误 |

最终覆盖八类共71组、194张PNG（包含原生技能帧）。镜头/存档/语义/偏好四套来自GIqrPb，客户端源码/载荷与最终FjzeIl逐字一致；两轮之间后端唯一差异为attack_hit的6单位接触判定（见contact-fix.diff），这四套不发送攻击或施法。变更实际影响的四类战斗均在当前后端重新通过，未将跨轮结果伪装为一次全八套通过。聚合与每套原始证据见[verification.json](../../output/cocos-combat-114/verification.json)。

当前客户端来源：`9585c553a4a3a58542149e88df197d45f8e2e7020138f9dbc206fd6f7edb9ee7`；载荷：`8da51a34f5b646a65eb0a063e016ba74fb926938fa3f4d3f35d0edf3ad5c79aa`。最终后端/测试脚本哈希、各服务、数据库和浏览器归属在原始run.json/result.json中。

## 行为与画面证据

- 准备物资/装备、三种攻击形状、飞弹接触、纯选敌、短按/按住/释放、单次施法、闪避/方向锁存、墙柱碰撞、石壳破绽、首领远程应对均实际执行。
- 主动将前一请求延迟400ms后短按闪避并松开方向，动作仍按原方向发送；两次丢失已提交回包后，第三次同ID/序号/载荷重试仅结算一次。650ms延迟下本地移动先响应、停止外推并校正；无模拟伤害或离线奖励。
- 正常100生命、石刃短剑、无施法/饮汤：满160生命首领实际移动/闪避胜出，4次避让，耗时约17.5秒，剩余生命100，体力100，精确首胜石1/晶屑3/金币+30。准备的武器/位置是QA前提，敌人伤害、死亡和奖励没有注入。此为自动脚本验证，不当作新手时长或最终平衡评价。
- 五层回归的200生命/体力与成长准备属于明确QA夹具；15普通怪/1首领从满血真实清理，普通材料/金币和首领石精确，三层短休、饮汤、永久开门、保存/恢复及现实页输入所有权均通过。
- 1920×1080、1440×900、1024×768、844×390、740×360；实际DPR2多指触控、减少动态、原生键盘/编辑框和合成IME、焦点/滚动/暂停/声音状态执行。直接检查代表性的挥击/直刺/飞弹/施法、首领重叠与战斗、五种尺寸、触控、反馈和原生技能帧截图，未以截图存在或构建成功代替质量检查。

代表文件：[挥剑](../../output/cocos-regression/run-FjzeIl/suites/combat-experience/sword-sweep.png)、[法杖飞弹](../../output/cocos-regression/run-FjzeIl/suites/combat-experience/staff-projectile.png)、[键盘焦点](../../output/cocos-regression/run-FjzeIl/suites/combat-experience/keyboard-dodge-focus.png)、[首领显身](../../output/cocos-regression/run-FjzeIl/suites/combat-experience/boss-occlusion-readable.png)、[正常生命首领实战](../../output/cocos-regression/run-FjzeIl/suites/combat-experience/normal-hp-boss-combat.png)、[横屏触控施法](../../output/cocos-regression/run-FjzeIl/suites/landscape/touch-spark-cooldown.png)、[实际洞穴交互录像](../../output/cocos-regression/run-FjzeIl/suites/cave-art/cocos-flow.webm)、[原生技能帧](../../output/cocos-regression/run-GIqrPb/suites/combat-framing/frame-client/shot-0.png)。

## 保留的失败与修正

首次旧体力断言随明确免体力规则更新；新测试修正了apply复制状态导致的陈旧引用和“默认最近目标必须是第一只”的错误假设。run-v2TSdl虽八套单独通过，但源文件在执行期间改变，整轮不得标记current；后续冻结执行。WebGL的toDataURL返回黑图，改用既有帧客户端的原生合成截图适配，原脚本字节不变，黑图不算视觉证据。

run-MV34OR的预兆夹具在初始化完成前已结算，改为明确有效期限并等待实际落点；run-niUIfq随后找出真实的发送前短按过期，加入传输与动作缓冲分离、方向锁存及确定性单元/实际400ms场景。单纯透明度不足以处理复杂首领多层图形，经真实截图发现后改为人物/武器显身保护，并直接核对绘制次序和画面。run-GIqrPb发现零距离方向退化，保持原失败断言，修复服务端接触判定后原横屏用例通过。

Creator在成功构建与回执生成后出现既有全局window.json恢复警告；未改全局设置。构建退出/回执及实际运行均独立核实。中间自动取消均只向核对过PID/启动参数/CWD的本任务控制器发SIGINT，浏览器和服务在finally关闭；不改失败记录掩盖问题。

## 存档、交付与清理

原output/cocos-local/local-preview.db用正式SQLite备份工具保存于output/cocos-combat-114/player-backup；启动前后逐表模式/数量/哈希一致，摘要776038734f5ddc17e70755bb1c4936dcbcdf2e8596348fa8c8be77ad9821cf4a。所有播种只针对有统一归属守卫的独立QA库。没有提交、推送、部署或购买。

自动化清理的精确PID与浏览器关闭回执见[cleanup.json](../../output/cocos-combat-114/cleanup.json)。已核实之前139个及最终21个测试进程退出。当前人工试玩的最终启动/健康/实际构建/原库比对结果记在[manual-verification.json](../../output/cocos-combat-114/manual-verification.json)，交付保留http://127.0.0.1:5443/（API8143）。SDK工作副本在确认Creator退出后移除，保留原签名输入。共享工具宿主归属不明确，未擅自停止。

提前启动的未交付试玩曾触发“人工预览保护”拒绝停止；只读证明仅有本任务健康/构建查询、无活动连接且原库逐表未变后，同一正常Ctrl-C关闭获准；没有绕过拒绝或终止用户已有预览。

## 剩余验证边界

玩家主观观感/难度反馈、物理手机/系统读屏与完整系统IME、Safari/其他品牌实机和生产弱网性能尚未验收；手机竖屏不在范围。现有原生几何/姿态没有伪称新像素攻击精灵帧或正式美术批准。当前完成的是上述完整战斗链的实现与本地工程验证。

## 实际变更文件

- `DESIGN.md`
- `backend/app/combat.py`
- `backend/tests/test_combat.py`
- `clients/cocos/asset-bindings.json`
- `clients/cocos/assets/scripts/Bootstrap.ts`
- `clients/cocos/assets/scripts/combatView.ts`
- `clients/cocos/assets/scripts/core/caveArt.ts`
- `clients/cocos/assets/scripts/core/caveView.ts`
- `clients/cocos/assets/scripts/core/combatMotion.ts`
- `clients/cocos/assets/scripts/core/combatMotion.ts.meta`
- `clients/cocos/assets/scripts/core/features.ts`
- `clients/cocos/assets/scripts/core/protocol.ts`
- `clients/cocos/assets/scripts/experience.ts`
- `clients/cocos/assets/scripts/ui/combatDock.ts`
- `clients/cocos/assets/scripts/ui/panels.ts`
- `clients/cocos/tools/smoke-cave-art.mjs`
- `clients/cocos/tools/smoke-combat-experience.mjs`
- `clients/cocos/tools/smoke-combat-framing.mjs`
- `clients/cocos/tools/sync.mjs`
- `clients/cocos/tools/test-cave-view.mjs`
- `clients/cocos/tools/test-preferences.mjs`
- `docs/art/ASSET_PLAN.md`
- `docs/art/REVIEW_CHECKLIST.md`
- `docs/art/asset-manifest.json`
- `docs/balance/village-progression-v1.md`
- `docs/migration/cocos-source-inventory.json`
- `docs/tasks/114-cocos-combat-experience.md`
- `progress.md`
- `shared/game/caveArt.ts`
- `shared/game/caveView.ts`
- `shared/game/combatMotion.ts`
- `shared/game/features.ts`
- `shared/game/protocol.ts`
- `tools/cocos-browser-suites.mjs`
- `tools/test-cocos-browser.mjs`
