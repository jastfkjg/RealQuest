# Cocos 当前交付

2026-10-20：Cocos 为唯一客户端。默认 `npm run build` → `./start.command`，网页5443/API8143。React/Phaser 客户端已删除；旧5442/I3、5443/J3等包及历史玩家存档已按授权清理。

- [启动与测试](../README.md)
- [本地配置和数据库规则](cocos-local.md)
- [静态封包与发布](cocos-delivery.md)
- [本轮迁移、清理与实际验证](tasks/109-cocos-only-client.md)

当前以重新构建的 `clients/cocos/web-current/web-desktop` 为准。基础CI、真实Creator构建、浏览器交互和目标生产发布分别报告；不能用旧任务的通过数代替当前执行，也不再以旧客户端兼容作为验收条件。
