// Concrete machine/human examples prevent a permissive predicate from making
// the whole-catalog visibility tests vacuously pass. No network is used.
export const machineSources = [
  'https://api.stability.ai/v2alpha/openapi', 'https://docs.example.test/api/v1/models',
  'https://example.test/openapi/v3', 'https://docs.example.com/spec/openapi.yaml',
  'https://example.test/schema.json?download=1', 'https://example.test/schema.yml',
  'https://example.test/schema.yaml', 'https://api.example.test/v2/generate',
  'https://api.example.test/v2alpha/api-reference', 'https://example.test/api/models',
  'https://example.test/portal/api/model/1', 'https://example.test/swagger-ui/index.html',
  'https://example.test/swagger/v1', 'https://example.test/portal/%61pi/model/1',
  'https://replicate.com/owner/model/api/schema',
]
export const humanSources = [
  'https://docs.example.com/api/v2/generate',
  'https://fal.ai/models/owner/model/api', 'https://docs.example.com/api/models/example',
  'https://developers.openai.com/api/docs/models/gpt-6',
  'https://api-docs.deepseek.com/quick_start/pricing',
  'https://api.volcengine.com/api-docs/view?action=ImageGenerations',
  'https://example.test/api-reference/exact', 'https://example.test/a/api/detail',
  'https://platform.stability.ai/docs/api-reference#tag/Generate',
]
