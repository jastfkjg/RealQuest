# Cocos 容器与回环 HTTPS 交付

2026-10-18，接续任务39 T2/V6/V7。状态：实际Linux arm64容器与回环TLS演练通过；实际CI、生产域名/证书、生产库及amd64继续开放。

实际启动本机已有Docker Desktop，Docker29.3.1/linux aarch64。没有接受许可或更改账户/系统设置。新建归属标签网络、前端/API容器与独立SQLite；端口仅显式发布127.0.0.1。原有镜像、容器、玩家库与默认Web部署未改。

发现并修复 `COPY html/` 合并基础镜像目录时留下上游 `index.html`/`50x.html`：在 `deploy/cocos/Dockerfile.template` 中于COPY前精确移除这两份默认页。不是放宽产物断言，也不删除打包来源或用户文件。游戏266产物与G2保持一致，无新素材/依赖或后端规则。

固定官方Nginx索引digest仍 `892bb215…2d33d`。实际容器Nginx1.31.7、Alpine3.24.2、aarch64；现有后端Dockerfile/锁文件实际构建为Python3.14.8，容器19个Python源与当前仓库逐字节相同。完整7个保留版本、1869份站点文件均实际逐文件SHA256核对。

最终候选 `output/cocos-quest-reading/candidate-container-clean`，active `42c619a78015b2185473aacfd3a398f7e3f3a36ce2e8330b8594d4f2601895ab`，artifactSHA256 `adf216ee150015bb1f8ac1ef9cf4969ed8438b4c5d0c0326a8b8318241c91ff2`。

`run-XDrOeF`/session99782终态0，7组/4PNG，complete:true：实际镜像与当前API、受本轮CA验证的TLS/相对入口、266资源MIME/immutable/gzip/真实404、安全HttpOnly/SameSite严格Cookie/跨源拒绝、原Cookie预览确认接续/移动保存/Life横屏、旧标签重载/两个真实引擎版本切换与切回。当前G2使用原生语义键盘，最早保留版沿用其实际Canvas控件，不声称旧版具备后来新增DOM语义。740 Life及保留版本的代表截图已实际查看；最新H2追加验证见任务68。

TLS由本轮独占本机Nginx终止，再转发至实际Alpine容器。临时一天回环证书只由该Node HTTPS agent信任，Chromium仅钉住这张证书的SPKI；不关闭全局证书验证，不导入系统信任，不代表公开可信域名/正式证书或手机。内部代理头不等于所有生产可信网关配置通过。

失败回执保留：`run-05jlG8` internal网络本机发布端口不可达；改为独立普通bridge并显式127端口后实际健康通过。配置依据[Docker网络创建](https://docs.docker.com/reference/cli/docker/network/create/)及[端口发布](https://docs.docker.com/engine/network/port-publishing/)。`run-wweLe6`严格比对发现两份基础默认页（1871/1869）；修正模板后核对通过。`run-eUxalw`前六组通过，脚本误要求最早版已有DOM控件而超时；仅为该旧版恢复实际Canvas输入，当前候选键盘要求及全部数据断言保持。

命令：

```sh
node tools/cocos-release.mjs --build web-release-boot-quest-reading-g2/web-desktop --output output/cocos-quest-reading/candidate-container-clean --previous output/cocos-boot/candidate-main-f
docker build --platform linux/arm64 -t realquest-cocos-qa-container-clean:20261018 output/cocos-quest-reading/candidate-container-clean
docker build --platform linux/arm64 -t realquest-api-qa-cocos:20261018 backend
node output/cocos-quest-reading/container-delivery.mjs
node tools/test-cocos-release.mjs
```

release既有边界夹具通过。最终专属浏览器、API/前端容器、网络及TLS网关均finally退出/移除；未关闭用户浏览器。Docker Desktop在核对无其他工作负载后正常停止，最终状态另由清理回执核验。仅本任务生成的镜像缓存与私有证据保留用于复现，不是正在运行服务。

只读GitHub API已核实仓库自托管运行器数量为0，凭据 `output/cocos-quest-reading/ci-runner-state.json`。`.github/workflows/cocos.yml`仍为本地准备文件；未提交、推送、触发CI、注册运行器或部署。实际CI必须有正式Cocos3.8.8运行器及明确外部操作授权，本轮容器和TLS不代替该项。
