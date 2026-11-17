import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { normalizeRole } from '../../lib/permissions.ts';
import { getUserError } from '../../lib/userMessages.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { useMarkNotificationsRead } from './useNotifications.ts';
import { getNotificationTarget } from './notificationsApi.ts';
import type { AppNotification } from './notificationsApi.ts';

export function useOpenNotification() {
  const navigate = useNavigate();
  const user = useSessionStore((state) => state.user);
  const markRead = useMarkNotificationsRead();
  const [error, setError] = useState<string | null>(null);
  const openNotification = async (notification: AppNotification): Promise<boolean> => {
    setError(null);
    const target = getNotificationTarget(notification);
    if (!target || !user) return false;
    const permitted = ['secretary', 'committee_member', 'admin'];
    const nextRole = notification.session_id && !permitted.includes(normalizeRole(user.activeRole))
      ? user.roles.find((role) => permitted.includes(normalizeRole(role))) : user.activeRole;
    if (!nextRole) { setError('Tu cuenta no tiene permiso para abrir esta sesión.'); return false; }
    try {
      if (!notification.is_read) await markRead.mutateAsync(notification.id);
      if (useSessionStore.getState().user?.id !== user.id) return false;
      if (nextRole !== user.activeRole) useSessionStore.getState().setActiveRole(nextRole);
      navigate(target, { state: { fromList: '/notificaciones' } });
      return true;
    } catch (cause) { setError(getUserError(cause, 'No pudimos abrir la notificación. Inténtalo nuevamente.')); return false; }
  };
  return { openNotification, error, isPending: markRead.isPending, clearError: () => setError(null) };
}
