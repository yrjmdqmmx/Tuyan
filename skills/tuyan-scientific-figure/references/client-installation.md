# Client installation

The canonical standalone skill source is `https://github.com/yrjmdqmmx/Tuyan-Skill`, with the installable directory at `tuyan-scientific-figure/`. The remote MCP endpoint is anonymous Streamable HTTP at `https://api.paperbanana.asia/mcp`; it needs no token or login. The MCP source is maintained separately at `https://github.com/yrjmdqmmx/Tuyan-MCP`.

## Agent-assisted setup

The stable, machine-readable installation entry is:
`https://www.paperbanana.asia/.well-known/skills/tuyan-scientific-figure/references/client-installation.md`.
If the site is unreachable, read the installation reference in the canonical standalone Skill repository above.

1. Inspect the current client, version, available tools, network access, and project/user configuration scope. Check its installed CLI help or current official documentation before using a client-specific command. Do not assume every Agent supports Skills or remote MCP.
2. Choose the supported path: Skill for local scientific-figure workflows; anonymous Streamable HTTP MCP for public templates, rules, schemas, and knowledge versions; or both. If only Skill is available, it includes an offline knowledge snapshot. Preserve existing installations and unrelated configuration; explain any client permissions or restart needed.
3. Install the complete Skill directory, including referenced files, into a directory the client actually discovers. The published file manifest is `https://www.paperbanana.asia/.well-known/skills/index.json`. Configure MCP separately at `https://api.paperbanana.asia/mcp`; do not clone its server just to use the hosted endpoint.
4. Verify without generating images: confirm native Skill discovery, then use the client's MCP discovery to list tools/resources. The only tool is `tuyan.get_workflow_bundle`; a listed `tuyan://` resource can be read as the acceptance check. If testing the tool, use only the enum fields shown in `SKILL.md` and `operation: "evaluate"`. Never send research content, free-text prompts, images, or credentials to this MCP.
5. Report configuration and verification separately. A copied prompt, copied files, or saved MCP URL alone does not establish a working connection. Name the discovered Skill/tool/resource, the check actually performed, any errors or unverified steps, and how the user can invoke the capability. If the client cannot verify its new configuration until restart, say so.

Skill installation and public MCP access need no Tuyan account, OAuth approval, API key, or paid-model call. Users may need to approve local installation, enable a client tool, restart their Agent, or configure their Agent's own renderer. This MCP does not log into the Web workbench or create cloud generation jobs. Image generation uses the Agent's own tools and may require that tool's authorization and credits; without a renderer the Skill can stop at FigureSpec. PaperBananaBench retrieval is optional and requires explicit user consent before downloading the dataset. Do not use generation or dataset download as an installation smoke test.

## Codex

Clone the Skill repository, then copy the complete installable directory while keeping all referenced files:

```bash
git clone --depth 1 https://github.com/yrjmdqmmx/Tuyan-Skill.git
mkdir -p ~/.agents/skills
cp -R Tuyan-Skill/tuyan-scientific-figure ~/.agents/skills/tuyan-scientific-figure
```

Configure the MCP separately; cloning the MCP source repository is not required for the hosted endpoint:

```bash
codex mcp add tuyan --url https://api.paperbanana.asia/mcp
codex mcp list
```

For a workspace-scoped install, copy the directory to `.agents/skills/tuyan-scientific-figure` instead. Start a new task if a newly copied skill does not appear. Invoke it explicitly as `$tuyan-scientific-figure` for acceptance.

## OpenClaw

From a checkout of the standalone Skill repository:

```bash
openclaw skills install ./tuyan-scientific-figure --as tuyan-scientific-figure
openclaw mcp add tuyan \
  --url https://api.paperbanana.asia/mcp \
  --transport streamable-http \
  --include 'tuyan.get_workflow_bundle'
openclaw mcp probe tuyan --json
```

OpenClaw also discovers `<workspace>/skills`, so the installable directory can be copied directly into that layout.

## Hermes Agent

After the public well-known files are deployed:

```bash
hermes skills search https://www.paperbanana.asia --source well-known
hermes skills install well-known:https://www.paperbanana.asia/.well-known/skills/tuyan-scientific-figure
hermes mcp add tuyan --url https://api.paperbanana.asia/mcp
hermes mcp test tuyan
```

Alternatively, Hermes accepts a direct public `SKILL.md` URL and downloads explicitly referenced support files.

## Acceptance boundary

Codex is the first release's end-to-end acceptance client. The OpenClaw and Hermes commands above follow their standard Skill and MCP interfaces, but those clients are not end-to-end validated in this release. Do not claim otherwise.
