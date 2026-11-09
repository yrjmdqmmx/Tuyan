import { newWorkspace, workspaceReducer as reduce } from './workspaceState.js';

// Hand-authored local test illustrations. They are never described as model output.
export function sampleSvg(label = 'A', modified = false, shape = 'landscape') {
  const accent = modified ? '#58748a' : label === 'B' ? '#797b58' : '#3e7264';
  const flow = [['Research question', 'Scientific objective'], ['Evidence extraction', 'Methods · constraints'], ['Visual planning', 'Structure · relationships'], ['Figure &amp; review', 'Candidates · iteration']];
  if (shape === 'portrait') return `<svg xmlns="http://www.w3.org/2000/svg" width="580" height="1000" viewBox="0 0 580 1000"><rect width="580" height="1000" fill="white"/><g font-family="Arial,sans-serif"><text x="52" y="58" font-size="11" letter-spacing="2" fill="${accent}">TUYAN · LOCAL PORTRAIT FIXTURE ${label}</text><text x="52" y="102" font-size="28" font-weight="600" fill="#26332d">A scientific workflow</text><text x="52" y="132" font-size="14" fill="#798172">Research evidence to a clear figure</text>${flow.map(([title,subtitle], i) => `<rect x="52" y="${190+i*165}" width="476" height="124" rx="8" fill="#f5f8f4" stroke="#d9e1d5"/><circle cx="84" cy="${223+i*165}" r="14" fill="${accent}"/><text x="84" y="${228+i*165}" text-anchor="middle" font-size="14" fill="white">${i+1}</text><text x="114" y="${231+i*165}" font-size="22" fill="#26332d">${title}</text><text x="114" y="${269+i*165}" font-size="16" fill="#798172">${subtitle}</text>${i<3?`<path d="M290 ${322+i*165}v23m-5-6 5 6 5-6" stroke="${accent}" stroke-width="2" fill="none"/>`:''}`).join('')}<path d="M52 901H528" stroke="#e5e9e1"/><text x="52" y="932" font-size="13" fill="#798172">Local layout fixture · No model inference</text></g></svg>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="580" viewBox="0 0 1000 580"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="${accent}"/></marker></defs><rect width="1000" height="580" fill="#fff"/><g font-family="Arial,sans-serif"><text x="64" y="62" font-size="11" letter-spacing="2.5" fill="${accent}">TUYAN · LOCAL UI FIXTURE ${label}</text><text x="64" y="105" font-size="27" font-weight="600" fill="#26332d">From research evidence to a clear scientific figure</text><text x="64" y="135" font-size="14" fill="#7b8279">An illustrative workflow for interaction testing — no model inference</text>${flow.map(([name,sub],i) => { const x=64+i*223,y=215+(label==='B'&&i%2?35:0);return `<rect x="${x}" y="${y}" width="194" height="114" rx="10" fill="${i===3?'#eef3ed':'#f8faf6'}" stroke="#d9e1d5"/><circle cx="${x+23}" cy="${y+25}" r="11" fill="${accent}"/><text x="${x+23}" y="${y+29}" font-size="11" text-anchor="middle" fill="white">${i+1}</text><text x="${x+16}" y="${y+62}" font-size="16" font-weight="500" fill="#29362f">${name}</text><text x="${x+16}" y="${y+88}" font-size="12" fill="#798172">${sub}</text>${i<3?`<path d="M${x+196} ${y+56}L${x+217} ${y+56}" fill="none" stroke="${accent}" stroke-width="1.5" marker-end="url(#arrow)"/>`:''}`;}).join('')}<path d="M830 375V415H380V375" fill="none" stroke="${accent}" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#arrow)"/><text x="540" y="443" font-size="13" fill="${accent}">Versioned refinement</text><path d="M64 490H930" stroke="#e5e9e1"/><text x="64" y="520" font-size="12" fill="#88917f">Original evidence stays intact · Each revision has an explicit parent</text><text x="930" y="520" font-size="12" text-anchor="end" fill="#88917f">${modified?'Revised palette':'Candidate '+label}</text></g></svg>`;
}
export async function sampleAsset(format, label = 'A', modified = false, shape = 'landscape') {
  const svg = sampleSvg(label, modified, shape), svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  if (format === 'svg') return { format, url: svgUrl };
  const img = new Image(); img.src = svgUrl; await img.decode();
  const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
  canvas.getContext('2d').drawImage(img, 0, 0);
  return { format: 'png', url: canvas.toDataURL('image/png') };
}
export async function exampleWorkspace(shape = 'landscape') {
  const taskId = shape === 'portrait' ? 'example-task-portrait' : 'example-task';
  let s = newWorkspace(taskId);
  const act = (type, rest = {}) => { s = reduce(s, { type, ...rest }); };
  act('RENAME', { title: `${shape === 'portrait' ? '竖版研究流程' : '研究证据到学术图示'} · 示例` });
  act('EDIT_DRAFT', { patch: { text: '展示研究证据、方法提取、视觉规划与图像评审之间的关系。', mode: 'advanced' } });
  act('BEGIN', { runId: 'example-png' }); act('ACCEPT', { taskId, runId: 'example-png' });
  for (const label of ['A', 'B', 'C']) act('RESULT', { taskId, runId: 'example-png', candidateId: label, label, version: { id: `png-${label}-v1`, ...await sampleAsset('png', label, false, shape) } });
  act('FINISH', { taskId, runId: 'example-png' });
  act('REFINE', { versionId: 'png-B-v1' }); act('EDIT_DRAFT', { patch: { text: '保持布局，把强调色调整为蓝灰色。' } });
  act('BEGIN', { runId: 'example-refine' }); act('ACCEPT', { taskId, runId: 'example-refine' });
  act('RESULT', { taskId, runId: 'example-refine', version: { id: 'png-B-v2', ...await sampleAsset('png', 'B', true, shape) } });
  act('FINISH', { taskId, runId: 'example-refine' });
  act('SET_PATH', { path: 'svg' }); act('EDIT_DRAFT', { patch: { text: '用矢量图表达同一工作流程。' } });
  act('BEGIN', { runId: 'example-svg' }); act('ACCEPT', { taskId, runId: 'example-svg' });
  act('RESULT', { taskId, runId: 'example-svg', candidateId: 'svg-A', label: 'A', version: { id: 'svg-A-v1', ...await sampleAsset('svg', 'A', false, shape) } });
  act('FINISH', { taskId, runId: 'example-svg' });
  act('SET_PATH', { path: 'png' }); act('VIEW', { versionId: 'png-B-v2' });
  return s;
}
