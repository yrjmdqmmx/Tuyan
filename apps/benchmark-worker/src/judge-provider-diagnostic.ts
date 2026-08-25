import { loadBenchCredentials } from './config.js'
import { diagnoseJudgeProviderAccess } from './judge-provider-access.js'
import { classifyOperatorError } from './operator-error.js'
import { createOpenRouterJudgeEgress } from './judge-egress.js'

const credentials = loadBenchCredentials(process.env)
const egress = createOpenRouterJudgeEgress(process.env)
void diagnoseJudgeProviderAccess({
  openrouterKey: credentials.openrouter, bailianKey: credentials.bailian, openrouterFetchImpl: egress.fetch,
  emit(stage) { process.stdout.write(`JUDGE_ACCESS_STAGE=${stage}\n`) },
}).finally(() => egress.close()).catch((error) => {
  process.stderr.write(`${classifyOperatorError(error)}\n`)
  process.exitCode = 1
})
