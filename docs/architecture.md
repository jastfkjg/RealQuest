# 架构

## 日夜与睡眠（2026-10-16）

`backend/app/daynight.py` 维护唯一的世界时钟与跨夜结算；村民作息从同一时钟读数。`world_clock.version=2` 增补06:00起点、游戏日与最近一次跨夜结果，沿用累计有效秒数和有主视图标识的10秒租期。每3秒确认一次活跃时间；过期租期的未确认尾段直接丢弃，不在重连时补算离线昏倒。新视图接管也不结算旧视图尾段，旧视图不能暂停新的视图。阅读、Life Mode、后台、离页和断联停止世界推进，现实委托／专注计时保持原语义。

01:00截止和正常睡眠都在已有玩家锁及回执事务内结算下一游戏日、生命／体力、返家位置和`last_night`。睡眠带`expected_day`防止不同请求重复跳日；`world_day`拦截跨日后才到达的旧移动／资源操作。`GET /api/state`只做投影，不在未确认的读取中扣血或发恢复。旧存档时钟初始化的`POST /api/session`与游戏命令共用SQLite写锁／PostgreSQL行锁，防止初始化覆盖并发库存变化。

存档无需新增SQL表或清空数据：无时钟存档补默认值，旧村民时钟保留已提交的可玩时间，旧凌晨01:00–06:00调整为06:00而不追罚；持久化后迁移幂等。自然体力恢复、作物／资源、委托到期和现实日额度仍使用原服务端Unix时间戳；游戏睡眠只移动世界时钟，昏倒不获得积攒的睡眠恢复。

前端在现有`WorldClockLifecycle`中处理续期／暂停，通过同一命令队列与身份校验同步状态。床边面板、夜间提醒和今晨状态使用原DOM／Hearthwood样式。跨夜后清除路径、导航、按键和旧面板，将同场景角色也同步到安全床边；场景变化仍沿用现有Phaser切换。文字状态导出同时提供权威位置、实际场景和显示时间，避免将过渡动画误判成状态丢失。验证与限制见[任务26](tasks/26-day-night-sleep.md)。

## 模块

- `frontend/src/App.tsx`：角色创建、状态栏、任务提示、活动录入、计时、背包与建筑面板。
- `frontend/src/game/`：Phaser 场景、程序像素素材、碰撞、移动、对象交互；React 负责场景容器的创建与销毁。
- `frontend/src/stores/game.ts`：Zustand 服务端状态快照、面板状态、请求反馈及服务端时差。资产不在客户端结算。
- `frontend/src/services/api.ts`：同源请求、串行操作队列、每操作 UUID、网络异常时同一键重试。
- `backend/app/main.py`：游客凭证、请求校验、事务、幂等回执、导出、删除。
- `backend/app/rules.py`：确定性游戏规则；没有 LLM 依赖。
- `backend/app/quests.py`：固定剧情委托定义、进度判定、解锁及派生状态。
- `backend/app/world.py`：统一地图尺寸、碰撞几何与交互对象。通过 session API 提供给客户端。
- `backend/app/models.py`：Player、Receipt、RecoveryKey、GuestSession；Alembic 001 / 002。

## 数据模型

`Player` 保存 UUID、随机会话凭证的 SHA-256 哈希和 JSON 状态。JSON 包含角色、位置、背包、经验、五种属性、成长资源、建筑等级、农田时间戳、资源恢复时间、NPC 关系、事件、当前场景、剧情任务/追踪、累计生产统计、储物箱、存档版本、现实记录、每日上限和学习计时。

`Receipt` 保存玩家外键、请求 UUID、请求指纹、动作、经验和库存增减、状态版本与服务端时间。`(player_id, request_id)` 唯一，支持追踪与幂等。状态变更和回执在同一个事务提交。

剧情 Quest 状态已保存在 JSON 聚合中；快照中的 `quest_log` 由固定定义、累计统计和事件派生。学习任务以 `study_tasks` 存在同一事务聚合中，`study_task_log` 从任务及带 `study_task_id` 的活动派生分钟数和实际已得经验。学习计时带稳定 ID 和可选任务 ID；完成计时、生成活动、结算经验和标记任务完成在同一事务中发生。`study_link` 仅关联同日未归属其他任务的学习记录，不重复发放活动经验；旧手札完成不再发成长点数，点数由下文现实委托统一结算。旧记录补上稳定 `legacy-{index}` 标识，旧计时补上 `legacy-timer`；无 SQL 结构变化或存档清空。

尚无独立 Goal / 阶段任务 / AI Suggestion 表。JSON 聚合用于缩小第一版复杂度，长历史分页和后续结构演进列入 TODO。`study_plans` 保存稳定计划 ID、名称、默认时长与归档时间；任务增加可空 `plan_id` / `archived_at`。`study_plan_today` 用计划 UUID 与服务端上海自然日生成稳定 UUID，同一计划/日期的并发和重试只得到一页。新的书页沿用最近主题，使用当前计划默认时长；旧进度不搬移。未完成且未计时的任务可以修改；归档可逆，归档不发奖；计划本身不另发奖励，每日书页保留进度但不再发知识点。书架/历史在客户端每页六项，完整历史仍存在 JSON 中，服务端分页尚未实现。

## 操作数据流

浏览器意图 → API 身份识别 → 锁定玩家 → 检查幂等键与内容指纹 → 规则校验 → 扣除或发放资源 → 保存状态与回执 → 返回新版本快照 → React / Phaser 更新。

PostgreSQL 使用行锁，SQLite 使用 `BEGIN IMMEDIATE` 串行写入。客户端按 revision 忽略旧快照，操作队列避免同一页面相互覆盖。客户端仅发送行为和目标，不发送应得资产。

移动每约 120ms 保存变化，服务端检查边界、碰撞直线路径及单次距离；交互校验与已保存位置的距离。当前没有基于服务端时间的速度控制，不能声称完成防作弊。

## 时间与来源

农田、采集恢复与学习计时使用服务端 Unix 时间戳。暂停计时累计 elapsed，继续计时重新写 started_at；计时展示用服务器时间锚点加 `performance.now()` 增量，避免本机时钟调整改变时长；回到前台、pageshow、focus、online 和可见页面每 15 秒重新拉取权威状态。冻结/锁屏不暂停服务器计时，只有明确暂停才停止，结算仍使用服务器时间。现实奖励自然日按 Asia/Shanghai 计算，手动记录可补最近七天。

手动输入记为 `manual`，计时完成记为 `timer`，两者均不标为已验证。客户端提交的 source / verified 字段不会改变规则生成的来源。没有导入、模拟或健康数据自动获取入口。

## 身份与数据

服务端生成 256-bit 随机游客凭证，仅保存哈希。浏览器使用 HttpOnly、SameSite=Strict Cookie；部署 HTTPS 时启用 Secure。存档不接受客户端指定玩家 ID。写请求检查 Origin / Sec-Fetch-Site，前端与 API 通过开发代理或 Nginx 同源。

可导出存档及回执供查看。`POST /recovery-file` 生成 256-bit 随机旅程凭证，数据库仅存哈希；`POST /recovery-preview` 返回对应存档的真实摘要，`POST /recover` 新建同一玩家的 HttpOnly 会话，不导入或修改文件中的角色、资源、奖励和计时。原会话继续有效。切换前 UI 要求先下载并确认保存当前旅程凭证，原存档保留。删除游客时一并删除回执、恢复凭证与附加会话。

Alembic 002 只增加 RecoveryKey / GuestSession 表与外键索引，不重写玩家 JSON 或回执；已验证从有数据的 001 迁移及重复运行。普通导出 JSON 不可恢复；旅程凭证依赖原服务器数据库，数据库灾备和账号绑定另行实现。API 快照带 `save_id`，新客户端提交操作时带预期 ID；Cookie 在另一个标签页切换后，陈旧操作被拒绝，读到另一存档时整页重载，防止混合不同存档的 revision。旧客户端的无 ID 请求仍兼容。公开部署所需限流、备份、记录纠错等见 TODO。

## AI 后续边界

计划的 Director 仅生成文案与结构化建议，批准后的任务和事件必须经过规则层。当前前端清楚显示 AI 未开放，NPC 内容为预设剧情，无模型调用或伪装的 AI 响应。

## 场景与旧存档

`world.py` 同时提供户外与四个室内的障碍和对象；所有交互都从当前场景查找目标，不能在室内操作户外对象。进出建筑由服务端切换 `location` 与出生点，刷新可恢复室内状态。客户端场景随快照重建。

`upgrade_state` 以幂等方式将旧 JSON 存档升级为版本 2，保留库存/经验/活动等数据，补齐任务、仓储和统计；旧位置若落入新障碍，迁回安全出生点。读取时派生兼容状态，下一次写入时持久化；无需改变 SQL 表结构。

## Health and stamina slice (2026-10-14)

Additive JSON defaults preserve the current save version, inventory, five attribute histories, exploration energy, knowledge shards and unlocks. New fields are `exercise_tasks`, `health_points`, `health_invested` and `stamina` (current/max/server timestamp); no SQL schema migration is required. `/api/state` projects natural recovery on a copy, while gather/invest/rest settle against the stored state inside the existing player transaction. The projection preserves partial intervals; full capacity never banks additional recovery for later spending. `stamina_rules` is a presentation view of authoritative costs and recovery timing.

The daily task ID is derived from the server's Asia/Shanghai date, so different requests cannot create multiple reward-bearing pledges for one day. Linked exercise record IDs and the task's completion marker prevent duplicate health awards. `exercise_record` accepts a stable record UUID and detects conflicting reuse, supplementing request receipts across uncertain responses. `health_spend` checks an expected investment count before subtracting a point and raising capacity/current stamina. Receipts include point and capacity deltas. Existing activity XP is awarded only by activity creation, not linking or pledge completion. Imported/client balances never become authority.

The React field journal uses the same store and command queue; no second Phaser instance, gameplay clock or exercise-verification mechanism is introduced. Existing server-clock anchoring drives the HUD and text-state projection. The page's `#training` entry restores on reload, clears on return/bed marking, owns keyboard input and restores focus to its opener or the Life Mode entry.

## Knowledge growth slice (2026-10-14)

Additive save fields `knowledge_points`, `knowledge_growth` (science/magic), and per-study-task `knowledge_reward` preserve the existing SQL schema and legacy XP/shards. The existing `complete_study_task` helper awards one point only on the unfinished → completed transition, covering bound timer finish, record linking and target edits. Legacy completed tasks default to zero awarded points and never replay that transition. Task reward flags remain as provenance after points are spent.

`knowledge_spend` validates a science/magic choice, a positive balance and the expected total of both levels inside the existing locked transaction; it subtracts one point and raises one level. The shared total guards cross-branch races even while points remain. Request receipts retain point and level deltas; transport replay returns current state without another debit. Old XP reward limits and rune conditions remain unchanged.

`KnowledgeStudy` is a chapter of the existing `StudyPage`, not a separate world or timer. Chapter preference and `#study` restore after reload; a transient character-entry hint opens the growth chapter directly. UI selection is local and free, spending waits for server confirmation, and uncertain responses refresh authoritative state. The game-text hook includes actual knowledge balance and both levels.


## NPC reality commissions (2026-10-14, supersedes prior note-completion point rewards)

`life_tasks` and `skill_points` are additive JSON fields. Snapshot `life_journal` derives current Shanghai-day claimed/reserved/remaining quota and task history from stored commissions, independently of spendable balances. `life_accept`, `life_claim`, and `life_cancel` run under the existing player transaction/receipt lock. Acceptance and claim require Noah proximity; timestamps, quota, status and reward are server-owned. A stable task UUID prevents uncertain acceptance retries creating another commission. Terminal status guards duplicate claims/cancels, including requests with different receipt IDs. Active hours reserve quota, claimed hours permanently consume the acceptance day's quota, cancellation releases reservations. One active commission globally prevents overlapping timers.

Legacy study/exercise completion helpers retain progress and provenance without granting knowledge/health points. Existing earned point balances, levels and XP are preserved. Receipts now include skill-point deltas. No SQL migration is needed. The journal renders ten closed tasks at a time; all records still live in the JSON aggregate. Tests use isolated databases with explicit maturity fixtures, never a production clock-override endpoint.

## Character point allocation — 2026-10-14

Additive `vitality` (current/max) and `skill_growth` (planting/ranching/building) live in the JSON save; no SQL schema migration. `character_growth_options` is a snapshot-only server quote containing currency, current/next value, exact cost and expected investment count. Health spending accepts an optional vitality/stamina target (defaults to stamina for existing callers); skills spend target-level points. Transaction locks, expected investment counts and existing idempotent receipts guard concurrency/retries. Receipt deltas include vitality capacity and skill levels. No XP conversion, new reward source or skill effect is introduced. See task 14 for evidence.
