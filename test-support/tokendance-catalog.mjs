// Offline fixture shared by local preview and catalog counts; never production.
import snapshot from '../config/channel-audit/tokendance-catalog-snapshot-20261109.json' with { type: 'json' }

export function tokenDanceCatalogResponse(mode = 'snapshot') {
  if (mode === 'timeout') throw new DOMException('Offline catalog timeout fixture', 'TimeoutError')
  if (mode === 'empty') return Response.json({ data: [] })
  if (mode !== 'snapshot') throw new Error('Unknown TUYAN_PREVIEW_TOKENDANCE_CATALOG mode: ' + mode)
  return Response.json({ data: snapshot.data })
}
