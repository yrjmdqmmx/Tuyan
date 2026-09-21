// Translate explanatory text only. All identities, numbers, exact rational
// costs, calculation rules and historical evidence remain in the source data.
export function presentBenchmarkPrice(price, model, t) {
  const result = { ...price }
  for (const key of ['reason', 'conditions', 'rateText', 'calculation', 'channel', 'generationApi', 'editApi']) {
    if (typeof price[key] === 'string') result[key] = t(price[key])
  }
  if (price.feeBreakdown) result.feeBreakdown = Object.fromEntries(Object.entries(price.feeBreakdown).map(([key, value]) => [key, t(value)]))
  if (price.missingFields) result.missingFields = price.missingFields.map(value => t(value))
  if (price.auditNotes) result.auditNotes = price.auditNotes.map(value => t(value))
  if (price.officialAudit) result.officialAudit = presentBenchmarkPrice(price.officialAudit, model, t)
  if (price.costBasis === 'test') {
    result.generationApi = t('原测试渠道：Replicate 官方模型 {id}（生成）', { id: model.modelId })
    result.editApi = t('原测试渠道：Replicate 官方模型 {id}（编辑，1 张源图）', { id: model.modelId })
    result.rateText = t('九题账单已核对：USD {total} ÷ 9 = {mean} USD/张。', { total: price.total, mean: price.usd })
    result.auditNotes = [t('官方定价核验另行保留：{reason}', { reason: t(price.officialAudit?.reason || '') }), ...result.auditNotes.slice(1)]
  }
  return result
}
