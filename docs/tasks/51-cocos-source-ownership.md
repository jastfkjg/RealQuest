# Cocos 素材、共享源码与冻结 Web 输入归属

2026-10-17，接续task39 T4。前轮task50已完成独立工具/本机验证并清理专用进程，属于实际进展；实际CI检出、其余工具链与V门槛保留。人工5442/API8142继续服务原task49候选，本轮不切换包、默认启动或发布，不删除原Web或玩家数据。

本轮计划：

1. 从106条实际绑定、既有美术来源与真实打包输入，建立逐文件归属/来源/消费者与所有残留Web引用清单。
2. 场景导出器记录真实传递导入与完整已读图片集合；检查新遗漏/未登记输入和来源哈希，原PNG/布局/生成ID须逐字节保持。
3. 验证有锁工具能在不含原Web依赖/构建产物的源码副本中检查和重建；检验未登记引用、丢失来源或字节漂移会失败。
4. 记录实际结果和未完成门槛，清理本轮测试资源，保留人工预览。

本轮不迁移或复制一套手工维护的游戏规则，不重画界面；canonical逻辑仍在shared/game，Cocos core为生成副本。可按task39保留冻结Web素材/绘制输入，但必须标清长期归属与删除前迁出条件，不能将停止发布误当成可删源文件。

## 已实现的归属与保护

`docs/migration/cocos-source-policy.json`是归属决策；`cocos-source-inventory.json`由`tools/cocos-sources.mjs`从实际文件生成，不能当成第二份手改规则表。当前354个文件、106条绑定、86处静态字符串/模板引用均有分类。354包括规范源、生成副本、原图/提示词/整理器、完整绘制输入、来源与保护合同、实际扫描的原生/工具源码；不是354个运行时资产。

| 输入 | 当前归属/处理 |
| --- | --- |
| 25个shared/game模块 | 规范行为/描述；仅在这里编辑，再同步Cocos core；原Web兼容重导出保留 |
| 81张运行PNG（12,396,397bytes） | 64来自冻结frontend素材，16来自可复现衍生目录，1为原satchel PNG；Cocos资源复制字节、81个UUID/帧/纹理ID及nearest/untrim/不可pack状态检查 |
| 91个冻结Web文件 | 84张素材（包含烘焙读取但不入包的图片）、5个离线绘制/数据模块、2个原共享行为测试；长期由共享美术/工具维护其可用性，先保留原目录；删除/归档前另行迁出、保留双端兼容并验证原字节/来源 |
| 场景读取集合79项 | 68图片+11代码/数据/工具：含真实esbuild传递导入、Python app地图模块；不是仅列3个顶层绘制器。7PNG/7布局/43实际sprite绑定不变 |
| 原PNG整理器 | village/detail/market/resident/departure五个旧整理器保留；其整族原始输入亦保留（含非当前Cocos角色用到的boat/cliff），提示词/布局/原图哈希有记录 |
| Web路径字符串 | 86处含14条规范/生成描述URL、保护合同、离线绘制、原素材整理、显式可选双端对照、检测器和负例夹具。不是86个生产请求；原生Cocos新Web路径/URL未经登记会失败 |
| 历史Git保护 | baseline文件与原95371f2历史需求单列，仅保护用途，仍归T6；不会把整个原Web打进Cocos包 |

每张使用的PNG都必须匹配其原美术来源记录并递归记录原图；场景输入的单纯校验和不能冒充原图创建/权利来源。当前没有引入Ninja/Kenney包、第三方素材、新字体/声音或生成图，没有改变任何源PNG/语义ID或增加画面批准。

`cocos:check`先执行来源检查，再用真实Creator声明检查106绑定。故意修改后须先同步、检查实际差异，再显式`cocos:sources:write`；生成记录不会悄悄接受未知来源。ASCII排序避免主机locale影响清单。静态检查覆盖当前列明源码和实际打包输入，不声称对任意动态JS/Python表达式做数据流证明。

`build_local_scene_art.mjs --refresh-manifest`先验证原PNG/布局再仅写来源元数据。新增完整读取集合修正了旧47项清单的传递模块/已读未入包图像遗漏。正常`--check`同时验证像素产物与完整来源，不放宽旧哈希。

## 命令与实际结果

根目录Node22.23.2/npm10.9.8、Creator3.8.8、现有Python3.14.6 backend/.venv；原PNG整理器使用已安装的bundled Python3.12.14/Pillow12.3.0，确切Pillow单列tools/requirements-art.lock.txt。`REALQUEST_ART_PYTHON`可指向按此可选锁安装的环境；未修改/升级后端或全局包，没有联网获取新依赖。

```sh
nvm use
npm ci
export COCOS_CREATOR="/你的Creator3.8.8路径/CocosCreator"
npm run cocos:sources
npm run cocos:check
npm run cocos:test:unit
npm run cocos:baseline
npm run cocos:art:check
# 原整理器可选环境的明确检查（不会把Pillow装入backend）
REALQUEST_ART_PYTHON=/你的带Pillow12.3.0的python npm run cocos:doctor -- --art
# 已审查输入变化后的明确元数据更新；不会更改PNG/布局
node tools/build_local_scene_art.mjs --refresh-manifest
npm run cocos:sources:write
```

| 实际验证 | 结果/证据 |
| --- | --- |
| 本机16单元模块；最终源码副本再次执行16模块 | 全通过；含新增3组来源检查行为、原15模块；unit/result.json与clean-source-2nYuRr/output/source-unit/result.json |
| 来源检查+真实Cocos类型；原Git保护 | 106绑定/81稳定导入ID/25共享模块与390原源+精确抽取/原物品表保护通过 |
| 根有锁工具独立安装 | 副本854个候选源文件，无frontend/package.json、node_modules、dist或编辑器缓存；root npm ci离线安装5项，仅复用既有下载缓存 |
| 六种实际CLI失败夹具 | 未登记原生Web URL、规范字节漂移、原图来源缺失、稳定UUID漂移、传递detailAssets数据漂移、未登记原生源码均拒绝；finally恢复后基线通过，negative-final/result.json |
| 五个旧PNG整理器，使用现有Pillow12.3.0 | 全部退出0；354个登记文件和854个副本源文件均零字节变化；upstream-final/result.json |
| 整理器后sync→来源/类型→衍生检查 | 106重新同步后仍匹配；7场景PNG/7布局/43sprite+9图标全部原字节复现，79项输入正确；clean-{sync,typecheck,art}.log |
| 仅刷新来源的失败/恢复 | 隔离副本损坏衍生图时拒绝且不覆写该图/布局/manifest；finally恢复后正常刷新仍匹配854源哈希，refresh-result.json |
| 工具运行时失败状态 | Node25的来源命令按预期拒绝；没有Pillow的backend环境执行可选--art按预期失败，原backend环境不受影响；两份诊断日志保留 |
| diff/语法/原图校验 | diff与6个工具语法检查通过；根212绑定源/输出文件逐字节相同，259运行时文件与task50已验证源副本相同，无游戏源码/数据改动 |

冷副本是当前授权工作树的源码快照，非已提交版本的CI检出；两份守卫/生成清单调整在最终测试前同步并更新该副本source-manifest，未改游戏/美术输入。后端venv通过明确symlink复用，Creator/Chromium和可选Pillow工具为已有二进制；不宣称完成全新Python/SDK安装或目标平台验证。既有Phaser最小适配仅用于原离线绘制函数，不是Cocos游戏引擎的替身。

五个旧整理器只在该副本执行，因为它们会输出原frontend PNG和manifest；执行记录脚本为output/cocos-source/rebuild-fixture.py，负例为negative-fixtures.py，都要求本轮source-manifest归属并在finally恢复。正常原仓没有执行上游原PNG覆盖。最终副本只重建原素材链，本轮没有重新打包Creator或新增游戏画面/交互验收；运行时文件与已验证task50包相同，人工task49包未切换。

## 交付与剩余项

主要改动：新增归属策略、生成清单、tools/cocos-sources.mjs/test-cocos-sources.mjs与可选requirements-art.lock.txt；补完整场景来源与仅刷新元数据模式，更新对应local-scene-art-v1.json；check.mjs接入守卫，doctor提供--art，unit增加1模块，根package增加2个来源命令；README/shared说明和进度/美术文档据实更新。没有另建游戏规则、移动旧输入目录、删除Web、迁移真实数据库或提交/推送/部署。

T4的当前输入归属/残留引用登记和停止Web构建后的重建证据已齐备；冻结源位置是清单允许的过渡安排，未来真正归档/删除仍须先迁出且另获授权。T1主入口、T2发布/CI、T3实际提交的干净CI检出、T5统一当前浏览器/端口/库、T6保护与发布范围、V1–V7及玩家待评画面继续开放。下一步推进T5，把当前候选回归与隔离服务配置收拢，不能用本轮素材检查代替完整游戏、实机或发布验收。

最终核验无本轮专属Node/Creator/esbuild/headless进程；短命离线绘图Chromium均finally关闭，本轮未启动API/预览服务，5446/8146空闲。人工47723/47725/47726及5442/API8142健康，原task49包/库和用户浏览器保持。已核对新近Node父子关系/启动参数/cwd；其他工程、共享/归属不明工具宿主保留，没有批量终止。保留本轮源副本与日志供复现。证据output/cocos-source/cleanup.json。README及检查清单说明在资产验证后同步至副本，不改变游戏或绘图输入；最终854源文件均与当前原仓一致。
