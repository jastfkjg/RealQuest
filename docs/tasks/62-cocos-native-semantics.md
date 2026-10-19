# Cocos 浏览器控件语义与键盘表单

2026-10-18，接续任务39 V5。状态：本轮本地候选完成，23套全量与语义单套复验通过，5442已同库更新；完整V5仍开放。

短计划：先在当前真实生产包上以浏览器Accessibility树/角色查询复现可见Canvas按钮缺少原生语义；再在现有控件注册点提供原生具名按钮与键盘入口，编辑动作进入真实Cocos EditBox并关联中文标签。复用原行为/校验/待确认状态/面板历史，验证Enter/Space只触发一次、文本/组合输入归属、Esc逐层返回与原焦点、世界继续可玩。独立新候选构建与浏览器检查后再报告；自然QA冻结副本保持，25分钟研习本轮已实记，三小时真实等待继续。

视觉：沿用现有Hearthwood画面、中文、纸面与苔布，焦点沿用已有琥珀描边。内容依次为当前面板名称、实际说明/状态、可用动作；标签来自原控件/文本。交互沿用原按压和焦点状态，不新增动画或视觉主题。没有新图、字体、音效、依赖、API、规则、迁移或原Web改动。

来源：DESIGN共享原生控件/具名对话框/焦点返回约定，当前asset-plan/manifest/review；沿用frontend-skill与ui-ux-pro-max。后者针对读屏/表单标签检索得到语义HTML/关联标签建议；焦点返回具体合同来自仓库DESIGN，未把泛化搜索结果当作已验证实现。官方Creator3.8.8源码确认EditBox有公开focus/setFocus方法，不访问其私有实现来改值。

先实现并验证登记→现实成长→研习表单→返回这一条链，原生语义基础服务现有控件；其余控件命名、实际系统读屏器/中文输入法/缩放/设备及V5全门槛仍需相应证据。浏览器AX树不等于真实辅助技术验收，既有玩家画面批准不扩大。

## 实现与实际证据

旧生产包 `run-olh5Y3` 的可见“开始旅程”截图与真实Chromium Accessibility树显示0个原生按钮，角色查询按1个断言失败；实际查看截图。保留失败基线，没有把Canvas文字算作按钮。

新增 `clients/cocos/assets/scripts/accessibility.ts` 及标准meta，仅Web环境启用：从真实已绘制控件生成具名原生按钮、当前面板对话框/说明/状态及选择状态，键盘焦点沿用现有琥珀描边。模态只暴露当前操作，触控方向盘仍用原按住/松开，键盘已有Canvas移动替代；指针继续操作原Cocos按钮，不创建平行资源逻辑。原生激活仍经过原动作、disabled/busy/服务端确认。节点按稳定ID更新，避免重绘销毁焦点。

表单的键盘编辑动作调用公开EditBox.focus()，给实际原生INPUT/TEXTAREA关联原中文标签与当前值，编辑中保持Cocos原输入与组合输入归属；没有直接改DOM值或访问私有EditBox实现。Escape先结束编辑，再按原面板历史返回，键盘返回原入口；浏览器语义层销毁时解绑并恢复其负责的属性。

`Bootstrap.ts`在原控件注册点同步文本/动作/字段；`ui/panels.ts`、`places.ts`、`storage.ts`、`life.ts`只补真实选择状态和图标控件名称：地点、村民、赠礼/仓储物品。数字地图标记及空字图标有实际中文名，原样式和行为保留。没有新素材、依赖、服务端/规则/迁移或原Web改动。

首个候选A基础4检查通过，但补测发现原生按钮焦点下M失效。收窄按键拦截的候选C仍失败；进一步读取实际Creator3.8.8键盘源，确认监听只在Canvas。最终D把原生按钮收到的现有按键显式接回同一个keyDown/keyUp，复用原mode/textOwnsInput/重复键/松开逻辑，保留原生Enter/Space避免双触发；未修改引擎。A/C失败及截图保留。B在受限环境未生成产物即退出1，空日志没有被当作成功；后续候选用新目录。

最终D：`clients/cocos/web-release-semantics-d/web-desktop`，真实Creator3.8.8生产构建终态0，debug/sourceMaps关闭、MD5开启；源 `16d364463e2e02ada59d98afd23a3d23ea7e06954820e639f94e58290ce90b7a`，产物 `17d31080581a976f096c3781da6e8509e5a3de3ce7b2fae7c3a830fce506054a`。

目标 `run-mTo5GL` complete:true，5条检查/3PNG、0意外浏览器错误：中文姓名/原生EditBox标签、Space选择/Enter恰好一次创建；M地图与Escape原焦点；成长对话框拥有输入且不移动角色；原生12分钟书页创建不发知识点；Escape逐层返回及Canvas实际移动；菜单子页返回原按钮。真实AX树、状态与截图保留，已查看研习书页与清场/短休自然流程截图。浏览器上下文/专属进程均finally退出。

`clients/cocos/tools/smoke-semantics.mjs`登记为常规回归；全矩阵从22套增加到23套（22 Cocos＋1原Web对照），`tools/test-cocos-browser.mjs`同步准确套数并断言真实模块。首次单元因旧21/22套断言失败后，正常取消尚在运行的旧清单回归 `run-DkLZZY`（终态130/finally清理），修正后重新冻结输入。最终22单元模块全通过 `output/cocos-accessibility/unit/result.json`，106真实Cocos类型/386来源与390＋435原Web保护通过。第二次全回归 `run-cJFboc`已终态0，23套/155组/658PNG通过，全部浏览器/服务退出。其后只改常规语义测试的菜单就绪等待，单套重新验证，详见最终证据。

开发命令：Node22 `node output/cocos-accessibility/build.mjs d`（本轮受控包装，调用实际cocos:build:release）、`COCOS_CREATOR=<实际Creator路径> node clients/cocos/tools/check.mjs`、`node tools/cocos-sources.mjs --write`、`node clients/cocos/tools/check-baseline.mjs`、`node tools/cocos-unit.mjs --report output/cocos-accessibility/unit/result.json`、`node tools/cocos-browser.mjs --build web-release-semantics-d/web-desktop --suite all --web-build output/cocos-regression/web-compat-current`。

原技能帧客户端适配 `run-uhJELi` complete:true，2检查/4PNG；实际键盘地图、未确认移动、Escape/重连及同一持久化命令仅结算一次通过，自动浏览器/服务退出。地图/恢复截图已查看，汇总进程核验已完成。

剩余：实际系统读屏器/操作系统IME/浏览器原生缩放/设备验证、更多页面内容语义/操作命名检查以及完整V5。AX树查询和注入中文字符不等于这些系统级验证。既有玩家批准仍只覆盖三处界面与偏好页；原Web继续保留。

## 补充输入与独立生产重建

`run-34feY3`原生编辑框2检查/2PNG通过：中文及wasd mlin字母仍属于真实EditBox，不触发世界快捷键；Escape返回编辑动作，琥珀焦点仍清楚。实际查看编辑与返回两图。先前 `run-e8TBBs` / `run-oj6RD3`补充探针误限定INPUT而超时；主回归一直正确允许INPUT/TEXTAREA，实际任意文本模式使用TEXTAREA。保留失败，修正探针，不改产品或输入规则。初次就绪等待也补为真实Start可用后操作，未据此声称另一产品缺陷。

`run-RVWA7t`原生按钮快捷键2检查/1PNG通过：真实可信F全屏、按住不重复、松开可再切换、Escape先退出全屏仍保留成长面板，以及I打开/关闭行囊。浏览器finally退出，待汇总进程核验。

`cold-build.json` complete:true：全新885文件源码快照 `output/cocos-toolchain/clean-source-xXEHRJ`，未复制原Web依赖/构建、Creator项目缓存或产物；独立有锁离线安装、真实Creator3.8.8生产重建，前后885输入全部原字节。与原项目D候选266文件/14824869字节逐条SHA一致，源16d36446/产物17d31080。旧自然旅程冻结KTivmU保持独立，未更换其运行时。

静态打包 `output/cocos-accessibility/candidate-d`已验证，active d52ffd58fcfebae4034f5ae637cac539116496c8d2b72b67196efec705c05e5c，完整artifact cd9369227ce90bfe0ddfc63214f35acafd914c794c4de5b504e9d7b9b813003f，保留四个真实引擎版本。只创建本地候选，实际Nginx交付测试已完成（下述9组）；没有发布、提交、推送、改默认入口或删除原Web。

实际Nginx最终 `run-jJFCfp/suites/delivery/result.json` complete:true，9组/5PNG，真实版本缓存/MIME/gzip/404、同源API/Cookie、安全来源、世界/成长/740横屏、旧真实引擎同档接续与入口切回全部通过；独立API/Nginx组与浏览器已正常退出。未验证精确容器镜像/HTTPS或实际CI。人工试玩已按下述备份/指纹流程同库更新。

## 最终证据与人工交付

全量 `run-cJFboc/result.json`终态0，23/23套、155组、658份PNG、0意外浏览器错误；全部所属浏览器与服务退出。真实已安装Chrome155补测最初 `run-Hp5riL`已到返回菜单，脚本只等mode便读取尚未重绘的按钮，出现TypeError；失败截图实际显示正确菜单与原琥珀焦点。按真实可用menu-character按钮就绪再读，`run-Ivj9aY`5检查/3PNG通过，Browser.version和CDP均为155.0.8059.80。该等待修正没有改产品、断言或放宽超时。

全量终态后再将同一等待条件同步到常规 `smoke-semantics.mjs`，重写来源清单，`run-4oEYv9`当前语义单套5检查/3PNG通过，来源归属/浏览器配置两模块重验通过。原全量报告保持原始输入快照；最终核验确认来源清单只多了这一条测试记录的字节变化，其余22套测试、全部运行时/后端与全量逐项一致。未把旧全量收据改写成新输入收据。

实际查看当前编辑/焦点返回、角色档案、恢复地图、740四格整理、底部回答键盘焦点、真实Nginx桌面世界与740成长页；原素材/布局保持。代码变动为新增accessibility.ts/meta，Bootstrap.ts及ui/life.ts、panels.ts、places.ts、storage.ts；测试为smoke-semantics.mjs、tools/cocos-browser-suites.mjs和test-cocos-browser.mjs，来源清单/本地操作文档及任务记录同步。没有新增图、字体、声音、依赖或服务端规则；与任务58后端指纹完全一致。

5442人工包更新：先按PID/启动参数/父子关系/监听端口核实旧46373/46376/46377，正常停止并收回旧session19624；对原output/cocos-data/local-preview.db完整只读备份至 `output/cocos-accessibility/manual-before-semantics`（工具回执operation-E1u1XE），再以同一地址/库/Cookie启动D。完整模式与六表快照前后均为569ae498edd557c4a8a9791ad30d8dc761a7e8fbe3dc4a98436555bbf2ce36cb；1角色/974结算全部保留。没有恢复覆盖、发游戏命令或驱动用户原标签页。

最终保留人工launcher2093/API2096/proxy2097，session8717，http://127.0.0.1:5442/；API8142及实际build receipt均200。三小时自然QA另保留controller47849/launcher47851/API47854/proxy47855，session80710，原13:09:37.376北京时间到期，不是闲置工具。Task62的140报告/260已结束PID记录与独占浏览器/Creator标记均无遗留；Task59另34报告/35已结束记录无遗留，882冻结输入未改。共享工具宿主和用户浏览器保持。

汇总机器证据：`output/cocos-accessibility/verification.json`、`cleanup.json`、`manual-handoff.json`及 `output/cocos-natural/cleanup-early.json`。网页刷新可继续原试玩；本轮V5切片完成，完整清单/自然三小时结算与远行/系统设备/实际CI交付/玩家其他画面手感继续，未批准退役原Web。
