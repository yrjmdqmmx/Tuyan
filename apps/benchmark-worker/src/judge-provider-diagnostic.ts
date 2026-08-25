import { loadBenchCredentials } from './config.js'
import { diagnoseJudgeProviderAccess } from './judge-provider-access.js'
import { classifyOperatorError } from './operator-error.js'

const credentials = loadBenchCredentials(process.env)
void diagnoseJudgeProviderAccess({
  openrouterKey: credentials.openrouter,
  bailianKey: credentials.bailian,
  emit(stage) { process.stdout.write(`JUDGE_ACCESS_STAGE=${stage}\n`) },
}).catch((error) => {
  process.stderr.write(`${classifyOperatorError(error)}\n`)
  process.exitCode = 1
})
