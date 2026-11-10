import assert from 'node:assert/strict'
export function validatedPrimaryPages(review) {
  const result = {}
  for (const row of review.candidates) {
    const page = review.pages[row.url]
    assert.equal(page.method, 'GET'); assert.equal(page.authenticated, false)
    assert.match(page.sha256, /^[a-f0-9]{64}$/)
    assert.ok(Number.isFinite(Date.parse(page.fetchedAtUtc)))
    assert.ok(Number.isFinite(Date.parse(page.fetchedAtAsiaShanghai)))
    assert.equal(Date.parse(page.fetchedAtUtc), Date.parse(page.fetchedAtAsiaShanghai))
    const identity = /^推理服务供应商 (.+?) 模型的推理服务供应商为\s*[^。]+。$/.exec(row.identityQuote)
    const identityOK = !!identity && identity[1].toLowerCase() === row.identity.slice('bailian/'.length).toLowerCase()
    assert.equal(row.identityValidated, identityOK)
    for (const field of row.fields) {
      assert.ok(page.excerpts.includes(field.quote), row.identity + '/' + field.field)
      const label = {inputModalities:'输入模态',outputModalities:'输出模态',totalContextTokens:'上下文长度',maxOutputTokens:'最大输出长度'}[field.field]
      assert.ok(field.quote.startsWith(label + ' '))
      const value = field.quote.slice(label.length + 1)
      const valid = field.state !== 'known' || (Array.isArray(field.value)
        ? field.value.every(v => value.toLowerCase().split(' ').includes(v))
        : value.replaceAll(',', '') === String(field.value))
      assert.equal(field.validated, valid, row.identity + '/' + field.field)
    }
    const valid = page.status === 200 && page.curlExitCode === 0 && page.finalUrl === row.url
      && identityOK && page.excerpts.includes(row.identityQuote) && row.fields.every(f => f.validated)
    assert.equal(row.validated, valid, row.identity)
    if (!valid) continue
    assert.match(row.url, /^https:\/\/help\.aliyun\.com\/zh\/model-studio\/[^/]+$/)
    assert.notEqual(row.url.split('/').at(-1), 'models')
    result[row.identity] = {url:row.url, title:row.displayTitle}
  }
  return result
}
