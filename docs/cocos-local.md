# Cocos 本地启动与存档

2026-10-20 起只有 Cocos 客户端。旧 React/Phaser 源码、旧默认启动和本地历史存档已按用户授权移除；不再运行双客户端比较。

从仓库根目录执行，Node22/npm10、Python3.14 与已准备的 `backend/.venv` 是前提。第一次准备见 [README](../README.md)。

```sh
export COCOS_CREATOR="/你的路径/CocosCreator.app/Contents/MacOS/CocosCreator"
npm run build
./start.command --check
./start.command
```

默认构建 `web-current/web-desktop`，网页5443/API8143、cookie `realquest_cocos`、库 `output/cocos-local/local-preview.db`。预检不创建文件或迁移；实际启动执行 Alembic，确认 API/代理就绪后输出地址。Ctrl+C 关闭本次服务并释放同库租约，不抢占其他端口。服务只提供已有构建，没有热更新。

本机保留的官方3.8.8签名 SDK 输入是 `output/cocos-sdk/CocosCreator.app`。如未全局安装 Creator，可创建独立工作副本再构建：

```sh
cp -cR output/cocos-sdk/CocosCreator.app output/cocos-sdk/working.app
export COCOS_CREATOR="$PWD/output/cocos-sdk/working.app/Contents/MacOS/CocosCreator"
npm run build
```

构建完成并确认 Creator 已退出后可删除 working.app；保留未执行的签名输入。其他机器使用自己的官方 Creator3.8.8，不依赖 ignored output 中的 SDK。

## 默认入口交付约定

自2026-10-24起，所有功能更新和修复都交付到 `http://127.0.0.1:5443/`，默认静态包为 `clients/cocos/web-current/web-desktop`、API8143、cookie `realquest_cocos`、库 `output/cocos-local/local-preview.db`。不能只更新另一个试玩包，再让用户更换端口或重新建档。

1. 完成实现、合并当前功能，并执行相关工程与实机检查。隔离候选、临时端口和测试库仅供内部QA。
2. 把通过校验的当前源码构建同步到默认包。保留旧包用于回退；正在服务时先准备完整新包再切换，避免覆盖到一半。源码或构建过期时真实重建，不篡改构建回执。
3. 若后端有改动，重启已核实归属的默认服务以加载新代码；保持原数据库、cookie、端口与存档凭证。只换静态包时无需为了更新而重启API或换库。
4. 校验默认包当前源码和内容哈希，再核对5443实际返回的 `realquest-build.json`，确认两者一致、API健康；在5443检查本次功能和原存档接续。已有页面需要刷新时明确告知。
5. 以上完成才交付。遇到阻塞，明确说明默认入口尚未更新及原因；不要将独立候选标为已完成。

启动校验会在打开／迁移玩家库前拒绝无回执、过期或损坏的包，提示重新构建；不会自动切换到别的端口或清空存档。

## 内部隔离QA

以下参数供开发测试隔离服务使用，用户功能交付仍统一5443：

```sh
./start.command --check --port 5448 --api-port 8148 --database output/cocos-local/another.db --cookie-name realquest_another
./start.command --port 5448 --api-port 8148 --database output/cocos-local/another.db --cookie-name realquest_another
```

浏览器 Cookie 可跨端口共享，因此多个试玩请指定不同 cookie 名称。本地偏好/凭证还受页面来源约束，换地址不会复制数据库。旅程凭证只解锁对应服务器中仍存在的存档，不是数据库备份。

```sh
npm test
npm run test:browser
npm run cocos:test:startup -- --build web-current/web-desktop
```

统一浏览器测试自行分配端口和独立QA库，不需要先手动启动服务。每次修改源码后真实重建；构建指纹不一致时不得改回执跳过检查。正常玩家记录仍由后端权威保存，当前任务删除历史存档的授权不代表将来可以自动删新记录。
