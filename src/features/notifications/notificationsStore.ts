import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type NotificationType =
  | 'ASIGNACION_REVISOR'
  | 'VALIDACION_DOCUMENTAL'
  | 'REQUERIMIENTO_AJUSTES'
  | 'CONVOCATORIA_SESION'
  | 'DECISION_COMITE'
  | 'ACTA_PUBLICADA'
  | 'AVISO_SISTEMA';

export interface AppNotification {
  id: string;
  user_id: string; // Destinatario
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  application_id?: string;
  filing_number?: string;
  email_sent?: boolean; // T5.7: Integración con correo institucional
  email_recipient?: string;
  created_at: string;
}

export interface NotificationsState {
  notifications: AppNotification[];
  isLoading: boolean;

  // Acciones T5.6: Notificaciones Internas
  addNotification: (
    payload: Omit<AppNotification, 'id' | 'is_read' | 'created_at'>
  ) => AppNotification;
  markAsRead: (id: string) => void;
  markAllAsRead: (userId: string) => void;
  getNotificationsByUser: (userId: string) => AppNotification[];
  getUnreadCountByUser: (userId: string) => number;

  // Acciones T5.7: Notificación simulada por correo institucional
  simulateEmailDispatch: (notificationId: string) => boolean;

  resetToInitialSeed: () => void;
}

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-001',
    user_id: 'usr-001', // Dra. Carmen Morales
    type: 'ASIGNACION_REVISOR',
    title: 'Evaluador Asignado a su Propuesta',
    message: 'El Dr. Alejandro Restrepo ha sido designado como evaluador técnico para el Radicado 2026-001.',
    is_read: false,
    application_id: 'sol-001',
    filing_number: 'Radicado 2026-001',
    email_sent: true,
    email_recipient: 'investigador@universidad.edu.co',
    created_at: '2026-02-02T10:00:00Z',
  },
  {
    id: 'notif-002',
    user_id: 'usr-001',
    type: 'REQUERIMIENTO_AJUSTES',
    title: 'Requerimiento de Ajuste Técnico Obligatorio',
    message: 'Se solicita subsanar la cotización presupuestal con discriminación de IVA antes de 5 días hábiles.',
    is_read: false,
    application_id: 'sol-002',
    filing_number: 'Radicado 2026-002',
    email_sent: true,
    email_recipient: 'investigador@universidad.edu.co',
    created_at: '2026-02-03T11:05:00Z',
  },
  {
    id: 'notif-003',
    user_id: 'usr-003', // Integrante de comité
    type: 'CONVOCATORIA_SESION',
    title: 'Convocatoria Formal a Sesión de Comité',
    message: 'Ha sido citado a la Sesión Ordinaria Nº 04 - 2026 para el jueves 12 de noviembre a las 09:00 AM.',
    is_read: true,
    email_sent: true,
    email_recipient: 'comite@universidad.edu.co',
    created_at: '2026-11-02T08:00:00Z',
  },
];

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set, get) => ({
      notifications: INITIAL_NOTIFICATIONS,
      isLoading: false,

      // =========================================================
      // T5.6: NOTIFICACIONES INTERNAS DENTRO DE LA PLATAFORMA (RF-33)
      // =========================================================
      addNotification: (payload) => {
        const newNotif: AppNotification = {
          ...payload,
          id: `notif-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
          is_read: false,
          created_at: new Date().toISOString(),
        };

        set((state) => ({
          notifications: [newNotif, ...state.notifications],
        }));

        // T5.7: Si tiene destinatario institucional, simular despacho de correo
        if (payload.email_recipient) {
          get().simulateEmailDispatch(newNotif.id);
        }

        return newNotif;
      },

      markAsRead: (id) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, is_read: true } : n
          ),
        }));
      },

      markAllAsRead: (userId) => {
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.user_id === userId ? { ...n, is_read: true } : n
          ),
        }));
      },

      getNotificationsByUser: (userId) => {
        return get()
          .notifications.filter((n) => n.user_id === userId)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      },

      getUnreadCountByUser: (userId) => {
        return get().notifications.filter((n) => n.user_id === userId && !n.is_read).length;
      },

      // =========================================================
      // T5.7: INTEGRACIÓN DE CORREO INSTITUCIONAL (RF-34)
      // =========================================================
      simulateEmailDispatch: (notificationId) => {
        const notif = get().notifications.find((n) => n.id === notificationId);
        if (!notif) return false;

        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === notificationId ? { ...n, email_sent: true } : n
          ),
        }));

        return true;
      },

      resetToInitialSeed: () => {
        set({
          notifications: INITIAL_NOTIFICATIONS,
          isLoading: false,
        });
      },
    }),
    {
      name: 'seed_notifications_store',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
          return window.localStorage;
        }
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    }
  )
);
