# 素材来源与许可证

2026-10-20：现行规范图片在 `assets/runtime/`，原始图与提示词在 `assets/generated/`，实际Cocos绑定与当前来源见 `clients/cocos/asset-bindings.json` 和 `docs/art/asset-manifest.json`。下表早期素材保留原许可来源，不表示全部进入当前运行包。地表/室内绘制源已迁至 `tools/scene-art/`；旧React/Phaser运行代码已删除。

2026-10-09 已核对作者公开页面与源仓库。参考图仅用于风格和构图，没有导入参考游戏的素材。

| 内容 | 作者与来源 | 许可、修改与用途 |
| --- | --- | --- |
| 木屋、红瓦建筑、松树、花丛、木桶、木箱、长椅、井、舟、生活装饰 | Pixel-boy / Sparklin Labs，[Superpowers Ninja Adventure](https://github.com/sparklinlabs/superpowers-asset-packs/tree/master/ninja-adventure) | CC0-1.0，允许商用；原始 tileset 不变，客户端按帧取样，整数 2 倍显示 |
| 栎树、木屋派生素材源 | Pixel-boy，[Ninja Adventure 官方页面](https://pixel-boy.itch.io/ninja-adventure-asset-pack)，[作者仓库](https://github.com/pixel-boy/NinjaAdventure) | 官方明确 CC0、允许商用；使用 `tileset_village_abandoned.png` 的局部，不导入废墟整图 |
| 砖红小屋与青色图书馆 | 上述 CC0 村庄图块的派生作品 | 本项目裁切、遮罩并调整屋顶色板；可通过 `tools/build_ninja_runtime.py` 重建（Pillow） |
| 六种角色外观、NPC、菜单头像 | Pixel-boy / Sparklin Labs，同一 Ninja Adventure 仓库的 `14.png`、`2.png`、`1.png`，新增 `6.png`、`9.png`、`5.png` | CC0-1.0；四方向四帧，16×16 源像素、2 倍显示；只打包这六张人物表；其余角色不进入运行包 |
| 草地与地形变化、泥土路、桥梁、围栏、资源、农田、室内家具、符文、奖励粒子 | 本项目 `village.ts`、`art.ts`、`WorldScene.ts` | 原创程序绘制，统一采用像素对齐；项目整体发布许可证待所有者决定 |
| 交互、物品、奖励与轻脚步声 | 本项目 `feel.ts`，Web Audio oscillator 合成 | 原创程序音效，无外部录音/音乐；默认静音，用户手势开启，设置可关闭 |
| 历史React界面图标 | 原 `lucide-react` 软件包，旧应用已退役 | 当前Cocos运行包不依赖该包；历史归属不变 |
| 字体 | 设备系统中文字体与 serif / sans-serif | 不打包或分发字体文件 |

原始 CC0 许可和精确源提交见 `assets/runtime/ninja-adventure/LICENSE.txt`、`SOURCE.md`。技术依赖的许可证见各包 LICENSE 与锁文件，不等同于美术素材许可。

当前室内家具、矿石和作物仍使用原有可维护的像素绘制。后续可替换为同像素密度的贴图，避免混入不同透视与比例的素材。

背包小图标见 `icons/`：木材从同一 CC0 图块裁切，石料、金币、种子袋、萝卜和木板由项目原创像素绘制；重建脚本与房屋相同。菜单头像和背包图标使用 PNG，已替换旧 CSS 几何占位图。
