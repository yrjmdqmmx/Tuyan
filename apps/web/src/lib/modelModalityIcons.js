const modalities = [
  { id: 'text', label: '文本' },
  { id: 'image', label: '图像' },
  { id: 'audio', label: '音频' },
  { id: 'video', label: '视频' },
]

// Preserve uncertainty and qualifications instead of deriving capabilities from roles.
export function modalityIconStates(value) {
  const known = typeof value === 'string' && modalities.some(({ label }) => value.includes(label))
  const items = value?.includes('文件') ? [...modalities, { id: 'file', label: '文件' }] : modalities
  return items.map(item => {
    const segment = known ? value.split(/[、；]/).find(part => part.includes(item.label)) : null
    return {
      ...item,
      state: !known ? 'unknown' : !segment ? (value.includes('其他模态待确认') ? 'unknown' : 'unlisted') : /有限|需/.test(segment) ? 'conditional' : 'supported',
      detail: segment || '',
    }
  })
}
