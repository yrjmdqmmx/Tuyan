const DAY = 86_400_000;
export const drawingDay = value => {
  const timestamp = value == null ? NaN : new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp + 8 * 3600_000).toISOString().slice(0,10) : '';
};
export const shiftDrawingDay = (day, amount) => new Date(Date.parse(`${day}T00:00:00Z`) + amount * DAY).toISOString().slice(0,10);

export function summarizeDrawingDays(counts, now = new Date(), extra = {}) {
  const today = drawingDay(now);
  const days = Object.entries(counts).filter(([date,count]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= today && Number.isSafeInteger(count) && count>0).sort(([a],[b])=>a.localeCompare(b)).map(([date,count])=>({date,count}));
  let total=0, peak=0, longestStreak=0, streak=0, previous='';
  for (const day of days) {
    total+=day.count; peak=Math.max(peak,day.count);
    streak=previous && shiftDrawingDay(previous,1)===day.date ? streak+1 : 1;
    longestStreak=Math.max(longestStreak,streak); previous=day.date;
  }
  // A streak remains current during today if the user drew yesterday.
  const currentStreak=previous===today || previous===shiftDrawingDay(today,-1) ? streak : 0;
  return {contractVersion:1,timeZone:'Asia/Shanghai',today,days,total,peak,longestStreak,currentStreak,...extra};
}

export async function drawingActivityFromJobs(jobs, now = new Date()) {
  const counts={}, seen=new Set(); let estimatedDateImages=0, undatedImages=0;
  for await (const job of jobs) {
    const id=String(job._id || job.id || '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const success=['succeeded','completed'].includes(job.status);
    const delivered=new Set();
    for (const [index,image] of (job.resultImages || job.result_images || []).entries()) {
      if (!image) continue;
      const candidate=image.candidateId ?? image.candidate_id;
      if (!success && (candidate==null || !(job.candidateProgress || []).some(p=>String(p.candidateId)===String(candidate) && p.status==='succeeded'))) continue;
      if (!/image\/(png|svg\+xml)/i.test(image.mimeType || image.mime_type || '') && !/\.(png|svg)$/i.test(image.filename || image.objectKey || '')) continue;
      const key=candidate!=null ? `candidate:${candidate}` : image.objectKey || image.filename || `index:${index}`;
      if (delivered.has(key)) continue;
      delivered.add(key);
      const exact=drawingDay(image.deliveredAt || job.completedAt || job.completed_at);
      const date=exact || drawingDay(job.createdAt || job.created_at);
      if (!date || date>drawingDay(now)) { undatedImages++; continue; }
      if (!exact) estimatedDateImages++;
      counts[date]=(counts[date] || 0)+1;
    }
  }
  return summarizeDrawingDays(counts,now,{estimatedDateImages,undatedImages,scope:'available-server-deliveries'});
}
