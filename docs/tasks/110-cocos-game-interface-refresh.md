# Cocos 页面与弹窗游戏感优化 — 2026-10-20

状态：整体实现与工程验证完成，默认本地启动包已更新。用户明确回复“认可，继续整体优化”，批准告示板实际画面的材质方向并授权推广。其余最终画面已实际检查并交付预览；不把工程通过写成玩家对全部最终画面的批准。

后续用户提出书页边界、按钮层级与信息构图修正，当前交付见[任务111](111-cocos-interface-composition.md)。本文件保留原阶段证据。

## 范围与结果

基于用户提供的7张当前 Cocos 截图，优化登记、告示板/委托原文、洞穴/石门、随身页、凭证/数据、现实成长与相关弹窗。目标是让界面成为村庄里可用的物件：木材、纸页、手册、信件和真实场景共同组织内容；中文文字与操作保留原生控件。

先完成告示板→原文→返回的完整链，取得实际视觉确认，再按各页用途整体实施。没有扩展地图、货币、战斗规则或AI功能，没有改后端或重置玩家数据；未提交、推送或发布。

| 页面 | 已实现的结构 | 主要文件 |
| --- | --- | --- |
| 旅人登记 | 村庄到达场景、当前真实外观旅人、签名夹板；桌面3×2外观签，短横屏紧凑单行 | `Bootstrap.ts` |
| 告示板与原文 | 钉贴短告示索引、选中任务纸、实际目标和回礼；原文纸页随内容收短，窄页分页 | `ui/questBoard.ts`、`ui/panels.ts` |
| 随身页 | 双页手册，身份/世界入口与手记/凭证分居两页；窄页保留完整分页目录 | `ui/journeyMenu.ts` |
| 洞穴与石门 | 既有原生Graphics地点图、木材框、条件与行动纸页；明确进入/撤离及锁定条件 | `ui/panels.ts`、`Bootstrap.ts` |
| 现实成长 | 桌面非对称手记、分类书签、真实日期/记录；空态直达新增且隐藏无意义分页，桌面手动记录纵向表单 | `ui/life.ts` |
| 凭证与数据 | 密封信件和说明位于一侧，接续/导入/导出/重连与数据操作位于另一纸页 | `Bootstrap.ts` |
| 相关弹窗 | 档案、指南、偏好、邻里、容器和功能页共用材质/控件状态；保留各自布局，休息页有真实床铺 | `ui/dossier.ts`、`guidance.ts`、`preferences.ts`、`places.ts`、`storage.ts`、`panels.ts` |

`ui/materials.ts` 共享纸、木材、书本和控件，而不统一各页构图。`gameControls` 保留宿主的实时状态访问器，异步成功后读取最新服务器快照。素材载入后不再绘制会露出透明边缘的临时底板，书本/信件按需载入；载入失败仍有原生提示与可用动作。

原有任务ID、外观ID、marker、保存、奖励、筛选、日期、计时归属、手动来源、失败/重试/确认语义均保留。现实成长保持直接进入，不强制经世界导航。相关默认、悬停、按压、选中、焦点、禁用和处理中状态沿用真实条件。

## 素材和实际改动

全部美术来自仓库已有授权来源：木板原PNG字节、纸页、到达场景、登记夹板、双页手册、成长手记和凭证信件。`tools/build_panel_art.py` 为6个原无损WebP生成像素相同的PNG后备；没有调整大小、颜色、裁切或覆盖源图。书本、床铺、房屋、物品继续复用；手记64px图标新增表现绑定。洞穴/石门复用 `shared/game/caveArt.ts`，没有假设新洞窟PNG存在。没有外部生成、购买、下载或新字体。

- 处理脚本：`tools/build_panel_art.py`；派生文件：`assets/derived/panel-materials/*.png`。
- 逐文件来源、尺寸、SHA256、处理与许可：`docs/art/cocos-panel-materials-v1.json`、`docs/art/asset-manifest.json`。
- 绑定/同步：`clients/cocos/tools/sync.mjs`、`asset-bindings.json`、原生 `assets/resources/ui/*` 与 `items/journal.png`。
- 新界面与元数据：`ui/materials.ts`、`journeyMenu.ts`、`questBoard.ts` 及各自 `.meta`；其余原生修改见上表。
- 回归：`smoke-interface-refresh.mjs`、`smoke-quest-board.mjs`，维护 `tools/cocos-browser-suites.mjs`、`tools/test-cocos-browser.mjs` 和客户端README（30套）。
- 来源清单：`tools/cocos-sources.mjs`、`docs/migration/cocos-source-inventory.json`。最终123绑定、91运行PNG、7运行WebP、25共享模块、76场景输入、449来源文件、31历史引用。
- 设计/验收：`DESIGN.md`、`docs/art/ASSET_PLAN.md`、`REVIEW_CHECKLIST.md` 与本文。

## 环境与验证

Node22.23.2 / npm10.9.8（根package-lock）；官方Creator3.8.8；后端Python3.14 venv。Creator使用本任务建立的 `output/cocos-sdk/panel-working.app` 工作副本，原SDK保持。

| 命令 | 结果 |
| --- | --- |
| `npm run cocos:sync`、`npm run cocos:sources:write` | 最终123绑定和来源清单生成；只在真实来源变化后更新。 |
| `COCOS_CREATOR=... npm run check` | 最终真实Creator类型与来源检查通过，日志 `output/cocos-panel-refresh/delivery-check.log`。 |
| `COCOS_CREATOR=... REALQUEST_COCOS_BUILD=web-panel-refresh npm run cocos:build:release` | 独立候选官方release构建通过，debug/sourceMaps关闭，MD5缓存开启；回执与源码/载荷指纹真实有效。 |
| `npm test` | 23组单元/工具检查及236项后端测试通过；1条既有Starlette/httpx弃用提示。单元回执：`output/cocos-unit/2026-10-20T13-21-54-600Z-fe79cf3a/result.json`。 |
| `npm run cocos:test:browser -- --build web-panel-refresh/web-desktop --suite life,interface-refresh,quest-board,consistency,pause,textures,combat-framing,boot,semantics,data,session,world,story,chapter-friction,depths,landscape,dossier,guidance,places,travel,rest,atlas,neighbors,dialogue,inventory,inventory-preview,preferences,preference-layout,village-art,cave-art --continue-on-failure` | 最终 `output/cocos-regression/run-2hWs4O/result.json` complete=true，30/30套、193组检查通过，无未执行套件。 |
| `COCOS_CREATOR=... REALQUEST_COCOS_BUILD=web-current npm run cocos:build:release` | 默认启动包更新成功；与全量回归候选的源码和完整载荷指纹均相同。 |
| `npm run cocos:test:startup -- --build web-current/web-desktop` | 9项真实启动/重复租约/重启同档/异常退出/迁移中断与超时清理检查通过：`output/cocos-startup/run-_cq6hgju/result.json`。 |
| 素材只读复核 | 6项源/派生哈希、尺寸和解码RGBA逐字节相等。 |
| `git diff --check` | 通过。 |

新切片覆盖7个登记尺寸（1440×900、1920×1080、1056×627、1056×515、1024×768、844×390、740×360）与6尺寸核心页面；检查44px操作目标、不重叠/不出界、原生中文登记、真实外观、记录保存与重载、手动来源、不铸造培养点、洞穴明确进入/撤离和锁门禁用。完整Life套件重验跨日计时、归档恢复、同名实体、丢失回包重试、中文长内容和DPR2触摸。完整矩阵继续覆盖奖励幂等、装备/容器守恒、输入隔离、语义、焦点、减少动态效果与战斗等既有行为。

最终运行源码指纹：`5c9b8c534e82392889fb8d2cf2494be6b9fd375e9e5c43760b9bd18d0f9c18da`；载荷：`18523351661a40bbcd3937da5ac2241d06294243dd71d2f1a8410a9e396affe8`。回归后只把manifest实施状态改为完成并重录来源清单；两份清单唯一变化是该manifest记录，运行源码与载荷不变。未改写构建回执绕过检查。

## 实际画面证据

以下全部来自最终真实Cocos浏览器运行，已实际查看代表画面；未制造截图内容或填充假物品。测试角色和日期均为隔离QA，未使用默认玩家库。

- [桌面登记](../../output/cocos-regression/run-2hWs4O/suites/interface-refresh/registration-1440x900.png)、[1056×515登记](../../output/cocos-regression/run-2hWs4O/suites/interface-refresh/registration-1056x515.png)。
- [告示板](../../output/cocos-regression/run-2hWs4O/suites/quest-board/board-1440.png)、[原生键盘焦点](../../output/cocos-regression/run-2hWs4O/suites/quest-board/notice-keyboard-focus.png)。
- [双页随身手册](../../output/cocos-regression/run-2hWs4O/suites/interface-refresh/menu-1440.png)、[成长手记](../../output/cocos-regression/run-2hWs4O/suites/interface-refresh/study-empty-1440.png)。
- [凭证页](../../output/cocos-regression/run-2hWs4O/suites/interface-refresh/credentials-1440.png)、[手动记录](../../output/cocos-regression/run-2hWs4O/suites/interface-refresh/manual-record.png)。
- [740洞穴入口](../../output/cocos-regression/run-2hWs4O/suites/interface-refresh/cave-entry-740.png)、[740锁门](../../output/cocos-regression/run-2hWs4O/suites/interface-refresh/gate-locked-740.png)。
- [旅人档案](../../output/cocos-regression/run-2hWs4O/suites/dossier/dossier-overview-desktop.png)、[邻里](../../output/cocos-regression/run-2hWs4O/suites/places/neighbor-lia.png)、[740出发手记](../../output/cocos-regression/run-2hWs4O/suites/guidance/preparation-gear-740.png)。

各套件目录保留截图、状态JSON、录像及浏览器/服务退出证据；汇总：`output/cocos-panel-refresh/verification-overall.json`。

## 中间失败与批准历史

首轮告示板实现在 `run-RvbDIt`、`run-BrafZB` 验证后取得上述玩家确认；其旧回执保留在 `verification-board-checkpoint.json`，不冒充最终完整矩阵。`run-Ue8rrE` 为整体中间切片。

第一次整体矩阵 `run-e5aWq8` 发现控件包装用对象展开固定了状态，`plan-today` 成功后找不到新书页。已改为保留实时访问器，邻里包装一并复用；没有修改游戏规则适应测试。该轮16套通过，Life失败、后续引导被取消，准确保留为中间证据；只向核对过的控制器发送SIGINT，finally清理。修复后完整Life优先通过，随后最终30套全过。

## 本地预览与清理

默认 `./start.command` / `npm start` 使用新的 `clients/cocos/web-current/web-desktop`。当前为人工查看保留 **http://127.0.0.1:5443**；原有数据库 `output/cocos-local/local-preview.db`，API端口8143。专属启动器PID89288、API89293、代理89294，exec会话3275；ready回执 `output/cocos-panel-refresh/manual-preview-ready-overall.json`。未新建测试角色到此库，也未删除/重置其数据。用户查看完成后可向此专属启动器发送SIGINT，既有finally会退出两个子服务。

最终30套每个浏览器组与服务退出回执均成功，151个记录的所属PID已核验不存在；启动检查的启动器和子服务也全部退出。Creator工作副本在核对无进程/打开句柄后已移除，保留原始官方SDK。没有创建node_repl或Playwright MCP工具宿主；既有共享/归属不明的宿主保持。未保留自动化浏览器，只保留上述人工预览及源码、构建、证据。

剩余未验范围：最终玩家体验意见、物理设备、系统读屏/IME、其它浏览器与原生缩放、完整性能/网络和生产发布矩阵；本轮没有声称覆盖这些。手机竖屏按项目约定不在范围内。
