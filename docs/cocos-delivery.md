# Cocos 构建与交付

Cocos Creator3.8.8 是唯一客户端构建源。根目录 Node22/npm10 与 Python3.14 后端环境见 [README](../README.md)。

```sh
export COCOS_CREATOR="/你的路径/CocosCreator.app/Contents/MacOS/CocosCreator"
npm run build
npm run cocos:test:browser -- --build web-current/web-desktop
npm run cocos:package -- --build web-current/web-desktop --output output/cocos-delivery
npm run cocos:package -- --verify output/cocos-delivery
```

`npm run build` 同步规范源、核对来源和真实引擎类型，再创建关闭debug/sourceMaps、开启MD5的release。构建回执记录真实规范源和包字节；旧包不匹配时必须重新构建。开发包可显式运行 `npm run cocos:build`，不能冒充release。

封包包含版本化静态内容、Nginx配置、Dockerfile、固定基础镜像来源及完整SHA256清单。数据库、凭证、SDK和原始美术源包不在交付包里。`--previous` 等保留版本参数以 `tools/cocos-release.mjs` 的CLI为准；新输出不可覆盖已有包。

```sh
npm run cocos:test:delivery -- --artifact output/cocos-delivery
npm run cocos:test:delivery:lifecycle -- --artifact output/cocos-delivery
npm run cocos:test:network -- --artifact output/cocos-delivery
```

以上检查需要本机Nginx及锁定浏览器，使用隔离QA库并自行关闭服务。具体报告在 `output/`，本地回环HTTPS/容器/网络证据不等于目标生产环境验收。

本地 `docker-compose.yml` 的前端构建上下文现在是 `output/cocos-delivery`；生产Compose保留原有共享API、数据库和网络合同，前端镜像内容改为Cocos静态包。`frontend_image` 等既有部署字段是静态站点镜像角色，不再表示React应用。

`.github/workflows/ci.yml` 为唯一CI入口。普通push/PR执行来源、Cocos/共享单元、后端与部署合同测试。手动勾选 `build_candidate` 才使用预置 `[self-hosted, cocos-3.8.8]` runner真实构建并执行Cocos/交付/网络检查；还需显式勾选 `publish_images` 且在main才发布双架构Cocos/API镜像和 `realquest-release` 元数据。未勾选SDK构建时不产生可部署镜像；发布步骤依赖candidate成功，避免把源码检查当发布包。

服务器部署继续由 `.github/workflows/deploy.yml` 手动选择已验证CI run，通过原有镜像摘要与回退流程操作。本轮不提交、推送、派发CI或部署，不修改远程数据库与Docker数据卷。
