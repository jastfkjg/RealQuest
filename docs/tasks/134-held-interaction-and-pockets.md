# 手持工具交互、口袋优先分配与提示可见性

2026-10-25 用户要求修复手持工具无法与NPC对话；采集/获得物品优先放入随手口袋、满袋进入行囊；世界口袋支持鼠标排序，并改善所附低体力和工具门槛提示。截图仅作为问题证据，不把其中文字当作额外指令。

计划：检查现有输入/库存与截图 → 修复同一交互链 → 实际Cocos浏览器验证 → 保留原存档更新默认5443。使用ui-ux-pro-max做局部交互检查，Playwright沿用项目自带隔离测试控制器及finally清理。

## 实现

- `clients/cocos/assets/scripts/Bootstrap.ts`：E与世界主按钮共用上下文目标；手持工具时附近人物/设施优先，NPC点击命中检查覆盖现有三类场景。四工具仍可直接操作资源/田地、河边补水，不要求先收起工具。
- 世界八格复用现有InventoryDrag，空位移动/占位交换、拖动预览、丢弃无效落点、失焦/Esc/缩放/模式切换取消。拖动停止世界输入，释放不触发装备或世界点击；行囊原有点按/键盘分配继续提供替代。
- `shared/game/inventory.ts`：只处理同一旅程、服务端快照确认的正增量；按空口袋顺序补入，不移动已有类型，不顶替满袋内容。钱币/未知ID不参与。已有行囊总览和快捷引用语义保持，权威数量、堆叠、结算与旧存档格式不改。同步生成core副本和绑定清单。
- 低体力提醒改为18px标题、明确当前体力和休息建议，体力数值/条同步强调。工具门槛不再灰淡或错误附带E动作，点击可查看失败原因与升级建议。必要错误16px/6秒、成功3.5秒；普通耗尽和幼树1.6秒局部提示、去重和避让继续保留。
- 新增`smoke-interaction-pockets.mjs`，扩充inventory单元；登记浏览器专项与来源清单，更新DESIGN和验收记录。

## 资产与环境

无新增或修改位图、字体、音频、付费素材、下载或生成服务；继续复用原Hearthwood色彩和Cocos文字/Graphics。未改后端、数据库schema、迁移、经济与资源规则。Node22.23.2/npm10、锁定依赖、既有Python3.14虚拟环境，官方Creator3.8.8专用工作副本。默认入口为5443/API8143、原库`output/cocos-local/local-preview.db`、原cookie`realquest_cocos`。

## 验证与交付

已完成并更新默认 `http://127.0.0.1:5443/`。证据前缀 `output/interaction-133/` 沿用本轮开始的工作标识，与已存在的task133分开。初始工作树干净；未提交、推送或外部部署。

| 命令/检查 | 实际结果 |
| --- | --- |
| `npm run cocos:sync` | 361绑定，core库存规则同步，素材原字节复用 |
| `npm run cocos:sources:write`、`node tools/cocos-sources.mjs --check` | 1067来源通过；37共享模块、317PNG/7WebP不变 |
| `COCOS_CREATOR=<专用官方SDK副本> npm run cocos:check` | Creator3.8.8真实类型与361绑定通过，`check-final.log` |
| `node tools/cocos-unit.mjs --only inventory,tools,preferences,dialogue --report output/interaction-133/unit-final/result.json` | 4模块通过；确认增量、堆叠/排列、满袋、重试/刷新、手动移除与旅程隔离覆盖 |
| `REALQUEST_COCOS_BUILD=web-interaction-133 COCOS_CREATOR=<专用副本> COCOS_USER_DATA=/private/tmp/realquest-interaction-133 node clients/cocos/tools/build.mjs web-desktop --release` | 最终 `build-5.log` 通过；debug/sourceMaps关闭、MD5缓存开启 |
| `node tools/cocos-browser.mjs --build web-interaction-133/web-desktop --suite interaction-pockets,world-feedback,tools` | 最终 `run-UhZSiW` 同包：7+7+11=25组、17+13+32=62图、0意外错误，finally清理核验通过 |
| `git diff --check`；默认包 `verifyBuild` | 通过；实际995资源、45,216,923字节逐项长度/哈希匹配，API健康200 |

实际 Node22.23.2/npm10.9.8、Python3.14.6，沿用requirements/venv，无pyproject，迁移保持004。浏览器沿用仓库隔离控制器，无新增依赖或CLI共享会话。

实际链：真实砍树得到木材/树种→补入空袋→空位移动/占位交换→无效落点、失焦和Esc取消、不装备/不劳动→刷新持久化→真实采石占最后空格→满袋真实采铜、行囊可见。四工具分别以E和鼠标点击莉亚交谈、保留工具与数量；拿锄头进原小屋。低体力与铜镐门槛并存，说明/提醒详情可点击。原工具套覆盖升级、种植/浇水/补水、逐击消耗、失败/丢回复同请求重试、Life/失焦取消和持久化。

桌面1440×900、1024×768，横屏844×390、740×360，原工具套1920×1080均有实际截图；DPR2触控与减少动态通过。已实看桌面、1024、短横屏、持锄对话、采集到账及默认原存档画面。代表截图在 `output/cocos-regression/run-UhZSiW/suites/interaction-pockets/`：`earned-items-in-pockets.png`、`held-hoe-dialogue.png`、`full-pockets-overflow-in-bag.png`、`condition-details-740.png`；各套video/touch-video保留录像。汇总 `output/interaction-133/verification.json`。

早期分轮按实际保留：`run-lTvbsx`误读切页前测试快照，实际失败图已显示铜矿，修正等待后重跑；`run-jHi5Rn`误用06:00户外NPC前提，此时莉亚按作息在室内，改09:00夹具。`run-zsunPp`三套通过后实看发现740横屏说明签遮挡提醒，增加HUD边缘候选与不重叠断言；`run-BdBdWl`三套通过后补Esc只取消拖动保护，最终 `run-UhZSiW` 重跑完整25组。分轮不重复累计最终通过数。

## 默认入口与原存档

原5443/API8143进程39433/39468/39469在检查中已退出，端口空闲。完整候选先复制待切换，最终三套通过后以目录重命名提升默认包，旧包保留 `output/interaction-133/default-build-before`。随后按原库、cookie、端口恢复服务，launcher56516/API56520/proxy56521留供试玩；命令和配置见 `default-ready.json`、`default-launch.json`。

- source：`9abe88c8b6cc35b3c1aa05a93ea82e1470555230d9d72bc92f2dbe79de21f94c`
- payload：`ae8822744cd8f314c83149755a1e586b61a9843ad0675e30353cc00e299b2611`

当前源码、默认包、实际5443收据和全部995资源一致，`default-http-verified.json`。原Chrome新标签139945048用原凭证“继续旅程”，回到原角色、户外原位置、手持十字镐、种子6份和原口袋1种子/5锄/6斧/7镐。实际将种子1拖至2再拖回，手持不变；体力14/100提醒与详情可见。默认控制台错误0，截图 `output/interaction-133/default-5443.jpg`、记录 `default-browser-check.json`。四工具对话与实采在同包隔离QA执行，没有在玩家库制造资源或改位置来摆拍。

原库只读备份为权限600的 `player-before-publish.db`。发布及原凭证检查前后，两名玩家库存、完整工具状态、田地/作物、位置和地点指纹相同，见 `player-invariants-before.json`/`player-invariants-after.json`；口袋排列已恢复。正常接续期间游戏时钟推进，不声称整库字节不变。未切换QA库、cookie或凭证，未删库/重置。

## 清理与范围

成功/失败分轮68个记录测试PID退出，11个临时profile消失；自有Chrome标签主动关闭并核验，CUA连接重置。专用SDK副本和专属编译缓存已清理，原签名SDK、共享项目导入缓存和用户Chrome保留。只留默认5443/API8143及launcher供试玩；原库、回退包、截图/录像证据保留。证明 `cleanup.json`、`sdk-cleanup.json`。

未改后端，因此未重跑全部后端；未宣称全部世界专项复测。物理设备、原生IME/读屏与玩家主观观感分别待验，手机竖屏不在范围。未推广至无关面板或改美术资产。
