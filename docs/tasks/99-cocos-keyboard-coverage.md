# Cocos 键盘遍历覆盖

2026-10-19，接续任务39 V5。用户要求整体完成后集中反馈，本轮继续补现有自动化中可独立验证的输入缺口；没有新人工问题。原系统IME末端来源仍未确定，未将已有真人中文保存代表链扩大为完整输入法通过。

短计划：扩展现有semantics套件，实际执行正反向Tab、禁用跳过和真实EditBox草稿接续，分别检查桌面/短横屏；核对唯一保存与资源，保留失败证据，清理全部自动化并更新统一候选的证据指针。

## 变化与覆盖

测试代码仅修改 `clients/cocos/tools/smoke-semantics.mjs`，同步 `docs/migration/cocos-source-inventory.json`；规范仍27套+1可选原Web比较，CI自动复用该套件。报告/入口更新本任务、任务39、`docs/cocos-handoff.md`、`README.md`、`TODO.md`与 `progress.md`。新增检查验证可用控件都可用Tab/Shift+Tab到达，焦点回到首尾、禁用操作不进入遍历；同时核对真实DOM焦点和Canvas焦点状态，不仅判断一次按键已发送。

现实成长链实际操作空白研习→Tab跳过禁用保存→编辑中文草稿→Tab离开编辑框→Shift+Tab返回并再次编辑，原草稿保持；0分钟仍禁用，修正12分钟后保存重新进入Tab顺序。最后使用原生按钮Enter只提交一次，保留已有登记、Space外观选择、面板输入拥有权、Esc逐层返回/世界移动及嵌套菜单焦点检查。

在1440×900与740×360分别遍历地图、手记、行囊和现实成长；另有登记、旅程菜单、角色档案及三种表单状态，共15轮遍历/142个可用控件位置，正向与反向均实际执行。每轮保存本次可用/禁用ID、尺寸与模式；不是遍历游戏全部进度/所有页面状态，也不是物理键盘或系统读屏测试。

没有改游戏、引擎、后端、锁定依赖、素材或玩法数值，无新增资产/授权来源变化。当前J3 source bd5385fe… / payload9ed7cc7f…、269产物与77709984…静态封包保持，因此不重建引擎、不重跑未受影响的45分钟/网络/全27矩阵，不中断5443或原5442。

## 实际执行与失败保留

```sh
node --check clients/cocos/tools/smoke-semantics.mjs
node tools/cocos-sources.mjs --write
node tools/cocos-unit.mjs --only source-ownership --report output/cocos-keyboard-coverage/unit/result.json
node clients/cocos/tools/check-baseline.mjs
node tools/cocos-browser.mjs --build web-release-framing-j3/web-desktop --suite semantics
```

来源单元、390原来源/435保护基线与原启动发布检查通过。首轮 `run-R5h440` / session43468 terminal1，桌面及草稿链通过，缩到740后断言找不到旧HUD的menu原生按钮。原因是 `mode` 在按键处理时即改变，控件列表和语义层要等下一次Cocos redraw；旧等待仅观察mode，截图已是正确地图。保留原失败/截图/退出回执，修正等待为该页特有已绘制控件及其DOM peer就绪，全部严格遍历和禁用断言保持。

最终 `run-LL957s` / session32912 terminal0，complete:true，11检查/14PNG/0意外错误。测试SHA256 `9c0e0702970a62ab5487a5720bd0d372da4d029f7dfecb965ac93852f74422ff`；15轮记录及实际源码、引擎/后端/清单指纹由 `output/cocos-keyboard-coverage/verification.json` 核验。

实际查看最终空白研习、有效草稿、740地图/行囊/成长五图，焦点描边可见、字段/操作和现有布局可读；没有宣称新的玩家视觉批准。

![740横屏实际键盘焦点](../../output/cocos-regression/run-LL957s/suites/semantics/map-740-keyboard-focus.png)

只读最终本套QA库：唯一角色、唯一书页“键盘创建的真实书页”、目标12分钟、完成时间空、奖励0，create/study_create各1、XP与三种成长点0，integrity/FK正常。无真人学习完成或奖励核验主张，没有访问原5442或统一5443的玩家数据。

## 交付与清理

两次回归均通过统一控制器使用新库、随机回环端口和专属浏览器；finally关闭上下文/浏览器/API/代理，原失败保持失败。最终结果无controller补救浏览器，所属服务子进程均退出；后台清理再按精确PID/启动时间和owner/profile核对。保留两份测试库/报告/图像，仅作为非运行证据。

最终只读全局审计606份浏览器/1889份结束PID记录，无所属遗留、活跃自动化或意外读取错误；历史精确空JSON负例仍原样保留。两轮四端口49257/49258/50186/50187均不可连接、所属服务组退出，原5442与统一5443六个进程身份保持、六项主页/构建/health通过。`output/cocos-final-candidate/{cleanup,services,verification}.json`已刷新，task98旧回执未覆盖；共享/用户进程和两份人工试玩保留。

统一候选仍为[5443](http://127.0.0.1:5443/)及原[5442](http://127.0.0.1:5442/)，服务和玩家存档不变。任务98原始交付回执已原样存入 `output/cocos-keyboard-coverage/task98-verification.json`；当前交付清单采用本轮semantics、任务82 consistency及任务77其余25套的现行用例证据，不将不同历史执行合称本轮全27重跑。

完成的是这些浏览器DOM键盘行为的直接覆盖。系统IME结束事件来源、实际读屏、其他可访问范围和实机/实际CI/生产以及完整人工体验仍按任务39保留；不关闭整个V5或整体目标，没有提交、推送、部署或删除原Web。
