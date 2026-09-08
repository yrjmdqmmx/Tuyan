export function isAdminEntry(search) {
  return new URLSearchParams(search).has('admin');
}
export function selectWorkspaceEntry(tab, location = window.location, history = window.history) {
  const url = new URL(location.href);
  for (const key of [...url.searchParams.keys()]) if (key === 'admin' || key.startsWith('a_')) url.searchParams.delete(key);
  if (tab === 'admin') url.searchParams.set('admin', 'overview');
  history.pushState({}, '', url.pathname + url.search + url.hash);
}
