# SQLite 备份与新路径恢复

Cocos与共享后端继续使用现有整库备份工具。2026-10-20清理任务已按授权删除历史本地玩家档和QA备份；工具能力保留，用于之后新产生的数据。旧双客户端恢复专项已退役，不再需要React/Phaser包。

以下命令从仓库根目录运行，使用根Node22和 `backend/.venv/bin/python`：

```sh
npm run cocos:backup -- inspect --database output/cocos-local/local-preview.db
npm run cocos:backup -- backup --database output/cocos-local/local-preview.db --output output/private-backup
npm run cocos:backup -- verify --backup output/private-backup
npm run cocos:backup -- restore --backup output/private-backup --destination output/restored-journey.db
```

源库必须存在；备份目录和恢复目标必须是新路径。工具检查完整性、外键、全库表/模式指纹和备份哈希，拒绝覆盖已有产物。恢复生成新文件，不启动服务或自动迁移。SQLite CLI不接受PostgreSQL URL；正式PG操作继续使用部署环境对应的备份工具与数据库权限。

只读预检恢复副本：

```sh
./start.command --check --database output/restored-journey.db --port 5448 --api-port 8148 --cookie-name realquest_restore
```

实际启动执行当前Alembic前向迁移。不同库/独立Cookie名的副本请先核对旅程身份，凭证只连接对应服务器中仍存在的旅程，不能替代整库备份。备份包含会话/凭证哈希和记录，应保存在非公开目录，不能放进静态包或素材目录。

隔离数据管理与恢复交互可运行Cocos `data` 套件；SQLite/WAL、损坏产物、幂等恢复和取消清理由 `sqlite-backup` 单元模块验证：

```sh
npm run cocos:test:unit -- --only sqlite-backup
npm run cocos:test:browser -- --build web-current/web-desktop --suite data
```

报告见 `output/cocos-backup/`、`output/cocos-unit/` 和统一浏览器run目录。生产恢复、迁移或删除另按具体任务执行；本轮没有触及远程数据库或Docker数据卷。当前启动与清理记录见[任务109](tasks/109-cocos-only-client.md)。
