# Cocos SDK 来源校验与独立重建

2026-10-19，接续T2真实SDK CI准备。本轮已取得签名有效的Creator3.8.8输入副本，并用其独立工作副本完成新源码/新依赖重建：906输入不变，269产物与当前J3逐文件完全一致。没有注册运行器、生成注册token、dispatch SDK CI或更改账号/系统设置；T2及其余五项仍开放，16/22完成。

短计划：核对已提交源码、SDK/主机和运行器；处理SDK来源预检差异；从已验证输入独立重建并核对现有产物；确认所属进程退出、清理本轮缓存并记录后续SDK CI所需条件。

## 来源预检与官方资源还原

开始时分支为已通过基础CI的 `56a2804b230b2caa4b57bad66e6ea1fa267812c2`，工作树干净。主机macOS arm64，Creator Info为3.8.8，Nginx1.31.2；GitHub只读GET专用运行器仍0。

旧 `output/cocos-tools/CocosCreator.app` 的受限检查先报invalid signature；完整只读复核进一步定位为44份内置资源meta变化和3个新增缓存/兼容路径。没有将这些历史变化直接归因于某次构建，也没有重签名或跳过检查。

复用[任务34记录的原始官方地址](34-cocos-local-spike.md)，并核对[Cocos官方版本页](https://www.cocos.com/creator-download)的3.8.8：

`https://download.cocos.com/CocosCreator/v3.8.8/CocosCreator-v3.8.8-mac-121518.zip`

官方HEAD为200、Content-Length1,181,883,559、ETag `"6940b698-46721ca7"`。当时磁盘余量不足6GB，未完整下载/解压。严格使用206与精确Content-Range读取ZIP目录及所需资源；目录56,057项，SDK逻辑字节4,295,709,807。两阶段共取24,394,062字节，不冒称获得完整ZIP的SHA256。

只在新建私有目录中APFS克隆既有SDK，44份官方资源逐一匹配嵌入CodeResources的SHA256后还原；3个新增路径确认不在官方ZIP中，才从本轮克隆移除。旧SDK不作为还原写入目标。全量 `codesign --verify --deep --strict` 成功，身份为Xiamen YAJI Software、Team `NQ596S94Q5`，链至Apple Root CA，封存资源49,299项；未替换签名、改安全设置或安装全局应用。

当前有效输入由 `output/cocos-sdk-ci-preparation/pristine.json` 指向，实际位于本轮 `case-snv001rq/pristine-g94wd24o/CocosCreator.app`。这是后续SDK CI仍需的本地工具输入；应先产生独立工作副本再执行SDK，保留该副本可再次严格验签。SDK资源均在Git忽略的output，没有进入源码或游戏包。

## 真实重建

复用任务79的cold-build driver，仅改证据目录、SDK工作副本路径和范围标签，原断言与五项操作保留。每个子命令继续通过 `runOwned` 独立进程组/超时/取消/finally收尾。工作SDK执行前也严格验签成功；没有运行保留输入副本。

| 实际操作 | 结果 |
| --- | --- |
| 正常clean-source工具 | 新 `clean-source-pMNuBp`，906文件/151,003,996字节，无Git/旧依赖/Creator缓存/玩家库/原Web安装构建 |
| 独立有锁安装 | 新副本离线npm ci，5包；依赖realpath在副本node_modules，未借根依赖目录 |
| 真实SDK类型/来源 | 107绑定、404来源和真实Cocos类型通过 |
| 既有无损纹理检查 | 通过，素材未改 |
| Creator release | 实际构建约67秒、成功码36由原适配器转为0；debug/sourceMaps关闭、MD5开启 |

906份源在构建前后及缓存清理后SHA一致。新269产物/15,175,449字节的路径、大小、SHA与当前J3逐项一致：源 `bd5385feeeb97b7c01cb1d806b468ff6e35227dba84c87d9d4bb3f9380d1413e`，payload `9ed7cc7fbcfb214eaca8d7ad25f6fda58bc1d5c22b8225c041d480a5ee7c216f`。builtAt保留实际新构建时间，未改receipt获得一致性。

这补的是经过来源校验的本地SDK重建证据，仍不是GitHub SDK作业、目标设备/生产或新增全27浏览器执行。产物完全相同，原J3对应测试保留其原范围，不追加新视觉批准。

## 变化与未验证范围

第一次构建后签名观察为零已封存资源改动、仅3个新增缓存/兼容路径，和旧SDK历史44项不同。检查器最初错误地预期两者都应有44项，原失败假设保留在 `after-check-attempt1.json`，没有把它计为SDK构建失败或通过结论。

在后续复核前，工作副本的app和旧SDK路径先后已不存在，原因/删除主体未证实。没有归因于其他聊天，也没有将缺失说成本轮成功删除。于是旧SDK构建后字节和工作副本构建后binary/hash重验未完成，`local-verification.json`明确保留false。首次签名/实际构建及906/269字节回执仍在，当前保留副本再次严格验签成功；构建日志使用工作SDK路径、未出现旧SDK路径。

没有依赖目录缺失来重启已结束构建，也没有重新创建旧SDK。后续需要工作SDK时，应从已验证输入创建新副本并保留独立回执；当前 `prepare_working.py` 输出本轮独立记录，旧回执不覆盖。

## 收尾与后续

五个操作均exit0、无取消/超时；精确进程组与SDK路径检查无所属遗留。本轮只删除新源码副本的node_modules、library、temp和已经为空的工作容器，906源/269产物、日志、来源元数据及签名有效SDK输入保留。磁盘余量后续变化包含外部活动，不把总回收量归功于本轮。

主要实际命令：`remote_zip.py`、`prepare_restore.py`、`materialize.py`、`prepare_working.py`、`node output/cocos-sdk-ci-preparation/cold-build.mjs` 与 `finish_local.py`。它们均是本轮output工具材料，不替代正式仓库安装命令。完整来源、签名、原失败假设与清理在 `output/cocos-sdk-ci-preparation/`；重建原始回执在该case的 `build-proof/cold-build.json`，汇总在 `local-verification.json`。

本轮只补本任务、任务39、整体交付、本地/生产说明、TODO及progress，游戏/后端/素材/锁/迁移/规范用例未改，无新资产。文档尚未提交/推送，上一轮授权仅针对候选分支和基础CI。本地预览继续使用已验证J3/I3产物，不依赖已缺失SDK路径；没有访问玩家库或数据API。

下一步准备一次性SDK CI接入：当前main-only条件和自托管运行器仍需具体方案及单独授权，用户的基础CI授权不扩大为SDK注册/执行。整体画面/手感仍集中到最后，不发逐屏问题；原Web代码和正式入口保留。
