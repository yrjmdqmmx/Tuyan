export function verificationState(error) {
  // Empty error remains compatible with previously issued callback URLs.
  if (!error) return 'success';
  if (error === 'TOKEN_USED' || error === 'EMAIL_ALREADY_VERIFIED') return 'used';
  if (error === 'TOKEN_EXPIRED') return 'expired';
  if (error === 'VERIFICATION_UNAVAILABLE') return 'unavailable';
  return 'invalid';
}

if (typeof document !== 'undefined') {
  const state = verificationState(new URLSearchParams(location.search).get('error'));
  for (const id of ['success', 'expired', 'used', 'invalid', 'unavailable']) {
    document.getElementById(id)?.classList.toggle('hidden', id !== state);
  }
}
