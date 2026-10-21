# Cocos 固定网络预算回归入口

2026-10-19后续：[任务87](87-cocos-native-edge-network.md)已在原公共入口增加严格Edg产品版本核验，当前J3真实Edge155一次七网络样本/10PNG和三相关单元通过。预算文件及游戏/后端不变，完整V6/实际CI继续开放。

2026-10-18，接续任务70/71和任务39 T2/V6。本轮本地完成：正式入口、两种实际浏览器路径各七份预算、900输入独立工具副本、实际取消清理、原runner七生命周期与四相关单元均通过。外部CI与提交推送仍待授权，本轮只维护本地代码和候选工作流，未关闭完整T2/V6。

短计划：把冻结预算和output测量脚本迁为正式命令；移除机器/历史构建路径假设，仅接受经过校验的候选包；覆盖预算失败与取消清理；用未改游戏I3包实际完整复验，并接入候选CI上传前检查。

## 合同与实现

`tools/cocos-network-budget-v1.json`逐字节复制采样前固定的原budget-v1，不放宽阈值。`tools/test-cocos-network.mjs`通过 `npm run cocos:test:network -- --artifact output/<候选包>`执行，使用真实Nginx gzip/cache、随机回环端口和自己的新SQLite。它不接受外部URL、玩家库、样本数或预算覆盖参数；全部七份cold/warm/首移动/同凭证存档/唯一书页和物品/三种点数均须通过。

活动版本来自真实封包回执并核对当前运行时来源，不硬编码I3构建目录。默认根有锁Playwright Chromium，可用既有`REALQUEST_CHROMIUM_EXECUTABLE`明确选择其他已安装的Chromium/Chrome；报告记录实际版本/产品。预算最初由任务70的Chrome155校准，其他执行引擎另记实际结果，不将它们统称为品牌Chrome、实机或生产SLA。

`tools/cocos-network-budget.mjs`从全部原始样本计算结果：漏样/重复样本、首移动/同档/唯一结算失败、非有限指标、未施加限速、无gzip/实际缓存、ResourceTiming溢出或真实错误均失败；每份样本逐一比较，均值不能掩盖超限。`tools/test-cocos-network-budget.mjs`包含这些确定性负例并接入单元模块`network-budget`。

`tools/cocos-browser-config.mjs`允许独立拥有服务的调用方显式负责信号生命周期，原统一runner默认行为保持。网络命令在取消时关闭自己的浏览器以打断加载，再在finally清理API/Nginx组并写入失败/取消回执；清理失败也不得留下complete:true。

代码复核与实际取消预演发现并修复了两个报告/生命周期问题：errors列表原本到finally才附到report，会让前置完成判定错误拒绝通过；Playwright自身默认SIGINT处理会直接exit130，绕过独立命令的服务finally。独立命令现在显式关闭Playwright的SIGINT/SIGTERM/SIGHUP处理，由自身三个信号统一中断、关闭浏览器并完成服务清理。

失败`run-alNjcD`的0样本来自默认无头Chromium的实际产品名`HeadlessChrome/156...`与旧Chrome-only断言不同，已改为接受这两个实际产品前缀并严格核对版本。该失败的浏览器/API/Nginx完整退出。首次取消`run-d1Wq8v`在五个完整样本后暴露exit130/缺最终回执：原缺失/partial/lifecycle证据保留，仅按已核对PID、开始时间、端口和专属配置目录补充关闭71809/71811；浏览器71813已退出，补充证据在`output/cocos-network-gate/cancel-repair-cleanup.json`及该run的browser-cleanup中，不伪造原finally通过。

修复后的实际Ctrl+C `run-UfYPi8`返回1、cancelled:true、complete:false，browser74601正常0退出且forced:false，API74597和Nginx74599组均退出，失败/取消回执完整写出。游戏/人工试玩未参与这些测试。

`.github/workflows/cocos.yml`在候选上传前执行正式网络命令；原Web CI/发布器与main-only、只读权限、自托管要求不变。新增检查尚未在远端运行，不把本地工作流文件当作实际CI证据。

本地用系统Ruby Psych解析YAML并核对仅workflow_dispatch、只读contents、main分支、fatal shell与网络命令先于上传，`workflow-validation.json`通过；没有为检查安装PyYAML或新依赖。此语法/顺序核对不等同GitHub实际执行。

## 本轮验证清单

- [x] 正式入口完整七样本与原游戏I3来源/产物保持，实际检查截图。
- [x] 实际取消/异常清理、原runner信号默认行为和真实浏览器退出。原错误取消独立保留并补充有归属的清理证据。
- [x] 四相关单元、来源/过渡保护；900输入源码副本包含预算与工具，不依赖原output。
- [x] 临时服务和浏览器清理；5442人工I3及用户原浏览器保持。
- [ ] 实际远端CI/干净Git检出、提交推送授权、任务66视觉、实机/系统/生产及完整退役门槛继续开放。

## 已取得的正式入口证据

最终根目录运行`run-NtA1wm`（session70781终态0）全部七份通过，complete:true/cancelled:false，零错误/超限；实际CDP产品`HeadlessChrome/156.0.8078.4`，cold每次10,262,849字节，warm301字节、实际HTTP缓存。10Mbps三次cold13.476/13.475/13.466秒，受限三次58.042/57.965/58.007秒；warm2.617–2.698秒。实际查看受限网络单书页截图，未开始计时/三种点数0，原来源和未完成含义保持。10PNG是采样证据，不是新视觉批准。

版本化预算SHA256仍为 `1b867f45b1e9c686a238393f062711a9c3546357054958f01ce26ff8f4ced778`，与任务70采样前的原文件完全一致。当前399来源/107绑定/93冻结Web输入；游戏I3运行时与269产物未改，不重启或操作人工试玩库。

独立900输入源码副本`clean-source-qFDmFw`已通过：无旧output/原Web安装/Creator项目缓存，有锁离线安装根依赖，明确借用已锁定后端Python环境，仅复制字节一致的现有I3 raw包再独立封包，通过公开npm命令执行。900个输入前后全部未变。此项验证工具与路径独立性，不冒充一次新的Creator重建、Git干净检出或远端CI。

该副本`run-D5Vf2E`（wrapper session26720终态0）实际`Chrome/155.0.8059.80`七份全部通过，零超限/错误：10Mbps三次13.498/13.548/13.459秒，受限58.129/57.927/58.094秒，warm2.475–2.587秒（参考2.492）；字节同为10,262,849/301。10PNG中实际查看真实12秒后缓慢提示；没有提前移除提示或快进时钟。根目录与副本合计14个完整样本/20PNG，分别保留浏览器和版本，不混为单一七样本或p95。

`tools/test-cocos-runner.mjs --build web-release-network-i3/web-desktop`实际七种基础设施生命周期通过（session1178终态0，报告`output/cocos-regression/lifecycle-*/result.json`具体路径由runner.log记录）。正常、故意失败、超时、服务退出、取消、启动取消与占用端口均核对浏览器/服务消失；其中FAIL子回执是预期负例，不计为游戏通过或产品故障。四相关单元session60951终态0，报告`output/cocos-network-gate/unit-complete/result.json`。

`output/cocos-network-gate/verification.json`连核对两份完整报告、原预算SHA、当前冻结工具/后端/source目录、900输入、取消、runner、单元及I3原构建/封包指纹；均通过。最终`cleanup.json`扫描所有独立副本，共455浏览器记录/1012已结束PID，无所属闲置遗留、活动自动化或读取错误。保留人工19960/67850及API67853/代理67854@5442/API8142供试玩；原用户Chrome/IAB与共享工具宿主保持。本轮无素材新增，无游戏构建/规则/存档改动，不用重复Creator构建或重启人工服务。

实际文件：`tools/test-cocos-network.mjs`、`tools/cocos-network-budget.mjs`、`tools/cocos-network-budget-v1.json`、`tools/test-cocos-network-budget.mjs`、`tools/cocos-browser-config.mjs`、`tools/cocos-unit.mjs`、根`package.json`、`.github/workflows/cocos.yml`与生成的`docs/migration/cocos-source-inventory.json`；另更新本地/交付说明、任务39/TODO和本报告/进度。没有新增npm/Python依赖，原Web/default CI与部署未改，未提交、推送、触发CI或部署。

后续单独检查其他拥有服务的独立脚本（如`test-cocos-delivery.mjs`）的取消生命周期；本轮network检查不能替它们授予取消通过。当前目标继续active，不把完成此本地工具切片当成原Web退役批准。
