import { changeControl } from './menu-helpers.mjs';
import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {render,screen,cleanup,waitFor,fireEvent,act} from '@testing-library/react';
import {indexedDB} from 'fake-indexeddb';
import {parseSvg,changeSvg,findSvgNode,groupSvg,ungroupSvg,selectionOwner,setSvgAttribute,arrowPoints,setArrowPoints,historyChange,historyStep,svgHistory} from '../src/lib/svgDocument.js';
import {saveSvgDraft,readSvgDraft,journalDraft,listSvgDrafts,svgDraftKey} from '../src/lib/svgDrafts.js';
import {svgCandidates,useSvgWorkspace,hasEncodedData,svgTaskRunning} from '../src/lib/svgGeneration.js';
import SvgResultWorkspace from '../src/components/SvgResultWorkspace.jsx';
import GenerationWorkspace from '../src/components/GenerationWorkspace.jsx';
import SvgEditorCanvas from '../src/components/SvgEditorCanvas.jsx';
import {primaryFont,probeLocalFont} from '../src/lib/svgTypography.js';
window.indexedDB=indexedDB;
const wrap=content=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">${content}</svg>`;
const rich=wrap(`<defs><linearGradient id="grad"><stop offset="0" style="stop-color:#fff"/><stop offset="1" stop-color="#abc"/></linearGradient><marker id="tip" viewBox="0 0 10 10"><path d="M0 0 L10 5 L0 10Z"/></marker><clipPath id="clip"><rect width="100" height="40"/></clipPath></defs><g id="flow" transform="translate(20 30)"><rect id="box" width="100" height="40" fill="url(#grad)"/><text id="label" x="5" y="25">图研 α ∑ x<tspan dy="-5">2</tspan></text></g><line id="arrow" x1="100" y1="80" x2="300" y2="80" stroke="#234" marker-end="url(#tip)"/><g clip-path="url(#clip)"><image width="20" height="20" href="data:image/png;base64,iVBORw0KGgo="/></g>`);
const originalFetch=globalThis.fetch;
afterEach(()=>{cleanup();globalThis.fetch=originalFetch;window.localStorage.clear();window.indexedDB=indexedDB;});
test('native round trip preserves Unicode text, defs references, markers, grouping, clipping and embedded image',()=>{
 const parsed=parseSvg(rich),again=parseSvg(parsed.svg);
 assert.equal(again.svg,parsed.svg);assert.equal(again.root.querySelector('text').textContent,'图研 α ∑ x2');
 for(const tag of ['linearGradient','marker','clipPath','image','tspan'])assert.ok(again.root.querySelector(tag));
 assert.equal(again.root.querySelector('line').getAttribute('marker-end'),'url(#tip)');
 assert.equal(again.root.querySelector('#flow').getAttribute('transform'),'translate(20 30)');
 const id=again.root.querySelector('#box').getAttribute('data-tuyan-id');
 const changed=changeSvg(again.svg,root=>setSvgAttribute(findSvgNode(root,id),'fill','#f00'));
 assert.equal(parseSvg(changed).root.querySelector('#box').getAttribute('fill'),'#f00');
 assert.equal(parseSvg(rich).root.querySelector('#box').getAttribute('fill'),'url(#grad)');
});
test('incomplete and hostile SVG never becomes a displayable document',()=>{
 const bad=['<svg xmlns="http://www.w3.org/2000/svg"><g>',wrap('<path fill="url(#later)"/>'),wrap('<script>alert(1)</script>'),wrap('<rect onload="x()"/>'),wrap('<foreignObject/>'),wrap('<image href="https://remote.test/x.png"/>'),wrap('<image href="data:image/svg+xml;base64,abc"/>'),wrap('<style>@import "https://x";</style>'),wrap('<style>:host{display:none}</style>'),wrap('<rect style="fill:u\\72l(https://x)"/>'),wrap('<use id="u" href="#u"/>'),wrap('<rect id="x"/><text id="x"/>'),wrap('<animate/>'),wrap('<filter><feImage href="https://remote.test/image.svg"/></filter>')];
 for(const svg of bad)assert.throws(()=>parseSvg(svg),undefined,svg);
 assert.ok(parseSvg(wrap('<style>.label {fill:#123;font-size:18px}</style><text class="label">中文</text>')));
});
test('group/ungroup and history preserve transformations and keep exact editable text',()=>{
 const p=parseSvg(wrap('<rect x="10" width="20" height="20"/><text x="40" y="30">文字</text>'));
 const ids=[...p.root.children].map(n=>n.getAttribute('data-tuyan-id'));
 const grouped=changeSvg(p.svg,root=>groupSvg(root,ids));
 const group=parseSvg(grouped).root.querySelector('g');
 const ungrouped=changeSvg(grouped,root=>ungroupSvg(root,[group.getAttribute('data-tuyan-id')]));
 assert.equal(parseSvg(ungrouped).root.querySelectorAll('g').length,0);
 let history=historyChange(svgHistory(p.svg),grouped);history=historyChange(history,ungrouped);
 assert.equal(historyStep(history,'undo').present,grouped);assert.equal(historyStep(historyStep(history,'undo'),'redo').present,ungrouped);
});
test('arrows remain lines with independently editable endpoints and existing marker',()=>{
 const p=parseSvg(rich),line=p.root.querySelector('line'),id=line.getAttribute('data-tuyan-id');
 assert.deepEqual(arrowPoints(line),[100,80,300,80]);
 const next=changeSvg(p.svg,root=>setArrowPoints(findSvgNode(root,id),[110,90,330,90]));
 assert.equal(parseSvg(next).root.querySelector('line').getAttribute('marker-end'),'url(#tip)');
 assert.deepEqual(arrowPoints(parseSvg(next).root.querySelector('line')),[110,90,330,90]);
});
test('draft recovery, candidate/account isolation and conflicting writers are explicit',async()=>{
 const key=svgDraftKey('/api','alice','draft-test',0),draft={key,writer:'a',revision:1,baseRevision:0,svg:parseSvg(rich).svg,updatedAt:1};
 journalDraft(draft);assert.equal((await readSvgDraft(key)).recovered,true);
 await saveSvgDraft(draft);assert.equal((await readSvgDraft(key)).revision,1);
 assert.equal(await readSvgDraft(svgDraftKey('/api','bob','draft-test',0)),null);
 assert.equal(await readSvgDraft(svgDraftKey('/api','alice','draft-test',1)),null);
 await assert.rejects(saveSvgDraft({...draft,writer:'b',revision:2}),/另一个页面/);
 assert.equal((await readSvgDraft(key)).writer,'a');
});
test('genuine stage versions and final candidates are selected without inventing token streaming',()=>{
 const job={status:'running',num_candidates:2,stages:[{id:'read',type:'planner'},{id:'v1',type:'svg_source',round:0,candidate_id:1,image:{url:'/v1.svg',filename:'v1.svg'}},{id:'png',type:'render',image:{url:'/p.png'}}]};
 assert.equal(svgCandidates(job)[1].versions[0].key,'v1');assert.equal(svgCandidates(job)[0].versions.length,0);
 assert.equal(svgTaskRunning(job),true);assert.equal(svgTaskRunning({...job,status:'failed'}),false);
 assert.equal(useSvgWorkspace({output_format:'svg',result_images:[{mime_type:'image/png',url:'/plot.png'}]},'svg'),false);
 assert.equal(hasEncodedData({generationPath:'model-v1',figureTypeId:'bar'}),true);
});
test('workspace retains previous SVG when an incomplete revision arrives and unlocks on terminal failure',async()=>{
 globalThis.fetch=async url=>new Response(String(url).endsWith('bad.svg')?'<svg><g>':rich);
 let job={id:'lifecycle',output_format:'svg',status:'running',stages:[{id:'v1',type:'svg_source',candidate_id:0,title:'SVG v1',image:{url:'/v1.svg'}}]};
 const view=render(React.createElement(SvgResultWorkspace,{job,apiBase:'https://test.local',owner:'a'}));
 await waitFor(()=>assert.ok(document.querySelector('.svg-document-host').shadowRoot?.querySelector('text')));
 assert.equal(screen.getByRole('button',{name:'保存',exact:true}).disabled,true);
 job={...job,stages:[...job.stages,{id:'v2',type:'svg_source',candidate_id:0,title:'SVG v2',image:{url:'/bad.svg'}}]};
 view.rerender(React.createElement(SvgResultWorkspace,{job,apiBase:'https://test.local',owner:'a'}));
 await screen.findByRole('alert');assert.equal(document.querySelector('.svg-document-host').shadowRoot.querySelector('text').textContent,'图研 α ∑ x2');
 view.rerender(React.createElement(SvgResultWorkspace,{job:{...job,status:'failed'},apiBase:'https://test.local',owner:'a'}));
 await waitFor(()=>assert.equal(screen.getByRole('button',{name:'保存',exact:true}).disabled,false));
 assert.ok(screen.getByText(/任务未完成/));
});
test('unavailable IndexedDB recovers journal and exposes it in reopen list without claiming a durable save',async()=>{
 const key=svgDraftKey('/api','recovery','closed-page',0);
 journalDraft({key,taskId:'closed-page',candidateId:0,revision:3,svg:parseSvg(rich).svg,updatedAt:1});
 window.indexedDB={open(){throw new Error('storage unavailable');}};
 await assert.rejects(saveSvgDraft({key}),/storage unavailable/);
 const recovered=await readSvgDraft(key);assert.equal(recovered.recovered,true);assert.equal(recovered.revision,3);
 assert.equal((await listSvgDrafts('/api','recovery'))[0].taskId,'closed-page');
 await assert.rejects(listSvgDrafts('/api','someone-else'),/storage unavailable/);
});
test('manual draft remains separate from later AI versions and returns after running task ends',async()=>{
 const original=parseSvg(wrap('<text x="20" y="30">Original</text>')).svg;
 const edited=parseSvg(wrap('<text x="20" y="30">Manual version</text>')).svg;
 const key=svgDraftKey('https://new-version.test','user','version-resume',0);
 await saveSvgDraft({key,taskId:'version-resume',candidateId:0,writer:'first',revision:1,baseRevision:0,manual:true,svg:edited,base:{key:'v1',raw:original,svg:original},updatedAt:1});
 globalThis.fetch=async()=>new Response(wrap('<text x="20" y="30">Actual AI revision</text>'));
 const job={id:'version-resume',status:'running',output_format:'svg',stages:[{id:'v2',type:'svg_source',candidate_id:0,title:'SVG v2',image:{url:'/v2.svg'}}]};
 const view=render(React.createElement(SvgResultWorkspace,{job,apiBase:'https://new-version.test',owner:'user'}));
 const visible=()=>document.querySelector('.svg-document-host').shadowRoot?.querySelector('text')?.textContent;
 await waitFor(()=>assert.equal(visible(),'Actual AI revision'));
 assert.equal(screen.getByRole('button',{name:'保存',exact:true}).disabled,true);
 view.rerender(React.createElement(SvgResultWorkspace,{job:{...job,status:'succeeded'},apiBase:'https://new-version.test',owner:'user'}));
 await waitFor(()=>assert.equal(visible(),'Manual version'));
 assert.ok(screen.getByText(/原有评审只属于原始生成版本/));
 assert.ok(screen.getByText(/未自动合并或覆盖/));
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'查看原始版本'})));assert.equal(visible(),'Actual AI revision');
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'返回手工稿'})));assert.equal(visible(),'Manual version');
});
test('group operations refuse to silently alter CSS selectors and compositing',()=>{
 const css=parseSvg(wrap('<style>g rect{fill:red}</style><g><rect width="30" height="20"/></g>'));
 assert.throws(()=>ungroupSvg(css.root,[css.root.querySelector('g').getAttribute('data-tuyan-id')]),/样式表/);
 const opacity=parseSvg(wrap('<g opacity="0.5"><rect width="30" height="20"/><rect x="10" width="30" height="20"/></g>'));
 assert.throws(()=>ungroupSvg(opacity.root,[opacity.root.querySelector('g').getAttribute('data-tuyan-id')]),/整体透明度/);
});
test('transformed and styled groups can be ungrouped then regrouped without losing wrappers or selection ownership',()=>{
 const source=parseSvg(wrap('<g transform="translate(650 360)" fill="#234"><text x="150" y="85">标准化 α ≤ β</text><text x="150" y="135">x / x₀</text></g>'));
 const groupId=source.root.querySelector('g').getAttribute('data-tuyan-id');
 const ids=[...source.root.querySelectorAll('text')].map(n=>n.getAttribute('data-tuyan-id'));
 const ungrouped=changeSvg(source.svg,root=>ungroupSvg(root,[groupId]));
 const regrouped=parseSvg(changeSvg(ungrouped,root=>groupSvg(root,ids)));
 const group=regrouped.root.querySelector('g:not([data-tuyan-wrapper])');
 assert.equal(group.querySelectorAll('[data-tuyan-wrapper]').length,2);
 for(const id of ids){
  const node=findSvgNode(regrouped.root,id);
  assert.equal(node.parentElement.getAttribute('transform'),'translate(650 360)');
  assert.equal(node.parentElement.getAttribute('fill'),'#234');
  assert.equal(selectionOwner(regrouped.root,node),group);
  assert.equal(selectionOwner(regrouped.root,node,true),node);
 }
});
test('metadata stays in the saved SVG without creating foreign live DOM in the canvas',async()=>{
 assert.throws(()=>parseSvg(wrap('<metadata><img xmlns="http://www.w3.org/1999/xhtml" srcset="https://remote.test/private.png"/></metadata>')),/HTML/);
 const source=wrap('<metadata><record xmlns="urn:research">original provenance</record></metadata><text x="20" y="30">Visible</text>');
 assert.ok(parseSvg(source).svg.includes('original provenance'));
 globalThis.fetch=async()=>new Response(source);
 render(React.createElement(SvgResultWorkspace,{job:{id:'metadata-isolation',status:'succeeded',output_format:'svg',result_images:[{url:'/metadata.svg',filename:'metadata.svg'}]},apiBase:'https://metadata.test',owner:'user'}));
 await waitFor(()=>assert.ok(document.querySelector('.svg-document-host').shadowRoot?.querySelector('text')));
 assert.equal(document.querySelector('.svg-document-host').shadowRoot.querySelector('metadata,img'),null);
});
test('safe display of embedded images does not imply compatibility with the narrower AI regeneration path',async()=>{
 globalThis.fetch=async()=>new Response(rich);
 render(React.createElement(SvgResultWorkspace,{job:{id:'ai-subset',status:'succeeded',output_format:'svg',result_images:[{url:'/rich.svg',filename:'rich.svg'}]},apiBase:'https://ai-subset.test',owner:'user',onUseForRefine:()=>assert.fail('must not auto-call AI')}));
 await screen.findByText(/避免有损再生成/);
 assert.equal(screen.queryByRole('button',{name:'AI 修订'}),null);
 assert.equal(screen.getByRole('button',{name:'保存',exact:true}).disabled,false);
});
test('responsive layouts retain the same SVG editor DOM, active candidate and expanded canvas',async()=>{
 globalThis.fetch=async()=>new Response(rich);
 const job={id:'responsive-history',status:'succeeded',output_format:'svg',num_candidates:2,result_images:[{candidate_id:0,url:'/a.svg',filename:'a.svg'},{candidate_id:1,url:'/b.svg',filename:'b.svg'}]};
 const results=React.createElement(SvgResultWorkspace,{job,apiBase:'https://responsive.test',owner:'user'});
 const props={compact:false,preserveResults:true,jobId:job.id,results};
 const view=render(React.createElement(GenerationWorkspace,props));
 await waitFor(()=>assert.ok(document.querySelector('.svg-document-host').shadowRoot?.querySelector('text')));
 fireEvent.click(screen.getByRole('tab',{name:'候选 2'}));fireEvent.click(screen.getByRole('button',{name:'展开画布'}));
 const editor=document.querySelector('.svg-candidate:not([hidden]) .svg-document-host');
 view.rerender(React.createElement(GenerationWorkspace,{...props,compact:true}));
 view.rerender(React.createElement(GenerationWorkspace,{...props,compact:false}));
 assert.equal(document.querySelector('.svg-candidate:not([hidden]) .svg-document-host'),editor);
 assert.equal(screen.getByRole('tab',{name:'候选 2'}).getAttribute('aria-selected'),'true');
 assert.ok(screen.getByRole('button',{name:'收起画布'}));
 await act(async()=>{});
});
test('bulk font and spacing edits reach explicit tspan overrides without flattening scientific notation',async()=>{
 const source=parseSvg(wrap('<defs><linearGradient id="g"><stop offset="0" stop-color="#123"/><stop offset="1" stop-color="#abc"/></linearGradient></defs><g transform="translate(10 20)"><rect width="100" height="50" fill="url(#g)"/><text style="font-family:Missing;letter-spacing:1px">中文 μ ≤ β<tspan dy="-5" style="font-family:Other;letter-spacing:2px">2</tspan></text></g>')).svg;
 let latest=source;
 // jsdom has no SVG layout API. Geometry/selection overlays are checked in the real browser.
 function Harness(){const [svg,setSvg]=React.useState(source);return React.createElement(SvgEditorCanvas,{svg,onChange:next=>{latest=next;setSvg(next);},onError:message=>{if(message!=='node.getBBox is not a function')assert.fail(message);}});}
 render(React.createElement(Harness));
 fireEvent.click(screen.getByRole('button',{name:'图层 / 对象'}));
 fireEvent.click(screen.getByRole('button',{name:'展开 分组'}));
 fireEvent.click(screen.getByRole('button',{name:'对象：文字 · 中文 μ ≤ β2',exact:true}));
 fireEvent.click(screen.getByRole('button',{name:'选择全部文字'}));
 const font=screen.getByRole('textbox',{name:'字体'});changeControl(font,{target:{value:'Liberation Sans, WenQuanYi Micro Hei'}});fireEvent.blur(font);
 const spacing=screen.getByLabelText('字距');changeControl(spacing,{target:{value:'0.5px'}});fireEvent.blur(spacing);
 const word=screen.getByLabelText('词距');changeControl(word,{target:{value:'1'}});fireEvent.blur(word);
 const weight=screen.getByLabelText('字重');changeControl(weight,{target:{value:'700'}});fireEvent.blur(weight);
 const root=parseSvg(latest).root;
 for(const n of root.querySelectorAll('text,tspan')){assert.equal(n.style.fontFamily,'"Liberation Sans", "WenQuanYi Micro Hei"');assert.equal(n.style.letterSpacing,'0.5px');assert.equal(n.style.wordSpacing,'1px');assert.equal(n.style.fontWeight,'700');}
 assert.equal(root.querySelector('text').textContent,'中文 μ ≤ β2');assert.equal(root.querySelector('tspan').getAttribute('dy'),'-5');
 assert.equal(root.querySelector('g').getAttribute('transform'),'translate(10 20)');assert.equal(root.querySelector('rect').getAttribute('fill'),'url(#g)');assert.equal(root.querySelectorAll('path').length,0);
 fireEvent.click(screen.getByRole('button',{name:'外观',exact:true}));
 const opacity=screen.getByLabelText('透明度');changeControl(opacity,{target:{value:'0.5'}});fireEvent.blur(opacity);
 const faded=parseSvg(latest).root;assert.equal(faded.querySelector('text').getAttribute('opacity'),'0.5');assert.equal(faded.querySelector('tspan').hasAttribute('opacity'),false,'nested text opacity must not be multiplied twice');
 await act(async()=>{});
});
test('font lookup distinguishes missing local names from generic families and does not request remote fonts',async()=>{
 const original=globalThis.FontFace,calls=[];
 globalThis.FontFace=class {constructor(name,src){calls.push(src);this.src=src;}load(){return this.src.includes('Absent QA Font')?Promise.reject(new Error('missing')):Promise.resolve(this);}};
 try {
  assert.equal(primaryFont('"Noto Sans CJK SC", sans-serif'),'Noto Sans CJK SC');
  assert.equal(await probeLocalFont('sans-serif'),'generic');
  assert.equal(await probeLocalFont('Absent QA Font'),'unresolved');
  assert.equal(await probeLocalFont('Present QA Font'),'available');
  assert.deepEqual(calls,['local("Absent QA Font")','local("Present QA Font")']);
 }finally{globalThis.FontFace=original;}
});

test('object tree exposes actual groups and nested viewports, omitting defs and transparent wrappers',async()=>{
 const {svgObjectTree}=await import('../src/lib/svgObjects.js');
 const root=parseSvg(wrap('<defs><path id="definition" d="M0 0 L1 1"/></defs><g id="outer"><g data-tuyan-wrapper="true" transform="translate(2 3)"><text>中文 α</text></g><svg viewBox="0 0 20 20"><rect width="5" height="5"/></svg></g>')).root;
 const tree=svgObjectTree(root);
 assert.equal(tree.length,1);assert.equal(tree[0].label,'分组 · outer');assert.equal(tree[0].children.length,2);
 assert.equal(tree[0].children[0].label,'嵌套画布');assert.equal(tree[0].children[1].label,'文字 · 中文 α');
 assert.ok(!JSON.stringify(tree).includes('definition'));
});
test('duplicating independent groups remaps SVG/editor IDs, internal references and id styles without losing shared gradients',async()=>{
 const {duplicateSvgObjects,deleteSvgObjects}=await import('../src/lib/svgObjects.js');
 const source=parseSvg(wrap('<style>#body {fill:#456} .shape {stroke:#abc}</style><defs><linearGradient id="shared"><stop stop-color="#f00"/></linearGradient></defs><g id="pair" transform="rotate(10)"><defs><clipPath id="own"><rect width="30" height="20"/></clipPath></defs><rect id="body" class="shape" width="30" height="20" clip-path="url(#own)"/><use href="#body" x="40"/><text fill="url(#shared)">中文 ∑ ±</text></g>'));
 const originalId=source.root.querySelector('#pair').getAttribute('data-tuyan-id');let newIds;
 const copied=parseSvg(changeSvg(source.svg,root=>{newIds=duplicateSvgObjects(root,[originalId,root.querySelector('#body').getAttribute('data-tuyan-id')]);}));
 assert.equal(newIds.length,1);const clone=findSvgNode(copied.root,newIds[0]);
 assert.equal(clone.getAttribute('transform'),'translate(12 12) rotate(10)');assert.equal(clone.querySelector('text').textContent,'中文 ∑ ±');
 assert.equal(clone.querySelector('use').getAttribute('href'),`#${clone.querySelector('rect[id]').id}`);
 assert.equal(clone.querySelector('rect[id]').getAttribute('clip-path'),`url(#${clone.querySelector('clipPath').id})`);
 assert.equal(clone.querySelector('text').getAttribute('fill'),'url(#shared)');
 assert.ok(copied.root.querySelector('style').textContent.includes(`#${clone.querySelector('rect[id]').id} {fill:#456}`));
 assert.equal(copied.root.querySelector('#pair').outerHTML,source.root.querySelector('#pair').outerHTML);
 const editorIds=[...copied.root.querySelectorAll('[data-tuyan-id]')].map(n=>n.getAttribute('data-tuyan-id'));assert.equal(new Set(editorIds).size,editorIds.length);
 assert.throws(()=>changeSvg(copied.svg,root=>deleteSvgObjects(root,[root.querySelector('#body').getAttribute('data-tuyan-id')])),/引用/);
 const deleted=parseSvg(changeSvg(copied.svg,root=>deleteSvgObjects(root,newIds)));
 assert.equal(deleted.root.querySelectorAll('use').length,1);assert.equal(deleted.root.querySelector('#pair').outerHTML,source.root.querySelector('#pair').outerHTML);
});
test('structural mutations refuse positional CSS and external references, while insertions remain editable native SVG',async()=>{
 const {addSvgObject,deleteSvgObjects,duplicateSvgObjects}=await import('../src/lib/svgObjects.js');
 const css=parseSvg(wrap('<style>rect:nth-child(2){fill:red}</style><rect id="r"/>'));
 for(const change of [root=>addSvgObject(root,'rect'),root=>duplicateSvgObjects(root,[root.querySelector('rect').getAttribute('data-tuyan-id')]),root=>deleteSvgObjects(root,[root.querySelector('rect').getAttribute('data-tuyan-id')])])assert.throws(()=>changeSvg(css.svg,change),/选择器/);
 const ref=parseSvg(wrap('<rect id="r"/><use href="#r"/>'));
 assert.throws(()=>changeSvg(ref.svg,root=>deleteSvgObjects(root,[root.querySelector('rect').getAttribute('data-tuyan-id')])),/引用/);
 const empty=parseSvg(changeSvg(ref.svg,root=>deleteSvgObjects(root,[...root.querySelectorAll('[data-tuyan-id]')].map(n=>n.getAttribute('data-tuyan-id')))));assert.equal(empty.root.children.length,0);
 let svg=parseSvg(wrap('')).svg;const ids=[];
 for(const kind of ['text','rect','roundrect','ellipse','circle','line','arrow'])svg=changeSvg(svg,root=>ids.push(addSvgObject(root,kind,{fontFamily:'Liberation Sans, WenQuanYi Micro Hei'})));
 const result=parseSvg(svg);assert.equal(new Set(ids).size,7);assert.equal(result.root.querySelector('text').textContent,'双击修改文字');
 assert.equal(result.root.querySelectorAll('line').length,2);assert.ok(result.root.querySelector('line[marker-end]'));assert.equal(result.root.querySelector('rect[rx]').getAttribute('rx'),'9');
 assert.equal(result.root.querySelector('text').style.fontFamily,'"Liberation Sans", "WenQuanYi Micro Hei"');assert.equal(result.root.querySelector('image'),null);
});
test('visible object tools use normal history, direct text edits and data/read-only gates',async()=>{
 let latest=parseSvg(wrap('<text x="20" y="40">已有文字 μ</text>')).svg;const errors=[];
 function Harness({readOnly=false,dataProtected=false}){const [history,setHistory]=React.useState(svgHistory(latest));return React.createElement(SvgEditorCanvas,{svg:history.present,readOnly,dataProtected,geometryAllowed:false,onChange:next=>{latest=next;setHistory(h=>historyChange(h,next));},onUndo:()=>setHistory(h=>{const next=historyStep(h,'undo');latest=next.present;return next;}),onRedo:()=>setHistory(h=>{const next=historyStep(h,'redo');latest=next.present;return next;}),canUndo:history.past.length>0,canRedo:history.future.length>0,onError:message=>{if(message!=='node.getBBox is not a function')errors.push(message);}});}
 const view=render(React.createElement(Harness));
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'＋ 文字'})));
 assert.ok(screen.getByRole('textbox',{name:'字体'}),'new text immediately exposes typography controls');
 assert.ok(screen.getByRole('textbox',{name:'直接修改文字'}));changeControl(screen.getByRole('textbox',{name:'直接修改文字'}),{target:{value:'新增 中文 Δ ≤ β'}});await act(async()=>fireEvent.click(screen.getByRole('button',{name:'确定文字'})));
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'复制',exact:true})));assert.equal(parseSvg(latest).root.querySelectorAll('text').length,3);
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'图层 / 对象'})));assert.equal(screen.getAllByRole('button',{name:'对象：文字 · 新增 中文 Δ ≤ β'}).length,2);
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'删除',exact:true})));assert.equal(parseSvg(latest).root.querySelectorAll('text').length,2);
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'撤销',exact:true})));assert.equal(parseSvg(latest).root.querySelectorAll('text').length,3);
 await act(async()=>fireEvent.click(screen.getByRole('button',{name:'重做',exact:true})));assert.equal(parseSvg(latest).root.querySelectorAll('text').length,2);
 const before=latest;view.rerender(React.createElement(Harness,{dataProtected:true}));fireEvent.click(screen.getByLabelText('形状'));await act(async()=>fireEvent.click(screen.getByRole('button',{name:'矩形',exact:true})));assert.equal(latest,before);assert.match(errors.pop(),/数据编码/);
 view.rerender(React.createElement(Harness,{readOnly:true}));assert.equal(screen.getByRole('button',{name:'＋ 文字'}).disabled,true);assert.equal(screen.getByLabelText('形状').getAttribute('aria-disabled'),'true');assert.deepEqual(errors,[]);await act(async()=>{});
});

test('copying a nested panel reuses its global stylesheet without duplicating the cascade',async()=>{
 const {duplicateSvgObjects,deleteSvgObjects}=await import('../src/lib/svgObjects.js');
 const source=parseSvg(wrap('<g><svg viewBox="0 0 200 100"><style>.bar{fill:blue} #bar{stroke:red}</style><rect id="bar" class="bar" width="20" height="30"/></svg></g>'));
 const originalId=source.root.querySelector('g').getAttribute('data-tuyan-id');let ids;
 const copy=parseSvg(changeSvg(source.svg,root=>{ids=duplicateSvgObjects(root,[originalId]);}));
 assert.equal(copy.root.querySelectorAll('style').length,1);assert.equal(findSvgNode(copy.root,ids[0]).querySelectorAll('style').length,0);
 assert.ok(copy.root.querySelector('style').textContent.includes(`#${findSvgNode(copy.root,ids[0]).querySelector('rect').id}{stroke:red}`));
 assert.doesNotThrow(()=>changeSvg(copy.svg,root=>deleteSvgObjects(root,ids)));
 assert.throws(()=>changeSvg(copy.svg,root=>deleteSvgObjects(root,[originalId])),/全局样式表/);
 const previousCopyId=findSvgNode(copy.root,ids[0]).querySelector('rect').id;
 const deleted=changeSvg(copy.svg,root=>deleteSvgObjects(root,ids));
 const second=parseSvg(changeSvg(deleted,root=>{ids=duplicateSvgObjects(root,[originalId]);}));
 assert.notEqual(findSvgNode(second.root,ids[0]).querySelector('rect').id,previousCopyId,'orphan CSS IDs must not be reused');
});

test('grouping independent annotations in a scoped stylesheet preserves all rule matches and original nodes',()=>{
 const p=parseSvg(wrap('<style>#panel .label{fill:red} #panel *{stroke-linejoin:round} text{font-family:Arial}</style><g id="panel"><text class="label">原图 μ</text></g><text id="note">注释 α</text><rect id="border" width="90" height="30" fill="none"/>'));
 const ids=['note','border'].map(id=>p.root.querySelector(`#${id}`).getAttribute('data-tuyan-id'));
 const grouped=parseSvg(changeSvg(p.svg,r=>groupSvg(r,ids))),g=grouped.root.querySelector('#note').parentElement;
 assert.equal(g.localName,'g');assert.equal(grouped.root.querySelector('#panel').outerHTML,p.root.querySelector('#panel').outerHTML);
 const restored=changeSvg(grouped.svg,r=>ungroupSvg(r,[g.getAttribute('data-tuyan-id')]));assert.equal(restored,p.svg);
 for(const css of ['g{opacity:.5}','svg > text{fill:red}','g text{fill:red}','text:nth-child(2){fill:red}']){
  const bad=parseSvg(wrap(`<style>text{fill:red}</style><text>A</text><rect/>`));bad.root.querySelector("style").textContent=css;const original=bad.root.outerHTML;
  assert.throws(()=>groupSvg(bad.root,[...bad.root.querySelectorAll('text,rect')].map(n=>n.getAttribute('data-tuyan-id'))),/样式表/);
  assert.equal(bad.root.outerHTML,original,'rejected grouping cannot partially mutate the source');
 }
});

test('guide controls use source history and drafts, without bypassing read-only or touching data geometry',async()=>{
 const {readSvgGuides}=await import('../src/lib/svgSelection.js');
 let latest=parseSvg(wrap('<g data-tuyan-locked="true"><text>中文 μ ± σ</text><rect width="30" height="40"/></g>')).svg;const original=parseSvg(latest).root.innerHTML;
 function Harness({readOnly=false}){const [history,setHistory]=React.useState(svgHistory(latest));return React.createElement(SvgEditorCanvas,{svg:history.present,readOnly,dataProtected:true,geometryAllowed:false,onChange:next=>{latest=next;setHistory(h=>historyChange(h,next));},onUndo:()=>setHistory(h=>{const n=historyStep(h,'undo');latest=n.present;return n;}),onRedo:()=>setHistory(h=>{const n=historyStep(h,'redo');latest=n.present;return n;}),canUndo:history.past.length>0,canRedo:history.future.length>0,onError:assert.fail});}
 const view=render(React.createElement(Harness));const click=async name=>act(async()=>fireEvent.click(screen.getByRole('button',{name,exact:true})));
 await click('辅助线');await click('＋ 垂直');await click('＋ 水平');assert.equal(readSvgGuides(parseSvg(latest).root).length,2);const both=latest;
 await click('撤销');assert.equal(readSvgGuides(parseSvg(latest).root).length,1);await click('重做');assert.equal(latest,both);
 await click('隐藏辅助线');assert.equal(parseSvg(latest).root.getAttribute('data-tuyan-guides-hidden'),'true');assert.equal(document.querySelectorAll('.svg-guide-line').length,0);
 await click('撤销');assert.equal(latest,both);await click('清空辅助线');assert.equal(readSvgGuides(parseSvg(latest).root).length,0);await click('撤销');assert.equal(latest,both);
 assert.equal(parseSvg(latest).root.innerHTML,original,'guides must never change locked content, text or data geometry');
 view.rerender(React.createElement(Harness,{readOnly:true}));assert.equal(screen.getByRole('button',{name:'＋ 垂直'}).disabled,true);assert.equal(screen.getByLabelText('垂直辅助线 1').disabled,true);assert.equal(screen.getByRole('button',{name:'清空辅助线'}).disabled,true);assert.equal(latest,both);await act(async()=>{});
});

test('legacy static shadow survives edit and save without rasterization',()=>{
 const source=wrap('<defs><filter id="shadow"><feGaussianBlur in="SourceAlpha" stdDeviation="2"/><feOffset dy="2"/><feComponentTransfer><feFuncA type="linear" slope="0.15"/></feComponentTransfer><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><g filter="url(#shadow)"><rect width="100" height="40"/><text id="label">旧版</text></g>');
 const original=parseSvg(source), filter=original.root.querySelector('filter').outerHTML;
 const changed=changeSvg(original.svg,root=>{root.querySelector('#label').textContent='编辑后';});
 assert.equal(parseSvg(changed).root.querySelector('filter').outerHTML,filter);
 assert.equal(parseSvg(changed).root.querySelector('#label').textContent,'编辑后');
 assert.equal(parseSvg(changed).root.querySelector('image'),null);
 assert.match(parseSvg(changed).root.querySelector('g').getAttribute('filter'),/#shadow/);
});

test('legacy symbol definitions and static shadow filters survive editing and reopening without rasterization',()=>{
 const source=wrap('<defs><symbol id="node" viewBox="0 0 20 20"><rect width="20" height="20"/></symbol><filter id="shadow"><feGaussianBlur stdDeviation="2"/><feOffset dx="1" dy="1"/><feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><use href="#node" x="20" y="20" width="40" height="40"/><text x="80" y="80" filter="url(#shadow)">original</text>');
 const parsed=parseSvg(source),label=parsed.root.querySelector('text').getAttribute('data-tuyan-id');
 const edited=changeSvg(parsed.svg,root=>{findSvgNode(root,label).textContent='edited';});const result=parseSvg(edited);
 assert.equal(result.root.querySelector('text').textContent,'edited');assert.ok(result.root.querySelector('symbol rect'));assert.equal(result.root.querySelector('use').getAttribute('href'),'#node');assert.ok(result.root.querySelector('feGaussianBlur'));assert.equal(result.root.querySelectorAll('image').length,0);assert.equal(parseSvg(source).root.querySelector('text').textContent,'original');
});
