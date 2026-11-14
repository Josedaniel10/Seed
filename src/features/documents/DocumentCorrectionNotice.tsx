import type { ReactElement } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { RequestDocument } from '../../types/database.ts';

export function DocumentCorrectionNotice({ document }: { document: RequestDocument }): ReactElement {
  const pending = ['PENDIENTE', 'PENDING'].includes(document.validation_status);
  return <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-950 space-y-1">
    <p className="flex items-center gap-2 font-bold"><CheckCircle2 size={16} className="shrink-0" aria-hidden="true" />Archivo corregido cargado</p>
    <p>{pending ? 'La nueva versión está guardada y pendiente de validación administrativa.' : 'Esta versión se recibió como subsanación. Consulte su dictamen actual.'}</p>
    <p className="text-[11px] text-emerald-800">Recibido: <time dateTime={document.uploaded_at}>{new Date(document.uploaded_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' })}</time> (Colombia).</p>
  </div>;
}
