const assert = require('node:assert/strict')

const {
  formatImageAsset,
  formatOutputFormat,
  normalizeOutputFormat,
} = require('../miniprogram/utils/job-assets.js')

assert.equal(normalizeOutputFormat('svg'), 'svg')
assert.equal(normalizeOutputFormat('SVG'), 'svg')
assert.equal(normalizeOutputFormat('png'), 'png')
assert.equal(normalizeOutputFormat('webp'), 'png')
assert.equal(formatOutputFormat('svg'), 'SVG 矢量图')
assert.equal(formatOutputFormat('png'), 'PNG 图片')

assert.deepEqual(
  formatImageAsset(
    {
      filename: 'figure.svg',
      mime_type: 'image/svg+xml',
      url: 'https://example.com/figure.svg',
    },
    { fallbackFilename: 'candidate-1', fallbackFormat: 'png' },
  ),
  {
    filename: 'figure.svg',
    url: 'https://example.com/figure.svg',
    candidate_id: 0,
    mime_type: 'image/svg+xml',
    format: 'svg',
    format_text: 'SVG',
    can_preview: false,
    action_label: '下载文件',
    object_key: '',
  },
)

assert.deepEqual(
  formatImageAsset(
    {
      filename: '',
      mimeType: 'image/png',
      url: 'data:image/png;base64,abc',
      candidateId: 2,
    },
    { fallbackFilename: 'candidate-2', fallbackFormat: 'svg' },
  ),
  {
    filename: 'candidate-2',
    url: 'data:image/png;base64,abc',
    candidate_id: 2,
    mime_type: 'image/png',
    format: 'png',
    format_text: 'PNG',
    can_preview: true,
    action_label: '保存图片',
    object_key: '',
  },
)

console.log('job-assets.test.cjs passed')
