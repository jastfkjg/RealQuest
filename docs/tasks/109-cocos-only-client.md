# 任务109：Cocos 唯一客户端与旧版清理

日期：2026-10-20。

用户授权：先迁出 Cocos 需要的资源，删除旧 React/Phaser 代码，启动/构建/测试统一到 Cocos，清理无用缓存和测试数据，不保留原玩家存档。本轮没有提交、推送、派发CI、部署、修改系统/账号或操作远程数据库。

## 执行计划与结果

1. 迁出仍被 Cocos 使用的素材、离线绘制源和测试，校验字节/像素/布局。
2. 删除旧应用和仅服务旧客户端的工具/保护门槛，将所有默认入口改为 Cocos。
3. 清理本地历史构建、缓存、QA副本和数据库，实际重建并验证新入口。
4. 浏览器测试结束后删除本轮QA数据库，核验浏览器/启动器/Creator退出。

四项均已完成。当前Cocos包、独立源码与默认入口已验证；本轮数据库、缓存与所属浏览器/服务进程已清理。

## 文件与职责

- 删除 `frontend/`，包括React组件、Phaser世界、旧前端依赖和构建；删除原 `scripts/start.py`。
- `assets/runtime/` 接收146个原素材/来源文件；逐文件SHA256与迁移前一致，原始美术和许可证仍在工程中。109条Cocos资源绑定的目标、UUID、像素与语义ID保持。
- `tools/scene-art/` 接收地表、村庄、室内与家具数据；保留离线绘制入口，移除Phaser导入、预加载和原客户端运行态更新函数，使用独立 `PaintScene` Canvas/布局接口。
- 两个共享纯函数测试移至 `tools/test-{life-journal-dates,next-departure-state}.mjs`；两套原混合引擎脚本移至 `clients/cocos/tools/smoke-{village,cave}-art.mjs`，只保留Cocos分支和相应行为断言。
- `tools/build_ninja_runtime.py` 保留已有CC0派生图的独立Pillow生成器，在隔离临时目录重建后与原PNG字节一致。
- `docs/design/realquest-tokens.css` 保留设计token源；不再作为旧DOM应用的一部分。
- `tools/cocos-sources.mjs` 与来源policy改为当前Cocos/共享/美术归属，移除旧客户端完整性与Git基线门槛。历史旧渲染器来源仍在资产manifest的 `retired_client_provenance`，不再要求旧代码存在。
- 删除旧transition/baseline检查、双客户端浏览器套件及依赖旧Web包的恢复专项。共享后端Cookie/Bearer会话、恢复、幂等和备份测试保留。
- `start.command`、`start-cocos.command`、`npm start` 都进入Cocos预览；默认5443/API8143、`web-current/web-desktop`、`output/cocos-local/local-preview.db`。
- 根 `package.json` 提供 `build`、`check`、`test`、`test:browser`。默认构建使用真实Creator3.8.8 release配置。
- `.github/workflows/ci.yml` 是唯一CI入口；源码/单元/后端使用根依赖。SDK候选显式手动使用预置runner；推镜像还需main上的单独勾选。Docker默认前端直接使用 `output/cocos-delivery` 的Cocos静态包，原生产镜像摘要/数据库/网络与手动部署合同保留。

完整路径和旧/新哈希见 `docs/migration/cocos-client-retirement.json`；`sources.relocated_sha256` 记录首次迁出与接口改写时的中间字节，后续测试分支清理/导入修正的最终哈希由当前 `cocos-source-inventory.json` 记录。完整变更路径见 `output/cocos-retirement/changed-files.json`。

## 数据与缓存

已删除 `backend/realquest.db` 及WAL/SHM、原5442/5443试玩库与备份、历史QA输出和源码/SDK副本、旧构建、旧 `frontend/node_modules` 及构建缓存。清理前确认本机原预览未运行、无同项目其他运行任务；没有停止用户浏览器或其他项目服务。

保留规范源美术、根Node依赖、后端venv、唯一未执行的签名Creator3.8.8输入 `output/cocos-sdk/CocosCreator.app` 和本轮验证证据。Creator使用独立工作副本，构建后已核对无对应进程并清理工作副本和导入缓存。原SDK再次严格签名核验通过。后端测试改为退出时关闭连接并清理临时库，pytest不保留临时数据库；236项重跑通过，并单独清掉已结束启动器的编译缓存。

旧本地output证据已按本轮授权清理；历史任务中这些路径不再承诺可打开。没有启动Docker清卷，也没有接触远程玩家数据或用户浏览器的既有站点存储。

## 验证

| 命令/范围 | 实际结果 |
| --- | --- |
| 迁出文件原SHA256核对 | 146个文件一致 |
| `build_local_scene_art.mjs --refresh-manifest` 与 `--check` | 7张PNG、7个布局、43实际sprite绑定保持；76完整输入 |
| `build_inventory_art.mjs --check` | 9个图标保持 |
| Pillow资产审计 | 163张图与原始来源/派生图/许可哈希通过 |
| `npm run check` | 403来源文件、109绑定与真实Cocos类型通过，包含离线PaintScene类型 |
| 独立源码副本检查 | 763文件、403来源一致；没有旧客户端或Git历史依赖，非第二次SDK构建 |
| `npm test` | 23单元模块、236后端项通过；1条既有Starlette/httpx弃用警告 |
| 部署合同单元 | 19项通过，仅命令桩与配置检查，不连接真实服务器 |
| `npm run build` | 实际Creator3.8.8 release成功，关闭debug/sourceMaps、开启MD5 |
| `cocos:test:startup -- --build web-current/web-desktop` | 9组实际预检、迁移、同库重启、租约及中断清理通过 |
| `cocos:package` 与 `--verify` | 单版本静态包生成并校验通过 |
| `cocos:test:delivery -- --artifact output/cocos-delivery` | 实际Nginx8组通过，含MIME/cache/gzip/404/API/同档/更新回退 |
| 游戏技能客户端 | 两次移动burst、世界状态、无控制台错误；合成截图已查看，浏览器正常退出 |
| 28套Cocos浏览器回归 | 一次28套/185组全部通过，729张PNG、11份录像；查看6张代表截图，非逐图视觉批准 |
| CI YAML与shell | Ruby YAML解析、10段CI shell及7个仓库shell语法通过；未执行远端CI或推送 |

技能客户端第一次使用 `canvas.toDataURL` 得到黑色读回，状态与移动正常；原图和日志保留。改用浏览器合成截图后画面正常，实际查看村庄素材、人物和中文HUD。这是截图读取方式修正，不是游戏修复，不将原黑图当视觉通过。

## 当前可用命令

```sh
# 首次准备见README；修改代码时配置可写的官方3.8.8工作SDK
export COCOS_CREATOR="/你的路径/CocosCreator.app/Contents/MacOS/CocosCreator"
npm run build
./start.command --check
./start.command
npm test
npm run test:browser
```

重新构建前先停止正在使用同一构建目录的预览，或用 `REALQUEST_COCOS_BUILD` 指定新目录。预览没有热更新。此轮删除历史玩家数据的授权不自动扩展到未来产生的新玩家记录。

## 收尾与边界

已核验166个所属PID退出、30份浏览器profile移除及62个端口关闭；没有保留新的浏览器或在线预览。133个当前QA/空默认预览数据库及附属文件按逐套回执、nonce、精确路径、SHA256和无打开句柄清理，报告/截图/录像保留。另核对清理17个旧后端临时库目录和42个无句柄空目录。默认npm启动实际通过，未创建角色，数据库已清理，下一次启动为新库。

自动审查曾拒绝目录范围的数据库清理，原因是未逐文件证明归属；没有执行该删除。随后改为只删除本轮成功运行回执明确列出的133个文件，该精确范围执行成功。清单外数据库没有被该收尾操作触及。

完整浏览器矩阵结束后，只修正了根npm参数透传和源码副本包含pytest/token配置，未改变游戏运行源码、后端或测试用例。相关工具单元、npm预检/真实启动和最终源码检查重新通过；构建与payload指纹与28套矩阵完全一致。最终回执为 `output/cocos-retirement/verification.json`；清理证据为 `cleanup-final.json`。

系统输入法/读屏、物理设备、远端SDK CI和生产环境仍未在本轮执行；它们是相应环境的独立验证，不再是保留旧React/Phaser客户端的门槛。本轮没有新增视觉设计，也不扩大既有玩家视觉批准。
