# Cocos 世界反馈与横屏 HUD

2026-10-18，接续 task39 V5。已完成世界反馈/横屏HUD修正候选，最终完整22套/150组/655PNG与真实Nginx9组通过。自动化全程使用隔离库；交付时将5442更新到已验证候选，原库/会话保留且全表指纹一致。本轮保留已确认的地图、交谈、行囊与偏好方向；V5其余门槛仍开放。

短计划：先以实际 Cocos 节点边界复现740横屏反馈被四格遮挡，再调整并验证1920×1080、1440×900、1024×768、844×390、740×360。补充DPR2真实触控按住/松开与面板输入归属检查。使用新生产候选和隔离库，保留旧包作失败证据。

视觉约定：沿用现有纸签、苔布和系统中文；世界仍是主体。提示负责说明已确认结果/错误，重连按钮负责确认待保存操作。短横屏保留重要提醒、四格、目标和实际交互；不把提示画到这些控件之下，也不让方向键随着提示出现/消失跳动。无新增装饰、音效或动画。

来源：`DESIGN.md`、现有asset-manifest和task49提示合同；frontend-skill、ui-ux-pro-max及develop-web-game的当前回归流程。没有新素材、字体、下载、经济/API/迁移规则或原Web改动。全局可访问性、其余玩家/设备/CI/生产门槛继续开放，不把此项修正当作V5整体完成。

## 已实施的候选

- `Bootstrap.ts`：短横屏反馈固定在左侧提醒下方；桌面反馈与底部口袋留开距离。短横屏重连入口占用待确认期间原已隐藏的目标位置，其他时候目标仍正常显示。非洞穴方向键固定下移44像素，提示出现或消失不使方向键跳动；洞穴保持原布局。四格位置/大小/用途不变，短横屏重复说明收为右对齐的“1–4 查看”，播种说明仍在种子详情及预览中。
- 反馈在世界指路标记上层绘制，原世界坐标/路径保持；避免标记压住两行中文。连续重连收到同一文案时重新开始原3.2秒显示期；到期触发实际重绘，村庄结果纸收起。错误仍留给用户核对，没有自动重发待确认请求。
- 现有 `render_game_to_text` 增加实际 Cocos 节点的反馈/HUD边界；测试同时检查可点控件和四格说明等非按钮区域。`smoke-session.mjs` 扩展五尺寸、错误/成功、相同请求三次尝试、同文案重新显示/到期，以及DPR2触控按住/松开和地图输入归属。`smoke-preference-layout.mjs` 扩展五尺寸和村庄/城市实际标记反馈；场景/夜晚/体力由隔离夹具准备，不能充当自然远行或真实夜晚等待。
- 更新来源目录 `docs/migration/cocos-source-inventory.json`。仍为384来源文件/107静态引用/106绑定；81PNG、25共享模块、79场景输入和93冻结Web输入保持。无新图片、音频、字体、依赖、API、数据库迁移或原Web代码改动。

## 实际构建与复核

最终候选为 `clients/cocos/web-release-feedback-reviewed/web-desktop`，真实官方Creator3.8.8，生产选项 `debug:false/sourceMaps:false/md5Cache:true`。266文件/14,813,169字节、无.map；源SHA256 `1bddb1503d475e3e12b2b0d50e32c5b875476c120fc336dc25f3433462a0b3a9`，产物SHA256 `5d79e580fd93205b35364747c19b2d494df3682447ca103cace0826cd0ca3b56`。

执行环境为macOS arm64、Node22.23.2、Python3.14.6、Playwright1.64.0/Chromium156.0.8078.4。横屏/DPR2是该浏览器中的视口与触控模拟；没有把它等同于Chrome155、Safari26.5、手机实机或系统输入法验证。

原项目与全新 `clean-source-KTivmU` 分别真实构建，全部266产物记录/实际文件逐字节一致。新副本独立按根锁安装五项工具，无原Web安装/构建、旧node_modules/项目缓存/产物；882个快照源文件/150,075,160字节前后不变。复用既有官方SDK和本机工具，不是已提交CI或跨架构证明。证据 `output/cocos-feedback/cold-build-reviewed.json`，两个真实构建包装器均0/Creator36。

最终定向 `run-krMl45/result.json` complete:true：通知布局2组/17PNG＋原技能帧客户端2组/4PNG，零意外浏览器错误，所属浏览器和服务退出。实际查看村庄/城市740两行标记结果，路标已不盖字。此前 `run-bYDmt7` 的10组/41PNG只是中间候选，不能代替最终全矩阵。首次完整22套仅登记测试失败，具体原因及修正见下。

最终 `run-KltWgO/result.json` complete:true，exec70833终态0已收取：21套当前Cocos＋1套原Web兼容全部通过，共150组/655PNG，零意外浏览器错误；每套真实浏览器与测试服务均退出。最终来源清单、运行时/测试模块/后端输入在运行前后核验一致。实际查看最终740成功反馈、六外观中的第三套中文姓名，以及真实Nginx1440世界；此前已查看最终夜间村庄/城市两行提示和DPR2方向键。没有把截图存在当作所有画面批准。

本轮相关现有纯函数4模块通过，最终106绑定/真实Creator类型、384来源/107引用及原390＋435保护通过。服务端代码、规则与迁移未改，未重复已有232项后端测试；真实完整浏览器覆盖本轮当前候选，结果不替代自然长流程或实机检查。

独立静态候选 `output/cocos-feedback/candidate-reviewed` 保留三个真实引擎版本，活动版本 `1c621165389be7a6aca875848332736c2928bbf749333ce9714297f345ac4fe5`，整体SHA256 `75b2ea80eb2ca1f1b4466f044550d2d3476808126e1bc8dce2592956c22fb046`；封包核验通过，未部署或切换原入口。

本轮真实Nginx交付 `run-xOuBVJ/suites/delivery/result.json` complete:true，9组/5张界面截图：全部活动资源的HEAD/MIME/缓存、实际gzip字节、真实404、同源API/Cookie与错误Origin、两份实际引擎的同凭证/稳定存档接续、旧真实标签资源保留和入口切回均通过。API/Nginx/浏览器按finally退出。目录内另有三个版本的243张运行时PNG资产，不能把这些资产也计为界面截图。

## 保留的失败与修正

1. 修复前真实候选 `run-ZVK0cN` 在740成功反馈与 `world-quick-0` 重叠处失败，实际边界和截图吻合。该失败是预期的回归复现，服务和浏览器已退出。
2. 第一版布局 `run-VaPZSj` 的6组/20PNG通过，但截图发现四格说明纸仍有局部重叠，随后缩短横屏说明并纳入实际HUD区域检查。再一版 `run-bYDmt7` 的10组通过，夜间截图又发现指路标记盖字，随后修正绘制层级。各中间包和画面保留，不计为最终视觉通过。
3. 一次原项目缓存构建中，Creator把135份项目 `.meta` 改成通用 `*` 导入格式，原有“构建期间源不变”守卫正确拒绝生成receipt。已保留异常内容和日志；逐一核对变动发生于该进程时间窗口、UUID相同，并从task54记录/已核验task57快照恢复精确原字节，没有回退代码或图片。随后来源/106真实类型/390＋435保护通过。
4. 无活动原项目Creator时，将该次生成的 `library/temp` 完整移到证据目录保留，再进行新导入；这是[官方项目结构文档](https://docs.cocos.com/creator/3.8/manual/en/getting-started/project-structure/)列出的生成缓存。原图、源码、settings、profiles和玩家数据库没有移动。全新副本、原项目新导入及最终独立重建均成功且源字节保持；SDK内部异常根因未定位，不以重试成功声称SDK缺陷已修复。`importer-restoration.json` 和 `cache-quarantine.json`记录全部范围。
5. 首次完整 `run-LloGbB` 执行全部22套，21套通过；登记/档案测试在外观3处收到默认姓名。提交前截图已显示姓名为空。测试原本只等待资源标志，没有确认姓名框实际可编辑或已获得焦点。`smoke-dossier.mjs`现等待已启用的实际控件、真实原生焦点和输入值，保留全部六外观/16字中文/空白默认名/重复提交/丢包恢复的精确断言；不改应用运行时。定向 `run-ouH4RS` 8组/56PNG通过；26条输入观察中实际捕获一次资源标志已true而姓名框仍禁用，证实同步窗口，`registration-inputs.json`保留原生输入记录。修正测试后冻结来源清单，重新执行完整22套。

最后一项仅调整测试入口同步；生产源与产物仍为上面的 `1bddb150…` / `5d79e580…`。独立构建快照早于这一测试修正，证明的是相同最终运行时和生产字节；不将其表述成最新全部测试的CI检出。

实际命令（本机使用Node22.23.2可执行文件；以下为根目录入口）：

```sh
node tools/cocos-sources.mjs --check
COCOS_CREATOR=<已安装官方3.8.8可执行文件> node clients/cocos/tools/check.mjs
node clients/cocos/tools/check-baseline.mjs
node tools/cocos-browser.mjs --build web-release-feedback-reviewed/web-desktop --suite dossier
node tools/cocos-browser.mjs --build web-release-feedback-reviewed/web-desktop --suite all --web-build output/cocos-regression/web-compat-current --continue-on-failure
node tools/test-cocos-delivery.mjs --artifact output/cocos-feedback/candidate-reviewed
```

## 试玩交付与清理

完整回归期间源码/测试/来源清单保持冻结；自动化不使用人工库。交付前核验原89393/89396/89397的命令、启动时间、cwd与端口，再经原session29885正常退出。先前沙箱内预检端口检查返回Operation not permitted；受控权限下重新只读预检成功，没有据此绕过占用检查。

随后用现有在线备份工具为原 `output/cocos-data/local-preview.db` 创建0700目录/0600文件的私有整库备份，启动5442/API8142的新生产候选，沿用 `realquest_polish_local`。启动前后完整模式及六表指纹完全一致，1角色/974结算保留，整体SHA256均为 `569ae498edd557c4a8a9791ad30d8dc761a7e8fbe3dc4a98436555bbf2ce36cb`。没有发送游戏命令、恢复/重写数据库或驱动用户浏览器。三个健康/构建入口均200，HTTP构建记录为本轮实际 `1bddb150…` / `5d79e580…`。

保留新launcher46373/API46376/proxy46377、session19624供人工试玩；新实际就绪记录为 `output/cocos-feedback/manual-reviewed-ready.json`，通用manual-ready副本已更新。原三个进程已退出，旧构建与原Web代码/默认发布保留。刷新现有5442即可加载新包，用户原有标签未关闭。证据 `manual-handoff.json` / `manual-before-reviewed/` 不进入公开静态包。

所有最终/失败/中间构建、浏览器、测试API/代理、Nginx、单元与备份子进程均已核对退出；当前仅保留上述人工试玩。清理检查149份报告/289个PID及启动时间、专属浏览器/Creator标记，无所属遗留，结果见 `output/cocos-feedback/cleanup.json`。共享工具宿主、用户浏览器和其他任务保持。证据总表为 `verification-counts.json`，产物/最终源码核验为 `final-build-verification.json`、`final-protection.log`、`final-sources.log`。

仅关闭V5已确认的740反馈遮挡和相关控件布局问题。全局键盘/可访问性、系统IME/缩放、自然游戏节奏、剩余玩家画面/手感、目标PostgreSQL17、实际CI/容器/HTTPS及设备仍继续按task39验收。没有新增玩家批准、提交、推送、外部部署、默认Web切换或代码删除。
