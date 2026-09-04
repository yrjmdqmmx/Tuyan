# Client installation

The canonical standalone skill source is `https://github.com/yrjmdqmmx/Tuyan-Skill`, with the installable directory at `tuyan-scientific-figure/`. The remote MCP endpoint is anonymous Streamable HTTP at `https://api.paperbanana.asia/mcp`; it needs no token or login. The MCP source is maintained separately at `https://github.com/yrjmdqmmx/Tuyan-MCP`.

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
hermes skills search https://paperbanana.asia --source well-known
hermes skills install well-known:https://paperbanana.asia/.well-known/skills/tuyan-scientific-figure
hermes mcp add tuyan --url https://api.paperbanana.asia/mcp
hermes mcp test tuyan
```

Alternatively, Hermes accepts a direct public `SKILL.md` URL and downloads explicitly referenced support files.

## Acceptance boundary

Codex is the first release's end-to-end acceptance client. The OpenClaw and Hermes commands above follow their standard Skill and MCP interfaces, but those clients are not end-to-end validated in this release. Do not claim otherwise.
