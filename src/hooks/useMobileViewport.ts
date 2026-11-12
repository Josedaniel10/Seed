import { useEffect } from 'react';

/** Follow the visual viewport when the software keyboard resizes or pans it. */
export function useMobileViewport(): void {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    let focusTimer = 0;
    const update = () => {
      const active = document.activeElement;
      const editing = active instanceof HTMLElement && active.matches('input, textarea, select, [contenteditable="true"]');
      const keyboardOpen = window.innerWidth < 768 && viewport.scale === 1 && editing
        && window.innerHeight - viewport.height > 120;
      root.style.setProperty('--visual-viewport-height', `${viewport.height}px`);
      root.style.setProperty('--visual-viewport-top', `${viewport.offsetTop}px`);
      root.style.setProperty('--keyboard-inset', `${keyboardOpen ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0}px`);
      root.toggleAttribute('data-keyboard-open', keyboardOpen);
      window.clearTimeout(focusTimer);
      if (keyboardOpen && active instanceof HTMLElement) {
        focusTimer = window.setTimeout(() => {
          const rect = active.getBoundingClientRect();
          if (rect.bottom > viewport.height + viewport.offsetTop - 80 || rect.top < viewport.offsetTop + 72) {
            active.scrollIntoView({ block: 'center', behavior: 'smooth' });
          }
        }, 100);
      }
    };
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    update();
    return () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
      window.clearTimeout(focusTimer);
      root.removeAttribute('data-keyboard-open');
      root.style.removeProperty('--keyboard-inset');
      root.style.removeProperty('--visual-viewport-height');
      root.style.removeProperty('--visual-viewport-top');
    };
  }, []);
}
