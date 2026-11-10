// No Docker, installs, network or service execution. Parse actual COPY/WORKDIR
// instructions into temporary layouts, then run the package's exact bundle script.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
export function dockerLayout(text) {
  let cwd = '/', stages = 0
  const copies = [], builds = []
  for (const raw of text.replace(/\\\r?\n/g, ' ').split('\n')) {
    const line = raw.trim()
    if (/^FROM /i.test(line) && ++stages > 1) break
    if (/^WORKDIR /i.test(line)) cwd = path.posix.resolve(cwd, line.slice(8).trim())
    if (/^COPY /i.test(line) && !line.includes('--from=')) {
      const args = line.slice(5).trim().split(/\s+/).filter(token => !token.startsWith('--'))
      assert.ok(!args.some(token => /["'$]/.test(token)), 'Unsupported COPY syntax: ' + line)
      const destination = args.pop()
      copies.push({ sources: args, destination: path.posix.resolve(cwd, destination), directory: destination.endsWith('/') || args.length > 1 })
    }
    const build = /^RUN pnpm --filter ([\w@/-]+) build$/.exec(line)
    if (build) builds.push(build[1])
  }
  return { cwd, copies, builds }
}
function copyLayout(file, target) {
  const layout = dockerLayout(fs.readFileSync(path.join(root, file), 'utf8'))
  const ignored = fs.readFileSync(path.join(root, '.dockerignore'), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'))
  assert.ok(ignored.every(s => !s.startsWith('!')), 'Extend simulator before using negated dockerignore patterns')
  const excluded = source => {
    const relative = path.relative(root, source).split(path.sep).join('/')
    return ignored.some(pattern => path.matchesGlob(relative, pattern) || relative.split('/').some(part => path.matchesGlob(part, pattern)))
  }
  for (const copy of layout.copies) for (const source of copy.sources) {
    const matches = fs.globSync(source, { cwd: root })
    assert.ok(matches.length, 'COPY source missing: ' + source)
    for (const match of matches) {
      const from = path.join(root, match)
      assert.ok(!excluded(from), 'COPY source excluded by dockerignore: ' + match)
      const destination = path.join(target, copy.destination)
      const to = copy.directory ? path.join(destination, path.basename(match)) : destination
      fs.mkdirSync(path.dirname(to), { recursive: true })
      fs.cpSync(from, to, { recursive: true, filter: source => !excluded(source) })
    }
  }
  return layout
}
// Link installed third-party dependencies only; workspace dependencies resolve
// inside the copied tree, so an original-checkout symlink cannot mask a missing COPY.
function dependencies(relative, target, base) {
  const installed = path.join(root, relative, 'node_modules'), dest = path.join(base, relative, 'node_modules')
  if (!fs.existsSync(installed)) return
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(installed)) {
    if (entry.startsWith('.')) continue
    if (entry.startsWith('@')) {
      fs.mkdirSync(path.join(dest, entry), { recursive: true })
      for (const name of fs.readdirSync(path.join(installed, entry))) {
        const original = fs.realpathSync(path.join(installed, entry, name))
        const local = original.startsWith(path.join(root, 'packages') + path.sep)
        const resolved = local ? path.join(base, path.relative(root, original)) : original
        assert.ok(fs.existsSync(resolved), `Dependency omitted by COPY: ${entry}/${name}`)
        fs.symlinkSync(resolved, path.join(dest, entry, name), 'dir')
      }
    } else fs.symlinkSync(fs.realpathSync(path.join(installed, entry)), path.join(dest, entry), 'dir')
  }
}
export function checkDockerBundles() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'tuyan-docker-context-')), results = []
  try {
    for (const app of ['paperbanana-api', 'benchmark-worker', 'auth-gateway']) {
      const directory = path.join(temp, app), dockerfile = `apps/${app}/Dockerfile`
      const layout = copyLayout(dockerfile, directory)
      const base = path.join(directory, app === 'auth-gateway' ? '/app' : '/workspace')
      if (app !== 'auth-gateway') assert.equal(
        fs.readFileSync(path.join(base, 'packages/api/src/card-presentation.d.mts'), 'utf8'),
        fs.readFileSync(path.join(root, 'packages/api/src/card-presentation.d.mts'), 'utf8'),
        'Card presentation declarations must accompany the copied module')
      for (const relative of ['apps/paperbanana-api', 'apps/benchmark-worker', 'apps/auth-gateway', 'packages/benchmark-core', 'packages/tuyan-knowledge']) {
        if (fs.existsSync(path.join(base, relative, 'package.json'))) dependencies(relative, directory, base)
      }
      const env = { PATH: path.join(root, 'node_modules/.bin') + path.delimiter + process.env.PATH, NODE_PATH: path.join(root, 'node_modules') }
      const builds = []
      for (const name of layout.builds) {
        const relative = 'apps/' + name.split('/').at(-1), cwd = path.join(base, relative)
        const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'))
        assert.ok(pkg.scripts.build.split(' && ').every(command => command.startsWith('esbuild ')), 'Only offline esbuild commands permitted')
        execFileSync('/bin/sh', ['-c', pkg.scripts.build], { cwd, env, stdio: 'pipe', maxBuffer: 8 * 1024 * 1024 })
        builds.push({ package: name, command: pkg.scripts.build, bundles: pkg.scripts.build.split(' && ').length })
      }
      if (app === 'auth-gateway') {
        const command = 'esbuild src/server.js --bundle --platform=node --target=node24 --format=esm --packages=external --outfile=/dev/null'
        execFileSync('/bin/sh', ['-c', command], { cwd: path.join(base, 'apps/auth-gateway'), env, stdio: 'pipe' })
        builds.push({ package: '@paperbanana/auth-gateway', command, bundles: 1, note: 'Gateway has no build script; resolve all local runtime imports without starting the server' })
      }
      results.push({ dockerfile, copyInstructions: layout.copies.length, builds })
    }
  } finally { fs.rmSync(temp, { recursive: true, force: true }) }
  return results
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) console.log(JSON.stringify(checkDockerBundles(), null, 2))
