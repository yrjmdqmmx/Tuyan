# PaperBanana Clients Open-Source Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a complete, bilingual open-source identity for PaperBanana Clients under the same Apache License 2.0 as upstream while preserving upstream credit and recording the completed production PNG smoke tests.

**Architecture:** This is a documentation-and-metadata-only change. Root `LICENSE` and `NOTICE` establish the legal and attribution layer; `README.md` presents the public mission; `package.json` exposes the SPDX identifier; `SYNC.md` closes the already-completed operational evidence without changing a shared contract.

**Tech Stack:** Markdown, JSON, Git, zsh, Node.js 24, Apache License 2.0

---

## File Map

- Create `LICENSE`: exact current Apache License 2.0 text from upstream PaperBanana.
- Create `NOTICE`: upstream attribution, independent-maintenance clarification, and third-party-terms boundary.
- Modify `README.md`: bilingual opening statement plus durable Upstream and License sections.
- Modify `package.json`: root SPDX license metadata only.
- Modify `SYNC.md`: close the top v8 deployment/operations checkbox using the user's 2026-08-21 smoke confirmation.
- Do not modify app code, lockfiles, workflows, deployment configuration, or remote GitHub metadata.

### Task 1: Add The License And Attribution Files

**Files:**
- Create: `LICENSE`
- Create: `NOTICE`

- [ ] **Step 1: Confirm the starting tree and authoritative upstream license**

Run:

```bash
git status --short --branch
curl --fail --silent --show-error --location \
  https://raw.githubusercontent.com/dwzhu-pku/PaperBanana/main/LICENSE \
  | shasum -a 256
```

Expected: the tree has no unexpected changes, and the upstream license SHA-256 is:

```text
58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd
```

- [ ] **Step 2: Add the exact upstream Apache-2.0 text**

Read the complete authoritative content without writing through shell redirection:

```bash
curl --fail --silent --show-error --location \
  https://raw.githubusercontent.com/dwzhu-pku/PaperBanana/main/LICENSE \
  | sed -n '1,220p'
```

Use `apply_patch` to create root `LICENSE` with the exact current authoritative upstream text. Do not add a project-specific condition, heading, copyright claim, or non-commercial clause.

- [ ] **Step 3: Add the exact NOTICE copy**

Use `apply_patch` to create `NOTICE` with:

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

- [ ] **Step 4: Verify license identity and notice boundaries**

Run:

```bash
diff -u \
  <(curl --fail --silent --show-error --location https://raw.githubusercontent.com/dwzhu-pku/PaperBanana/main/LICENSE) \
  LICENSE
shasum -a 256 LICENSE
rg -n 'PaperBanana|Apache License 2.0|not affiliated|Third-party' NOTICE
git diff --check -- LICENSE NOTICE
```

Expected: `diff` has no output; `LICENSE` has SHA-256 `58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd`; `NOTICE` prints the intended attribution lines; `git diff --check` has no output.

- [ ] **Step 5: Commit the legal and attribution layer**

```bash
git add LICENSE NOTICE
git commit -m "docs: add Apache license and upstream notice"
```

Expected: one commit containing only `LICENSE` and `NOTICE`.

### Task 2: Publish The Bilingual Repository Statement

**Files:**
- Modify: `README.md`
- Modify: `package.json`

- [ ] **Step 1: Add the opening statement before `## Apps`**

Use `apply_patch` to insert this exact section after the existing two-paragraph introduction:

```markdown
## 开源声明 / Open Source Statement

PaperBanana Clients 是在开源项目 [PaperBanana](https://github.com/dwzhu-pku/PaperBanana) 基础上持续开发的独立多端项目。我们衷心感谢上游作者与社区的工作，并采用与上游相同的 Apache License 2.0 发布本项目。

我们同样致力于将本项目建设为一个完全开源的学术插图工具，为所有研究人员提供更加便捷、可靠且跨平台的学术可视化体验。我们的目标只是回馈并造福社区；项目维护者目前没有将本项目商业化的计划。该声明表达的是项目愿景，不改变 Apache License 2.0 授予使用者的任何权利。

PaperBanana Clients is an independently maintained, multi-platform project built on the open-source [PaperBanana](https://github.com/dwzhu-pku/PaperBanana) project. We sincerely appreciate the work of the upstream authors and community, and we release this project under the same Apache License 2.0.

We are likewise committed to building a fully open-source academic illustration tool that gives researchers everywhere a more accessible, reliable, and cross-platform scientific visualization experience. Our goal is simply to give back to and benefit the community; the project maintainers currently have no plans to commercialize this project. This statement expresses our project vision and does not limit any rights granted under Apache License 2.0.
```

- [ ] **Step 2: Add durable Upstream and License sections before `## Notes`**

Use `apply_patch` to insert:

```markdown
## Upstream

PaperBanana Clients 基于开源项目 [dwzhu-pku/PaperBanana](https://github.com/dwzhu-pku/PaperBanana) 持续开发，是由本仓库维护者独立维护的多端项目，并非上游官方发行版。

PaperBanana Clients is built on the open-source [dwzhu-pku/PaperBanana](https://github.com/dwzhu-pku/PaperBanana) project. It is independently maintained by this repository's maintainers and is not an official upstream distribution.

## License

本项目代码采用与上游相同的 [Apache License 2.0](./LICENSE) 开源协议。项目愿景中的“暂无商业化计划”不构成额外许可限制；第三方组件与资源仍适用其各自的许可条款。

This project's source code is released under the same [Apache License 2.0](./LICENSE) as upstream. The maintainers' current lack of commercialization plans is a statement of project intent, not an additional license restriction; third-party components and assets remain subject to their respective terms.
```

- [ ] **Step 3: Add the root SPDX identifier**

Use `apply_patch` to change the opening metadata in `package.json` to:

```json
{
  "name": "paperbanana-clients",
  "private": true,
  "version": "0.0.0",
  "description": "PaperBanana multi-platform client apps",
  "license": "Apache-2.0",
  "packageManager": "pnpm@10.28.2",
```

Do not change `private`, scripts, engines, dependencies, or the lockfile.

- [ ] **Step 4: Verify copy, links, and JSON metadata**

Run:

```bash
node -e 'const p=require("./package.json"); if(p.license!=="Apache-2.0") process.exit(1); console.log(p.license)'
rg -n '开源声明 / Open Source Statement|dwzhu-pku/PaperBanana|fully open-source|不改变 Apache License 2.0|not an additional license restriction' README.md
test -f LICENSE
git diff --check -- README.md package.json
git diff --name-only -- README.md package.json pnpm-lock.yaml
```

Expected: Node prints `Apache-2.0`; all five README concepts are found; `LICENSE` exists; diff checks have no errors; `pnpm-lock.yaml` is not listed as changed.

- [ ] **Step 5: Commit the public repository identity**

```bash
git add README.md package.json
git commit -m "docs: publish bilingual open-source statement"
```

Expected: one commit containing only `README.md` and `package.json`.

### Task 3: Close The Confirmed Production Smoke Item

**Files:**
- Modify: `SYNC.md`

- [ ] **Step 1: Replace only the top v8 deployment line**

Use `apply_patch` to replace:

```markdown
- [ ] 部署 / 运维（PR/CI/香港 Core/Pages 发布及生产 PNG/JPEG/WebP 代表性 smoke 完成后勾选）
```

with:

```markdown
- [x] 部署 / 运维（PR/CI/香港 Core/Pages 已发布；用户于 2026-08-21 手工确认原生 PNG、JPEG→PNG、WebP→PNG 三条生产代表性 smoke 均通过）
```

Do not add a new SYNC entry because this records completion of an existing operations checkbox and does not change a cross-client contract.

- [ ] **Step 2: Verify the closure is singular and accurately scoped**

Run:

```bash
sed -n '20,55p' SYNC.md
rg -n '用户于 2026-08-21 手工确认' SYNC.md
git diff --check -- SYNC.md
git diff --stat -- SYNC.md
```

Expected: exactly one user-confirmation line appears in the top v8 entry; only `SYNC.md` is in the task diff; whitespace check passes.

- [ ] **Step 3: Commit the evidence closure**

```bash
git add SYNC.md
git commit -m "docs: record production PNG smoke completion"
```

Expected: one commit containing only `SYNC.md`.

### Task 4: Run The Final Repository Gate

**Files:**
- Verify: `LICENSE`
- Verify: `NOTICE`
- Verify: `README.md`
- Verify: `package.json`
- Verify: `SYNC.md`

- [ ] **Step 1: Re-run the authoritative license comparison**

```bash
diff -u \
  <(curl --fail --silent --show-error --location https://raw.githubusercontent.com/dwzhu-pku/PaperBanana/main/LICENSE) \
  LICENSE
shasum -a 256 LICENSE
```

Expected: no diff and SHA-256 `58d1e17ffe5109a7ae296caafcadfdbe6a7d176f0bc4ab01e12a689b0499d8bd`.

- [ ] **Step 2: Verify the complete approved scope**

```bash
node -e 'const p=require("./package.json"); console.log(JSON.stringify({name:p.name,private:p.private,license:p.license}))'
rg -n 'Open Source Statement|no plans to commercialize|not an additional license restriction' README.md
rg -n 'not affiliated|Third-party components and assets' NOTICE
rg -n '用户于 2026-08-21 手工确认' SYNC.md
git diff origin/main...HEAD --check
git diff --name-only origin/main...HEAD | sort
```

Expected metadata:

```json
{"name":"paperbanana-clients","private":true,"license":"Apache-2.0"}
```

Expected changed-file set includes the already-approved design/plan documents plus only:

```text
LICENSE
NOTICE
README.md
SYNC.md
docs/superpowers/plans/2026-08-21-open-source-identity.md
docs/superpowers/specs/2026-08-21-open-source-identity-design.md
package.json
```

- [ ] **Step 3: Confirm repository cleanliness and handoff state**

```bash
git status --short --branch
git log --oneline --decorate -6
```

Expected: no unstaged, staged, or untracked files; local branch contains the design, plan, license/notice, bilingual statement, and smoke-closure commits. Do not push, open a PR, or alter remote repository metadata without a separate user decision.
