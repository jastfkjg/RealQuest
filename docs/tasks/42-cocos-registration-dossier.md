# Cocos 登记、旅人档案与主动培养

> 启动入口现统一为 `start.command`，本文中的入口名称已更新；其余历史参数、端口和验证记录保留当时状态，当前用法见 [本地说明](../cocos-local.md)。

2026-10-17。对应任务39的M1/M8，是“继续推进所有后续项”目标中的登记→档案→主动培养切片。完整目标仍包括M4–M7/M9、T1–T6、V1–V7，不因本切片完成缩小范围。原Web、已有未提交修改、玩家库、正式默认入口和发布均保留；没有提交、推送或部署。

## 实现

- **六种登记外观**：使用现有`appearances`固定ID0–5、原六套actor PNG和家园图。桌面可直接比较六套人物，横屏显示当前预览与六个选择；姓名/外观草稿在选择、重绘、请求失败后保留。中文姓名上限16字，留空使用现有「林间旅人」。等待连接/删除确认期间禁用输入和外观；重复点击不多次创建。接续已有角色时不发送create，也不采用欢迎页的新名字/外观。
- **旅人档案**：从旅程菜单进入，身份与状态、积累与物资、全部培养能力三个页签。显示姓名/外观、原Web同口径旅程等级与累计经验、生命/体力当前与上限、五项属性积累、能量/知识碎片/金币、三种点数及全部七项能力。体力按既有共享恢复 helper显示，读取不写入资产；未提供的状态明确暂不可用。
- **主动培养**：沿用原`health_spend/knowledge_spend/skill_spend`及`expected_invested`报价保护。选择与切页不花点；确认前显示现有/下一值、报价、余额与预计剩余/缺口。成功后显示服务器确认的前后数值/余额；失败不显示成功回执。明确拒绝后同步最新状态，旧报价可核对后再操作；未知结果仍交由既有持久请求恢复，不能跳过待确认请求重新扣点。
- **可达与身份隔离**：菜单在短横屏分页，七项能力在档案中分页，全部必要操作44px且可触控/键盘到达。关闭/返回保留上下文；能力结果在切换上下文及旅程后清理，不把上次旅程的花点回执带入新档案。培养可标记诺亚，但不传送或远程领取。

继续使用已有Hearthwood纸面/苔绿控件和系统中文字体；身份区与成长报价各有结构。依据后续M8明确要求，只读档案补充原有旅程等级/累计经验，**没有经验进度条、升级倒计时或经验换点**；培养页继续只围绕现有点数与报价。这是Cocos候选，不继承原Web插画档案的玩家实际画面批准。

## 文件与来源

- `clients/cocos/assets/scripts/Bootstrap.ts`：登记草稿/六外观预览、接续保留角色、原生输入禁用、明确拒绝培养后的最新报价同步、snapshot只读可观察值。
- `clients/cocos/assets/scripts/ui/{panels,dossier}.ts`：既有菜单与培养入口委派到同一档案模块；保留其他面板/Life/诺亚现场结算。原Cocos培养方法重构，没有删除原React/Phaser实现。
- `shared/game/dossier.ts`与生成的`assets/scripts/core/dossier.ts`：原WebHUD等级显示口径、原stamina helper、只读属性表及登记输入校验。没有新的奖励/经验规则。
- `clients/cocos/tools/{test-dossier,smoke-dossier}.mjs`、`sync.mjs`、`asset-bindings.json`、`.gitignore`、package脚本：可重现同步、纯行为和真实浏览器测试；81项来源绑定只比任务41多一个纯代码模块。现有所有PNG字节/来源不变，零新增图片、字体、音频、依赖或源图处理。

没有更改服务端API、规则、协议、数据库格式或迁移。原Web源码及其构建保持可用。

## 复现命令

实际环境沿用Node22.23.2、Python3.14.6、Creator3.8.8、npm锁文件及已有依赖。根目录执行（另标工作目录者除外）：

```sh
node clients/cocos/tools/sync.mjs
node clients/cocos/tools/test-dossier.mjs
node clients/cocos/tools/test-core.mjs
node clients/cocos/tools/test-features.mjs
node clients/cocos/tools/check-baseline.mjs
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
REALQUEST_COCOS_BUILD=web-dossier COCOS_USER_DATA=/private/tmp/realquest-cocos-dossier-userdata COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/build.mjs web-desktop
# backend/
.venv/bin/python -m pytest -q
# frontend/，不覆盖正在预览的原Web dist
npm run build -- --outDir ../output/cocos-dossier/web-build --emptyOutDir
```

真实浏览器使用独立5444/API8144与`output/cocos-dossier/test.db`：

```sh
python3 clients/cocos/tools/run-preview.py --build web-dossier/web-desktop --port 5444 --api-port 8144 --database output/cocos-dossier/test.db
# 另一终端：
node clients/cocos/tools/smoke-dossier.mjs
```

脚本从自身路径定位仓库，数据库realpath必须是本任务test.db。六种外观均通过UI创建新游客；档案/培养夹具只修改本次创建的一个save ID，准备245累计经验、能力/当前容量/点数以验证显示与扣点。随后通过真实UI培养、另一请求制造真实旧报价、丢失已提交响应、重载及实际凭证文件恢复。准备点数/等级不是自然游玩获得的成长；不使用玩家库或手工预览库，不修改奖励规则。

浏览器/上下文/录像均在finally关闭；短帧客户端沿用`develop-web-game`技能提供脚本，仅适配Cocos就绪/入口、已有Playwright路径和合成截图，保留真实服务器时间。确切结果与收尾记录在下方。

## 剩余范围

M1/M8按已实现功能与本地Chromium证据记录候选；物理设备、完整原生输入法、Safari/其他目标浏览器、屏幕阅读器/系统字号和正式存档/发布/回退仍分别属于V1/V4–V7。合成composition事件证明输入拥有权，不等于已验证系统输入法。Canvas按钮的稳定ID/焦点不等于DOM语义。

本切片不增加换装消费、头像生成、经验兑换、自动花点、账号、AI或新玩法。后续继续M4任务/初探/再出发与归来指引；全目标保持进行中。

## 实际验证结果

- 官方Creator3.8.8真实独立Web构建、81项来源绑定/实际引擎声明通过。新增纯测试、17组原客户端测试、feature与Life记录辅助测试通过；393项原代码/美术/规则/迁移保护、7项既有共享提取、日期helper与原测试断言保护通过。
- 后端完整232测试通过，保留既有Starlette/httpx弃用提示。原Web类型检查与独立输出构建通过，保留既有大chunk提示；没有覆盖原5430产物。
- 真实Chromium主流程 **8组 / 60张截图**通过，无意外页面/资源错误。包含创建已提交两次丢包后的同请求/同角色重载（不创建替代游客），以及全部6外观、中文16字与空白默认、合成composition键盘拥有权、双击、登记422后草稿保留、原角色重载、完整档案只读、7种实际培养、注入422与另一请求造成的真实旧报价、已提交两次丢包后的重载和原容量/余额/物品的凭证恢复。
- 桌面1920×1080、1440×900、1024×768、横屏844×390与740×360；真实DPR2触控、减少动态、44px无重叠控件和菜单/能力分页全部可达。亲自检查登记、选择/错误、六套角色、档案/积累、报价短缺/成功/真实旧报价、短横屏各页与恢复截图。只读和失败前后资源/经验不变；真实培养仅按服务端扣费。
- 欢迎页改动影响既有存档流程，因此复用原`smoke-data.mjs`全部断言，在同一独立测试API上仅适配URL/模块定位/输出目录：**7组 / 20张截图**通过，覆盖Cookie/文件预览取消确认、备份、真实导出下载、失败重试、已提交删除丢包后重载及会话/凭证失效。只删除此用例创建的游客；原任务40证据不覆盖。凭证临时文件在finally清理。
- 主流程录像`dossier-flow.webm`已实际生成（约11.4MB）。`result.json`、`data-regression/result.json`、源/构建SHA256的`build-info.json`和相关日志保留于忽略目录`output/cocos-dossier/`。帧客户端最终记录和进程收尾在下方补记。

截图：[六外观登记](../../output/cocos-dossier/register-desktop.png)、[登记错误重试](../../output/cocos-dossier/register-rejected.png)、[横屏登记](../../output/cocos-dossier/register-touch-740.png)、[横屏档案](../../output/cocos-dossier/dossier-overview-740.png)、[横屏能力最后一页](../../output/cocos-dossier/dossier-levels-last-740.png)、[真实旧报价同步](../../output/cocos-dossier/actual-stale-quote-refreshed.png)、[零点数禁用](../../output/cocos-dossier/growth-shortfall-touch.png)。录像：[登记/档案/培养链](../../output/cocos-dossier/dossier-flow.webm)。

## 最终帧复核与手工预览

- 技能帧脚本在最终档案与正常世界各运行两次短右移/等待。档案坐标始终240/320，正常世界仍向右移动；保留真实服务器时间，未注入虚拟奖励时钟。实际合成截图已检查，没有帧脚本错误文件。
- 主流程后仅修正待删除欢迎页说明；定向用实际提交后丢失响应的测试游客再次验证：姓名/六外观禁用，明确确认原请求，重载确认不调用`client-session`、不创建替代游客，成功后清理对应本机身份。最新截图`final-delete-pending.png`已亲自检查；`pending-delete-result.json`保留。原7组数据全流程断言未被放宽。
- 手工预览现在为`http://127.0.0.1:5442/`，API8142，构建`web-dossier/web-desktop`。沿用同一个`output/cocos-data/local-preview.db`与浏览器origin，切换前备份为`output/cocos-dossier/preview-before-dossier.db`，切换后原始player行快照哈希完全一致（当时0个游客，未为截图造数据）。只换本地预览构建，不改正式入口或部署。

```sh
./start.command --build web-dossier/web-desktop --port 5442 --api-port 8142 --database output/cocos-data/local-preview.db
```

- 当前保留启动器63424/API63426/静态代理63427，会话80551，供用户刷新已有标签页体验。原Web5430/Cocos5431/API8130继续保留；六个根页/健康检查均200。
- 已核实参数、父子关系、工作目录、启动时间和监听归属，正常退出旧5442启动器54485及54488/54489，以及测试5444启动器59724及59726/59727。5444/8144监听关闭，测试Node/浏览器/Creator包装器均退出。临时帧/数据适配器和待删除探针源文件、冗余失败截图/空录像目录已清理，保留正式脚本、结果、60+20张主流程截图、最终定向图、4张帧截图及录像。
- 用户已有浏览器及无法确认归属的共享工具宿主未关闭。全清单目标仍进行中，下一步是M4任务追踪/指南、初探与再出发/归来提示；物理设备、原生IME、玩家实际渲染/手感和发布回退仍需后续证据与相应授权。
