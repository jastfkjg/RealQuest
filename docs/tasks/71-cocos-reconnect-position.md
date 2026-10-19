# Cocos 重连后的权威位置接续

2026-10-18，接续任务70的真实会话回归。本地本轮完成：I3修复和确定性负/正验证通过，最终网络、交付及同库更新也已完成，见[任务70](70-cocos-network-budget.md)。这项修复不改变移动规则、速度、存档结构或原Web。

短计划：保留首次严格失败；捕获真实请求、忙碌状态和服务端回执；用延迟权威刷新稳定复现；仅修正自动同步的生命周期条件；以相同请求数、位置和结算断言复验。

## 真实问题

I2定向回归`run-Iop7Tc`的boot六组通过，但session出现四次move请求，严格预期为三次，其余五套未执行。单独追踪`run-o8ECa0`六组虽通过，不能因此抹去首次失败。

控制用例`output/cocos-network/reconnect-busy.mjs`使用独立新游客、真实D移动和真实服务器：首次move已提交，前两次回包丢失，用户重连时重放完全相同的请求；第三次确认后，将实际`GET /api/state`持有500ms。没有修改SQL、资源、时钟或位置。

I2负例`run-PmguJj`失败并捕获第四个不同ID的move：原位置目标约241.992，额外请求却提交旧位置240。期间connection已ready、界面仍busy，最终出现两条move结算并回退至240。这是权威刷新期间的自动位置同步竞态。首次冷启动D未移动的旧网络基线是另一项未复现现象，不能混为同一原因。

## 修复与长期回归

`clients/cocos/assets/scripts/Bootstrap.ts`只给update中的自动syncMove调度增加`!this.busy`。显式交互中的syncMove仍保留，避免阻断原有先保存移动再执行交互的流程。服务端、shared client、协议与原请求持久化不变。

`clients/cocos/tools/smoke-session.mjs`在740×360、844×390、1024×768、1440×900、1920×1080五种尺寸分别持有真实刷新350ms，核对：

- 原三次请求body/ID完全相同，忙碌刷新期间没有第四次move。
- 服务端只新增一条move回执；最终位置等于原请求目标。
- 金币、物品和三种现实成长点数保持。
- 原错误提示、只读地图返回、重连反馈和DPR2触控链继续可用。

finally释放所有持有的刷新，再关闭自有浏览器；统一入口关闭API/代理并检查退出。测试不指向5442人工库。

## 实际结果

I3真实Creator3.8.8生产候选`web-release-network-i3/web-desktop`：source `ff64b0e465f0a146ac60e2279a6f02bee40d0054dd2e7f2fd5cc77a183cf5301`，payload `8532777e89513d7bd5e187b2777118da1e4399d2de737414735c63b9e7084efe`。

- 相同500ms控制用例`run-AF649U`通过：三次同一请求、仅一条move回执、原位置/资源/存档保持；负例独立保留。
- 规范session `run-vVeeYe`六组通过，包含五尺寸350ms刷新窗口、旧凭证恢复、其他标签页保护和两种DPR2横屏触控；零意外错误。实际查看740恢复截图。
- 五个相关单元模块source-ownership、transition-protection、browser-configuration、build-receipts、core通过；没有把定向检查称为全27套通过。
- 全新896输入源码快照、有锁离线安装、独立Creator用户目录重建269产物/15,172,820字节，与I3逐字节相同，输入前后未变。回执`output/cocos-network/cold-i3/cold-build.json`。

复现（仓库根Node22/npm10、官方Creator3.8.8和既有Python后端环境）：

```sh
npm run cocos:test:browser -- --build web-release-network-i3/web-desktop --suite session
npm run cocos:test:unit -- --only source-ownership,transition-protection,browser-configuration,build-receipts,core
```

上述包名是本机独立候选，其他机器先按[本地说明](../cocos-local.md)构建自己的包。真实系统输入法/设备/品牌浏览器、生产网络与CI、任务66待答视觉及完整退役门槛继续开放；没有提交、推送、部署或删原Web。
