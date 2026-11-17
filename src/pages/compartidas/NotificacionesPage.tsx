import { useOpenNotification } from '../../features/notifications/useOpenNotification.ts';
import { FloatingAlert } from '../../components/ui/FloatingAlert.tsx';
import { NotificationsSkeleton } from '../../components/ui/ContentSkeletons.tsx';
import { useListFilter } from '../../hooks/useListFilter.ts';
import { Bell, Check, ArrowRight, RefreshCw } from 'lucide-react';
import { useNotifications, useMarkNotificationsRead } from '../../features/notifications/useNotifications.ts';
import { getNotificationTarget } from '../../features/notifications/notificationsApi.ts';

export function NotificacionesPage() {
  const { openNotification: handleOpen, error: navigationError, isPending: isOpening } = useOpenNotification();
  const { data: notifications = [], isPending, error, refetch } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const [unreadFilter, setUnreadFilter] = useListFilter('unread', 'false');
  const onlyUnread = unreadFilter === 'true';
  const setOnlyUnread = (value: boolean) => setUnreadFilter(String(value));
  const unreadCount = notifications.filter((notification) => !notification.is_read).length;
  const filtered = onlyUnread ? notifications.filter((notification) => !notification.is_read) : notifications;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="mobile-section-title text-xl font-extrabold text-[#14281D] flex items-center gap-2">
            <Bell size={22} /> Centro de notificaciones
          </h1>
          <p className="text-xs text-stone-500 mt-1">Novedades de sus solicitudes, asignaciones y sesiones.</p>
        </div>
        <div className="flex gap-3 text-xs font-semibold">
          <button type="button" onClick={() => void refetch()} className="flex items-center gap-1 hover:underline">
            <RefreshCw size={14} /> Actualizar
          </button>
          {unreadCount > 0 && (
            <button type="button" disabled={markRead.isPending}
              onClick={() => markRead.mutate(undefined)} className="flex items-center gap-1 hover:underline disabled:opacity-50">
              <Check size={14} /> Marcar todas como leídas
            </button>
          )}
        </div>
      </div>
      <div className="flex gap-2 text-xs font-semibold" aria-label="Filtros de notificaciones">
        <button type="button" aria-pressed={!onlyUnread} onClick={() => setOnlyUnread(false)}
          className={`px-3 py-2 rounded-xl border ${!onlyUnread ? 'bg-[#14281D] text-white' : 'bg-white'}`}>
          Todas ({notifications.length})
        </button>
        <button type="button" aria-pressed={onlyUnread} onClick={() => setOnlyUnread(true)}
          className={`px-3 py-2 rounded-xl border ${onlyUnread ? 'bg-[#14281D] text-white' : 'bg-white'}`}>
          Sin leer ({unreadCount})
        </button>
      </div>
      {isPending && <NotificationsSkeleton />}
      <FloatingAlert message={navigationError ?? markRead.error?.message ?? error?.message} />
      {!isPending && !error && (
        <div className="bg-white rounded-2xl border border-[#E5E3DC] divide-y divide-[#E5E3DC] overflow-hidden shadow-xs">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              <Bell size={24} className="mx-auto mb-2" />
              <p>{onlyUnread ? 'No tiene notificaciones sin leer.' : 'Aún no tiene notificaciones.'}</p>
            </div>
          ) : filtered.map((notification) => (
            <article key={notification.id} className={`p-4 space-y-2 text-xs ${!notification.is_read ? 'bg-[#FAF9F6]' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-bold text-[#14281D]">
                  {!notification.is_read && <span className="text-lime-700 mr-2" aria-label="Sin leer">●</span>}
                  {notification.title}
                </h2>
                {!notification.is_read && (
                  <button type="button" disabled={markRead.isPending} onClick={() => markRead.mutate(notification.id)}
                    className="shrink-0 hover:underline disabled:opacity-50">Marcar leída</button>
                )}
              </div>
              <p className="text-stone-700 leading-relaxed whitespace-pre-wrap">{notification.message}</p>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <time dateTime={notification.created_at} className="text-stone-500">
                  {new Date(notification.created_at).toLocaleString('es-CO', {
                    dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota',
                  })}
                </time>
                {getNotificationTarget(notification) && (
                  <button type="button" disabled={markRead.isPending || isOpening} onClick={() => void handleOpen(notification)}
                    className="font-bold text-[#14281D] flex items-center gap-1 hover:underline disabled:opacity-50">
                    {notification.session_id ? (notification.target_tab === 'acta' ? 'Ver acta' : 'Ver sesión') : 'Ver solicitud'}
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
