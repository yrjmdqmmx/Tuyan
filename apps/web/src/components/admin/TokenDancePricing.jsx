import { useState } from 'react';
import { fetchJson } from '@paperbanana/api';
export default function TokenDancePricing({ apiBase }) {
  const [data, setData] = useState(null), [error, setError] = useState(''), [busy, setBusy] = useState(false);
  async function load() { setBusy(true); setError(''); try { setData(await fetchJson(`${apiBase.replace(/\/paperbanana-api$/, '')}/paperbanana-api`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'adminTokenDancePricing' }) })); } catch (err) { setError(err.message); } finally { setBusy(false); } }
  return <section className="tokendance-panel"><strong>TokenDance 产品方分润价目</strong><p>这里展示预估的单位收益。实际路由、用量和结算记录可能不同，不能视为已结算收入。</p><button type="button" disabled={busy} onClick={load}>读取分润价目</button>{error && <p role="alert">{error}</p>}{data && (data.available ? <pre>{data.markdown}</pre> : <p>{data.reason}</p>)}<a href="https://tokendance.space/application/pricing" target="_blank" rel="noreferrer">打开 TokenDance 产品方后台</a></section>;
}
