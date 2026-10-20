# Hearthwood Review Checklist

## Cocos 第一章选中改进 — 2026-10-20 任务108

- [x] 236 后端测试、7 相关 Cocos/工具单元模块、109 绑定/真实引擎类型、原素材校验与真实 Creator 3.8.8 release 构建通过；三套浏览器验收共 14 组交互通过。
- [x] 隔离 QA 库实际验证购买→明确装备、失败/丢失回包重试、替换装备及刷新；接支线保留主线，手动切换和刷新持久化。
- [x] 实际翻山抵城、走到旅店、进入、交信、订房与睡醒；桌面 1440×900 和横屏 740×360 截图已检查。路牌原生固定字号，室内不残留室外路牌；窄屏保留选中委托可见。
- [ ] 用户对本轮实际画面的视觉反馈；不得当作其他城市/地图的新美术批准。完整证据与边界见[任务108](../tasks/108-cocos-chapter1-friction.md)。

## 原生Edge长会话 — 2026-10-19任务86

- [x] 当前J3官方Edge155 headless/M4独立45分钟，94采样/7PNG、固定工程参考和同档/移动保存通过；预检单独统计，不拼取消片段。
- [x] 实际查看预检世界/成长、长会话15/30/45分钟世界及结束/移动后共7图；移动后取景拉远，几何通过不代替玩家手感批准。
- [x] 三个专属浏览器/profile/API/代理与临时防休眠退出，原5442/I3健康保留，无新素材或处理。
- [ ] 原生缩放/系统、其他目标性能和物理设备、实际CI/生产与玩家等原门槛继续开放。

详见[任务86](../tasks/86-cocos-native-edge-session.md)。


## 原生Firefox检查 — 2026-10-18任务84

- [x] 官方Firefox158.0/原生BiDi/current J3七组15PNG，中文研习同档刷新与五尺寸、WebGL2.0通过；唯一QA书页/结算，无额外奖励。
- [x] 实际查看地图、刷新书页、740/1920现实成长四张，控制和中文可读；无新处理、素材或玩家批准扩张。
- [x] 专属浏览器/profile、所属只读DMG挂载与QA服务退出，原5442/I3健康保留。
- [ ] Safari、物理设备、系统辅助技术、完整交付/预算与玩家等原门槛继续开放。

详见[任务84](../tasks/84-cocos-native-firefox.md)。


## 原生Edge检查 — 2026-10-18任务83

- [x] 官方Edge155.0.4283.62/current J3八组17PNG，五尺寸和DPR2模拟触控；两份QA各一书页/一结算，无奖励。
- [x] 实际查看地图、刷新后原书页、740现实成长、DPR2焦点四张及保留选择器失败图；不扩大玩家视觉批准。
- [x] 两个专属Edge/profile及QA服务退出，原5442/I3健康保留；无新素材或界面处理。
- [ ] V6其他品牌/物理设备、系统和生产/玩家等原门槛继续开放。

详见[任务83](../tasks/83-cocos-native-edge.md)。


## 数据一致性检查 — 2026-10-18任务82

- [x] 当前J3常规consistency九组/13PNG及四相关单元/194后端项，逐项关闭V3数据一致性；原27套证据不冒充新全量。
- [x] 实际查看断网禁用保存、联网确认、快七天书页、旧回包存档面板四张及保留失败图；状态/结算由断言核对，不只看截图。
- [x] 原玩家已批准的启动故障页范围保持；本轮没有新素材/界面处理，不扩大其他视觉批准。
- [x] QA浏览器与服务退出，原5442/I3健康保留。其余玩家/系统/设备/实际CI/生产门槛继续开放。

详见[任务82](../tasks/82-cocos-consistency-acceptance.md)。


## 当前J3与固定PG Alpine恢复 — 2026-10-18

- [x] 固定生产模板镜像/用户名和库名下的七项恢复、三浏览器阶段/12PNG；六表完整值/模式、Cookie/双Bearer/凭证/幂等与旧001升级通过，V1按原允许的隔离夹具范围关闭。
- [x] 实际查看原Web凭证下载、恢复后J3及旧Cookie升级后J3三张；原准备数据/历史日期保持，不扩大玩家批准。
- [x] 无测试服务遗留，Docker恢复停止；原18停止容器和两份新QA数据卷保留作证据，原试玩健康。审计561常规浏览器记录及本轮3份PG记录/17个PID均无所属存活。
- [ ] 真实生产/全局角色、实际CI/系统/品牌浏览器/物理横屏与其余玩家批准仍开放；原Web保留。

详见[任务81](../tasks/81-cocos-pinned-postgres-restore.md)。

## 当前J3容器与回环HTTPS — 2026-10-18

- [x] 实际Linux arm64当前J3正常七组/4PNG；2946站点文件逐份一致、269资源含WebP的MIME/cache/gzip/404、受本轮证书约束的HTTPS/Cookie/Bearer/旧标签/回退通过。
- [x] 独立浏览器就绪后主动SIGINT例期望exit130/complete:false，资源自行清理，控制器无补救；不是第二份产品全量通过。
- [x] API19源码/28锁定依赖、两QA库完整；查看实际桌面世界/740成长页/切回后740三张。561浏览器/1535结束PID审计无所属遗留，Docker停止、18原停止容器保持，5442健康。
- [ ] 正式生产域名/库角色/amd64、实际CI/系统/品牌浏览器/物理横屏与其余玩家批准仍开放；原Web保留。

详见[任务80](../tasks/80-cocos-j3-container-https.md)。

## J3独立重建与交付 — 2026-10-18

- [x] 903输入独立安装/真实Creator重建269文件逐字节一致；新包三套19组/61PNG、原Nginx9组/5PNG和固定七网络样本/10PNG通过。
- [x] 查看6张实际截图（近首领、故障、短成长页、切回村庄、慢加载、唯一书页）；仅作开发检查。截图总数76，排除交付html中的运行素材，原统计保留。
- [x] 五QA库完整/七网络游客各一次书页结算；559浏览器/1522结束PID审计无所属遗留，原I3人工试玩健康。
- [ ] 当前J3容器TLS/目标条件、实际CI/系统/品牌浏览器/实机与其余玩家批准仍开放；不退役原Web。

详见[任务79](../tasks/79-cocos-j3-independent-delivery.md)。


## J3当前完整回归 — 2026-10-18

- [x] 同一次27套/172组/702份实际PNG，默认取景7组无外部技能依赖；全部测试/源/后端/构建前后一致，无未执行项。
- [x] 实际查看当前近距离首领、书页/长备注、地图、底部回答、行囊、图书馆和740洞穴8张；无新素材/玩法/规则变动。551浏览器/1493结束PID审计无所属遗留，原I3人工预览仍健康。
- [ ] 玩家/J3取景与其他画面、实际CI/系统/实机/生产仍未全部验收。J3原生1分钟预检及单次45分钟已由任务78通过，I3预览切换授权继续待答；不退役原Web。

详见[任务77](../tasks/77-cocos-j3-full-regression.md)。 原生长会话详见[任务78](../tasks/78-cocos-j3-native-session.md)：94份样本/7PNG、GC后DOM与监听器不增长、固定工程限值与同档核验通过，553浏览器/1499结束PID审计无所属遗留；不扩大玩家批准。


## Cocos首领短横屏候选 — 2026-10-18

- [x] 同位置原I3裁切负例保留，J1编译/黑屏与J2单侧留白/夹具错误保留，不改断言隐藏。
- [x] J3四方位/五尺寸与真实鼠标/触控、原战斗/模式/重连：6相关套件32组通过；技能合成截图单套8组复验通过。原两张黑图仅作为读回失败证据，原生画面已实际查看。
- [x] 原绘制、PNG/WebP/导入元数据保持；无新素材/规则/字体，107类型/六单位/390＋435保护、源/构建/清理核验通过。
- [ ] J3视觉与战斗手感由玩家确认；新27套全量/系统/实机/实际CI/生产等仍开放。5442/I3尚未切换：自动审批拒绝中断原预览，待明确允许；不扩展原故障页或其他三处画面批准。

详见[任务76](../tasks/76-cocos-combat-framing.md)。

## Cocos 原生语义与自然续链 — 2026-10-18

- [x] task62真实旧包AX基线复现可见Start无原生按钮；D候选原生中文登记、Space/Enter一次、具名成长/真实EditBox、M/Escape/原焦点及世界移动5检查通过。无新素材或视觉主题，22单元/106类型/386来源/原390＋435保护通过。
- [x] 常规第23套已登记；全量23套/155组/658PNG、修正就绪等待后的语义单套5检查、真实Chrome155语义5检查及Nginx9组通过；5442已同库更新，完整快照一致。原生AX查询不替代OS读屏器/系统IME/缩放/实机或全V5；这些门槛仍待。
- [x] task59同一自然旅人首层/回顾4检查24PNG、五层首领6检查23PNG；100原上限、真实所得材料/购买短杖和菜汤，实际获得1枚门钥魔法石，石门仍关闭。
- [x] 真实计时10:34:06至10:59:17，原timer/书页只生成1条25分钟记录（timer/verified:false），1检查3PNG；知识点0，原规则经验/碎片保持。随后解读符文并向莉亚交第八项委托，3检查7PNG，最终238金币/60学识/4知识碎片。
- [ ] 三小时约定仍真实13:09:37.376到期；结算/魔法培养/开门/离村住宿返乡和玩家战斗/其他画面手感仍待。未扩大三处界面与偏好页的既有批准。

## Cocos 自然流程与PostgreSQL17 — 2026-10-18

- [x] task59村庄经营续链11检查/44独立PNG：七剧情交付、三单、采集发现/双箱、制作/小屋2级、短休/睡眠、诺亚/米拉喜爱心意和帮助；严格最终288金币/3木材/2石料/5萝卜/1木板、成长点0/石门关。移动诺亚与已完成交单在同档接续，没有重置或重复奖励。
- [ ] 莉亚普通心意/帮助与符文接取已完成；25分钟真实计时10:34:06开始，结束记录/符文交付与后续游戏链仍待；计时不核验现实行为。
- [x] task61已安装真实Chrome155（非附带Chromium156）5组/8PNG，代表登记/移动/行囊/地图找人/成长/刷新/740横屏通过；实际看地图/横屏行囊，专属进程/配置退出。其他浏览器/系统IME/实机/长会话/性能预算仍开放。

- [x] task59新QA旅人从初始位置真实步行/门口/诺亚领取三小时；已完成同存档安家/箱子存取/六田60秒自然成熟收获12/石剑购买装备/刷新，9检查、37独立PNG。没有成长夹具或改期限，点数0、石门关，截图已查看。
- [ ] 原约定2026-10-18 13:09:37北京时间到期；真实到期结算/培养、交易订单/社交/全部委托、完整洞穴与远行返乡继续。同一QA保存仍在等待，未声称现实学习行为已核验，V2开放。
- [x] task60官方17.11 SHA核验/私有编译；两个独立真实PG17集群通过在线custom备份/新库恢复、六表全部原值与模式定义指纹、原Cookie/双Bearer/凭证/删除与结算重放、真实001恢复升级及原Web/Cocos接续，7组/12PNG、0替代游客/意外浏览器错误。
- [x] PG清理7报告/30PID及标记无遗留；自然早期短步骤11报告/12PID记录无所属闲置浏览器/Node。仅原人工试玩和实际三小时等待控制器/API依赖保留，882冻结源输入未改。
- [ ] 本机macOS17.11不是精确Alpine镜像/生产部署证明，实际角色/生产副本/容器/HTTPS/CI/设备和其余门槛仍开放。原Web保持，既有画面批准范围不变。

详细命令、失败/恢复、原值指纹、素材/源码范围及清理证据：[task59](../tasks/59-cocos-natural-journey.md)、[task60](../tasks/60-cocos-postgres-restore.md)。

## Cocos 世界反馈与横屏HUD — 2026-10-18

- [x] 修复740横屏结果纸、四格说明与世界路标遮挡；五尺寸实际控件/非按钮HUD区域、DPR2模拟触控按住/松开/地图输入归属及重复结果显示通过，保留四格位置/大小/用途。
- [x] 最终run-KltWgO完整22套/150组/655PNG，零意外浏览器错误；最终通知/原技能帧4组/21PNG、登记8组/56PNG、真实Nginx9组/5截图分别通过。最终注册中文、740结果、夜间村庄/城市与Nginx世界实际查看。
- [x] 原项目与独立882文件副本真实重建的266产物完全一致；106类型/384来源/原390＋435保护通过。导入异常元数据已精确还原并保留取证，未绕过源变化守卫；无新素材、依赖或服务端规则改动。
- [x] 5442已同库存档交付；完整模式/六表指纹一致，1角色/974结算保留，旧所属服务退出、新试玩供人工复核保留。原用户浏览器未驱动或关闭。
- [ ] 新提示位置不扩大既有三处画面/task49批准；全局键盘/AT、系统IME/缩放、实机、真实等待节奏、目标PG17/CI/容器/HTTPS及其他V项继续开放。

文件、命令、失败原因、指纹与清理：[task58](../tasks/58-cocos-world-feedback-layout.md)。

## Cocos 当前生产包独立重建 — 2026-10-18

- [x] 882文件源码快照无旧依赖/Creator项目缓存/原Web安装构建；独立有锁安装、官方Creator3.8.8生产重建，266产物逐字节相同，所有源输入前后不变。
- [x] 副本21单元、106绑定/真实类型、384来源/107引用；原仓390+435历史保护通过。新包session5组与原技能帧2组/13PNG、零意外浏览器错误；740重连与1440地图实际查看。
- [x] 14份报告/38PID及启动时间、专属浏览器/Creator/项目标记核验无遗留；人工5442/API8142健康保留，玩家库未读取或操作。
- [ ] 740成功提示局部遮挡仍归V5；实际CI/容器/HTTPS、目标PostgreSQL17、设备及其余门槛继续，不扩大既有三处画面和task49偏好批准。

边界、命令、指纹与证据：[task57](../tasks/57-cocos-independent-production-rebuild.md)。

## Cocos 存档备份恢复 — 2026-10-17

- [x] 当前SQLite隔离链：真实WAL在线备份，六表/完整模式指纹，原Web原生凭证、Cocos预览/取消/确认/刷新/再次恢复、两个Bearer/原Cookie/删除回执和同结算重放通过；001模式/未版本化对照旧角色真实进入Cocos，0替代玩家。
- [x] 最终7组/7PNG；22单元（含10SQLite合同）、106真实类型、384文件/107引用和原390+435保护通过。代表画面已查看，无新UI/素材/依赖或玩家批准扩展。
- [x] 56报告/183PID及专属浏览器标记核对无遗留；所有本轮浏览器/API/两个代理退出，原人工5442/API8142健康，未读取或操作其玩家库。
- [ ] 目标生产PostgreSQL、实际切换/恢复、当前生产独立重建/容器/HTTPS、设备和其余V门槛保留，不把本地SQLite等同目标生产证明。

命令、完整数据范围、截图与失败记录：[task56](../tasks/56-cocos-save-backup-restore.md)。

## Cocos 过渡保护合同 — 2026-10-17

- [x] T6当前保留阶段：原390基线/精确提取不变，435原Git文件、18封闭例外、9精确形状、2旧测试适配/46原断言、003新增迁移和原启动/发布全部保护。
- [x] 实际接入后21单元/19真实源副本负向夹具、106真实类型、378文件/107静态引用通过；运行时/产物与task54完整22套相同，无新资产、依赖、画面或服务端改动。
- [x] 合并20报告/350PID记录和启动时间、专属浏览器标记核对无遗留；仅人工5442/API8142保留，原玩家库未操作。
- [ ] 实际CI/目标交付、V1–V7其余门槛及未来归档/删除/默认切换仍按各自授权与证据执行；不扩大玩家画面批准。

文件、命令、负向夹具和范围：[task55](../tasks/55-cocos-transition-protection.md)。

## Cocos 生产候选交付 — 2026-10-17

- [x] 官方Creator3.8.8实际release关闭debug/sourceMaps、开启MD5；新ready包266文件/14,812,110字节，私有schema2清单、版本目录与确定性封包核验通过。
- [x] 真实Nginx9组/5PNG：266资源MIME/缓存、gzip、404、同源API/Cookie；两个实际引擎版本接续与根入口切回，稳定业务状态及原ledger保持。API/Nginx/浏览器finally退出，代表三图已查看。
- [x] 修复登记加载期间抢占姓名焦点而滞留禁用开始按钮；实际截留PNG验证后完整session5组与真实时钟帧2组通过。无新素材/音频/字体/依赖或服务端规则/迁移改动。
- [x] 最终新生产包run-R0sQYv全部22套/148组/639PNG通过，零意外浏览器错误；代表登记/重连/回答/四格/历史备注与原Web返回实际查看。329个已结束PID记录/浏览器标记核对无遗留，人工预览健康。
- [ ] 实际已提交CI/容器、HTTPS、实机及其余T/V门槛保留；740结果提示局部遮挡归V5继续整理，原Web默认发布不变。

命令、产物/失败证据及限制：[task54](../tasks/54-cocos-production-delivery.md)。

## Cocos 本轮玩家画面确认 — 2026-10-17

- [x] 当前地图与找村民、底部交谈回答、行囊四格：玩家答复“这三处都可以保留”。此前task49偏好页/操作/音量音色确认有效。
- [ ] V4其余场景、战斗/远行手感、系统/实机和生产发布门槛继续验收；不构成原Web退役批准。以下各轮待复核文字为当时记录，当前确认范围以此处及task39为准。

## Cocos 启动与存档路径 — 2026-10-17

- [x] T1本地主入口/只读预检/明确库配置、同库互斥、真实health就绪和迁移/启动/服务退出清理完成；11启动单元、9真实启动组、4会话组/8PNG及7生命周期通过，代表740恢复图已查看。19单元整套与最终定向2模块、106真实类型、390保护和368文件来源通过。
- [x] 无运行时/画面/图片/字体/音频/依赖变化；复用task52源6c1230de/包1132a5f6。5442/API8142同包同库，私有备份及全部表/模式指纹一致，1角色/974结算记录保留；旧人工退出，新89393/89396–89397供试玩保留。
- [x] 15报告/74已结束任务PID及唯一浏览器owner/profile核对无遗留；共享宿主/用户浏览器保留，人工root/API/build记录200。
- [ ] 本轮不扩大task49偏好批准，不构成默认Web切换、生产CI/部署或实机验收。T2/T3实际CI/T6和V仍开放。

命令、限制、备份与清理：[task53](../tasks/53-cocos-startup-save-paths.md)。

## Cocos 当前统一回归 — 2026-10-17

- [x] 当前真实Creator3.8.8 navigation构建，源6c1230de/产物1132a5f6；最终冻结run-ojHM8V全部22套通过，147组/638PNG，零意外浏览器错误。代表网络恢复、现实成长长备注、附着回答、偏好、行囊及原Web返回画面已实际查看。
- [x] 18单元、232后端、106绑定/真实类型、390原保护和精确提取/登记合同通过；7类真实生命周期、5类只读库归属守卫分别通过。864文件无Web安装/构建源副本完成真构建与session4组，源字节不变；不冒称已提交CI。
- [x] 修复网络恢复控件遮挡、预测拐角移动与洞内走近；未改服务端碰撞/奖励规则。没有新素材/声音/字体/依赖，81PNG字节及既有7场景/9图标来源链保持。
- [x] 人工5442/API8142同库更新；只读备份和全部表/模式指纹一致，1角色/764结算记录保留。旧人工服务退出；核对51运行记录和300个PID/启动时间，无所属测试进程遗留。仅新人工84208/84210–84211供试玩保留。
- [ ] 此次完成T5本地技术验证，仅task49偏好/操作/音量音色已有玩家确认。其他画面/手感、系统/实机、实际CI与生产/发布回退门槛仍按task39；原Web未退役。

具体命令、完整矩阵、失败记录、备份及清理证明：[task52](../tasks/52-cocos-unified-regression.md)。下列各轮进程/包名为历史交付记录。

## Cocos 源输入归属与重建 — 2026-10-17

- [x] 354文件/106绑定（81PNG/25共享模块）、91冻结Web输入和86处静态字符串/模板分类；81导入UUID/帧/纹理ID、尺寸及nearest/untrim/不可pack检查，原来源链不可被烘焙输入checksum替代。
- [x] 场景读取从47补为完整79项，实际传递模块/Python app和已读图片有哈希；7PNG/7布局/43sprite与9图标保持原字节，没有新素材/声音/字体/原图变化。
- [x] 无原Web安装/构建的854文件源副本中，5个原PNG整理器成功且354登记/854源文件字节不变；同步106、真实类型、16单元、6实际CLI故障拒绝和仅刷新来源损坏拒绝/恢复验证通过。
- [x] 与task50已验证源包的259运行时文件完全一致；根212绑定源/输出文件不变。本轮仅离线资产/来源检查，不新增游戏画面批准；专属工具/浏览器退出、人工5442/API8142健康。
- [ ] 源目录冻结是过渡安排，未来归档/删除仍须先迁出/验证/获授权；当前游戏全链、实机、CI、发布和玩家待评画面仍按task39。

来源策略/逐文件清单与实际命令：[task51](../tasks/51-cocos-source-ownership.md)。

## Cocos 独立工具验证 — 2026-10-17

- [x] 根锁保持30条既有版本/完整性记录；106源绑定/真实类型、15单元模块与原仓390/精确注册表合同通过。
- [x] 849文件源码副本无frontend package/install/dist或编辑器缓存；包括原有Web构建模板，真实Creator完成。7场景PNG/43绑定/7布局+9图标字节复现，无新素材或源像素修改。
- [x] 最终11浏览器组/38图+2真实时钟帧，桌面和740×360原画面已查看，输入/全屏/偏好/自然采集交付成功；零意外错误，全部专用QA/浏览器/工作进程已退出，人工预览保留。
- [ ] 实际提交的CI检出、冻结源归属、全套浏览器统一入口、其他画面/设备/发布门槛仍按task39执行。此次工具验证不增加任何画面批准范围。

命令、失败修正与最终证据：[task50](../tasks/50-cocos-independent-tooling.md)。

## Cocos 旅途偏好与提醒 — 2026-10-17

- [x] 四张原生木/纸短书页、原book PNG与共享按钮，106绑定/真实类型通过；无新位图/音频素材/字体/外部包，原Web声音代码哈希留存。
- [x] 最终偏好11组/38图、布局1组/12图、聊天3组/9图、行囊4组/11图和原技能帧2图，共72张；实际设置/等待全屏/三提醒/城市和洞穴横屏/键盘焦点检查，零意外浏览器错误。
- [x] 实际AudioContext节点启停/静音/失焦、系统媒体模拟变化/持久偏好、真实浏览器全屏等待/重复F/退出/失败与输入归属；自然采集拒绝/丢包不假报收获、实际安家交付仅一奖励音；只读提醒不发点或消费。
- [x] 同库5442完整1个玩家players行指纹一致/备份保留；18旧候选/QA退出、无遗留headless/Node/Creator，人工47723/47725–47726供体验。
- [x] 玩家确认本轮偏好页/操作/音量音色“这轮可以保留”，M9据此勾选。
- [ ] 其他画面、真实系统媒体/IME/设备、Safari/辅助技术/缩放/性能/完整昼夜远行与发布回退仍开放，原Web未退役。

具体命令、夹具与证据：[task49](../tasks/49-cocos-preferences-notices.md)。

## Cocos 行囊与四格 — 2026-10-17

- [x] 复用原批准Web布袋的未改PNG、原金币与5种PNG；9种原SVG符号可复现64px衍生，105绑定/真实类型与163图原审计通过。此次Cocos画面另行复核。
- [x] 最终主链11组/59图、预览边界4组/11图、聊天回归3组/9图和原技能帧3图，共82独立图；实际桌面/短横屏/图标按压/触屏/固定目标/聊天检查。无意外浏览器错误。
- [x] 四格/零引用/完整用途/钱包，真实播种/工坊制作/两处出售，拒绝/两次丢包同ID重连/迟到响应不抢Life，A↔B实际备份确认恢复、旧全局主动带入、可选存储写失败及仅删除B偏好通过。自然链和展示/近距夹具明确分开。
- [x] 5442同库完整players行切换指纹一致，备份保留；专用QA/浏览器/Node/Creator结束，人工预览40818/40820–40821供试玩。原Web/真实玩家数据保留。
- [ ] 玩家实际画面与手感批准；真实设备/系统IME/Safari/屏幕阅读器/文字缩放/性能/多日离线/实际迁移与退役仍开放。

命令、范围、录像、哈希与清理：[task47](../tasks/47-cocos-inventory-continuity.md)。

## Cocos data management and legacy continuity — 2026-10-17

- [x] Existing session page only: recovery/data tabs, truthful full export vs credential, named deletion/confirmation/cancel and uncertain-result retry. No new art/font/audio or source-asset modifications.
- [x] Isolated Chromium7 groups/20 captures cover actual cookie/file continuation, backup acknowledgement, downloads, rejection/retry, deletion reply loss/reload and revocation. Desktop1920/1440/1024 and landscape844/740, DPR2 touch/reduced motion; representative actual captures inspected. Deferred UI destruction fixes immediate download-return layout, verified at200ms.
- [x] Backend232 tests, shared core17 groups, real Creator build/78 bindings/types,395 originals+7 extraction checks and original Web build pass. Same-server fixtures only; no real-player database migration.
- [ ] Owner render/feel approval, physical devices/Safari/native focus/IME/screen reader/text scaling, PostgreSQL and target deployment/save cutover remain separate gates. No retirement approval implied.

Evidence, commands and cleanup: [task40](../tasks/40-cocos-data-management.md).

## Cocos functional panels and combat — phases4–5

- [x] Distinct linen/timber quest, trade/order, blueprint, resident, equipment/growth/spell, map and direct Life task/plan/timer/manual-history panels use native Chinese text and real server state. No fake possessions, teleport navigation or minted growth points.
- [x] Real first-story/first-floor progression, same-ID lost reward replay, rejected/retried purchase, Noah settlement, explicit point spending, study/plan/manual persistence and original cookie/recovery readback pass. Original Web source/launcher and owner saves preserved.
- [x] Real five-floor full-health combat, sequenced lost-tick replay, telegraphs, rest/soup, exact loot, safe/defeated retreat and one-time permanent gate use the unchanged rules. Full-depth QA uses an explicitly grown200 HP/stamina fixture; no naturally earned whole-chapter claim.
- [x] Desktop/short-landscape layouts and DPR2 real multi-touch/one-pointer release/input ownership/native touch attack/spark/soup/cooldown pass. Persistent direction targets and press intentions survive HUD receipts; Escape dismisses text editing before returning. Final representative actual screenshots inspected.
- [x] Genuine Creator3.8.8 build/types,62 source bindings, original Web build,229 backend tests,11 core groups +feature behavior,400 protected originals/7 extraction checks,156-image audit and supplied frame client pass. No new raster/font/external pack.
- [ ] Owner actual-render/feel approval; final art parity/icons; advanced AI/calendar/training conveniences; platform AppIDs/account/SDK/domain/developer-tool/device/Android package; Safari/accessibility/text scaling/safe areas/endurance remain open.

Commands, explicit fixture limits, screenshots, outcomes and cleanup: [task36](../tasks/36-cocos-features-combat.md).


## Cocos shared core and world — phases2–3

- [x] Original Web compatible helper entry points/build retained; extracted protocol/helpers checked against original source semantics. Server rules, migrations and source art preserved.229 backend tests and11 shared-core groups pass.
- [x] Original Web native character creation and credential restoration interoperate with Cocos preview/cancel/confirm/export; indoor saves, appearance IDs, resource counts, storage and timers remain server-authoritative.
- [x] Browser verification includes five real door enter/exits, home storage/rest, ferry fare/return, city/inn, locked departure, two lost responses + reload replay, failed/retried planting, modal ownership, blur and real DPR2 touch.
- [x] Actual desktop1440×900, landscape844×390/740×360 and resize-to1920×1080 captures inspected. Fixed both Canvas alignment and bottom-level render-window resize; control coordinates alone did not prove correct rendering.
- [x]52 unchanged PNGs/9 generated code modules have61 checked bindings. No source-image modification, numerical save import, real player reset, deployment or fake platform login.
- [ ] Full combat/advanced feature panels/Life editing, world-art parity, owner render/feel acceptance, platform accounts/SDK/file adapters, physical devices, Safari/screen readers/text scaling/safe areas/endurance and release performance remain open.

Commands, screenshots, runtime ownership and limitations: [task35](../tasks/35-cocos-shared-world.md).

## Cocos local migration prototype — 2026-10-16

- [x] Independent actual Creator3.8.8 project imports/builds for Web; original Web production build and227 backend tests pass. Explicit bearer guests preserve original cookies and saves; malformed credentials cannot silently replace a journey.
- [x] Browser flow: actual movement, rejected gathering, committed/lost-response replay, exact3wood/4stamina, inventory selection and non-consuming quick assignment, real planting, reload preservation and actual NPC greeting. NPC schedule test uses only the explicitly asserted isolated test DB.
- [x] Desktop1440×900 and landscape844×390 layout, DPR2 real touch start/release/selection/return, keyboard ownership and direct read-only Life access pass. Latest representative screenshots inspected. Full original-village visual parity is not claimed.
- [x] Existing source images remain unchanged;35 deterministic source bindings include28 PNGs and7 code files. No new raster/font/external pack, no player-data reset or deployment.
- [ ] Platform AppIDs/account verification, developer-tool and physical-device tests, Android packaging, Safari, screen-reader semantics, native text scaling, safe-area and endurance acceptance remain unverified. Owner render/feel review pending.

Scope, reproducible commands, evidence and cleanup: [task34](../tasks/34-cocos-local-spike.md).

## Next departure and return guidance — 2026-10-16

- [x] Actual workshop recap connects to a distinct cloth/linen journal with equipment, cave and growth bookmarks. State-aware tracker/manual menu access, dismissed guidance and manually tracked side quests checked. Existing art/asset bytes, rewards and server rules preserved.
- [x] Final production10groups/25captures: fitted desktop1440/1920/1024, fixed actions and explicitly scrollable reading leaf on844/740landscape, DPR2 touch/reduced motion, keyboard ownership/focus and Escape pass. Screenshots inspected; zero unexpected page/console errors, three injected503logs separate.
- [x] Actual rejected/retried sword purchase, exact96-gold spend, equip/reload, actual one-point NPC settlement and explicit magic spend pass. Pending promises allow cave play. No new reward or automatic growth, claim, movement or tutorial completion.
- [x] Optional per-save return slip uses refreshed server state after a simulated600-second absence, waits on failed refresh, preserves another open page, stays quiet through background polling and respects dismiss/side-quest ownership.15.5-second poll regression checked; native OS/tab switching not certified.
- [x] Build, policy checks,19 prior intro decisions,81 relevant backend tests,156-image audit,7solid contrast pairs(min5.67) and supplied frame client pass. Test-only fixture paths are asserted.
- [ ] Owner actual-render/feel approval, physical devices/Safari/zoom/screen readers, blocked storage, long-session endurance and full real-growth-to-departure chapter remain unverified.

Files, commands, screenshots, recording and cleanup: [task33](../tasks/33-next-departure.md).

## Functional popup compositions — 2026-10-16

- [x] Armory rack/work order, illustrated spell/cave/gate, paged paired storage, blueprint/counter and quoted route pages replace the remaining generic utility compositions. Menu/guide/settings use matching materials with explicit native pages.
- [x] Final production12 check groups/91 captures pass: desktop1440/1920,1024, landscape844/740, all captured bodies without vertical scrolling, no covered controls/content overflow. Default, selected, shortfall, ready, hover/focus/press, pending/error/retry, success and reload reviewed. Expected injected503 is separate from zero unexpected page/console errors.
- [x] Exact server purchase/craft/spell/store/withdraw/upgrade/counter/ferry/gate actions and real cave entry/retreat pass; input ownership,44px primary action, DPR2 touch and reduced motion checked. Final screenshots inspected.
- [x] Build,156-image preservation,7 solid contrast pairs(min4.96), supplied game frame client and format/diff checks pass. Test automation closes in finally; test services closed and manual preview identified in task32.
- [ ] Owner render approval, physical devices/Safari/native zoom/screen readers, expanded imported-recovery forms and full combat/departure endurance remain unverified. Existing old broad mouse-HUD obstruction is outside this visual family.

Files, commands, images, recording and cleanup: [task32](../tasks/32-field-panels.md).

## Overall tactile controls — 2026-10-16

- [x] Shared moss/linen actions, soft pockets and paper tabs applied across existing game and Life pages; market data cards replaced with small object shelves, rest actions made compact. Existing page archetypes and actual values retained.
- [x] Production build and final10-group/99-capture browser flow pass. Desktop1440/1920,1024 and landscape844/740 target layouts, DPR2 touch, reduced motion, normal-motion hover/press, keyboard focus, failure/retry and disabled/pending checked; final captures inspected. No empty family capture or new page runtime error.
- [x] Actual claim/trade/rest/equip/persistence, movement input ownership and five door enter/exits remain correct.156-image preservation audit,7 solid-color/gradient-endpoint contrast pairs(min4.96), skill frame client and formatting/diff checks pass.
- [x] Test browsers/contexts use finally cleanup; isolated test services closed and retained manual preview identified in task31.
- [ ] Existing long reading/menu surfaces may still scroll; this change refines their controls, while task30 board/shop/rest/gear fitted layouts keep explicit pages. Physical devices/Safari/native zoom/screen readers/endurance and owner render approval remain unverified.

Files, commands, screenshots, recording and cleanup: [task31](../tasks/31-living-controls.md).

## Requested world UI refinement — 2026-10-16

- [x] Five real facade collisions/door enter-exits, quieter NPC/road cues and compact1.8s edge notices checked.
- [x] Requested market, bedside, equipment and board layouts use existing Hearthwood art; fixed board title and explicit pages replace vertical scrolling.
- [x] Final production49 captures at desktop and phone landscape sizes pass in-viewport, unobscured-control and non-scroll checks. Actual screenshots, DPR2 touch and reduced motion inspected.
- [x] Claim rejection/retry grants exactly one reward; actual trades/rest/equip and reload/marker-only navigation pass. Relevant112 backend tests, production build,156-image audit,9 contrast pairs(min4.85) and skill frame client pass.
- [ ] Legacy broad mouse smoke remains blocked by the existing HUD pickup overlap; full gameplay regression is not claimed.
- [ ] Owner render approval, physical devices/Safari, native zoom and screen-reader/endurance checks remain unverified.

Files, evidence, commands and cleanup: [task30](../tasks/30-world-ui-refinement.md).

## First expedition — 2026-10-16

Status: implemented and browser-verified candidate; owner gameplay/visual acceptance pending.

- [x] Real new-guest starter claim → explicit departure briefing → purchase/equip → actual first-floor sword combat → carry loot back to workshop → inspect uses and save recap. No position, kill or drop fixture in this flow; original prices/rewards and magic0 exploration retained.
- [x]224 backend tests,19 UI policy decisions,6 flow groups/19 captures and7 control groups/4 captures pass; scoped rejection/retry/replay, reload, skip/resume, stored loot, recovery, tracked side quests and marker-only navigation checked.
- [x] Desktop1440/1920 and landscape844/720 layouts, DPR2 actual touch events, reduced motion, reading input and Life Mode/single canvas verified. Final two-frame-client captures and actual screenshots inspected.
- [x] Initial guide font inheritance corrected within this slice.15 visible text runs over actual hidden-text background pixels pass at minimum6.80:1; guide copy≥14px and actions≥44px. This is not a universal contrast audit.
- [x] No new art/font/audio/dependency/migration;156 existing images audited unchanged. No commit, push, deployment or normal player-data edit.
- [ ] Owner visual/gameplay confirmation, physical devices/Safari/native zoom/screen readers, complete real-growth-to-departure timing, full-cave balance and long-run/production-load checks remain open.

Files, commands, captures, recording and cleanup: [task29](../tasks/29-first-expedition.md).

## Day/night and sleep — 2026-10-16

- [x] Reuse the existing resident clock, native Chinese controls, tokens and source artwork; no new bitmap, font, sound or external pack.
- [x] New06:00 journey, 24-hour clock, midnight,01:00 faint, next morning at home, HP loss without sleep stamina recovery, free short rest and sleep-to-morning checked with deterministic rules and actual browser flows.
- [x] Life/reading, disconnect and pagehide pause; expired lease tails discarded; old-save migration, concurrent initialization, receipt replay and late yesterday movement preserve assets and state.
- [x] Production build,174 backend tests,9 feature flows/16 desktop/landscape/DPR2-touch captures and cleanup-wrapped skill frame client pass. Inspected the actual sleep, night and morning images; improved short-screen actions and kept morning feedback clear of the clock.
- [x] Existing keyboard/gameplay regression passes using a local compatibility copy that replaces the old intercepted gather click with physical keyboard approach/E. Unmodified mouse regression still stops at that existing HUD obstruction; no mouse-regression pass is claimed.
- [ ] Actual-render owner approval, physical devices/Safari, native browser zoom/screen readers, full-day endurance and final gameplay balance remain unverified. Production clock migration and lodging remain future work.

Files, commands, evidence and cleanup: [task26](../tasks/26-day-night-sleep.md).

## Approved world map — 2026-10-15

- [x] Owner-approved generated concept saved with its prompt; actual map render is a separate candidate.
- [x] Textless fine-pixel terrain and existing village buildings/bridge are combined with live Chinese DOM labels, state-bound markers and a selected-place leaf. Source/runtime image bytes, dimensions and provenance are recorded.
- [x] Five desktop/tablet/phone/short-landscape viewports captured and inspected. Index selection, pointer pan, button/wheel zoom, recenter, discovery changes, direction marking without teleport, Escape, minimum 44px controls and browser errors checked in an isolated fixture.
- [x] Actual game desktop/phone flow opened the map, marked a destination and returned with unchanged player position, inventory and XP; destination art fits its leaf without clipping.
- [x] TypeScript/Vite build and map browser review pass; source/runtime PNG byte identity verified.
- [ ] Physical device/Safari, native browser zoom, long-session performance and owner acceptance of the actual browser render remain unverified.

Evidence and exact commands: [world-map task](../tasks/24-world-map.md).

## Illustrated adventurer dossier — 2026-10-15

- [x] Owner approved concept v2; actual browser rendering remains a separate review candidate.
- [x] Identity/resources, five selectable illustrated abilities, contextual exact-cost spending and insufficient-point guidance implemented. Existing server quotes, save fields and upgrade rules retained.
- [x] Browser flow: free selection, pending lock, rejected purchase, lost-response replay, stale quote synchronization, all resource/knowledge/skill purchases, reload, focus/Escape, marker-only navigation and touch pass; 16 captures, no unexpected errors.
- [x] Six viewport layouts and large-text/commission-detail cases inspected; 16 visual captures and 834 visible text runs on actual texture pass, minimum 5.70:1. Existing game frame client passes.
- [x] TypeScript/Vite build, 35 relevant backend tests and five exact source-crop asset checks pass. Original sources preserved; generated prompt/crops/hashes recorded.
- [ ] Actual owner render approval, physical devices/Safari, native browser zoom and screen-reader testing remain unverified.

Commands, changed files, evidence and cleanup: [task23](../tasks/23-character-dossier.md).

## Village board and Lia dialogue — 2026-10-15

- [x] Owner approved both generated directions; concept approval and original prompts are recorded. Actual render remains a candidate.
- [x] Timber/pinned-notice board and scene/low-dialogue Lia layout implemented with native Chinese content, existing quest state, actual actors and existing item identities. Noah and other panel treatments retained.
- [x] Real objective completion, exact reward turn-in, failed/retried mutation, pending duplicate guard, locked selection and reload checked in an isolated database. Lia request acceptance/folding/farewell, Escape, focus return, focus wrap and first-continue text reveal checked.
- [x]22 captures at1440/1920/768/390/720 and375/DPR2 touch;125% text and reduced motion inspected. Narrow/short views scroll; no horizontal overflow or undersized changed controls. Close latch has a reserved text gutter.
- [x] Build,53 backend game tests, skill movement/modal input bursts,125-image audit and3 new asset checks pass. Six actual-texture cases /136 text runs /minimum5.00:1.
- [ ] Original broad mouse regression did not pass its pickup click because an existing HUD interaction prompt intercepts it. Scoped public keyboard/E route and changed-page mouse/touch flows pass; no broader pass claimed.
- [ ] Physical device/Safari/native browser zoom/screen reader and actual owner render acceptance remain pending.

Evidence, exact commands, limitations, retained preview and cleanup: [task21](../tasks/21-board-library-dialogue.md).

## Daily growth journal — 2026-10-15

- [x] Owner approved the calendar/daily-journal concept; actual DOM implementation is a separate candidate.
- [x] Asymmetric moss/linen journal, real balances and quota, record-marked calendar, selected-day task/history, filters and paging implemented. Text and controls remain DOM; one new original blank surface has exact source/runtime provenance.
- [x] Month/day/keyboard navigation, return-to-today, acceptance-day/overnight archive, due-without-auto-reward, marker-only navigation, cancellation rejection/retry, persistence and focus return pass. Existing48-capture commission flow regression passes with no unexpected browser errors.
- [x] Six desktop/tablet/phone/landscape sizes,375px/DPR2 touch, large text and reduced motion checked.15 dedicated captures inspected;1,092 actual-texture text runs, minimum5.13:1.
- [x] TypeScript/Vite build,19 relevant backend rules tests, deterministic date/quota checks,125-image shared-art audit and diff/format checks pass.
- [ ] Physical devices/Safari, native zoom, actual screen-reader testing and actual-render owner acceptance remain unverified.

Files, exact commands, evidence, limitations and cleanup: [daily journal report](../tasks/20-life-journal.md).

## Fine pixel village — 2026-10-15

Status: approved concept implemented; actual owner render acceptance pending.

- [x] Current outdoor village uses original fine scenery, independent depth layers,48×64 actors, real four-direction walking, consistent HUD/dialogue identities, reduced flower density and fine soil. Existing map/collision/anchors/IDs and server mutations preserved.
- [x] Roof hit bounds and NPC approach spacing match the new presentation; canopy occlusion remains legible. All four entrances/exits, bridge route, keyboard/input ownership, save reload, six appearances, five viewports and DPR2 emulated touch checked in the actual production build.
- [x]21-capture feature suite, existing play-mode regression, actual planting rejection/pending/lost-response retry, game skill frame client, TypeScript/Vite build and108 backend tests pass. Unexpected feature-console errors: zero. Final screenshots/contact sheets opened and inspected.
- [x] Three original built-in generated source sheets, exact prompts, reviewed cuts/complete walk poses, explicit palette derivatives and48 runtime PNGs recorded.88-image audit verifies prior files and new source/runtime hashes; code-native ground/soil and rebuild hashes included. No vendor pack/font/audio change.
- [x] Task automation browsers/runners closed in finally; old DEV service stopped. Fixed preview5211 and isolated API8043 retained for owner review, with process/HTTP verification at handoff.
- [ ] Physical Safari/devices, native browser-menu zoom, long-session memory/performance, complete accessibility audit and actual owner render acceptance remain unverified. Interior backgrounds and new upgrade facades remain outside scope.

Exact files, commands, source/prompt/manifest links, screenshots, compatibility test disclosure and cleanup: [task18](../tasks/18-village-fine-art.md).

## Active commission contract — 2026-10-14

- [x] Second approved preview implemented for Noah active/ready state: curled parchment, live sand hourglass, status ribbon, pending reward seal and matching dialogue; waiting closes, deadline enables the real settlement action.
- [x] Two original textless materials and original SVG sand have prompts/source/runtime hashes, transparent alpha and lossless pixel equality;35-image audit passes. DOM text/actions and existing actor/world preserved.
- [x] Production build,19 commission rule tests,39-capture feature suite, play-mode regression and frame client pass; no unexpected console errors. Close/reopen, midpoint/deadline, rejection/retry, cancellation, quotas, story and focus verified.
- [x] Desktop/tablet/phone/short-landscape/DPR2 touch, scrolling rules,125% text enlargement and reduced motion checked. Actual screenshots inspected. Actual texture audit:12 cases/262 runs/minimum4.75:1; separate computed CSS cases minimum4.51:1.
- [ ] Actual owner acceptance, physical devices/Safari/screen readers, native browser-menu zoom and long endurance remain unverified.

Evidence, commands, assets and retained preview: [active contract report](../tasks/16-commission-contract.md).

## Noah wooden commission board — 2026-10-14

- [x] Owner-approved preview implemented for Noah: riverside actor stage, timber frame, paper task slips, hour tokens, live quota/reward and one main action. Existing commission rules and story topic preserved.
- [x] Two original textless assets packaged losslessly with prompts/hashes; existing actor and world unchanged. All Chinese text and controls remain DOM. 33-image/source audit passes.
- [x] Production build, 19 commission backend tests, final 30-capture browser feature suite, play-mode regression and skill frame client pass. Zero unexpected browser errors; 28 contrast cases / 828 runs / minimum4.97:1 using computed CSS backgrounds.
- [x] Desktop/tablet/phone/short landscape, 375px/DPR2 touch, scrolling, focus wrap, Escape, expanded rules, reduced motion and larger journal text checked. Actual screenshots inspected; close remains visible while scrolling.
- [ ] Owner acceptance of the actual implementation, physical Safari/devices, native browser-menu zoom and multi-hour endurance remain unverified.

Evidence, commands, asset provenance and cleanup: [commission board report](../tasks/15-commission-board.md).

## Character point allocation — 2026-10-14

- [x] Owner-approved concept implemented with vitality/stamina, five concrete growth paths, three available point balances and exact-cost purchases; no EXP display in the dossier.
- [x] Server prices, compatibility defaults, concurrency/retry guards, receipt deltas and reload/recovery verified; existing XP/inventory preserved.
- [x] Production build, 108 backend tests, 15-capture browser flow, existing play-mode regression and game frame client pass; no unexpected browser errors.
- [x] 1440/1920/768/390/720 layouts, DPR2 touch, large DOM text, keyboard/focus and reduced motion checked. Actual captures inspected; 77 text runs/minimum 4.97:1.
- [x] Existing 31 source/runtime images preserved; only the approved concept reference and prompt added outside runtime.
- [ ] Physical device/Safari/native browser zoom and owner acceptance of the actual implementation remain unverified. Combat/skill effects remain outside scope.

Evidence and cleanup: [character points task record](../tasks/14-character-points.md).

## NPC reality commissions — 2026-10-14

- [x] Noah dialogue choices → hours → timed acceptance → settlement/cancellation; three point types and five-point daily quota are server-authoritative. Early, repeated and concurrent commands are covered.
- [x] HUD growth entry is a journal with real active/settled/cancelled records, truthful marker navigation and retained legacy records. Legacy note completion cannot mint new points.
- [x] Existing NPC art/tokens/icons reused; no new artwork or font. Desktop/tablet/phone/short-landscape/DPR2 emulated touch, keyboard/Escape/focus, reload, reduced motion and larger text checked.
- [x] 95 backend tests, production build, 24-capture feature flow, focused and complete world regressions, and skill frame client pass. No unexpected console errors. Contrast: 22 cases, 705 runs, minimum 4.97:1.
- [ ] Actual owner acceptance, physical devices/Safari/native zoom, multi-hour real-time endurance and production PostgreSQL load remain unverified. Browser maturity states use an explicitly isolated fixture.

Evidence, exact files/commands and retained preview: [NPC commission report](../tasks/13-life-commissions.md). Separate concurrent character-panel changes are excluded from this checkpoint.

## Knowledge research — 2026-10-14

- [x] Learning completion awards an actual point once; selected science/magic investment, receipt deltas, current levels and provenance follow authoritative state.
- [x] Existing journal material, palette and icons reused; connector UI is original code. No new bitmap/font/audio; all 31 image/source checks pass.
- [x] Desktop/tablet/phone/short-landscape, 375 DPR2 touch, larger DOM text, keyboard/IME/tab ownership, pending/rejected/lost-response/conflicting actions and reload checked. Sources and 6+ level marks inspected.
- [x] Duplicate completion toast no longer covers the mobile research button; paper margins keep text off the darker edge. Ten actual texture contrast cases / 328 text runs / minimum 4.94:1 pass.
- [x] 76 backend tests, production build, 22-capture feature flow, original real-minute learning flow, 19-capture health regression, play-mode regression and game frame client pass. No unexpected console errors.
- [ ] Physical Safari/iOS/Android, native browser zoom/keyboard and production PostgreSQL concurrency/load unverified. Owner visual approval pending.

Files, commands, candidate screenshots and handoff: [knowledge growth](../tasks/12-knowledge-growth.md).

## Travel-kit HUD — 2026-10-13

Concept owner-approved; actual implementation verified and awaiting visual review.

- [x] Unified bottom rail, original pixel-object icons, actual appearance, identity/resources, quest note and utility keys; original actions and real quantities retained.
- [x] Five desktop/phone/tablet/landscape viewports, DPR2 emulated touch at 375/390/844, reduced motion, long name, focus and 44px controls checked; screenshots inspected.
- [x] Navigation/shortcuts, input/IME isolation, quick-slot assignment/reload/no consumption, sound persistence, marker-only guidance and existing full play-mode flow pass.
- [x] Build, 31-image/source audit and diff check pass; 57 HUD text samples, minimum 5.67:1; no unexpected console errors.
- [ ] Physical Safari/mobile devices/native browser zoom and actual owner acceptance remain unverified.

Evidence, exact commands and cleanup: [HUD task record](../tasks/10-hud-travel-kit.md).

## Woodland cottage and yard — 2026-10-13

Status: implemented and browser-verified candidate; **owner visual approval pending**.

- [x] One walkable home/yard slice, recognizable reading book and separate upgrade manual; unchanged collision/spawn geometry and existing IDs.
- [x] Actual approach/door/exit, reading→study→return/focus, storage conservation, rest, rejected/pending/accepted gathering and held-key handling checked.
- [x] 1440/1920/768/390/720 layouts and DPR2 emulated-touch 390/375/844, reduced motion, wall collision and short-landscape entry checked; final screenshots inspected.
- [x] 54 backend tests, production build, existing full game regression, final 25-capture cottage suite and skill frame client passed; no unexpected browser errors.
- [x] 31 source/runtime images unchanged; new original procedural artwork/source hash documented and audited. No new raster, font, sound or external acquisition.
- [ ] Physical Safari/iOS/Android and native browser zoom unverified.
- [ ] New upgrade appearances and furnishing-save expansion await owner's next authorization. Current candidate is not owner-approved.

Evidence and commands: [cottage prototype](../tasks/09-cottage-prototype.md).

## Study journeys — 2026-10-13

Status: implemented and browser-verified candidate; owner visual approval pending.

- [x] Plan/day/book history, reversible archive, title/time editing and recovery credential preview use real server state and existing Hearthwood art.
- [x] Desktop and phone layouts, 375px/landscape, large DOM text, focus containment, IME and reduced motion checked. Phone now prioritizes the selected chapter.
- [x] Real 62-second Chromium lifecycle freeze, second-tab pause, foreground/reload recovery, offline action rejection and lost-response retry checked.
- [x] Cookie-free recovery restores the latest server state with no repeated rewards; old v001 database survives migration to v002.
- [x] Twelve texture-sampled contrast cases / 302 text runs, minimum 4.89:1; 31-image source/hash audit passes.
- [ ] Physical Safari/iOS/Android lock-screen tests, native browser zoom and long background suspension remain unverified.
- [ ] Owner visual approval pending. Evidence and exact command outcomes: [study journey](../tasks/08-study-journey.md).

## Today study — 2026-10-13

Status: **implemented and verified; owner visual review pending**.

- [x] One complete learning-task/timer/record/growth/restore flow, existing art/tokens and authentic values; no duplicate completion rewards.
- [x] Actual desktop/mobile create, real-minute timer, pause/restore, failed/retried commands, association and unlock marker checked.
- [x] 1440/1920/768/390/720 layouts inspected; touch/DPR2, 375px/landscape, enlarged DOM text, keyboard/IME/Escape/focus and reduced motion checked.
- [x] 44 backend tests, production build, original full game smoke, frame client and 31-image audit pass. Final sampled text minimum 4.97:1 over 10 cases / 268 runs.
- [ ] Physical-device Safari/keyboard, actual browser-menu zoom and long-term operation remain unverified.
- [ ] Actual visual acceptance by owner remains pending.

Files, commands, screenshots, scoped provenance and retained preview services: [today-study report](../tasks/06-today-study.md).

## World-dialog candidate — 2026-10-10

Status: **implemented and verified; actual owner visual review pending**. User explicitly requested the six pictured dialogs after the earlier reference slices.

- [x] Wood/seed identities corrected with original 16px reproducible icons; stable IDs/quantities and all previous source hashes retained.
- [x] Distinct commission board, conversation, map, storage tray, repair order and efficient growth-recording compositions; shared Hearthwood controls/materials.
- [x] 1440×900 / 390×844 plus 768×1024 / 1920×1080 / 720×450 captured and inspected. Scrolling, no horizontal overflow, 44px DOM controls and keyboard place-marker alternatives checked.
- [x] Actual storage rejection/pending/retry/duplicates/conservation/persistence, focus/Escape/input ownership, emulated touch and isolated DEV preview checked.
- [x] Build, 32 backend tests, full smoke, RPG and journal regressions, 31-image asset audit and pixel rebuild check pass. Functional text sample minimum 4.65:1 across 36 cases.
- [ ] Physical-device Safari/touch, native mobile keyboard and browser-menu zoom unverified.
- [ ] Owner visual review pending; no further rollout.

Exact files, commands, recordings, limitations and final preview/cleanup: [task report](../tasks/05-world-dialogs.md).

Status values: `not started`, `implemented`, `verified`, `blocked`, `owner-approved`.
Do not pre-check a row because a component exists. Attach evidence and record the actual browser, viewport, scale, fixture, and commit.

## Reference record

- Candidate name: Hearthwood satchel inventory — 2026-10-10 (concept approved; actual render candidate)
- Commit or diff: uncommitted diff over `f1f9fe5`; no commit/push/deploy performed by this task.
- Primary world asset family: existing Ninja Adventure subset + project procedural art, unchanged; world reapproval outside this checkpoint.
- UI source family and exact selected files: original CSS + `styles/realquest-tokens.css` + generated `frontend/public/assets/hearthwood/satchel-shell-v1.webp` (source/prompt and lossless build recorded in manifest); existing `frontend/public/assets/ninja-adventure/icons/{seed,wood,stone,crop,plank,gold}.png`. Eight supplied UI PNGs remain source references only.
- Fixture/save identifier: isolated guest 林间旅人, appearance 0, position (240,320), seed 6 / gold 20; same cookie for before/after (`output/inventory-satchel/starter-session.json`, local only). Separate test guests for mutations.
- Viewports and device pixel ratios: Chromium 1440×900 / 390×844 / 1920×1080 / 768×1024 at DPR1; 390×844 emulated touch at DPR2; 720×450 effective reflow.
- Screenshots: [desktop candidate](../../output/inventory-satchel/after-1440.png), [phone tray](../../output/inventory-satchel/after-390.png), [phone details](../../output/inventory-satchel/after-390-details.png). Complete evidence in the task record.
- Interaction recording: `output/inventory-satchel/inventory-interaction.webm`; real action rejection/pending/commit snapshots and result JSON alongside it.
- Owner approval and date: **Satchel concept approved 2026-10-10; actual browser implementation not yet approved.**

## Visual checks

- [ ] World scale and HUD scale are independently correct.
- [ ] The player, doors, tools, and props have coherent proportions.
- [x] Pixel images are crisp; DOM text remains normally rendered.
- [x] The starter inventory works visually with only one occupied slot.
- [x] Empty slots do not overpower items or the primary action.
- [x] Title, quantity, selected state, and main action are readable.
- [x] Inventory has a compact timber nameplate, cloth silhouette, detached item tag and sewn pocket row; other screens were not redesigned.
- [x] Important text meets the contrast requirement on the real background.
- [x] Narrow layouts do not shrink desktop text or create horizontal overflow.
- [x] Inventory actions are in normal flow, with no sticky overlay covering content; world targeting is deferred.

## Interaction checks

- [x] Mouse, keyboard, and touch alternatives reach the same supported actions.
- [ ] Partial: selected/bound/depleted/pending/error states verified. Invalid world-target state is deferred to Pass B.
- [x] A quick-slot assignment does not consume the item.
- [x] A navigation action describes marking/pathfinding accurately.
- [x] Input fields and IME composition do not trigger world controls.
- [x] Escape dismisses the inventory and restores its opener; targeting cancellation remains deferred.
- [x] Blur and mode transitions clear held keys.
- [ ] Targeting shows an actionable valid plot, not an unrelated decoration.
- [x] Planting updates the actual inventory and world state.
- [x] Rejection, retry, duplicate activation, and reload are handled correctly.
- [ ] Sound and animation are optional, restrained, and nonblocking.

## Integrity and scope

- [x] Existing saves, item IDs, costs, and progression remain compatible.
- [x] Real before/after inventory is unchanged. Artificial stress fixtures are confined to the clearly labeled development preview.
- [x] Demo data cannot mutate a real save.
- [x] No new engine, full map rewrite, or unrelated economy change was introduced.
- [x] Original asset files remain unchanged and provenance is recorded.
- [x] Missing files/frames are documented rather than invented.
- [x] No source pack enters the runtime bundle. One generated lossless WebP shell is audited and packaged; original PNG/prompt stay outside public. Existing world assets are unchanged.

## Evidence

- [x] 1440 x 900 desktop captured.
- [x] 1920 x 1080 desktop checked.
- [x] 768 x 1024 tablet checked.
- [x] 390 x 844 mobile captured.
- [ ] Partial: DPR2, keyboard, reduced motion and 720×450 effective reflow verified; actual browser-menu zoom unverified.
- [x] A real touch test is recorded, or explicitly marked unverified.
- [x] Relevant build/type/test commands and outcomes are listed.
- [x] Browser console and failed network requests were examined.
- [x] Before/after captures use the same state and viewport.
- [x] At least one real operation flow was executed; not just screenshotted.

## Findings

| Severity | Observation | Evidence | Fix or deliberate exception | Status |
|---|---|---|---|---|
| Scope | Numeric shortcuts open inventory on a selected item, not a planting target | Existing scene/store + browser checks | Truthful labels; targeting remains Pass B | verified / deferred |
| Data | 24 cells are not a server-enforced capacity | `rules.py`, `types.ts` | Preserve cells; report owned types instead of false capacity | verified |
| Visual | Initial plain linen candidate felt like a dashboard | Owner-approved satchel concept and matched final images | Cloth shell, compact floating tag, sewn pockets; actual implementation needs review | verified candidate |
| Layout | Coin label overlapped the plaque during refinement | Final browser screenshot and new hit-test assertion | Anchored beside the close latch; earned-resource row tested on phone | verified |
| Asset | Supplied UI frames use unrelated saturated palettes | Contact sheet + source hashes | Keep source-only; use shared token CSS | verified |
| Access | Keyboard focus could leave inventory at the Tab boundary | Browser flow | Scoped focus loop + native Escape/focus return | verified |
| Limits | Real touch/Safari, actual browser-menu zoom, global world scale | Test scope record | Emulated touch/DPR2/reflow only; no broader approval | unverified |

Only extend this visual treatment across the application after the first reference has actual owner approval. A candidate screenshot is not a signed-off baseline.

Detailed commands, exact files, comparison, test outcomes and gaps: [Pass A task record](../tasks/01-inventory-slice.md). All checked items are scoped to this inventory candidate, not blanket approval of the application.

The current source of truth is the **Current checkpoint — satchel candidate** section of [the task report](../tasks/01-inventory-slice.md). Final visible text check: 21 samples, minimum 5.37:1 against opaque base colors. Physical Safari/touch and actual browser-menu zoom remain unverified. Concept direction approval does not authorize rollout before review of this rendered candidate.

## Character dossier reference — 2026-10-10

Current record: **verified implementation / owner review pending**. This is a separate character checkpoint, not a journal layout copied to another screen. Earlier inventory historical status is superseded by its recorded owner approval in `docs/tasks/01-inventory-slice.md`.

- [x] Real avatar/appearance, five attributes, EXP remainders, levels, thresholds and existing abilities/actions retained.
- [x] Single field-folder composition, live identity and growth marks, distinct from the journal spread.
- [x] 1440×900, 390×844, 768×1024, 1920×1080 and short 720×450 layout captured; mobile scroll and 44px controls checked.
- [x] Keyboard focus cycle/return, Escape, modal input ownership, non-teleporting markers and map action checked.
- [x] Actual learning/strength thresholds, level transitions, pending/rejection/retry, persistence and four-material collection checked.
- [x] 59 visible text runs checked against sampled actual texture beneath their ranges; minimum 4.63:1 after fixing legacy gold small text and faint supporting copy. This is scoped captured-state evidence.
- [x] Source/hash/pixel audit, build, 21 backend tests, existing RPG and journal regression passed.
- [ ] Physical-device touch/Safari and actual browser-menu zoom unverified (Chromium DPR2 touch and reflow checked).
- [ ] Matched old/new browser comparison unavailable: initial old-view capture was contaminated by hot reload; reconstruction attempts did not yield a reliable screenshot. Invalid evidence excluded. Final real views and unmutated starter state verified independently.
- [ ] Owner visual approval pending. No further dialog rollout.

See `docs/tasks/03-character-slice.md` for files, provenance, commands, screenshots and cleanup.

## Village arrival reference — 2026-10-10

Status: **verified implementation / owner review pending**. Owner approved the homepage concept and requested softer registration controls plus additional appearances; actual browser acceptance is separate.

- [x] Full-screen welcome illustration, live small traveler, signature line and six portrait tags, using Hearthwood paper/cloth/wood colors. Actual text/controls remain DOM.
- [x] Original IDs 0–2 remain byte-identical; three official CC0 walking sheets added as 3–5. All six create/reload/world/dossier flows checked; starter values unchanged.
- [x] 1440×900 / 390×844, 768×1024, 1920×1080 and short 720×450 screenshots inspected; no horizontal overflow; phone CTA visible and short-screen scrolling reaches action.
- [x] Keyboard, IME, reduced motion, 44px touch controls, rejection/pending/lost-response retry and duplicate-submit protection checked. Test contexts isolated from owner data.
- [x] Actual-background text sampling passes for desktop/phone default and hover, minimum 4.97:1. Build, 32 backend tests, existing RPG suite, game frame client and 29-image audit pass.
- [ ] Physical-device Safari/touch and native mobile keyboard/browser-menu zoom remain unverified.
- [ ] Actual render awaits owner visual approval; no further screen rollout.

See `docs/tasks/04-arrival-slice.md` for complete files, provenance, commands, captures, gaps and preview handoff.

## Health and stamina field journal — 2026-10-14

Status: implemented and browser-verified candidate; owner visual approval pending.

- [x] One daily exercise pledge, explicit manual records/linking, one health point, visible investment cost and capacity preview, real gathering/bed/time recovery.
- [x] Existing village/actor artwork and Hearthwood tokens; no bitmap/font/audio addition or fabricated possessions. Manifest reuse binding recorded; 31-image audit passes.
- [x] Desktop 1440/1920, tablet 768, phone 390, 720 reflow and DPR2 touch 375/844 inspected. Keyboard/IME/world ownership, focus return, scrolling, 44px buttons and reduced motion checked.
- [x] Failure, committed-response retry, duplicate linking, pending investment, persistence, zero stamina and marker-only bed navigation checked in an actual Chromium browser. Six contrast states / 190 text runs / minimum 4.97:1.
- [x] 64 backend tests, build, focused play-mode regression, full desktop/mobile game regression and skill frame client pass. No unexpected console errors.
- [ ] Physical Safari/iOS/Android, native browser zoom and actual owner acceptance remain unverified.

Files, exact commands, screenshots/video, rules and retained-preview/cleanup evidence: [task 11](../tasks/11-health-stamina.md).

## Noah acceptance, receipt and small talk — 2026-10-15

Status: implemented and browser-verified candidate; the three concepts are owner-approved, actual render acceptance pending.

- [x] Offer uses task slips, type illustration, exact pending reward/hour tokens and signing; receipt shows only server-confirmed credit, supports another promise/history/close; small talk shows actual dialogue and quest letter without reality quota.
- [x] Actual story acceptance/turn-in, claim rejection/retry/lost response, duplicate rewards, daily quota, topic persistence, keyboard focus/Escape, scrolling and DPR2 touch checked in isolated data.
- [x] Desktop1440/1920, tablet768, phone390/375 and720 reflow screenshots inspected; final phone CTA inside initial viewport,125% text and reduced motion checked.
- [x]48-capture feature suite/no unexpected errors,19 backend commission tests, build, existing play-mode flow, frame client and40-image hash/pixel audit pass. Actual texture:34 cases/690 runs/min4.68:1; computed46 cases/888 runs/min4.51:1.
- [x] Five textless built-in generated props retain original PNG/prompt/alpha and exact lossless runtime pixels; no vendor/font addition or invented possessions. Other NPC/world structures preserved.
- [ ] Physical devices/Safari, native browser zoom, actual screen-reader/device testing and owner render acceptance remain unverified.

Exact files, commands, source/prompt paths, screenshots, fixture disclosure and retained preview/cleanup: [task17](../tasks/17-commission-pages.md).

## Fine HUD/items and existing interiors — 2026-10-15

- [x] Five floating HUD surfaces share fine moss/linen/timber materials and native readable type; high-resolution original head/item art replaces coarse enlargements. Real counts and empty slots remain truthful.
- [x] All four existing rooms use fine floors/walls and independent furniture at two native pixels per world unit. Collision/door/action anchors, IDs and authoritative transitions retained; one exit caption.
- [x] Build,108 backend tests,21-capture village regression,12 HUD cases,23 room captures and inventory mutation/retry/reload checks pass. Desktop/phone images inspected.
- [x] Four viewport texture checks in default/hover states:8 cases /188 text runs, minimum5.47:1. Numeric pockets and short-landscape prompt placement corrected from actual rendered evidence.
- [x]33 original runtime assets /690,923 bytes, exact prompts/cuts/hashes and reproducible packing recorded;125 source/runtime images audited. Existing source packs/runtime image bytes preserved.
- [x] Final cottage25-capture suite and2-iteration game frame client pass; owned browsers/runners verified closed. Preview5211/API8043 intentionally retained for review; other active-task/shared tools preserved.
- [ ] Actual owner approval, physical Safari/mobile devices, native browser-menu zoom and multi-hour endurance remain unverified.

Evidence, commands, file scope and preview cleanup: [HUD/interior report](../tasks/19-hud-interiors.md).

## Village market and livelihood — 2026-10-15

Status: implemented and browser-verified candidate; owner visual approval pending.

- [x] Walkable shop/path/interior and Mira; server-priced trades, three daily deliveries and two story quests connect gathering/farming to income and home improvement.
- [x] Actual60-second farming, sales, all orders, home upgrade, persistence, rejection/retry, lost-response reconciliation and reward-once checks pass;124 backend tests pass.
- [x]25 flow captures across desktop/tablet/phone/short reflow, emulated DPR2 touch/reduced motion, focus/keyboard isolation and marker-only map navigation verified. Nine final layout states/357 actual-texture text runs pass, minimum5.53:1;44px controls, enlarged375px text and bottom-action scrolling checked.
- [x] Original generated shop/counter preserve exact sources/prompts/alpha with reproducible packing;211,708 runtime bytes. Final shared-tree audit133 images passes. Mira's appearance5 reuse is explicit, not claimed unique art.
- [x] TypeScript/build, skill frame client and diff checks pass. Owned test browsers/runners exited; fixed5295/API8095 isolated preview intentionally retained and health checked.
- [ ] Owner render acceptance, physical devices/Safari, native zoom, screen readers and multi-day economy/endurance unverified. Existing distant-exit HUD pointer overlap remains documented; keyboard door flow passes.

Exact files, commands, captures, fixtures, provenance, remaining scope and cleanup: [market report](../tasks/22-village-market.md).

## Village residents — 2026-10-16

Status: implemented/browser-verified candidate; actual owner render approval pending.

- [x] Three independent NPC identities across world/portrait/map/dialogue; six player sheets unchanged. Nine runtime PNGs/210,614bytes, exact prompts/crops/hash/rebuild and original alpha sources recorded;142-image audit passes.
- [x] Walkable daily routes, door transitions, midday gathering, evening whereabouts, neighbor book and marker-only navigation. Shared active world clock pauses for reading/background/leave; real deadlines and quotas remain separate.
- [x] Contextual topics, finite gifts/help, familiarity story gate, remote/stock/stamina rejection, concurrency, idempotent retry and preservation covered;140 backend tests pass. Shop counter remains usable while Mira is out; Noah's indoor quest/commission access verified.
- [x]20-capture actual browser flow,36 final desktop/landscape layout states,1061 actual-texture text runs/min4.79:1,44px controls, focus/world ownership, scrolling/close, DPR2 touch/reduced motion, build/frame-client/format/diff checks pass. Screenshots inspected.
- [x] Owned browsers/runners/fixture services closed; fixed5295 preview and normal8095 API intentionally retained/healthy. No player-data reset or commit/push/deploy.
- [ ] Physical devices/Safari/native zoom/screen readers, full-day/endurance and owner render acceptance remain unverified. Portrait phone review is outside current scope. Sleep/fainting/lodging/weather/seasonal schedules remain future work.

Exact scope, files, source prompts/provenance, commands, fixtures, screenshots/recordings and cleanup: [resident report](../tasks/25-village-residents.md).

## Departure and city lodging — 2026-10-16

Status: independent travel/lodging implementation verified candidate; owner visual approval pending. These historical task27 checks do not certify the village combat prerequisite; its later implementation and evidence are recorded separately in task28.

- [x] Existing save can accept the new chapter, choose bridge/ferry, prepare rope/current stamina, cross the mountain, deliver the letter, pay for a valid night, wake in the inn, return and claim once. Map navigation only marks direction.
- [x] Server quotes/rechecks arrival before01:00, shortfalls, daily work, permanent bridge/rope, proximity and day/location;15 new tests and174 retained tests pass, including rejected/concurrent/replayed mutations, old save conservation and reachable interaction/arrival points.
- [x] Original static Adu/Lanya are distinct from the existing cast; matching actors/figures/portraits and cliff/boat have immutable sources/prompts and reproducible hashes.10 runtime PNGs/599,517bytes;156-image audit passes. Old player/resident art retained.
- [x] Final production14-flow/23-capture browser suite and9-flow/16-capture prior sleep regression pass, zero unexpected browser errors. Desktop and landscape, keyboard/focus/held input, scrollable actions, DPR2 touch/reduced motion and morning-dismiss HUD behavior checked; actual images inspected. Supplied frame client passes2 iterations; TypeScript/build, formatting and diff checks pass.
- [ ] Owner render/gameplay balance, physical devices/Safari/native zoom/screen readers, multi-day endurance and production PostgreSQL load remain unverified. No combat, technology/magic effects or home expansion added. Combat-first integration awaits its own slice.

Source paths, exact commands, screenshots/recordings and cleanup: [task27](../tasks/27-departure-city.md).


## Village combat — 2026-10-16

Status: playable implementation candidate; owner visual and balance acceptance pending.

- [x] Four distinct weapon data/recipes, armory/equipment/spell panels, five-floor cave, original enemy geometry/telegraphs and unique boss key; no new third-party, raster, font or audio assets. Existing156-image audit passes.
- [x] Actual production keyboard run clears all five floors, collects the boss key and permanently opens the gate only at magic3; purchase retry, crafting shortages, menu pause and reload checked. Screenshots were inspected.
- [x] Control6-flow/7-capture suite checks initial sword/Boss phase2, defeat, DPR2 touch landscape, paused inputs, injected blur/resume and retreat; final cave frame client2 captures inspected. Task28 records exact scope and cleanup.
- [ ] Owner art/balance acceptance, native tab/OS focus, physical devices and long-run/production-load verification remain pending; build/test passes do not establish them.


## Web/Cocos cave polish — 2026-10-17

Status: implemented/browser-verified candidate; owner render/feel approval pending.

- [x] Shared original stone/moss/shelter/route art and four creature silhouettes in both engines, same world/collision/actor scale. No new raster/font/audio/third-party pack;52 Cocos PNGs byte-identical,156-image audit passes.
- [x] Pure click/T targeting, stable held attack across receipts, release without extra hit, same-ID/sequence lost-reply replay with exact one loot, actual spell/cast/cooldown/safe soup, menu/blur pause and safe retreat preserve server authority.26 retained combat tests include soup interruption; original data/rules untouched.
- [x]16 browser groups/42 captures, desktop1920/1440/1024 and landscape844/740, real DPR2 multi-touch/release/held attack and reduced motion pass with no unexpected errors. Before/after renders, four families, confirmed damage text, cast progress, short layouts and four supplied frame-client captures personally inspected. Native feedback-layer ordering is asserted.
- [x] Both genuine builds,64 bindings/actual Creator types,11 core groups, pure cave tests,396 preserved original sources+7 extraction checks and formatting/diff checks pass. Test resources close normally; manual isolated dual preview is intentionally retained (identities in task37).
- [ ] Owner actual render/feel, physical devices/Safari/native focus/IME/text scaling/screen readers, production weak-network and long-session checks remain open. Non-cave temporary artwork and platform release/account gates remain separate work.

Files, commands, fixture limits, art provenance, screenshots/recordings and cleanup: [task37](../tasks/37-cave-polish.md).


## Web/Cocos village and home — 2026-10-17

Status: implemented/browser-verified candidate; owner render/feel approval pending.

- [x] Reused existing fine-village/room family, independent source-scale furniture, correct open-chest dimensions, real facade/furniture hit areas and readable route/focus cues. Seven byte-reproducible terrain/floor/rug derivatives; existing source art unchanged.64 Cocos PNGs/78 total bindings;163-image audit passes.
- [x] Actual village→home→storage/reading/short-rest→doorway return/reload works. Rejection/lost-reply replay preserves exact6/0→5/1→6/0 seed totals and request IDs. Escape/manual input/blur cancels routes, and Escape during delayed position sync prevents a late panel opening.
- [x] Two-engine20-group suite plus updated11-group Cocos rerun and six final targeted checks pass with zero unexpected errors.21 distinct core flow groups/41 unique captures; four supplied frame-client captures. Desktop and landscape, DPR2 touch, reduced motion, real scheduled NPC poses, idle release, canopy visibility, native storage44px targets and cave spacing reviewed in actual images.
- [x] Both genuine builds/actual Creator declarations, pure scene/helper/core checks,395 protected originals+7 extraction checks,87 game/daynight backend tests, reproducible art/preserved metadata, formatting and diff checks pass.
- [ ] Owner actual render/feel, physical devices/Safari/native focus/IME/accessibility/text scaling, miniature-platform payload/VRAM and long sessions remain open. Farming/advanced item/travel/night gaps remain separate work.

Exact files, commands, fixture/provenance limits, recordings and cleanup: [task38](../tasks/38-village-interior-polish.md).

## Cocos Life history/study organization — 2026-10-17

Status: task39 M3 implemented and locally browser-verified candidate; owner render acceptance pending.

- [x] Direct Life entry, separate dated commission/activity histories, today/history/archive books, linked records and old exercise history. No new assets or source/provenance changes; shared Hearthwood tokens/system fonts retained.
- [x] Book/plan editing, archive/restore, exact same-title identity, same-day association, parent archive guards and explicit original timer ownership. Main browser8 groups/72 captures at1920/1440/1024 and844/740; actual DPR2 touch and44px nonoverlapping controls. Key screenshots personally inspected.
- [x] Real Creator build/80 source bindings/types, shared/core/date preservation tests and232 backend tests pass. Three final screenshots and focused checks verify initial Shift+Tab, contextual receipts and timer display after final cleanup; supplied frame client preserves real server time.
- [ ] Physical devices/Safari, full native IME, screen readers/text scaling/DOM semantics, broader retirement/performance and owner render approval remain separate.

Exact files, commands, fixture boundaries, screenshots and lifecycle cleanup: [task41](../tasks/41-cocos-life-records.md).

## Cocos registration and dossier — 2026-10-17

Status: task39 M1/M8 implemented/local-browser candidate, owner render approval pending.

- [x] Six existing appearance IDs/actors and original home art reused; zero new asset/font/audio/source processing. CJK/default-name drafts, rejection/retry, single creation, original-role reload/recovery and disabled pending input preserve data.
- [x] Read-only identity, original level/cumulative EXP, current/max capacity, attributes, balances and seven ability quotes; no EXP conversion/progress bar/countdown. Explicit mutations, latest-state refresh after actual stale quote, exact double-click/lost-response conservation verified.
- [x] Main8 browser groups/60 captures plus actual recording;1920/1440/1024 and844/740, DPR2 touch/reduced motion,44px controls. Key screenshots personally inspected. Existing data lifecycle regression on new build7 groups/20 captures passes.
- [x] Actual Creator3.8.8/81 bindings/types,17 core groups, new pure dossier/registration tests, original-source preservation,232 backend tests and isolated original-Web build pass.
- [ ] Owner actual render, physical devices/Safari/native IME/screen readers/text scaling and complete retirement/deployment/rollback gates remain open.

Files, commands, fixture boundaries and cleanup: [task42](../tasks/42-cocos-registration-dossier.md).

## Cocos current goal and journey guidance — 2026-10-17

- [x] Native foldable goal HUD, reopenable guide, original proximity/confirmation briefing and review, three preparation bookmarks, read-only comparison and original history/growth entrances. Manual side-quest ownership, independent markers and old routes remain intact. No asset/font/audio/rule/schema additions.
- [x] Isolated main8 groups/79 captures, original Life8 groups/72 captures, real Creator3.8.8 build/84 bindings/types, core17 groups, preserved original decision assertions,232 backend tests and isolated Web build pass. Representative real screenshots and supplied skill frame captures inspected; final target text has a solid9.70:1 backing.
- [ ] Actual device/browser visibility and focus, physical touch/IME/accessibility/text scaling, owner render/feel approval and full release/rollback remain open. The automated environment reports every tab visible/focused: controlled blur/focus handler tests are explicitly distinguished from actual background-tab validation.

Evidence, fixture limits, commands and cleanup: [task43](../tasks/43-cocos-journey-guidance.md).


## Cocos places and neighbors — 2026-10-17

- [x] All15-map/category/object index with duplicate-place labels, exact server travel restrictions, moving-person bearings and explicit marker-only action; complete neighbor preferences/familiarity/routines and landscape preset topics/five gift choices/help. No asset/font/audio/API/schema/rule additions.
- [x] Isolated main8 groups/63 captures, actual travel2 groups/17 captures and rest2 groups/4 captures pass; gift/fare rejection and committed-lost replay conserve resources, encounter expiry points to the new room, actual inn sleep/return preserve original progress. Desktop/short landscape/DPR2 and44px/no-overlap checks pass; representative screens and supplied frame images inspected. Real Creator3.8.8/85 bindings/types, core17, place/guidance/feature,232 backend tests, original Web build and preservation guards pass.
- [ ] Owner actual render/feel, original provisional travel art, physical devices/real background behavior, full accessibility/IME/zoom, natural whole-chapter pacing and deployment/rollback remain open. No retirement approval implied.

Files, exact commands, fixture boundaries and cleanup: [task44](../tasks/44-cocos-places-neighbors.md).


## Cocos map/encounter owner feedback correction — 2026-10-17

- [x] M opens spatial terrain/buildings/current point and bounded44px landmark controls; secondary index/all15 maps, marker-only direction and exact server quotes retained. Six unchanged PNG rebindings with exact source/target hashes; no new art.
- [x] Illustrated place/neighbor/gift leaves and low portrait conversation over the real room/world; scoped painted-moss/linen timber controls. Main8 groups/63 captures plus7 focused captures, map/world skill bursts, Creator/types/92 bindings, core17/pure geometry/protected originals and163-image audit pass. Actual desktop/short landscape/map leader/room/chest screenshots inspected.
- [ ] Owner actual render/feel review of this revised candidate and device/release gates remain open. Earlier index candidate explicitly received needs-adjustment feedback; do not infer approval or spread the treatment to unrelated screens.

Evidence and preserved manual save/cleanup: [task44](../tasks/44-cocos-places-neighbors.md).


## Cocos resident discovery and scene dialogue — 2026-10-17

- [x] Visible portraits/N locate real indoor residents; door/exit instruction survives short landscape, actual same-room walking reaches server-valid conversation, world labels keep screen text scale. No teleport or altered routine.
- [x] Actual scene remains visible behind low speaker/answer choices; gifts are an existing five-item tray with true counts. Long press survives clock redraw, gift drag-out cancels, original pad holds/releases and direct Life entry remain usable.
- [x] Final separate Creator3.8.8 bundle/92 bindings/types, core17/place/guidance and391-preservation guards pass; natural5 groups/31 captures plus original place/social8 groups/63 distinct captures and4 supplied-client frame captures pass. Latest actual scenes/short landscape/portrait/door/gift images inspected.
- [ ] Owner rejected task45 dialogue as data/PPT-like; task46 continues scoped conversation correction. Broader screens, device/browser/IME/accessibility and complete retirement gates remain open. Prior revisions explicitly received needs-adjustment feedback.

Exact sources, commands, fixtures, preserved handoff and cleanup: [task45](../tasks/45-cocos-neighbor-encounter.md).


## Cocos sequential scene conversation — 2026-10-17

- [x] Actual actors/room focus, compact single speech surface, explicit reveal/advance/replies and separate confirmed numeric feedback; no position/rule/save mutation by presentation.
- [x] E/Space/pointer, held-repeat guard, redraw/reflow/return continuity, camera restoration and reduced-motion touch tested. Actor/menu occlusion checked and actual desktop/short-landscape images inspected.
- [x] Independent final build/types/core/preservation checks and reader3/natural6/place-social8 browser groups pass,107 total captures including the supplied-client2. Manual save backed up and full player rows unchanged on handoff; owned automation cleaned.
- [ ] Owner feel approval remains open after prior explicit rejections. Other pages, actual devices/IME/accessibility and retirement gates remain open.

Evidence, exact commands, fixtures and retained preview: [task46](../tasks/46-cocos-conversation-presence.md).


## Attached Cocos answers — 2026-10-17

- [x] Owner feedback on task46 answer position addressed with replies inside the same bottom speech surface, contextual topic options and scoped paper/moss control states. No floating answer panel, server rule or real save-coordinate change.
- [x] Final94 bindings/Creator/types, core17/place/guidance/preservation checks and original Web isolated build pass. Reader3/natural6/social-place8 groups with113 captures including supplied-client2 pass; actual desktop/short-landscape/default/hover/pressed/focus images inspected.
- [x] Manual5442 same database/full player rows verified unchanged with backup; QA/browser/worker cleanup recorded. Original item registry extraction is exact; M7 UI remains unwired/unverified.
- [ ] Actual owner render/feel approval, other pages, physical devices/IME/accessibility and full retirement gates remain open.

Evidence, commands, fixtures and retained preview: [task48](../tasks/48-cocos-attached-answers.md).


### Cocos startup recovery — 2026-10-18

Owner answered “可以保留” for this startup fault page only: readable cause, native reload control and credential/outbox preservation note. No broader visual or Web retirement approval. Actual Creator E startup suite has six checks, including no-JavaScript native Enter navigation returning200 and WebGL-disabled740 landscape. Full regression and actual long-session checks remain in progress; see [task63](../tasks/63-cocos-startup-recovery.md). No new assets.

### Cocos lossless terrain — 2026-10-18

- [x] Original PNG, dimensions, palette and complete decoded RGBA bytes remain unchanged; derivative has independent provenance and importer UUID, nearest sampling and no trim. Browser decoders and capability-negative PNG fixture checked in three test engines.
- [x] Actual world/map/satchel and resource503/reload/same-save flows captured; WebKit fallback and fault images inspected. Startup downloads are measured separately from the larger package retaining both formats and unchanged GPU texture memory.
- [ ] Brand browser/physical device and production network evidence remain open. Existing owner approvals keep their original scope; no new artwork or broader visual approval is inferred. Exact versioned results and failures: [task70](../tasks/70-cocos-network-budget.md).
