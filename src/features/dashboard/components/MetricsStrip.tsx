import React from 'react';
import { APPLICATION_STATUS_CONFIG, ApplicationStatus } from '../../../types/theme.ts';
import { useCatalogStore } from '../../catalog/catalogStore.ts';

export function MetricsStrip() {
  const catalogCount = useCatalogStore((s) => s.types.length);
  const requirementsCount = useCatalogStore((s) => s.requirements.length);

  // Simulated live counters for the 6 core states (RF-35)
  const metrics: Array<{ status: ApplicationStatus; count: number }> = [
    { status: 'RADICADA', count: 4 },
    { status: 'PENDIENTE_DOCUMENTOS', count: 2 },
    { status: 'EN_REVISION', count: 5 },
    { status: 'LISTA_COMITE', count: 3 },
    { status: 'APROBADA', count: 12 },
    { status: 'RECHAZADA', count: 1 },
  ];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-stone-600">
        <span className="font-bold text-[#14281D] uppercase tracking-wider text-[11px]">
          Resumen General de Trámites
        </span>
        <span className="text-[11px] text-stone-500 font-medium">
          {catalogCount} tipos de trámite · {requirementsCount} requisitos configurados
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map(({ status, count }) => {
          const conf = APPLICATION_STATUS_CONFIG[status];
          const Icon = conf.icon;

          return (
            <div
              key={status}
              className={`p-3 rounded-xl border flex flex-col justify-between transition-all bg-white hover:border-stone-400 shadow-2xs ${conf.borderClass}`}
            >
              <div className="flex items-center justify-between text-stone-500 mb-1">
                <span className="text-[10px] font-semibold truncate max-w-[85px]">
                  {conf.label}
                </span>
                <span className={`p-1 rounded-md ${conf.bgClass} ${conf.textClass}`}>
                  <Icon size={12} />
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-[#14281D] tabular-nums">
                {count}
              </div>
              <div className="text-[10px] text-stone-400 mt-1 truncate">
                {status === 'LISTA_COMITE' ? 'Para sesión' : 'En seguimiento'}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
