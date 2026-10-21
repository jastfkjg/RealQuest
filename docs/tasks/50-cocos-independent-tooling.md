# Cocos 独立依赖与本地检查入口

2026-10-17，接续task39 T3及T5的单元入口。玩家已接受task49本轮偏好页/操作/音量音色；聊天、行囊、其余画面与实机/发布门槛分别保留。全清单目标继续进行。

本轮链路：根目录有锁安装→明确依赖来源→同步/真实类型/单元检查→不含原Web安装或构建的源码副本安装与Creator构建→实际浏览器→收尾。没有切换默认启动/发布，没有删除原Web、提交、推送、部署或修改真实玩家数据。

## 实现

- 新根`package.json`/`package-lock.json`明确归属共享/Cocos工具：TypeScript5.8.3、esbuild0.25.12、Playwright1.64.0，全部30条依赖记录版本/完整性与原前端锁一致；没有升级或给原Web增加依赖。`.nvmrc`固定22.23.2，`.npmrc`拒绝不符引擎的安装，支持Node22/npm10。
- 36个Cocos检查/测试脚本与2个美术导出器改用根依赖；`check.mjs`用真实Creator声明，仍逐条核验106源绑定。原Web自己的package/锁/启动/保护合同保留。
- `tools/cocos-doctor.mjs`报告Node实际路径、根本地依赖路径及版本、Python路径、可选Creator/Chromium，执行真实esbuild转换。Node25明确拒绝，不静默使用另一个运行时。
- `tools/cocos-unit.mjs`串行执行15个单元模块，失败即停，独立日志/JSON与实际运行时路径；可`--list`、`--only preferences,inventory`、`--report output/my-run/result.json`。不把模块数称作断言数，不把此命令称作浏览器验证。
- `tools/cocos-child.mjs`对macOS/Linux创建专属进程组，超时/取消正常终止，必要时只强制结束自己的组，并验证已退出。嵌套工具按层缩短宽限期；实际退出/非零/超时/取消、孙进程和嵌套忽略SIGTERM退出、无关同级进程存活均有测试。Windows宿主尚不支持此单元运行器。
- `tools/cocos-clean-source.mjs`只收集候选源码/资产并记录文件哈希，不复制前端package/install/dist、DB、env、编辑器缓存或生成包。实际浏览器曾发现泛化`web-*`过滤漏掉现有`build-templates/web-desktop`，现改成仅过滤Cocos顶层生成目录并逐字节检查模板；没有通过改游戏UI或坐标绕过。
- 两个美术清单仅更新导出器脚本哈希，7张场景PNG/7布局/43绑定和9张物品图标可按原字节复现，没有新图、字体、音频或外部素材。

完整脚本改动清单为`output/cocos-toolchain/dependency-migration-files.json`（36个Cocos脚本+2导出器）。入口说明改动位于根README和clients/cocos/README；进度更新位于task39/task50、TODO/progress及美术ASSET_PLAN/REVIEW_CHECKLIST/asset-manifest。其余既有工作树改动保留，本轮未操作后端规则或原Web启动/发布文件。

## 本地命令

从仓库根运行，先准备官方Creator3.8.8与按既有`backend/requirements.lock.txt`安装的Python3.14 `backend/.venv`；无需先安装/构建frontend。

```sh
nvm use
npm ci
npm exec -- playwright install chromium # 首次浏览器验证
export COCOS_CREATOR="/你的路径/CocosCreator.app/Contents/MacOS/CocosCreator"
npm run cocos:doctor -- --browser
npm run cocos:sync
npm run cocos:check
npm run cocos:test:unit
npm run cocos:baseline # 在保留历史Git源的真实仓库运行
npm run cocos:art:check
REALQUEST_COCOS_BUILD=web-local npm run cocos:build
npm run cocos:preview -- --build web-local/web-desktop --port 5448 --api-port 8148 --database output/cocos-local/local-preview.db
```

预览只服务已有包，没有热更新；不要重建正在服务的目录。Ctrl+C仅停止该启动器自己的服务。人工5442/API8142及`output/cocos-data/local-preview.db`保持原样；自动化另用专用库。`start.command`/正式部署默认仍是原Web，历史Cocos默认5431/API8130/小样库也没有偷偷改写。

## 验证边界

本地冷验证使用当前授权工作树的849文件源码副本，含已有两份Web模板；不是已提交分支的CI克隆。副本没有`frontend/package.json`、`frontend/node_modules`或`frontend/dist`，原仓库另跑390保护项/精确原物品表等合同。Python通过明确symlink复用既有锁定venv，官方Creator3.8.8/Chromium二进制复用本机已安装工具，不宣称全新Python/SDK安装。较早Node25预检与漏模板失败日志保留为诊断，不计入最终通过证据。

## 最终结果

最终证据统一使用`output/cocos-toolchain/verified-*`和`clean-source-UAxUe0`，汇总为`output/cocos-toolchain/result.json`。真实环境：macOS arm64、Node22.23.2/npm10.9.8、Python3.14.6、Creator3.8.8、锁定Chromium。

| 实际命令/检查 | 结果 |
| --- | --- |
| 根有锁安装；源码副本独立`npm ci --offline --no-audit --no-fund --cache <本轮缓存>` | 5安装项；原30锁记录版本/完整性一致；无frontend package/install/dist |
| 固定Node22的doctor、sync、check | 根本地依赖路径验证；106绑定与真实引擎声明通过 |
| `cocos-unit.mjs`，原仓与副本各一轮最终执行 | 各15单元模块全部通过；运行时路径/每模块PID/日志在各result中，进程组已退出 |
| `cocos:art:check` | 7PNG/43绑定/7布局与9图标全字节复现，无源像素变化 |
| `COCOS_CREATOR=... COCOS_USER_DATA=/private/tmp/realquest-cocos-toolchain-verified REALQUEST_COCOS_BUILD=web-toolchain-clean node clients/cocos/tools/build.mjs web-desktop` | 真Creator冷导入/构建完成，退出36映射为0；结果使用原完整视口模板 |
| 原仓`check-baseline.mjs` | 390原源保护及精确共享抽取/原物品注册表/Web重导出通过，没有放宽保护 |
| 副本`run-preview.py --build web-toolchain-clean/web-desktop --port 5446 --api-port 8146 --database output/cocos-preferences/test.db`后`smoke-preferences.mjs` | 11组/38图、真实全屏/偏好/AudioContext/输入/只读提醒/自然采集与原安家交付通过，零意外错误 |
| 已有develop-web-game提供的客户端，沿用Cocos真实时钟适配，仅改为副本根Playwright | 2帧/2图，键盘选择减少动态，位置/物品/旅程ID不变，无控制台错误 |
| Node25运行doctor | 按预期退出1并说明切换Node22，未静默接受错误运行时 |
| `git diff --check` | 通过 |

浏览器共40张最终图；实际打开检查桌面焦点页、740×360声音页与自然任务交付画面，修复前漏模板失败图保留为诊断。截图与录像位于`output/cocos-toolchain/clean-source-UAxUe0/output/cocos-preferences/`，帧图位于同副本`output/toolchain-frame/`。源码副本不含Git历史，baseline在原仓执行；模板/源清单与根依赖路径见`source-proof.json`。没有把主套件的合成IME/媒体模拟或夹具时间算成实机/自然等待验证。

所有最终源码副本命令均显式使用`/Users/zilong/.nvm/versions/node/v22.23.2/bin/node`；npm执行时PATH亦放在该bin首位。初轮暴露不同cwd会选中Homebrew Node25，最终已加版本守卫并重跑，不能拿较早日志替代最终结果。浏览器首次沙箱启动被系统Mach服务权限阻止，改为授权的正常宿主执行后通过；没有自动审批拒绝或放宽断言。

## 收尾与后续

两组本轮QA服务6个PID已退出，5446/8146释放；全部专用浏览器、Node/Creator/esbuild工作进程结束。三份本轮过期源副本在核实无进程使用后删除，保留最终849文件源副本/包/结果和失败诊断。用户原浏览器未操作；不明归属共享Node/MCP宿主保留。人工47723/47725/47726及5442/API8142保持健康，继续服务task49偏好候选和原人工库，未切换其包或重置数据。证据：`output/cocos-toolchain/cleanup.json`。

T3本地独立依赖/检查/构建已验证；这是当前候选源码快照的本机证据，未来提交的实际干净CI检出仍须随T2验证。task39保留T3总勾选项开放，直到该证据齐备。T4冻结素材/绘制源码归属登记、T5统一浏览器端口/库、T1主入口和T2发布/CI仍有工作；单元入口不能代替这些门槛。原Web Dockerfile尚未复制新共享源码，需在T2一起验证/修复其回退构建，不能声称现容器已通过。V1–V7实机/完整旅程/实际同域存档与发布回退未由本轮关闭。
