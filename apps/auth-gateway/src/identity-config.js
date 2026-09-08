// Secrets remain in the Gateway environment; only capabilities are public.
export function loadIdentityConfig(env, { production, frontendOrigins }) {
  const value = (key) => String(env[key] || '').trim();
  const required = (key) => { const v = value(key); if (!v) throw new Error(`${key} is required`); return v; };
  const enabled = (key) => /^(true|1)$/i.test(value(key));
  const oauth = {};
  for (const provider of ['github', 'google']) {
    const prefix = `AUTH_${provider.toUpperCase()}`;
    if (enabled(`${prefix}_ENABLED`)) oauth[provider] = { clientId: required(`${prefix}_CLIENT_ID`), clientSecret: required(`${prefix}_CLIENT_SECRET`) };
  }
  const returnUrl = value('AUTH_IDENTITY_RETURN_URL') || `${frontendOrigins.includes('https://www.paperbanana.asia') ? 'https://www.paperbanana.asia' : frontendOrigins[0]}/`;
  const parsed = new URL(returnUrl);
  if (!frontendOrigins.includes(parsed.origin) || parsed.username || parsed.password || parsed.hash || (production && parsed.protocol !== 'https:')) throw new Error('AUTH_IDENTITY_RETURN_URL must use a trusted frontend origin');
  return { oauth, returnUrl };
}
