# 杭州发布与存储

业务主机 `116.62.146.226`。`paperbanana-hk` 仅是既有 Compose 项目名，不能据此去香港发布。此目录提供当前可用的 SSH 人工发布入口；不依赖服务器 Git checkout，不上传 SSH 私钥，不恢复已停用的香港 GitHub Actions。

## 发布

1. 在独立工作树完成测试和构建，把候选镜像预先载入杭州。镜像引用必须是本机不可变 `sha256:<64 hex>` 或已存在的仓库 digest。Core/Benchmark 镜像必须带 `/app/build-provenance.json`，其中 `codeSha` 与清单一致。
2. 读取四个现有容器的 `.Image`，写入清单 `expected_images`。`core`、`gateway`、`cn-gateway`、`benchmark` 四项都必须提供，以阻止覆盖其他会话刚发布的版本。
3. 使用 `./deploy/hangzhou/release.sh manifest.json` 预检；复核后执行同一命令加 `--apply`。只更新清单指定服务；更新共享 gateway.env 时也重建新域名网关。保留其他变量、渠道线路、密钥、数据库、Plot、OpenAcad。
4. 查看双入口 `/ready`、历史图片和公开评测详情；记录源码 SHA、镜像 ID、测试和回执。每次发布在 `/var/backups/hangzhou-<id>` 保存原文件和恢复映射。健康检查失败自动恢复配置和镜像；恢复失败保留维护状态。

清单结构（值需现场填写，不可直接执行）：

```json
{
  "version": 1,
  "id": "reviewed-release-YYYYMMDD",
  "expected_images": {
    "core": "sha256:<current image>",
    "gateway": "sha256:<current image>",
    "cn-gateway": "sha256:<current image>",
    "benchmark": "sha256:<current image>"
  },
  "services": {
    "core": {
      "image": "sha256:<candidate image>",
      "env": {"PAPERBANANA_CODE_SHA": "<40-character source commit>"}
    }
  }
}
```

发布使用原项目锁 `/run/lock/paperbanana-hk-production.lock` 和共享维护文件；检查活动任务、未完成上传及 Benchmark 执行器关闭状态。`--keep-maintenance` 仅用于需要额外数据验收的迁移；清单 ID 必须与已有维护标记相同，验收完成由该次运维操作解除标记。若存在并发写入或其他维护所有者，停止而不覆盖。

此入口不发布静态 Web/OpenAcad，也不升级数据库或执行 schema 迁移；这些仍按各项目实际发布记录操作。旧 GitHub 香港工作流保持停用。以后接入 CI 时也应调用相同预检与清单机制，不能复制旧的 `git checkout` / 全量 env 覆盖步骤。

## 杭州 OSS

- 业务：`paperbanana-prod-hz-20261018`；评测：`paperbanana-bench-hz-20261018`；备份：`paperbanana-backup-hz-20261018`。
- 服务端 HTTPS 内网 `https://oss-cn-hangzhou-internal.aliyuncs.com`；浏览器签名 HTTPS 公网 `https://oss-cn-hangzhou.aliyuncs.com`。Core 两套 OSS 配置分别设置 `internal`；两套网关的业务桶/公网域名同步。
- 新桶保留源桶私有 ACL、阻止公共访问、存储冗余、版本控制、加密、生命周期和 CORS；对象键、内容与元数据不变。现有 RAM 身份仅扩展到对应新桶，未改变动作和前缀边界。
- 只复制当前有效对象；源端历史版本及删除标记留香港，未恢复已删除对象。旧签名 URL 继续到原到期时间；历史任务响应按对象键生成杭州 URL，无需重写用户记录。
- `backup-mongo.sh` 使用现有备份身份和杭州内网端点，安装到 `/opt/paperbanana/operations/backup/backup-mongo.sh`，仍由原 timer/service 调度。验证备份归档与校验文件均上传并从 OSS 读回核对。
- 切换后香港副本逐渐落后，不能只改 env 回退；须维护停写并同步杭州新增/删除/更新对象，检查数据库和对象一致性再切回。香港旧桶暂不删除。

详细实际结果见 `docs/operations/2026-10-18-hangzhou-storage.md`。
