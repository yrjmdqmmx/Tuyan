// The complete registry model is required here. This is a display projection;
// execution roles, capabilities, availability and request limits remain intact.
import { catalogCardFacts, mergeCardFacts } from '../../../apps/web/src/lib/catalogCardFacts.js'
import { modelCardSources, modelSourceName } from '../../../apps/web/src/lib/modelCardSources.js'
import reviewed from '../../../apps/web/src/data/model-card-specifications.json' with { type: 'json' }
import pages from '../../../config/channel-audit/specific-model-page-overrides.json' with { type: 'json' }

export function registryCardProjection(channel, model, audit, lifecycle, checks) {
  const { fields } = mergeCardFacts(audit, catalogCardFacts(channel, model, reviewed, pages), model)
  const links = modelCardSources({channel, model, audit, fields, lifecycle, checks})
  const sourceUrl = links.sources[0] || null
  return { fields, sourceUrl, sourceLabel: sourceUrl ? modelSourceName(links, sourceUrl) : '官方文档', note: audit.note || '' }
}
