import { Github } from 'lucide-react';

export default function IdentityProviderIcon({ provider, size = 20 }) {
  if (provider === 'github') return <Github size={size} aria-hidden="true" />;
  return <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#4285F4" d="M43.61 24.46c0-1.36-.12-2.66-.35-3.92H24v7.42h11a9.4 9.4 0 0 1-4.08 6.18v5.14h6.61c3.87-3.56 6.08-8.8 6.08-14.82Z" />
    <path fill="#34A853" d="M24 44c5.52 0 10.15-1.83 13.53-4.72l-6.61-5.14c-1.83 1.23-4.17 1.97-6.92 1.97-5.33 0-9.85-3.6-11.47-8.44H5.71v5.3A20 20 0 0 0 24 44Z" />
    <path fill="#FBBC05" d="M12.53 27.67a12 12 0 0 1 0-7.34v-5.3H5.71a20 20 0 0 0 0 17.94l6.82-5.3Z" />
    <path fill="#EA4335" d="M24 11.89c3.01 0 5.7 1.03 7.82 3.04l5.87-5.87A19.63 19.63 0 0 0 24 4a20 20 0 0 0-18.29 11.03l6.82 5.3c1.62-4.84 6.14-8.44 11.47-8.44Z" />
  </svg>;
}
