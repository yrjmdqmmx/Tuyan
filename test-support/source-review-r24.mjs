import fs from 'node:fs'
import vm from 'node:vm'
import {createRequire} from 'node:module'
import {productBundle} from './execution-capability.mjs'

export async function collectSourceReview() {
  const web = await productBundle(`
    import React from './apps/web/node_modules/react/index.js';
    import {renderToStaticMarkup} from './apps/web/node_modules/react-dom/server.node.js';
    import {ModelSpecifications} from './apps/web/src/components/ModelSpecifications.jsx';
    export {STATIC_MODEL_REGISTRY} from './apps/web/src/lib/staticModelCatalog.js';
    export {modelCardSpecifications} from './apps/web/src/lib/modelCardSpecifications.js';
    export {modelSourceRows} from './apps/web/src/lib/modelCardSources.js';
    export {sourceTitle} from './packages/api/src/card-presentation.mjs';
    export const markup=(provider,model)=>renderToStaticMarkup(React.createElement(ModelSpecifications,{provider,model}));
  `)
  const require=createRequire(import.meta.url), {JSDOM}=createRequire(new URL('../apps/web/package.json',import.meta.url))('jsdom')
  const filename=require.resolve('../apps/miniprogram/miniprogram/components/model-picker/model-picker.js')
  let definition, modal
  const context={Component(v){definition=v},exports:{},require:createRequire(filename),wx:{showModal(v){modal=v}}}
  vm.runInNewContext(fs.readFileSync(filename,'utf8')+'\nthis.present=presentModel',context,{filename})
  const current={web:[],mini:[],notices:[]}
  globalThis.React=createRequire(new URL('../apps/web/package.json',import.meta.url))('react')
  const dom=new JSDOM('')
  for(const [provider,entry] of Object.entries(web.STATIC_MODEL_REGISTRY)) for(const model of entry.models) {
    const data=web.modelCardSpecifications(provider,model),card=provider+'/'+model.id,rows=web.modelSourceRows(data)
    dom.window.document.body.innerHTML=web.markup(provider,model)
    const footer=dom.window.document.querySelector('.model-spec-sources > *')
    const text=(footer?.getAttribute('aria-label') || '').replace(rows[0]?.label+'\n','')
    const tooltips=[...dom.window.document.querySelectorAll('.model-modality-icon')].map(el=>el.title)
    current.web.push({card,name:data.sourceModel.displayName,rows,text,tooltips})
    if(data.lifecycle?.state==='scheduled') current.notices.push({card,name:data.sourceModel.displayName,rows:data.lifecycle.sourceUrl ? [{url:data.lifecycle.sourceUrl,label:'下线公告 · '+web.sourceTitle(data.lifecycle.sourceUrl)}] : []})
  }
  for(const [provider,entry] of Object.entries(require('../apps/miniprogram/miniprogram/utils/static-model-catalog.js').STATIC_MODEL_REGISTRY)) for(const model of entry.models) {
    const data=context.present(model,'','',provider),dialogs=[]
    for(const row of data.specSources) {
      definition.methods.copySource({currentTarget:{dataset:{url:row.url,source:row.label,notice:data.auditMessage}}})
      dialogs.push(modal.content)
    }
    current.mini.push({card:provider+'/'+model.id,name:data.label,rows:structuredClone(data.specSources),text:data.auditMessage,dialogs,tooltips:structuredClone(data.specRows.flatMap(row=>row.icons.map(icon=>icon.tooltip)))})
  }
  dom.window.close()
  return current
}
