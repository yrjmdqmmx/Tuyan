export default function WorkspaceFrame({ children, origin = globalThis.location?.origin }) {
  return <div className="tw-app-frame">
    <div className="tw-app-content">{children}</div>
    {origin === 'https://tuyansci.cn' && <footer className="icp-footer"><a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">浙ICP备2026071869号-3</a></footer>}
  </div>;
}
