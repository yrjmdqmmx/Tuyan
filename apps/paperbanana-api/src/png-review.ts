import { parsePngDecision } from '../../../packages/api/src/png-workflow.js'
import { operationalMetrics } from './operational-metrics.js'

/** Count validated review outcomes, independently of successful image delivery.
 * This is a local parser only: a protocol failure never triggers a paid retry.
 */
export function parsePngReviewDecision(...args: Parameters<typeof parsePngDecision>) {
  try {
    const decision = parsePngDecision(...args)
    operationalMetrics.increment(decision.passed ? 'review.png_passed' : 'review.png_issues_found')
    return decision
  } catch (error) {
    operationalMetrics.increment('review.png_protocol_failed')
    throw error
  }
}
