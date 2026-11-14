import { useContext, useEffect, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence } from 'motion/react';
import { AlertViewportContext } from './alertContext.ts';
import type { AlertTone } from './alertContext.ts';
import { AlertCard } from './AlertCard.tsx';

interface FloatingAlertProps {
  message: string | null | undefined;
  tone?: AlertTone;
  onDismiss?: () => void;
  duration?: number | null;
  dismissible?: boolean;
  children?: ReactNode;
}

/** Render continuously; AnimatePresence retains the card through its exit. */
export function FloatingAlert({ message, tone = 'error', onDismiss, duration, dismissible = true, children }: FloatingAlertProps): ReactElement {
  const viewport = useContext(AlertViewportContext);
  const [dismissed, setDismissed] = useState<string | null>(null);
  useEffect(() => { setDismissed(null); }, [message]);
  const lifetime = duration === undefined ? (tone === 'success' || tone === 'info' ? 7000 : null) : duration;
  const content = <AnimatePresence initial={true}>
    {message && message !== dismissed && <AlertCard key={`${tone}:${message}`} message={message} tone={tone}
      duration={lifetime} dismissible={dismissible} onDismiss={() => { setDismissed(message); onDismiss?.(); }}>
      {children}
    </AlertCard>}
  </AnimatePresence>;
  // Standalone screens and server-rendered previews retain their accessible message.
  if (viewport) return createPortal(content, viewport);
  const fallback = <div className="alert-viewport">{content}</div>;
  if (typeof document === 'undefined') return fallback;
  const dialogs = document.querySelectorAll<HTMLDialogElement>('dialog[open]');
  return createPortal(fallback, dialogs.item(dialogs.length - 1) ?? document.body);
}
