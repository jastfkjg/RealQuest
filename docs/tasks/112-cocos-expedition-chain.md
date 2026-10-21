# Cocos 出发准备链 — 2026-10-21

状态：实现与本轮验证完成，实际预览已交付；画面与手感待用户查看。用户授权范围是“世界目标 → 武备台准备 → 明确装备 → 进入洞穴”。

## 实现

- 世界目标收为同一张目标便签，区分步骤、完整标题与下一步行动。站在实际可交互的武备台或洞口附近时，直接打开对应窗口；远处仍只标记路线。手动追踪支线与既有引导状态保留。
- 武备台左侧为真实物品目录，右侧围绕选中物品分开呈现购买与打造。购买显示报价、余额与缺额；打造显示材料现有/需要数量、服务器原因及可分页的完整条件页。缺金币可标记小铺。物品图标是蓝图/商品展示，不代表持有。
- 购买/打造后保留明确的装备动作；权威装备状态确认后才突出山洞标记。对比当前装备显示伤害与距离差值；购买另一件武器不会自动替换当前装备。装备页保持轻量、可从洞口进入并用 Esc 返回。
- 洞口显示已装备武器、生命/体力、首层目标与撤离规则。未装备时突出装备入口；体力或生命偏低时可标记床铺。提示是建议，不新增入洞锁定或改变服务器规则。入洞仍由玩家明确确认。
- 桌面与短横屏使用同一操作语义、原有语义ID、44px以上目标、焦点/禁用/处理中反馈；短横屏通过物品和条件分页保留内容。

没有修改经济、后端、数据库模式、物品ID、导航或战斗规则；没有新增美术/字体/音效。复用既有纸张、木框、武器与洞口素材，来源和哈希保持 `docs/art/asset-manifest.json`、`cocos-inventory-icons-v1.json` 与 `cocos-panel-materials-v1.json`。

## 文件

- `clients/cocos/assets/scripts/ui/expeditionGear.ts` 及其 Creator metadata：武备台、装备、完整打造条件。
- `clients/cocos/assets/scripts/ui/panels.ts`：接入新构图、洞口准备与休整入口，删除旧装备绘制分支。
- `clients/cocos/assets/scripts/Bootstrap.ts`：目标便签、附近快捷交互及上下文通知清理。
- `clients/cocos/tools/smoke-expedition-chain.mjs`：新增真实 UI/服务器链、失败/处理中/重试、几何和持久化验证。
- `tools/cocos-browser-suites.mjs`、`tools/test-cocos-browser.mjs`：注册专项套件与清单检查。
- 来源清单、本文、设计/验收说明与 `progress.md`。

## 环境与验证

Node22.23.2/npm10、根package-lock，Python3.14项目venv，官方Creator3.8.8。使用 `output/cocos-sdk/expedition-working.app` 工作副本，保留签名原SDK。

- `npm run check`：真实引擎类型及123素材/共享源绑定通过。
- `COCOS_CREATOR=... REALQUEST_COCOS_BUILD=web-expedition npm run cocos:build:release`：独立release候选构建成功。
- `npm test`：最终23组工具/规则单元与236项后端通过；保留既有Starlette/httpx弃用警告。
- `npm run cocos:test:browser -- --build web-expedition/web-desktop --suite expedition-chain`：最终 `run-YIJc2J` 完整通过5组，33张实际截图、1段流程录像，控制台错误0。覆盖1920×1080、1440×900、1024×768、844×390、740×360；购买拒绝/处理中、装备丢响应重试复用同一请求、刷新持久化、实际连续走路/入洞/撤离、低生命/体力和打造真实消耗均通过。
- 同命令分别执行 `--suite chapter-friction --suite guidance --suite interface-refresh`，结果位于 `run-9MRwnl`：3/8/5组通过；该轮尚包含失败的初版专项，因此整轮报告不是全绿。这三组执行后仅微调长反馈按实际左栏宽度换行，最终专项覆盖最终反馈路径。
- 同命令执行 `--suite landscape --suite semantics`，最终运行时 `run-X6jntc` 中分别3/11组通过；当轮专项失败同样如实保留。未运行完整31套浏览器矩阵。
- 最终独立候选与默认试玩 `web-current/web-desktop` 均为Creator3.8.8 release，源码指纹 `9e0d89bad9e1fe7ce631a832b2496594640ccf3de10b2d39982a0b5017dbc356`，载荷指纹 `118b7d21c157d3d4f24499691a33374908bea132a39e5ca393bf363d80a19061`，逐项相同，见 `output/cocos-expedition/build-equality.json`。

中间失败保留：沙箱Creator启动失败、回环代理EPERM均按实际环境重新执行；新增套件导致固定数量30检查失败后更新为31并增加新套件路径断言。专项脚本最初在房间出口自动交互已完成后仍等待旧房间坐标/出口，属于测试等待条件问题，修正等待实际场景转换，不改游戏移动或放宽资源断言。

随后专项地面点击分别命中快捷栏和采集对象；最终改用真实方向键走安全通道，避免把可交互物体当空地。装备确认到入洞之间没有fixture搬移、坐标注入或传送。中间失败分别记录在 `run-lwVHZi`、`run-9MRwnl`、`run-X6jntc`、`run-PFghlQ`；最终通过记录为 `run-YIJc2J`。

develop-web-game提供的动作脚本使用本地副本补上finally清理、引擎就绪等待与语义控件真实坐标点击。默认canvas.toDataURL取得黑色清空缓冲，改为浏览器合成截图并用有窗口模式复核；不以黑图或只有状态JSON当视觉通过。所有适配保留在ignored output，不改技能源文件。

最终通过 `python3 output/cocos-expedition/run-skill-final.py`；实际合成截图、状态与浏览器清理回执在 `output/cocos-expedition/skill-delivery/`。已人工检查世界目标、武备台、购买后待装备、已装备、武器对比、完整条件、洞口正常/低生命/横屏及入洞画面。

## 实际效果与收尾

- 试玩：http://127.0.0.1:5443/（API8143）。使用原 `output/cocos-local/local-preview.db` 和 `realquest_cocos` cookie，未重置玩家。切换前只读备份 `output/cocos-backup/expedition-preview-before/`；启动后所有表与备份一致，2位玩家/455张回执未变，见 `save-preservation.json`。
- 本任务启动并保留人工试玩PID70746/API70749/代理70750；收尾HTTP200。原预览PID13134及其子进程在本轮接管前已消失，本任务没有向它发送停止信号。
- 五轮测试服务/浏览器、skill临时服务/浏览器均已finally关闭并核验退出；临时Creator工作副本已移除，原SDK保留。完整归属与PID证据在 `output/cocos-expedition/cleanup-final.json`。共享工具宿主与用户浏览器未清理。
- 截图目录：`output/cocos-regression/run-YIJc2J/suites/expedition-chain/`。重点文件：`world-prepare-1440.png`、`purchased-not-equipped-1440.png`、`equipped-1440.png`、`equipment-ready-1440.png`、`cave-ready-1440.png`、`cave-low-vitals-1440.png`、`cave-ready-740.png`。
- 连续交互录像：上述目录的 `expedition-flow.webm`，包含标明的隔离QA准备与各验证分支。

## 交付与边界

最终截图来自真实Cocos渲染的隔离QA库。QA起始位置、初探资格及部分金币/打造材料明确属于测试准备，购买、装备、路径标记、走动、入洞、撤离和打造由真实UI与服务器完成；不得称为玩家实际赚取的数据。

不把浏览器模拟触控等同于物理设备，也不把已有自动化代替系统IME/读屏或用户对美术手感的认可。手机竖屏不在本轮范围。
