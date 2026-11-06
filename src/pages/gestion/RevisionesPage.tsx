import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  FileText,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface SolicitudRevision {
  id: string;
  radicado: string;
  tipo: string;
  titulo: string;
  investigador: string;
  plazo: string;
  diasRestantes: number;
  vencida: boolean;
}

const REVISIONES_MOCK: SolicitudRevision[] = [
  {
    id: 'sol-003',
    radicado: 'Radicado 2026-003',
    tipo: 'Prórroga de Ejecución',
    titulo: 'Extensión de Calendario de Campo Fase 2',
    investigador: 'Dra. Carmen Morales',
    plazo: '08 Nov 2026',
    diasRestantes: 4,
    vencida: false,
  },
  {
    id: 'sol-008',
    radicado: 'Radicado 2026-001',
    tipo: 'Presentación de Proyecto',
    titulo: 'Aislamiento de Cepas Nativas con Capacidad Biorremediadora',
    investigador: 'Dr. Germán Valenzuela',
    plazo: '02 Nov 2026',
    diasRestantes: -2,
    vencida: true,
  },
];

export function RevisionesPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
          Mis Revisiones Asignadas
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Expedientes asignados como ponente o evaluador del comité institucional.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E3DC] overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F7F6F2] border-b border-[#E5E3DC] text-[11px] font-bold uppercase tracking-wider text-stone-600">
            <tr>
              <th className="py-3 px-4">Radicado</th>
              <th className="py-3 px-4">Tipo</th>
              <th className="py-3 px-4">Título del Proyecto</th>
              <th className="py-3 px-4">Investigador</th>
              <th className="py-3 px-4">Plazo de Revisión</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E3DC]">
            {REVISIONES_MOCK.map((item) => (
              <tr
                key={item.id}
                onClick={() => navigate(`/solicitudes/${item.id}`)}
                className="hover:bg-[#FAF9F6] cursor-pointer transition-colors"
              >
                <td className="py-3.5 px-4 font-mono font-bold text-[#14281D]">
                  {item.radicado}
                </td>
                <td className="py-3.5 px-4 text-stone-700">{item.tipo}</td>
                <td className="py-3.5 px-4 font-semibold text-[#14281D] max-w-xs truncate">
                  {item.titulo}
                </td>
                <td className="py-3.5 px-4 text-stone-600">{item.investigador}</td>
                <td className="py-3.5 px-4">
                  {item.vencida ? (
                    <span className="text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full flex items-center gap-1 w-fit">
                      <AlertCircle size={12} /> Vencida ({Math.abs(item.diasRestantes)} días)
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium text-stone-600 flex items-center gap-1">
                      <Clock size={12} className="text-stone-400" />
                      <span>{item.plazo} ({item.diasRestantes} días)</span>
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/solicitudes/${item.id}`);
                    }}
                    className="px-3 py-1.5 bg-[#14281D] hover:bg-[#1E3A2B] text-white rounded-lg font-bold text-xs inline-flex items-center gap-1 transition-colors"
                  >
                    <Eye size={12} />
                    <span>Evaluar</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
