# Cocos 委托原文阅读

2026-10-18，接续任务39 V4/V5。状态：本地候选完成，玩家复核待答；不扩大其他画面或原Web退役批准。

自然旅人实际交付第九项委托的1440截图中，原长说明被固定64像素容器上下裁切。此次只修复委托阅读链：列表显示两行摘要和省略提示，提供独立“阅读原文”；沿用现有纸页和控件，原文按实际可用行宽/高度分页。返回/Esc回到同一委托，分页不追踪、接取、发奖或移动。原接取/交付/追踪与标记仍是单独动作，目标翻页按钮改为44像素并留出奖励空间。

产品变更为 `clients/cocos/assets/scripts/ui/panels.ts`，来源清单同步；没有新图片/字体/音频/依赖、规则、存档模式或原Web改动。现有资产与Hearthwood规则保持。

G2实际Creator3.8.8生产包：源 `b829159d266b7cdc2ab75dabde755d7a49e9224dc34baf59a49a1d9e163ffe48`；266产物SHA256 `08198ec614e16af5e9430d7ed5926838584976caec602879ee86c45d123b8d05`。最初G包只完成构建，随后调整目标分页空间形成G2；不把未测G包记为验收。

验证：

- `run-N1D4cL`：五种原文尺寸/10PNG通过；实际原文在全部尺寸可单页读全，这不能证明多页动作。
- `run-eR2Ltv`：原五尺寸及明确QA长文响应样例，共6组/16PNG通过；长文实际6页、前后翻阅与触控返回，样例仅注入该QA浏览器响应，不写入存档。逐字核对可达文本，按实际字体检查行宽/行高，所有按钮至少44像素且不重叠。同一角色、库存、任务、积累/点数和记录不变，无意外控制台错误。
- `run-rZKjTo`：原story9组与semantics5组通过，原剧情奖励/培养及键盘语义保留。
- 106真实SDK类型/绑定、388来源/107引用、390+435原Web保护及diff检查通过。代表1440摘要、740原文、QA第6页截图已实际查看。

命令使用根Node22.23.2/已锁Playwright1.64与既有Python3.14，独立测试库由统一runRegression分配并finally关闭：

```sh
node output/cocos-boot/build.mjs quest-reading-g2
node output/cocos-quest-reading/run.mjs
node tools/cocos-browser.mjs --build web-release-boot-quest-reading-g2/web-desktop --suite story,semantics
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
```

人工旧F session48158正常退出后只读备份到 `output/cocos-quest-reading/manual-before-g2`，六表/结构snapshot `569ae498…36cb` 在G2启动前后完全相等（实际1角色/974回执）。新session10980、launcher37081/API37084/proxy37085，原5442/8142、原数据库/Cookie保留，四端健康200；凭据 `manual-handoff.json`。用户现有IAB/Chrome未操作。该服务为人工复核保留，原Web默认入口和代码保持。
