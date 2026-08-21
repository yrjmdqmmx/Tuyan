# PaperBanana Clients Open-Source Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish a complete, bilingual open-source identity for PaperBanana Clients under the same Apache License 2.0 as upstream while preserving upstream credit and recording the completed production PNG smoke tests.

**Architecture:** This is a documentation-and-metadata-only change. Root `LICENSE` and `NOTICE` establish the legal and attribution layer; `README.md` presents the public mission; `package.json` exposes the SPDX identifier; the app-store Terms of Service Markdown and HTML clarify how Apache-2.0 source-code rights relate to trademarks and hosted-service materials; `SYNC.md` closes the already-completed operational evidence without changing a shared contract.

**Tech Stack:** Markdown, JSON, Git, zsh, Node.js 24, Apache License 2.0

---

## File Map

- Create `LICENSE`: exact current Apache License 2.0 text from upstream PaperBanana.
- Create `NOTICE`: upstream attribution, independent-maintenance clarification, and third-party-terms boundary.
- Modify `README.md`: bilingual opening statement plus durable Upstream and License sections.
- Modify `package.json`: root SPDX license metadata only.
- Modify `apps/miniprogram/package.json`: explicit license alignment for the sole conflicting workspace manifest.
- Modify `docs/app-store-submission/terms-of-service.md` and `docs/app-store-submission/terms-of-service.html`: align the source-code/open-source-rights clarification across Markdown and HTML.
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
- Modify: `apps/miniprogram/package.json`

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

- [ ] **Step 3: Align the explicit miniprogram license metadata**

Use `apply_patch` to change the only conflicting workspace manifest so its `license` field becomes:

```json
"license": "Apache-2.0"
```

Do not add license fields to manifests that currently omit one, and do not change any other field in `apps/miniprogram/package.json`.

- [ ] **Step 4: Add the root SPDX identifier**

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

- [ ] **Step 5: Verify copy, links, JSON metadata, and workspace license alignment**

Run:

```bash
node -e 'const p=require("./package.json"); if(p.license!=="Apache-2.0") process.exit(1); console.log(p.license)'
node -e 'const p=require("./apps/miniprogram/package.json"); if(p.license!=="Apache-2.0") process.exit(1); console.log(p.license)'
rg -n '开源声明 / Open Source Statement|dwzhu-pku/PaperBanana|fully open-source|不改变 Apache License 2.0|not an additional license restriction' README.md
test -f LICENSE
rg -n '"license"\s*:\s*"UNLICENSED"' --glob 'package.json' --glob '!node_modules/**' .
git diff --check -- README.md package.json apps/miniprogram/package.json
git diff --name-only -- README.md package.json apps/miniprogram/package.json pnpm-lock.yaml
```

Expected: Node prints `Apache-2.0` for both manifests; all five README concepts are found; `LICENSE` exists; no explicit `UNLICENSED` manifest remains; diff checks have no errors; the scoped diff list includes `README.md`, `package.json`, and `apps/miniprogram/package.json` while `pnpm-lock.yaml` is not listed as changed.

- [ ] **Step 6: Commit the public repository identity**

```bash
git add README.md package.json apps/miniprogram/package.json
git commit -m "docs: publish bilingual open-source statement"
```

Expected: one commit containing only `README.md`, `package.json`, and `apps/miniprogram/package.json`.

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

### Task 4: Quality Review Follow-up

**Files:**
- Verify: `docs/app-store-submission/terms-of-service.md`
- Verify: `docs/app-store-submission/terms-of-service.html`

- [x] **Step 1: Confirm the rights-clarification copy in both formats**

Run:

```bash
rg -n '本应用的商标、标识、托管服务以及未按开源许可证发布的内容归我们或相应权利人所有，并受法律保护。本仓库中依据 Apache License 2.0 发布的源代码及其衍生作品，可以依照该许可证使用、复制、修改和分发；本条款不限制该许可证明确授予的任何权利。除适用的开源许可证或其他书面授权明确允许外，您不得复制、修改、分发、出售或以其他方式利用本应用的商标、标识、托管服务或其他非开源受保护材料。|The App'\''s trademarks, logos, hosted service, and materials not released under an open-source license belong to us or their respective rights holders and are protected by law. Source code in this repository and derivative works released under Apache License 2.0 may be used, copied, modified, and distributed in accordance with that license; these Terms do not limit any rights expressly granted by that license. Except as expressly permitted by an applicable open-source license or other written authorization, you may not copy, modify, distribute, sell, or otherwise exploit the App'\''s trademarks, logos, hosted service, or other protected non-open-source materials.' docs/app-store-submission/terms-of-service.md docs/app-store-submission/terms-of-service.html
```

Expected: the new Chinese and English rights paragraphs each appear once in Markdown and HTML, and the old broad-prohibition wording is absent from both files.

- [x] **Step 2: Verify Markdown/HTML semantic alignment**

Run:

```bash
python - <<'PY'
from html import unescape
from pathlib import Path
import re

md = Path("docs/app-store-submission/terms-of-service.md").read_text(encoding="utf-8")
html = Path("docs/app-store-submission/terms-of-service.html").read_text(encoding="utf-8")

md_cn = "本应用的商标、标识、托管服务以及未按开源许可证发布的内容归我们或相应权利人所有，并受法律保护。本仓库中依据 Apache License 2.0 发布的源代码及其衍生作品，可以依照该许可证使用、复制、修改和分发；本条款不限制该许可证明确授予的任何权利。除适用的开源许可证或其他书面授权明确允许外，您不得复制、修改、分发、出售或以其他方式利用本应用的商标、标识、托管服务或其他非开源受保护材料。"
md_en = "The App's trademarks, logos, hosted service, and materials not released under an open-source license belong to us or their respective rights holders and are protected by law. Source code in this repository and derivative works released under Apache License 2.0 may be used, copied, modified, and distributed in accordance with that license; these Terms do not limit any rights expressly granted by that license. Except as expressly permitted by an applicable open-source license or other written authorization, you may not copy, modify, distribute, sell, or otherwise exploit the App's trademarks, logos, hosted service, or other protected non-open-source materials."

assert md.count(md_cn) == 1
assert md.count(md_en) == 1
assert html.count(md_cn) == 1
assert html.count(md_en) == 1
assert "本应用本身（包括其软件、界面、商标、标识与文档）的知识产权归我们或相应权利人所有，受法律保护。除为正常使用本应用所必需外，未经授权，您不得复制、修改、分发、出售或以其他方式利用本应用的任何部分。" not in md
assert "本应用本身（包括其软件、界面、商标、标识与文档）的知识产权归我们或相应权利人所有，受法律保护。除为正常使用本应用所必需外，未经授权，您不得复制、修改、分发、出售或以其他方式利用本应用的任何部分。" not in html
assert "The intellectual property in the App itself (software, interface, trademarks, logos, documentation) belongs to us or the respective rights holders and is protected by law. Except as necessary for normal use, you may not copy, modify, distribute, sell, or otherwise exploit any part of the App without authorization." not in html
print("terms aligned")
PY
```

Expected: `terms aligned`.

### Task 5: Run The Final Repository Gate

**Files:**
- Verify: `LICENSE`
- Verify: `NOTICE`
- Verify: `README.md`
- Verify: `package.json`
- Verify: `SYNC.md`
- Verify: `docs/app-store-submission/terms-of-service.md`
- Verify: `docs/app-store-submission/terms-of-service.html`

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
rg -n 'Apache License 2.0|本条款不限制|these Terms do not limit|non-open-source materials' docs/app-store-submission/terms-of-service.md docs/app-store-submission/terms-of-service.html
git diff origin/main...HEAD --check
git diff --name-only origin/main...HEAD | sort
```

Expected metadata:

```json
{"name":"paperbanana-clients","private":true,"license":"Apache-2.0"}
```

Expected changed-file set includes the already-approved design/plan documents plus only:

```text
apps/miniprogram/package.json
docs/app-store-submission/terms-of-service.html
docs/app-store-submission/terms-of-service.md
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

Expected: no unstaged, staged, or untracked files; local branch contains the design, plan, license/notice, bilingual statement, ToS rights-clarification, and smoke-closure commits. Do not push, open a PR, or alter remote repository metadata without a separate user decision.
