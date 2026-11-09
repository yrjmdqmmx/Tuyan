import { useCallback, useMemo, useRef, useState } from 'react'
import { modelRegistryRequest, providerAccountCatalogRequest } from '@paperbanana/api'
import { presentRegistryModel, sortModelsNewestFirst } from '../lib/modelPresentation.js'

// Account catalogs live only in this page. They are discarded on key, region,
// identity, or backend changes; late responses cannot cross any of those boundaries.
export default function useProviderCatalogs({ apiBase, health, registry, apiKeys, providerRegions, identity = '', readAccount = providerAccountCatalogRequest, readPublic = modelRegistryRequest }) {
  const [results, setResults] = useState({})
  const sequence = useRef({})
  const current = useRef(null)
  const resultRef=useRef(results);resultRef.current=results
  current.current = { apiBase, health, apiKeys, providerRegions, identity }
  const matches = (item, provider) => item && item.apiBase === apiBase && item.health === health && item.identity === identity
    && item.key === (apiKeys?.[provider] || '') && item.region === (provider === 'minimax' ? providerRegions?.minimax || 'global' : '')
  const valid = Object.fromEntries(Object.entries(results).filter(([id,item]) => matches(item,id)))
  const load = useCallback(async (provider, options = {}) => {
    if (!health || !registry?.catalogProviders?.[provider]) return
    const definition = registry.catalogProviders[provider]
    const key = apiKeys?.[provider] || ''
    const region = provider === 'minimax' ? providerRegions?.minimax || 'global' : ''
    const binding = { apiBase, health, identity, key, region }
    const id = sequence.current[provider] = (sequence.current[provider] || 0) + 1
    const prior=matches(resultRef.current[provider],provider) ? resultRef.current[provider] : undefined
    const privateModels=options.privateModels===true
    const resume=prior?.privateModels===privateModels ? prior?.catalog?.continuation : undefined
    setResults(previous => ({ ...previous, [provider]: { ...prior,...binding, privateModels,status:'loading' } }))
    const stillCurrent = () => {
      const now=current.current
      return sequence.current[provider] === id && now.apiBase===apiBase && now.health===health && now.identity===identity
        && (now.apiKeys?.[provider] || '')===key && (provider==='minimax' ? now.providerRegions?.minimax || 'global' : '')===region
    }
    try {
      const publicRead=definition.access==='public' && !options.privateModels
      const response=publicRead ? await readPublic(apiBase,health,provider,{refresh:true})
        : await readAccount(apiBase,health,{mode:'catalog',provider,apiKeys:{[provider]:key},region,...options,...(resume?{continuation:resume}:{})})
      if (!stillCurrent()) return
      let providerRegistry=publicRead ? response.providers?.[provider] : response.providerRegistry
      const catalog=publicRead ? response.catalogHealth?.[provider] || {state:providerRegistry?'ready':'error',message:response.unavailableProviders?.[provider] || '目录已刷新'} : response.catalog
      if(!publicRead && resume && prior?.providerRegistry && providerRegistry){
        const combined=new Map(prior.providerRegistry.models.map(row=>[row.id,row]))
        for(const row of providerRegistry.models){
          const previous=combined.get(row.id)
          // Each response includes the static base. It must not erase live facts
          // read on an earlier page when that ID is absent from the next page.
          if(previous?.catalogAliases && !row.catalogAliases)continue
          combined.set(row.id,row)
        }
        providerRegistry={...providerRegistry,models:[...combined.values()]}
        catalog.pages=(prior.catalog.pages || 0)+(catalog.pages || 0)
        catalog.modelCount=providerRegistry.models.length
        if(catalog.state==='error')catalog.state='partial'
      }
      setResults(previous => ({...previous,[provider]:{...binding,privateModels,status:catalog?.state || 'error',catalog,providerRegistry}}))
    } catch {
      if(stillCurrent())setResults(previous => ({...previous,[provider]:{...binding,status:'error',catalog:{message:'目录读取失败，请检查渠道凭据或重试'}}}))
    }
  },[apiBase,health,identity,apiKeys,providerRegions,registry,readAccount,readPublic])
  const merged = useMemo(() => {
    if (!registry) return registry
    const providers={...registry.providers}
    for(const [id,item] of Object.entries(valid)) {
      if(item.providerRegistry && ['ready','partial','loading'].includes(item.status)) {
        const rows = new Map((registry.catalogProviders?.[id]?.access==='public' && item.privateModels ? registry.providers?.[id]?.models || [] : []).map(row=>[row.id,row]))
        for(const row of item.providerRegistry.models){
          if(rows.get(row.id)?.catalogAliases && !row.catalogAliases)continue
          rows.set(row.id,row)
        }
        providers[id]={...item.providerRegistry,models:sortModelsNewestFirst([...rows.values()].map(model=>presentRegistryModel(id,model)))}
      }
    }
    return {...registry,providers}
  },[registry,results,apiBase,health,apiKeys,providerRegions,identity])
  const invalidate = provider => {
    sequence.current[provider]=(sequence.current[provider] || 0)+1
    setResults(previous=>{const next={...previous};delete next[provider];return next})
  }
  return {registry:merged,states:valid,load,invalidate}
}
