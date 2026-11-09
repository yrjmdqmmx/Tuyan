const test = require('node:test');
const assert = require('node:assert/strict');
const {auditedModelLifecycle,auditedModelSpecs,withModelAudit} = require('../miniprogram/utils/model-audit.js');
test('mini program shares exact channel lifecycle and independently sourced output limits',()=>{
  const old={id:'mimo-v2.5',selectable:true},before={...old};
  assert.equal(withModelAudit('xiaomi',old).selectable,false);
  assert.equal(auditedModelLifecycle('xiaomi',old.id).label,'已下架');assert.deepEqual(old,before);
  assert.equal(auditedModelLifecycle('bailian','qwen3.5-plus',Date.parse('2027-01-18')).state,'scheduled');
  assert.equal(auditedModelLifecycle('bailian','qwen3.5-plus',Date.parse('2027-01-19')).state,'retired');
  const spec=auditedModelSpecs('tokendance','deepseek-v4-pro');
  assert.equal(spec.fields.maxOutputTokens.provenance,'vendor');assert.equal(spec.fields.totalContextTokens.provenance,'channel');
  assert.equal(auditedModelSpecs('custom','deepseek-v4-pro').fields.maxOutputTokens.value,null);
});
