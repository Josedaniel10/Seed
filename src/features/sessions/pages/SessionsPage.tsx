import React, { useState } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader.tsx';
import { RoleGuard } from '../../auth/RoleGuard.tsx';
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  Building,
  Plus,
  Scale,
  FileCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button.tsx';

interface SessionItem {
  id: string;
  sessionNumber: string;
  type: 'ORDINARIA' | 'EXTRAORDINARIA';
  date: string;
  time: string;
  location: string;
  quorumRequired: number;
  confirmedMembers: number;
  totalMembers: number;
  status: 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA';
  agendaCount: number;
}

const SESSIONS_DATA: SessionItem[] = [
  {
    id: 'ses-004',
    sessionNumber: 'Sesión Ordinaria Nº 04 - 2026',
    type: 'ORDINARIA',
    date: '12 de Noviembre de 2026',
    time: '09:00 AM',
    location: 'Sala de Juntas de Vicerrectoría / Sala Virtual',
    quorumRequired: 4,
    confirmedMembers: 5,
    totalMembers: 6,
    status: 'PROGRAMADA',
    agendaCount: 3,
  },
  {
    id: 'ses-003',
    sessionNumber: 'Sesión Ordinaria Nº 03 - 2026',
    type: 'ORDINARIA',
    date: '28 de Octubre de 2026',
    time: '14:00 PM',
    location: 'Sala de Consejos Académicos',
    quorumRequired: 4,
    confirmedMembers: 6,
    totalMembers: 6,
    status: 'FINALIZADA',
    agendaCount: 5,
  },
];

export function SessionsPage() {
  const navigate = useNavigate();
  const [sessions] = useState(SESSIONS_DATA);

  return (
    <RoleGuard
      allowedRoles={['integrante_comite', 'secretario', 'administrativo', 'admin']}
      fallbackTitle="Sesiones del Comité de Investigación"
      onNavigateHome={() => navigate('/')}
    >
      <div className="space-y-6">
        <PageHeader
          title="Sesiones del Comité de Investigación"
          description="Gestión colegiada de sesiones ordinarias y extraordinarias, verificación de quórum reglamentario y actas de acuerdos."
          icon={<Calendar size={22} />}
          breadcrumbs={[
            { label: 'Inicio', href: '/' },
            { label: 'Sesiones de Comité' },
          ]}
          actions={
            <Button variant="primary" size="sm" icon={<Plus size={14} />}>
              Programar Nueva Sesión
            </Button>
          }
        />

        <div className="space-y-4">
          {sessions.map((ses) => (
            <div
              key={ses.id}
              className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 rounded-xl bg-[#F7F6F2] border border-[#E5E3DC] text-[#14281D]">
                    <Calendar size={18} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-[#14281D]">{ses.sessionNumber}</h3>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          ses.status === 'PROGRAMADA'
                            ? 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                            : 'bg-stone-100 text-stone-700 border border-stone-200'
                        }`}
                      >
                        {ses.status}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-3">
                      <span>{ses.date} · {ses.time}</span>
                      <span>·</span>
                      <span>{ses.location}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <span className="text-xs bg-[#A3E635]/25 text-[#14281D] border border-[#84CC16] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    <CheckCircle2 size={13} />
                    <span>Quórum Verificado ({ses.confirmedMembers}/{ses.totalMembers})</span>
                  </span>
                </div>
              </div>

              {/* Session Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#F7F6F2] p-3 rounded-xl border border-[#E5E3DC] space-y-1">
                  <span className="text-stone-500 text-[11px]">Tipo de Sesión</span>
                  <p className="font-bold text-[#14281D] capitalize">
                    {ses.type.toLowerCase()}
                  </p>
                </div>

                <div className="bg-[#F7F6F2] p-3 rounded-xl border border-[#E5E3DC] space-y-1">
                  <span className="text-stone-500 text-[11px]">Orden del Día</span>
                  <p className="font-bold text-[#14281D]">
                    {ses.agendaCount} expedientes en agenda
                  </p>
                </div>

                <div className="bg-[#F7F6F2] p-3 rounded-xl border border-[#E5E3DC] space-y-1">
                  <span className="text-stone-500 text-[11px]">Quórum Reglamentario</span>
                  <p className="font-bold text-emerald-800 flex items-center gap-1">
                    <span>Mínimo {ses.quorumRequired} miembros</span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RoleGuard>
  );
}
