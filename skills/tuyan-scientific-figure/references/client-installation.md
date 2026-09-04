# Client installation

The canonical skill source is the repository directory `skills/tuyan-scientific-figure/`. The remote MCP endpoint is anonymous Streamable HTTP at `https://api.paperbanana.asia/mcp`; it needs no token or login.

## Codex

Copy the complete directory into a repository skill root, keeping all referenced files:

```bash
mkdir -p .agents/skills
cp -R skills/tuyan-scientific-figure .agents/skills/tuyan-scientific-figure
codex mcp add tuyan --url https://api.paperbanana.asia/mcp
codex mcp list
```

Codex also accepts user-scoped skills under `~/.agents/skills`. Start a new task if a newly copied skill does not appear. Invoke it explicitly as `$tuyan-scientific-figure` for acceptance.

## OpenClaw

From a checkout containing the canonical directory:

```bash
openclaw skills install ./skills/tuyan-scientific-figure --as tuyan-scientific-figure
openclaw mcp add tuyan \
  --url https://api.paperbanana.asia/mcp \
  --transport streamable-http \
  --include 'tuyan.get_workflow_bundle'
openclaw mcp probe tuyan --json
```

OpenClaw also discovers `<workspace>/skills`, so the repository directory can be used directly in that layout.

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
