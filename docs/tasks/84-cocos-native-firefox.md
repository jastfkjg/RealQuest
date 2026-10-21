# 当前 Cocos 的原生 Firefox 检查

后续：[任务92](92-cocos-native-firefox-network.md)补经校准的共享双向代理七份HTTP弱网、首次移动和同档唯一书页，固定原数值参考通过；保留校准初版失败与真实资源差异，不用CDP规则/计数冒用Firefox。正式目标/系统/实机和完整预算仍开放。

后续：[任务91](91-cocos-native-firefox-session.md)补同J3原生Firefox158单次45分钟/94采样/7PNG，连接DOM/引擎分配/四短帧参考与同档移动保存通过。正文计数不适用BiDi的测试误报已保留并更正为权威回执；没有GC堆/监听器/正式预算或弱网结论。

后续：[任务90](90-cocos-firefox-container-profile.md)补原生Firefox158在同J3/77709984包的容器HTTPS七项和中断，并修复共用profile追踪；原代表流程和该阶段另录process.profile的回执保持。Firefox弱网/长会话、系统/实机及完整V6继续开放。

2026-10-18，接续任务39 V6与任务83。本轮取得真实桌面Firefox158.0/当前J3的代表流程证据：七组/15PNG全部通过、无意外浏览器或页面错误，同档中文研习仅一条结算。V6其余目标和系统/实机/完整性能条件继续开放，原Web保留。

短计划已执行：核对Mozilla官方版本/摘要，在output取得稳定包；只读挂载所属DMG、复制应用并卸载，检查签名/公证；沿用锁定Playwright的原生BiDi通道和统一QA运行器执行当前J3；核对截图、数据、来源和进程/profile/挂载清理。没有替换引擎、依赖或操作原人工试玩。

## 实际输入与自动化方式

本机macOS15.7.7（24G720）、Apple M4/arm64、16GiB RAM，Node22.23.2/Playwright1.64.0/Python3.14.6沿用现有环境。宿主信息由本轮sysctl只读确认，未根据浏览器UA推断设备。

[Mozilla官方版本接口](https://product-details.mozilla.org/1.0/firefox_versions.json)本轮返回158.0；取得[官方SHA256SUMS](https://archive.mozilla.org/pub/firefox/releases/158.0/SHA256SUMS)内的`mac/zh-CN/Firefox 158.0.dmg`，实下载[同版本中文DMG](https://archive.mozilla.org/pub/firefox/releases/158.0/mac/zh-CN/Firefox%20158.0.dmg)164,928,923字节，SHA256 `d0daa923ac5962e1ef0f3f94700e52f2d4ccbba79ae42faa3d76e5bfe5b74370`完全一致。原版本/校验列表、最终URL、下载时间与哈希保留，没有将签名时间当成发布日期。

`hdiutil verify`通过，只向新nonce目录只读/no-browse挂载，`ditto`仅复制`Firefox.app`到`output/cocos-firefox/native`，未执行安装器。应用`org.mozilla.firefox`、Mozilla Corporation签名43AQ936H96、Apple公证均通过；原生`arch -arm64 ... --version`与实际协议版本均为158.0，应用前后深度严格codesign检查通过。DMG在finally中按当前所属挂载信息卸载，最终只读复查无该挂载；没有按历史`/dev/disk6s3`号再次操作。

锁定包的`coreBundle.js`实际包含`moz-firefox`原生通道：Firefox.launch在该channel转到BiDi实现，源码哈希已冻结。测试仍使用现有`launchBrowser`/`runRegression`，显式选择项目内官方二进制和`channel:'moz-firefox'`；无需另装geckodriver、Selenium或修改依赖。官方协议方式见[Mozilla BiDi连接说明](https://developer.mozilla.org/en-US/docs/Web/WebDriver/How_to/Create_BiDi_connection)。

实际进程参数为`--remote-debugging-port=0 --headless --profile <新临时目录>`，无juggler参数，包含本轮owner标记；PID/父PID/启动时间/实际profile记录在结果。浏览器完整版本158.0、UA Firefox/158.0与官方包一致。此证据与之前Playwright附带Firefox测试包明确分开，不将后者通过数当原生品牌结果。

`/Applications/Firefox.app`前后均不存在，应用只在项目output；没有原用户profile连接、系统浏览器/安全开关或默认设置操作。浏览器原生BiDi仅服务本轮新会话，原用户Chrome/IAB和5442/I3保持。

## 七组实际流程

`output/cocos-regression/run-v4uyx0` complete:true，2026-10-18北京时间20:55:05–20:55:24；外层controller含后签名至20:55:27，session41819终态0。七组/15份实际PNG，无失败或未执行项。

当前J3 source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e` / payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`，Creator3.8.8真实release、269产物，与任务77–83游戏相同。包身份/二进制/Info.plist/锁定BiDi实现/测试/清单及19后端源和锁摘要前后一致。

1. 实际品牌/版本、当前生产包/WebP 200和正确MIME，原生中文姓名登记；权威新角色20金币/6种子。
2. 原生键盘移动持久化；行囊阻止移动键，四格分配不消耗种子。
3. M/N实际打开地图/找村民，Escape返回世界。
4. 原生中文研习表单保存一本确定ID书页、一条`study_create`；物资/经验/活动/成长余额等不变。
5. 实际reload后保持原save ID、中文名、四格与书页ID，再从原生行按钮打开该书页，没有重复。
6. 740×360行囊和找村民关键控制在界内、可操作。
7. 1920×1080、1440×900、1024×768、844×390、740×360现实成长均为14个实际控制，在界内、至少44CSS像素。

pageerror/console error及QA页预先记录的window error/unhandledrejection均为空。本轮是桌面headless与原生输入控件的程序输入；没有实际操作系统IME/屏幕阅读器，亦未执行Firefox DPR2触控、多指或物理手机。任务83 Edge模拟触控结果仍是它自己的范围。

## 实际测量

新独立profile/回环Python代理，资源与原生启动控制就绪2,688毫秒。5000条ResourceTiming缓冲下实际262条资源，transferSize合计11,887,221字节，encodedBodySize11,808,621字节；不是完整269产物总尺寸，也不直接代替Nginx压缩/弱网预算。

原生WebGL2.0可用。通过构建实际import-map中的`cc`读取正在运行的设备统计：纹理分配63,162,164字节、buffer25,982,824字节，是引擎计数，未当作真实GPU VRAM。Firefox公开renderer为`Apple M1, or similar`、UA/oscpu为Intel Mac OS X10.15；这些与宿主sysctl的Apple M4/macOS15.7.7分别记录，未据浏览器字符串把机器判作M1、x86或旧系统，也未声称直接识别了该浏览器底层Metal后端。

120个RAF间隔共2,000毫秒，median约16.66ms、p95约17.12ms。该短样本无新发布预算/长期稳定性或物理设备结论；未复用任务78的Chrome45分钟通过来宣布Firefox长会话通过。

## 可复现入口与核验

根cwd、项目Node22；需要允许自有回环监听、签名信任检查和本轮临时只读挂载。以下是实际已执行步骤，下载/复制/冻结记录不覆盖已有文件，不应重跑同名准备来覆盖本轮证据：

```sh
python3 output/cocos-firefox/metadata.py
python3 output/cocos-firefox/download.py
node output/cocos-firefox/extract.mjs
node output/cocos-firefox/controller.mjs
node output/cocos-firefox/verify.mjs
backend/.venv/bin/python output/cocos-firefox/verify-data.py
backend/.venv/bin/python output/cocos-firefox/audit.py
backend/.venv/bin/python output/cocos-firefox/finish-native.py
backend/.venv/bin/python output/cocos-firefox/manual-retained.py
node tools/cocos-sources.mjs --check
git diff --check
```

metadata85048、下载27745、挂载/复制/签名57159、浏览器41819均已终态0。解包控制器14个命令全部0，成功后应用签名再查0；单元/后端全套和规范27套不包含在本轮计数，也没有为纯品牌检查重新构建游戏。

在本机已验证的工具包上，`node output/cocos-firefox/native-firefox-run.mjs`可复用同一流程并创建新随机回归目录。包和实验入口留在忽略的output，不作为日常Cocos安装前提、已提交CI或无缓存干净检出的声明。规范登记仍为27 current +1可选原Web比较，没有新增第28个规范套件。

`verification.json`重算官方DMG/校验列表、签名回执、冻结输入/当前构建、真实品牌/协议/实际进程profile、七检查/15PNG/五尺寸、WebGL/统计及退出，complete:true。`data-verification.json`只读确认本轮唯一QA库1角色/1书页/1次登记/1次研习、无活动/三种点数0、20金币/6种子，integrity/FK正常，零重复receipt。

实际查看地图、刷新原书页、740与1920现实成长四张；中文/控制清晰，`visual-review.json`保留像素哈希和检查范围。这是开发者检查，不扩大玩家视觉批准；无新素材或界面处理。

## 清理与剩余范围

566份可解析常规浏览器记录/1593份结束PID记录只读审计，issues/activeBrowsers/意外readErrors为空；本轮Firefox应用路径下的助手/后台进程也为空，历史任务73精确空坏JSON仍分类保留。主浏览器22961正常退出0、非强制，临时profile已删除，所属API/代理和命令进程均退出，无新测试服务保留。

`native-cleanup.json`另按当前hdiutil信息确认所属挂载为空；只读挂载已卸载，下载DMG与复制的签名应用/QA证据作为非运行文件保留，便于复查。未运行系统安装器或服务注册命令，未启动Docker。没有终止共享宿主或用户浏览器。

原人工5442/API8142的67850/67853/67854启动身份未变，主页/health/构建三项200；玩家库/玩家数据API没有访问，仍供玩家复核。原5442换J3的拒绝边界和既有切换、任务66视觉、外部Git授权问题继续待原答复，不重试、绕过或重复提问。

仓库只更新本任务、任务39/61、README/TODO/progress、Cocos README/本地说明及复核清单；新脚本、包、日志/截图与QA库均在output。没有产品、后端、规范测试/登记数、源清单、锁、素材或迁移改动，没有提交/推送/PR、部署、默认入口切换或原Web删除。402来源/107绑定仍通过。

V6仍缺真实Safari、iOS Safari/Android Chrome物理横屏及各目标对应的完整交付/性能证据；V5系统IME/读屏/原生缩放/实机、多项玩家验收、T2/T3实际CI/提交检出和V7目标生产等继续按原清单。原生Safari既有限制没有改变，本轮没有再跑相同后台0RAF受限探测或改系统设置。整体目标继续active。
