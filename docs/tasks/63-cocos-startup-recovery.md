# Cocos 启动失败提示与重试

2026-10-18，接续任务39 V6。状态：已实现候选；所有者已确认保留本轮启动故障页。当前J3完整27套与原生45分钟后续已分别通过任务77/78；下文“仍在运行”是本任务期间的历史状态，不是当前活动进程。系统/实机/目标交付等完整V6仍开放。

短计划：先实际禁用WebGL复现当前入口仅写控制台的行为，再在现有网页模板提供可读的加载/缓慢/明确失败状态、真实重载入口和无脚本提示；重试保留Cookie、本机凭证与待确认命令，不重置存档。覆盖入口脚本/画面资源失败、短横屏、键盘和读屏角色、恢复同存档；正常准备完成后移除拦截、计时器与监听。实际Creator独立候选、完整回归/原技能客户端、生产交付检查后再登记。自然QA冻结副本和人工D候选继续保留。

视觉与交互：沿用Hearthwood苔绿、亚麻纸、中文系统字和现有焦点/按压状态；一张安静的开场纸面说明当前准备或故障以及唯一重试动作。缓慢状态允许原加载继续，明确失败展示原因，不画假百分比或游戏进度，不嵌入技术堆栈。沿用减少动态，无新图/字体/声音/依赖/API/规则/存档迁移。

所有者检查点：2026-10-18，对“这轮新增的启动故障提示（原因说明、重新载入按钮、保留存档提示）是否可以保留？仅确认这张故障页，不扩大到其他画面或原 Web 退役。”回复“可以保留”。范围仅限该启动故障页，不扩大其他界面批准，也不是原Web退役授权。

来源：已读DESIGN、ASSET_PLAN、asset-manifest与REVIEW_CHECKLIST。沿用frontend-skill、ui-ux-pro-max和develop-web-game的当前游戏实现/实际浏览器验证工作流。Cocos3.8.8本地SDK网页模板当前在System.import及应用启动catch中只console.error；[官方3.8自定义构建模板说明](https://docs.cocos.com/creator/3.8/manual/zh/editor/publish/custom-project-build-template.html)确认Web-Desktop支持index.ejs并保留SDK提供的带MD5资源参数。所有路径与可用参数须通过实际构建核对，不改SDK源文件。

本轮原生Safari只做只读盘点：safaridriver显示26.5 (20624.2.5.18.3)，AllowRemoteAutomation偏好不存在；这不足以证明已启用或已禁用，不修改系统/浏览器设置，也不声称Safari已测试。实际Safari/Edge/Firefox和实机、HTTPS、纹理/长会话/弱网/发布预算等完整V6门槛继续开放。

## 基线与候选A

`run-1DgMyk`实际禁用WebGL后截图仅有空白底色，页面文字为空、重试按钮0，引擎记录16405/16333及getExtension异常；基线按期望1个按钮失败，截图已查看，所属浏览器/服务finally退出。

A实际Creator3.8.8生产构建终态0，106真实类型/386来源通过。模板使用SDK提供的MD5参数，正常启动已实际进入原世界并移除拦截。前两轮探针失败分别为：只丢一次回包会被原客户端自动重试成功，未达到目标unknown状态；改两次后同档恢复正确，但服务端原normalise规则补knowledge_reward=0被探针误当业务变化。已按rules.py原有默认零比较，不删除奖励字段，仍逐项核对资源/历史/书页与知识点0。两个失败均保留。

第三轮 `run-WEGWxQ`已通过正常启动、原已提交书页/相同待确认命令与凭证跨入口503恢复、必需PNG失败重试、真实12秒缓慢下载/迟到成功与焦点恢复4检查。未重置数据，书页恰好1条。实际查看故障页。无脚本场景随后发现A生成HTML把空href破坏为index.8b545.jshref，原链接无角色/无法点击；这是实际产物缺陷。模板改用非空./相对地址，B新候选构建中；不改SDK或通过修改产物伪造构建证明。

B `run-6W90Uk`六项表面检查通过，但产物检查发现./仍被SDK改为index.8b545.js/；其“无脚本链接可见”断言不足以证明可用，不能据此登记该动作通过。追加真实Enter导航 `run-NkLMOH`实际404，证实缺陷。C改为无action地址的原生GET表单（浏览器默认当前文档），无需脚本或MD5地址替换；常规用例追加真实提交/200 HTML/相同路径/提示仍可见，另查740横屏。没有放宽动作结果。


## 当前生产候选E与已完成验证

A/B的无脚本导航缺陷和对应失败回执均保留；C原生表单实际构建正确。随后将公开`loaded`诊断状态与真正释放启动输入后的准备完成同步，避免资源回调与首帧语义更新之间的一帧提前就绪。内部资源标志仍由原加载流程拥有，不改变游戏进度或服务器状态。D在受限沙箱内未启动Creator、空日志退出1，不计成功；E在已授权本地执行环境由真实Creator3.8.8构建成功。

E源SHA256 `abac98dbbd42641cac1e8a8c90a9241998074fd7d65022ced3bbc09dbb299450`，生产SHA256 `8890d8655a51b23493f300d0a11026d1aee2379c684a004f93036b2d56e5a84d`；关闭debug/sourceMaps、MD5启用，266文件/14831337字节。

- `run-NY4ShK`：规范启动套件6检查/13PNG通过。实际丢失两次同一已提交书页回包后保留原凭证和待确认命令，再经历入口脚本503/实际原生重载，恢复相同角色、书页与资源；恰好1条study_create结算，知识点0。实际必需PNG503恢复、真实12秒慢加载迟到成功、无JavaScript原生Enter提交返回200同路径、WebGL禁用五尺寸通过。浏览器156.0.8078.4，专属浏览器/API/代理已退出。
- `run-bh1O4K`：本机已安装真实Chrome155.0.8059.80同6检查/13PNG通过；使用独立实例，用户原Chrome未动。此轮版本来自实际启动路径与生命周期回执，不冒充Safari/Edge或实机。
- `run-b5MPJP`：既有游戏开发技能原始帧客户端2检查/4PNG通过，实际查看恢复后世界画面和文本状态；原输入/存档恢复保持。
- `run-tKjZQe`：真实本地Nginx生产包10检查/6PNG通过，包括版本目录内无脚本原生Enter重载200、旧版本标签页、两真实引擎包相同Cookie/Bearer/角色接续和入口切回。Nginx/API/浏览器均finally退出。只在本机HTTP回环验证，不当作HTTPS、容器或正式部署。
- 独立源码副本`clean-source-rMNEWg`的886个冻结输入全部未改；有锁离线安装、无原Web依赖/构建/项目缓存的真实Creator重建266生产文件与E逐字节一致。凭据`output/cocos-boot/cold-build.json`。
- 22单元模块、106真实SDK类型/绑定、387来源/107引用、原390与435保护及diff空白检查通过。启动浏览器模块已加入统一入口，当前23套Cocos加1套独立Web兼容；原Web及其启动/发布代码继续保留。

实际查看740横屏无脚本/WebGL/真实缓慢提示、版本目录重载页面、1440世界接续和帧客户端恢复截图。截图存在不代替动作检查；原生重载均另有真实HTTP结果断言。

本轮产品文件：`clients/cocos/build-templates/web-desktop/index.ejs`与`style.css`，`clients/cocos/assets/scripts/Bootstrap.ts`与`accessibility.ts`；验证文件为`clients/cocos/tools/smoke-boot.mjs`、统一浏览器套件/选择测试及来源清单。没有新资产/字体/声音/依赖/后端规则/模式迁移；学习/库存/奖励身份仍由原客户端与服务器所有。其余现有工作树修改不属于本轮，未重置。

## 仍在运行，不登记通过

北京时间2026-10-18 11:59，完整24套`run-tjEWQ4`/session48814/控制器11463已通过boot、semantics、data、session、world、story，正在depths；运行时、规范测试和387来源输入冻结，结束前不得改写。旧Web比较包为现有`output/cocos-regression/web-compat-current`。

`run-bQTJIu`/session5771/控制器15619独立QA真实45分钟会话，从11:54:30.846至至少12:39:30.846。专属launcher15645/API15659/proxy15660、57846/57847；重复原生地图/菜单/中文草稿表单/Life返回，结束后再核对同一凭证/资源/知识点和真实移动保存。没有修改时钟、跳帧等待、补发奖励或操作人工存档。1分钟脚本预演`run-1FgLEP`终态0，不计为45分钟结果。45分钟当前仅采到第4分钟，无控制台异常，纹理63332216字节/缓冲285554736字节保持；这是引擎统计分配量，不是居民显存、硬件结论或性能发布预算。开始/结束另作GC归一化堆/DOM比较，逐分钟原始样本保留，不能将未GC高水位误报为泄漏。

手工5442/API8142仍是上轮Task62生产D，同一人工库/Cookie，未提前切换E；自然同档51881/51882三小时约定仍13:09:37.376467到期，知识结算/魔法/石门/远行返乡仍待。完整回归和长会话完成后才能考虑同库备份/指纹核对与人工候选更新，不清除数据。

`output/cocos-boot/cleanup-progress.json`核对50个回执/97个已结束PID记录：无匹配启动时间的已结束工具或专属浏览器/Creator标记遗留；保留上述正在运行任务及人工服务，健康均200。用户已有浏览器标签和共享工具宿主未动。完整V2、V5、V6和退役批准继续开放。

## 实际命令

使用根锁文件的Node22.23.2/npm10.9.8与既有Playwright1.64.0，后端Python为`backend/.venv/bin/python`3.14.6；Creator为`output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator`3.8.8。

```sh
# 使用已选Node22；官方Creator由本地环境变量指定
node output/cocos-boot/build.mjs e
node tools/cocos-sources.mjs --write
node tools/cocos-browser.mjs --build web-release-boot-e/web-desktop --suite boot
node tools/cocos-unit.mjs --report output/cocos-boot/unit/result.json
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
node clients/cocos/tools/check-baseline.mjs
node output/cocos-boot/cold-build.mjs
node output/cocos-boot/frame.mjs
node output/cocos-boot/chrome-run.mjs
node tools/cocos-release.mjs --build web-release-boot-e/web-desktop --output output/cocos-boot/candidate-e --previous output/cocos-accessibility/candidate-d
REALQUEST_NGINX=/opt/homebrew/bin/nginx node output/cocos-boot/delivery.mjs --artifact output/cocos-boot/candidate-e
# 下面两项已启动，尚未结束；不要重复启动或把阶段结果当完整通过
node tools/cocos-browser.mjs --build web-release-boot-e/web-desktop --suite all --web-build output/cocos-regression/web-compat-current
node output/cocos-boot/soak-run.mjs 45
```

独立版本包`output/cocos-boot/candidate-e`含5个真实引擎版本，active `028ff18d99d904dfc6baaa7218ad183276263efba1fcb890b8e531cd76a78237`，artifactSHA256 `9335dfe4e44e92378c12c843e0b77b09b0eabaabd2f6f13b6a68e583287a6f63`。仅本地交付演练，没有部署、提交、推送或默认Web切换。


## 12:29实际全量进展更新

原E完整`run-tjEWQ4`在inventory退出1，complete:false、cancelled:false，不能登记24套完整通过。前17套成功；inventory已通过前3组后，第二次快捷播种在原位置找不到64范围内的空田，按正确语义打开行囊，旧脚本却等待播种预览。实际检查截图/位置与目标距离后，仅在用例中补真实走到244,464，再开启下一块空田固定预览，未改变游戏、目标选择或64范围。规范文件仍冻结，修正暂放同目录深度的output别名。

该修正的E实际复测`run-1O5Cgz`/session98487终态0，11组/59PNG，全部并发占田、幂等扣种、原14物品、实际制作/出售、两旅程偏好、删除与触控断言通过；实际查看被另一客户端占田后仍固定原目标并禁用确认的画面。

原包此前未执行的6套由`e-tail.mjs`显式从原结果取差集（不包含已单跑库存）继续，`run-I4ZMVI`/session18268/控制器20586，12:25:53开始，仍在运行。原17套、修正库存1套、余项6套的回执将分别保留；不能把合并覆盖描述成原单次完整通过。E45分钟`run-bQTJIu`/5771仍至至少12:39:30.846，第34分钟引擎统计纹理63332216/缓冲285554736字节且无异常，最终GC/存档检查未结束。
