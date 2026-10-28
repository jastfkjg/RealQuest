# 完整养殖体系（任务125）

用户目标：按已讨论方案实现七种动物（鸡、鸭、绵羊、奶牛、山羊、猪、马）的幼年/成长期/成年原创美术，打通建筑、购买幼崽、喂养成长、产出、出售；参考星露谷经营结构，不使用其素材。

## 计划与验收

1. 服务端目录定义技能0–6、价格、两段成长、食量、产出周期；沿用游戏时钟/睡眠、离线/Life暂停、技能点和幂等事务。缺食暂停、产品满仓暂停、无死亡或离线惩罚。
2. 不占旧田地：家园门径连接相邻牧场院落，三处禽舍/畜棚/马厩工地按4/8/12容量（马厩1/2/3）建造扩容，另有鸭饮水区/猪拱土区及加工设施。现有米拉代订幼崽，购买即入住，不新增无必要NPC。
3. 七种动物21套独立三阶段美术、住所/设施与产品图标；内置imagegen原创生成，原图/提示词/确定性切片/尺寸/哈希/绑定记入资产清单。实际造型待用户反馈，不宣称批准。
4. Cocos牧场世界和手记：动物清单/照料、幼崽采购、建造、加工；真实数量/报价/禁用原因，键盘/横屏触控、失败重试、模式切换。成年马骑乘有真实移动收益，不伪装成金币产出。
5. 后端确定性测试全七种流程、缺食/跨日/睡眠/离线/品质/容量、并发重放与旧档；共享类型/引擎类型、真实Creator构建及浏览器端到端、桌面/横屏截图检查。
6. 不改动玩家库、无提交推送部署；关闭本任务测试浏览器及后台服务，交付明确人工预览时保留并说明。

视觉主张：延续Hearthwood暖木、浅纸与苔绿的牧场手记，世界里的动物和建筑承担视觉中心；使用现有材质、中文系统字、克制页签和清晰操作。
内容：真实牧场状态→当前动物或设施→单项动作与成本→结果反馈。交互：有限漫步/进食反馈，选中留有文字标记，减少动态时停用装饰运动。

## 完成结果

已实现七种动物的完整经营链：家园入口→向阳牧场→建造/升级住所→米拉采购簿购买幼崽→添粮/抚摸→两段成长→收集→加工→杂货铺出售。成年马提供真实户外45%移速，进入室内/山洞自动下马；远离马厩时也可从手记或HUD下马。马的说明只承诺骑乘和陪伴。

禽舍/畜棚容量4、8、12，马厩1、2、3；饮水池、拱土区以及四台加工设备可建造。普通/优质蛋、奶、羊毛、松露及六种加工品均使用权威库存与报价。缺食暂停、产物满3份暂停、离线/Life暂停；沿用游戏时钟、睡眠、技能点与幂等事务。具体价格、食量和周期见[数值表](../balance/ranching-v1.md)。

## 实际改动

- 服务端：`backend/app/ranch_catalog.json`、`ranching.py`；`rules.py`、`daynight.py`、`main.py`、`market.py`、`world.py`接入时钟、事务、快照、商店和地图。修正未确认时钟尾段重复成长、牧场操作时间结算、室内解除骑乘持久化；入口防开垦并保留旧作物收获。
- 共享：`shared/game/ranchCatalog.ts`由`tools/generate_ranch_catalog.py`生成；`ranching.ts`提供视图/资源/动物交互对象；`protocol.ts`、`navigation.ts`、`interaction.ts`、`items.ts`接入。
- Cocos：`ranchView.ts`世界/建筑/设施/动物/骑乘，`ui/ranching.ts`五页手记；`Bootstrap.ts`、`ui/panels.ts`接入资源、输入、移动和生命周期。`sync.mjs`、来源清单、单元/浏览器注册纳入新模块。主工作区已有的商店数量标签修复被移入验收副本，解决四位数库存裁切，未改商品数据。
- 美术：5张原创源表，派生21动物阶段、9住所、6设施、3道具、13物品，共52张PNG，另12个品质别名。原图/提示词在`assets/generated/hearthwood/ranching-v1/`，派生图在`assets/derived/ranching-v1/`；`tools/build_ranching_art.py`与`docs/art/ranching-art-v1.json`记录裁切、透明处理、尺寸、哈希与绑定。无星露谷素材、付费素材或字体拷贝。
- 规则/证据：`backend/tests/test_ranching.py`、`clients/cocos/tools/test-ranching.mjs`、`smoke-ranching.mjs`，以及DESIGN、README、资产计划/清单/检查表。本工作树原有种植、装备、商店、任务链、持剑动作等改动均保留。

## 验证结果与边界

为避开同时进行的公共文件修改，在`output/ranching-125/acceptance/`冻结独立验收副本，使用锁定Node22/npm10、Python3.14和官方Creator3.8.8。主工作区核心养殖源的对照见`output/ranching-125/frozen-source-comparison.json`；主工作区随后另有币制、新手援助、木匠工程等改动，涉及协议、养殖规则与UI等文件；本报告和独立试玩固定于本轮养殖验收版本，不将后续并行改动冒称为本轮实机通过。

| 检查 | 实际结果 |
|---|---|
| 冻结版`.venv/bin/python -m pytest -q` | 392通过，1个既有弃用警告；`output/ranching-125/backend-final.txt` |
| 全部客户端/工具单元 | 28模块通过；`acceptance/output/ranching-unit-accepted/result.json` |
| 来源与官方引擎类型 | 冻结版284绑定通过；主工作区292绑定通过 |
| Creator真实构建 | 最终source `2234bad4d6e15830e0352c94762f432a8f3b003f45dd829d3199dc6bebd18522`，构建日志`output/ranching-125/creator-accepted.log` |
| 派生美术重建 | `build_ranching_art.py --check`：52图、12别名、4联系表通过 |
| 实机成长/加工 | `run-zXvBiX`已通过8项行为检查：7种购买、16次真实睡眠、21不同阶段帧、6种真实产出、6条真实原料加工、重试/Life/离线/骑乘。该轮停在米拉招呼对话，整轮complete为false，未冒称整轮通过 |
| 接续出售 | `run-OXvXcr` complete=true；严格核验来源后将上述已赚取状态复制到新QA角色，仅重设租约时间/owner/revision，未添加资源/年龄/产物。通过对话进入商店，12笔销售均准确；落库总金币14390→15639，全部库存恰好扣减对应12份 |
| 最终布局/操作 | `run-tZ1wOn` complete=true：1920×1080、1024×768、844×390、740×360，五页布局、触控分页/Escape、12字名字、马的正确说明、可读下马HUD、远程采购簿下马。成熟动物/设备/库存为明确的布局夹具，不用于证明成长 |
| 帧循环 | develop-web-game提供客户端的Cocos准备/实际步行/finally清理适配；`output/ranching-125/frame-delivery/`截图与JSON一致，浏览器88260正常退出 |

这是组合实机证据，未声称一次从新档到最终出售的默认脚本整轮全绿。成长和加工使用实际玩法获得，出售接续保留精确已赚取状态；证明在`stage-capture-audit.json`、`sales-persistence-audit.json`及对应run报告。测试辅助已修复：画布实际寻路、暂停手记后读取真实阶段、米拉对话入口、按加工剩余时间补睡。早期未完成/失败记录仍保留，不计通过。

验收截图本人已查看，包括全部阶段标签核对、各尺寸面板、成年动物、骑乘、加工、商店与四位数库存。长视频录制曾阻塞远程连接收尾，因此默认使用阶段PNG/JSON与事务记录，关闭长视频并给清理加超时；未提供虚构录屏结果。系统IME、读屏、物理触控设备与玩家观感仍待人工验证；美术未标记为玩家批准。

## 试玩与收尾

独立养殖试玩地址：http://127.0.0.1:5478/，API8178，唯一Cookie `rq_ranch125_preview`。使用`acceptance/output/manual-preview.db`全新正常存档库，不写测试夹具；保留该服务供人工试玩。启动命令从冻结副本执行：

```sh
PATH=/Users/zilong/.nvm/versions/node/v22.23.2/bin:$PATH backend/.venv/bin/python clients/cocos/tools/run-preview.py --port 5478 --api-port 8178 --build web-ranching-125/web-desktop --database output/manual-preview.db --cookie-name rq_ranch125_preview --ready-file output/manual-ready.json
```

其余测试浏览器、API与代理由各run管理器关闭并记录PID/进程组退出；帧客户端也在finally关闭。最终进程清理/保留项见`output/ranching-125/cleanup-final.json`。本任务SDK工作副本已删除；两处专用Creator临时目录检查时不存在，未删除共享缓存。保留签名原SDK、用户数据、其他任务和共享工具宿主。原5452/5453检查时无监听，本任务未操作其库。没有提交、推送或部署；没有推广新牧场视觉到无关屏幕。


复测命令（冻结副本目录，沿用上面Node22的PATH）：

```sh
cd backend && .venv/bin/python -m pytest -q
# 返回冻结副本根目录
npm run cocos:test:unit -- --report output/ranching-unit-accepted/result.json
npm run cocos:check
npm run cocos:test:browser -- --build web-ranching-125/web-desktop --suite ranching
```

最后一条是可重新运行的默认完整场景，本次交付使用上表明确列出的分段实机证据。定向接续/布局通过工具提供的runRegression配置运行，分别传入参数：

```js
import {runRegression} from './tools/cocos-browser.mjs';
const options={build:'web-ranching-125/web-desktop',selection:'ranching'};
const suite={id:'ranching',file:'clients/cocos/tools/smoke-ranching.mjs',result:'result.json',timeoutMs:600000};
await runRegression(options,[{...suite,args:['--finish-earned','output/cocos-regression/run-zXvBiX/suites/ranching/test.db']}]);
await runRegression(options,[{...suite,args:['--review-layout']}]);
```

最终主工作区养殖回归：`backend/.venv/bin/python -m pytest -q tests/test_ranching.py`（在backend目录使用`.venv/bin/python`）33通过；见`output/ranching-125/canonical-ranch-final.txt`。该单元结果不等同于后续币制/木匠/援助界面的整套实机验收。
