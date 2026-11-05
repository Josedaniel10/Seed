import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/layout/PageHeader.tsx';
import { MetricsStrip } from '../components/MetricsStrip.tsx';
import { Button } from '../../../components/ui/Button.tsx';
import { SeedLogo } from '../../../components/SeedLogo.tsx';
import { useCatalogStore } from '../../catalog/catalogStore.ts';
import { useGroupsStore } from '../../groups/groupsStore.ts';
import {
  Sparkles,
  ArrowRight,
  FileText,
  Layers,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Building,
  Mail,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth.ts';

export function DashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { types } = useCatalogStore();
  const { groups } = useGroupsStore();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Panel Principal del Comité de Investigación"
        description="Portal unificado para la gestión, radicación y seguimiento de proyectos de investigación institucionales."
        icon={<SeedLogo size={24} showWordmark={false} />}
        actions={
          <Button
            variant="accent"
            size="sm"
            icon={<FileText size={14} />}
            onClick={() => navigate('/catalog')}
          >
            Consultar Catálogo de Requisitos
          </Button>
        }
      />

      {/* Metrics Strip */}
      <MetricsStrip />

      {/* Hero Welcome Banner */}
      <section className="bg-white rounded-2xl border border-[#E5E3DC] p-6 md:p-8 shadow-xs relative overflow-hidden">
        <div className="max-w-2xl relative z-10 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#1E3A2B] uppercase tracking-wider">
            <Sparkles size={14} className="text-[#84CC16]" />
            Portal Institucional de Investigaciones
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[#14281D]">
            Bienvenido, {profile?.full_name || 'Investigador(a)'}
          </h2>
          <p className="text-xs md:text-sm text-stone-600 leading-relaxed">
            Gestione sus solicitudes de aval institucional, modificaciones presupuestales, prórrogas e informes periódicos con total trazabilidad documental y seguimiento en tiempo real.
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              iconRight={<ArrowRight size={13} />}
              onClick={() => navigate('/catalog')}
            >
              Explorar Catálogo de Trámites
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/groups')}
            >
              Ver Grupos de Investigación
            </Button>
          </div>
        </div>

        {/* Botanical watermark */}
        <div className="absolute right-[-20px] bottom-[-30px] opacity-10 pointer-events-none select-none text-[#14281D]">
          <SeedLogo size={260} showWordmark={false} />
        </div>
      </section>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Catalog Summary & Convocatorias */}
        <div className="lg:col-span-8 space-y-6">
          {/* Catalog Summary Card */}
          <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-[#14281D]" />
                <h3 className="font-bold text-xs text-[#14281D]">
                  Trámites y Solicitudes Disponibles
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                iconRight={<ChevronRight size={12} />}
                onClick={() => navigate('/catalog')}
              >
                Ver catálogo completo ({types.length})
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {types.map((type) => (
                <div
                  key={type.id}
                  onClick={() => navigate('/catalog')}
                  className="p-4 rounded-xl border border-[#E5E3DC] bg-[#F7F6F2] hover:bg-white hover:border-[#14281D] hover:shadow-2xs transition-all cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-white text-[#14281D] border border-stone-200">
                      {type.code}
                    </span>
                    <span className="text-[10px] text-stone-500 font-medium">
                      {type.requires_committee ? 'Deliberación en Comité' : 'Trámite Administrativo'}
                    </span>
                  </div>
                  <h4 className="font-bold text-[#14281D] group-hover:text-[#1E3A2B] leading-snug">
                    {type.name}
                  </h4>
                  <p className="text-[11px] text-stone-500 line-clamp-2 leading-relaxed">
                    {type.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Institutional Announcements */}
          <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-[#14281D]" />
                <h3 className="font-bold text-xs text-[#14281D]">
                  Convocatorias y Avisos Institucionales
                </h3>
              </div>
              <span className="text-[11px] font-medium text-stone-500">Periodo Académico 2026</span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl border border-stone-200 bg-[#F7F6F2] flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-[#14281D] flex items-center gap-2">
                    <span>Convocatoria Interna de Proyectos de Investigación 2026-I</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      Abierta
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Recepción de propuestas para docentes y semilleros adscritos a grupos institucionales.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-stone-400 block">Cierre de radicación</span>
                  <span className="font-mono font-semibold text-[#14281D]">28 Feb 2026</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-stone-200 bg-[#F7F6F2] flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="font-bold text-[#14281D] flex items-center gap-2">
                    <span>Presentación de Informes de Avance Semestrales</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                      En curso
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-600">
                    Obligatorio para proyectos vigentes aprobados en vigencias anteriores.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-stone-400 block">Fecha límite</span>
                  <span className="font-mono font-semibold text-[#14281D]">15 Mar 2026</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): User Profile & Committee Sessions */}
        <div className="lg:col-span-4 space-y-6">
          {/* User Profile Card */}
          <div className="bg-white rounded-2xl border border-[#E5E3DC] p-5 shadow-xs space-y-4 text-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-stone-100">
              <UserCheck size={16} className="text-[#14281D]" />
              <h3 className="font-bold text-xs text-[#14281D]">Mi Perfil Institucional</h3>
            </div>

            {profile && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#14281D] text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {profile.full_name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')}
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[#14281D]">{profile.full_name}</h4>
                    <p className="text-[11px] text-stone-500 font-mono">{profile.email}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#F7F6F2] border border-[#E5E3DC] space-y-2 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-stone-500">Rol asignado:</span>
                    <span className="font-bold text-[#14281D] capitalize">
                      {profile.role.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Programa:</span>
                    <span className="font-medium text-[#14281D] text-right truncate max-w-[150px]">
                      {profile.academic_program}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-stone-500">Vinculación:</span>
                    <span className="font-medium text-[#14281D] capitalize">
                      {profile.academic_link?.replace('_', ' ') || 'Docente'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Upcoming Committee Sessions Card */}
          <div className="bg-white rounded-2xl border border-[#E5E3DC] p-5 shadow-xs space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-[#14281D]" />
                <h3 className="font-bold text-xs text-[#14281D]">Próxima Sesión del Comité</h3>
              </div>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Programada
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F7F6F2] border border-[#E5E3DC] space-y-2">
              <div className="font-bold text-xs text-[#14281D]">Sesión Ordinaria Nº 04 - 2026</div>
              <div className="text-[11px] text-stone-600 space-y-1">
                <div className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-stone-400" />
                  <span>Jueves, 12 de Noviembre de 2026 · 09:00 AM</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building size={13} className="text-stone-400" />
                  <span>Sala de Juntas de Vicerrectoría / Sala Virtual</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-stone-500 leading-relaxed">
              Las solicitudes en estado <em>Lista para comité</em> que cuenten con concepto técnico favorable ingresarán al orden del día de esta sesión.
            </p>
          </div>

          {/* Technical Secretary Contact */}
          <div className="bg-white rounded-2xl border border-[#E5E3DC] p-5 shadow-xs space-y-2 text-xs">
            <h4 className="font-bold text-xs text-[#14281D] flex items-center gap-1.5">
              <Mail size={14} className="text-[#84CC16]" />
              <span>Secretaría Técnica del Comité</span>
            </h4>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Para consultas reglamentarias sobre radicación o subsanación de documentos:
            </p>
            <div className="p-2.5 rounded-lg bg-[#F7F6F2] font-mono text-[11px] text-stone-700">
              comite.investigaciones@universidad.edu.co
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
