// Offline cascade oracle for shipped link rules; jsdom alone ignores specificity
// in some var() declarations. Parse with Vite's own PostCSS dependency.
import fs from 'node:fs'
import path from 'node:path'
import {createRequire} from 'node:module'
const webRequire=createRequire(new URL('../apps/web/package.json',import.meta.url))
const postcss=createRequire(webRequire.resolve('vite'))('postcss')
export function cssRules(file) {
 const result=[]
 const root=postcss.parse(fs.readFileSync(file,'utf8'),{from:file})
 root.walk(node=>{
  if(node.type==='atrule' && node.name==='import') {
   const target=node.params.match(/^(?:url\()?['"]([^'"]+)['"]/)?.[1]
   if(target?.startsWith('.'))result.push(...cssRules(path.resolve(path.dirname(file),target)))
  }
  if(node.type==='rule') for(const selector of node.selectors)result.push({selector,decls:node.nodes.filter(n=>n.type==='decl'),file})
 })
 return result
}
export function specificity(selector) {
 // Functional selector lists take their maximum argument specificity; :where
 // always contributes zero, including nested :has/:is selectors.
 let extra=[0,0,0]
 for(let match; (match=/:([\w-]+)\(/.exec(selector));) {
  const start=match.index,from=start+match[0].length;let end=from,depth=1
  for(;depth&&end<selector.length;end++){if(selector[end]==='(')depth++;if(selector[end]===')')depth--}
  const body=selector.slice(from,end-1),parts=[];let level=0,last=0
  for(let i=0;i<body.length;i++){if(body[i]==='(')level++;if(body[i]===')')level--;if(body[i]===','&&!level){parts.push(body.slice(last,i));last=i+1}}
  parts.push(body.slice(last))
  if(match[1]!=='where') {
   if(!['is','not','has'].includes(match[1]))throw Error('Extend specificity oracle for '+selector)
   const max=parts.map(specificity).sort(compare).at(-1)
   extra=extra.map((v,i)=>v+max[i])
  }
  selector=selector.slice(0,start)+selector.slice(end)
 }

 const attributes=selector.match(/\[[^\]]*\]/g)||[]
 const s=selector.replace(/\[[^\]]*\]/g,'').replace(/::[\w-]+/g,' element')
 return [(s.match(/#[\w-]+/g)||[]).length,attributes.length+(s.match(/\.[\w-]+|:[\w-]+/g)||[]).length,
 (s.replace(/[#.:][\w-]+/g,'').match(/(?:^|[\s>+~])([a-z][\w-]*)/gi)||[]).length].map((v,i)=>v+extra[i])
}
const compare=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0}
export function winner(rules,element,property,state='') {
 const candidates=[]
 for(const [order,rule]of rules.entries()) {
  if(/::|:(?:before|after)\b/.test(rule.selector) || !rule.decls.some(d=>d.prop===property))continue
  let eligible=true
  const selector=rule.selector.replace(/:(hover|focus-visible|focus|active|visited)\b/g,(_,pseudo)=>{if(pseudo!==state)eligible=false;return ''})
  if(!eligible)continue
  let matches;try{matches=element.matches(selector)}catch(error){throw Error('Selector '+selector,{cause:error})}
  if(!matches)continue
  for(const [index,decl]of rule.decls.entries())if(decl.prop===property)candidates.push({selector:rule.selector,value:decl.value,important:!!decl.important,specificity:specificity(rule.selector),order,index,file:rule.file})
 }
 return candidates.sort((a,b)=>Number(a.important)-Number(b.important)||compare(a.specificity,b.specificity)||a.order-b.order||a.index-b.index).at(-1)
}
