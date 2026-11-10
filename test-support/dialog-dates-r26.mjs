import assert from 'node:assert/strict'
const labels={inputModalities:'输入',outputModalities:'输出',totalContextTokens:'上下文窗口',maxOutputTokens:'最大输出'}
const origins={vendor:'源自原厂',channel:'渠道公布',catalog:'图研既有核实',product:'图研输入要求'}
export function assertDialogDates(text,fields,topDate,key) {
 const lines=text.split('\n').filter(Boolean)
 assert.equal(lines.filter(line=>line.startsWith('核实日期：')).length,topDate?1:0,key)
 if(topDate)assert.equal(lines[0],'核实日期：'+topDate,key)
 assert.doesNotMatch(text,/^(?:输入|输出|上下文窗口|最大输出)核实日期：|（\d{4}-\d{2}-\d{2}）/m,key)
 for(const [field,label]of Object.entries(labels)) {
  const fact=fields[field],source=origins[fact.provenance]
  const dated=lines.filter(line=>line.startsWith(label+'：')&&line.includes('核实日期：'))
  if(fact.state==='unknown'||!source||!fact.verifiedAt||fact.verifiedAt===topDate)assert.deepEqual(dated,[],key+'/'+field)
  else assert.deepEqual(dated,[`${label}：${source}（核实日期：${fact.verifiedAt}）`],key+'/'+field)
 }
 assert.doesNotMatch(text,/渠道资料与此前记录不一致，已保留确认过的模态/)
}
export function assertUnknownIconDates(states,key) {
 for(const icon of states)if(['unknown','unlisted'].includes(icon.state))assert.doesNotMatch(icon.tooltip,/（(?:核实日期：)?\d{4}-\d{2}-\d{2}）/,key+'/'+icon.id)
}
