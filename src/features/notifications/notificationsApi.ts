import { z } from 'zod';
import { getSupabaseClient } from '../../lib/supabase.ts';

export const notificationSchema = z.object({
  id: z.string().uuid(), user_id: z.string().uuid(), type: z.string(),
  title: z.string(), message: z.string(), is_read: z.boolean(),
  application_id: z.string().uuid().nullable(), session_id: z.string().uuid().nullable(),
  target_tab: z.enum(['resumen', 'documentos', 'observaciones', 'historial', 'agenda', 'acta']).nullable(),
  created_at: z.string(),
});
export type AppNotification = z.infer<typeof notificationSchema>;

function requireClient() {
  const client = getSupabaseClient();
  if (!client) throw new Error('No pudimos consultar tus notificaciones. Inténtalo nuevamente más tarde.');
  return client;
}

export async function fetchNotifications(userId: string, signal?: AbortSignal): Promise<AppNotification[]> {
  const client = requireClient();
  const notifications: AppNotification[] = [];
  // PostgREST caps responses: page through the complete inbox so the unread count is accurate.
  const pageSize = 500;
  for (let offset = 0; ; offset += pageSize) {
    const query = client.from('notifications').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).order('id', { ascending: false })
      .range(offset, offset + pageSize - 1);
    const { data, error } = await (signal ? query.abortSignal(signal) : query);
    if (error) throw new Error('No se pudieron cargar las notificaciones. Intente nuevamente.');
    const page = notificationSchema.array().parse(data);
    notifications.push(...page);
    if (page.length < pageSize) return notifications;
  }
}

export async function markNotificationsRead(userId: string, id?: string): Promise<void> {
  let query = requireClient().from('notifications').update({ is_read: true })
    .eq('user_id', userId).eq('is_read', false);
  if (id) query = query.eq('id', id);
  const { error } = await query;
  if (error) throw new Error('No se pudo guardar la lectura de las notificaciones. Intente nuevamente.');
}

export function getNotificationTarget(notification: AppNotification): string | null {
  if (notification.session_id) {
    const tab = notification.target_tab === 'acta' ? 'acta' : 'agenda';
    return `/sesiones/${encodeURIComponent(notification.session_id)}?tab=${tab}`;
  }
  if (notification.application_id) {
    const tab = notification.target_tab ?? 'resumen';
    return `/solicitudes/${encodeURIComponent(notification.application_id)}?tab=${tab}`;
  }
  return null;
}
