# Cocos 地图、地点与邻里信息

2026-10-17 最新玩家验收：在5442现有试玩复核后，玩家确认“这三处都可以保留”，范围为当前地图与找村民、底部交谈回答、行囊四格。此前task49偏好页/操作/音量音色的确认继续有效。以下早期拒绝与待复核记录保留为迭代历史，以本段为当前范围；不扩大到其他画面、战斗/远行手感、实机或原Web退役。

2026-10-17。任务39 M5/M6：按服务器实际地图、物件与作息补齐地点索引和村民名录，把全部预设话题、心意选择与帮助带到短横屏。保留原Web、游戏规则/存档、当前5442手工样本和既有未提交修改。沿用Hearthwood原生纸面/苔绿控件，不新增图片、字体、依赖或玩法。

计划：先实现只读地点/连接/报价和关系/作息查询，再接实际到场交谈；在独立web-places、5446/API8146、`output/cocos-places/test.db`验证所有地图、动态NPC、缺额/锁定、拒绝与丢包、短横屏分页和只读数据不变。完整退役目标保持M/T/V范围，玩家/设备/发布批准不由本地候选替代。

## 已实现

- **地点索引**：清单允许的地图等价入口。全部15张服务器地图（村庄、六处室内、渡口/山道/城市、五层洞穴）及所有设施/资源/地标/出入口均可分页查询，分生活、资源、旅途及全部分类。显示当前位置和真实连接；同名田地/采集点用稳定序号区分，保留原ID。阅读或选择不推进发现/拜访、不改资源。
- **锁定与指路**：复用原`accessibleTarget`，从室内/洞穴/远行地点继续指向下一处真实门口。村民按当前作息与有效会面停留定位，地点详情使用稳定人物键，不随换房丢失选择。石门/洞层/绳梯条件及服务端全局旅行报价、短缺/到达时间/当前日限制完整分页显示；只标记、不传送。实际旅行服务页也可直接打开完整报价。
- **邻里名录**：三位村民和两位旅途人物可查。村民显示角色、个性、熟悉度、最爱/喜欢、当前地点/活动、全天全部阶段及当前阶段、今日问候/赠礼/帮助状态。旅途人物只展示已有位置/服务，不编造熟悉度或作息接口。阅读暂停游戏时钟，社交每日限制仍为北京时间。
- **当面交谈**：实际NPC交互继续使用原`talk`/会面token，完整预设回复按页阅读并标明非AI；近况、兴趣、日程、熟悉度5后的往事在短横屏均可进入。五种礼物可逐个选择，明确消耗1份、原+1/+2规则与每日限制；帮助按真实恢复后的体力判定。到场/资格/每日状态以服务器为准，拒绝保留资源，未知结果沿用同一请求重放。
- **离开与休息**：会面失效/对方换房后禁用旧社交操作，标记当前房间。实际旅行回归发现床铺结算后仍留在旧面板：已修正成功睡眠/短休返回游玩，显示确认结果，未订当晚客房时禁用睡眠。短横屏旅行逐项阅读、44px翻页及结果反馈分开，避免旧反馈压住控件。

使用现有Hearthwood纸面/苔绿状态与原村民身份；没有新增图片、字体、音频、下载、依赖、API、迁移、数值规则或经济系统。原Web、原素材、旧存档与所有既有修改保留。远行人物/地形仍有此前记录的临时表现，不称为完整美术验收。

## 文件与命令

- `shared/game/places.ts`：只读地点/完整服务报价、动态人物键/方位、社交资格；通过既有同步生成`assets/scripts/core/places.ts`。`sync.mjs`/绑定清单登记85源绑定。
- `clients/cocos/assets/scripts/ui/places.ts`：索引、详情、名录、全天作息、话题、完整回复与礼物选择；`ui/panels.ts`委派，继续保留原剧情、诺亚约定和店铺入口。
- `Bootstrap.ts`：完整报价入口、旅行翻页/反馈、订房和已确认休息回到世界；可观察`navigationBearing`只返回实际当前路标，不驱动移动。
- `tools/test-places.mjs`及`smoke-places{,-travel,-rest}.mjs`：从脚本定位仓库，强制5446与专用test.db，仅自己的新游客，finally关闭浏览器/上下文。其余变化为package脚本、忽略构建目录与文档。

实际环境Node22.23.2、Python3.14.6、Creator3.8.8，沿用npm/package-lock和现有依赖。根目录：

```sh
node clients/cocos/tools/sync.mjs
node clients/cocos/tools/test-places.mjs
node clients/cocos/tools/test-core.mjs
node clients/cocos/tools/test-guidance.mjs
node clients/cocos/tools/test-features.mjs
node clients/cocos/tools/check-baseline.mjs
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
REALQUEST_COCOS_BUILD=web-places COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/build.mjs web-desktop
python3 clients/cocos/tools/run-preview.py --build web-places/web-desktop --port 5446 --api-port 8146 --database output/cocos-places/test.db
# 另一个终端：
node clients/cocos/tools/smoke-places.mjs
node clients/cocos/tools/smoke-places-travel.mjs
node clients/cocos/tools/smoke-places-rest.mjs
```

Cocos目录可用`npm run test:places`、`npm run test:places-browser`。后端工作目录执行`.venv/bin/python -m pytest -q`；前端目录执行`npm run build -- --outDir ../output/cocos-places/web-build --emptyOutDir`，不覆盖原手工预览dist。

## 证据与夹具边界

- 官方Creator真实构建、85源绑定/真实类型、原Web独立构建、232后端测试、17核心组、新place/原guidance/feature检查通过。391受保护原文件及原共享/日期/再出发提取和断言保护通过；既有chunk和后端warning记录在日志。
- 主流程8组/63张截图：全部地图/物件/分类、原报价限制、只读不变、完整名录/作息/中文回复、每日赠礼/帮助和5级往事、拒绝/已提交丢包、会面失效换房、五视口、DPR2真实触屏和双向键盘焦点通过。`result.json`/`final-browser.log`/`places-flow.webm`。
- 实际旅行2组/17张：从初始离村位置一路走到渡口、购绳索、船票拒绝后重试/丢包只扣一次、山道、进城、旅店、送信、订房、睡眠、翻山返乡和回程船费。最终金币26，与`40−6−6+12−8−6`一致；原绳索/送信/住宿/返乡记录保留。服务和完整报价在桌面/短横屏都通过44px/边界/不重叠检查。`travel-result.json`/`final-travel.log`/`travel-flow.webm`。
- 休息补查2组/4张：未订房禁用且只读不扣费；家中实际短休恢复体力并回到世界，物品/点数/经验不变。`rest-result.json`/`rest.log`。
- 技能帧客户端沿用实际时间/合成截图/finally适配，索引与世界各2次动作突发通过；索引输入不移动，世界正常移动，无console错误。实际打开检查了桌面索引、资源序号、短屏话题/回复/作息、完整报价、会面失效、旅店/睡眠/返回与帧截图。最后的休息/报价改动另由旅行和休息用例覆盖；不以截图存在证明所有像素验收。

所有浏览器夹具仅用`output/cocos-places/test.db`的新游客。主流程预置靠近NPC的位置/游戏时段、2份礼物及前一真实日标记；会面失效用本游客服务器状态夹具和受控blur/focus读取，新移位仍按真实作息定义。自动化环境的所有页面都报告可见/聚焦，不能以此声称实际系统后台已验证。旅行只预置初始安家/离村资格、开门旧通路、40金币与门口位置，之后的行走和结算均实际执行；不能称为自然赚取全部初始费用/培养/五层战斗。休息补查只准备未订房位置或70体力，恢复本身是实际命令。

物理设备、Safari/其他目标浏览器、真实系统/标签后台、系统IME/读屏器/原生缩放、最终远行美术、玩家实际画面/手感批准、完整自然成长节奏、PostgreSQL及发布/回退仍由对应V/T项验收。M5/M6是本地功能候选；完整目标继续M7/M9、T1–T6和V1–V7，不自动授权退役、删除、提交、推送、外部部署或玩家库迁移。


## 交接与清理

同一手工地址`http://127.0.0.1:5442`/API8142改为`web-places`，保留原`output/cocos-data/local-preview.db`。切换前以SQLite只读连接备份到`output/cocos-places/preview-before-places-152143.db`，前后玩家行数均为0、原始行SHA256一致（空样本不代表真实玩家迁移通过）。精确哈希/健康结果见`handoff-before.json`、`handoff-result.json`。

保留launcher86170/API86172/代理86173，session4743，供玩家刷新预览；原5430/5431/API8130和launcher21626也保留。六个根页/health检查均200。旧手工73229/73231–73232及测试76174/76176–76177已正常退出，5446/8146关闭。所有本次浏览器、Node测试/帧、Creator进程已退出；临时帧适配脚本已移除，正式测试、截图/结果和两段录像保留。无法归属的共享工具宿主未关闭。没有提交、推送、部署或玩家库迁移。

玩家已明确反馈“需要调整”：地图页缺少地图，部分弹窗/按钮缺少游戏感。原地点索引的功能测试保留为证据，画面验收记为需要调整；不再作为待默认接受的画面候选。当前先修正地图→地点手记/邻里→当面交谈这条链，M7暂缓。V4及设备/发布门槛保持开放，完整目标继续。


## 玩家反馈修正（本地候选已验证，待玩家复核）

- M默认打开地形/建筑/当前坐标和可选路标的地图，索引降为辅助入口。15个区域沿原坐标投影，密集触点用引线连回真实坐标；选择与标记不传送。
- 复用原Web地图插画及5位人物头像，对话直接保留当前实际游戏场景，均逐字节复制并登记到Cocos绑定清单。没有新生成、购买或改画源图。
- 地点/邻里/礼物采用附图手记，村民对话采用头像、低位阅读面和独立剧情入口。这条链使用薄木边、苔绿漆面按钮及按压/焦点/禁用反馈；未推广到其余功能页面。
- 独立候选构建web-map-refinement；5446/API8146仅连接output/cocos-map-refinement/test.db。首次浏览器8组/63张通过，截图复查发现短横屏地点标题挤压，已修正并准备最终复查。最终结果见下方，玩家画面/手感复核仍开放。


反馈修正复现命令（独立库，不执行旧旅行/休息脚本）：

```sh
REALQUEST_COCOS_BUILD=web-map-refinement COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/build.mjs web-desktop
python3 clients/cocos/tools/run-preview.py --build web-map-refinement/web-desktop --port 5446 --api-port 8146 --database output/cocos-map-refinement/test.db
REALQUEST_PLACES_REVIEW=map-refinement node clients/cocos/tools/smoke-places.mjs
node clients/cocos/tools/smoke-atlas.mjs
node clients/cocos/tools/test-atlas.mjs
```

地图使用统一缩放；44px密集路标通过引线连接真实坐标，标签不伪造地理位置。室内/远行区域沿服务器区域尺寸和障碍绘制查询示意，不声称新增最终远行美术。地图选择/直接标记与辅助索引均不移动玩家。桌面地点手记、话题和礼物页按内容收紧高度；用原床铺、箱子、木材/种子/柜台等已绑定图，不用虚构物件填空。对话使用当前真实游戏场景，截图检查后移除了不协调的额外图书馆插画。


### 修正结果与交接

- 最终主流程8组/63张与辅助入口/原场景对话/焦点7张通过；控制均44px、桌面/740px短横屏/DPR2触屏通过，标记不移动，礼包拒绝/已提交丢包只结算一次，无意外浏览器错误。`output/cocos-map-refinement/{result,atlas-extra-result}.json`及`final-browser.log`/`atlas-extra.log`记录实际结果。
- supplied技能帧客户端保持真实时钟、使用合成截图/finally关闭；地图与世界各2轮。地图输入不移动，世界可正常移动，无错误。最终引线改为原生填充几何后重做辅助7张和地图帧，并亲自查看`frame-map/shot-1.png`；没有把旧的不可见stroke当作验收。
- Creator3.8.8真实最终构建/92源绑定/真实类型、空间几何、地点完整性/只读/资格、核心17组、引导以及391原文件/提取保护通过。163-image图片审计通过；后端/Python虚拟环境没有PIL，改用已存在的bundledPython审计成功，没有安装依赖。本轮未改后端/Web代码，也未重跑上面的历史232后端或旧旅行/休息证据；不把历史结果标成此次重跑。
- 初次最终主流程暴露测试同步问题：Escape后mode已变但控件尚未重绘，测试误点禁用翻页；改成等待对应索引控件后完整重跑通过。帧客户端同样等开始按钮实际可用后操作，避免loaded标志先于控件绘制。
- 5442/API8142现为`web-map-refinement`，仍用`output/cocos-data/local-preview.db`。停止旧launcher86170/86172–86173后做一致只读备份，切换前后**1个实际手工旅程**的完整player行指纹相同。备份路径与健康记录见`handoff-before.json`/`handoff-result.json`；此检查仅证明切换未改行，不能替代所有旧存档/设备接续验收。
- 保留launcher96307/API96309/代理96310、session67565供人工刷新预览；原5430/5431/API8130也保留，五处健康200。专属测试91704/91706–91707退出、5446/8146关闭，浏览器/Node/Creator测试进程均已退出，临时帧适配和编修脚本移除；不归属的共享工具宿主保留。`cleanup.json`记录核验。原Web、游戏规则、旧存档与未提交修改均保留；未提交/推送/部署/迁移玩家库。

本轮只交付地图→地点/邻里→对话的修正候选；其余旧弹窗尚未推广此处理，M7/M9、T/V目标继续，先收集本轮画面反馈。


后续玩家再次反馈“还需要调整”：找不到NPC，若干页面/按钮仍像数据展示。故本轮实际画面未获批准。第二轮修正与实际找人链见[任务45](45-cocos-neighbor-encounter.md)，M7继续暂缓。历史本地功能通过不等于玩家手感批准。
