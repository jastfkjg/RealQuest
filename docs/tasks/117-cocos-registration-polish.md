# 登录与旅人登记优化

2026-10-22，用户反馈当前登录背景人物突兀、姓名输入差且字号小、形象重复、无需服装名称。

## 实施计划与设计

- 视觉：保留回响村庄全幅背景与 Hearthwood 木板纸页，让登记板成为唯一交互焦点；取消孤立的背景人物与服装标签。
- 内容：品牌/地点 → 姓名和简短提示 → 三种真实不同的形象 → 开始旅程 → 次要登录/接续入口。
- 交互：单行原生姓名输入，20px文字、48–52px目标、即时焦点边框；形象沿用既有悬停/按压/勾选反馈，减少动态时保留静态选择。无需新增装饰动画。

先核对现有控件与资产，再完成本页实现，真实 Creator release 构建与浏览器输入/持久化/失败重试/桌面横屏验收，最后清理本任务资源。原六个持久化形象ID继续兼容；登记只提供已有三种不同轮廓，换色派生不再重复列出。不修改源素材、玩家数据、游戏规则或账号设置。

## 环境

Node22.23.2、npm10.9.8、根 package-lock；Creator3.8.8。后端 FastAPI/SQLAlchemy，Python3.14虚拟环境；现有001–004迁移，本次不改。当前5448人工预览使用任务115构建，保持运行；本次使用独立构建与QA库。

## 已实现

- `clients/cocos/assets/scripts/Bootstrap.ts`：移除背景人物/服装标签；桌面登记板与矮横屏纸面分别排版；只列三种不同轮廓，勾选和焦点保持明确。开始旅程为主操作，登录/接续为次要入口。
- 姓名原先使用 `EditBox.InputMode.ANY`，实际为多行 textarea，且引擎把文字置顶。现在在组件激活前设为 SINGLE_LINE，20px文字、垂直居中、48/52px编辑区域；中文16字、默认名和草稿保留规则不变。
- `accessibility.ts`：原生编辑器与画布文字使用相同14px内边距，修正进入编辑时的水平跳动；blur/dispose恢复临时样式。保留原有IME、Tab/Shift+Tab/Escape和输入所有权。
- `shared/game/appearances.ts`：登记仅提供原始三种形象；0–5所有持久化ID和旧存档读取继续有效。同步生成引擎副本、`asset-bindings.json`、来源清单；`smoke-dossier.mjs`验证实际新流程和3/4/5旧身份接续。
- `DESIGN.md`更新本页契约；本任务不推广其他屏幕的新视觉设计。

## 美术来源

新增美术/字体/音频/下载/生成服务均为0；未裁切、换色、重编码或修改源素材。继续使用现有`ui/arrival`、`ui/register`、短横屏纸张及`village/actor-0/1/2`绑定。角色图为192×256、单帧48×64，按原尺寸显示，不放大为新肖像。来源、授权、尺寸和逐文件哈希沿用`docs/art/asset-manifest.json`、`village-art-v2.json`、`cocos-panel-materials-v1.json`及Cocos绑定；3/4/5原换色派生未删除。

## 验证

- `npm run cocos:sync`、`npm run cocos:sources:write`：124个绑定、26共享模块；所有图像字节保持原样。
- `COCOS_CREATOR=<本次独立工作副本> npm run check`：来源检查及真实Creator3.8.8类型通过。
- `REALQUEST_COCOS_BUILD=web-registration-117-final npm run cocos:build:release`（同一Creator环境）：真实release通过，debug/sourceMaps关闭，MD5缓存开启。源指纹`1a2e5f314386ef9cf964e361ab2172b0edcb22b20ba130e1afa471c121cb0620`，载荷`a328c7e77f96cfdfefd99678049e287ee367419613d71b7057770ee425865d11`。
- `node tools/cocos-unit.mjs --only source-ownership,core,dossier --report output/registration-117/final-unit.json`：3个相关模块通过；不声称重跑完整23模块或未改动的后端全套。
- `npm run cocos:test:browser -- --build web-registration-117-final/web-desktop --suite dossier,interface-refresh,semantics,accounts`：最终运行[run-ZAlgxT/result.json](../../output/cocos-regression/run-ZAlgxT/result.json)四套30组全部通过，177张不同PNG、零意外浏览器错误。前轮`run-Pldhw5`四套30组同样通过，属于输入对齐最终修正前证据，不重复计入最终覆盖。
- 桌面1920×1080、1440×900、1024×768；矮桌面1056×627/515；横屏844×390、740×360。七种最终登记截图及正在编辑状态均亲自查看。控件≥44px、无重叠/越界、实际文字完整；DPR2触摸、减少动态、焦点顺序、草稿/拒绝保留、中文16字/空白默认、双击只创建一次、同请求丢包恢复、旧角色接续均有真实浏览器证据。

最终截图：[桌面登记](../../output/cocos-regression/run-ZAlgxT/suites/dossier/register-desktop.png)、[姓名编辑中](../../output/cocos-regression/run-ZAlgxT/suites/dossier/register-native-editing.png)、[740横屏](../../output/cocos-regression/run-ZAlgxT/suites/interface-refresh/registration-740x360.png)；录像位于最终`dossier/video/`及`interface-refresh/video/`。`git diff --check`通过。

沙箱首次无法启动Creator/探测本地端口，改用主机执行后通过；`run-7m7ncv`、`run-DRdhKr`被来源清单前检拦截，没有执行浏览器用例，刷新清单后重新运行。没有把这些尝试标为通过。

## 交付与边界

人工预览`http://127.0.0.1:5450/`、API8150，独立库`output/registration-117/manual-preview.db`、独立cookie。保留供用户检查首次登记；不是原试玩存档。原5448/8148任务115预览继续保留，未结束或修改其他任务服务。

验证过的最终包已同步到默认`clients/cocos/web-current/web-desktop`，载荷一致；旧包完整保留在`clients/cocos/web-before-registration-117/`，没有覆盖正在使用的5448包。交付回执：[delivery.json](../../output/registration-117/delivery.json)。默认启动仍为`./start.command`，对应5443/API8143原库；本次未打开或迁移该人工库。

两轮已执行回归的40个已知测试/浏览器/API/代理PID均退出，控制器清理回执均通过，Creator已退出并删除本次`registration-117.app`工作副本，原签名SDK输入保留。仅保留本次5450人工预览父PID8118及API8121/代理8122，以及原5448预览；两者`/api/health`均200。其他聊天共享MCP宿主归属无法确认，未按名称结束。浏览器面板预览为用户审阅保留；自动化浏览器均已关闭。

未提交、推送、部署或修改账号设置，未清空玩家数据。用户实际视觉/手感、物理设备、系统IME和读屏仍未验收；手机竖屏不在本任务范围。
