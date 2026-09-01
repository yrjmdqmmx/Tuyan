import { APP_BASE_URL, appPath } from './appPaths.js'

export const LEADERBOARD_AXES = Object.freeze([
  Object.freeze({ id: 'faithfulness', slug: 'faithfulness', label: '忠实度' }),
  Object.freeze({ id: 'conciseness', slug: 'conciseness', label: '简洁度' }),
  Object.freeze({ id: 'readability', slug: 'readability', label: '可读性' }),
  Object.freeze({ id: 'aesthetics', slug: 'aesthetics', label: '美观度' }),
  Object.freeze({ id: 'text_accuracy', slug: 'text-accuracy', label: '文字 / 符号' }),
  Object.freeze({ id: 'topology', slug: 'topology', label: '拓扑关系' }),
  Object.freeze({ id: 'instruction_adherence', slug: 'instruction-adherence', label: '指令遵从' }),
])

export const SCIENTIFIC_LEADERBOARD_AXES = Object.freeze([
  Object.freeze({ id: 'scientific_faithfulness', slug: 'scientific-faithfulness', label: '科研忠实度' }),
  Object.freeze({ id: 'structural_topology', slug: 'structural-topology', label: '结构拓扑' }),
  Object.freeze({ id: 'text_symbol_accuracy', slug: 'text-symbol-accuracy', label: '文字符号' }),
  Object.freeze({ id: 'quantitative_accuracy', slug: 'quantitative-accuracy', label: '数值图表' }),
  Object.freeze({ id: 'instruction_adherence', slug: 'instruction-adherence', label: '指令遵从' }),
  Object.freeze({ id: 'readability_visual_hierarchy', slug: 'readability-visual-hierarchy', label: '信息层级 / 可读性' }),
  Object.freeze({ id: 'information_density', slug: 'information-density', label: '信息密度' }),
  Object.freeze({ id: 'publication_aesthetics', slug: 'publication-aesthetics', label: '发表级美观' }),
  Object.freeze({ id: 'edit_target_accuracy', slug: 'edit-target-accuracy', label: '编辑目标命中' }),
  Object.freeze({ id: 'non_target_preservation', slug: 'non-target-preservation', label: '非目标保持' }),
])

const DIMENSION_BY_SLUG = new Map([...LEADERBOARD_AXES, ...SCIENTIFIC_LEADERBOARD_AXES].map((axis) => [axis.slug, axis]))
const CASE_IDS = new Set([
  'complex_topology-05', 'bilingual_terms-01', 'math_symbols-01', 'negative_constraints-05',
  'scientific-gen-01-method-flow', 'scientific-gen-02-biological-pathway', 'scientific-gen-03-model-architecture',
  'scientific-gen-04-quantitative-panels', 'scientific-gen-05-math-bilingual', 'scientific-gen-06-controls-negative-constraints',
  'scientific-edit-01-text-label', 'scientific-edit-02-node-arrow', 'scientific-edit-03-color-legend-callout',
])

export function leaderboardDetailHref(pathname, base = APP_BASE_URL) {
  const route = String(pathname || '')
  const query = new URLSearchParams()
  query.set('__route', route)
  return `${appPath('/leaderboard', base)}?${query.toString()}`
}

export function resolveLeaderboardRoute(pathname = '') {
  if (pathname === '/leaderboard' || pathname === '/leaderboard/') {
    return { isLeaderboard: true, methodology: false, dimension: null, invalidSlug: false }
  }
  if (!pathname.startsWith('/leaderboard/')) {
    return { isLeaderboard: false, methodology: false, dimension: null, invalidSlug: false }
  }
  const rawSlug = pathname.slice('/leaderboard/'.length)
  const slug = rawSlug.endsWith('/') ? rawSlug.slice(0, -1) : rawSlug
  if (slug === 'methodology') {
    return { isLeaderboard: true, methodology: true, dimension: null, invalidSlug: false }
  }
  if (slug === 'submit-prompt') {
    return { isLeaderboard: true, methodology: false, dimension: null, invalidSlug: false, promptSubmission: true }
  }
  if (slug === 'admin/prompt-submissions') {
    return { isLeaderboard: true, methodology: false, dimension: null, invalidSlug: false, promptAdmin: true }
  }
  if (slug.startsWith('models/')) {
    try {
      const modelProfileId = decodeURIComponent(slug.slice('models/'.length))
      const profileSegments = modelProfileId.split('/')
      if (modelProfileId && modelProfileId.length <= 300 && !/[?#]/.test(modelProfileId)
        && profileSegments.every((segment) => segment && segment !== '.' && segment !== '..')) {
        return { isLeaderboard: true, methodology: false, dimension: null, invalidSlug: false, modelProfileId }
      }
    } catch {}
    return { isLeaderboard: true, methodology: false, dimension: null, invalidSlug: true }
  }
  if (slug.startsWith('cases/')) {
    const caseId = slug.slice('cases/'.length)
    if (CASE_IDS.has(caseId)) return { isLeaderboard: true, methodology: false, dimension: null, invalidSlug: false, caseId }
    return { isLeaderboard: true, methodology: false, dimension: null, invalidSlug: true }
  }
  const dimension = DIMENSION_BY_SLUG.get(slug) || null
  return { isLeaderboard: true, methodology: false, dimension, invalidSlug: !dimension }
}

export function canonicalizeLeaderboardLocation(location = {}, history = {}, base = APP_BASE_URL) {
  const pathname = String(location.pathname || '')
  const query = new URLSearchParams(location.search || '')
  const fallbackPath = (pathname === '/leaderboard' || pathname === '/leaderboard/') ? query.get('__route') : ''
  if (fallbackPath && (fallbackPath === '/bench' || fallbackPath.startsWith('/bench/'))) {
    query.delete('__route')
    const search = query.toString() ? `?${query.toString()}` : ''
    history.replaceState?.({}, '', `${appPath('/leaderboard', base)}${search}${location.hash || ''}`)
    return { ...location, pathname: '/leaderboard', search }
  }
  if (fallbackPath && (fallbackPath === '/leaderboard' || fallbackPath.startsWith('/leaderboard/'))) {
    query.delete('__route')
    const search = query.toString() ? `?${query.toString()}` : ''
    history.replaceState?.({}, '', `${appPath(fallbackPath, base)}${search}${location.hash || ''}`)
    return { ...location, pathname: fallbackPath, search }
  }
  if (pathname === '/bench' || pathname.startsWith('/bench/')) {
    const canonicalPath = `${appPath('/leaderboard', base)}${location.search || ''}${location.hash || ''}`
    history.replaceState?.({}, '', canonicalPath)
    return { ...location, pathname: '/leaderboard' }
  }
  return location
}
