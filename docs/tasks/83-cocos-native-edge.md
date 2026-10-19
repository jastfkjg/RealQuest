# 当前 Cocos 的原生 Microsoft Edge 检查

后续：[任务88](88-cocos-native-edge-delivery.md)完成同品牌九项Nginx接续/旧标签/真实双版本/回退和六模式清理，修复旧页面根图标404；新配置尚待容器/TLS/网络复验，未扩大实机/生产或玩家批准。

后续：[任务87](87-cocos-native-edge-network.md)补当前J3同一原生Edge155的真实Nginx固定七样本/10PNG，首次移动/同档唯一书页与原工程预算通过；其完整交付/物理设备/生产范围仍按任务39开放。

后续2026-10-19：[任务86](86-cocos-native-edge-session.md)已在同一J3另补Edge155 headless/M4的独立45分钟，94采样/7PNG、GC/同档/移动保存与固定工程参考通过。本页八组/17PNG仍为原代表流程范围，不合并成一轮或完整27套。

2026-10-18，接续任务39 V6。本轮完成真实桌面Edge代表流程：微软官方稳定版155.0.4283.62、当前J3、八组/17PNG通过。只补这个品牌和实际流程的证据，V6仍开放；Firefox/Safari、物理iOS/Android及系统/生产/玩家等原要求没有因此完成。

短计划已执行：核对官方发布元数据和包摘要，只解包到项目output；检查签名/公证/实际版本；复用现有隔离运行器，执行登记→移动/行囊→地图/找人→中文研习保存→刷新原书页→五尺寸/触控；核验截图、QA数据、来源及进程退出。原用户浏览器与5442/I3人工试玩保持。

## 实际浏览器与取得方式

本机macOS15.7.7（24G720）、arm64/Apple M4，现有Node22.23.2/Playwright1.64.0/Python3.14.6。只读检查`/Applications`和用户Applications时有Chrome155、Safari26.5，没有Edge/Firefox；这只是所查目录，不声称全机绝无其他副本。

从[微软官方发布API](https://edgeupdates.microsoft.com/api/products?view=enterprise)取得Stable/MacOS/universal的实际最新元数据，选择155.0.4283.62（发布2026-10-16，ReleaseId132392）。[该官方pkg](https://msedge.sf.dl.delivery.mp.microsoft.com/filestreamingservice/files/f1341568-6824-43de-b936-7c2bc3699fb3/MicrosoftEdge-155.0.4283.62.pkg)实下载432,189,573字节，SHA256 `d3cefdaa5fd404204a05d3db1b8c071bebabdf32f85f4faa2a8e558d122a8aa7`，逐字节符合官方元数据；原metadata/下载来源与时间均保留。

最初沙箱DNS访问失败，允许本任务官方只读下载后完成；沙箱内`pkgutil`还曾报告invalid signature，原`pkg-signature.log`不改写。同一SHA文件在允许访问系统信任服务的环境中被核实为微软Installer签名UBF8T346G9、Apple公证可信，原可信时间戳也记录在日志。没有因沙箱输出而跳过签名检查，未更改系统信任或安全开关。

`pkgutil --expand-full`仅向`output/cocos-edge/unpacked`解包，没有运行包内安装脚本。实际应用`com.microsoft.edgemac`，Microsoft Application签名/Apple公证检查通过，`codesign --verify --deep --strict`前后均通过；universal含arm64，显式`arch -arm64 ... --version`输出正确。未写入`/Applications/Microsoft Edge.app`，前后该路径均不存在，没有系统安装、账户登录或默认浏览器设置操作。

运行时版本经三处实际交叉核对：Playwright `155.0.4283.62`、CDP `Edg/155.0.4283.62`、原生UAData `Microsoft Edge/155.0.4283.62`；内核另报Chromium155.0.8059.85，未把两者版本混用。UAData架构arm/64，真实GPU为`ANGLE Metal Renderer: Apple M4`。这里使用的是官方Edge二进制，自动化API仍为项目锁定Playwright；官方支持说明见[Playwright品牌浏览器文档](https://playwright.dev/docs/browsers#google-chrome--microsoft-edge)。

## 八组实际检查

`output/cocos-regression/run-R2iUc4` complete:true，2026-10-18北京时间20:30:13–20:30:35，session23306终态0。当前J3 source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e` / payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`，269产物，与任务77–82产品相同。测试/包身份/应用二进制与Info.plist/源清单/后端前后一致。

1. 实际品牌/完整版本与当前Creator3.8.8生产包，原生中文姓名登记；新测试角色权威20金币/6种子。真实WebP请求为200、MIME正确。
2. 原生键盘移动并存到服务器；行囊拦住移动键，原种子分配四格不消耗物品。
3. M/N实际打开地图和找村民，Escape返回世界。
4. 中文研习表单通过原生可访问编辑按钮填写，保存一本确定ID书页与一条`study_create`；经验/活动/物资/三种成长余额等不变。
5. 真实reload后保留原save ID、中文名、四格和同一书页；通过实际`open-study-<id>`行按钮重新打开，没有重复书页。
6. 740×360行囊和找村民入口可操作，关键控制在界内。
7. 1920×1080、1440×900、1024×768、844×390、740×360的现实成长控制均在界内且最小44CSS像素；五尺寸每页实际14个控制。
8. DPR2/740×360使用原QA凭证/同一save，实际触控进入Life、Tab焦点可见，仍只一书页/一条结算、资源不变。截图1480×720是像素尺寸，不当作CSS尺寸或物理手机。

浏览器console/pageerror均无意外错误。桌面headless、程序插入中文文字和触控模拟不等于操作系统IME、屏幕阅读器、多指硬件或真实手机证据。

## 测量及适用范围

新独立profile、回环Python代理，资源/原生控件就绪2,551毫秒。扩容到5000条ResourceTiming缓冲，实际262条资源；transferSize合计11,887,221字节、encodedBodySize11,808,621字节。CDP观测263个同源响应、encodedDataLength合计11,871,105字节；两种统计层次分别记录，不相加或当作269产物总尺寸。

实际120个RAF间隔共约1,999.9毫秒，median16.7ms、p95约16.8ms。此短样本只描述本机该时刻，没有证明持续长会话、真实VRAM、手机或弱网表现。未将回环Python结果与任务79的Nginx压缩/弱网预算直接比较，也不据它宣布跨品牌发布预算全部满足。

## 保留的首次失败

`run-tmjiwl` / session98954终态1，前四组通过。刷新后的原save ID、中文名、四格、同一书页断言都已通过，随后脚本等待不存在的`study-<id>`按钮而超时。实际状态/截图有书页，行按钮名为`open-study-<id>`。原脚本和controller存入`attempt1-source`，原失败报告、QA库/截图及complete:false保持。

仅按实际可见控制修正测试选择器，再以全新库/profile运行上述八组；没有改游戏、重置玩家数据、跳过重新打开书页或放宽同档/资源/单次结算要求。第一次浏览器也正常关闭，服务器子进程全部退出。官方包/代码签名差异与该选择器错误分别记录，不合并为产品问题。

## 命令与独立核验

实际执行的Node入口均为项目Node22，根cwd；后续正式执行需能使用回环监听和专属浏览器。以下本轮步骤已完成，非要求重复安装或覆盖原回执：

```sh
python3 output/cocos-edge/download.py
node output/cocos-edge/extract.mjs
node output/cocos-edge/controller-attempt2.mjs
node output/cocos-edge/verify.mjs
backend/.venv/bin/python output/cocos-edge/verify-data.py
backend/.venv/bin/python output/cocos-edge/audit.py
backend/.venv/bin/python output/cocos-edge/manual-retained.py
node tools/cocos-sources.mjs --check
git diff --check
```

metadata命令session31576、下载42630、签名/解包6919均终态0。第一次browser98954失败与第二次23306通过分别保留。解包控制器七个实际子命令全部0；成功后应用签名再次检查0。没有改依赖版本或安装额外npm/Python库。

如需在本机已经验证的工具包上重跑同一流程，可执行`node output/cocos-edge/native-edge-run.mjs`，它复用`runRegression`并创建新随机回归目录，不覆盖本轮两份证据；包解压/一次性冻结控制器原路径留作本轮可审计记录。这是output内的品牌实验入口，不是已提交CI或从无缓存干净检出可运行的声明。规范登记仍27个current +1可选Web比较，本轮没有再跑完整27套或相关单元/194后端，也没有把它计为第28个常规套件。

`verification.json`独立重算官方包SHA、签名/公证回执、冻结输入、当前构建、实际Edge/内核/架构/GPU、八组/17PNG、五尺寸/触控及前后应用签名，complete:true。`data-verification.json`只读检查两份QA库（含失败样本），每份各1角色/1书页/1次登记/1次研习，无活动、三种点数0、20金币/6种子、零重复receipt，integrity/FK均正常。

实际查看本轮地图、刷新后的原书页、740现实成长、DPR2焦点四张，以及首次选择器失败图；`visual-review.json`记录检查和像素哈希。图像不等于玩家批准，本轮未产生新界面处理或素材。

## 清理、文件与剩余项

565份可解析常规浏览器记录/1573份结束PID记录只读审计，issues/activeBrowsers/意外readErrors为空；额外核对解包应用路径下的所有助手/后台进程也为空。两个Edge专属浏览器均正常退出0、非强制，其两个临时profile均已删除；API/代理、Node/命令进程均退出，无新测试服务保留。历史任务73精确路径的空坏JSON仍分类保留。

原人工5442/API8142的67850/67853/67854启动身份未变，主页/health/构建三项200，供玩家继续复核；原Cookie/玩家数据库/玩家数据API和用户Chrome/IAB没有操作。官方下载包、解包的签名测试应用与QA证据留在忽略的output中，便于复查/重跑，是非运行文件。本轮未启动Docker，未运行系统安装器或服务注册命令。

仓库只更新本任务、任务39/61、README/TODO/progress、Cocos README/本地说明及复核清单；新增实验脚本/包/日志/图片/QA库全部位于output。没有产品、共享运行时、后端、规范测试入口/登记数、源清单、锁文件、素材或迁移改动，没有提交/推送/PR/部署/默认切换或原Web删除。402来源/107绑定检查保持。

V6继续缺其他目标品牌及物理设备、系统输入/辅助技术和对应交付/性能完整证据；Safari既有后台/自动化限制未改变，不重复相同受限探测或改用户设置。实际CI/生产目标、其余视觉/战斗/远行确认及原待答的5442切J3/任务66视觉/外部Git授权保持。整体目标继续active，本轮品牌证据不能替代其他原要求。
