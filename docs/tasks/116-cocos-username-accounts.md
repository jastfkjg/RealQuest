# 用户名账号与游客旅程

2026-10-22。用户要求保留游客体验，支持用户名和密码注册登录，不接邮箱验证码。

## 范围与计划

1. 在现有 FastAPI/SQLAlchemy/Alembic 与 Cocos Creator3.8.8 上增加可选账号，不改变存档ID、游戏规则或历史数据。
2. 注册绑定当前游客旅程；登录先预览，明确确认后接续，当前有游客进度时先导出并确认保存凭证。
3. 账号密码仅通过请求提交；scrypt加盐哈希、登录限流、30天可撤销会话、逐请求数据归属校验。
4. 退出保留数据，丢失回复可重试；删除旅程与退出分离，删除保留账号而撤销会话，再登录创建空旅程。
5. 独立数据库/独立release验证后端、客户端重试、真实表单/键盘、桌面和手机横屏，保留其他任务改动和原人工库。

## 设计与约束

- 用户名3–24位英文字母、数字、下划线；去除首尾空白、统一小写，不区分大小写。
- 密码15–128字符，可使用中文和空格，不截断、不去空格；目前没有自助找回密码。
- 注册绑定后撤销原游客会话和恢复凭证，账号旅程不再签发绕过密码的游客凭证。完整数据导出仍可用。
- 复用现有存档纸页、控件、中文资源文案与系统字体，无新增美术/字体/下载/依赖。
- 本机启动仍是本机数据库；跨设备接续需要连接同一持续运行的服务器，公开部署必须使用HTTPS。
- 同工作区任务115正在修改HUD和行囊；本任务不覆盖其改动，构建目录与SDK工作副本独立。

## 验证记录

已完成。所有最终浏览器回执使用同一客户端、来源清单和后端指纹；工程验证不代表用户视觉验收。

### 实现与改动文件

- `backend/app/accounts.py`、`models.py`、`main.py`：账号、账号会话、数据库限流桶；随机盐scrypt哈希、通用登录错误、输入错误脱敏、30天会话与退出撤销。哈希并发限制为每进程2个，避免请求并行造成无界内存使用。账号删除旅程与登录共享账号行锁，旧会话不能在重新开档后复活。
- `backend/migrations/versions/004_accounts.py`：仅新增表，保留原players/receipts内容。账号与旅程分离，删除旅程后账号外键置空。已有v001的角色JSON、结算与v002凭证经真实Alembic升级到004后逐字段保持。
- `shared/game/client.ts`、`protocol.ts`及同步的Cocos副本：账号元数据、注册绑定、登录预览和确认接续、账号状态恢复、退出意图持久化。网络/存储拒绝、待确认命令和另一标签切换均保留已有身份；注册回复丢失时提示用新账号登录，避免重复建档。
- `clients/cocos/assets/scripts/Bootstrap.ts`：存档页增加账号页签，欢迎页保留直接游客入口；同一纸页中提供登录/注册、确认密码、显示/隐藏密码、失败反馈、账号详情与独立退出操作。无游客旅程时可直接注册，再登记角色。
- `accessibility.ts`、`platform.ts`：密码不进入语义镜像或文字状态，原生输入支持密码管理器提示和粘贴；退出保留本机偏好。密码组件在preload前配置单行模式，确保原生元素为`input[type=password]`；标签随后按现有样式替换。指针按下期间保留输入节点，忽略退役输入框的迟到回调。
- `backend/tests/test_accounts.py`、`test_migrations.py`、`clients/cocos/tools/test-core.mjs`、`smoke-accounts.mjs`、浏览器套件注册与选择检查：覆盖数据保留、错误密码、唯一用户名/并发注册、并发删除、过期/退出、游客凭证撤销、丢失回复、切换确认和原生表单行为。
- `README.md`、`progress.md`、`asset-bindings.json`与来源清单同步。保留任务115的HUD/行囊/拖放、语义测试和文档改动；独立账号候选包含这些最终源码，不将其记为本任务新设计。

接口为`POST /api/account/register`、`POST /api/account/login`、`POST /api/account/logout`。注册在已有旅程时携带原Bearer和save_id，绑定该旅程；登录先返回经认证的旅程预览，客户端确认前不替换现有本机会话。`state`/`client-session`附带账号用户名，游戏命令仍由后端依据会话确定玩家。

哈希参数为scrypt N=131072、r=8、p=1，随机16字节盐；仅存哈希，不保存原密码。选型参考[OWASP密码存储说明](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)。每5分钟每来源地址30次、每规范化用户名10次，注册/登录分别计数；限流由数据库原子操作跨进程维护。

### 命令与结果

环境：现有npm10/Node22.23.2、Python3.14.6虚拟环境、官方Creator3.8.8独立可写副本。无新增依赖或引擎迁移。

| 命令 | 实际结果 |
| --- | --- |
| `npm run cocos:sync`、`npm run cocos:sources:write` | 124绑定、459来源，26共享模块，既有美术不变 |
| 设置独立COCOS_CREATOR后`npm run check` | 真实引擎类型和来源校验通过 |
| `REALQUEST_COCOS_BUILD=web-accounts-116 npm run cocos:build:release`（同时设置独立Creator与用户目录） | 真实release构建通过，原默认包未覆盖 |
| `npm test` | 23组工具/共享单元通过，包含21组core；该次后端259项通过 |
| 最后增加账号删除/并发登录回归后`npm run test:backend` | 最终260项通过，保留既有Starlette弃用提示，无依赖改动 |
| `npm run cocos:test:browser -- --build web-accounts-116/web-desktop --suite accounts` | 最终账号6组通过，`run-7iU8EW` |
| 同命令`--suite data,session` | 7+6组通过，`run-oWhWXJ` |
| 同命令`--suite semantics` | 11组通过，`run-GnSjiY` |
| 同命令`--suite life` | 8组通过，`run-6Pyfs7` |
| `node output/cocos-accounts-116/run-action-loop.mjs` | 技能动作循环1组通过，`run-tiuf6v`；保留技能的动作/截图/状态/错误收集，适配本项目包解析与finally进程管理 |
| `git diff --check` | 通过 |

最终共39组浏览器检查，均`complete:true`、无意外浏览器错误。统一证据见[verification.json](../../output/cocos-accounts-116/verification.json)，完成的构建/测试日志在[verification](../../output/cocos-accounts-116/verification/)。

浏览器覆盖：直接游客开始、游客绑定后存档ID/完整导出历史逐字段一致、旧游客会话失效、刷新恢复同一角色、错误密码保留当前旅程、另设备登录先预览且要求备份游客凭证、两份旅程不覆盖/合并、退出已提交但回复丢失后重载确认、其他设备仍有效、重新登录找回原旅程、先注册后创建第一个角色。表单在1440×900、1920×1080、1056×627、844×390、740×360验证；相关成长表单另覆盖1024桌面、DPR2触控、长中文、Tab/Shift+Tab、失败重试、归档和计时状态。

已亲自查看最终[740横屏注册](../../output/cocos-regression/run-7iU8EW/suites/accounts/registration-740.png)、[桌面账号详情](../../output/cocos-regression/run-7iU8EW/suites/accounts/registered-account-desktop.png)，以及登录备份确认与错误反馈画面。账号主流程录像位于该套件的`video/`目录。素材、调色板、切图、字体或外部生成服务均无新增；无新增素材来源或美术处理记录。

### 中间失败与修正

保留失败证据，不记为通过：最初独立包因同工作区Bootstrap仍在变化而过期；新增套件后更新了原固定套件数量检查；沙箱限制回环监听的一次单元失败在授权环境运行后通过。密码框最初只在画布显示圆点，而原生preload创建了textarea，现改为激活前配置；也修正了指针按下与焦点重绘、退役编辑器迟到回调的边界。

Creator实际把`[...password].length`转换为`[].concat(password).length`，将有效密码计为1；已改用`Array.from(password).length`并以真实注册流程验证。临时仅记录长度的诊断已从测试源码移除。

`run-wqMfhN`虽然五套38组逐项通过，但期间增加并发账号保护导致最终后端来源回执不一致，整体`complete:false`，不作为当前通过回执。之后冻结代码，重新取得上表五套同来源/后端指纹的最终通过报告。没有修改旧回执或绕过来源保护。

### 交付与清理

人工预览为 **http://127.0.0.1:5449/**，API8149，独立新库`output/cocos-accounts-116/manual-preview.db`。入口：欢迎页「登录 / 接续旅程」→「账号登录」。该服务为用户验收保留；原5443与另一聊天的5448均保持健康，原玩家库未读取、迁移或重置，原默认构建也未热替换。

18次本任务浏览器运行的123个已知控制器/浏览器主进程/服务/测试PID全部退出，浏览器进程组和服务子进程退出回执通过。独立Creator工作副本已删除，官方签名SDK输入保留。仅保留本次5449/API8149人工预览及用户既有服务；无法确定其他聊天用途的共享MCP宿主保留，不按名称批量结束。证据：[cleanup.json](../../output/cocos-accounts-116/cleanup.json)。

未提交、推送、部署或更改账号设置。实际PostgreSQL运行时、系统输入法/读屏、物理设备与用户视觉验收未宣称通过。邮箱验证、自助找回密码、第三方登录和多存档管理不在本次范围；公开部署应先配置HTTPS，跨设备必须连接同一服务器。
