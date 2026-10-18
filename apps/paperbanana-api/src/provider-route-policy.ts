// Only reviewed API origins may be assigned to a regional proxy. Account-specific
// cloud resources and vendors with HK regional restrictions stay on the SG policy.
export const HONG_KONG_ELIGIBLE_HOSTS: readonly string[] = [
  'openrouter.ai', 'api.x.ai', 'api.novita.ai', 'api.stability.ai',
  'api.together.ai', 'api.ideogram.ai', 'api.runware.ai', 'api.mistral.ai',
  'api.bfl.ai', 'api.us.bfl.ai', 'api.eu.bfl.ai', 'queue.fal.run', 'api.fal.ai',
  'external.api.recraft.ai', 'api.replicate.com', 'api.minimax.io',
]

export const DIRECT_ELIGIBLE_HOSTS: readonly string[] = [
  'tokendance.space', 'ark.cn-beijing.volces.com', 'api.fireworks.ai',
]
