# Cocos PostgreSQL 17 存档恢复演练

后续更新：[任务81](81-cocos-pinned-postgres-restore.md)已补当前J3、固定生产模板Alpine镜像和模板角色/库名的隔离恢复；V1按原允许的夹具范围关闭。本文中这些待办是本任务结束时的历史范围，真实生产/全局角色及其他开放门槛不变。

2026-10-18，接续任务39 V1/V7。状态：本机PostgreSQL17隔离恢复链通过；生产Alpine镜像、实际部署和切换仍待相应验证。

短计划：从[官方17.11源码目录](https://www.postgresql.org/ftp/source/v17.11/)下载并逐字节核对官方SHA256，编译到任务私有output前缀；不替换系统PostgreSQL、不启动Docker或接受其设置。复用已安装编译器/库及项目锁定的psycopg。随后启动独占私有数据库集群和独立API/代理，运行原迁移，通过原Web/Cocos产生隔离角色、凭证与结算；真实pg_dump/pg_restore恢复到新库，核对完整表/模式/幂等回执，再执行两客户端接续。

[官方pg_dump文档](https://www.postgresql.org/docs/17/app-pgdump.html)说明custom格式与在线一致备份；[pg_restore文档](https://www.postgresql.org/docs/17/app-pgrestore.html)定义恢复选项。演练仅恢复自己生成的测试归档，保留源库；停止所属API后在空新库恢复，不对现有玩家库执行覆盖、清空或重置。

生产配置仍钉住现有PostgreSQL17 Alpine镜像摘要；本机17.11/macOS arm64演练验证17主版本上的应用合同，不等于该镜像、Linux容器、真实部署或生产切换。SQLite工具不冒充PostgreSQL备份工具。V1/V7整体继续开放，成功后再按证据收窄剩余项。

下载、构建、配置和所有子进程记录位于 `output/cocos-postgres/`。构建和后续数据库/浏览器都使用独立归属及finally清理；正在进行的task59真实等待与5442试玩保留。无新游戏UI、素材、经济规则、迁移或原Web默认入口变更。

## 实际结果

环境为macOS arm64、Node22.23.2、Python3.14.6/psycopg3.3.6、Playwright1.64.0/Chromium156.0.8078.4。官方17.11压缩包21,787,224字节，SHA256 `dd27f2b3c59e73ed14aa3324901242bf69a032a6347805f274e6260322d42979`与官方 `.sha256`一致。已有Apple clang17/Make3.81/ICU78.3/OpenSSL3.6.5/zlib用于私有编译；configure、make -j4、make install及postgres/pg_dump/pg_restore/initdb/pg_ctl五项版本检查均0。显式安装到 `output/cocos-postgres/install-17.11`，没有系统安装变更。

最终 `output/cocos-postgres/run-bukx0l9j/result.json` complete:true，7组/12份实际界面PNG，无意外浏览器错误、无替代游客；exec10937终态0。两个不同数据目录、端口的真实17.11集群均仅监听回环并使用SCRAM。原001–003迁移未修改。

- 新PG源库先由原API创建主角色和对照角色，再仅给主QA角色复制task56原有隔离丰富进度。该31类进度是合成夹具，不能充当自然成长或玩家实际学习证明。Cookie、两份Bearer、恢复凭证、手动记录回执及删除确认均由真实API/原生界面产生，原试玩库未访问。
- 原Web原生凭证导出→Cocos预览/取消/确认→刷新→第二份Bearer，保留同一save ID；源库六表全部非空：角色2、结算17、Bearer2、凭证1、删除回执1、迁移1。
- API连接仍存在时执行真实custom格式pg_dump，源库前后不变；14,532字节归档SHA256 `bf42bc56c57c155e5d80b4b496588178ec6abb22e0b0e0b0c71632070e3bd920`。停所属API后，向第二集群的空新库以 `--exit-on-error --single-transaction`恢复。
- 恢复前后六表全部原始列文本、类型/空值/默认值、列顺序、约束、索引、关系所有者/权限、函数、触发器和序列记录完全一致，指纹均 `426a90381573948c95e8752206008acc60a5c2bd4a98136c5e801b5d318489fc`。当前应用无额外用户函数/触发器/序列；没有以行数相同代替完整值核对。
- 原Cookie/两个旧Bearer完整导出一致，原结算同请求重放与删除确认重放后全库指纹仍不变。真实原Web/Cocos旧凭证再次预览/取消/确认、保留Bearer重载、运行计时接续通过。
- 另建真实001模式源库并dump/restore到第二个空新库，通过原002/003升级。玩家/结算记录原值不变，后增三表为空；原Cookie在实际Cocos内取回原旅程，无旧凭证也能接续。未版本化对照角色全部旧字段保留、新物品与成长点为0、石门关闭，最终仍2个角色。

三轮浏览器均正常退出0；两个数据库服务退出0，三阶段API及两个代理均退出。清理核对7份报告/30个PID及启动时间与专属浏览器/数据库标记，无所属遗留；task59真实等待和5442原试玩健康保留。`cleanup.json`同时核对882冻结源输入未改。实际查看恢复凭证预览、恢复后Cocos与旧001接续画面；今天书页为空与夹具记录在历史日期一致，不伪造今天记录。

首次 `run-dp1662zd` 的原迁移已通过，但启动检查把API未就绪时的代理HTML502当JSON解析而失败；该次所属进程均退出，原报告/log保留。随后只修改启动等待对临时非JSON响应的处理，新建独立集群重跑后全部通过；不以首次结果计通过。

本轮实验控制器为 `output/cocos-postgres/{build,rehearse,browser}.mjs` 与Python辅助，命令：

```sh
node output/cocos-postgres/build.mjs
node output/cocos-postgres/rehearse.mjs
backend/.venv/bin/python -B output/cocos-postgres/audit.py
node tools/cocos-sources.mjs --check
node clients/cocos/tools/check-baseline.mjs
git diff --check
```

下载/构建是一次性实验，已有下载时脚本拒绝覆盖；不能无检查重复第一条。全部通过后者384来源/106绑定及390＋435保护；应用运行时/后端/规则/迁移无改动，没有为此重复原完整22套或232项后端测试。这些本机output脚本与证据不是已提交CI入口或正式生产备份CLI。实际生产库副本/角色配置、精确Alpine镜像、Linux/容器/HTTPS、生产备份保管及真实切换仍需验证；原Web保留。
