# Cocos 已安装浏览器兼容性

后续当前结果：[任务83](83-cocos-native-edge.md)补真实Edge155.0.4283.62/当前J3八组17PNG；[任务84](84-cocos-native-firefox.md)补官方Firefox158.0原生BiDi七组15PNG。签名/身份/同档研习和五尺寸有对应证据，测试资源均退出。当前J3 Chrome真实长会话另见[任务78](78-cocos-j3-native-session.md)。以下Chrome155结果仍对应本页原构建，不回填为多品牌全量，V6其余要求继续开放。

2026-10-18，接续任务39 V6。状态：本机实际Chrome155代表流程已通过；其他目标浏览器/设备/交付和完整V6门槛继续开放。

短计划：复用统一隔离浏览器运行器与当前生产包，显式指定本机Chrome可执行文件，并以CDP和实际版本交叉核对。新独立用户目录、Cookie、测试SQLite与随机回环端口；原Chrome和试玩标签保持。验证中文登记、真实键盘移动与保存、行囊/四格、地图/找人、现实成长/焦点、刷新接续和短横屏控件；取证实际加载资源与RAF样本。所有所属浏览器/API/代理在finally退出并验证。

本轮是已安装桌面Chrome的真实二进制检查，仍使用headless和视口模拟；不等于实机手机、系统中文输入法、Safari/Edge/Firefox、HTTPS、纹理内存/长会话/弱网或发布性能预算通过。记录测量值，不用单次localhost结果替代V6全门槛。无新游戏UI/素材/依赖/规则/API或旧Web改动。对应测试暂为本机output实验，不声称已提交CI。

## 实际结果

`output/cocos-regression/run-vedN2t/result.json` complete:true，5组/8PNG，零意外控制台/浏览器错误；exec77045终态0。真实二进制 `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`，运行结果155.0.8059.80，CDP产品也为Chrome/155.0.8059.80。不是锁定Playwright附带的Chromium156；自动化API依然来自项目锁定的Playwright1.64.0。

- 实际生产包 `1bddb150…` / `5d79e580…` 加载；中文原生姓名框登记新独立游客，真实20金币/6种子。
- 原生键盘移动并存服务器；行囊拦住移动输入、种子分配原四格不消耗；地图与找人入口/Escape回世界。
- 现实成长键盘焦点、刷新后同save ID/中文名/四格保持；740横屏行囊/找人入口与控件边界通过。
- 实际查看1440地图和740行囊截图，画面保持现有方向，没有新增画面批准。

记录的单次新浏览器配置测量：资源就绪2,720ms，250份资源，PerformanceResourceTiming观测transferSize合计10,903,792字节、encodedBodySize10,828,792字节；不等于所有266产物总尺寸。120次RAF样本2,000ms/60fps，反映本机headless回环环境，不是实机帧率或已制定的发布预算；纹理内存/长会话/弱网尚未验证。

浏览器81094正常退出0/非强制，API/代理与Node所属进程均退出，专属profile/owner标记核验无遗留。原用户Chrome/标签未连接或关闭，原5442和task59真实等待依赖保持健康；清理记录 `output/cocos-compatibility/cleanup.json`。

命令（沿用根Node22环境）：

```sh
node output/cocos-compatibility/native-chrome-run.mjs
backend/.venv/bin/python -B output/cocos-compatibility/audit.py
```

该output实验复用统一 `runRegression`/`browserConfig`、独立配置/数据库守卫/进程组/finally收尾，测试脚本/来源/后端输入哈希在运行前后保持。没有新增应用代码或依赖，不重复原完整22套。Safari/Edge/Firefox、真实iOS/Android、系统IME/AT/缩放、HTTPS/性能预算及V6其余项继续按任务39验证。

任务70测量范围补充：此处历史资源样本恰好250条，脚本未扩容ResourceTiming缓冲，不能将10,903,792字节作为完整首屏下载总量。新H2/Nginx样本在5000缓冲和CDP全请求计数下实际有262–263条资源，详见[任务70](70-cocos-network-budget.md)。原报告和加载时间保持，未将新版本/传输环境的值回填为旧观测。
