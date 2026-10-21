# Cocos 暂停请求回归与 Safari 原生预检

2026-10-19补充：当前统一候选之后另做了不加载游戏/不建库的Safari26.5可见性预检。普通及Raise窗口仍hidden/0动画帧；自有窗口进入全屏后曾调度614帧、后续AX观察到616/634，但所有可见性快照仍hidden，页面焦点可为true，未建立稳定可见会话。不能以截图可见、焦点或短暂回调代替游戏验证，也不能认定Safari不兼容；后续须待实际可见控制环境变化，避免重复同样本机预检。

新证据在 `output/cocos-safari-visibility/`：六份只含自有诊断窗口的AX、实际查看的原始 `fullscreen.jpg`、`result.json`与`cleanup.json`。全屏已通过原生“退出全屏幕”恢复，关闭自有标签后仅剩本轮起始页，再正常退出Safari25959；Python诊断服务25935通过stop/finally退出，session74169 terminal0、52548无监听，5442/5443四项主页/health200。没有启动游戏后端、创建玩家库、启用远程自动化/改偏好、清用户数据或重跑游戏矩阵。原Web/当前J3封包和用户浏览器保持。

2026-10-18，接续任务39 V3/V6与任务68。短计划：将新keepalive暂停传输的故障验证接入统一回归；尝试实际Safari并严格区分后台环境限制和兼容性结论；收尾所有所属工具。原Web、人工5442与玩家库保持。

## 维护的回归入口

新增 `clients/cocos/tools/smoke-pause.mjs`，登记到 `tools/cocos-browser-suites.mjs` 的 `pause`。它与普通XHR业务故障分开执行，默认Chromium，可通过 `REALQUEST_ENGINE=firefox` 或 `webkit` 选择已安装的锁定Playwright引擎。当前注册25个Cocos套件，另有1个原Web兼容套件；历史25套覆盖记录不因此成为新26套全量通过。

```sh
nvm use
npm run cocos:test:browser -- --build web-release-boot-lifecycle-h2/web-desktop --suite pause
# 使用自定义引擎缓存时，同时设置PLAYWRIGHT_BROWSERS_PATH
REALQUEST_ENGINE=firefox npm run cocos:test:browser -- --build web-release-boot-lifecycle-h2/web-desktop --suite pause
```

每种引擎7个独立新QA上下文，覆盖：

- 暂停outbox写入失败时零网络请求/零结算；修复存储后再操作成功。
- 提交前500、已提交后回包丢失、200损坏JSON，均保留原持久请求，恢复后结算1次；回包丢失还实际重载并核对没有新建角色。
- 已提交后两次真实12秒fetch超时，保留原请求后恢复，不重复结算。
- 401保留待确认请求与原凭证；422作为明确拒绝清除该请求，玩家重试使用新请求ID。

检查实际资源类型为fetch、原request_id/save_id/body/Bearer、原角色及财物/点数/学习记录不变，并只读查询所属测试库结算数。故障网络日志仅在对应注入阶段及实际 `/api/command` URL接受；超时路由清理只接受明确的“Route is already handled”错误。没有改数据库、时钟、奖励、角色资源或登录凭证。浏览器、上下文和服务均有finally清理及统一生命周期核验。

## 实际验证记录

维护前原始输出用例 `run-LpUGn5` 终态complete:true，三引擎21组/42PNG：Chromium156.0.8078.4、Firefox157.0、Playwright WebKit27.2；真实双超时分别24048/24399/24115ms，全部零意外错误。三张代表截图已实际查看。这个报告及原用例保持，供核对维护入口的来源。

维护版本三种引擎均终态通过：Chromium `run-QvfgTM`、Firefox `run-nrUDhp`、WebKit `run-D2c8D7`，各7组/14PNG，共21组/42PNG，零意外错误；真实双超时分别24028/24197/24084ms。维护版本新增实际Bearer一致性断言及更窄的故障日志范围后全部通过。三张最终代表截图也已实际查看，没有以原截图替代维护版本复核。matrix/session88150终态0，所有浏览器及所属API/代理均已退出。

实际执行 `node output/cocos-pause-faults/run-maintained.mjs`，依次使用统一登记的pause套件及各引擎环境；锁定引擎缓存为 `output/cocos-browser-engines`，Chromium使用已安装1248版Playwright对应的Google Chrome for Testing。`verification.json`逐项核对当前测试SHA、来源清单、H2源码/产物、7组断言/14个实际PNG、服务与浏览器退出。这里是三次定向回归，不是一次26套全量运行。

4个相关单元模块（来源归属、原Web过渡保护、浏览器配置、构建回执）通过：`node tools/cocos-unit.mjs --only browser-configuration,source-ownership,transition-protection,build-receipts --report output/cocos-pause-faults/unit.json`，session47398终态0。来源清单更新为389文件/107引用/106绑定；工具测试变化不属于Cocos运行时构建输入，原H2源与266文件产物保持不变，不伪造重建回执。语法/来源前后检查及 `git diff --check` 通过，未重跑未修改的游戏模块或后端232项。

## 实际 Safari 的边界

本机实际版本为Safari26.5（20624.2.5.18.3）。`/usr/bin/safaridriver` 启动后返回“Allow remote automation”未开启，未创建会话；原进程已退出。本轮没有启用远程自动化、开发功能或修改系统/浏览器设置。

改用原生界面自动化，新开自有5457 QA标签页，实际打开H2并执行故障页“重新载入”；页面仍停在加载/缓慢提示。独立5458诊断响应仅加输出覆盖层，未修改H2文件，原生AX及截图实际观察到：1428×740 CSS像素、DPR2、`document.visibilityState=hidden`、focus=true、动画帧回调0、engine存在但game未初始化且暂停。窗口前置动作未使该状态改变。故障原因尚不能归为Safari兼容性；当前后台操作环境无法验证游戏代表流程，不记品牌Safari通过，也不关闭V6。后续需要真实可见的Safari会话。

诊断覆盖层只读已有状态/记录控制台，没有强制可见性、驱动动画/初始化或发游戏命令。实际截图已在原生工具结果查看，没有导出PNG，不将它计入上述42张。Safari的QA库5张业务表均为0行；未创建角色或伪造存档。具体预检、请求日志和原生观察见 `output/cocos-safari-native/{preflight,native-result}.json` 与同目录日志。

两个自有QA标签页已关闭，确认仅剩本轮启动的起始窗口后正常退出Safari，进程43428/43664及自有driver均已消失；Cua会话已重置。5457/8157和诊断5458均关闭，session70173/59527终态0；最初QA服务43721/43724/43725也已核实退出。用户原Chrome/IAB保持，5442/API8142健康。

本轮无游戏界面/规则/素材/字体/音频/依赖/后端模式改动。任务66玩家复核和提交/推送授权问题仍待答；实际CI运行器、系统输入/读屏/缩放、品牌浏览器/实机和生产门槛继续开放。没有提交、推送、部署、账号设置或原Web删除。

最终只读审计418条浏览器/908条已结束PID记录，无所属闲置遗留或活动自动化浏览器。4个单元子进程、matrix45338及上述Safari服务身份均核对已退出。只保留原H2人工session36849/42188/42191/42192供待答复核，5442/8142健康200、所服务构建指纹仍为H2，本轮未读取或改写该玩家库。最终凭据为 `output/cocos-pause-faults/{verification,cleanup}.json`；Cua截图仅记录在原生工具结果，不计入42PNG。
