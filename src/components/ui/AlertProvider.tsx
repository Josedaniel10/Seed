import { useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertViewportContext } from './alertContext.ts';

/** Keep notices in the active native dialog's top layer and focus scope. */
export function AlertProvider({ children }: { children: ReactNode }): ReactElement {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const updateTarget = () => {
      const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog[open]');
      setTarget(dialogs.item(dialogs.length - 1) ?? document.body);
    };
    updateTarget();
    const observer = new MutationObserver(updateTarget);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['open'] });
    return () => observer.disconnect();
  }, []);

  return <AlertViewportContext.Provider value={viewport}>
    {children}
    {target && createPortal(<div ref={setViewport} className="alert-viewport" aria-label="Avisos de Seed" />, target)}
  </AlertViewportContext.Provider>;
}
