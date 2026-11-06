import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCircle2, Clock, FileText, Check } from 'lucide-react';

interface NotificacionItem {
  id: string;
  titulo: string;
  mensaje: string;
  fecha: string;
  leida: boolean;
  solicitudId?: string;
  radicado?: string;
}

const NOTIFICACIONES_INICIALES: NotificacionItem[] = [
  {
    id: 'n-1',
    titulo: 'Revisor técnico asignado',
    mensaje: 'Se ha asignado al Dr. Alejandro Restrepo para la evaluación de su propuesta.',
    fecha: 'Hoy · 10:45 AM',
    leida: false,
    solicitudId: 'sol-001',
    radicado: 'Radicado 2026-014',
  },
  {
    id: 'n-2',
    titulo: 'Validación documental aprobada',
    mensaje: 'Su expediente cumplió a satisfacción con todos los requisitos exigidos.',
    fecha: 'Ayer · 16:20 PM',
    leida: false,
    solicitudId: 'sol-001',
    radicado: 'Radicado 2026-014',
  },
  {
    id: 'n-3',
    titulo: 'Convocatoria de Sesión Ordinaria',
    mensaje: 'Se ha programado la Sesión Nº 04 de Comité para el 12 de noviembre.',
    fecha: '02 Nov 2026',
    leida: true,
  },
];

export function NotificacionesPage() {
  const navigate = useNavigate();
  const [notificaciones, setNotificaciones] = useState(NOTIFICACIONES_INICIALES);

  const marcarComoLeida = (id: string) => {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
  };

  const marcarTodasLeidas = () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
            Centro de Notificaciones
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Avisos de avance, asignaciones y requerimientos de subsanación de sus trámites.
          </p>
        </div>

        <button
          onClick={marcarTodasLeidas}
          className="text-xs font-semibold text-[#14281D] hover:underline flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <Check size={14} />
          <span>Marcar todas como leídas</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E3DC] divide-y divide-[#E5E3DC] overflow-hidden shadow-xs text-xs">
        {notificaciones.map((n) => (
          <div
            key={n.id}
            className={`p-4 flex items-start justify-between gap-4 transition-colors ${
              !n.leida ? 'bg-[#F7F6F2]/60' : 'hover:bg-stone-50/50'
            }`}
          >
            <div className="flex items-start gap-3">
              <span
                className={`p-2 rounded-xl mt-0.5 ${
                  !n.leida ? 'bg-[#14281D] text-white' : 'bg-stone-100 text-stone-500'
                }`}
              >
                <Bell size={15} />
              </span>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-[#14281D]">{n.titulo}</h4>
                  {!n.leida && (
                    <span className="w-2 h-2 rounded-full bg-[#84CC16]" />
                  )}
                </div>
                <p className="text-stone-600">{n.mensaje}</p>
                <div className="flex items-center gap-3 text-[11px] text-stone-400 pt-1">
                  <span>{n.fecha}</span>
                  {n.radicado && n.solicitudId && (
                    <>
                      <span>·</span>
                      <button
                        onClick={() => navigate(`/solicitudes/${n.solicitudId}`)}
                        className="font-bold text-[#14281D] hover:underline"
                      >
                        Ver {n.radicado}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {!n.leida && (
              <button
                onClick={() => marcarComoLeida(n.id)}
                className="text-[11px] text-stone-500 hover:text-[#14281D] font-medium shrink-0 cursor-pointer"
              >
                Marcar leída
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
