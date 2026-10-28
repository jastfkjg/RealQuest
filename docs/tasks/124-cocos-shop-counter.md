# Cocos 商店货架与出售柜台（任务124）

用户批准两张商店预览并要求实现。参考：`docs/art/references/shop-{browse,sell}-concept-v2.png`。批准的是布局与材质方向；实际实现仍需真实画面验证。43件商品、未来分类与背包数量是概念示例，不写入真实商品或玩家存档。

## 计划与范围

1. 独立商店页面：米拉/木柜台、图像货架与行囊同时可见；分类按真实商品生成，查找与货架分页；行囊按原摆放顺序独立分页。空/不收购物品清晰说明。
2. 同一底部交易签按选中侧展示购买/出售、数量/最大、费用或收益、交易后余额；点选不结算、按钮确认，沿用原权威命令/重试。普通出售与小铺收购委托分开，委托作为小纸条入口。
3. 复用已审计木框/纸页/布袋/米拉/物品素材，货架结构使用原生绘制；所有文字为原生，不将概念图嵌入运行时。不新增实际在售货物、货币、商店或经济规则。
4. 独立Creator3.8.8 release/隔离QA库验证买卖、数量、失败重试、分页/分类/查找、输入焦点与模式切换；桌面与手机横屏截图实看，保留原玩家库/其他任务预览。记录命令、截图与清理证据。

## 当前环境

Node22.23.2/npm10，根package-lock，Python3.14虚拟环境，Creator3.8.8。初始工作区存在任务121/122/123等未提交改动，已保存baseline状态与补丁于`output/shop-124/`。仅增量修改本任务接入点，不覆盖现有改动。

## 验证与交付

已实现并完成独立构建验收。主工作区仍有并行任务125养殖开发；本任务不覆盖其改动或正在运行的版本。

### 改动

- 新增`ui/shop.ts`、`ui/shopModel.ts`及meta；`panels.ts`接入独立商店，`Bootstrap.ts`提供货架/分类按钮样式、弱化物品和紧凑输入框。原公共接口的新增参数均可选，其他页面行为保持兼容。
- 新增`smoke-shop.mjs`、`test-shop.mjs`并注册浏览器/单元检查；分类、搜索、各自分页、买卖数量、最大出售、确认结算、收购委托均走实际UI/现有服务器。
- `DESIGN.md`、素材计划、验收清单、资产manifest记录设计契约与两张概念图。无新增运行时图包、无数据库迁移、无商品/价格规则修改。

### 构建与命令

固定源码：`output/cocos-toolchain/clean-source-1syykW`。Node命令使用`/Users/zilong/.nvm/versions/node/v22.23.2/bin/node`，Creator使用本任务可写副本与独立user-data，产物`clients/cocos/web-shop-124/web-desktop`。四个商店实现/测试文件与主工作区字节一致，详见`output/shop-124/verification.json`。

- `node tools/build_local_scene_art.mjs --refresh-manifest`：仅在快照执行，逐像素核验7张地形/地板、43精灵、7布局不变后刷新并行世界代码的来源哈希。
- `node tools/cocos-sources.mjs --write`、`node clients/cocos/tools/check.mjs`：678来源、217绑定和真实Creator3.8.8类型检查通过。首次Creator导入修改4张既有装备图meta，重新构建后来源凭据一致。
- `node clients/cocos/tools/build.mjs web-desktop --release`（`REALQUEST_COCOS_BUILD=web-shop-124`）：真实release构建成功，独立凭据可验证。
- `node clients/cocos/tools/test-shop.mjs`：报价/余额、数量上限、过期报价、分类查找/页边界、售空选择、背包空位和存档隔离通过。
- `cd backend && .venv/bin/python -m pytest -q tests/test_market.py`：16通过（现有Starlette弃用提示）。
- `node tools/cocos-browser.mjs --build web-shop-124/web-desktop --suite shop,interface-refresh --continue-on-failure`：全部通过；报告`output/cocos-regression/run-uuemPe/result.json`（相对快照）。额外`run-ESQt6Q`的semantics通过。
- 商店测试覆盖真实购买/出售、不收购、数量不足、422失败不扣物品、提交成功后丢响应的相同request_id重放、售空清选、委托一次交付、中文查找、刷新持久化、1440/1920/1024/844/740控件/文字审计。另用只读网络响应43件目录测试四页、独立行囊翻页和窄屏分类；没有对该虚构目录执行购买或写入服务端。

### 已知边界

完整工具单元运行在places断言停止（16≠15）；完整landscape回归在既有洞穴移动第49行超时，之前的商店/触控页面已执行。两项涉及并行世界/装备开发，不能将本次结果称为全项目回归通过。快照包含养殖后端的第13件饲料，但早于其客户端名称/图完成，展示明确缺图占位；主工作区养殖任务继续补齐，未将这部分作为商店验收成果。

### 截图和资产

`output/shop-124/browse.png`、`sell.png`为实际Cocos浏览/出售截图；`sell-landscape.png`为740横屏；`expanded43-readonly.png`仅为明确标识的扩容测试数据。视频、逐帧状态、真实请求及失败重试见最终测试目录。两张概念图只作设计参考，实际画面等待用户反馈。

### 收尾

每次回归报告记录浏览器退出与服务子进程退出；原玩家库、其他任务的预览和SDK均保留。没有提交、推送或部署。独立源码/产物与截图保留供复核；本任务临时构建副本清理后可用官方3.8.8重新构建。

补充：`output/shop-124/run-skill.mjs`基于develop-web-game提供的客户端执行实际商店动作与截图。适配已有advanceTime、控件绘制等待和page截图，并使用本任务独立新测试库；最终通过，无控制台错误。浏览器PID23918、服务子进程23901/23902退出已核验。通用脚本初次WebGL导出黑图及路由时序问题已修正，最终截图为`output/shop-124/skill/shot-0.png`。

## 第二轮视觉修正（用户反馈实际画面与概念图差距大）

视觉目标：暖光店内环境中，实物货架与苔绿布袋构成紧凑柜台，图像承担陈列主导，原生中文保持清晰。内容顺序为店招/米拉、商品分类与货架、同时行囊、底部一张交易签。交互保持原确认链，保留已有轻微按压、悬停和焦点反馈，降低动态偏好沿用公共机制。

本轮计划：①对照概念图缩短货架与图像间距，增加有厚度的柜板与纸价签；②行囊固定5列3行桌面陈列并加大物品图和数量，避免纵向拉伸；③放大米拉/店招并使用无字背景补全商店环境；④用真实构建的浏览/出售截图和五尺寸专项回归重新验收。只调整商店展示，不滚动到其他页面。


### 第二轮实现与验证结果

- 新增原创无字店内背景`assets/generated/hearthwood/shop-interior-v2.png`（1672×941），原图未改，提示词单独保存；绑定`ui/shop-interior`。生成来源、尺寸、哈希、用途见asset-manifest。背景无商品、控件和文字，所有交互继续原生叠加。
- `shop.ts`重排上方环境/店招/米拉，缩小整块木框覆盖范围；货架采用深色柜槽、厚柜板、近距离纸价签/铆钉与金币图，桌面商品图从64放到约96（最高112）。背包最多5列3行，格位/图标/数量同步放大。
- `Bootstrap.ts`只对商店出售格调整图标与数字，增加独立shop-action缝线确认按钮；其余物品格/按钮保持原尺度。按压、悬停、焦点和低动态偏好继续沿用公共行为。
- `sync.mjs`新增背景绑定；`panels.ts`新增独立按钮皮肤类型。价格、商品目录、背包资源和命令均未更改。

固定验收源码`output/cocos-toolchain/clean-source-9In5jO`，独立真实Creator3.8.8 release产物`clients/cocos/web-shop-124-v2/web-desktop`。288绑定、840来源与真实Cocos类型检查通过；买卖模型检查通过。Creator首次补全7处meta后重新构建，完整凭据有效。

实际浏览器命令：`node tools/cocos-browser.mjs --build web-shop-124-v2/web-desktop --suite shop`。最终`run-79tT2R/result.json`成功，8组检查涵盖真实交易/错误/幂等、委托/搜索/持久化、5种尺寸与43件只读扩容、独立背包分页，控件不交叠且文字完整。截图已逐张实看。先前run-dkOwFd受长时间执行中断/超时影响，不算通过，浏览器与服务退出已核验。

公共补验：`--suite interface-refresh,semantics --continue-on-failure`的`run-HyUQxX`中semantics通过；interface-refresh在与商店无关的旧门控用例第56行找不到`open-gate`（现有渐进任务链已改门控），未走到其商店段，不能称整套通过。此前菜单/Life/输入及洞穴页面已通过其前半段审计，商店本身由专项覆盖。

主工作区同时继续战斗/翻滚开发，因此Bootstrap整文件与快照不完全相同；差异位于战斗输入/预测段，商店绘制/按钮/物品图相关段一致。保留所有并行改动。本轮不声称整个最新工作区全量回归完成。

实际截图：`output/shop-124-v2/browse.png`、`sell.png`、`sell-landscape.png`；`expanded43-readonly.png`仅为扩容QA数据。它们来自真实Cocos渲染和独立测试存档，非生成预览。新版画面待用户审阅。

第二轮通用动作脚本最终通过：沿用develop-web-game客户端，等待按钮启用/世界镜头就绪，使用原生advanceTime与浏览器截图；`output/shop-124-v2/skill/shot-0.png`已实看，无控制台错误。前期启动等待/本机WebGL选项问题仅属测试适配，最终使用本机默认配置。PID56587及服务56541/56542退出核验通过。

第二轮收尾：任务相关进程最终ps核对无残留；回归报告及独立动作脚本都记录浏览器/服务退出。清理本次Creator副本与自有临时文件，保留源码快照、产物与验收截图。其他任务资源、SDK源包和玩家数据未操作；未提交/推送/部署。
