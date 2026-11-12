import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSessionStore } from '../stores/session.store.ts';

interface ScrollPosition {
  top: number;
  carousels: number[];
}
const positions = new Map<string, ScrollPosition>();

export function useRouteScrollRestoration(): void {
  const { pathname } = useLocation();
  const user = useSessionStore((state) => state.user);
  const key = `${user?.id}:${user?.activeRole}:${pathname}`;

  useLayoutEffect(() => {
    const previousBehavior = history.scrollRestoration;
    history.scrollRestoration = 'manual';
    const saved = positions.get(key) ?? { top: 0, carousels: [] };
    const selector = 'main .mobile-carousel, main .overflow-x-auto';
    let restoring = true;
    let lastPosition = saved;

    const restore = () => {
      if (!restoring) return;
      window.scrollTo({ top: saved.top, behavior: 'instant' });
      const carousels = document.querySelectorAll<HTMLElement>(selector);
      carousels.forEach((element, index) => { element.scrollLeft = saved.carousels[index] ?? 0; });
      const verticalReady = Math.abs(window.scrollY - saved.top) < 2;
      const horizontalReady = saved.carousels.every((left, index) => left === 0 || Math.abs((carousels[index]?.scrollLeft ?? 0) - left) < 2);
      if (verticalReady && horizontalReady) restoring = false;
    };
    const save = () => {
      if (restoring) return;
      lastPosition = {
        top: window.scrollY,
        carousels: Array.from(document.querySelectorAll<HTMLElement>(selector), (element) => element.scrollLeft),
      };
    };
    const stopRestoring = () => { restoring = false; };
    const observer = new ResizeObserver(restore);
    observer.observe(document.body);
    const contentObserver = new MutationObserver(restore);
    contentObserver.observe(document.body, { childList: true, subtree: true });
    restore();
    const timeout = window.setTimeout(stopRestoring, 5000);
    document.addEventListener('scroll', save, true);
    window.addEventListener('wheel', stopRestoring, { passive: true });
    window.addEventListener('touchstart', stopRestoring, { passive: true });
    window.addEventListener('pointerdown', stopRestoring);
    window.addEventListener('keydown', stopRestoring);

    return () => {
      positions.set(key, lastPosition);
      observer.disconnect();
      contentObserver.disconnect();
      window.clearTimeout(timeout);
      document.removeEventListener('scroll', save, true);
      window.removeEventListener('wheel', stopRestoring);
      window.removeEventListener('touchstart', stopRestoring);
      window.removeEventListener('pointerdown', stopRestoring);
      window.removeEventListener('keydown', stopRestoring);
      history.scrollRestoration = previousBehavior;
    };
  }, [key]);
}
