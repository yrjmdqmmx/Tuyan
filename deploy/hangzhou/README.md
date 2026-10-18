# 杭州发布与存储

业务主机 `116.62.146.226`。`paperbanana-hk` 仅是既有 Compose 项目名，不能据此去香港发布。此目录提供当前可用的 SSH 人工发布入口；不依赖服务器 Git checkout，不上传 SSH 私钥，不恢复已停用的香港 GitHub Actions。

## 发布

1. 在独立工作树完成测试和构建，把候选镜像预先载入杭州。镜像引用必须是本机不可变 `sha256:<64 hex>` 或已存在的仓库 digest。Core/Benchmark 镜像必须带 `/app/build-provenance.json`，其中 `codeSha` 与清单一致。
2. 读取五个现有容器的 `.Image`，写入清单 `expected_images`。`core`、`gateway`、`cn-gateway`、`benchmark`、`plot` 五项都必须提供，以阻止覆盖其他会话刚发布的版本。
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
    "benchmark": "sha256:<current image>",
    "plot": "sha256:<current image>"
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


## 分支自动发布

用户选择独立 `codex/hangzhou-production` 作为正式发布源，基线为已上线的 4.0；`main` 和其他开发分支不部署生产。推送/合并代码到该分支自动运行 `Deploy Hangzhou Production`，仅文档改动不发布。CI 全部通过后，Linux amd64 的 Core、两套 Gateway、Plot、关闭执行器的 Benchmark 和国内 Web 同批发布杭州。更新发布器自身必须由运维经现有管理 SSH 安装，发布包不能替换宿主脚本。

GitHub `hangzhou-production` 环境仅允许该分支。它只有专用受限 SSH Key 与固定 known_hosts，不包含模型 Key。SSH 只开放 `status` / `deploy` 两个固定入口，不接受 shell、端口转发或任意文件上传；短期 GitHub token 仅在 `/run` 临时 Docker 凭据中用于拉取本仓库镜像，结束即删除。

发布器验证 GitHub 仓库、当前运行、最新分支 SHA、压缩包 SHA256、固定镜像 digest、主机身份和发布前现网快照。拒绝软链接、路径穿越、配置文件及异常大包。活动任务阻止切换；失败恢复原镜像和静态目录。模型出口与 OSS 环境逐项核对，不改变数据卷、密钥、WireGuard 或 Squid。

GitHub Actions 链接及实际结果将在本次验收记录中补齐。无需模型调用；不保证 CI / 存储 / 网络本身在所有额度条件下永久免费，不启用额外付费资源。
