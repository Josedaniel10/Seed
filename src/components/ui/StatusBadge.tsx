import React from 'react';
import { APPLICATION_STATUS_CONFIG, ApplicationStatus } from '../../types/theme.ts';

export interface StatusBadgeProps {
  status: ApplicationStatus | string;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const normalizedKey = status.toUpperCase() as ApplicationStatus;
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
