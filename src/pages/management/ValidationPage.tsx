import React, { useState, useMemo } from 'react';
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
import { useRequestStore } from '../../features/requests/requestStore.ts';
import { useCatalogStore } from '../../features/catalog/catalogStore.ts';
import { useUserStore } from '../../features/users/userStore.ts';
import { StatusBadge } from '../../components/ui/StatusBadge.tsx';

export function ValidationPage() {
  const navigate = useNavigate();
  const { user } = useSessionStore();
  const {
    requests,
    documents,
    validateRequirementDocument,
    finalizeAdministrativeValidation,
  } = useRequestStore();
  const { types, requirements } = useCatalogStore();
  const { users } = useUserStore();

  const pendingRequests = useMemo(() => {
    return requests.filter(
      (a) =>
        a.current_status === 'RADICADA' ||
        a.current_status === 'SUBMITTED' ||
        a.current_status === 'PENDIENTE_DOCUMENTOS' ||
        a.current_status === 'PENDING_DOCUMENTS'
    );
  }, [requests]);

  const [selectedId, setSelectedId] = useState<string>(
    pendingRequests[0]?.id || requests[0]?.id || ''
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const [rejectingDocInfo, setRejectingDocInfo] = useState<{
    reqId: string;
    docId: string;
    reqName: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const selectedRequest = useMemo(() => {
    return (
      requests.find((a) => a.id === selectedId) ||
      pendingRequests[0] ||
      requests[0]
    );
  }, [requests, selectedId, pendingRequests]);

  const applicant = useMemo(() => {
    return users.find((u) => u.id === selectedRequest?.applicant_id);
  }, [users, selectedRequest]);

  const reqType = useMemo(() => {
    const typeId = selectedRequest?.request_type_id || selectedRequest?.application_type_id;
    return types.find((t) => t.id === typeId);
  }, [types, selectedRequest]);

  const typeReqs = useMemo(() => {
    if (!selectedRequest) return [];
    const typeId = selectedRequest.request_type_id || selectedRequest.application_type_id;
    return requirements.filter((r) => (r.request_type_id || r.application_type_id) === typeId);
  }, [requirements, selectedRequest]);

  const requestDocs = useMemo(() => {
    if (!selectedRequest) return [];
    return documents.filter((d) => d.request_id === selectedRequest.id || d.application_id === selectedRequest.id);
  }, [documents, selectedRequest]);

  const filteredRequests = useMemo(() => {
    return pendingRequests.filter((req) => {
      const typeId = req.request_type_id || req.application_type_id;
      const t = types.find((type) => type.id === typeId)?.name || '';
      const term = searchTerm.toLowerCase();
      return (
        req.filing_number.toLowerCase().includes(term) ||
        req.title.toLowerCase().includes(term) ||
        t.toLowerCase().includes(term)
      );
    });
  }, [pendingRequests, types, searchTerm]);

  const handleMarkValid = async (reqId: string) => {
    if (!selectedRequest) return;
    const doc = requestDocs.find((d) => d.requirement_id === reqId);
    if (!doc) {
      setFeedback({
        type: 'error',
        message: 'No existe documento adjunto para este requisito.',
      });
      return;
    }

    const res = await validateRequirementDocument(
      selectedRequest.id,
      reqId,
      'VALID',
      null,
      user?.id || 'usr-adm-02',
      user?.fullName || 'Personal Administrativo'
    );

    if (res.success) {
      setFeedback({ type: 'success', message: 'Requisito marcado como VÁLIDO conforme a norma.' });
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Error al validar requisito.' });
    }
  };

  const handleConfirmRejection = async () => {
    if (!selectedRequest || !rejectingDocInfo) return;

    if (!rejectReason.trim()) {
      setFeedback({
        type: 'error',
        message: 'RN-05: El motivo del rechazo es obligatorio y debe estar justificado.',
      });
      return;
    }

    const res = await validateRequirementDocument(
      selectedRequest.id,
      rejectingDocInfo.reqId,
      'REJECTED',
      rejectReason.trim(),
      user?.id || 'usr-adm-02',
      user?.fullName || 'Personal Administrativo'
    );

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Requisito "${rejectingDocInfo.reqName}" marcado como RECHAZADO con justificación asentada.`,
      });
      setRejectingDocInfo(null);
      setRejectReason('');
      setTimeout(() => setFeedback(null), 3500);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Error al rechazar requisito.' });
    }
  };

  const handleFinalize = async () => {
    if (!selectedRequest) return;

    const res = await finalizeAdministrativeValidation(
      selectedRequest.id,
      user?.id || 'usr-adm-02',
      user?.fullName || 'Personal Administrativo'
    );

    const updated = res.request || res.application;
    if (res.success && updated) {
      const nuevo = updated.current_status;
      const mensaje =
        nuevo === 'EN_REVISION' || nuevo === 'UNDER_REVIEW'
          ? '¡Validación aprobada! 100% de requisitos conformes. La solicitud avanzó a "En revisión técnica".'
          : nuevo === 'PENDIENTE_DOCUMENTOS' || nuevo === 'PENDING_DOCUMENTS'
          ? 'Validación concluida con requisitos subsanables observados. La solicitud pasó a "Pendiente por documentos".'
          : 'Validación finalizada con rechazo directo por requisito no subsanable (RN-11).';

      setFeedback({ type: 'success', message: mensaje });
      setTimeout(() => setFeedback(null), 4500);
    } else {
      setFeedback({ type: 'error', message: res.error || 'No fue posible finalizar la validación.' });
    }
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
          Verificación reglamentaria de requisitos y documentos para trámites Radicados y Pendientes
          por documentos (RF-12, RF-13, RF-14).
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
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {rejectingDocInfo && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-[#E5E3DC] p-6 max-w-lg w-full space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-rose-800">
              <ShieldAlert size={20} />
              <h3 className="font-bold text-sm text-[#14281D]">
                Rechazar Requisito Documental con Justificación
              </h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Está a punto de rechazar el requisito: <strong>{rejectingDocInfo.reqName}</strong>. De
              acuerdo con la norma (RN-05, RF-13), debe justificar de manera explícita la causa
              técnica o formal del rechazo para que el investigador conozca qué corregir.
            </p>

            <div>
              <label className="block text-xs font-bold text-stone-800 mb-1">
                Motivo / Justificación del Rechazo *
              </label>
              <textarea
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
                onClick={() => {
                  setRejectingDocInfo(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmRejection}
                className="px-4 py-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Confirmar Rechazo Documental
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-stone-700">
            <span>Expedientes en Cola ({pendingRequests.length})</span>
          </div>

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

          {filteredRequests.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-[#E5E3DC] space-y-2">
              <FolderOpen size={32} className="mx-auto text-stone-300" />
              <p className="text-xs text-stone-500 font-medium">
                No hay expedientes pendientes de validación en esta bandeja.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {filteredRequests.map((req) => {
                const isSelected = req.id === selectedRequest?.id;
                const typeId = req.request_type_id || req.application_type_id;
                const tName = types.find((t) => t.id === typeId)?.name;
                const reqDocs = documents.filter((d) => d.request_id === req.id || d.application_id === req.id);
                const validCount = reqDocs.filter((d) => d.validation_status === 'VALIDO' || d.validation_status === 'VALID').length;
                const totalMandatory = requirements.filter(
                  (r) => (r.request_type_id || r.application_type_id) === typeId && r.is_mandatory
                ).length;

                return (
                  <div
                    key={req.id}
                    onClick={() => setSelectedId(req.id)}
                    className={`p-4 rounded-2xl border text-xs transition-all cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-white border-[#14281D] shadow-xs ring-2 ring-[#14281D]'
                        : 'bg-white border-[#E5E3DC] hover:border-stone-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-lg bg-[#F7F6F2] border border-[#E5E3DC] text-[#14281D]">
                        {req.filing_number}
                      </span>
                      <StatusBadge status={req.current_status} size="sm" />
                    </div>

                    <h4 className="font-bold text-[#14281D] line-clamp-1">{req.title}</h4>
                    <p className="text-[11px] text-stone-500 truncate">{tName}</p>

                    <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                      <span>
                        Verificados: <strong>{validCount}</strong> de {totalMandatory} obligatorios
                      </span>
                      <span className="text-[10px] text-stone-400">
                        {new Date(req.created_at).toLocaleDateString('es-CO', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E5E3DC] p-6 md:p-7 shadow-xs space-y-5">
          {selectedRequest ? (
            <>
              <div className="pb-4 border-b border-[#E5E3DC] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-3 py-1 bg-[#14281D] text-white rounded-lg">
                      {selectedRequest.filing_number}
                    </span>
                    <StatusBadge status={selectedRequest.current_status} size="sm" />
                  </div>
                  <button
                    onClick={() => navigate(`/requests/${selectedRequest.id}`)}
                    className="text-xs text-stone-600 hover:text-[#14281D] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>Ver expediente</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                <h3 className="font-extrabold text-sm md:text-base text-[#14281D] leading-snug">
                  {selectedRequest.title}
                </h3>

                <div className="text-xs text-stone-600 flex items-center gap-4 flex-wrap pt-1">
                  <span>
                    Investigador(a): <strong>{applicant?.full_name || 'Investigador Principal'}</strong>
                  </span>
                  <span>
                    Tipo: <strong>{reqType?.name}</strong>
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Requisitos Exigidos y Validación Individual ({typeReqs.length})
                  </h4>
                </div>

                {typeReqs.map((req, idx) => {
                  const doc = requestDocs.find((d) => d.requirement_id === req.id);
                  const status = doc?.validation_status || 'PENDING';
                  const isValid = status === 'VALID' || status === 'VALIDO';
                  const isRejected = status === 'REJECTED' || status === 'RECHAZADO';

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
                                No subsanable (Rechazo RN-11)
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

                        <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-start">
                          <button
                            type="button"
                            onClick={() => handleMarkValid(req.id)}
                            disabled={!doc}
                            className={`px-3 py-1.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40 ${
                              isValid
                                ? 'bg-emerald-700 text-white border-emerald-700 shadow-xs'
                                : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            <Check size={13} />
                            <span>Válido</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setRejectingDocInfo({
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

              <div className="pt-4 border-t border-[#E5E3DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[11px] text-stone-500">
                  Transición reglamentaria automática: 100% válido → <em>En revisión</em>; falla
                  subsanable → <em>Pendiente por docs</em>; falla no subsanable → <em>Rechazada</em>.
                </span>

                <button
                  type="button"
                  onClick={handleFinalize}
                  className="px-5 py-2.5 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs shrink-0"
                >
                  Finalizar Validación Documental
                </button>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-xs text-stone-500">
              Seleccione un expediente de la columna izquierda para iniciar la validación.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const ValidacionPage = ValidationPage;
