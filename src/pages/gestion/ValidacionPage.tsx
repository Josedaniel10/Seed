import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  Search,
  Check,
  ChevronRight,
  AlertCircle,
  Download,
  ShieldAlert,
  FolderOpen,
} from 'lucide-react';
import { useSessionStore } from '../../stores/session.store.ts';
import { useApplicationStore } from '../../features/applications/applicationStore.ts';
import { useCatalogStore } from '../../features/catalog/catalogStore.ts';
import { useUserStore } from '../../features/users/userStore.ts';
import { StatusBadge } from '../../components/ui/StatusBadge.tsx';
import { getDocumentaryQueue } from '../../features/validation/documentaryQueue.ts';
import { getSupabaseClient } from '../../lib/supabase.ts';

export function ValidacionPage() {
  const navigate = useNavigate();
  const { user } = useSessionStore();
  const {
    requests,
    documents,
    auditHistory,
    isLoading,
    validateRequirementDocument,
    finalizeAdministrativeValidation,
  } = useApplicationStore();
  const { types, requirements } = useCatalogStore();
  const { users } = useUserStore();

  // Only actionable requests participate in FIFO; corrections awaiting the researcher do not block it.
  const expedientesPorValidar = useMemo(() => {
    return getDocumentaryQueue(requests, documents, auditHistory);
  }, [requests, documents, auditHistory]);
  const selectedExp = expedientesPorValidar[0];
  const waitingCount = requests.filter((request) =>
    (request.current_status === 'PENDIENTE_DOCUMENTOS' || request.current_status === 'PENDING_DOCUMENTS')
    && !expedientesPorValidar.some((pending) => pending.id === request.id)).length;
  const saving = useRef(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  // Modal para rechazar con motivo justificado (RN-05, RF-13)
  const [rejectingDocId, setRejectingDocId] = useState<{
    reqId: string;
    docId: string;
    reqName: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!user?.id || !getSupabaseClient()) return;
    void useApplicationStore.getState().loadFromSupabase().then((result) => {
      if (!result.success) setFeedback({ type: 'error', message: result.error ?? 'No se pudo cargar la cola de validación.' });
    });
  }, [user?.id]);

  async function runAction<T extends { success: boolean; error?: string }>(
    operation: () => Promise<T>, onSuccess: (result: T) => void,
  ): Promise<void> {
    if (saving.current || !user || isLoading) return;
    saving.current = true;
    setIsSaving(true);
    setFeedback(null);
    try {
      const result = await operation();
      if (useSessionStore.getState().user?.id !== user.id) return;
      if (result.success) onSuccess(result);
      else setFeedback({ type: 'error', message: result.error ?? 'No se pudo guardar la validación. Intente nuevamente.' });
    } catch {
      setFeedback({ type: 'error', message: 'No se pudo confirmar el guardado. Intente nuevamente.' });
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  }

  const applicant = useMemo(() => {
    return users.find((u) => u.id === selectedExp?.applicant_id);
  }, [users, selectedExp]);

  const appType = useMemo(() => {
    return types.find((t) => t.id === (selectedExp?.application_type_id ?? selectedExp?.request_type_id));
  }, [types, selectedExp]);

  const typeReqs = useMemo(() => {
    if (!selectedExp) return [];
    return requirements.filter((r) => (r.application_type_id ?? r.request_type_id)
      === (selectedExp.application_type_id ?? selectedExp.request_type_id));
  }, [requirements, selectedExp]);

  const appDocs = useMemo(() => {
    if (!selectedExp) return [];
    return documents.filter((d) => (d.application_id ?? d.request_id) === selectedExp.id);
  }, [documents, selectedExp]);
  const mandatoryReqs = typeReqs.filter((requirement) => requirement.is_mandatory);
  const reviewedCount = mandatoryReqs.filter((requirement) => appDocs.some((document) =>
    document.requirement_id === requirement.id && !['PENDING', 'PENDIENTE'].includes(document.validation_status))).length;
  const pendingCount = mandatoryReqs.filter((requirement) => appDocs.some((document) =>
    document.requirement_id === requirement.id && ['PENDING', 'PENDIENTE'].includes(document.validation_status))).length;

  const filteredExpedientes = useMemo(() => {
    return expedientesPorValidar.filter((exp) => {
      const t = types.find((type) => type.id === exp.application_type_id)?.name || '';
      const term = searchTerm.toLowerCase();
      return (
        exp.filing_number.toLowerCase().includes(term) ||
        exp.title.toLowerCase().includes(term) ||
        t.toLowerCase().includes(term)
      );
    });
  }, [expedientesPorValidar, types, searchTerm]);

  // Manejo de marcar como Válido
  const handleMarkValido = async (reqId: string) => {
    if (!selectedExp || !user) return;
    const doc = appDocs.find((d) => d.requirement_id === reqId);
    if (!doc) {
      setFeedback({
        type: 'error',
        message: 'No existe documento adjunto para este requisito.',
      });
      return;
    }

    await runAction(() => validateRequirementDocument(
      selectedExp.id,
      reqId,
      'VALIDO',
      null,
      user.id,
      user.fullName
    ), () => {
      setFeedback({ type: 'success', message: 'Requisito marcado como VÁLIDO conforme a norma.' });
    });
  };

  // Confirmar rechazo con motivo (RF-13, RN-05)
  const handleConfirmRechazo = async () => {
    if (!selectedExp || !rejectingDocId || !user) return;

    if (!rejectReason.trim()) {
      setFeedback({
        type: 'error',
        message: 'El motivo del rechazo es obligatorio y debe estar justificado.',
      });
      return;
    }

    await runAction(() => validateRequirementDocument(
      selectedExp.id,
      rejectingDocId.reqId,
      'RECHAZADO',
      rejectReason.trim(),
      user.id,
      user.fullName
    ), () => {
      setFeedback({
        type: 'success',
        message: `Requisito "${rejectingDocId.reqName}" marcado como RECHAZADO con justificación asentada.`,
      });
      setRejectingDocId(null);
      setRejectReason('');
    });
  };

  // Finalizar validación documental con transición automática (T3.6 / RF-14, RN-02, RN-11)
  const handleFinalizar = async () => {
    if (!selectedExp || !user) return;
    const completedNumber = selectedExp.filing_number;
    await runAction(() => finalizeAdministrativeValidation(
      selectedExp.id,
      user.id,
      user.fullName
    ), (res) => {
      if (!res.application) {
        setFeedback({ type: 'error', message: 'No se recibió la confirmación del cierre documental.' });
        return;
      }
      const nuevo = res.application.current_status;
      const mensaje = nuevo === 'EN_REVISION' || nuevo === 'UNDER_REVIEW'
          ? 'Validación documental aprobada. La solicitud avanzó a revisión técnica.'
          : nuevo === 'PENDIENTE_DOCUMENTOS' || nuevo === 'PENDING_DOCUMENTS'
          ? 'Validación documental finalizada. La solicitud queda esperando correcciones del investigador.'
          : 'Validación finalizada con rechazo directo por requisito no subsanable.';
      const state = useApplicationStore.getState();
      const next = getDocumentaryQueue(state.requests, state.documents, state.auditHistory)[0];
      setSearchTerm('');
      setFeedback({ type: 'success', message: `${completedNumber}: ${mensaje} ${next
        ? `Ahora se muestra ${next.filing_number}, la siguiente solicitud de la cola.`
        : 'No quedan solicitudes listas para validación.'}` });
    });
  };

  const handleDownloadDoc = (fileName: string, hash: string) => {
    const content = `EXPEDIENTE INSTITUCIONAL DE INVESTIGACIÓN\nDocumento: ${fileName}\nSHA-256: ${hash}`;
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
          Bandeja de Validación Documental
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Primero en llegar, primero en atender. Al finalizar se abrirá automáticamente la siguiente solicitud.
        </p>
      </div>

      {feedback && (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          aria-live="polite"
          className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Modal / Diálogo de Rechazo Documental con Justificación (RN-05, RF-13) */}
      {rejectingDocId && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#E5E3DC] p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-800">
              <ShieldAlert size={20} />
              <h3 className="font-bold text-sm text-[#14281D]">
                Rechazar Requisito Documental con Justificación
              </h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Indique qué debe corregir el investigador en <strong>{rejectingDocId.reqName}</strong>.
            </p>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Motivo / Justificación del Rechazo *
              </label>
              <textarea
                disabled={isSaving}
                rows={4}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Describa el motivo detallado del rechazo (ej. Falta firma del líder de grupo, el presupuesto no incluye cotizaciones vigentes...)"
                className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] focus:border-rose-600 outline-none text-xs text-stone-800 leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => {
                  setRejectingDocId(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleConfirmRechazo}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                {isSaving ? 'Guardando…' : 'Confirmar Rechazo Documental'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && <p role="status" className="text-xs text-stone-600">Actualizando cola de validación…</p>}
      {waitingCount > 0 && <p className="text-xs text-stone-600">En espera de correcciones del investigador: {waitingCount}.</p>}
      <fieldset disabled={isSaving || isLoading} aria-busy={isSaving || isLoading}
        className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start min-w-0">
        {/* Columna Izquierda: Cola de expedientes (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stone-700">
            <span>Expedientes en Cola ({expedientesPorValidar.length})</span>
          </div>

          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-stone-400" size={14} />
            <input
              type="text"
              placeholder="Buscar por radicado o título..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E3DC] bg-white text-xs outline-none"
            />
          </div>

          {filteredExpedientes.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-[#E5E3DC] space-y-2">
              <FolderOpen size={32} className="mx-auto text-stone-300" />
              <p className="text-xs text-stone-500 font-medium">
                {searchTerm ? 'No hay resultados para esta búsqueda.' : 'No hay expedientes pendientes de validación en esta bandeja.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredExpedientes.map((exp) => {
                const isSelected = exp.id === selectedExp?.id;
                const tName = types.find((t) => t.id === exp.application_type_id)?.name;
                const expDocs = documents.filter((d) => (d.application_id ?? d.request_id) === exp.id);
                const validCount = requirements.filter((requirement) => requirement.is_mandatory
                  && (requirement.application_type_id ?? requirement.request_type_id) === (exp.application_type_id ?? exp.request_type_id)
                  && expDocs.some((document) => document.requirement_id === requirement.id
                    && (document.validation_status === 'VALIDO' || document.validation_status === 'VALID'))).length;
                const totalMandatory = requirements.filter(
                  (r) => (r.application_type_id ?? r.request_type_id) === (exp.application_type_id ?? exp.request_type_id) && r.is_mandatory
                ).length;

                return (
                  <div
                    key={exp.id}
                    className={`p-4 rounded-2xl border text-xs transition-all space-y-2 ${
                      isSelected
                        ? 'bg-white border-[#14281D] shadow-xs ring-2 ring-[#14281D]'
                        : 'bg-white border-[#E5E3DC] hover:border-stone-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-lg bg-[#F7F6F2] border border-[#E5E3DC] text-[#14281D]">
                        {exp.filing_number}
                      </span>
                      <StatusBadge status={exp.current_status} size="sm" />
                    </div>

                    <h4 className="font-bold text-[#14281D] line-clamp-1">{exp.title}</h4>
                    <p className="font-semibold text-stone-600">{isSelected ? 'En atención' : `Turno ${expedientesPorValidar.indexOf(exp) + 1}`}</p>
                    <p className="text-[11px] text-stone-500 truncate">{tName}</p>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                      <span>
                        Verificados: <strong>{validCount}</strong> de {totalMandatory} obligatorios
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(exp.created_at).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                          timeZone: 'America/Bogota',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Columna Derecha: Lista de Chequeo Documental (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E5E3DC] p-6 md:p-7 shadow-xs space-y-5">
          {selectedExp ? (
            <>
              {/* Encabezado del expediente seleccionado */}
              <div className="pb-4 border-b border-[#E5E3DC] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-3 py-1 bg-[#14281D] text-white rounded-lg">
                      {selectedExp.filing_number}
                    </span>
                    <StatusBadge status={selectedExp.current_status} size="sm" />
                  </div>
                  <button
                    onClick={() => navigate(`/solicitudes/${selectedExp.id}`)}
                    className="text-xs text-stone-600 hover:text-[#14281D] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver expediente</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                <h3 className="font-extrabold text-sm md:text-base text-[#14281D] leading-snug">
                  {selectedExp.title}
                </h3>

                <div className="text-xs text-stone-600 flex items-center gap-4 flex-wrap pt-1">
                  <span>
                    Investigador(a): <strong>{applicant?.full_name || 'Investigador Principal'}</strong>
                  </span>
                  <span>
                    Tipo: <strong>{appType?.name}</strong>
                  </span>
                </div>
              </div>

              {/* Lista de Requisitos con botón Válido / Rechazar (RF-12, RF-13) */}
              <div role="status" className="rounded-xl bg-stone-50 p-3 text-xs text-stone-700 space-y-1">
                <p>Requisitos obligatorios revisados: {reviewedCount} de {mandatoryReqs.length}.</p>
                {pendingCount === 0
                  ? <p className="font-semibold text-emerald-800">Puede finalizar la validación documental para guardar el resultado y continuar con la siguiente solicitud.</p>
                  : <p>Falta dictaminar {pendingCount} documento(s) obligatorio(s) antes de finalizar.</p>}
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Requisitos Exigidos y Validación Individual ({typeReqs.length})
                  </h4>
                </div>

                {typeReqs.map((req, idx) => {
                  const doc = appDocs.find((d) => d.requirement_id === req.id);
                  const status = doc?.validation_status || 'PENDIENTE';
                  const isValid = status === 'VALIDO' || status === 'VALID';
                  const isRejected = status === 'RECHAZADO' || status === 'REJECTED';

                  return (
                    <div
                      key={req.id}
                      className={`p-4 rounded-2xl border text-xs space-y-3 transition-all ${
                        isValid
                          ? 'bg-emerald-50/50 border-emerald-300'
                          : isRejected
                          ? 'bg-rose-50/50 border-rose-300'
                          : 'bg-[#F7F6F2] border-[#E5E3DC]'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-[#14281D]">
                              {idx + 1}. {req.name}
                            </span>
                            {req.is_mandatory ? (
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-stone-800 text-white">
                                Obligatorio
                              </span>
                            ) : (
                              <span className="text-[10px] font-medium px-2 py-0.2 rounded bg-stone-100 text-stone-700">
                                Condicional
                              </span>
                            )}
                            {req.is_subsanable ? (
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-200">
                                Subsanable (5 días)
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-rose-100 text-rose-900 border border-rose-200">
                                No permite corrección
                              </span>
                            )}
                          </div>

                          {doc ? (
                            <div className="text-[11px] text-stone-600 flex items-center gap-3 pt-1">
                              <span className="font-mono text-stone-800 font-bold truncate">
                                📎 {doc.file_name}
                              </span>
                              <span>{(doc.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</span>
                              <button
                                type="button"
                                onClick={() => handleDownloadDoc(doc.file_name, doc.file_hash_sha256)}
                                className="text-stone-500 hover:text-[#14281D] cursor-pointer inline-flex items-center gap-1 font-semibold"
                                title="Descargar"
                              >
                                <Download size={12} />
                                <span>Descargar</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-rose-600 font-semibold italic block pt-1">
                              ⚠ Documento no adjuntado por el solicitante.
                            </span>
                          )}
                        </div>

                        {/* Botones de acción individual: Válido / Rechazar (RF-13) */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                          <button
                            type="button"
                            onClick={() => handleMarkValido(req.id)}
                            disabled={!doc || isValid || isSaving}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40 ${
                              isValid
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                                : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            <Check size={13} />
                            <span>{isValid ? 'Validado' : 'Válido'}</span>
                          </button>

                          <button
                            type="button"
                            disabled={!doc || isSaving}
                            onClick={() =>
                              setRejectingDocId({
                                reqId: req.id,
                                docId: doc?.id || '',
                                reqName: req.name,
                              })
                            }
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors ${
                              isRejected
                                ? 'bg-rose-700 text-white border-rose-700 shadow-xs'
                                : 'bg-white hover:bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                          >
                            <XCircle size={13} />
                            <span>Rechazar</span>
                          </button>
                        </div>
                      </div>

                      {/* Motivo de rechazo actual */}
                      {isRejected && doc?.validation_observations && (
                        <div className="p-3 rounded-xl bg-rose-100/70 border border-rose-300 text-rose-900 text-[11px] space-y-1">
                          <span className="font-bold flex items-center gap-1 text-rose-800">
                            <AlertCircle size={13} />
                            <span>Motivo asentado:</span>
                          </span>
                          <p>{doc.validation_observations}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Botón de cierre de validación (T3.6 / RF-14, RN-02, RN-11) */}
              <div className="pt-4 border-t border-[#E5E3DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[11px] text-stone-500">
                  Revise todos los documentos antes de finalizar la validación.
                </span>

                <button
                  type="button"
                  disabled={isSaving || isLoading || pendingCount > 0 || !user}
                  onClick={handleFinalizar}
                  className="px-5 py-2.5 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs shrink-0"
                >
                  {isSaving ? 'Guardando validación…' : 'Finalizar Validación Documental'}
                </button>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-stone-500">
              No hay solicitudes listas para validar. Las solicitudes finalizadas ya no se muestran en esta cola.
            </div>
          )}
        </div>
      </fieldset>
    </div>
  );
}
