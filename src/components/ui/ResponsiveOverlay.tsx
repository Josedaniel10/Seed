import { useEffect, useRef, useState } from 'react';
import type { ReactNode, ReactElement } from 'react';
import { createPortal } from 'react-dom';

interface ResponsiveOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
}

/** Native dialog supplies focus trapping, inert background and focus restoration. */
export function ResponsiveOverlay({ isOpen, onClose, label, children }: ResponsiveOverlayProps): ReactElement | null {
  const [isPresent, setIsPresent] = useState(isOpen);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<number | null>(null);
  const pointerStartedInside = useRef(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const contentRef = useRef(children);
  useEffect(() => {
    if (isOpen) contentRef.current = children;
  }, [isOpen, children]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!isOpen) {
      // Keep the native dialog in the top layer throughout the exit transition.
      const timer = window.setTimeout(() => {
        dialog.close();
        setIsPresent(false);
      }, 300);
      return () => window.clearTimeout(timer);
    }
    setIsPresent(true);
    dialog.showModal();
  }, [isOpen]);

  if (typeof document === 'undefined' || (!isOpen && !isPresent)) return null;

  return createPortal(
    <dialog ref={dialogRef} aria-label={label} className="responsive-overlay" data-open={isOpen}
      onCancel={(event) => { event.preventDefault(); closeRef.current(); }}
      onPointerDownCapture={(event) => {
        pointerStartedInside.current = event.target !== event.currentTarget && event.target !== panelRef.current;
      }}
      onPointerCancel={() => { pointerStartedInside.current = false; }}
      onClick={(event) => {
        const target = event.target;
        const startedInside = pointerStartedInside.current;
        pointerStartedInside.current = false;
        if (!startedInside && (target === event.currentTarget || target === panelRef.current)) closeRef.current();
      }}>
      <div ref={panelRef} className="responsive-overlay-panel">
        <div className="sheet-grip" onPointerDown={(event) => {
          dragStart.current = event.clientY;
          event.currentTarget.setPointerCapture(event.pointerId);
        }} onPointerMove={(event) => {
          if (dragStart.current === null || !panelRef.current) return;
          const distance = Math.max(0, event.clientY - dragStart.current);
          panelRef.current.style.setProperty('--sheet-drag', `${Math.min(distance, 180)}px`);
        }} onPointerUp={(event) => {
          const distance = event.clientY - (dragStart.current ?? event.clientY);
          dragStart.current = null;
          panelRef.current?.style.removeProperty('--sheet-drag');
          if (distance > 60) closeRef.current();
        }} onPointerCancel={() => {
          dragStart.current = null;
          panelRef.current?.style.removeProperty('--sheet-drag');
        }} aria-hidden="true"><span /></div>
        {isOpen ? children : contentRef.current}
      </div>
    </dialog>, document.body,
  );
}
