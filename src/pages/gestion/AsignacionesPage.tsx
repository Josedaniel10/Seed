import React, { useState } from 'react';
import {
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  ShieldAlert,
  Search,
} from 'lucide-react';

interface SolicitudSinRevisor {
  id: string;
  radicado: string;
  tipo: string;
  investigador: string;
  grupoInvestigacion: string;
  diasEspera: number;
}

interface RevisorCandidato {
  id: string;
  nombre: string;
  cargaTrabajo: number; // solicitudes activas
  grupoInvestigacion: string;
}

const SOLICITUDES_PENDIENTES: SolicitudSinRevisor[] = [
  {
    id: 'sol-003',
    radicado: 'Radicado 2026-003',
    tipo: 'Prórroga de Ejecución',
    investigador: 'Dra. Carmen Lucía Morales',
    grupoInvestigacion: 'Biotecnología Aplicada',
    diasEspera: 4,
  },
  {
    id: 'sol-006',
    radicado: 'Radicado 2026-007',
    tipo: 'Presentación de Proyecto',
    investigador: 'Dr. Alejandro Restrepo',
    grupoInvestigacion: 'Ciencias Básicas y Matemáticas',
    diasEspera: 2,
  },
];

const REVISORES: RevisorCandidato[] = [
  {
    id: 'rev-1',
    nombre: 'Dr. Alejandro Restrepo',
    cargaTrabajo: 2,
    grupoInvestigacion: 'Ciencias Básicas y Matemáticas',
  },
  {
    id: 'rev-2',
    nombre: 'Dra. Patricia Salamanca',
    cargaTrabajo: 1,
    grupoInvestigacion: 'Secretaría Técnica',
  },
  {
    id: 'rev-3',
    nombre: 'Dr. Germán Valenzuela',
    cargaTrabajo: 3,
    grupoInvestigacion: 'Biotecnología Aplicada',
  },
];

export function AsignacionesPage() {
  const [solicitudes, setSolicitudes] = useState(SOLICITUDES_PENDIENTES);
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>({});
  const [mensaje, setMensaje] = useState<string | null>(null);

  const handleAsignar = (solId: string) => {
    const revisorId = asignaciones[solId];
    if (!revisorId) return;

    const sol = solicitudes.find((s) => s.id === solId);
    const rev = REVISORES.find((r) => r.id === revisorId);

    // Validación de conflicto de intereses: no puede pertenecer al mismo grupo o ser el mismo investigador
    if (rev && sol && rev.grupoInvestigacion === sol.grupoInvestigacion) {
      setMensaje(`Conflicto de intereses detectado: ${rev.nombre} pertenece al mismo grupo (${sol.grupoInvestigacion}). Asignación bloqueada.`);
      return;
    }

    setSolicitudes((prev) => prev.filter((s) => s.id !== solId));
    setMensaje(`Revisor asignado exitosamente para ${sol?.radicado}.`);
    setTimeout(() => setMensaje(null), 4000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
          Asignación de Revisores
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Designación de integrantes del comité con verificación de carga de trabajo y control de conflictos de interés.
        </p>
      </div>

      {mensaje && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
            mensaje.includes('bloqueada')
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-[#A3E635]/25 border-[#84CC16] text-[#14281D]'
          }`}
        >
          {mensaje.includes('bloqueada') ? <ShieldAlert size={16} /> : <CheckCircle2 size={16} />}
          <span>{mensaje}</span>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4">
        <h3 className="font-bold text-xs text-[#14281D] uppercase tracking-wider">
          Solicitudes en espera de revisor ({solicitudes.length})
        </h3>

        {solicitudes.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500">
            No hay solicitudes pendientes de asignación en este momento.
          </div>
        ) : (
          <div className="space-y-3">
            {solicitudes.map((sol) => (
              <div
                key={sol.id}
                className="p-4 rounded-xl border border-[#E5E3DC] bg-[#F7F6F2] flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-[#14281D] px-2 py-0.5 rounded bg-white border border-stone-200">
                      {sol.radicado}
                    </span>
                    <span className="font-bold text-[#14281D]">{sol.tipo}</span>
                  </div>
                  <div className="text-stone-600">
                    Investigador: <strong>{sol.investigador}</strong> · Grupo: {sol.grupoInvestigacion}
                  </div>
                  <div className="text-[11px] text-stone-400 flex items-center gap-1">
                    <Clock size={12} />
                    <span>En espera: {sol.diasEspera} días</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={asignaciones[sol.id] || ''}
                    onChange={(e) =>
                      setAsignaciones({ ...asignaciones, [sol.id]: e.target.value })
                    }
                    className="px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white text-xs text-stone-700 outline-none"
                  >
                    <option value="">Seleccione revisor...</option>
                    {REVISORES.map((rev) => {
                      const isConflict = rev.grupoInvestigacion === sol.grupoInvestigacion;
                      return (
                        <option
                          key={rev.id}
                          value={rev.id}
                          disabled={isConflict}
                        >
                          {rev.nombre} ({rev.cargaTrabajo} activas){isConflict ? ' [Conflicto de interés]' : ''}
                        </option>
                      );
                    })}
                  </select>

                  <button
                    onClick={() => handleAsignar(sol.id)}
                    disabled={!asignaciones[sol.id]}
                    className="px-3.5 py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white font-bold rounded-xl disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    Asignar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
