# 固定 PostgreSQL Alpine 镜像下的 J3 存档恢复

2026-10-18，接续任务80与任务39 V1/V7。本轮完成生产模板已固定镜像、模板用户名/库名下的隔离恢复合同。没有连接真实生产库、读取真实密码或执行生产compose；实际部署和生产全局角色配置仍未验证。

短计划：核对模板与旧原生PG证据的差距；按固定digest创建两个全新测试簇，使用当前不可变Linux API和当前J3；复用原七组恢复/三阶段浏览器合同；比较完整表值/模式、旧Cookie/Bearer/凭证/幂等与旧001升级；核对资源退出，保留测试数据证据并恢复Docker原停止状态。

## 实际输入与环境

`deploy/compose.prod.yaml`固定 `postgres:17-alpine@sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24`，POSTGRES_USER/DB为`realquest`。实际拉取并运行该摘要，PostgreSQL17.11、Alpine3.24.2、Linux aarch64；没有换用浮动标签、升级模板或使用系统PG。两个簇均使用新nonce命名卷/网络、仅发布127.0.0.1端口和新生成的临时密码。

两个新簇按模板初始化`realquest`登录角色及同名数据库，角色属性、所有者/UTF8/排序规则一致，错误密码均被拒绝，密码加密为SCRAM。角色是测试时预置的模板角色，未恢复或读取任意生产集群角色。`pg_dump`不包含集群角色，本轮不以数据库恢复替代生产角色配置演练。

API使用任务80已核验且未改的Linux arm64镜像 `sha256:7697a1455e27eeb9d4e0ab1c446059bc741b211679630fa6adfdb2a6ca6532c9`。三阶段API和Alembic迁移均实际在该镜像执行，未改为宿主API；宿主Python3.14.6/psycopg3.3.6只用于编排、读取断言与准备隔离夹具。应用启动遵循生产模板`REALQUEST_RUN_MIGRATIONS=false`，迁移通过独立一次性API容器显式执行。

当前J3 source `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e` / payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`，269文件；保留原Web比较包150文件/`87976774a366c2cecc87374ebcadb16ed5ebee9dadf8128e3b128ab924e84b04`。两包、当前19后端源、原001–003迁移、模板及本轮脚本前后冻结一致。没有安装/重建原Web。

## 七项合同实际通过

`output/cocos-pg-container/run-YdHvGT/result.json` complete:true，controller18222/session90340终态0。11项迁移/浏览器/pg工具操作全部0；三阶段实际Chromium156.0.8078.4、共12PNG，无意外错误、无非预期无凭证Cocos游客创建。

1. 两个独立固定Alpine镜像簇，模板角色/库名、SCRAM与主机回环端口检查通过。
2. API连接仍存在时，在源PG容器内真实`pg_dump --format=custom`；源完整指纹不变，六表均非空。
3. 停所属源API，向第二簇新空库以镜像内匹配的`pg_restore --exit-on-error --single-transaction`恢复；全部原始列文本、类型/空值/默认值/顺序、约束、索引、关系所有者/ACL、函数/触发器/序列指纹完全一致。
4. 原Cookie、两份旧Bearer、完整导出、删除确认和原结算请求重放后数据库指纹仍不变，没有重复奖励或扣物。
5. 原Web原生下载凭证，J3预览/取消/确认/刷新/再次恢复及保留Bearer重载，仍为同一save ID；原运行计时器和完整业务状态保持，未创建替代旅程。
6. 新建真实001模式库并dump/restore，再用原002/003迁移升级；原players/receipts值和列定义不变，新增三张身份表为空。
7. 无旧凭证文件的原Cookie实际进入升级后的J3，仍两名原QA角色；未版本化对照递归保留旧字段，新物品只补0、三种成长余额0、石门不额外开放。

主QA角色的31类丰富进度来自任务56既有隔离夹具，明确不是自然赚取或核验了现实行为。它包含位置/物资/箱子、任务/引导、建筑/关系、三种余额/培养、计时/历史、洞穴/石门/旅行等，恢复时全部严格比较。主样本原点数3/2/1等是准备数据；不因截图更好看而制造记录或奖励。

| 原始表 | 本轮备份行数 |
| --- | ---: |
| alembic_version | 1 |
| client_deletions | 1 |
| guest_sessions | 2 |
| players | 2 |
| receipts | 16 |
| recovery_keys | 1 |

真实custom归档14,527字节，SHA256 `7107c04195434eae9c9a8500d43a756473f0feb8ab00fe2c42cd11f6b3ef552e`；备份时实际连接数2。源/恢复完整指纹均 `a7b001cfea6f9ce08a3b13f4a5c1aa951b24f2a0254cece2b5e6e5319f7b1372`。本轮实际16条结算，不套用旧原生演练17条；正常进入世界的时钟租约/revision在后续交互比较中单独处理，库存/经验/成长/历史等仍严格相等。

## V1 要求对应

| 任务39原V1要求 | 本轮/已有直接证据 |
| --- | --- |
| 原Web Cookie→下载凭证→预览/取消/确认→刷新→再恢复 | 本轮before原生界面5PNG、after4PNG，原状态完整比较 |
| 所列位置/物品/箱子/任务/引导/建筑/关系/成长/计时/洞穴/石门/旅行 | 31类既有隔离进度、完整导出及原始六表/模式指纹 |
| 仅旧Cookie、没有凭证时仍能接续 | 本轮legacy3PNG，确认原save ID、原角色数；未自动新建替代游客 |
| 保留旧数据库/凭证/会话 | 原001升级、未版本化对照、原Cookie/双Bearer/恢复键/删除回执/幂等重放 |
| 数据库备份恢复演练 | 当前固定PG镜像在线dump/第二簇恢复；SQLite/WAL当前合同另见任务56/74，原生PG证据见任务60 |
| 当前构建/数据/环境/证据可追溯 | J3/原Web/后端/迁移/模板/脚本冻结，完整回执、独立verification及进程审计 |

V1原文明确允许“生产数据副本或确定性隔离夹具”；因此本轮与既有SQLite合同已满足该项的隔离验收要求，可关闭V1。不将真实玩家库切换、生产角色/域名/部署或玩家视觉批准并入这个结论；这些仍属于V7及其他开放门槛。

本演练使用回环HTTP双原生入口来核对旧Cookie/凭证协议；当前J3的容器回环HTTPS/Secure Cookie证据是任务80。两次运行分别报告，不伪称为同一次公开生产HTTPS＋真实生产PG部署。

## 命令、独立核验与收尾

控制器/适配层只在output复用任务60的全部七组及三阶段浏览器逻辑，原文件和回执不改，原/新SHA保存在`provenance.json`。新Docker适配层拒绝复用既有卷，API/迁移均选固定镜像；浏览器显式处理三信号并原子记录生命周期，不用虚假的SQLite文件冒充PG归属。

实际执行，均终态0：

```sh
node output/cocos-pg-container/prepare.mjs
node output/cocos-pg-container/controller.mjs
node output/cocos-pg-container/stop-desktop.mjs
node output/cocos-pg-container/verify.mjs
backend/.venv/bin/python output/cocos-pg-container/audit.py
backend/.venv/bin/python output/cocos-pg-container/manual-retained.py
node tools/cocos-sources.mjs --check
git diff --check
```

独立verification重算当前/恢复/旧模式快照哈希，核对归档PGDMP头和SHA、权限、冻结源/两包、准确七组/三浏览器/12实际PNG、模板角色与Docker收尾；complete:true。实际查看原Web凭证下载、恢复后保留Bearer的J3成长页、旧Cookie升级后J3成长页三张。今天空列表与历史夹具日期一致，没有伪造今天记录；不扩大玩家批准。

五个PG/API容器和所属网络、三浏览器、两个宿主代理、全部命令进程均退出；控制器无补救容器/网络/浏览器遗留。保留两份隔离测试数据卷 `rq-pg-fbf144ff8a7a-source-data` / `rq-pg-fbf144ff8a7a-restored-data` 以及私有归档/快照，供复查，不是运行服务或真实玩家卷；未访问`realquest_postgres_data`。

停止前确认同一Desktop会话、无运行工作负载、原18个停止容器ID集合不变，才正常停止Docker；session55334终态0。停止后后台进程为空、API不可达。保留所有既有容器/卷/镜像缓存，不prune。初始Desktop只读检查20590、准备43995、恢复90340、最终审计15039均终态，无需继续轮询。

审计覆盖561份常规浏览器记录/1541份已结束PID记录，另核对本轮4份PG回执/17个PID及3份专属浏览器记录；无匹配启动身份的存活PID、owner/profile标记或非预期读错误。数字集合有交叉，不相加当唯一PID总数。原任务73精确路径的空坏JSON原样分类保留。原5442/I3的67850/67853/67854身份未变，主页/health/构建三项200；玩家库/玩家数据API及用户浏览器未操作。

仓库仅更新任务81、任务39/60/80、README/TODO/progress、备份/本地/交付说明和复核清单的状态证据。无游戏/后端/规范套件/锁文件/素材/规则/迁移变更，不重复刚通过的27套/网络/长会话；没有提交/推送/PR/外部部署、账户设置或原Web删除。

实际CI/干净提交检出、真实生产副本/全局角色/正式域名证书/可信代理/目标架构，系统IME/读屏/原生缩放、品牌浏览器/物理横屏，以及玩家其余画面/战斗/远行确认继续开放。此前5442更新被自动审批拒绝，既有授权/视觉问题继续待原答复，不重试、绕过或重复提问。
