# Cocos 行囊与四格快捷栏

2026-10-17 最新玩家验收：在5442现有试玩复核后，玩家确认“这三处都可以保留”，范围为当前地图与找村民、底部交谈回答、行囊四格。此前task49偏好页/操作/音量音色的确认继续有效。以下早期拒绝与待复核记录保留为迭代历史，以本段为当前范围；不扩大到其他画面、战斗/远行手感、实机或原Web退役。

2026-10-17，接续task39 M7。聊天task46候选已交复看，未获画面批准；本轮复用原Web已获准的行囊物件方向，不把聊天布局扩展到此处。

视觉主张：物品放在行囊里，选中的物品附一张短用途签，四格口袋与菜单分开；真实空格和耗尽引用可辨认。

内容顺序：真实持有→选择物品→用途/来源/去处→安排四格→回到世界选择种子→看清相邻空地/消耗→确认播种→核对服务器结果。

交互主张：选择不消费，装入/清空口袋明确；远处只标方向，近处才可看动作确认；减少动态保留直接反馈。确认固定目标和报价，不在刷新后偷偷改成另一块地。

计划：抽取原物品登记表为单一来源并严格保留Web语义；按存档保存四格/选择、旧全局偏好只预览后主动带入；原用途与现场动作；原生行囊与世界快捷入口；专属测试库验证跨旅程/耗尽/拒绝/丢包重放/播种链和桌面/短横屏。

边界：原Web/源素材/数据库保留，真实命令与奖励规则不变；不制造容量限制/物品，不自动归属旧全局偏好。本轮实际Cocos画面需单独复核。


## 已接入的候选

聊天task48候选交复看后恢复本链。`shared/game/items.ts`原样抽取原14种登记表，Web保留纯重导出；原Git内容和wrapper精确断言继续保护语义。`shared/game/inventory.ts`管理按saveId隔离的选择/四格、重复交换、清空与可选存储失败时的窗口内保留。旧全局Cocos/Web偏好仅预览，玩家选择来源后主动带入当前旅程，保留原全局键；不推断归属或伪造物品。

`ui/inventory.ts`已接入Bootstrap的行囊、世界四格、快捷1–4、实际目标确认与删除/换旅程生命周期。桌面24展示格和短横屏12格分页都不声明容量限制；只展示真实持有或明确标注的物品图鉴。耗尽的快捷引用保留名称/0，无持有图；空世界格禁用，行囊内可整理。物品用途/来源完整翻页，金币、能量、知识碎片可查看完整数值。图标、计数和口袋整体响应悬停/按压，键盘焦点清楚，减动态保留直接反馈。

种子从附近快捷格进入固定实际农田预览，远处只标记；木材近工坊可预览3木材→1木板，萝卜按工坊等级或服务端小铺价格报价。选择/整理/标记不消费；确认才用原服务器命令。目标、地点、报价或成熟时长变化会使原预览失效，不偷偷换地/换价。拒绝保留重试，丢包沿用原durable request_id；不确定结果可重连核对。现实成长始终可直接进入，模式变更会作废预览，迟到的移动或提交响应不得抢回页面。

布袋复用原已批准Web的原PNG，以相同源像素九宫格装饰；原金币PNG与5种原物品PNG保持不变。9种原工程SVG符号以离线Chromium原样渲染64px PNG，元数据见`docs/art/cocos-inventory-icons-v1.json`；源图/外部素材/字体/音效未增加或修改。Cocos实际画面仍需新的玩家检查点，不能继承原Web画面批准。

## 可复现命令

保持Node22.23.2、Python3.14.6、Creator3.8.8、既有npm/锁文件。工程根目录：

```sh
node tools/build_inventory_art.mjs --check
node clients/cocos/tools/sync.mjs
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
node clients/cocos/tools/check-baseline.mjs
node clients/cocos/tools/test-inventory.mjs
node clients/cocos/tools/test-core.mjs
node clients/cocos/tools/test-features.mjs
node clients/cocos/tools/test-dialogue.mjs
node clients/cocos/tools/test-local-scene.mjs
REALQUEST_COCOS_BUILD=web-inventory-reviewed COCOS_USER_DATA=/private/tmp/realquest-cocos-inventory COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/build.mjs web-desktop
backend/.venv/bin/python clients/cocos/tools/run-preview.py --build web-inventory-reviewed/web-desktop --port 5446 --api-port 8146 --database output/cocos-inventory/test.db
# 待服务就绪，另一个终端：
node clients/cocos/tools/smoke-inventory.mjs
node clients/cocos/tools/smoke-inventory-preview.mjs
REALQUEST_DIALOGUE_REVIEW=inventory node clients/cocos/tools/smoke-dialogue.mjs
# 原Web独立输出，不覆盖frontend/dist；在frontend目录执行：
npm run build -- --outDir ../output/cocos-inventory/web-preservation-build --emptyOutDir
```

浏览器套件硬编码独立5446/API8146与test.db，只使用自己创建的游客。自然链不修改位置/余额/成熟时刻；全物品展示、耗尽、工坊/小铺近距是明确标注的隔离夹具，不能当成自然获得、经济平衡或多日离线证据。数据删除也仅针对本套件自己的B旅程。浏览器均finally关闭，用户原标签和人工5442库不用于自动化。

具体更改：`Bootstrap.ts`/`ui/inventory.ts`/`ui/panels.ts`负责模式、原生物品格与确认；`platform.ts`按已确认删除旅程清理对应偏好；`shared/game/{items,inventory}.ts`及同步core是共用定义与纯逻辑；`sync.mjs`/`build_inventory_art.mjs`/9份derived PNG/资源绑定/元数据负责可复现美术；`test-inventory.mjs`、两个专属浏览器套件和原聊天套件新增隔离目标负责验证。工程脚本、原Web重导出和严格baseline保护同步更新。其余历史脏工作区改动保留。

## 验证与交付

- **已完成本地候选**：最终`web-inventory-reviewed/web-desktop`真实Creator构建退出成功，105绑定/真实类型通过；偏好/现场报价两组、核心17组、功能/中文逐句/场景回归、390原文件+严格原登记表/wrapper保护通过。原Web独立生产构建通过，已有大包提示保留；未覆盖frontend/dist。没有本轮后端规则/迁移修改，不把历史后端测试说成本轮重跑。
- **最终浏览器主链11组/59张**：四格逐一安排/交换/清空/重载；1920/1440/1024及844/740横屏；真实新游客走到农田→快捷种子→固定目标/消耗/成熟预览→取消/422拒绝→同ID已提交丢包重放只消费1种子；另一客户端真实占田后原预览禁用；原14种用途/来源全叶、完整大额钱袋、0引用；实际3木材制作1木板、材料不足、两处真实出售；EditBox文本与合成composition输入拥有权；原全局来源预览/取消/带入净化；实际备份确认恢复A↔B；偏好可选存储写失败窗口内保留；B删除响应丢失/重载确认只清理B，A与旧全局源保留；DPR2减动态真触屏通过。
- **最终预览边界4组/11张**：实际固定农田在桌面/短横屏始终可见；悬停/按下/拖出取消/键盘焦点；两次响应丢失后的可见重连同ID仅消费1，原预览不被复用；迟到move不覆盖后进入的Life，blur清理持键；真实plant已提交但响应延迟，玩家直进Life后服务器只更新数量，不抢回行囊。
- **最终聊天回归3组/9张**：逐句/E重复保护/聚焦Space、底部附着回答、两人镜头、尺寸变化/资料返回/退出恢复、DPR2减动态触屏通过。原技能帧客户端的Cocos真实时钟适配3轮/3张，无加速服务器时钟：首轮行囊内方向不移动，Escape回世界，随后世界移动仍正常。
- 合计**82个独立截图名**，无意外页面/控制台错误。手动检查实际行囊、740横屏、完整物资、物品按压、固定农田740、触屏口袋、聊天回答和迟到提交后的Life截图。`output/cocos-inventory/{result,preview-result,reader-result}.json`、`smoke-reviewed.log`、`preview-reviewed.log`、`reader-regression.log`、`inventory-flow.webm`、`frame/`和`build-info.json`保存真实证据与源码/最终编译包哈希。早期v1/v2/final的部分测试脚本运行不作为最终整轮结果。
- 素材`--check`原样复现9份SVG衍生PNG；105绑定类型检查和原163图只读Pillow审计通过。既有PNG/源SVG/源包不改，不新增外部素材、字体、音效、AI生成、依赖或购买。
- **人工预览已交付**：5442/API8142同源同库`output/cocos-data/local-preview.db`，停旧服务后只读一致备份到`output/cocos-inventory/manual-before-inventory.db`；1个真实玩家完整players行切换前后指纹相同，两个地址200。没有代操作用户旅程或清除会话。`handoff-check.py`/`handoff-before.json`/`handoff-result.json`记录备份、指纹和包；保留launcher40818/API40820/代理40821，session20889供人工体验。
- **已清理**：本轮15个旧候选/QA进程及对应端口已核验退出，5446/8146释放；所有专用浏览器finally关闭，系统无遗留headless浏览器，专用Node/Creator工作进程结束。用户已有浏览器/标签未操作；共享或归属不明Node/MCP宿主保留。`cleanup.json`记录具体PID/启动参数/父子关系和保留服务健康。原5430/5431/8130此前已停，未擅自重开。

**当轮交付时的待复核/未验证记录（当前确认见页首）**：Cocos布袋与用途签、四格和确认的实际画面/手感仍是候选；task48聊天反馈仍待玩家回复。原Web未退役。M9、T1–T6及V1–V7继续开放：实际旧玩家/部署迁移、整章自然成长/平衡、多日离线、真实系统输入法/设备、Safari/屏幕阅读器/文字缩放、安全区和性能等不由此次Chromium测试替代。没有提交、推送、部署、删除原Web或重置真实玩家。
