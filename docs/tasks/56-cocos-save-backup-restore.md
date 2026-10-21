# Cocos 存档备份与恢复演练

2026-10-17实施并测试，2026-10-18收尾：V1/V7的本地SQLite链已完成：实际在线WAL备份、六张表完整指纹核对、同源API恢复，以及原Web Cookie、两个Bearer、两份恢复凭证、删除回执和原幂等结算接续全部通过。旧001模式经原迁移升级到003、未版本化状态的原字段保留与无额外资源/解锁也通过。

本轮仅用全新隔离游客。人工5442库、游戏运行时、原Web源码/默认启动发布、API/规则/模型/迁移均未改；没有新资产、依赖或画面处理。PostgreSQL目标库、实际生产切换/恢复、HTTPS/容器和其他V项仍待验证，不将本轮SQLite结果扩大为目标生产库证明。

## 工具与流程

- `tools/cocos_sqlite_backup.py`：只读打开源库，用SQLite在线备份接口取得已提交数据；转成独立DELETE模式文件，检查完整性、外键、完整模式与全部表/重复行/类型。备份目录0700、文件0600，不展开个人记录到清单。恢复只写新目标，临时副本先核验，再原子建立不覆盖的链接；拒绝已有目标、损坏、错误清单、符号链接和路径逃逸，失败清理自身新文件。
- `tools/cocos-backup.mjs`及根`cocos:backup`：统一Node22/现有后端Python入口、超时/取消和所属进程收尾；支持backup、verify、restore、inspect，并返回本次退出记录的位置。
- `tools/test_cocos_sqlite_backup.py`与`test-cocos-backup.mjs`：10个真实SQLite/WAL合同测试；统一单元新增sqlite-backup模块。
- `tools/cocos_restore_fixture.py`：仅接受控制器拥有的test.db，准备31类进度，以及旧001模式/未版本化对照状态；明确为模拟演练，记录来源仍为手动/导入/计时与未核验，不冒称自然成长或真实行为核验。
- `tools/test-cocos-restore-browser.mjs`与根`cocos:test:restore`：复用现有预览启动器、持久请求协议和受管理BrowserServer。3个随机回环端口、专属Cookie和新库，三次启动/停服/恢复阶段都核对所属退出；保留源库与中间恢复库，不用旧数据覆盖文件。

根package脚本、统一单元、来源工具及生成清单为相应接线；当前384文件/107静态引用，93冻结Web输入和106绑定保持。长期命令与格式说明见[SQLite备份与恢复](../cocos-backup.md)。

## 最终证据

实际环境Node22.23.2、Python3.14.6、锁定Playwright1.64.0 / Chromium156.0.8078.4；SQLite3.53.2（runtime.json记录）。复用官方Creator3.8.8真实生产`web-release-ready-task54/web-desktop`：源872e903e5f8a922204cd87580ebf6806daf59847293a24800a8d60fc8f2d2e1b，产物7d98fcf44dd00bf4441f7c8f52eb86a27f5b96e9201e10611afa88fbeee72784，前后身份一致。原Web为task52独立比较包，前后87976774a366c2cecc87374ebcadb16ed5ebee9dadf8128e3b128ab924e84b04字节指纹一致，原frontend/dist未动。

最终`output/cocos-regression/run-g15wtf/suites/backup-restore/result.json` complete:true，7组/7PNG、零意外页面/控制台错误、0个非预期Cocos游客。覆盖：

1. 原Web原生创建/外观与凭证下载，Cocos预览、取消、确认、刷新和原生再次导出；对比完整业务状态及同save ID，不创建替代旅程。
2. 只有原Cookie、没有预先凭证文件时，查找/取消/确认仍接续原旅程。
3. 原API运行且WAL有894072字节时在线备份，完整六表指纹与源一致；保留2角色、2Bearer、2恢复键、1删除回执和21结算。已有目标恢复拒绝，实时源数据完全不变。
4. 正常停所属API/两个代理，原库及WAL/SHM移到本次私有保留目录；恢复到原路径的新文件，全模式/全部表指纹相同，再同域同Cookie名启动。原Cookie、两个Bearer、原恢复键和删除确认有效；原结算ID重放为replayed，不再发经验或改物资。
5. 真实Cocos刷新、另一空上下文用备份前Cocos凭证恢复、原Web Cookie重开均保留完整进度与运行计时器。各路径后数据库仍2角色，所有Cocos页面没有无凭证创建调用。
6. 从原001迁移生成旧模式库，主旅程保留完整进度，对照旅程采用原未版本化状态；整库恢复后原002/003迁移只加表，原players/receipts指纹不变。旧字段递归保留，新物品只补0、新点数/研修等级0、石门未额外解锁；两份原Cookie有效。
7. 旧模式升级后，完整进度与未版本化对照两份原Cookie都实际进入Cocos；核对原角色/外观/位置、20金币/零额外点数和同save ID，仍2角色。

恢复前完整模式/表指纹SHA256为`07107f6b6eb100b5a2ae63d6d63f04f62d4485e6dca7c13590fa22f8493a59e6`。数据库恢复后的API读取先逐字段/原ledger完全比较；只有正常进入世界引起的revision、时钟租约/经过量和体力更新时间在后续生命周期比较中单独允许，资源、成长、记录、计时器、关系、洞穴/石门和旅行等全部保持严格比较。

31类准备数据包括位置/行囊/储物、成熟田地与资源恢复、任务/追踪/初探、建筑/关系/日常资格、属性/三种点数/培养/生命体力、计划/书页/运行计时/历史/旧锻炼/三种现实约定状态、五层洞穴/首胜/石门与旅行。这些是隔离样本，不能替代V2自然培养、战斗平衡或实际玩家的生产迁移。

| 其他检查 | 实际结果 |
| --- | --- |
| 统一单元 | `output/cocos-backup-tests/all-unit/result.json`全部22模块通过，含10个SQLite合同测试 |
| SQLite边界 | WAL中未检查点的已提交行、中文/BLOB/空值/浮点/重复行、0600权限、已有输出/目标、字节与清单损坏、错误SQLite/外键、符号链接、取消清理、竞争目标与fsync失败均验证 |
| 保护/类型/来源 | `baseline.log`原390/精确共享/原断言及435过渡合同通过；`typecheck.log`106绑定/真实类型、384来源/107引用通过 |
| 画面 | 实际查看接续预览、恢复后的Cocos/原Web、旧模式主旅程与未版本化对照的代表图（最终轮另复核后三处）；其余操作由真实交互和数据断言覆盖，不新增玩家批准 |
| 汇总 | `output/cocos-backup-tests/verification.json`，完整源码/包、模式、表计数和验证范围 |

## 复现与失败记录

实际命令使用Node22的完整路径；省略路径写为node：

```sh
node tools/cocos-sources.mjs --write
node tools/test-cocos-restore-browser.mjs --build web-release-ready-task54/web-desktop --web-build output/cocos-regression/web-compat-current
node tools/cocos-unit.mjs --report output/cocos-backup-tests/all-unit/result.json
node clients/cocos/tools/check-baseline.mjs
COCOS_CREATOR="$PWD/output/cocos-tools/CocosCreator.app/Contents/MacOS/CocosCreator" node clients/cocos/tools/check.mjs
```

两份包须实际存在；通用入口见长期指南，不覆盖正在服务的构建。原Web比较是显式独立兼容检查，普通Cocos单元/构建/主CI不因此新增React安装或构建前提。

早期`run-lH3XU2`因测试控制器未把配置交给浏览器管理器而在启动后退出；修正测试编排后`run-uJR3sd`走通当前003链，但旧状态断言错误地拒绝新增0数量物品。原迁移本来会补默认项，现保留全部旧字段并检查新增量/点数/解锁，而当前完整存档仍逐字段严格相等。`run-srzw21`7组先通过，再补所有页面的无凭证创建监测和两次角色计数，形成run-FYuUej；再加入未版本化对照真正进入Cocos的验证，最终run-g15wtf通过。失败报告保留，未算入通过数；没有为测试改后端或删原数据。

## 收尾与剩余范围

本轮失败/成功测试及嵌套CLI、单元共56份记录/183个PID与启动时间、专属浏览器owner/profile核对无所属遗留，详见`cleanup.json`。全部三阶段API/两个代理与Chromium退出，所有工具handle终止状态已收取。仅保留原人工launcher89393/API89396/代理89397/session29885，5442/API8142及旧构建记录均200；没有读取、备份、重启或代操作该玩家库。用户已有浏览器与共享宿主保留。

本轮完成V1/V7中的本地SQLite部分。V1目标生产PostgreSQL与真实部署数据仍待相应隔离演练；V7当前生产包独立重建、容器/HTTPS/实际发布回退等仍开放。V2–V6及实际已提交CI/设备和其他玩家确认继续按task39推进，未授权退役、删除原Web、提交/推送或外部切换。Task54完整游戏22套未因纯工具扩展重复运行，实际运行时和两包字节身份仍匹配。
