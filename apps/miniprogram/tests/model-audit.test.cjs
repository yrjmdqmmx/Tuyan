const test = require('node:test');
const assert = require('node:assert/strict');
const {removedModel,removedModelHint,auditedModelLifecycle,auditedModelSpecs,withModelAudit} = require('../miniprogram/utils/model-audit.js');
test('mini program shares exact channel lifecycle and independently sourced output limits',()=>{
  const old={id:'mimo-v2.5',selectable:true},before={...old};
  assert.equal(withModelAudit('xiaomi',old).selectable,false);
  assert.match(removedModelHint('xiaomi',old.id),/原型号已不可用，请重新选择，可改选 mimo-v2.6-flash/);assert.deepEqual(old,before);
  assert.equal(auditedModelLifecycle('bailian','qwen3.5-plus',Date.parse('2027-01-18')).state,'scheduled');
  assert.equal(removedModel('bailian','qwen3.5-plus',Date.parse('2027-01-19')).replacementApiId,'qwen3.8-flash');
  const spec=auditedModelSpecs('tokendance','deepseek-v4-pro');
  assert.ok(spec.fields.totalContextTokens.value>0);assert.equal(spec.fields.maxOutputTokens.provenance,null);
  assert.equal(auditedModelSpecs('antling','Ling-3.2-flash').fields.totalContextTokens.value,1048576);
  assert.equal(auditedModelSpecs('custom','deepseek-v4-pro').fields.maxOutputTokens.value,null);
});
