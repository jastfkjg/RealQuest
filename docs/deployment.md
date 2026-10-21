# RealQuest 腾讯云部署

> 2026-10-20：旧 React/Phaser 客户端已按用户授权退役，历史本地存档和QA数据已清理。旧版保护/兼容门槛和本文历史路径不再适用于新任务。当前入口与验证见 [任务109](tasks/109-cocos-only-client.md)；共享后端、备份能力和服务器部署规则仍保留。

## 当前范围

生产目标为 `tencent-prod`，主机为 infra 的 `tencent-shanghai-01`（上海轻量服务器，`124.220.81.113`），域名 `realquest.jastcraft.com`。本次只准备代码、配置和检查，没有初始化服务器、设置 GitHub Secrets、购买或修改云资源、发布镜像或部署应用。

生产使用 PostgreSQL 17，数据卷固定为 `realquest_postgres_data`，Compose 项目名固定为 `realquest`。同一主机只运行这一份生产实例。不要把本地 `docker-compose.yml` 用作生产配置，也不要改卷名来“重新部署”。本地 SQLite 存档不会自动迁移到 PostgreSQL；若要保留本地存档，先安排独立的数据迁移和校验。

入口：Caddy → `realquest_proxy` → 前端 Nginx（`realquest-upstream:80`）→ 业务私有网络上的 FastAPI → PostgreSQL。生产三个容器均不发布宿主机端口。前端使用同源 `/api`，无须构建时写入另一套 API 域名。

## GitHub 与镜像仓库（后续配置）

RealQuest 仓库级 Variables：

| 名称 | 用途 |
| --- | --- |
| `ACR_REGISTRY` | 现有阿里云 ACR registry |
| `ACR_NAMESPACE` | 镜像 namespace |
| `ACR_FRONTEND_REPOSITORY` | 前端独立 repository，如 `realquest-frontend` |
| `ACR_BACKEND_REPOSITORY` | 后端独立 repository，如 `realquest-backend` |

两个 repository 必须不同，并事先在 ACR 建立。Secrets 使用 `ACR_USERNAME`、`ACR_PASSWORD`，权限用于 CI 推送。镜像构建包含 amd64/arm64，关闭 provenance/SBOM 并使用 Docker media types，以兼容现有 ACR Personal Edition。

创建业务 GitHub Environment `tencent-prod`，限制部署分支为 main。Variable 设置 `DEPLOY_TARGET=tencent-prod`；Secrets 设置 `SSH_HOST=124.220.81.113`、`SSH_PORT=22`、`SSH_USER=deploy`、`SSH_KEY`、经可信连接核验的 `SSH_KNOWN_HOSTS`。infra 使用它自己的 Environment `tencent-shanghai-01` 和 `GATEWAY_TARGET`，两仓库分别配置。

**Container CI and build** 在push/PR上执行Cocos来源、共享单元和后端检查。手动勾选 `build_candidate` 后，预置的 `cocos-3.8.8` runner真实构建、测试并封装Cocos；还需main上显式勾选 `publish_images` 才发布Cocos静态站点/API双架构镜像，保存 `realquest-release` artifact（90天）与Build run ID。普通源码验证不产生可部署镜像；推送代码不会部署服务器。

手动构建默认启用 `browser_acceptance`。仅执行部署时可取消该选项，跳过游戏浏览器交互、交付生命周期与网络验收；SDK真实构建、产物完整性、来源及镜像 digest 校验仍保留。候选构建摘要记录是否启用了浏览器验收，跳过时不得把该次构建报告为完整游戏验收通过。

**Deploy tested images** 仅手动触发，选择 `tencent-prod` 和成功的 Build run ID。工作流核验构建来自本仓库 `.github/workflows/ci.yml`、main、已完成且成功，校验 artifact 的 repository、revision、run ID/attempt 和两个不可变镜像，然后检出同一源提交，发布时不重新构建。PR、fork、失败构建、其他工作流或不匹配 artifact 都会被拒绝。artifact 过期时需重新运行 CI。

## 主机与环境文件（后续执行）

先按 infra 的腾讯云指南配置可信 SSH、Docker、管理/runner 访问、防火墙和域名备案/接入。更新服务器上的 infra 检出，在其根目录执行：

```bash
sudo bash host/bootstrap.sh deploy realquest tencent-shanghai-01 prod
```

初始化应生成 `/opt/gateway/deployment-target=tencent-shanghai-01` 和 `/opt/realquest/deployment-target=tencent-prod`。业务发布会同时检查两个标记。脚本的通用 `data` 目录不用于 PostgreSQL；数据库继续使用生产 Compose 的固定命名卷。

以 `deploy` 在 RealQuest 检出根目录执行：

```bash
cp deploy/app.env.example /opt/realquest/app.env
chmod 600 /opt/realquest/app.env
openssl rand -hex 32
```

把生成的随机值写入 `POSTGRES_PASSWORD`；生产校验要求32–128位字母数字，推荐64位随机十六进制，以免直接拼接数据库 URL 时出现特殊字符编码问题。保留 `COOKIE_SECURE=true`、`REALQUEST_DOMAIN=realquest.jastcraft.com`、`ALLOWED_ORIGINS=https://realquest.jastcraft.com`。文件必须由部署账号所有，不放镜像引用；镜像来自所选 CI artifact。不要把生产密码、env 文件或备份提交到 Git。

部署账号使用只读镜像拉取凭据登录 ACR。给 infra 的 `/opt/gateway/gateway.env` 配置真实域名、邮箱、Caddy digest 和独立证书卷；确认 `REALQUEST_DOMAIN=realquest.jastcraft.com`、DNS 指向新主机、80/443 和备案条件就绪，再手动发布 infra 网关。网关创建 `realquest_proxy`；业务发布发现网络不存在时会停止。

PostgreSQL 镜像固定到已核验的17系列多架构 digest。数据库升级另行安排并更新相应校验/测试，不在普通应用发布中跟随可变 tag 升级。已有数据库的密码变更需要协调数据库角色和应用连接配置；仅改 env 不会重置已有卷中的数据库密码。

## 发布与失败处理

1. 在main手动选择SDK构建和镜像发布，两者全部验证通过并产生 `realquest-release` 后，取得对应Build run ID。
2. 首次先完成 infra **Deploy gateway**；随后 RealQuest **Deploy tested images** 选择 `tencent-prod` 和该编号。
3. 服务器校验主机标记、env 权限、HTTPS 来源、不可变镜像、网络/卷和端口，再取得 `/opt/realquest/deploy.lock`。
4. 拉取镜像。已有数据库时，先用 `pg_dump --format=custom` 生成权限600的一致快照，并用 `pg_restore --list` 验证；成功路径写入候选 release 的 `predeploy-backup`。备份失败不会停止旧应用。
5. 在短维护窗口停止前后端，显式执行 `alembic upgrade head`，再启动健康的前后端。生产后端启动不再隐式迁移；本地 Compose 保留原自动迁移行为。
6. 通过 `curl --resolve realquest.jastcraft.com:443:127.0.0.1` 验证本机 Caddy 的真实证书和 `/api/health`，防止 DNS 指向旧主机导致误验。成功后才更新 `/opt/realquest/current` 与 `previous`。

拉取、配置或备份失败时保留旧应用。已停止的生产数据库会先启动并备份；已有成功 release 却丢失数据库卷时，发布会拒绝创建空库。应用启动/HTTPS检查失败且数据库 revision 未变时恢复旧镜像。迁移失败、数据库 revision 已变或无法确认时保持应用停止，保留数据库、备份和旧 release，不自动 downgrade、覆盖数据库或运行 `down -v`；按 `predeploy-backup` 和迁移内容评估恢复方案。首次应用失败也保留新建的数据库卷，并用 `database-managed` 标记允许下一次发布先备份后重试。已有非此发布通道管理的 RealQuest 数据库会要求先明确纳管。

手动操作和备份也须取得同一 deploy.lock。恢复前先停止应用，将备份恢复到独立数据库验证数据与迁移版本，再决定切换/回退，避免覆盖运行中的数据库或丢失发布后的写入。

## 定时备份与验收

infra 已提供 `host/backup-realquest.env.example` 和 `jastcraft-backup@realquest.timer`。后续安装 operations、配置 `/etc/jastcraft/backup-realquest.env`、私有 COS 桶、实际 prefix/endpoint 和 root 环境 COSCLI 凭据；先运行 `jastcraft-backup@realquest.service` 并验证上传、恢复，再启用 timer。定时任务和发布共用应用锁，上传失败不清理本地历史备份。对象存储版本控制和生命周期单独设置。

验收包括 HTTPS、创建角色、游戏存档、现实记录、旅程凭证恢复、应用重启后的持久化，以及备份恢复。旅程凭证只是存档访问钥匙，不替代数据库备份。真实公网验收和 SQLite → PostgreSQL 数据迁移尚未执行。

## 本地与 CI 检查

```bash
# backend/，使用 Python 3.14 环境
.venv/bin/python -m pytest -q
# 仓库根目录，Node22，配置官方Creator3.8.8的COCOS_CREATOR
npm run build
npm run cocos:package -- --build web-current/web-desktop --output output/cocos-delivery
# 仓库根目录
python3 -m unittest discover -s tests/deployment
for script in deploy/*.sh; do bash -n "$script"; done
bash deploy/smoke.sh
```

smoke 使用随机独立项目、网络、卷和临时测试存档，验证生产镜像的 PostgreSQL 迁移、Nginx/API、安全 Cookie、跨来源拒绝、重启存档、凭证恢复和 pg_dump/pg_restore。无宿主机端口，退出时删除本次测试容器、网络、卷和镜像；不使用正式数据或服务。生产发布失败边界与 artifact 来源校验由确定性 stub 测试覆盖，不建立 SSH。
