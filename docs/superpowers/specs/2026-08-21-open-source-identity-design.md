# PaperBanana Clients Open-Source Identity Design

**Status:** Approved for implementation

**Date:** 2026-08-21

**Upstream:** <https://github.com/dwzhu-pku/PaperBanana>

**License selected:** Apache License 2.0

## Context

PaperBanana Clients is a multi-platform monorepo developed from the open-source PaperBanana project. The upstream repository currently publishes its code under Apache License 2.0 and describes a community-first mission for academic illustration. This repository currently has no root-level `LICENSE`, `NOTICE`, or explicit upstream attribution in its README.

The project maintainers want this repository to adopt the same license, clearly acknowledge the upstream project, and state—in Chinese and English—that PaperBanana Clients is committed to remaining fully open source, exists to help researchers create academic illustrations, and currently has no commercialization plans.

## Goals

1. Make the repository's Apache-2.0 licensing explicit and machine-readable.
2. Give durable, visible credit to the upstream PaperBanana project and its community.
3. Present a bilingual community mission near the top of the root README.
4. Clarify that the no-commercialization statement describes maintainer intent and does not restrict rights granted by Apache-2.0.
5. Close the existing `SYNC.md` deployment checkbox using the user's confirmation that the three representative production PNG-format smoke tests passed.

## Non-Goals

- Do not add a non-commercial license condition or any other restriction beyond Apache-2.0.
- Do not claim that PaperBanana Clients is an official upstream distribution or endorsed by the upstream authors.
- Do not modify GitHub About text, topics, repository visibility, or other remote metadata in this change.
- Do not add governance files that require facts not yet provided, such as a security contact address, citation authority, or formal organizational ownership.
- Do not relicense third-party dependencies, datasets, models, generated assets, or other materials that carry their own terms.
- Do not change application code, APIs, deployment configuration, runtime behavior, or other client implementations.

## Selected Approach

Use a complete but restrained open-source identity package:

1. Add the unmodified Apache License 2.0 text as the repository-root `LICENSE`.
2. Add a concise root `NOTICE` that identifies PaperBanana Clients as an independently maintained multi-platform project based on PaperBanana, links to the upstream repository, preserves upstream attribution, and states that this repository's contributions are distributed under Apache-2.0.
3. Add a bilingual `开源声明 / Open Source Statement` near the top of the root README, before the application inventory.
4. Add `Upstream` and `License` sections near the bottom of the README so attribution and licensing remain discoverable outside the opening statement.
5. Add the SPDX identifier `"license": "Apache-2.0"` to the root `package.json`.
6. Align the sole explicitly conflicting workspace manifest, `apps/miniprogram/package.json`, by changing its license field from `UNLICENSED` to `Apache-2.0`; manifests that omit an explicit license are not mechanically duplicated.
7. Mark the top OpenRouter PNG deployment/operations checkbox in `SYNC.md` complete, noting that the three production format routes were manually verified by the user.

## README Copy

### Chinese

> PaperBanana Clients 是在开源项目 [PaperBanana](https://github.com/dwzhu-pku/PaperBanana) 基础上持续开发的独立多端项目。我们衷心感谢上游作者与社区的工作，并采用与上游相同的 Apache License 2.0 发布本项目。
>
> 我们同样致力于将本项目建设为一个完全开源的学术插图工具，为所有研究人员提供更加便捷、可靠且跨平台的学术可视化体验。我们的目标只是回馈并造福社区；项目维护者目前没有将本项目商业化的计划。该声明表达的是项目愿景，不改变 Apache License 2.0 授予使用者的任何权利。

### English

> PaperBanana Clients is an independently maintained, multi-platform project built on the open-source [PaperBanana](https://github.com/dwzhu-pku/PaperBanana) project. We sincerely appreciate the work of the upstream authors and community, and we release this project under the same Apache License 2.0.
>
> We are likewise committed to building a fully open-source academic illustration tool that gives researchers everywhere a more accessible, reliable, and cross-platform scientific visualization experience. Our goal is simply to give back to and benefit the community; the project maintainers currently have no plans to commercialize this project. This statement expresses our project vision and does not limit any rights granted under Apache License 2.0.

## Attribution And Legal Boundaries

- The Apache-2.0 license text must remain unmodified.
- The README mission statement must not be represented as an additional license term.
- “No plans to commercialize” applies to the maintainers' current plans; it does not prohibit commercial use, redistribution, modification, or sublicensing permitted by Apache-2.0.
- The upstream project name and URL must be preserved in both README attribution and `NOTICE`.
- The repository must be described as independent and multi-platform, not as the official upstream client or an endorsed distribution.
- Any copyright notice added to `NOTICE` must refer only to the relevant contributors and must not claim ownership of upstream work.

## NOTICE Copy

Use the following text without adding a non-commercial condition:

```text
PaperBanana Clients
Copyright 2026 PaperBanana Clients contributors

This repository is an independently maintained, multi-platform project built
on the open-source PaperBanana project:
https://github.com/dwzhu-pku/PaperBanana

We appreciate the work of the upstream authors and community. Portions derived
from PaperBanana remain under the Apache License 2.0, and original contributions
in this repository are released under the same license. This project is not
affiliated with or officially endorsed by the upstream authors. Third-party
components and assets remain subject to their respective terms.
```

## README Closing Sections

Add the following durable references near the end of the root README:

```markdown
## Upstream

PaperBanana Clients 基于开源项目 [dwzhu-pku/PaperBanana](https://github.com/dwzhu-pku/PaperBanana) 持续开发，是由本仓库维护者独立维护的多端项目，并非上游官方发行版。

PaperBanana Clients is built on the open-source [dwzhu-pku/PaperBanana](https://github.com/dwzhu-pku/PaperBanana) project. It is independently maintained by this repository's maintainers and is not an official upstream distribution.

## License

本项目代码采用与上游相同的 [Apache License 2.0](./LICENSE) 开源协议。项目愿景中的“暂无商业化计划”不构成额外许可限制；第三方组件与资源仍适用其各自的许可条款。

This project's source code is released under the same [Apache License 2.0](./LICENSE) as upstream. The maintainers' current lack of commercialization plans is a statement of project intent, not an additional license restriction; third-party components and assets remain subject to their respective terms.
```

## SYNC Closure Copy

Replace only the unchecked deployment/operations line in the top v8 entry with:

```markdown
- [x] 部署 / 运维（PR/CI/香港 Core/Pages 已发布；用户于 2026-08-21 手工确认原生 PNG、JPEG→PNG、WebP→PNG 三条生产代表性 smoke 均通过）
```

## File-Level Changes

| File | Change |
| --- | --- |
| `LICENSE` | Add the exact Apache License 2.0 text used by upstream. |
| `NOTICE` | Add upstream attribution, independent-project clarification, and Apache-2.0 distribution notice. |
| `README.md` | Add bilingual opening statement plus durable Upstream and License sections. |
| `package.json` | Add `"license": "Apache-2.0"` without changing package privacy or scripts. |
| `apps/miniprogram/package.json` | Change the explicit manifest license from `UNLICENSED` to `Apache-2.0`; leave other manifests untouched unless they already declare a conflicting value. |
| `SYNC.md` | Mark the v8 deployment/operations smoke item complete based on user-confirmed production tests; do not add a new contract entry. |

## Verification

1. Confirm `LICENSE` matches the upstream Apache-2.0 license text byte-for-byte, allowing only a final-newline normalization if necessary.
2. Parse `package.json` and confirm its license field is exactly `Apache-2.0`.
3. Parse all `package.json` files and confirm no explicit `UNLICENSED` manifest remains.
4. Confirm README contains the upstream URL, both language versions, and the statement that project intent does not alter Apache-2.0 rights.
5. Confirm `NOTICE` contains attribution without an endorsement claim or non-commercial restriction and preserves separate third-party terms.
6. Confirm only the intended `SYNC.md` checkbox and explanatory wording changed.
7. Confirm `pnpm-lock.yaml` is unchanged.
8. Run `git diff --check` and review the complete diff.
9. Confirm no application, dependency-lock, workflow, or deployment files changed.

## Rollback

The change is documentation and metadata only. Rollback consists of reverting the dedicated implementation commit, which removes `LICENSE` and `NOTICE` and restores the previous README, package metadata, and `SYNC.md` checkbox. No runtime or data migration rollback is required.
