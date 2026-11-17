import { useEffect, useId, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bell, ArrowRight, X, RefreshCw } from 'lucide-react';
import { useNotifications } from './useNotifications.ts';
import { useOpenNotification } from './useOpenNotification.ts';
import { getNotificationTarget } from './notificationsApi.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { useDismissiblePopover } from '../../hooks/useDismissiblePopover.ts';
import { getUserError } from '../../lib/userMessages.ts';

export function NotificationPopover({ mobile = false, onOpen }: { mobile?: boolean; onOpen?: () => void }): ReactElement {
  const id = useId();
  const location = useLocation();
  const user = useSessionStore((state) => state.user);
  const { data = [], isPending, error, refetch } = useNotifications();
  const { openNotification, error: openError, isPending: opening, clearError } = useOpenNotification();
  const [isOpen, setIsOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const nativePopover = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;
  const close = (restoreFocus = false) => {
    if (nativePopover && panel.current?.matches(':popover-open')) panel.current.hidePopover();
    setIsOpen(false);
    if (restoreFocus) trigger.current?.focus({ preventScroll: true });
  };
  // Also supplies outside-click, focus-leave and Escape behavior in older browsers.
  const container = useDismissiblePopover(isOpen, close);
  useEffect(() => { close(); clearError(); }, [location.key, user?.id, user?.activeRole]);
  useEffect(() => {
    if (!isOpen || typeof window.matchMedia !== 'function') return;
    const viewport = window.matchMedia('(width < 768px)');
    const dismiss = () => close();
    viewport.addEventListener('change', dismiss);
    return () => viewport.removeEventListener('change', dismiss);
  }, [isOpen]);
  const unread = data.filter((notification) => !notification.is_read).length;
  const recent = [...data].sort((left, right) => Date.parse(right.created_at) - Date.parse(left.created_at)).slice(0, 5);
  let status = unread ? `${unread} sin leer` : 'Estás al día';
  if (isPending) status = 'Consultando novedades…';
  if (error) status = 'No disponible en este momento';
  return <div ref={container} className={mobile ? 'notification-disclosure mobile-tab' : 'notification-disclosure'}>
    <button ref={trigger} type="button" aria-label="Abrir notificaciones" aria-expanded={isOpen} aria-controls={id}
      popoverTarget={nativePopover ? id : undefined}
      className={mobile ? 'notification-mobile-trigger' : 'notification-trigger'}
      onClick={() => { clearError(); onOpen?.(); if (!nativePopover) setIsOpen((value) => !value); }}>
      <span className="relative inline-flex"><Bell size={mobile ? 22 : 19} strokeWidth={1.8} aria-hidden="true" />
        {unread > 0 && <span className="notification-count" aria-label={`${unread} sin leer`}>{unread > 99 ? '99+' : unread}</span>}
      </span>{mobile && <span>Avisos</span>}
    </button>
    <div ref={panel} id={id} popover={nativePopover ? 'auto' : undefined} hidden={!nativePopover && !isOpen}
      onToggle={(event) => setIsOpen(event.newState === 'open')} role="region" aria-labelledby={`${id}-title`}
      className={`notification-popover ${mobile ? 'notification-popover-mobile' : ''}`} data-native={nativePopover}>
      <header className="notification-popover-header"><div><h2 id={`${id}-title`}>Notificaciones</h2><p>{status}</p></div>
        <button type="button" onClick={() => close(true)} aria-label="Cerrar notificaciones" className="notification-close"><X size={18} /></button>
      </header>
      {isPending && <p role="status" className="p-6 text-sm text-stone-500">Consultando notificaciones…</p>}
      {(error || openError) && <div role="alert" className="m-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800"><p>{openError || getUserError(error, 'No pudimos cargar tus notificaciones. Inténtalo nuevamente.')}</p>{error && <button type="button" onClick={() => void refetch()} className="mt-2 inline-flex min-h-11 items-center gap-2 font-semibold"><RefreshCw size={14} /> Reintentar</button>}</div>}
      {!isPending && !error && !recent.length && <div className="p-8 text-center text-sm text-stone-500"><Bell size={28} className="mx-auto mb-3 text-stone-300" /><p>Aún no tienes notificaciones.</p><p className="mt-1 text-xs">Las novedades de tus trámites aparecerán aquí.</p></div>}
      {!isPending && !error && recent.length > 0 && <ul className="notification-preview-list">{recent.map((notification) => <li key={notification.id} data-unread={!notification.is_read}>
        <div className="notification-preview-heading"><span className="notification-unread-dot" aria-label={notification.is_read ? undefined : 'Sin leer'} /><h3>{notification.title}</h3></div>
        <p className="notification-preview-message">{notification.message}</p>
        <div className="notification-preview-footer"><time dateTime={notification.created_at}>{new Date(notification.created_at).toLocaleString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}</time>
          {getNotificationTarget(notification) && <button type="button" disabled={opening} onClick={() => { void openNotification(notification).then((opened) => { if (opened) close(); }); }} aria-label={`Abrir ${notification.title}`}>Abrir <ArrowRight size={14} aria-hidden="true" /></button>}
        </div>
      </li>)}</ul>}
      <footer className="notification-popover-footer"><Link to="/notificaciones" onClick={() => close()}>Ver todas las notificaciones <ArrowRight size={16} aria-hidden="true" /></Link></footer>
    </div>
  </div>;
}
