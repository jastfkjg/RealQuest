# Cocos 系统读屏验收准备

2026-10-19后续：用户要求整体完成后再反馈，专项入口已由[统一候选5443](../cocos-handoff.md)替代。本任务所属主机已通过自身finally正常关闭，API/Nginx及worker退出，QA库/证据保留；专用浏览器标签清理时已不存在。读屏未启用、画面/手感未替玩家批准，不再等待逐屏答复推进工程。关闭记录及精确范围见[任务98](98-cocos-overall-candidate.md)。下文为专项当时的准备与证据。

2026-10-19，接续任务39 V5与任务96。**当前仅完成独立读屏QA与实际页面准备，尚未开启VoiceOver/字幕面板，也没有读屏通过结论。** 已向玩家请求临时启用并恢复原状态的具体确认；未收到同意前不执行依赖它的系统动作。

准备后的三轮接续核对：具体确认仍待答，其余玩家/实机/实际CI和目标条件也未补齐，满足目标受阻条件。三轮均实际poll读屏session80082与取景session63937为live，九个保留进程身份/八项健康200；第三轮重新只读GET运行器仍0、远端仍只有ci/deploy，未触发工作流。两张专用验收标签再次标记保留，没有重复提问或开启系统设置。详见`output/cocos-completion-after-reader/`，任务97准备本身是先前实际进展，不计作这三轮中的无进展回合。

短计划：先核对清单和实际CI/系统入口，用当前封存J3及全新QA库准备成长空列表→研习表单；核对原生窗口归属、可访问控件和数据，再请求系统设置确认。获同意后先读取原开关状态，只在本轮窗口验证实际VoiceOver输出、字段/禁用状态/激活与返回焦点，记录字幕面板或可核对的真人读屏证据，最后恢复原状态并关闭本轮标签/服务。浏览器AX不代替实际读屏，字幕也不代替人对语音清晰度的确认。

## 已准备的实际对象

[独立QA入口](http://127.0.0.1:50230/)，Chrome分组“🔊 Cocos 读屏验收”、专用标签139944108。正常登记默认林间旅人后，已打开“成长→新增研习”，停留在空白主题、25分钟、禁用“写下这一页”的表单；没有写入书页。登记动作在读屏开启前完成，因此不能登记为读屏姓名输入通过。

使用`run-t12C7p/suites/native-reader/test.db`，回环50230/API50231、单独Cookie；页面直接加载既有封存包，没有iframe、额外假控件或改写游戏DOM。实际原生Chrome AX先按专用分组精确匹配标签，再点击并读取窗口URL `127.0.0.1:50230/releases/260b7575…/`，确认所属QA后才准备后续系统操作。仅归档本轮窗口/标签归属片段，未将其他用户标签清单写入验收证据。

当前J3 source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e` / payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`，封包`77709984d30470abdf03af1e64937112a6e929ae580a4383994cd33a8f3a350d`，Creator3.8.8 release/269产物/11保留版本保持。实际环境为既有macOS15.7.7/M4、Chrome661、Node22.23.2、Python3.14.6和本机Nginx；运行中Chrome精确版本仍未核验，没有绕过任务95版本页策略限制。

实际已读取的AX包含：成长空列表说明、具名“写下今日研习”容器/标题、研习主题编辑、目标分钟编辑/当前25、返回、禁用保存。普通CUA界面检查的结果仅证明测试对象已就绪，不证明VoiceOver能正确朗读或操作。

![已准备的实际研习表单；尚未开启系统读屏](../../output/cocos-native-reader/approval-ready.jpg)

原始JPEG已实际查看：表单、字段和必要操作可读，主题空白、保存禁用。零控制台error。没有新视觉处理或玩家视觉批准。

只读本轮QA库确认1角色、create回执1、书页/study_create均0，save ID `e8af0e5b-6ae1-41c5-a301-f7000bb9d9de`；位置240/320、金币20/种子6、XP和三种成长点数0，无计时/活动/计划/约定/锻炼任务，integrity/FK正常。未访问原人工试玩玩家库或玩家数据API，没有准备额外资源、移动角色或伪造现实行为。

## 确认的对象和边界

电脑控制接口要求非敏感系统设置变更在没有具体预先授权时先确认。此处需要确认的是**临时启用macOS VoiceOver及其字幕面板，验收后恢复读取到的原状态**；它会产生系统语音并改变键盘交互，不是普通游戏内按钮操作。没有将笼统“继续清单”解释为修改系统偏好的具体同意。

已查阅与本机对应的Apple macOS15官方说明：[开启/关闭VoiceOver](https://support.apple.com/guide/voiceover/turn-voiceover-on-or-off-vo2682/10/mac/15.0)、[字幕面板](https://support.apple.com/guide/voiceover/use-the-caption-panel-unac078/10/mac/15.0)。字幕面板显示VoiceOver实际朗读内容，可用作观察依据；具体按钮/按键仍以实际系统UI为准，不能只发快捷键就宣称已开启。没有通过系统设置CLI、AppleScript或其他表面绕过CUA交互与确认规则。

下一步拟验证现有成长/研习链的标题、字段标签/当前值、禁用状态、激活/编辑、返回与焦点。仍需实际系统输出；若无法得到，就继续标未验证。不会自行下载声音、更改语速/音量、修改快捷键映射、启用远程自动化或接受新增隐私权限。若VoiceOver或字幕原已开启，结束时保留其原状态。

## 当前保留项与清理

主机session80082仍运行供本次具体确认后接续，已实际poll为live；控制器90682（07:59:25.905Z）、API90685（07:59:26.241Z）、Nginx90687及worker（07:59:26.580Z），仅回环50230/50231。标签139944108已标记接续保留。交付后取消15分钟自动期限，明确保留给此项验收；完成、拒绝或可处理取消后关闭本轮标签，再用本轮停止标记让主机finally只清理自己的服务，并核对退出。不要重放旧PID或把一次性主机当通用CI入口。

临时主机固定保存第一个停止原因，避免任务96中退出回调覆盖初始原因的记账问题；没有修改规范产品或生命周期工具。当前尚未执行它的退出流程，不登记清理通过。

全局只读审计604浏览器记录/1856结束PID记录无所属遗留、意外读取错误；历史任务73精确空坏JSON仍保持。本轮新增主机/标签是明确保留的例外，不计为已退出。原Chrome661启动身份保持，系统VoiceOver未由本任务开启；CUA清单没有列出Safari/VoiceOver运行，不把清单缺项当成系统偏好开关实测。共享工具宿主与用户进程保留。

原5442/I3与独立J3取景53136/API53137六个进程身份保持、五项健康200，新QA三项健康也200；IAB标签2继续保留原J3取景问题。没有重试原5442停止/更新的拒绝动作。

## 清单与命令

本轮开始的只读收尾审计发现仍为T2/T3/V2/V4/V5/V6/V7七项开放，GitHub实际GET运行器0、仅原ci/deploy工作流，Cocos工作流本地未跟踪；没有提交、推送或触发CI。20后端输入、27个历史实际测试的现行用例和原始报告字节保持；没有冒称新跑全矩阵。审计快照`output/cocos-completion-after-ime/turn1.json`最初按impasse记1，**随后已找到并完成本报告的具体读屏准备，因此该快照不代表本轮最终状态**；最终以同目录`turn-final.json`登记progress、连续impasse计数0，旧三轮blocked也不复用。

实际执行：

```sh
node output/cocos-completion-after-ime/build.mjs
python3 output/cocos-completion-after-ime/audit.py
node --check output/cocos-native-reader/host.mjs
node output/cocos-native-reader/host.mjs
python3 output/cocos-native-reader/audit.py
python3 output/cocos-native-reader/verify-ready.py
node tools/cocos-sources.mjs --check
git diff --check
```

全部浏览器/原生动作通过CUA，Node文件I/O仅归档接口返回的AX、原始JPEG和本轮标签信息；进程/健康读取按只读权限审查执行。`verification-ready.json`明确`readerTestPrepared:true`、`actualScreenReaderVerified:false`、`systemReaderEnabledByTask:false`和具体确认要求。

本轮仅新增本报告，更新任务39、本地说明和progress；一次性主机、前期审计、截图和核验器位于忽略的output。无产品/后端/素材/字体/声音/依赖/规则/迁移变化，404来源/107绑定保持。系统读屏尚未通过，七项门槛及整体目标仍开放；原Web未删除、默认入口与外部部署未切换。
