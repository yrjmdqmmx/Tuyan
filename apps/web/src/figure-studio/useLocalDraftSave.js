import { useEffect, useRef, useState } from 'react';
import { createLocalDraftSaver } from './localDraft.js';
import { STORAGE_KEY } from './state.js';

export default function useLocalDraftSave(document, initial) {
  const [saver] = useState(() => createLocalDraftSaver({ ...initial, recoveryError: initial.history.recoveryError }));
  const [state, setState] = useState(saver.getState);
  const [downloaded, setDownloaded] = useState(null);
  const current = useRef(document); current.current = document;
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = saver.subscribe(setState);
    const storageChanged = (event) => {
      if ((event.key === null || event.key === STORAGE_KEY) && (!event.storageArea || event.storageArea === initial.storage)) saver.inspect();
    };
    window.addEventListener('storage', storageChanged);
    return () => { mounted.current = false; unsubscribe(); window.removeEventListener('storage', storageChanged); };
  }, [saver, initial]);
  useEffect(() => {
    let active = true;
    void saver.save(document, { isCurrent: () => active && mounted.current && current.current === document });
    return () => { active = false; };
  }, [document, saver]);
  const source = JSON.stringify(document);
  const canAdopt = state.kind === 'conflict' && downloaded?.source === source && downloaded.external === state.external;
  return {
    ...state,
    canAdopt,
    markDownloaded: () => setDownloaded({ source, external: state.external }),
    adopt: () => {
      if (!canAdopt) return;
      setDownloaded(null);
      void saver.save(document, { adopt: true, external: downloaded.external, isCurrent: () => mounted.current && current.current === document });
    },
    loadStored: (onOpen) => {
      if (!canAdopt) return;
      setDownloaded(null);
      void saver.loadStored({ external: downloaded.external, onOpen, isCurrent: () => mounted.current && current.current === document });
    },
  };
}
