import React from 'react';
import {
  Inbox,
  AlertCircle,
  Search,
  Scale,
  CheckCircle2,
  XCircle,
  Clock,
} from 'lucide-react';

export type ApplicationStatus =
  | 'RADICADA'
  | 'PENDIENTE_DOCUMENTOS'
  | 'EN_REVISION'
  | 'LISTA_COMITE'
  | 'APROBADA'
  | 'APROBADA_CON_AJUSTES'
  | 'RECHAZADA'
  | 'CERRADA';

export interface StatusConfig {
  key: ApplicationStatus;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  bgClass: string;
  textClass: string;
  borderClass: string;
  description: string;
}

export const APPLICATION_STATUS_CONFIG: Record<ApplicationStatus, StatusConfig> = {
  RADICADA: {
    key: 'RADICADA',
    label: 'Radicada',
    shortLabel: 'Radicada',
    icon: Inbox,
    bgClass: 'bg-stone-100',
    textClass: 'text-stone-800',
    borderClass: 'border-stone-200',
    description: 'Solicitud ingresada con número de radicado consecutivo',
  },
  PENDIENTE_DOCUMENTOS: {
    key: 'PENDIENTE_DOCUMENTOS',
    label: 'Pendiente por documentos',
    shortLabel: 'Pend. Docs',
    icon: AlertCircle,
    bgClass: 'bg-amber-100',
    textClass: 'text-amber-900',
    borderClass: 'border-amber-300',
    description: 'Falta un requisito subsanable o se solicitaron ajustes con plazo',
  },
  EN_REVISION: {
    key: 'EN_REVISION',
    label: 'En revisión técnica',
    shortLabel: 'En revisión',
    icon: Search,
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-900',
    borderClass: 'border-emerald-300',
    description: 'Requisitos validados y revisor par evaluando la propuesta',
  },
  LISTA_COMITE: {
    key: 'LISTA_COMITE',
    label: 'Lista para comité',
    shortLabel: 'Para comité',
    icon: Scale,
    bgClass: 'bg-[#A3E635]',
    textClass: 'text-[#14281D] font-semibold',
    borderClass: 'border-[#84CC16]',
    description: 'Concepto técnico emitido, habilitada para ingresar a la agenda',
  },
  APROBADA: {
    key: 'APROBADA',
    label: 'Aprobada',
    shortLabel: 'Aprobada',
    icon: CheckCircle2,
    bgClass: 'bg-[#14281D]',
    textClass: 'text-[#F8F7F4]',
    borderClass: 'border-[#14281D]',
    description: 'Aprobada formalmente por decisión del comité en sesión',
  },
  APROBADA_CON_AJUSTES: {
    key: 'APROBADA_CON_AJUSTES',
    label: 'Aprobada con ajustes',
    shortLabel: 'Aprob. c/ajustes',
    icon: Clock,
    bgClass: 'bg-teal-100',
    textClass: 'text-teal-900',
    borderClass: 'border-teal-300',
    description: 'Aprobada sujeta a ajustes menores verificables',
  },
  RECHAZADA: {
    key: 'RECHAZADA',
    label: 'Rechazada',
    shortLabel: 'Rechazada',
    icon: XCircle,
    bgClass: 'bg-rose-100',
    textClass: 'text-rose-900',
    borderClass: 'border-rose-300',
    description: 'Rechazada por requisito no subsanable o decisión del comité',
  },
  CERRADA: {
    key: 'CERRADA',
    label: 'Cerrada',
    shortLabel: 'Cerrada',
    icon: CheckCircle2,
    bgClass: 'bg-stone-200',
    textClass: 'text-stone-700',
    borderClass: 'border-stone-300',
    description: 'Trámite finalizado y archivado',
  },
};
