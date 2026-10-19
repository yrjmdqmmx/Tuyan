import test,{afterEach} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import React,{createRef} from 'react';
import {act,cleanup,render,screen,fireEvent,within,waitFor} from '@testing-library/react';
import JournalBookshelf,{filterJournalBooks,JournalCover,JOURNAL_CATEGORIES} from '../src/components/JournalBookshelf.jsx';
import JournalRulePicker from '../src/components/JournalRulePicker.jsx';
import books from '../src/data/journal-books.json';
import {JOURNALS,defaultJournalSelection} from '../../../packages/api/src/journal-rules.js';

const originalAnimate=window.Element.prototype.animate,originalMatchMedia=window.matchMedia,originalRect=window.Element.prototype.getBoundingClientRect;
afterEach(()=>{cleanup();window.Element.prototype.animate=originalAnimate;window.matchMedia=originalMatchMedia;window.Element.prototype.getBoundingClientRect=originalRect;});

test('all connected journals have distinct book metadata; official assets are local, versioned and traceable',()=>{
 assert.deepEqual(Object.keys(books).sort(),JOURNALS.map(j=>j.id).sort());
 assert.equal(filterJournalBooks().length,new Set(filterJournalBooks().map(j=>j.id)).size);
 for(const [id,b] of Object.entries(books)){
  assert.ok(JOURNAL_CATEGORIES.includes(b.category),id);assert.ok(b.tags.length&&b.aliases.length);
  assert.match(b.descriptionSource,/^https?:\/\//);
  if(b.cover.kind==='user-provided'){assert.ok(b.cover.providedFile);assert.equal(b.cover.sourceUrl,null);}
  else assert.match(b.cover.sourceUrl,/^https?:\/\//);
  assert.match(b.cover.acquiredOn,/^\d{4}-\d{2}-\d{2}$/);assert.ok(Number.isFinite(Date.parse(b.cover.acquiredOn)));assert.ok(b.cover.usageNote);
  if(b.cover.src){
   assert.match(b.cover.src,/^\/journal-covers\/[^/]+\.[a-f0-9]{10}\.webp$/);
   const bytes=readFileSync(new URL(`../public${b.cover.src}`,import.meta.url));
   assert.equal(createHash('sha256').update(bytes).digest('hex'),b.cover.sha256);
   assert.ok(b.cover.width>0&&b.cover.height>0);assert.ok(['issue','official-display','official-identity','user-provided'].includes(b.cover.kind));
  }else{assert.equal(b.cover.kind,'placeholder');assert.ok(b.cover.gap);}
 }
});

test('search supports aliases, publishers and multiple tags without duplicating books',()=>{
 assert.deepEqual(filterJournalBooks('HSSC').map(j=>j.id),['hssc']);
 assert.ok(filterJournalBooks('SAGE').some(j=>j.id==='sage-open'));
 assert.ok(filterJournalBooks('心理').some(j=>j.id==='acta-psychologica-sinica'));
 assert.ok(filterJournalBooks('','经济与管理','金融').some(j=>j.name==='财经论丛'));
 assert.equal(filterJournalBooks('','生命科学','金融').length,0);
});

test('generic book stays first with empty filters and clears directly without a detail page',()=>{
 let cleared=0;render(React.createElement(JournalBookshelf,{onBrowse:()=>{},onNone:()=>cleared++}));
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'no-such-journal'}});
 const nav=within(screen.getByRole('navigation'));
 assert.match(nav.getAllByRole('button')[0].textContent,/不指定期刊/);
 assert.ok(screen.getByRole('status').textContent.includes('没有符合'));
 fireEvent.click(nav.getByRole('button',{name:/不指定期刊/}));assert.equal(cleared,1);
 assert.ok(screen.queryByRole('region')===null,'Expected no matching DOM element');
 fireEvent.click(screen.getByRole('button',{name:'重置搜索与筛选'}));
 assert.equal(nav.getAllByRole('button').length,JOURNALS.length+1);
});

test('failed official cover retains accessible title and an honest fallback',()=>{
 render(React.createElement(JournalCover,{id:'cell-reports',name:'Cell Reports'}));
 const img=screen.getByRole('img');assert.match(img.getAttribute('src'),/^\/journal-covers\//);
 fireEvent.error(img);assert.ok(screen.queryByRole('img')===null,'Expected no matching DOM element');
 assert.ok(screen.getByText('Cell Reports'));assert.ok(screen.getByText('封面暂未载入'));
});

test('custom image has a neutral accessible label and retains source metadata only in data',()=>{
 render(React.createElement(JournalCover,{id:'plos-one',name:'PLOS ONE'}));
 assert.equal(screen.getByRole('img').getAttribute('alt'),'PLOS ONE 展示图');
 assert.equal(books['plos-one'].cover.issue,null);
 assert.equal(books['plos-one'].cover.kind,'user-provided');
 assert.equal(books['plos-one'].cover.providedFile,'PLOS_Medicine_Postcard.jpeg');
 assert.equal(books['plos-one'].cover.sourceUrl,null);
 cleanup();
 render(React.createElement(JournalBookshelf,{onBrowse:()=>{},onNone:()=>{}}));
 fireEvent.click(screen.getByRole('button',{name:/PLOS ONE/}));
 assert.ok(document.querySelector('.journal-cover-provenance')===null,'No cover provenance panel');
 assert.ok(screen.queryByText('用户指定展示图')===null,'No source label in the UI');
});

test('reduced motion preserves filters and returns focus to the originating book',async()=>{
 window.matchMedia=()=>({matches:true});window.Element.prototype.animate=()=>{throw Error('Animation should be skipped');};
 render(React.createElement(JournalBookshelf,{onBrowse:()=>{},onNone:()=>{}}));
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'Cell'}});
 const book=screen.getByRole('button',{name:/Cell Reports/});fireEvent.click(book);
 assert.ok(document.activeElement===screen.getByRole('heading',{name:'Cell Reports'}),'Details receive focus');
 fireEvent.click(screen.getByRole('button',{name:'返回书架'}));
 assert.equal(screen.getByRole('searchbox').value,'Cell');
 await waitFor(()=>assert.ok(document.activeElement===book,'Focus returns to the original book'));
 assert.ok(document.querySelector('.journal-book-flight')===null,'Expected no matching DOM element');
});

test('browsing and reconfirming the selected historical journal never upgrades its version',()=>{
 const value={...defaultJournalSelection('cell-reports'),version:'2026-10-13.v1',stage:'production',widthMm:92};
 let saved;render(React.createElement(JournalRulePicker,{value,onChange:v=>{saved=v},figureTypeId:'workflow'}));
 fireEvent.click(document.querySelector('.journal-entry'));
 fireEvent.click(screen.getByRole('button',{name:/Cell Reports.*已选择/}));
 assert.equal(saved,undefined);assert.ok(screen.getByText(/当前沿用 2026-10-13.v1/));
 fireEvent.click(screen.getByRole('button',{name:'选择此期刊'}));
 assert.equal(saved.version,value.version);assert.equal(saved.stage,value.stage);assert.equal(saved.widthMm,92);
});

test('interrupted opening has one reverse animation, ignores stale completion and restores focus',async()=>{
 const transitions=[];
 // jsdom has no layout; provide nonzero book/body geometry for the animation lifecycle.
 window.Element.prototype.getBoundingClientRect=function(){return new window.DOMRect(40,100,this.classList.contains('journal-library')?900:120,this.classList.contains('journal-library')?600:160);};
 window.Element.prototype.animate=function(){const a={target:this,cancelled:false,cancel(){this.cancelled=true;},onfinish:null};transitions.push(a);return a;};
 const motions=()=>transitions.filter(a=>a.target.classList.contains('journal-reader'));
 const ref=createRef();render(React.createElement(JournalBookshelf,{ref,onBrowse:()=>{},onNone:()=>{}}));
 const book=screen.getByRole('button',{name:/Cell Reports/});fireEvent.click(book);
 assert.equal(document.querySelectorAll('.journal-book-flight').length,1);
 assert.equal(book.getAttribute('data-reading'),'true','The source book retains its shelf slot during flight');
 const stale=motions()[0].onfinish;
 act(()=>ref.current.dismiss());
 assert.equal(motions()[0].cancelled,true);assert.equal(document.querySelectorAll('.journal-book-flight').length,1);
 act(()=>stale());assert.ok(document.querySelector('.phase-closing'));
 act(()=>motions()[1].onfinish());
 assert.ok(document.querySelector('.journal-book-flight')===null,'Expected no matching DOM element');
 assert.equal(book.getAttribute('data-reading'),null,'The cover returns to its original slot');
 await waitFor(()=>assert.ok(document.activeElement===book,'Focus returns after interrupted opening'));
 fireEvent.click(screen.getByRole('button',{name:/ACS Omega/}));
 act(()=>motions()[2].onfinish());assert.ok(screen.getByRole('heading',{name:'ACS Omega'}));
 assert.equal(document.querySelectorAll('.journal-reader').length,1);
 let closed=0;act(()=>{ref.current.dismiss(()=>closed++);ref.current.dismiss(()=>closed++);});
 act(()=>motions()[3].onfinish());assert.equal(closed,1);
});

 test('reader has one back action, keeps confirmation inside the book, and closes only explicitly',async()=>{
 let saved=null;render(React.createElement(JournalRulePicker,{value:null,onChange:v=>{saved=v;},figureTypeId:'workflow'}));
 fireEvent.click(document.querySelector('.journal-entry'));
 fireEvent.change(screen.getByRole('searchbox'),{target:{value:'Nature'}});
 const book=screen.getByRole('button',{name:/Nature/});fireEvent.click(book);
 assert.equal(screen.getAllByRole('button',{name:'返回书架'}).length,1);
 assert.ok(screen.queryByRole('button',{name:'取消'})===null,'Reading has no ambiguous cancel action');
 assert.ok(Boolean(screen.getByRole('button',{name:'选择此期刊'}).closest('.journal-reading-pages')));
 fireEvent.click(screen.getByRole('button',{name:'返回书架'}));
 assert.ok(screen.getByRole('dialog'));assert.equal(screen.getByRole('searchbox').value,'Nature');assert.equal(saved,null);
 await waitFor(()=>assert.ok(document.activeElement===book,'Focus returns to the filtered source book'));
 fireEvent.click(book);fireEvent.keyDown(document,{key:'Escape'});
 assert.ok(screen.getByRole('navigation'));assert.equal(saved,null);
 fireEvent.click(book);fireEvent.click(screen.getByRole('button',{name:'关闭期刊规则'}));
 assert.ok(screen.queryByRole('dialog')===null,'Explicit close exits the library');assert.equal(saved,null);
 });
