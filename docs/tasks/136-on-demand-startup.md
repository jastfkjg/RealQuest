# 首页与账号入口按需加载

2026-10-29。用户要求把全量启动素材改为按需加载，让首页和登录先显示。沿用现有Hearthwood素材、输入和账号/旅程语义，不变更存档规则。

计划：拆开首页、当前场景和功能页面的阻塞资源；增加去重、失败重试、过期回调保护与明确加载反馈；验证慢网首页/登录、首次进世界、场景与功能切换、加载失败和重试、账号接续及输入拥有权；真实构建并更新默认5443，沿用现有发布流程交付腾讯云。

实现：`artLoading.ts`集中管理真实素材绑定、请求去重、别名和可重试错误。入口仅阻塞纸张与三个登记人物共四张图片；首页插画在后台补齐，不阻塞登记、登录和接续。进入世界才请求当前地图、已种作物、手持工具动作等；行囊、商店、锻造、牧场与地图页面分别首次加载。下载完成后在当前实例复用缓存，不改变物品、存档或账号格式，没有增加或替换美术资产。

`Bootstrap.ts`加入当前视图的资源计划、加载进度、返回与资源重试。等待时清理按键、触控、寻路与战斗输入并暂停世界；离开后的旧请求只缓存资源，不把用户拉回旧页面。图片重试不会重放创建角色、消耗或奖励命令。保留已有首页和游戏视觉，启动模板说明先准备首页与账号入口。默认入口与线上交付尚待最终发布验证。

真实Creator3.8.8 release构建通过：`COCOS_CREATOR=<独立官方SDK副本> REALQUEST_COCOS_BUILD=web-on-demand-136 npm run cocos:build:release`；候选为`clients/cocos/web-on-demand-136/web-desktop`，源码`66dc4a8cbde755ffda09be2df97e7de750e877df18e6ea4a6d909bc48856be5b`，payload `77e309f746d4f64bf741834269cc25de39373bfdf687d7be32ecca74ef16b6c7`。最初校验发现构建后额外加入的两份`.DS_Store`，已移至本任务metadata-quarantine；原收据未重写，全部实际运行文件逐字节核验通过。官方SDK档案SHA256和系统签名已核验，原件只用于克隆，执行工作副本。

检查结果与证据位于`output/on-demand-startup-136/`及独立回归目录：

- `npm run cocos:check`、`npm run cocos:sources`通过，使用真实Cocos声明；1070项来源、361项绑定。`npm test`通过36个客户端单元模块及469个后端用例，日志`npm-test.log`。新单元覆盖按视图计划、真实路径、别名、并发去重、错误重试和销毁后的回调。
- `npm run cocos:test:browser -- --build web-on-demand-136/web-desktop --suite art-loading,accounts`：`run-3W7FFm`通过。实际阻断背景和全部世界图片时首页/账号注册可用，开始旅程前无世界图片请求；阻断背包验证首次打开才加载；场景真实503后重试保留同一ID和库存、仅创建一次；等待期间输入不生效；返回首页后旧下载完成不跳转。账号六组回归通过。
- 当前`world-feedback`、`interaction-pockets`在`run-DTn5CM`通过，包含实际挥斧、各工具持有时NPC/入屋、鼠标拖拽与触控、真实资源数量、重载和输入清理。`life,travel`在`run-TdbuSQ`通过：生活记录八组72张截图，旅行包含实际消费、渡船、攀登、室内入口与客栈，而非传送替代。
- 按develop-web-game技能运行提供客户端的本项目适配副本，短按/停顿两轮通过，`frames/result.json`；首页不自动创建角色，世界按键移动且使用真实服务器时钟。已亲自检查`frames/entry/shot-0.png`与`frames/world/shot-1.png`，以及资源阻断、失败、重试和740×360加载页截图。
- 没有把完整旧套件写为通过：`run-KVmena`的`boot`通过，旧`world`用例在空手采木处超时，当前规则要求先持斧；`run-DTn5CM`的完整`inventory`通过前四组后在田地点击寻路断言超时。`compare-walk-v2/result.json`使用原线上完整发行包与新包、同一隔离测试状态对照，均从272.29/440点击244/464后停在原地，确认该断言问题已有于旧版本。旧断言未被修改或放宽；其余未执行段不声称通过。最初脚本/路由断言失败的记录亦保留。

独立慢网对照：`node output/on-demand-startup-136/measure-entry.mjs`通过，固定80ms延迟、375000bytes/s下载（约3Mbps），相同Nginx缓存/压缩规则与浏览器，每版本一轮冷/热启动。旧包冷启动首页可操作75296ms、HTTP25480155bytes、944请求；新包9115ms、1955279bytes、34请求，完整首页插画16816ms补齐。热启动3841ms→2207ms。首屏等待约减少88%，首屏HTTP字节约减少92%。`performance/result.json`记录进行中的背景请求字节、实际网络规则命中、全部请求与收尾；`budget.json`预先设定冷启动12s/3MiB、热启动5s上限，均通过。这里测量可操作入口，未声称全游戏已下载，也不是生产SLA或物理设备p95。

默认`http://127.0.0.1:5443/`已交付：完整候选先复制、逐文件核验，以macOS目录原子交换替换默认构建，原包保留于本任务`rollback-default`。原API未重启；SQLite备份`default-before.db`，两名玩家全部state行的SHA256前后相同；原路径与`realquest_cocos` cookie不变。`default-entry-check.json`实际浏览器通过首页→登录，冷启动2240ms、登录3067ms，零API写操作/页面错误；首页与主JS实发字节以及源码/payload收据一致。桌面和740×360横屏截图已生成并检查。

测试使用独立QA数据库。浏览器、后台服务通过finally和所属进程组清理；原5443/API8143、原数据库和浏览器凭证保留。腾讯云发布结果将在实际完成后补充。系统IME/读屏与实体设备未代验。
