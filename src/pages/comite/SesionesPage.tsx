import { SessionsSkeleton } from '../../components/ui/ContentSkeletons.tsx';
import { ResponsiveOverlay } from '../../components/ui/ResponsiveOverlay.tsx';
import { useUserStore } from '../../features/users/userStore.ts';
import { normalizeRole } from '../../lib/permissions.ts';
import { useCommitteeData } from '../../features/sessions/useCommitteeData.ts';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building,
  ChevronRight,
  X,
  FileCheck,
  Lock,
} from 'lucide-react';
import { useCommitteeSessionsStore } from '../../features/sessions/committeeSessionsStore.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { SessionType } from '../../types/database.ts';

export function SesionesPage() {
  useCommitteeData();
  const navigate = useNavigate();
  const { user } = useSessionStore();
  const users = useUserStore((state) => state.users);
  const memberCount = users.filter((member) => member.is_active && [member.role, ...(member.roles ?? [])]
    .some((role) => ['committee_member', 'secretary'].includes(normalizeRole(role)))).length;
  const {
    sessions,
    isLoading,
    error,
    createSession,
    getAgendaBySession,
    checkSessionQuorum,
  } = useCommitteeSessionsStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formDate, setFormDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' }));
  const [formTime, setFormTime] = useState('09:00');
  const [formType, setFormType] = useState<SessionType>('ORDINARIA');
  const [formLocation, setFormLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [formQuorum, setFormQuorum] = useState(4);
  const [formError, setFormError] = useState<string | null>(null);

  const canManageSessions = normalizeRole(user?.activeRole) === 'secretary' || user?.activeRole === 'admin';

  const handleCrearSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!user || isSaving) return;
    setIsSaving(true);
    const scheduledIso = new Date(`${formDate}T${formTime}:00-05:00`).toISOString();

    const res = await createSession(
      {
        session_type: formType,
        scheduled_at: scheduledIso,
        location_or_url: formLocation,
        quorum_required: formQuorum,
      },
      user?.id || 'usr-sec-04',
      user?.fullName || 'Secretaria Técnica'
    );

    setIsSaving(false);
    if (!res.success) {
      setFormError(res.error || 'Error al programar la sesión.');
      return;
    }

    setIsModalOpen(false);
    if (res.session) navigate(`/sesiones/${res.session.id}`, { state: { fromList: '/sesiones' } });
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#14281D] text-[#A3E635]">
              <Calendar size={18} />
            </span>
            <h1 className="mobile-section-title text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
              Sesiones del Comité de Investigación
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Organice las sesiones y gestione sus solicitudes.
          </p>
        </div>

        {canManageSessions && (
          <button
            onClick={() => {
              setFormError(null);
              setFormQuorum(Math.floor(memberCount / 2) + 1);
              setIsModalOpen(true);
            }}
            className="mobile-page-action inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs shrink-0"
          >
            <Plus size={15} />
            <span>Programar Nueva Sesión</span>
          </button>
        )}
      </div>

      {isLoading && sessions.length === 0 && <SessionsSkeleton />}
      {error && <p role="alert" className="text-rose-800">{error}</p>}
      {!isLoading && !error && sessions.length === 0 && <p>No hay sesiones programadas.</p>}
      {/* Lista de Sesiones */}
      <div className="space-y-4">
        {sessions.map((ses) => {
          const agenda = getAgendaBySession(ses.id);
          const quorum = checkSessionQuorum(ses.id);
          const d = new Date(ses.scheduled_at);
          const dateFormatted = d.toLocaleDateString('es-CO', {
            timeZone: 'America/Bogota',
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });
          const timeFormatted = d.toLocaleTimeString('es-CO', {
            timeZone: 'America/Bogota',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={ses.id}
              onClick={() => navigate(`/sesiones/${ses.id}`, { state: { fromList: '/sesiones' } })}
              className="session-summary bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs hover:border-[#14281D] cursor-pointer transition-all space-y-4 group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 rounded-xl bg-[#F7F6F2] border border-[#E5E3DC] text-[#14281D] group-hover:bg-[#14281D] group-hover:text-white transition-colors">
                    <Calendar size={20} />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-[#14281D] group-hover:text-[#1E3A2B]">
                        {ses.session_number}
                      </h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 border border-stone-200 uppercase">
                        {ses.session_type}
                      </span>
                    </div>
                    <div className="text-xs text-stone-500 mt-0.5 flex flex-wrap items-center gap-2">
                      <span className="capitalize">{dateFormatted}</span>
                      <span>·</span>
                      <span>{timeFormatted}</span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <Building size={12} />
                        {ses.location_or_url}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="order-first md:order-none flex flex-wrap items-center gap-2 self-start md:self-auto">
                  {/* Estado de Agenda */}
                  {ses.is_agenda_closed ? (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                      <Lock size={11} />
                      <span>Agenda Cerrada</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
                      Agenda Abierta
                    </span>
                  )}

                  {/* Estado de Sesión */}
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      ses.is_completed
                        ? 'bg-stone-100 text-stone-700 border-stone-300'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    }`}
                  >
                    {ses.is_completed ? 'Finalizada' : 'Convocada'}
                  </span>

                  <ChevronRight size={16} className="text-stone-400 group-hover:text-[#14281D]" />
                </div>
              </div>

              <div className="md:hidden flex items-center justify-between gap-3 text-sm font-semibold">
                <span>{ses.is_completed ? 'Consultar decisiones y acta' : 'Revisar agenda de la sesión'}</span><ChevronRight size={18} />
              </div>
              {/* Indicadores Clave de Sesión */}
              <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-[#F7F6F2] p-3.5 rounded-xl border border-[#E5E3DC]">
                  <span className="text-stone-500 text-[11px] block">Expedientes en Agenda</span>
                  <p className="font-bold text-[#14281D] mt-0.5">
                    {agenda.length} {agenda.length === 1 ? 'expediente' : 'expedientes'} deliberables
                  </p>
                </div>

                <div className="bg-[#F7F6F2] p-3.5 rounded-xl border border-[#E5E3DC]">
                  <span className="text-stone-500 text-[11px] block">Quórum</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`inline-block w-2 h-2 rounded-full ${
                        quorum.hasQuorum ? 'bg-emerald-600' : 'bg-rose-500'
                      }`}
                    />
                    <p
                      className={`font-bold ${
                        quorum.hasQuorum ? 'text-emerald-800' : 'text-rose-700'
                      }`}
                    >
                      {quorum.attendedCount} de {quorum.totalMembers} miembros ({quorum.hasQuorum ? 'Quórum Válido' : 'Sin Quórum'})
                    </p>
                  </div>
                </div>

                <div className="bg-[#F7F6F2] p-3.5 rounded-xl border border-[#E5E3DC]">
                  <span className="text-stone-500 text-[11px] block">Asistencia mínima</span>
                  <p className="font-bold text-[#14281D] mt-0.5">
                    Mínimo {ses.quorum_required} integrantes con voto
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Programar Nueva Sesión (RF-24) */}
      <ResponsiveOverlay isOpen={Boolean(isModalOpen)} onClose={() => setIsModalOpen(false)} label="Programar sesión de comité">
        {isModalOpen && (<>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-stone-100">
              <div>
                <h3 className="font-bold text-sm text-[#14281D]">Programar Sesión de Comité</h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Indique la fecha, el lugar y la asistencia mínima.
                </p>
              </div>
              <button aria-label="Cerrar panel"
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCrearSesion}><fieldset disabled={isSaving} className="space-y-3.5">
              <p className="text-stone-500">{memberCount} integrantes activos disponibles para asistencia y quórum.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="session-type" className="block font-semibold text-stone-700 mb-1">Tipo de Sesión</label>
                  <select id="session-type"
                    value={formType}
                    onChange={(e) => setFormType(e.target.value === 'ORDINARIA' ? 'ORDINARIA' : 'EXTRAORDINARIA')}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] outline-none bg-white font-medium"
                  >
                    <option value="ORDINARIA">Ordinaria</option>
                    <option value="EXTRAORDINARIA">Extraordinaria</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="session-quorum" className="block font-semibold text-stone-700 mb-1">Quórum Mínimo</label>
                  <input id="session-quorum"
                    type="number"
                    min={1}
                    max={memberCount || undefined}
                    required
                    value={formQuorum}
                    onChange={(e) => setFormQuorum(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="session-date" className="block font-semibold text-stone-700 mb-1">Fecha</label>
                  <input id="session-date"
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] outline-none font-medium"
                  />
                </div>

                <div>
                  <label htmlFor="session-time" className="block font-semibold text-stone-700 mb-1">Hora de Colombia</label>
                  <input id="session-time"
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] outline-none font-medium"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="session-location" className="block font-semibold text-stone-700 mb-1">Lugar o Enlace Virtual</label>
                <input id="session-location"
                  type="text"
                  required
                  value={formLocation}
                  onChange={(e) => setFormLocation(e.target.value)}
                  placeholder="Ej. Sala de Juntas / Enlace Google Meet"
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] outline-none font-medium"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-[#E5E3DC] rounded-xl font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#14281D] text-white rounded-xl font-bold hover:bg-[#1E3A2B] cursor-pointer"
                >
                  {isSaving ? 'Guardando…' : 'Crear sesión'}
                </button>
              </div>
            </fieldset></form>
          </div>
        </>)}
      </ResponsiveOverlay>
    </div>
  );
}
