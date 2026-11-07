import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  Check,
  Mail,
  Send,
  Calendar,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useNotificationsStore } from '../../features/notifications/notificationsStore.ts';
import { useSessionStore } from '../../stores/session.store.ts';

export function NotificacionesPage() {
  const navigate = useNavigate();
  const { user } = useSessionStore();
  const {
    notifications,
    markAsRead,
    markAllAsRead,
    getNotificationsByUser,
  } = useNotificationsStore();

  const userId = user?.id || 'usr-001';
  const userNotifications = getNotificationsByUser(userId);

  const [filterType, setFilterType] = useState<string>('ALL');

  const filtered = userNotifications.filter((n) => {
    if (filterType === 'UNREAD') return !n.is_read;
    if (filterType === 'EMAIL') return n.email_sent;
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#14281D] text-[#A3E635]">
              <Bell size={18} />
            </span>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
              Centro de Notificaciones y Avisos
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Trazabilidad en tiempo real de cambios de estado (RF-33), asignaciones de evaluadores y despacho de correo institucional (RF-34).
          </p>
        </div>

        {userNotifications.some((n) => !n.is_read) && (
          <button
            onClick={() => markAllAsRead(userId)}
            className="text-xs font-bold text-[#14281D] hover:underline flex items-center gap-1.5 cursor-pointer self-start sm:self-auto bg-white px-3 py-1.5 rounded-xl border border-[#E5E3DC] shadow-xs"
          >
            <Check size={14} />
            <span>Marcar todas como leídas</span>
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 text-xs font-semibold">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
            filterType === 'ALL'
              ? 'bg-[#14281D] text-white'
              : 'bg-white text-stone-600 border border-[#E5E3DC] hover:bg-stone-50'
          }`}
        >
          Todas ({userNotifications.length})
        </button>
        <button
          onClick={() => setFilterType('UNREAD')}
          className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors ${
            filterType === 'UNREAD'
              ? 'bg-[#14281D] text-white'
              : 'bg-white text-stone-600 border border-[#E5E3DC] hover:bg-stone-50'
          }`}
        >
          Sin leer ({userNotifications.filter((n) => !n.is_read).length})
        </button>
        <button
          onClick={() => setFilterType('EMAIL')}
          className={`px-3 py-1.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1 ${
            filterType === 'EMAIL'
              ? 'bg-[#14281D] text-white'
              : 'bg-white text-stone-600 border border-[#E5E3DC] hover:bg-stone-50'
          }`}
        >
          <Mail size={12} />
          <span>Con copia institucional (RF-34)</span>
        </button>
      </div>

      {/* Lista de Notificaciones */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] divide-y divide-[#E5E3DC] overflow-hidden shadow-xs text-xs">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 space-y-1">
            <Bell size={24} className="mx-auto text-stone-300 mb-1" />
            <p className="font-bold text-stone-700">No hay notificaciones en este filtro</p>
            <p className="text-[11px]">Los avisos aparecerán automáticamente con los avances del comité.</p>
          </div>
        ) : (
          filtered.map((n) => {
            const dateFormatted = new Date(n.created_at).toLocaleString('es-CO', {
              dateStyle: 'medium',
              timeStyle: 'short',
            });

            return (
              <div
                key={n.id}
                className={`p-4 flex items-start justify-between gap-4 transition-colors ${
                  !n.is_read ? 'bg-[#FAF9F6]' : 'hover:bg-stone-50/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                      !n.is_read
                        ? 'bg-[#14281D] text-[#A3E635]'
                        : 'bg-stone-100 text-stone-500'
                    }`}
                  >
                    <Bell size={16} />
                  </span>

                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-xs text-[#14281D]">{n.title}</h4>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-[#84CC16]" />
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-100 text-stone-600 uppercase border border-stone-200">
                        {n.type}
                      </span>
                    </div>

                    <p className="text-stone-700 leading-relaxed">{n.message}</p>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-stone-400 pt-1">
                      <span>{dateFormatted}</span>

                      {n.email_sent && (
                        <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Mail size={11} />
                          <span>Notificado a {n.email_recipient || user?.email}</span>
                        </span>
                      )}

                      {n.filing_number && n.application_id && (
                        <button
                          onClick={() => navigate(`/solicitudes/${n.application_id}`)}
                          className="font-bold text-[#14281D] hover:underline cursor-pointer"
                        >
                          Ver expediente {n.filing_number}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {!n.is_read && (
                  <button
                    onClick={() => markAsRead(n.id)}
                    className="text-[11px] text-stone-500 hover:text-[#14281D] font-semibold shrink-0 cursor-pointer p-1"
                    title="Marcar como leída"
                  >
                    Marcar leída
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
