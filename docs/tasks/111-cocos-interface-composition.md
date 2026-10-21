# Cocos 页面构图与操作层级修正 — 2026-10-20—21

状态：整体修正、实际画面复核与工程验证完成，默认启动包和5443人工预览已更新。用户指出的书页越界、无用移动提示、突兀右上角操作、按钮不协调与数据面板式信息均纳入本轮。最终工程通过不等同于玩家对所有最终画面的批准。

## 目标与实施

视觉主张：温暖纸页上的墨迹目录与苔绿布签，按真实书页边界组织物件、状态和下一步行动。各页共享材质与控件，不复制同一种大面板构图。

先核对用户附图、当前源码和原书页素材，修正书页与HUD，再分清目录/分类/返回/确认的操作层级，重排信息，最后通过真实Cocos浏览器检查交付。没有停留在更换底色或材质。

| 范围 | 最终结果 | 主要文件（均位于Cocos原生源码） |
| --- | --- | --- |
| 随身手册 | 两叶内容按实际纸页内缘留白；墨迹目录、右侧快捷键、轻量“合上”；移除书内WASD说明 | `ui/journeyMenu.ts`、`ui/materials.ts` |
| 弹窗焦点 | 集中弹窗提前停止绘制世界HUD/导航/移动提示，保留底层环境；对话与物品预览保留必要场景 | `Bootstrap.ts` |
| 统一控件 | 目录为墨迹行，分类为布签，返回/翻页轻量，确认是切角行动牌；木材上的返回有深苔绿底；保留44px目标、选中、焦点、悬停、按压、禁用及减少动态 | `Bootstrap.button`、`ui/materials.ts`、`ui/panels.ts` |
| 档案与培养 | 角色/身份、真实生命体力比例、经验、物资分层；七项能力分列；培养突出当前→下一值、真实费用、余额与缺额 | `ui/dossier.ts` |
| 成长与计时 | 分类和正文分别约束在两叶中；子页收窄，研习显示实际分钟进度，当前计时突出真实时长；表单/来源和长内容保留 | `ui/life.ts` |
| 指南与地点手记 | 桌面标题、实际物件、原文分层，去除肖像底卡；紧凑页保留完整分页 | `ui/guidance.ts`、`ui/places.ts` |
| 邻里详情 | 人物/签名、当前地点/时钟、熟悉度、真实礼物偏好与到场操作分区，避免大段等权字段 | `ui/places.ts` |
| 柜台与装备 | 真正交易物品/武器图标、重点属性与成本分开；阅读宽度收敛，确认仍显式执行 | `ui/panels.ts` |
| 相关窗口 | 已有行囊、地图、对话、凭证、休息、设置继续各自构图，沿用新操作层级；储物槽使用实际已载入的物品图标，缺图才保留文字后备 | `ui/storage.ts`、共享控件与既有各视图 |
| 网络恢复交互 | 重连期间不运行后台世界轮询/心跳；等待回放、权威刷新与当前输入租约确认后才结束处理中，随后重置轮询锚点 | `Bootstrap.update/reconnect` |

原任务/外观/物品/导航ID、保存、计时归属、日期/历史/归档、奖励与资源规则保持。标记不传送，购买不自动装备，现实成长仍可直接进入。没有改变后端、协议、数据库迁移或经济。

所有文字/输入/状态仍是原生Label/EditBox。按压位移在减少动态时取消，键盘焦点清楚且逐层返回；输入和中文组合输入保持既有所有权。目录可访问名称与可见标签一致，视觉快捷键保留。

## 文件与素材

- 原生变更：`clients/cocos/assets/scripts/Bootstrap.ts`、`ui/materials.ts`、`journeyMenu.ts`、`panels.ts`、`questBoard.ts`、`dossier.ts`、`guidance.ts`、`life.ts`、`places.ts`、`storage.ts`。
- 测试变更：扩展已有 `clients/cocos/tools/smoke-interface-refresh.mjs`；新增实际书页内缘、HUD隐藏、控件尺寸/不重叠及七类服务窗口检查。没有放宽原语义、数据、取景或会话套件断言。
- 设计/证据：`DESIGN.md`、`docs/art/ASSET_PLAN.md`、`REVIEW_CHECKLIST.md`、`docs/migration/cocos-source-inventory.json`、本文。
- 本轮没有新增/修改美术、派生编码、字体或授权来源。复用已有书页、角色、武器、手记、金币、床铺等；原来源/尺寸/哈希仍见 `docs/art/cocos-panel-materials-v1.json` 与asset manifest。原生线条/状态条不冒充新贴图或持有物。
- 保留任务110的未提交成果和其素材来源记录，未重置或删除玩家数据；未提交、推送或发布。

## 实际命令与结果

Node22.23.2 / npm10.9.8、根package-lock，后端Python3.14 venv，官方Creator3.8.8。构建/类型检查使用本任务创建的 `output/cocos-sdk/composition-working.app`，没有执行原始SDK；工作副本已在收尾删除。

| 命令 | 结果 |
| --- | --- |
| `npm run cocos:sources:write`、`npm run cocos:sources` | 按实际文件录入并通过；123绑定、91运行PNG、7运行WebP、25共享模块、76场景输入、449来源文件、31历史引用。 |
| `COCOS_CREATOR=... npm run check` | 最终真实引擎类型/来源通过，`output/cocos-composition/delivery-check.log`。 |
| `COCOS_CREATOR=... REALQUEST_COCOS_BUILD=web-composition npm run cocos:build:release` | 官方release候选成功，debug/sourceMaps关闭、MD5缓存开启，真实源码/载荷回执有效。 |
| `npm test` | 最终23组工具/逻辑单元及236项后端通过，1条既有Starlette/httpx弃用提示。单元回执：`output/cocos-unit/2026-10-20T17-36-44-363Z-2c09d47a/result.json`。 |
| `npm run cocos:test:browser -- --build web-composition/web-desktop --suite session,consistency,semantics,interface-refresh,combat-framing,pause --continue-on-failure` | `run-E7kjFj` 6/6通过，实际恢复/输入/取景套件串行执行。 |
| 同上 `--suite life,dossier,guidance,quest-board,landscape,preferences,preference-layout,places,atlas,neighbors,dialogue,inventory --continue-on-failure` | `run-Yfk4qa` 12/12通过。 |
| 同上 `--suite textures,boot,data,world,story,chapter-friction,depths,travel,rest,inventory-preview,village-art,cave-art --continue-on-failure` | `run-r40vE7` 12/12通过。 |
| 同上 `--suite interface-refresh` | 最终交付重验 `run-p5SOdZ`通过；移除实现耦合的皮肤名字断言后重跑，所有几何/HUD/输入/数据断言保留。 |
| `COCOS_CREATOR=... REALQUEST_COCOS_BUILD=web-current npm run cocos:build:release` | 默认包与测试候选的源码及完整载荷指纹完全相同。 |
| `npm run cocos:test:startup -- --build web-current/web-desktop` | 9项真实启动/重复租约/重启同档/异常与迁移中断、超时清理检查通过：`output/cocos-startup/run-smj1_g5v/result.json`。 |
| `npm run cocos:backup -- backup --database output/cocos-local/local-preview.db --output output/cocos-backup/composition-preview-before` | 原库只读备份完成；新预览启动后的完整逻辑快照与备份相等，2个角色/455回执均未变。 |
| `git diff --check` | 通过。 |

三份最终矩阵合计 **30个不同套件、194组检查**，全部complete=true、无未执行套件，同一源码和完整载荷；没有拼接不同运行版本来声称完整通过。最后只移除内部皮肤名称比较并重录测试来源清单，唯一清单差异是 `smoke-interface-refresh.mjs`，随后又运行该套；运行源码和载荷不变。

源码指纹：`f5ac1158e133a51d8230559d09d6cfa863d1648dc69111ac7b786eae87195454`；载荷：`d8f00f4b3c1628f48e55f2a5b0fb70fe21276222e4e145a033d3ba1f6b93d56b`。汇总与原始回执链接：`output/cocos-composition/verification.json`。

## 画面与交互证据

实际检查1440×900、1920×1080、1056×627、1024×768、844×390、740×360；登记另含1056×515。书页约束由实际纹理内缘定义，不能以屏幕内不溢出代替。桌面与横屏有真实键盘、焦点、分页和DPR2触摸回归，未声称物理触屏测试。

以下为最终真实Cocos截图，已实际查看代表页；没有制作合成界面或填充假物品。其余截图、状态JSON与录像保留在各套件目录。

- [1056手册](../../output/cocos-regression/run-p5SOdZ/suites/interface-refresh/menu-1056.png)、[1440手册](../../output/cocos-regression/run-p5SOdZ/suites/interface-refresh/menu-1440.png)。
- [成长手记](../../output/cocos-regression/run-p5SOdZ/suites/interface-refresh/study-empty-1440.png)、[手动记录](../../output/cocos-regression/run-p5SOdZ/suites/interface-refresh/manual-record.png)、[键盘焦点](../../output/cocos-regression/run-E7kjFj/suites/semantics/valid-study-keyboard-focus.png)。
- [档案](../../output/cocos-regression/run-Yfk4qa/suites/dossier/dossier-overview-desktop.png)、[培养](../../output/cocos-regression/run-Yfk4qa/suites/dossier/growth-1920.png)、[邻里详情](../../output/cocos-regression/run-Yfk4qa/suites/places/neighbor-lia.png)。
- [柜台](../../output/cocos-regression/run-p5SOdZ/suites/interface-refresh/market-counter-1440.png)、[装备](../../output/cocos-regression/run-p5SOdZ/suites/interface-refresh/armory-1440.png)、[储物](../../output/cocos-regression/run-p5SOdZ/suites/interface-refresh/storage-1440.png)。
- [740洞穴入口](../../output/cocos-regression/run-p5SOdZ/suites/interface-refresh/cave-entry-740.png)、[740休息](../../output/cocos-regression/run-p5SOdZ/suites/interface-refresh/rest-740.png)、[偏好](../../output/cocos-regression/run-p5SOdZ/suites/interface-refresh/preferences-1440.png)。

服务窗口通过真实入口打开；米拉与柜台同处时，测试先对话再选“逛逛小铺”。QA只修改其专属库的指定服务位置用于视觉检查，没有把测试角色/物品写进人工库。

## 中间失败与修复边界

早期来源清单预检和沙箱回环EPERM失败后按实际文件/授权本地环境重跑，不计作通过。`run-UXmnkB` 的更强边界检查发现“合上”高2px，修正坐标后通过。初轮柜台测试误认为最近对象应是柜台，已改走真实米拉对话，没有改变NPC优先级。

初次三路矩阵27套通过，语义、会话和取景失败。语义是可访问名称额外附加快捷键，已与标签对齐。取景记录显示并行截图时持续按键把角色走出原近距范围；未改镜头/移动规则/断言，之后独立串行原套件通过。会话串行仍失败，实际后台轮询与重连权威刷新竞争，不能归咎并行；进一步一致性检查又发现恢复后立即补心跳产生新的待保存项。最终由重连独占刷新与租约确认、结束时重置轮询锚点，全部恢复/一致性断言通过，没有删除或放宽它们。中间取消均向核对过的专属控制器发SIGINT并保留回执，未算成功。

## 本地交付与清理

默认 `./start.command` / `npm start` 已使用新版。保留 **http://127.0.0.1:5443** 供人工查看，API8143，仍是原库 `output/cocos-local/local-preview.db`。旧专属启动器89288及子服务89293/89294已正常退出；新启动器13134、API13143、代理13144，exec会话21906，ready回执 `output/cocos-composition/manual-preview-ready.json`。用户查看完成后向该启动器发SIGINT即可由finally关闭其两个子服务。

最终浏览器/测试服务及启动检查退出证明全部通过，193个最终测试/启动/单元记录PID已核验不存在；同时追溯本轮18次成功/失败/取消运行，共489个回归所属PID均不存在。`composition-working.app` 经进程/句柄核对后删除，原始SDK保留。没有创建node_repl或Playwright MCP宿主；共享及归属不明宿主保留，不按名称批量清理。没有保留自动化浏览器。

清理：`output/cocos-composition/cleanup.json`；原库不变：`save-preservation.json`；完整汇总：`verification.json`。保留源码、默认/候选包、QA截图/录像/回执及上述人工预览。

剩余未验范围：物理设备、系统读屏/原生IME、其它浏览器及原生缩放、完整性能/生产矩阵与玩家最终体验意见。手机竖屏按项目约定在范围外；本轮未宣称这些通过。
