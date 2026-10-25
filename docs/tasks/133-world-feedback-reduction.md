# 世界目标标记与轻量反馈

2026-10-25 用户确认移除树干矩形框、室内四角框与普通失败大横幅，保留必要轻反馈并更新默认入口。本轮已交付 `http://127.0.0.1:5443/`；开发验证完成，玩家主观观感另行反馈。

计划：确认来源 → 收敛目标/操作反馈 → 实际Cocos桌面与横屏交互验证 → 保留原存档、完整切换默认包并核验实际入口。均已完成。

## 实现与文件

- `clients/cocos/assets/scripts/Bootstrap.ts`：取消斧/镐矩形目标框；锄/壶只在有效地块显示淡色填充落点。普通阻挡点击用短暂小标记回应；无法到达实际物件、体力/工具门槛与请求失败仍显示简短说明。资源状态1.6秒、成功2.6秒、必要错误4秒自动收起。普通资源提示去重，当前同一提示不延时；独立失败/确认可重新显示。文字按内容大小布局，避开角色、HUD与操作按钮，待确认重连操作保留。
- `clients/cocos/assets/scripts/localSceneView.ts`：移除靠近物件时的包围四角，保留实际行走路线、家具响应和普通阻挡的小落点反馈。
- `shared/game/tools.ts`：资源阶段分别表达为“已采完”“幼树生长中”；`clients/cocos/assets/scripts/core/tools.ts`、`clients/cocos/asset-bindings.json`由既有同步工具生成。规则、费用和权威结算不改。
- `clients/cocos/tools/smoke-world-feedback.mjs`、`tools/cocos-browser-suites.mjs`：加入实际点击资源、重复输入/过期、室内阻挡、有效耕地、桌面/横屏、DPR2触控与减少动态检查。
- `DESIGN.md`、`docs/migration/cocos-source-inventory.json`、`progress.md`与本任务记录同步。未扩大到面板或洞穴新视觉处理，键盘控件焦点标记仍保留。

## 美术

没有新增或修改位图、字体、音频、下载或生成服务。现有树木/幼树/矿石阶段图、工具全身姿态与室内素材保持原字节；轻提示、地块填充和小落点为原生Cocos Graphics/Label。现有素材来源仍见原asset-manifest，不制造持有物、收获或新资产路径。

## 实际环境与命令

Node22.23.2/npm10（沿用package-lock），既有Python3.14虚拟环境，官方Cocos Creator3.8.8。没有pyproject.toml；SQLite迁移保持004。构建使用 `output/cocos-toolchain/clean-source-LKr4r5` 的隔离源副本与本任务官方SDK克隆，不在服务中的目录上构建。

| 命令/检查 | 结果 |
| --- | --- |
| `npm run cocos:sync` | 361绑定，素材原字节复用 |
| `npm run cocos:sources:write`、`node tools/cocos-sources.mjs --check` | 1066来源登记/核验通过 |
| `COCOS_CREATOR=<本任务官方SDK副本> npm run cocos:check` | 361绑定与真实引擎类型通过，`output/world-feedback-133/types-final.log` |
| `node tools/cocos-unit.mjs --only tools,local-scene,farming --report output/world-feedback-133/unit/result.json` | 3相关模块通过 |
| 候选源内 `REALQUEST_COCOS_BUILD=web-feedback-133 COCOS_CREATOR=<本任务副本> COCOS_USER_DATA=/private/tmp/realquest-feedback-133 node clients/cocos/tools/build.mjs web-desktop --release` | 最终release通过，`build-4.log`，debug/sourceMaps关闭、MD5缓存开启 |
| `node tools/cocos-browser.mjs --build web-feedback-133/web-desktop --suite <world-feedback、tools、session各自独立运行>` | 最终三套同一源码/包，结果如下 |
| 提供的技能帧客户端（沿用项目Cocos加载等待、WebGL截图与finally适配） | `node output/world-feedback-133/frame-client.mjs --url <world-feedback独立QA地址> --actions-file output/world-feedback-133/frame-actions.json --iterations 1 --screenshot-dir output/world-feedback-133/frame-final` 退出0，截图/状态已检查 |
| `git diff --check` | 通过 |

| 最终浏览器专项 | 结果 | 证据目录 |
| --- | --- | --- |
| world-feedback | 7组 / 13图 / 0意外错误 | `output/cocos-regression/run-51obSK` |
| tools | 11组 / 32图 / 0意外错误 | `output/cocos-regression/run-YxHPUH` |
| session | 6组 / 20图 / 0意外错误 | `output/cocos-regression/run-ejqmuq` |

合计24组 / 65张专项PNG，另有帧客户端与默认Chrome截图。资源、室内、有效地面、体力失败、740横屏网络失败/恢复等代表实际截图已直接查看；真实劳动、升级/种植/水量、失败/丢回复重试、持久化、Life/失焦取消、8格快捷栏、真实触控与原会话接续均覆盖。视频在world-feedback、tools的video/touch-video目录。

最终源码：`b7246200a0c8213d0dee26721733bdf3b26fdd34ad73fc8951150d01c3428507`；最终包：`2d1e21f4608fdbc479d30f7653600c2141bf80c98ebb39c2fca1ff621204a8ff`。三套最终回归与默认包指纹完全相同。报告汇总为 `output/world-feedback-133/verification.json`。

早期失败保留：`run-ilYIng` 的耗尽检查用了未朝向目标的E输入，修正为真实点击；`run-VtX1Db`实看发现局部提示退到边缘后中断工具套重建；`run-EvFNfD`的会话套捕获连续独立网络失败被同文案去重误压，已修正并用最终三套完整复测。早期失败/中断未计入最终通过结果。初次沙箱内Creator无日志退出，受控本机官方SDK运行成功；没有伪造构建回执。

## 默认5443与原存档

完整新包准备并核验后，以目录重命名切换 `clients/cocos/web-current`；旧默认包保留 `output/world-feedback-133/default-build-before`。未在服务中的包上逐项覆盖，也未改写旧回执。

`verifyBuild`确认当前源码/完整包；实际5443的收据及全部995项资源（45214047字节）逐项GET哈希匹配，API健康200，详见 `default-http-verified.json`。原launcher57646/API57680/proxy57681保持运行，仍使用 `output/cocos-local/local-preview.db`、`realquest_cocos`与5443/8143，未重启API、换库或换cookie。

原玩家库通过既有在线备份工具保存至私有 `output/world-feedback-133/player-backup/`。原Chrome同一凭证点击“继续旅程”，回到原角色、原林间小屋、原手持斧；实际室内无四角框，点击上方阻挡墙面无横幅。默认截图 `output/world-feedback-133/default-5443.png`、AX记录与控制台检查（0错误）保留。界面确认后自有标签139944939已关闭并核验，用户原其他标签保持。

两名既有玩家的库存、完整工具状态、田地/作物及位置指纹前后完全相同，见 `player-invariants-before.json` / `player-invariants-after.json`。只正常接续与点击阻挡地面，未执行劳动、购买、切换工具或重置；正常游戏时钟会推进，不声称整个存档字节不变。

## 清理与边界

成功、失败及中断的QA浏览器/API/代理/Node控制器均按finally退出；本任务Chrome标签已关闭，专用SDK与编译缓存清理及PID/profile复核见 `output/world-feedback-133/cleanup.json`。仅保留原默认5443/API8143服务供用户体验，保留回退包和QA证据；用户Chrome与共享工具宿主/其他任务未动。

没有修改后端、存档格式或结算规则，因此未重跑全部后端与全部世界回归。实体手机、原生IME/读屏及玩家主观美术/手感不由自动化推定；手机竖屏不在本次范围。未提交、推送或外部部署。
