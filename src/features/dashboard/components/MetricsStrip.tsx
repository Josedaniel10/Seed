import React, { useMemo } from 'react';
import { APPLICATION_STATUS_CONFIG, ApplicationStatus } from '../../../types/theme.ts';
import { useCatalogStore } from '../../catalog/catalogStore.ts';
import { useRequestStore } from '../../requests/requestStore.ts';

export interface MetricsStripProps {
  onSelectStatus?: (status: ApplicationStatus | 'TODOS') => void;
  selectedStatus?: ApplicationStatus | 'TODOS';
}

export function MetricsStrip({ onSelectStatus, selectedStatus }: MetricsStripProps) {
  const catalogCount = useCatalogStore((s) => s.types.length);
  const requirementsCount = useCatalogStore((s) => s.requirements.length);
  const applications = useRequestStore((s) => s.requests);

  // Contadores reales individuales para cada estado exacto (RF-35)
  const realCounts = useMemo(() => {
    const counts: Record<string, number> = {
      RADICADA: 0,
      PENDIENTE_DOCUMENTOS: 0,
      EN_REVISION: 0,
      LISTA_COMITE: 0,
      APROBADA: 0,
      APROBADA_CON_AJUSTES: 0,
      RECHAZADA: 0,
      CERRADA: 0,
    };

    for (const app of applications) {
      const s = app.current_status as string;
      if (counts[s] !== undefined) {
        counts[s]++;
      } else if (s === 'SUBMITTED') {
        counts.RADICADA++;
      } else if (s === 'PENDING_DOCUMENTS') {
        counts.PENDIENTE_DOCUMENTOS++;
      } else if (s === 'UNDER_REVIEW') {
        counts.EN_REVISION++;
      } else if (s === 'COMMITTEE_READY') {
        counts.LISTA_COMITE++;
      } else if (s === 'APPROVED') {
        counts.APROBADA++;
      } else if (s === 'APPROVED_WITH_ADJUSTMENTS') {
        counts.APROBADA_CON_AJUSTES++;
      } else if (s === 'REJECTED') {
        counts.RECHAZADA++;
      } else if (s === 'CLOSED') {
        counts.CERRADA++;
      }
    }

    return counts;
  }, [applications]);

  const metrics: Array<{ status: ApplicationStatus; count: number }> = [
    { status: 'RADICADA', count: realCounts.RADICADA },
    { status: 'PENDIENTE_DOCUMENTOS', count: realCounts.PENDIENTE_DOCUMENTOS },
    { status: 'EN_REVISION', count: realCounts.EN_REVISION },
    { status: 'LISTA_COMITE', count: realCounts.LISTA_COMITE },
    { status: 'APROBADA', count: realCounts.APROBADA + realCounts.APROBADA_CON_AJUSTES },
    { status: 'RECHAZADA', count: realCounts.RECHAZADA },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-stone-600">
        <span className="font-bold text-[#14281D] uppercase tracking-wider text-[11px]">
          Franja Superior de Métricas Unificada (RF-35)
        </span>
        <span className="text-[11px] text-stone-500 font-medium">
          {applications.length} expedientes registrados · {catalogCount} tipos activos
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map(({ status, count }) => {
          const conf = APPLICATION_STATUS_CONFIG[status];
          const Icon = conf.icon;
          const isSelected = selectedStatus === status;

          return (
            <div
              key={status}
              onClick={() => onSelectStatus?.(isSelected ? 'TODOS' : status)}
              className={`p-3.5 rounded-2xl border flex flex-col justify-between transition-all bg-white cursor-pointer shadow-xs ${
                isSelected
                  ? 'border-[#14281D] ring-2 ring-[#14281D] shadow-sm'
                  : 'border-[#E5E3DC] hover:border-stone-400'
              }`}
            >
              <div className="flex items-center justify-between text-stone-500 mb-1">
                <span className="text-[11px] font-bold truncate max-w-[95px] text-stone-700">
                  {conf.shortLabel || conf.label}
                </span>
                <span className={`p-1 rounded-lg ${conf.bgClass} ${conf.textClass}`}>
                  <Icon size={12} />
                </span>
              </div>
              <div className="text-2xl font-extrabold font-mono text-[#14281D] tabular-nums mt-0.5">
                {count}
              </div>
              <div className="text-[10px] text-stone-400 mt-1 truncate">
                {status === 'LISTA_COMITE'
                  ? 'Para sesión'
                  : status === 'APROBADA'
                  ? 'Concluidas'
                  : 'En trámite activo'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
