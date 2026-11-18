// Only the display inputs consumed by the R10/R12 historical reports.
import { rowsOf } from './model-card-audit.mjs'

export function r10Presentation(card, icons) {
  return {
    sources: card.sources,
    modalities: ['inputModalities', 'outputModalities'].map(field =>
      icons(null, card.fields[field]).map(({ id, state }) => [id, state])),
  }
}

export function r10Rows(registry, card, icons) {
  return rowsOf(registry).map(({ channel, model }) => ({
    key: channel + '/' + model.id,
    full: r10Presentation(card(channel, model), icons),
    minimal: r10Presentation(card(channel, { id: model.id }), icons),
  }))
}

export function r12Models(staticRegistry, registry) {
  const models = new Map(rowsOf(staticRegistry).map(({ channel, model }) => [channel + '/' + model.id, model]))
  for (const { channel, model } of rowsOf(registry)) models.set(channel + '/' + model.id, model)
  return models
}

export function r12Links(rows, card, modelFor) {
  return rows.map(row => ({ key: row.channel + '/' + row.modelId,
    url: card(row.channel, modelFor(row)).sources[0] || null }))
}

export function r12SourceUrls(before, ...links) {
  return [...new Set([
    ...before.rows.flatMap(row => [row.oldUrl, row.r11Url]),
    ...before.staticApiOnlyRows.map(row => row.oldUrl),
    ...links.flatMap(rows => rows.map(row => row.url)),
  ].filter(Boolean))].sort()
}

export function r12SourcePolicy(urls, policy, checks) {
  return urls.map(url => ({ key: url, api: policy.isApiSource(url, checks),
    dead: policy.isDeadSource(url), specificity: policy.sourceSpecificity(url) }))
}

export const projectionPaths = {
  r10: ['full/sources', 'full/modalities', 'minimal/sources', 'minimal/modalities'],
  r12Full: ['url'],
  r12Static: ['url'],
  r12Policy: ['api', 'dead', 'specificity'],
}
