import type { ReactElement } from 'react';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { DocumentValidationStatus } from '../../types/database.ts';

export function DocumentValidationBadge({ status }: { status: DocumentValidationStatus }): ReactElement {
  const valid = status === 'VALIDO' || status === 'VALID';
  const rejected = status === 'RECHAZADO' || status === 'REJECTED';
  const Icon = valid ? CheckCircle2 : rejected ? XCircle : Clock;
  const colors = valid ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
    : rejected ? 'bg-rose-100 text-rose-800 border-rose-200' : 'bg-amber-50 text-amber-900 border-amber-200';
  return <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full border ${colors}`}>
    <Icon size={12} aria-hidden="true" />{valid ? 'Válido' : rejected ? 'Rechazado' : 'Pendiente de validación'}
  </span>;
}
