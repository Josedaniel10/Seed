import { ReviewCardsSkeleton } from '../../features/loading/ReviewCardsSkeleton.tsx';
import React, { useState, useMemo, useEffect } from 'react';
import { TechnicalReviewWorkspace } from '../../features/validation/TechnicalReviewWorkspace.tsx';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useSessionStore } from '../../stores/session.store.ts';
import { useApplicationStore } from '../../features/applications/applicationStore.ts';
import { useCatalogStore } from '../../features/catalog/catalogStore.ts';
import { useUserStore } from '../../features/users/userStore.ts';

export function RevisionesPage() {
  const { user } = useSessionStore();
  const {
    requests,
    isLoading,
    isInitialized,
    assignments,
    documents,
    observations,
    getDeadlineStatus,
  } = useApplicationStore();
  const { types, requirements } = useCatalogStore();
  const { users } = useUserStore();

  const currentUserId = user?.id;
  useEffect(() => {
    if (currentUserId) void useApplicationStore.getState().loadFromSupabase();
  }, [currentUserId]);

  // Solicitudes asignadas al evaluador actual (o todas en revisión si es secretario)
  const isSecretario = user?.activeRole === 'secretario';
  const myAssignedApps = useMemo(() => {
    return requests.filter((app) => {
      if (!currentUserId || !['EN_REVISION', 'UNDER_REVIEW'].includes(app.current_status)) return false;
      if (isSecretario) return true;
      const asg = assignments.find(
        (a) => (a.application_id ?? a.request_id) === app.id && a.reviewer_id === currentUserId && a.is_active
      );
      return !!asg;
    });
  }, [requests, assignments, currentUserId, isSecretario]);

  const [expandedAppId, setExpandedAppId] = useState<string | null>(myAssignedApps[0]?.id || null);
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => { setNotice(null); }, [currentUserId]);
  const handleConceptSubmitted = (message: string) => {
    if (useSessionStore.getState().user?.id === currentUserId) setNotice(message);
  };
  const [visitedIds, setVisitedIds] = useState<Set<string>>(() => new Set());
  const toggleReview = (appId: string) => {
    setVisitedIds((current) => new Set(current).add(appId));
    setExpandedAppId((current) => current === appId ? null : appId);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="border-b border-[#E5E3DC] pb-4">
        <h1 className="mobile-section-title text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
          Mis Revisiones Técnicas Asignadas
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Integrante del Comité de Investigaciones · Evaluación técnica, formulación de observaciones
          y emisión del concepto técnico.
        </p>
      </div>


      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">{notice}</p>}
      {isLoading && !isInitialized ? (
        <ReviewCardsSkeleton />
      ) : myAssignedApps.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E5E3DC] p-12 text-center text-xs text-stone-500 space-y-2">
          <CheckSquare size={36} className="mx-auto text-stone-300" />
          <h3 className="font-bold text-sm text-[#14281D]">Sin Revisiones Pendientes</h3>
          <p>Actualmente no tiene expedientes asignados en fase de evaluación técnica.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myAssignedApps.map((app) => {
            const isExpanded = expandedAppId === app.id;
            const deadline = getDeadlineStatus(app.id);
            const appType = types.find((t) => t.id === app.application_type_id);
            const applicant = users.find((u) => u.id === app.applicant_id);
            const appDocs = documents.filter((d) => (d.application_id ?? d.request_id) === app.id);
            const appObs = observations.filter((o) => (o.application_id ?? o.request_id) === app.id);
            const assignmentId = assignments.find((assignment) => (assignment.application_id ?? assignment.request_id) === app.id
              && assignment.reviewer_id === currentUserId && assignment.is_active)?.id ?? 'unassigned';

            return (
              <div
                key={app.id}
                className="bg-white rounded-3xl border border-[#E5E3DC] overflow-hidden shadow-xs"
              >
                {/* Cabecera de la tarjeta con monitor de vencimiento (RF-22) */}
                <div
                  onClick={() => toggleReview(app.id)}
                  className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-stone-50/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-lg bg-[#F7F6F2] border border-[#E5E3DC] text-[#14281D]">
                        {app.filing_number}
                      </span>
                      <span className="font-bold text-[#14281D] text-sm md:text-base">
                        {app.title}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 flex items-center gap-3">
                      <span>
                        Solicitante: <strong>{applicant?.full_name}</strong>
                      </span>
                      <span>·</span>
                      <span>Tipo: {appType?.name}</span>
                    </div>
                  </div>

                  {/* Monitor de seguimiento de plazos (RF-22) */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {deadline.isOverdue ? (
                      <span className="text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                        <AlertCircle size={13} className="text-rose-600" />
                        <span>{deadline.description}</span>
                      </span>
                    ) : deadline.isUrgent ? (
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Clock size={13} className="text-amber-600" />
                        <span>Próximo a vencer ({deadline.daysRemaining} días)</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 border border-stone-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Clock size={13} className="text-stone-400" />
                        <span>{deadline.description}</span>
                      </span>
                    )}

                    <button
                      type="button"
                      aria-label={`Abrir o cerrar revisión de ${app.filing_number}`}
                      aria-expanded={isExpanded}
                      className="p-2 rounded-xl text-stone-400 hover:text-[#14281D] bg-stone-50 border border-stone-200"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Contenido Desplegable: Documentos, Formulario de Observaciones y Concepto */}
                <div hidden={!isExpanded}>
                  {(isExpanded || visitedIds.has(app.id)) && <TechnicalReviewWorkspace
                    key={`${currentUserId}:${app.id}:${assignmentId}`}
                    app={app}
                    assignmentId={assignmentId}
                    appDocs={appDocs} appObs={appObs} requirements={requirements}
                    onConceptSubmitted={handleConceptSubmitted}
                  />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
