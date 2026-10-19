# SQLite 备份与新路径恢复

[任务81](tasks/81-cocos-pinned-postgres-restore.md)已补生产模板固定PostgreSQL17 Alpine镜像、realquest模板角色/库名与当前Linux API/J3的隔离恢复：七组/12PNG，完整六表/模式、原Web凭证/双Bearer/旧Cookie/001升级及幂等通过。V1按清单允许的夹具范围关闭；真实生产数据/全局角色/部署切换仍另验收。此处SQLite CLI继续不接受PG URL，本轮output实验不是正式PG备份CLI；两份QA数据卷/私有归档保留，测试服务均退出。

这是整库运维工具，包含旅程、会话、恢复凭证的哈希和结算记录。玩家在游戏内下载的`realquest-recovery`凭证仍用于连接同一服务器上的旅程；它不能单独重建丢失的服务器数据库。当前验证及限制见[任务56](tasks/56-cocos-save-backup-restore.md)。

2026-10-18另完成[任务60 PostgreSQL17原生恢复演练](tasks/60-cocos-postgres-restore.md)：两个独立私有17.11集群之间，真实custom格式pg_dump/pg_restore、完整六表与模式定义指纹、原Web/Cocos/旧001升级及凭证/幂等接续7组通过。此处SQLite CLI不接受PostgreSQL URL；正式PG操作仍使用相匹配的PostgreSQL备份工具，并配置恢复所需角色。`pg_dump`只备份所选数据库，不包括集群角色；本轮目标集群角色显式预置，没有声称恢复任意生产角色配置。[官方范围说明](https://www.postgresql.org/docs/17/app-pgdump.html)

本机17.11/macOS结果不替代生产钉住的Alpine镜像/生产副本/部署与真实切换验证。实验脚本和私有归档在本机output内，未发布成新的正式CLI或CI入口。

工具使用现有根Node22与`backend/.venv/bin/python`，没有新依赖，不要求安装原Web应用。

## 创建与核验

在仓库根目录，用自己的实际库和全新的私有输出目录替换示例路径：

```sh
nvm use
npm run cocos:backup -- inspect --database output/my-journey/local.db
npm run cocos:backup -- backup --database output/my-journey/local.db --output output/private-backup-20261017
npm run cocos:backup -- verify --backup output/private-backup-20261017
```

源库以只读URI打开；在线备份通过`sqlite3.Connection.backup()`读取一致的已提交数据，支持其他连接仍在使用数据库。备份产物转为不依赖WAL/SHM的单文件数据库，并检查完整性、外键、完整模式和全部表的行指纹。依据[Python3.14官方接口](https://docs.python.org/3.14/library/sqlite3.html#sqlite3.Connection.backup)与[SQLite在线备份说明](https://sqlite.org/backup.html)。不要用单独复制主`.db`文件替代在线备份；WAL模式的已提交内容可能还在WAL中。[SQLite WAL说明](https://sqlite.org/wal.html)

新目录只包含`database.sqlite`与`manifest.json`，目录权限0700、文件0600；清单只保存表/模式指纹与数量，不展开角色或活动内容。将整库备份放在非公开目录，不放进客户端构建、素材或站点目录。现有备份输出、软链接及不完整/损坏产物会被拒绝；不会覆盖旧备份。

`--timeout-seconds`可为backup指定1–300秒，默认60秒。取消或失败会清理本次分配的备份目录，保留源库。命令和所属子进程退出记录写入`output/cocos-backup/operation-*/`；标准输出的`receipt`指出本次记录位置，不含明文凭证。

## 恢复到新文件

```sh
npm run cocos:backup -- restore --backup output/private-backup-20261017 --destination output/restored-journey.db
npm run cocos:backup -- inspect --database output/restored-journey.db
```

目标必须不存在，父目录必须已存在且没有符号链接。工具先核验备份，再复制到同目录的私有临时文件，比较文件及全库指纹，最后原子建立新目标；如果另一个进程已创建目标，会拒绝激活并保留对方的文件。恢复不覆盖现有库、不启动服务、不自动迁移，不修改Cookie/localStorage。

应先保留当前源库，在独立环境检查恢复副本；指定它启动时，原`start-cocos.command`仍按既有Alembic迁移前进到当前模式，不执行downgrade。可先执行只读预检：

```sh
./start-cocos.command --check --build web-local/web-desktop --database output/restored-journey.db --port 5448 --api-port 8148 --cookie-name realquest_restore_review
```

`web-local/web-desktop`须是按[本地构建说明](cocos-local.md)生成的当前包。不同源/独立Cookie名的副本可通过原旅程凭证接续；同域原Cookie延续则需要相同Cookie名称，并在切换前停止所属旧API，避免同时写入两个分支。真实服务切换和实际玩家库恢复仍需独立审核及授权；本工具只生成新的可审核文件。

## 可重复的隔离演练

```sh
npm run cocos:test:restore -- --build web-release-network-i3/web-desktop --web-build output/cocos-regression/web-compat-current
```

两份构建必须实际存在；通用复现时换成自己独立构建的当前Cocos包与原Web比较包。演练创建新测试库、随机端口和专属Cookie，完成原Web原生导出、Cocos预览/取消/确认/刷新、无凭证Cookie接续、在线WAL整库备份及同源恢复、删除回执/原结算重试，再覆盖旧001模式和未版本化状态的正常前向升级。确定性进度只属于演练游客，不代表自然成长或实际玩家迁移。

报告/截图放在新的`output/cocos-regression/run-*/suites/backup-restore/`；原测试源库也保留。浏览器、API和两个静态代理在finally结束并验证退出，人工5442不参与此命令。实际本轮结果、失败记录和未验证范围见[任务56](tasks/56-cocos-save-backup-restore.md)。

当前I3已补做完整七组接续和取消生命周期，见[任务74](tasks/74-cocos-restore-lifecycle.md)。可选运行 `npm run cocos:test:restore:lifecycle -- --build web-release-network-i3/web-desktop --web-build output/cocos-regression/web-compat-current`，覆盖正常、三信号、启动取消、当前库恢复/旧模式升级后取消及API退出，并只读检查所有保留QA库。取消结果明确complete:false，宿主/浏览器/两个代理全部退出；检查程序自身也可取消。该入口要求显式已有Web比较包，不加入普通Cocos候选CI或日常构建前提，不接受真实玩家库路径。
