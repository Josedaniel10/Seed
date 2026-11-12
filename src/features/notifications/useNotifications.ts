import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSupabaseClient } from '../../lib/supabase.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { fetchNotifications, markNotificationsRead } from './notificationsApi.ts';

export const notificationKeys = {
  all: ['notifications'] as const,
  user: (userId: string | undefined) => ['notifications', userId] as const,
};

export function useNotifications() {
  const userId = useSessionStore((state) => state.user?.id);
  return useQuery({
    queryKey: notificationKeys.user(userId),
    queryFn: ({ signal }) => userId ? fetchNotifications(userId, signal) : Promise.resolve([]),
    enabled: Boolean(userId),
    // Recover missed events after a disconnect, even when Realtime is unavailable.
    refetchInterval: 30000,
    staleTime: 5000,
    gcTime: 0,
  });
}

export function useMarkNotificationsRead() {
  const userId = useSessionStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string | undefined) => {
      if (!userId) throw new Error('Inicie sesión para consultar sus notificaciones.');
      await markNotificationsRead(userId, id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.user(userId) });
    },
  });
}

export function NotificationsSync(): null {
  const userId = useSessionStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  useEffect(() => {
    const client = getSupabaseClient();
    if (!userId || !client) return;
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: notificationKeys.user(userId) });
    };
    const channel = client.channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}`,
      }, refresh)
      .subscribe((status) => { if (status === 'SUBSCRIBED') refresh(); });
    return () => {
      void client.removeChannel(channel);
      void queryClient.cancelQueries({ queryKey: notificationKeys.user(userId) });
      queryClient.removeQueries({ queryKey: notificationKeys.user(userId) });
    };
  }, [userId, queryClient]);
  return null;
}
