export default function LocalSaveNotice({ save, onSaveSource, onOpenStored }) {
  if (!['conflict', 'failed', 'unavailable'].includes(save.kind)) return null;
  return <div className="fs-banner is-error" role="alert" style={{ flexWrap: 'wrap', justifyContent: 'flex-start' }}>
    <span style={{ flexBasis: '100%' }}>{save.message} 本页图稿仍可编辑和导出；刷新将读取本机存档，不会保留本页未保存的修改。
      {save.kind === 'conflict' && ' 请先下载本页源稿，确认文件已保存后，再选择采用本页或载入本机存档。'}</span>
    <button onClick={() => { onSaveSource(); save.markDownloaded(); }}>下载本页源稿</button>
    {save.kind === 'conflict' && <button disabled={!save.canAdopt} onClick={save.adopt}>已保存源稿，采用本页</button>}
    {save.kind === 'conflict' && <button disabled={!save.canAdopt} onClick={() => save.loadStored(onOpenStored)}>已保存源稿，载入本机存档</button>}
  </div>;
}
