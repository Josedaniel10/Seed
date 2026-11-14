import { useEffect, useMemo, useSyncExternalStore } from 'react';
import type { LocalDraft, LocalDraftOptions, DraftSnapshot } from './localDraft.ts';
import { createLocalDraft } from './localDraft.ts';

export function useLocalDraft<T>(options: Omit<LocalDraftOptions<T>, 'storage'>): {
  draft: DraftSnapshot<T>; controller: LocalDraft<T>;
} {
  // The controller is a local persistence resource identified by user, form and document context.
  const controller = useMemo(() => {
    let storage: Storage | null = null;
    try { if (typeof window !== 'undefined') storage = window.localStorage; } catch { /* Report on the first save. */ }
    return createLocalDraft({ ...options, storage });
  }, [options.ownerId, options.scope, options.context]);
  const draft = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  useEffect(() => {
    if (draft.status !== 'pending') return;
    const timer = window.setTimeout(controller.flush, 500);
    return () => window.clearTimeout(timer);
  }, [controller, draft]);
  useEffect(() => {
    controller.externalChange();
    const flush = () => { controller.flush(); };
    const visibility = () => { if (document.visibilityState === 'hidden') flush(); };
    const storage = (event: StorageEvent) => { if (event.key === controller.key || event.key === null) controller.externalChange(); };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!controller.flush() && controller.hasUnsavedChanges()) { event.preventDefault(); event.returnValue = ''; }
    };
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('storage', storage);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      controller.flush();
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('storage', storage);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [controller]);
  return { draft, controller };
}
