# Cocos amd64 交付与回退验证（本机仿真）

2026-10-19，接续任务39 T2/V6/V7的架构缺口。本轮已完成当前J3/77709984静态包与未改规则API的linux/amd64镜像构建、隔离回环HTTPS七项及独立中断清理。宿主Docker仍aarch64，容器实际x86_64，属于本机仿真功能证据；原生amd64硬件/性能、真实CI和正式生产条件仍未验收。

短计划：核对旧资源/启动状态，预检现有amd64执行能力；固定官方基础镜像并构建独立标签；复用原交付断言验证HTTPS、同档、旧标签与回退及取消；核对源、QA数据、图像和清理，恢复Docker。

## 镜像与实际环境

没有启用或更改Rosetta、binfmt、虚拟化/系统或浏览器设置。预检直接以 `--platform linux/amd64`运行官方Python，实际输出x86_64、Python3.14.8、Debian13.7；Docker Engine29.3.1报告aarch64，故明确标仿真，不用它制定原生目标性能预算。

| 镜像 | 不可变身份与范围 |
| --- | --- |
| Python基础index | `a2b82f3c48559aa0a8446d9af49826b6e2b2016f4cd2afabfe6013ec53729170`，由原模板 `python:3.14-slim`的官方注册表解析，选择amd64分支 |
| 当前API | `f9145f39a8a1ee429c700765b52a8f64638773c8f147cfc4addda948cc7d18b3`，独立 `realquest-cocos-amd64-api:1b48f16ad3d21101` |
| 当前静态前端 | `4cd10032137dfc6884bd3a249b75577942fccfa80dd848106a0681d1e2f52be0`，独立 `realquest-cocos-amd64-web:1b48f16ad3d21101` |

API上下文只复制已有启动文件、锁定要求与app/migrations，不包含玩家DB、env、venv或缓存；将独立上下文Dockerfile的唯一FROM固定为本次官方digest，其余字节与原 `backend/Dockerfile`相同，原文件未改。镜像真实基础层逐项匹配amd64 Python基础镜像；19份实际运行Python源及28项已安装锁定版本与原仓一致。

前端直接使用已封存 `output/cocos-final-candidate/static` 的原Dockerfile及固定Nginx index892bb215…，11版本/2946站点文件与当前77709984封包相同。两份镜像均由 `--platform linux/amd64`构建并实际检查Architecture/OS；API和Nginx运行后均输出x86_64。Nginx1.31.7/Alpine3.24.2，API Python3.14.8。镜像仅本地非运行缓存，无push或默认标签覆盖。

## 原检查的复用与通过范围

沿用任务89的worker/controller，原文件与初始副本原样保留。仅适配实验路径、架构声明/断言、平台参数和显式仿真范围，新增两个镜像及两个实际machine断言。独立TypeScript AST核对worker原48、controller原33条assert调用全部按顺序保留，worker额外4条；没有放宽原超时、结果、权限或清理断言。427份输入（含404来源、当前工具/后端及实际Edge二进制/Info）执行前后SHA保持。

session1508 terminal0，两例各有全新run/nonce、QA库、两容器、网络、TLS网关和浏览器profile：

| 运行 | 实际结果 |
| --- | --- |
| `run-JzOxLG` normal | exit0/complete:true，原七项检查/4PNG/0意外错误 |
| `run-J7BokV` interrupt | 归属worker、浏览器/容器/网关ready后仅发SIGINT，预期130/cancelled:true/complete:false；中断验收通过，前五项准备检查不算第二次游戏全量通过 |

七项仍为2946文件逐份哈希、实际API源、严格Node CA校验/相对302/no-store、269资源MIME（含WebP）/gzip解压/immutable/真实404及根图标、Secure/HttpOnly/SameSite Cookie和跨源拒绝、同身份真实移动保存及740成长页、Nginx真实双版本切换/旧标签重载/同凭证回退。

浏览器是宿主Mac上独立无头Edge155.0.4283.62，实际CDP产品/版本核对；不是Linux浏览器、Safari或物理设备。一天回环证书仅被本轮Node请求CA与两专用浏览器的单张SPKI约束使用，没有系统信任导入或全局TLS关闭；不是生产公开证书/域名。

已实际查看四张：当前桌面世界、740空成长、保留旧引擎、切回当前J3；文本和必要操作可见，空列表来源真实，无新画面/手感批准。

![amd64服务的HTTPS短横屏成长页](../../output/cocos-regression/run-JzOxLG/suites/container-delivery/tls-container-life-740.png)

两份新QA库各1角色/1条create结算，金币20/种子6、XP/三种成长点0、活动和书页空，integrity/FK正常。未读取原5442或统一5443的玩家库/数据API，没有伪造现实记录或奖励。

## 清理与复现记录

worker自身关闭两专属浏览器/临时profile、4容器、2网络和2 TLS网关；控制器对容器/网络/网关/浏览器的补救清理均0。一次性架构预检及API核验容器正常自动移除，原测试/中断回执保留。TLS密钥权限0600，仅留本轮私有output，不进入静态包。

本次启动Docker前确认为停止；恢复前再次核对同一引擎/桌面启动身份、18旧容器完整状态/StartedAt/image、无其他运行负载、原卷与网络一致，随后官方stop恢复停止、Desktop进程0/API不可达。未删除旧镜像或prune；新镜像/构建缓存保留作非运行复现材料。

主要实际命令（本轮一次性output路径/回执，不盲重放旧PID）：

```sh
node output/cocos-amd64-delivery/prepare.mjs
node output/cocos-amd64-delivery/run-all.mjs
node output/cocos-amd64-delivery/verify.mjs
node tools/cocos-sources.mjs --check
git diff --check
```

`run-all`顺序执行架构预检、镜像构建、API源/依赖核验、正常与中断矩阵，并在finally恢复Docker。完整CLI、不可变镜像、427输入、TLS、图片和数据验证在 `output/cocos-amd64-delivery/{result,matrix,image-build,api-image-verification,verification,desktop-cleanup}.json`；源码复用/81条原断言与4条新增断言由 `worker-provenance.json`记录。

最终只读全局审计608份浏览器记录/1925份结束PID记录，无所属遗留、活动自动化或意外读取错误；历史精确空JSON负例原样保留。六个QA回环端口已关闭；原5442与统一5443六个进程启动身份未变、六项主页/构建/health200。共享工具/用户进程保持，见 `output/cocos-amd64-delivery/{cleanup,services}.json`。

本轮只有本任务、任务39、整体交付/生产说明及progress等文档更新；游戏/后端规则、规范测试/工具、锁、素材、迁移、原Dockerfile和原Web代码未改，未重新Creator构建或重跑不变的24模块/232后端/全27矩阵。正式CI、目标域名/证书/生产PG/角色、原生目标硬件/性能、系统/物理设备与整体玩家体验继续按任务39，整体目标未完成；没有提交、推送、公开部署、默认入口切换或原Web退役。
