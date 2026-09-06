# Scientific V2 单模型增量批次

此入口新增一个模型的固定九题测试，并以冻结时的 active release 为基线发布。基线模型的图像、评分、审核理由和证据保持不变，发布时仅重排排名。失败或不支持的题位按既有协议记零分，只有成功图进入盲审；未知计费结果继续暂停且不重试。不得复用 Seedream correction 或把历史 Provider 调用计作新调用。

## 生产入口与输入

所有 workflow 都在 `paperbanana-production` 环境中从 `main` 的精确 SHA 执行。正常执行必须先部署该 SHA 的 Core 和 Worker 不可变镜像，常驻 Worker 保持 `configured-disabled`、`enabled=false`、并发 `1`。

1. 运行 `inspect-scientific-v2-expansion-preflight.yml`：`expected_control_sha` 为该次 workflow 的 SHA，`active_release_hash` 为公开榜的精确 release hash，`confirm=inspect-scientific-v2-expansion-read-only`。输出核实后的 `deployedSha/coreDigest/workerDigest`、`coreCodeSha/workerCodeSha/sameSha`、active `baseline` 四元组及近期受保护准备文件的 SHA。`imageLock` 含 `deploy-hk.yml` 所需的全部五项镜像引用，可保留原 gateway/plot/Mongo 镜像，仅替换本次 Core/Benchmark 镜像。只读检查允许历史 Core 与远端 checkout 不同，但各自 env SHA 必须与运行镜像 provenance 一致；后续执行仍必须满足严格 same-SHA 门。这个步骤只读；签名在后续 prepare 中重新验证。
2. 将以下 JSON 保存为私有输入，不包含密钥。以文件原始字节计算 SHA-256；draft release 的 `target_commitish` 绑定已部署 SHA，asset 名为 `scientific-v2-expansion-descriptor-<sha256>.json`。

```json
{
  "schemaVersion": 1,
  "kind": "single_model_expansion",
  "baseline": {
    "releaseId": "<preflight baseline.releaseId>",
    "releaseHash": "<preflight baseline.releaseHash>",
    "batchId": "<preflight baseline.batchId>",
    "manifestHash": "<preflight baseline.manifestHash>"
  },
  "targetModelId": "microsoft/mai-image-2.6"
}
```

3. `stage-scientific-v2-admin-input.yml` 使用 `purpose=expansion-descriptor`，提供控制/部署 SHA、draft release ID、asset ID/name/SHA/size，`confirm=stage-exact-scientific-v2-admin-input`。文件落在 `/opt/paperbanana/operator-private/scientific-v2/admin-inputs/<sha256>.json`，root `0600`。
4. `refresh-scientific-v2-price-sources.yml` 传已核实部署 SHA、Core/Worker digest 和 `expansion_sha256=<descriptor sha256>`，确认短语不变。保存输出的 `registryAuthoritySha256` 和 `refresh.refreshReportFileSha256`。
5. `authorize-scientific-v2-price-snapshot.yml` 传同一 SHA/digest、上述 authority/report SHA、同一 `expansion_sha256`；保存 `signedSnapshotSha256`。授权/签名仅处理目标模型需要的价格，全量 registry authority 继续保留。
6. `prepare-scientific-v2-production.yml` 传同一 SHA/digest、`signed_price_snapshot_sha256` 和同一 `expansion_sha256`，`confirm=prepare-scientific-v2-production-disabled-worker`。输出 manifest/state/inspect/freeze/attest bundle 文件哈希及 registry/suite/price hash。确认 `modelCount=1`。
7. `run-scientific-v2-admin-operator.yml` 使用 **`operation=expansion-freeze`**，`input_sha256=bundles.freeze`，`confirm=expansion-freeze-scientific-v2-admin-disabled-worker`。它只调用 `freezeExpansionBatch`，并校验 active 基线未变化。接着以 `operation=attest`、`input_sha256=bundles.attest` 获取服务器签名状态；确认 `modelCount=1`、`slotCount=9`、Codex 调用上限为 `0`。
8. 复用 `stage-scientific-v2-run-bundle.yml` 与 `run-scientific-v2-operator.yml` 的 canary-only → attest → full 链。所有阶段都传 **`model_count=1`** 和真实 batchId、manifestHash、同一部署 SHA/digest；冻结 manifest 中包含全量 registry/canonical manifest，但执行仅有目标九题。完整运行后复用已持久化 Worker report 导入、双独立盲审 A/B、分歧仲裁、公开证据 render 和原子 publish 入口。

必须保留各阶段实际输出哈希和真实 batchId。不得从 manifestHash 猜测既存批次 ID，不得跳过签名或把 control SHA 当作旧 manifest 的代码来源。发布将再次校验 active 基线，通过原子 CAS 新增目标模型并保留基线内容。

## 本地验证

```sh
node --test deploy/hk-single-host/tests/scientific-v2-expansion-ops.test.mjs deploy/hk-single-host/tests/scientific-v2-production-bridge.test.mjs deploy/hk-single-host/tests/scientific-v2-operator.test.mjs
```

契约覆盖完整 registry 的单模型 inspect、仅九个目标题位、Codex 零上限、签名 stager 的 descriptor/题位漂移拒绝、active head/lifecycle/batch 的只读一致性以及旧批次路径。
