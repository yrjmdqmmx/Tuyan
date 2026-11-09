// The complete registry model is required here. This is a display projection;
// execution roles, capabilities, availability and request limits remain intact.
import { catalogCardFacts, mergeCardFacts } from './catalog-card-facts.mjs'
import { modelCardSources, modelSourceName } from './model-card-sources.mjs'
import reviewed from './card-data/reviewed-models.json' with { type: 'json' }
import pages from './card-data/specific-pages.json' with { type: 'json' }

export function registryCardProjection(channel, model, audit, lifecycle, checks) {
  const { fields } = mergeCardFacts(audit, catalogCardFacts(channel, model, reviewed, pages), model)
  const links = modelCardSources({channel, model, audit, fields, lifecycle, checks})
  const sourceUrl = links.sources[0] || null
  return { fields, vendorSources: links.vendorSources, sourceUrl, sourceLabel: sourceUrl ? modelSourceName(links, sourceUrl) : '官方文档', note: audit.note || '' }
}
