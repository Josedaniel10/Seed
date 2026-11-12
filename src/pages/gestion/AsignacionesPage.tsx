import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  ShieldAlert,
  Search,
  Building2,
  Calendar,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { useSessionStore } from '../../stores/session.store.ts';
import { useApplicationStore } from '../../features/applications/applicationStore.ts';
import { useCatalogStore } from '../../features/catalog/catalogStore.ts';
import { useGroupsStore } from '../../features/groups/groupsStore.ts';
import { useUserStore } from '../../features/users/userStore.ts';
import { normalizeRole } from '../../lib/permissions.ts';
import { StatusBadge } from '../../components/ui/StatusBadge.tsx';

export function AsignacionesPage() {
  const navigate = useNavigate();
  const { user } = useSessionStore();
  const {
    requests,
    assignments,
    assignReviewer,
    checkReviewerConflict,
    getActiveAssignment,
  } = useApplicationStore();
  const { types } = useCatalogStore();
  const { groups } = useGroupsStore();
  const { users } = useUserStore();

  const [selectedAppId, setSelectedAppId] = useState<string>('');
  const [selectedReviewerId, setSelectedReviewerId] = useState<string>('');
  const [deadlineDays, setDeadlineDays] = useState<number>(8);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Solicitudes en estado EN_REVISION (habilitadas para asignación de evaluador, RF-15)
  const applicationsInReview = useMemo(() => {
    return requests.filter((a) => a.current_status === 'EN_REVISION');
  }, [requests]);

  const committeeMembers = useMemo(() => {
    return users.filter(
      (u) =>
        u.is_active &&
        (normalizeRole(u.role) === 'committee_member' ||
          u.roles?.some((role) => normalizeRole(role) === 'committee_member'))
    );
  }, [users]);

  // Carga de trabajo por evaluador (número de asignaciones activas)
  const workloadByReviewer = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of committeeMembers) {
      counts[m.id] = assignments.filter((a) => a.reviewer_id === m.id && a.is_active).length;
    }
    return counts;
  }, [committeeMembers, assignments]);

  const handleAssign = async (appId: string, revId: string) => {
    if (!committeeMembers.some((member) => member.id === revId)) {
      setFeedback({ type: 'error', message: 'Debe seleccionar un evaluador de la lista.' });
      return;
    }

    // Calcular fecha límite
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + (deadlineDays || 8));
    const deadlineStr = deadline.toISOString().split('T')[0];

    const res = await assignReviewer(
      appId,
      revId,
      deadlineStr,
      user?.id || 'usr-004',
      user?.fullName || 'Secretaría Técnica'
    );

    if (res.success) {
      setFeedback({
        type: 'success',
        message: 'Evaluador asignado formalmente con plazo institucional establecido.',
      });
      setSelectedAppId('');
      setSelectedReviewerId('');
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Error al asignar evaluador.' });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="border-b border-[#E5E3DC] pb-4">
        <h1 className="mobile-section-title text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
          Asignación y Reasignación de Evaluadores Pares
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Asigne un evaluador a cada solicitud pendiente de revisión.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
          ) : (
            <ShieldAlert size={16} className="text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Lista de Solicitudes En Revisión */}
      <div className="bg-white rounded-3xl border border-[#E5E3DC] p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <h3 className="font-extrabold text-sm text-[#14281D] uppercase tracking-wider">
            Solicitudes en Etapa de Revisión Técnica ({applicationsInReview.length})
          </h3>
        </div>

        {applicationsInReview.length === 0 ? (
          <div className="p-8 text-center text-xs text-stone-500 bg-[#F7F6F2] rounded-2xl">
            No hay solicitudes en estado "En revisión" pendientes de asignación o evaluación.
          </div>
        ) : (
          <div className="space-y-4">
            {applicationsInReview.map((app) => {
              const activeAsg = getActiveAssignment(app.id);
              const currentReviewer = users.find((u) => u.id === activeAsg?.reviewer_id);
              const appType = types.find((t) => t.id === app.application_type_id);
              const appGroup = groups.find((g) => g.id === app.research_group_id);
              const applicant = users.find((u) => u.id === app.applicant_id);

              const isReassigning = selectedAppId === app.id;
              const chosenRevId = isReassigning ? selectedReviewerId : '';

              return (
                <div
                  key={app.id}
                  className="p-5 rounded-2xl border border-[#E5E3DC] bg-[#F7F6F2] flex flex-col lg:flex-row lg:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-lg bg-white border border-stone-200 text-[#14281D]">
                        {app.filing_number}
                      </span>
                      <span className="font-bold text-[#14281D] text-xs md:text-sm">
                        {app.title}
                      </span>
                    </div>

                    <div className="text-[11px] text-stone-600 flex items-center gap-3 flex-wrap">
                      <span>
                        Solicitante: <strong>{applicant?.full_name || 'Investigador'}</strong>
                      </span>
                      <span>·</span>
                      <span>
                        Grupo: <strong>{appGroup?.name || 'No adscrito'}</strong>
                      </span>
                      <span>·</span>
                      <span>Tipo: {appType?.name}</span>
                    </div>

                    {/* Evaluador actual si existe */}
                    <div className="pt-1 flex items-center gap-2 text-[11px]">
                      <span className="text-stone-500">Evaluador activo:</span>
                      {currentReviewer ? (
                        <span className="font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center gap-1">
                          <UserCheck size={12} />
                          <span>{currentReviewer.full_name}</span>
                          <span className="font-normal text-stone-500">
                            (Plazo: {activeAsg?.deadline_date})
                          </span>
                        </span>
                      ) : (
                        <span className="font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Sin evaluador asignado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Panel de Asignación / Reasignación */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    <select
                      value={isReassigning ? selectedReviewerId : ''}
                      onChange={(e) => {
                        setSelectedAppId(app.id);
                        setSelectedReviewerId(e.target.value);
                      }}
                      className="px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white text-xs text-stone-800 outline-none max-w-xs"
                    >
                      <option value="">
                        {currentReviewer ? 'Reasignar otro evaluador...' : 'Seleccione evaluador...'}
                      </option>
                      {committeeMembers.map((rev) => {
                        const conflict = checkReviewerConflict(rev.id, app.id);
                        const load = workloadByReviewer[rev.id] || 0;

                        return (
                          <option
                            key={rev.id}
                            value={rev.id}
                            disabled={conflict.hasConflict}
                          >
                            {rev.full_name} ({load} activas)
                            {conflict.hasConflict ? ' [Conflicto Inhabilitante]' : ''}
                          </option>
                        );
                      })}
                    </select>

                    <button
                      type="button"
                      disabled={!isReassigning || !selectedReviewerId}
                      onClick={() => handleAssign(app.id, selectedReviewerId)}
                      className="px-4 py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white font-bold rounded-xl disabled:opacity-40 cursor-pointer transition-colors whitespace-nowrap shadow-xs"
                    >
                      {currentReviewer ? 'Reasignar' : 'Asignar'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
