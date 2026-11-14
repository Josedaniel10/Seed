import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

/** A disclosure keeps its focus on pointer dismissal and restores it on Escape. */
export function useDismissiblePopover(isOpen: boolean, onClose: () => void): RefObject<HTMLDivElement | null> {
  const container = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    if (!isOpen) return;
    const dismissOutside = (event: Event) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) close.current();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      close.current();
      container.current?.querySelector<HTMLButtonElement>('button[aria-expanded]')?.focus({ preventScroll: true });
    };
    document.addEventListener('pointerdown', dismissOutside, true);
    document.addEventListener('focusin', dismissOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', dismissOutside, true);
      document.removeEventListener('focusin', dismissOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return container;
}
