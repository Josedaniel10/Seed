import React, { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSessionStore } from '../../stores/session.store.ts';
import { useRequestStore, UploadedFilePayload } from '../../features/requests/requestStore.ts';
import { useCatalogStore } from '../../features/catalog/catalogStore.ts';
import { useGroupsStore } from '../../features/groups/groupsStore.ts';
import { useUserStore } from '../../features/users/userStore.ts';
import { StatusBadge } from '../../components/ui/StatusBadge.tsx';
import { validateDocumentFile, computeFileSha256 } from '../../features/requests/documentValidator.ts';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Download,
  Upload,
  History,
  XCircle,
} from 'lucide-react';

export function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSessionStore();
  const {
    requests,
    documents,
    auditHistory,
    cureDocument,
    computePendingRequirements,
  } = useRequestStore();
  const { types, requirements } = useCatalogStore();
  const { groups } = useGroupsStore();
  const { users } = useUserStore();

  const [activeTab, setActiveTab] = useState<'summary' | 'documents' | 'observations' | 'history'>(
    'summary'
  );

  const [curingReqId, setCuringReqId] = useState<string | null>(null);
  const [cureError, setCureError] = useState<string | null>(null);
  const [cureSuccess, setCureSuccess] = useState<string | null>(null);

  const request = useMemo(() => {
    return requests.find((a) => a.id === id || a.filing_number === id);
  }, [requests, id]);

  const applicant = useMemo(() => {
    return users.find((p) => p.id === request?.applicant_id);
  }, [users, request]);

  const requestType = useMemo(() => {
    const typeId = request?.request_type_id || request?.application_type_id;
    return types.find((t) => t.id === typeId);
  }, [types, request]);

  const group = useMemo(() => {
    return groups.find((g) => g.id === request?.research_group_id);
  }, [groups, request]);

  const requestDocs = useMemo(() => {
    if (!request) return [];
    return documents.filter((d) => d.request_id === request.id || d.application_id === request.id);
  }, [documents, request]);

  const requestHistory = useMemo(() => {
    if (!request) return [];
    return auditHistory
      .filter((h) => h.request_id === request.id || h.application_id === request.id)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [auditHistory, request]);

  const activeRole = user?.activeRole || 'researcher';

  if (!request) {
    return (
      <div className="max-w-xl mx-auto bg-white rounded-3xl border border-[#E5E3DC] p-10 text-center space-y-4 shadow-sm">
        <AlertCircle size={40} className="mx-auto text-amber-600" />
        <h2 className="text-xl font-extrabold text-[#14281D]">Solicitud No Encontrada</h2>
        <p className="text-xs text-stone-500 leading-relaxed">
          El número de radicado o identificador solicitado no existe en la base de datos de
          expedientes del Comité de Investigación.
        </p>
        <div className="pt-2">
          <button
            onClick={() => navigate('/my-requests')}
            className="px-5 py-2.5 bg-[#14281D] text-white text-xs font-bold rounded-xl hover:bg-[#1E3A2B] transition-colors cursor-pointer"
          >
            Regresar a Mis Solicitudes
          </button>
        </div>
      </div>
    );
  }

  const handleDownloadFile = (docName: string, hash: string) => {
    const content = `EXPEDIENTE INSTITUCIONAL DE INVESTIGACIÓN\nDocumento: ${docName}\nSHA-256: ${hash}\nFecha: ${new Date().toISOString()}`;
    const blob = new Blob([content], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = docName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCureUpload = async (requirementId: string, file: File) => {
    setCureError(null);
    setCureSuccess(null);

    const val = validateDocumentFile(file.name, file.size, 10);
    if (!val.valid) {
      setCureError(val.error || 'Archivo inválido');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      const sha256 = await computeFileSha256(buffer);

      const payload: UploadedFilePayload = {
        requirement_id: requirementId,
        file_name: file.name,
        file_path: `file-service/storage/${sha256.substring(0, 12)}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
        file_size_bytes: file.size,
        file_hash_sha256: sha256,
        mime_type: file.type || 'application/pdf',
      };

      const res = await cureDocument(
        request.id,
        requirementId,
        payload,
        user?.id || 'usr-001',
        user?.fullName || 'Investigador Principal'
      );

      if (res.success) {
        setCureSuccess(`Documento "${file.name}" cargado y corregido exitosamente.`);
        setCuringReqId(null);
        setTimeout(() => setCureSuccess(null), 4000);
      } else {
        setCureError(res.error || 'Error al subsanar documento.');
      }
    } catch {
      setCureError('Error al procesar el archivo subsanado.');
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-[#14281D] cursor-pointer"
      >
        <ArrowLeft size={14} />
        <span>Volver a la bandeja</span>
      </button>

      <div className="bg-white rounded-3xl border border-[#E5E3DC] p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-xs font-extrabold px-3 py-1 rounded-lg bg-[#14281D] text-white">
                {request.filing_number}
              </span>
              <span className="text-xs font-bold text-stone-600 bg-[#F7F6F2] px-2.5 py-1 rounded-lg border border-[#E5E3DC]">
                {requestType?.name || 'Trámite Institucional'}
              </span>
              <span className="text-[11px] text-stone-400 font-mono">
                [{requestType?.code}]
              </span>
            </div>

            <h1 className="text-lg md:text-2xl font-extrabold text-[#14281D] leading-tight">
              {request.title}
            </h1>
          </div>

          <div className="shrink-0 self-start">
            <StatusBadge status={request.current_status} size="md" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-[#E5E3DC] text-xs">
          <div>
            <span className="text-stone-400 block text-[11px] font-semibold">Investigador Principal</span>
            <span className="font-bold text-[#14281D]">
              {applicant?.full_name || 'Dra. Carmen Lucía Morales'}
            </span>
          </div>

          <div>
            <span className="text-stone-400 block text-[11px] font-semibold">Grupo de Investigación</span>
            <span className="font-semibold text-stone-800">
              {group?.name || 'Grupo de Biotecnología Aplicada'}
            </span>
          </div>

          <div>
            <span className="text-stone-400 block text-[11px] font-semibold">Fecha de Radicación</span>
            <span className="text-stone-700">
              {new Date(request.created_at).toLocaleDateString('es-CO', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>

          <div>
            <span className="text-stone-400 block text-[11px] font-semibold">Instancia Resolutiva</span>
            <span className="font-semibold text-stone-800">
              {request.requires_committee
                ? 'Comité de Investigaciones'
                : 'Trámite Administrativo'}
            </span>
          </div>
        </div>
      </div>

      {cureSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-700" />
          <span>{cureSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#E5E3DC] p-6 md:p-8 shadow-xs space-y-6">
          <div className="flex border-b border-[#E5E3DC] gap-6 text-xs font-bold overflow-x-auto">
            <button
              onClick={() => setActiveTab('summary')}
              className={`pb-3 cursor-pointer transition-colors border-b-2 whitespace-nowrap ${
                activeTab === 'summary'
                  ? 'border-[#14281D] text-[#14281D]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              Resumen
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`pb-3 cursor-pointer transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'documents'
                  ? 'border-[#14281D] text-[#14281D]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <span>Documentos</span>
              <span className="px-2 py-0.2 rounded-full bg-stone-100 text-[10px]">
                {requestDocs.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('observations')}
              className={`pb-3 cursor-pointer transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'observations'
                  ? 'border-[#14281D] text-[#14281D]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <span>Observaciones y Ajustes</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`pb-3 cursor-pointer transition-colors border-b-2 whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-[#14281D] text-[#14281D]'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <History size={14} />
              <span>Historial Inmutable</span>
              <span className="px-2 py-0.2 rounded-full bg-stone-100 text-[10px]">
                {requestHistory.length}
              </span>
            </button>
          </div>

          {activeTab === 'summary' && (
            <div className="space-y-5 text-xs">
              <div className="space-y-1.5">
                <h3 className="font-bold text-[#14281D] text-sm">Resumen Ejecutivo y Justificación</h3>
                <p className="text-stone-700 leading-relaxed bg-[#F7F6F2] p-4 rounded-2xl border border-[#E5E3DC]">
                  {request.abstract || 'Sin resumen registrado.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E5E3DC] space-y-1">
                  <span className="text-[11px] text-stone-400 font-bold uppercase tracking-wider block">
                    Presupuesto Solicitado
                  </span>
                  <span className="text-base font-mono font-extrabold text-[#14281D] block">
                    {request.budget_requested > 0
                      ? `$ ${request.budget_requested.toLocaleString('es-CO')} COP`
                      : 'Sin solicitud presupuestal'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E5E3DC] space-y-1">
                  <span className="text-[11px] text-stone-400 font-bold uppercase tracking-wider block">
                    Aval Docente Tutor (RN-09)
                  </span>
                  <span className="font-bold text-stone-800 flex items-center gap-1.5">
                    {request.is_tutor_endorsed ? (
                      <>
                        <CheckCircle2 size={15} className="text-emerald-700" />
                        <span>Aval verificado por docente tutor</span>
                      </>
                    ) : (
                      <span className="text-stone-500">No aplica / Investigador docente</span>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#14281D] text-sm">
                  Documentos y Soportes del Expediente
                </h3>
                <span className="text-[11px] text-stone-500">
                  Validación física en servicio local con hash SHA-256
                </span>
              </div>

              {cureError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                  <AlertCircle size={14} className="text-rose-600 shrink-0" />
                  <span>{cureError}</span>
                </div>
              )}

              {requestDocs.length === 0 ? (
                <p className="text-stone-500 italic p-6 text-center bg-[#F7F6F2] rounded-2xl">
                  No hay documentos vinculados a este expediente.
                </p>
              ) : (
                <div className="space-y-3">
                  {requestDocs.map((doc, idx) => {
                    const reqObj = requirements.find((r) => r.id === doc.requirement_id);
                    const isRejected = doc.validation_status === 'RECHAZADO' || doc.validation_status === 'REJECTED';
                    const isCuringThis = curingReqId === doc.requirement_id;

                    return (
                      <div
                        key={doc.id}
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          isRejected
                            ? 'bg-rose-50/40 border-rose-200 ring-1 ring-rose-200'
                            : 'bg-[#F7F6F2] border-[#E5E3DC]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#14281D]">
                                {idx + 1}. {reqObj?.name || 'Requisito institucional'}
                              </span>
                              {reqObj?.is_mandatory ? (
                                <span className="text-[10px] font-bold px-2 py-0.2 rounded bg-stone-800 text-white">
                                  Obligatorio
                                </span>
                              ) : (
                                <span className="text-[10px] font-medium px-2 py-0.2 rounded bg-stone-200 text-stone-700">
                                  Condicional
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-stone-500 block">
                              Archivo:{' '}
                              <strong className="text-stone-700 font-mono">{doc.file_name}</strong> ·{' '}
                              {(doc.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {doc.validation_status === 'VALIDO' || doc.validation_status === 'VALID' ? (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                                <CheckCircle2 size={12} />
                                <span>Válido</span>
                              </span>
                            ) : isRejected ? (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                <XCircle size={12} />
                                <span>Rechazado</span>
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-stone-200 text-stone-700 flex items-center gap-1">
                                <Clock size={12} />
                                <span>Pendiente de validación</span>
                              </span>
                            )}

                            <button
                              type="button"
                              onClick={() => handleDownloadFile(doc.file_name, doc.file_hash_sha256)}
                              className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:text-[#14281D] cursor-pointer"
                              title="Descargar documento"
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        </div>

                        <div className="text-[10px] text-stone-500 font-mono bg-white p-2 rounded-xl border border-stone-200 flex items-center justify-between">
                          <span className="truncate">
                            SHA-256: {doc.file_hash_sha256}
                          </span>
                          <span className="shrink-0 text-stone-400 font-sans font-semibold">
                            Cargado:{' '}
                            {new Date(doc.uploaded_at).toLocaleDateString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                        </div>

                        {isRejected && doc.validation_observations && (
                          <div className="p-3 rounded-xl bg-rose-100/70 border border-rose-300 text-rose-900 text-[11px] space-y-1">
                            <span className="font-bold flex items-center gap-1 text-rose-800">
                              <AlertCircle size={13} />
                              <span>Motivo del Rechazo en Validación:</span>
                            </span>
                            <p className="leading-relaxed">{doc.validation_observations}</p>
                          </div>
                        )}

                        {(isRejected || request.current_status === 'PENDIENTE_DOCUMENTOS' || request.current_status === 'PENDING_DOCUMENTS') && (
                          <div className="pt-2 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-[11px] text-amber-900 font-semibold">
                              Requiere subsanación o corrección documental.
                            </span>

                            {isCuringThis ? (
                              <div className="flex items-center gap-2">
                                <label className="px-3 py-1.5 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5">
                                  <Upload size={13} />
                                  <span>Seleccionar archivo corregido</span>
                                  <input
                                    type="file"
                                    accept=".pdf,.docx,.doc"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) handleCureUpload(doc.requirement_id, f);
                                    }}
                                  />
                                </label>
                                <button
                                  type="button"
                                  onClick={() => setCuringReqId(null)}
                                  className="text-stone-500 hover:text-stone-800 text-xs px-2 py-1"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setCuringReqId(doc.requirement_id)}
                                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                              >
                                <Upload size={13} />
                                <span>Subsanar este documento</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'observations' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-[#14281D] text-sm">
                  Observaciones Técnicas y Requerimientos de Ajuste
                </h3>
              </div>

              <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E5E3DC] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#14281D]">
                    Dr. Alejandro Restrepo (Revisor Par)
                  </span>
                  <span className="text-[10px] text-stone-400">03 Feb 2026</span>
                </div>
                <p className="text-stone-700 leading-relaxed">
                  Se recomienda explicitar en la metodología el protocolo de bioseguridad para el
                  manejo de las cepas de patógenos en el laboratorio de fitopatología.
                </p>
                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Aclaración Metodológica
                  </span>
                  <span className="text-[10px] text-stone-500">Atendida en versión 1</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6 text-xs">
              <div>
                <h3 className="font-bold text-[#14281D] text-sm">
                  Cronología Vertical Inmutable de Actuaciones (RF-23)
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  Registro cronológico auditable con marca temporal, actor responsable y
                  transición formal de estados.
                </p>
              </div>

              {requestHistory.length === 0 ? (
                <p className="text-stone-500 italic p-6 text-center bg-[#F7F6F2] rounded-2xl">
                  No hay registros de auditoría para este expediente.
                </p>
              ) : (
                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E5E3DC]">
                  {requestHistory.map((item) => {
                    const isInitial = item.action === 'RADICACION_INICIAL';
                    const isValidation = item.action.includes('VALIDACION');
                    const isSubsanacion = item.action.includes('SUBSANACION');

                    return (
                      <div key={item.id} className="relative group">
                        <div
                          className={`absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center bg-white ${
                            isInitial
                              ? 'border-[#14281D] text-[#14281D]'
                              : isValidation
                              ? 'border-emerald-600 text-emerald-600'
                              : isSubsanacion
                              ? 'border-amber-600 text-amber-600'
                              : 'border-stone-400 text-stone-600'
                          }`}
                        >
                          <div className="w-2 h-2 rounded-full bg-current" />
                        </div>

                        <div className="p-4 rounded-2xl bg-[#F7F6F2] border border-[#E5E3DC] space-y-2 group-hover:border-stone-400 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <span className="font-bold text-[#14281D] text-xs">
                              {isInitial
                                ? 'Radicación Inicial Formal'
                                : isSubsanacion
                                ? 'Subsanación y Recarga de Documento'
                                : isValidation
                                ? 'Actuación de Validación Documental'
                                : item.action.replace(/_/g, ' ')}
                            </span>
                            <span className="text-[10px] text-stone-500 font-mono">
                              {new Date(item.created_at).toLocaleDateString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {item.new_status && (
                            <div className="flex items-center gap-2 text-[11px]">
                              <span className="text-stone-400">Estado:</span>
                              {item.previous_status ? (
                                <>
                                  <span className="font-semibold text-stone-600">
                                    {item.previous_status}
                                  </span>
                                  <span className="text-stone-400">→</span>
                                </>
                              ) : null}
                              <span className="font-extrabold text-[#14281D]">
                                {item.new_status}
                              </span>
                            </div>
                          )}

                          {item.details && Object.keys(item.details).length > 0 && (
                            <div className="text-[11px] text-stone-600 bg-white p-3 rounded-xl border border-stone-200 space-y-1">
                              {Boolean(item.details.title) && (
                                <div>
                                  <span className="text-stone-400">Título:</span>{' '}
                                  <span className="font-medium text-stone-800">
                                    {String(item.details.title)}
                                  </span>
                                </div>
                              )}
                              {Boolean(item.details.filing_number) && (
                                <div>
                                  <span className="text-stone-400">Radicado:</span>{' '}
                                  <span className="font-mono font-bold text-[#14281D]">
                                    {String(item.details.filing_number)}
                                  </span>
                                </div>
                              )}
                              {Boolean(item.details.applicant_name) && (
                                <div>
                                  <span className="text-stone-400">Solicitante:</span>{' '}
                                  <span className="font-semibold text-stone-800">
                                    {String(item.details.applicant_name)}
                                  </span>
                                </div>
                              )}
                              {Boolean(item.details.reason) && (
                                <div>
                                  <span className="text-rose-600 font-semibold">Motivo:</span>{' '}
                                  <span>{String(item.details.reason)}</span>
                                </div>
                              )}
                              {Boolean(item.details.notes) && (
                                <div>
                                  <span className="text-emerald-700 font-semibold">Nota:</span>{' '}
                                  <span>{String(item.details.notes)}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-4 space-y-4 text-xs">
          <div className="bg-white rounded-3xl border border-[#E5E3DC] p-5 shadow-xs space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 block">
              Próximo Plazo Institucional
            </span>
            <div className="font-bold text-xs text-[#14281D] flex items-center gap-2">
              <Clock size={16} className="text-amber-600 shrink-0" />
              <span>
                {request.current_status === 'PENDIENTE_DOCUMENTOS' || request.current_status === 'PENDING_DOCUMENTS'
                  ? '5 días hábiles para subsanar requisitos (RN-11)'
                  : request.current_status === 'RADICADA' || request.current_status === 'SUBMITTED'
                  ? '3 días hábiles para verificación administrativa'
                  : '8 días hábiles para emisión de concepto técnico'}
              </span>
            </div>
            <p className="text-[11px] text-stone-500 pt-1 leading-relaxed">
              {computePendingRequirements(request)}
            </p>
          </div>

          <div className="bg-white rounded-3xl border border-[#E5E3DC] p-5 shadow-xs space-y-3">
            <h4 className="font-bold text-xs text-[#14281D] uppercase tracking-wider">
              Acciones ({activeRole.replace('_', ' ')})
            </h4>

            {(activeRole === 'researcher' || activeRole === 'investigador') && (
              <div className="space-y-2">
                {request.current_status === 'PENDIENTE_DOCUMENTOS' || request.current_status === 'PENDING_DOCUMENTS' ? (
                  <button
                    onClick={() => setActiveTab('documents')}
                    className="w-full py-2.5 bg-[#84CC16] hover:bg-[#74b810] text-[#14281D] font-extrabold rounded-xl transition-colors cursor-pointer text-center block shadow-xs"
                  >
                    Subsanar Documentos Rechazados
                  </button>
                ) : (
                  <p className="text-stone-500 text-[11px] leading-relaxed">
                    Su solicitud está radicada formalmente y en curso reglamentario ante el Comité de
                    Investigación.
                  </p>
                )}
              </div>
            )}

            {(activeRole === 'administrative' || activeRole === 'administrativo') && (
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/validation')}
                  className="w-full py-2.5 bg-[#14281D] text-white font-bold rounded-xl hover:bg-[#1E3A2B] transition-colors cursor-pointer text-center block shadow-xs"
                >
                  Abrir en Bandeja de Validación
                </button>
              </div>
            )}

            {(activeRole === 'secretary' || activeRole === 'secretario') && (
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/assignments')}
                  className="w-full py-2.5 bg-[#14281D] text-white font-bold rounded-xl hover:bg-[#1E3A2B] transition-colors cursor-pointer text-center block shadow-xs"
                >
                  Gestionar Asignación de Revisores
                </button>
                <button
                  onClick={() => navigate('/sessions')}
                  className="w-full py-2 border border-[#E5E3DC] text-stone-700 font-semibold rounded-xl hover:bg-stone-50 transition-colors cursor-pointer text-center block"
                >
                  Incorporar a Sesión de Comité
                </button>
              </div>
            )}

            {(activeRole === 'committee_member' || activeRole === 'miembro_comite') && (
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/reviews')}
                  className="w-full py-2.5 bg-[#14281D] text-white font-bold rounded-xl hover:bg-[#1E3A2B] transition-colors cursor-pointer text-center block shadow-xs"
                >
                  Ir a Mis Revisiones Técnicas
                </button>
              </div>
            )}

            {(activeRole === 'leader' || activeRole === 'lider') && (
              <p className="text-stone-500 text-[11px] leading-relaxed">
                Como líder del grupo de investigación, cuenta con permisos de consulta y seguimiento
                sobre este trámite.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export const DetalleSolicitudPage = RequestDetailPage;
