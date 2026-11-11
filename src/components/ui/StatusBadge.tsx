import React from 'react';
import { APPLICATION_STATUS_CONFIG, ApplicationStatus } from '../../types/theme.ts';

const STATUS_ALIASES: Record<string, ApplicationStatus> = {
  SUBMITTED: 'RADICADA', PENDING_DOCUMENTS: 'PENDIENTE_DOCUMENTOS', UNDER_REVIEW: 'EN_REVISION',
  COMMITTEE_READY: 'LISTA_COMITE', APPROVED: 'APROBADA', APPROVED_WITH_ADJUSTMENTS: 'APROBADA_CON_AJUSTES',
  REJECTED: 'RECHAZADA', CLOSED: 'CERRADA',
};

export interface StatusBadgeProps {
  status: ApplicationStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const normalizedKey = STATUS_ALIASES[status.toUpperCase()] ?? status.toUpperCase();
  const config = APPLICATION_STATUS_CONFIG[normalizedKey] || {
    label: status,
    description: '',
    bgClass: 'bg-stone-100',
    textClass: 'text-stone-700',
    borderClass: 'border-stone-300',
    icon: () => null,
  };

  const IconComponent = config.icon;
  const sizeStyles = size === 'sm' ? 'text-[10px] px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';

  return (
    <span
      className={`inline-flex items-center font-medium rounded-lg border ${sizeStyles} ${config.bgClass} ${config.textClass} ${config.borderClass} ${className}`}
      title={config.description}
    >
      <IconComponent size={size === 'sm' ? 11 : 13} className="shrink-0" />
      <span>{config.label}</span>
    </span>
  );
}
