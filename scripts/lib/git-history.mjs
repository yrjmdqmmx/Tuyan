// Maintenance only. Test helpers use committed artifacts and never call git show.
import { execFileSync, spawnSync } from 'node:child_process'
import path from 'node:path'

export const gitText = (root, commit, file) => execFileSync('git', ['show', `${commit}:${file}`], {
  cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024,
})

export function hasCommit(root, commit) {
  return spawnSync('git', ['cat-file', '-e', `${commit}^{commit}`], { cwd: root, stdio: 'ignore' }).status === 0
}

export function requireHistory(root, commits) {
  const missing = [...new Set(commits)].filter(commit => !hasCommit(root, commit))
  if (!missing.length) return
  const reason = `historical commit(s) unavailable: ${missing.join(', ')} (shallow checkout or no Git history)`
  if (process.argv.includes('--check')) {
    console.log(`SKIP ${path.basename(process.argv[1])}: ${reason}; regeneration requires full history. Committed-fixture tests remain active.`)
    process.exit(0)
  }
  throw new Error(reason)
}
