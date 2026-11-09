const stageNames = {
  input_understanding: '原文件读取', 'input-understanding': '原文件读取',
  reference_observation: '参考资料分析', reference: '参考资料', planner: '绘图规划',
  stylist: '风格设计', render: '图像渲染', svg_source: '矢量绘制',
  critic: '成图评审', observation: '图像检查', review_status: '评审状态',
  review_resolved: '评审完成', composition: '画面合成', protocol_correction: '格式修正',
};

export function generationStageTitle(stage) {
  return String(stage.title || stageNames[stage.type] || '阶段记录')
    .replace(/\s*[·・]\s*input-understanding/g, '')
    .replace(/^input-understanding$/, '原文件读取');
}

// Ephemeral UI data only: never copy source material, prompts or review text into workspace sync.
export function generationProgressSnapshot(job, { taskId, runId, base, now = Date.now() }) {
  const stages = (job.stages || []).map((stage, index) => ({
    id: stage.id || `${stage.type}-${stage.candidate_id ?? stage.candidateId ?? ''}-${stage.round ?? ''}-${index}`,
    title: generationStageTitle(stage), type: stage.type,
    candidateId: stage.candidate_id ?? stage.candidateId, round: stage.round,
    durationMs: stage.duration_ms ?? stage.durationMs,
    completedAt: stage.completed_at ?? stage.completedAt,
    text: stage.text, suggestion: stage.suggestion, error: stage.error,
    image: stage.image?.url ? { url: stage.image.url } : undefined,
    failed: !!stage.error,
  }));
  // Reference images and critic attachments are not generated previews.
  const preview = [...(job.stages || [])].reverse().find(stage => stage.type === 'render' && !stage.error && stage.image?.url);
  return {
    taskId, runId, base, status: job.status, stages, receivedAt: now, refreshFailed: false,
    createdAt: job.created_at ?? job.createdAt,
    preview: preview ? { id: preview.id || `render-${job.stages.indexOf(preview)}`, url: preview.image.url, title: generationStageTitle(preview) } : null,
  };
}
