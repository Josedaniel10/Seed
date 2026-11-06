import React from 'react';
import { FilingWizard } from '../../features/applications/FilingWizard.tsx';

export function NuevaSolicitudPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E3DC] pb-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
            Asistente de Radicación Oficial
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Comité de Investigaciones · Radicación formal en 4 pasos con trazabilidad inmutable y
            consecutivo ininterrumpido.
          </p>
        </div>
      </div>

      <FilingWizard />
    </div>
  );
}
