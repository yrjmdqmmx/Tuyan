import assert from 'node:assert/strict'
const labels={inputModalities:'输入',outputModalities:'输出',totalContextTokens:'上下文窗口',maxOutputTokens:'最大输出'}
const origins={vendor:'源自原厂',channel:'渠道公布',catalog:'图研既有核实',product:'图研输入要求'}
export function assertDialogDates(text,fields,topDate,key) {
 assert.doesNotMatch(text,/\d{4}-\d{2}-\d{2}|核实日期|未核实|渠道公布|原厂公布|图研既有核实|图研输入要求/,key)
 for(const label of ['上下文窗口','最大输出'])assert.ok(text.split('\n').some(line=>line.startsWith(label+'：')),key)
}
export function assertUnknownIconDates(states,key) {
 for(const icon of states)if(['unknown','unlisted'].includes(icon.state))assert.doesNotMatch(icon.tooltip,/（(?:核实日期：)?\d{4}-\d{2}-\d{2}）/,key+'/'+icon.id)
}
