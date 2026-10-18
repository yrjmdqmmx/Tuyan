// Match the server's omitted-resolution default without sending an explicit
// "auto" (which is a distinct, model-specific native size).
export function workspaceImageResolution(capabilities, requested, editing = false) {
  if (requested) return requested;
  if (editing) return '2K'; // Existing refineImage omitted-size contract.
  const sizes = capabilities?.resolutions || [];
  return sizes.includes('1K') ? '1K' : sizes[0] || '1K';
}
