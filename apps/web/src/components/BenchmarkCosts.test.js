import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { BenchmarkCaseCost, BenchmarkModelCost } from './BenchmarkEvidencePages.jsx'

test('cost labels distinguish verified, calculated and unavailable amounts', () => {
  const billed = renderToStaticMarkup(React.createElement(BenchmarkCaseCost, { cost: { currency: 'USD', amount: '0.034', basis: 'invoice_reconciled' } }))
  assert.match(billed, /\$0.034 USD/)
  assert.match(billed, /账单已核对/)
  const unknown = renderToStaticMarkup(React.createElement(BenchmarkCaseCost, {}))
  assert.match(unknown, /待核对/)
  assert.doesNotMatch(unknown, /\$0/)
  const total = renderToStaticMarkup(React.createElement(BenchmarkModelCost, { summary: { caseCount: 9, knownCaseCount: 8, billedCaseCount: 0, totals: [{ currency: 'USD', amount: '1.152', billedAmount: '0', calculatedAmount: '1.152', budgetAmount: '0' }] } }))
  assert.match(total, /\$1.152 USD/)
  assert.match(total, /已知金额不代表完整实扣/)
})
