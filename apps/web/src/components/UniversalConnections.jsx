import {useEffect, useState, useRef} from 'react'
import {readConnectionLibrary, mutateConnectionLibrary, CONNECTION_LIBRARY_KEY, connectionFacts, profilePatch, exportUniversalConfiguration, importUniversalConfiguration, universalImportDiff, UNIVERSAL_FILE_MAX_BYTES} from '../lib/universalProfiles.js'

/** Each role keeps its own snapshot. Library mutations never edit other roles. */
export default function UniversalConnections({role, label, draft, thinking, onChange, onImportThinking}) {
  const [profiles, setProfiles] = useState(readConnectionLibrary)
  const [selected, setSelected] = useState(draft.ui?.connectionProfileId || '')
  const [name, setName] = useState(draft.ui?.connectionName || '')
  const [status, setStatus] = useState('')
  const [preview, setPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const file = useRef(null), mounted = useRef(true), reading = useRef(0), savingLock = useRef(false)
  const baseline = useRef(profiles.find(p => p.id === selected))
  const chosen = profiles.find(p => p.id === selected)
  const diff = preview ? universalImportDiff(draft, preview, thinking) : null

  useEffect(() => {
    mounted.current = true
    const refresh = event => {
      if (event.key !== CONNECTION_LIBRARY_KEY && event.key !== null) return
      setProfiles(readConnectionLibrary())
      setStatus('连接库在其他页面发生变化，当前角色草稿保留。更新已有连接前会再次核对冲突。')
    }
    window.addEventListener('storage', refresh)
    return () => { mounted.current = false; reading.current++; window.removeEventListener('storage', refresh) }
  }, [])

  async function persist(change, complete) {
    if (savingLock.current) return
    savingLock.current = true; setSaving(true)
    try {
      const next = await mutateConnectionLibrary(change)
      if (mounted.current) { setProfiles(next); complete?.(next) }
    } catch (error) { if (mounted.current) setStatus(error.message) }
    finally { savingLock.current = false; if (mounted.current) setSaving(false) }
  }
  function save(update) {
    try {
      const profile = {id: update ? chosen.id : crypto.randomUUID(), name: name.trim(), connection: connectionFacts(draft.custom)}
      if (!profile.name) throw Error('请先填写连接名称。')
      void persist(update ? {type:'update', id:chosen.id, expected:baseline.current, profile} : {type:'add', profiles:[profile]}, () => {
        baseline.current = profile; setSelected(profile.id)
        onChange({ui:{connectionProfileId:profile.id, connectionName:profile.name}})
        setStatus('连接已保存到浏览器，不含密钥。其他角色的当前配置保持原样。')
      })
    } catch (error) { setStatus(error.message) }
  }
  function select(id) {
    const profile = profiles.find(p => p.id === id)
    baseline.current = profile; setSelected(id); setName(profile?.name || '')
    onChange({ui:{connectionProfileId:id, connectionName:profile?.name || ''}})
  }
  function apply() {
    baseline.current = chosen; setName(chosen.name)
    onChange({...profilePatch(chosen), ui:{...profilePatch(chosen).ui, connectionName:chosen.name, connectionProfileId:chosen.id}})
    setStatus(`已将连接应用到${label}的当前页草稿；型号、能力和其他角色保留。绑定变化会清除本角色旧 Key。`)
  }
  function download() {
    try {
      const value = exportUniversalConfiguration(role, draft, profiles, thinking)
      const url = URL.createObjectURL(new Blob([value], {type:'application/json'})), a = document.createElement('a')
      a.href = url; a.download = `tuyan-universal-${role}.json`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      setStatus('已导出当前角色配置、思考偏好与连接列表，不含密钥或验证状态。')
    } catch (error) { setStatus(error.message) }
  }
  async function read(event) {
    const value = event.target.files?.[0]; event.target.value = ''
    if (!value) return
    const sequence = ++reading.current
    setPreview(null); setStatus('正在本地读取文件，尚未修改配置。')
    try {
      if (value.size > UNIVERSAL_FILE_MAX_BYTES) throw Error('配置文件超过 128 KiB。')
      const text = await value.text()
      if (!mounted.current || sequence !== reading.current) return
      setPreview(importUniversalConfiguration(text, role))
      setStatus('文件已读取，尚未修改配置，也未访问上游。')
    } catch (error) { if (mounted.current && sequence === reading.current) setStatus(error.message) }
  }
  return <details className="universal-details universal-connections"><summary>已命名连接与无密钥配置文件</summary>
    <p className="universal-hint">连接仅保存地址、协议、鉴权方式、目录规则与兼容变体。角色保存独立副本；更新或删除连接不会改写其他角色。</p>
    <label className="field"><span>已保存连接</span><select disabled={saving} aria-label={`${label} 已保存连接`} value={selected} onChange={e => select(e.target.value)}><option value="">选择连接</option>{profiles.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
    {chosen && <><p className="universal-hint">{chosen.connection.protocol} · {chosen.connection.baseUrl}</p><div className="universal-recovery">
      <button type="button" disabled={saving} className="universal-button" onClick={apply}>应用连接到{label}（不含密钥）</button>
      <button type="button" disabled={saving} className="universal-button" onClick={() => persist({type:'delete', id:chosen.id, expected:baseline.current}, () => {
        baseline.current = undefined; setSelected(''); setName(''); onChange({ui:{connectionProfileId:'', connectionName:''}})
        setStatus('已删除连接条目，已应用到各角色的副本保留。')
      })}>删除连接条目</button>
    </div></>}
    <label className="field"><span>连接名称</span><input disabled={saving} aria-label={`${label} 连接名称`} maxLength={80} value={name} onChange={e => { setName(e.target.value); onChange({ui:{connectionName:e.target.value}}) }}/></label>
    <div className="universal-recovery"><button type="button" disabled={saving} className="universal-button" onClick={() => save(false)}>将当前连接另存到浏览器</button>{chosen && <button type="button" disabled={saving} className="universal-button" onClick={() => save(true)}>以当前连接更新「{chosen.name}」</button>}</div>
    <p className="universal-hint">导出范围：当前角色的型号、能力、限额、尺寸及适用思考偏好，加上已命名连接。不包含任何 Key、认证头、会话、任务恢复凭据或验证状态。</p>
    <div className="universal-recovery"><button type="button" className="universal-button" onClick={download}>导出无密钥配置</button><button type="button" className="universal-button" onClick={() => file.current.click()}>选择配置文件并预览</button><input ref={file} type="file" accept=".json,application/json" hidden aria-label={`${label} 导入文件`} onChange={read}/></div>
    {preview && <section className="universal-import-preview" aria-label={`${label} 导入预览`}>
      <p>{preview.message}</p><p>{preview.draft.custom.baseUrl} · {preview.draft.custom.protocol} · {preview.draft.modelId || '未填写型号'}</p>
      <p className="universal-status warning">{diff.clearKey ? '地址、协议或鉴权绑定改变：应用后会清除当前角色旧 Key，需要重新填写。' : '连接绑定不变：当前角色已有 Key 保留；文件不会导入或共享密钥。'}</p>
      <p>{diff.thinking}</p>
      <details className="universal-details"><summary>将改变 {diff.changes.length} 项配置（查看前后差异）</summary>
        {diff.changes.length ? <dl className="universal-import-diff">{diff.changes.map(row => <div key={row.label}><dt>{row.label}</dt><dd><span>当前</span><code>{row.before}</code></dd><dd><span>导入后</span><code>{row.after}</code></dd></div>)}</dl> : <p>配置值相同；导入后能力声明仍需重新确认。</p>}
      </details>
      <p>文件中的 {preview.profiles.length} 个连接仅在下方明确保存后进入浏览器；同名或同标识条目不会被覆盖。</p>
      <div className="universal-recovery"><button type="button" className="universal-button" onClick={() => { onChange(preview.draft); if (preview.thinking) onImportThinking?.(role, preview.thinking); setStatus('已导入当前角色草稿，请核对并重新确认能力；未执行请求。'); setPreview(null) }}>导入到{label}草稿</button>
        {preview.profiles.length > 0 && <button type="button" disabled={saving} className="universal-button" onClick={() => {
          const additions = preview.profiles.map(p => ({...p, id:crypto.randomUUID(), name:profiles.some(x => x.name === p.name) ? `${p.name.slice(0,70)}（导入）` : p.name}))
          void persist({type:'add', profiles:additions}, () => { setStatus('文件连接已作为新条目保存，现有条目与角色配置未改变。'); setPreview(current => current === preview ? {...current, profiles:[]} : current) })
        }}>将文件连接另存到浏览器</button>}
        <button type="button" className="universal-button" onClick={() => { reading.current++; setPreview(null); setStatus('已取消导入，当前角色配置未改变。已明确保存的连接条目保留。') }}>取消导入</button>
      </div>
    </section>}
    {status && <p className="universal-status neutral" role="status">{status}</p>}
  </details>
}
