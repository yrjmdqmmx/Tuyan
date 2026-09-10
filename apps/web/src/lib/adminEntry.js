export function isAdminEntry(search) {
  return new URLSearchParams(search).has('admin');
}
export function selectWorkspaceEntry(tab, location = window.location, history = window.history) {
  const url = new URL(location.href);
  for (const key of [...url.searchParams.keys()]) if (key === 'admin' || key.startsWith('a_')) url.searchParams.delete(key);
  url.searchParams.delete('tokendance_wallet');
  url.searchParams.delete('view');
  if (tab === 'admin') url.searchParams.set('admin', 'overview');
  else if (tab !== 'generate') url.searchParams.set('view', tab);
  history.pushState({}, '', url.pathname + url.search + url.hash);
}

export function workspaceEntry(search) {
  const params = new URLSearchParams(search);
  if (params.has('admin')) return 'admin';
  if (params.has('tokendance_wallet')) return 'account';
  const view = params.get('view');
  return ['generate', 'records', 'refine', 'guide', 'account'].includes(view) ? view : 'generate';
}
