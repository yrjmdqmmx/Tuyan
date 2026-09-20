import { useEffect, useState } from 'react';

export default function useCompactLayout() {
  const [compact, setCompact] = useState(() => Boolean(window.matchMedia?.('(max-width: 760px)').matches));
  useEffect(() => {
    const media = window.matchMedia?.('(max-width: 760px)');
    const update = () => setCompact(Boolean(media?.matches));
    update();
    media?.addEventListener('change', update);
    return () => media?.removeEventListener('change', update);
  }, []);
  return compact;
}
