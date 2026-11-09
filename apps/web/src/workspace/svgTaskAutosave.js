import {journalDraft,readSvgDraft,saveSvgDraft,retireSvgDraft} from '../lib/svgDrafts.js';

// A short pause creates an immutable task version. Keystrokes and drags only
// update the recovery journal; they never create a separate task or call a model.
export class SvgTaskAutosave {
  constructor({key,taskId,versionId,svg,saved,onSave,onChange,delay=900}) {
    Object.assign(this,{key,taskId,parentId:versionId||null,svg,committed:svg,onSave,onChange,delay});
    this.candidateId=saved?.candidateId||versionId||'blank';
    this.meta={writer:crypto.randomUUID(),baseRevision:saved?.revision||0,revision:saved?.revision||0};
    this.queue=Promise.resolve();this.pending=null;this.inFlight=null;this.error='';this.closed=false;this.paused=false;
  }
  get dirty(){return this.svg!==this.committed || !!this.pending;}
  emit(){this.onChange?.();}
  write() {
    const draft={...this.meta,revision:++this.meta.revision,key:this.key,taskId:this.taskId,candidateId:this.candidateId,svg:this.svg,updatedAt:Date.now(),geometryAcknowledged:!!this.geometry,manual:true,autoSave:true,baseVersionId:this.parentId||'blank',resumeVersionId:this.pending?.versionId||this.parentId||'blank'};
    journalDraft(draft);
    this.queue=this.queue.catch(()=>{}).then(()=>saveSvgDraft(draft));
    this.queue.catch(error=>{this.error=error.message;this.emit();});
  }
  preserveBackup() {
    const scope=JSON.parse(this.key);
    this.key=JSON.stringify([...scope.slice(0,3),`${scope[3]}:edit:${this.meta.writer}`]);
    this.meta={writer:this.meta.writer,baseRevision:0,revision:0};
    this.hasUnrestoredBackup=false;
  }
  change(svg) {
    if(svg===this.svg)return;
    this.svg=svg;this.error='';this.write();this.schedule();this.emit();
  }
  schedule(delay=this.delay) {
    clearTimeout(this.timer);
    if(!this.closed&&!this.paused&&this.dirty)this.timer=setTimeout(()=>void this.flush(),delay);
  }
  pause(value){this.paused=value;if(value)clearTimeout(this.timer);else this.schedule();}
  flush() {
    clearTimeout(this.timer);
    if(this.inFlight)return this.inFlight;
    if(!this.dirty||this.paused)return Promise.resolve();
    this.pending ||= {svg:this.svg,versionId:crypto.randomUUID(),runId:crypto.randomUUID(),parentId:this.parentId};
    // This pointer allows recovery after a task version commits but before the
    // editor can retire its journal (including closing the tab during a save).
    this.followVersionId=this.pending.versionId;this.error='';this.write();
    this.inFlight=this.commit().finally(()=>{
      this.inFlight=null;this.emit();
      if(this.dirty&&!this.error){if(this.closed)void this.flush();else this.schedule();}
      else if(this.error)this.schedule(5000);
    });
    this.emit();return this.inFlight;
  }
  async commit() {
    try {
      const pending=this.pending;
      await this.queue;
      const stored=await readSvgDraft(this.key);
      const committed=stored?.writer===this.meta.writer&&stored.svg===pending.svg?stored:null;
      await this.onSave(pending.svg,{versionId:pending.versionId,runId:pending.runId,parentId:pending.parentId});
      this.parentId=pending.versionId;this.committed=pending.svg;this.pending=null;
      // Edits made during the request are kept and saved in the next batch.
      if(this.svg!==this.committed)this.write();
      if(committed)await retireSvgDraft(this.key,committed).catch(()=>{});
      this.error='';
    }catch(error){this.error=error.message;}
  }
  close(){this.closed=true;clearTimeout(this.timer);void this.flush();}
}
