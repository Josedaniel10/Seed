import { TemplateDownload } from '../catalog/TemplateDownload.tsx';
import { FundingFields } from '../calls/FundingFields.tsx';
import { financingError, useCalls } from '../calls/callsApi.ts';
import { FloatingAlert } from '../../components/ui/FloatingAlert.tsx';
import { TypeOptionsSkeleton } from '../../components/ui/ContentSkeletons.tsx';
import React, { useEffect, useRef, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { useLocalDraft } from '../drafts/useLocalDraft.ts';
import { DraftNotice } from '../drafts/DraftNotice.tsx';
import { requestDraftSchema } from '../drafts/draftSchemas.ts';
import type { RequestDraft } from '../drafts/draftSchemas.ts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Upload,
  Download,
  AlertCircle,
  FileCheck,
  Trash2,
  Copy,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { useCatalogStore } from '../catalog/catalogStore.ts';
import { useGroupsStore } from '../groups/groupsStore.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { useRequestStore } from './requestStore.ts';
import { step2GeneralDataSchema } from './requestSchema.ts';
import { uploadDocumentFile } from '../documents/documentFiles.ts';
import { createUuid } from '../../lib/uuid.ts';

const STEPS = [
  { num: 1, title: 'Tipo y Requisitos' },
  { num: 2, title: 'Datos Generales' },
  { num: 3, title: 'Carga Documental' },
  { num: 4, title: 'Revisión y Envío' },
];

export function RequestSubmissionWizard() {
  const userId = useSessionStore((state) => state.user?.id ?? '');
  return <RequestSubmissionForm key={userId} />;
}

function RequestSubmissionForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const calls = useCalls();
  const { user } = useSessionStore();
  const { types, requirements, isLoading: isCatalogLoading, isInitialized: isCatalogInitialized } = useCatalogStore();
  const { groups } = useGroupsStore();
  const { createRequest, isSubmitting } = useRequestStore();

  const activeTypes = types.filter((t) => t.is_active);

  const { draft: savedDraft, controller: draftController } = useLocalDraft({
    ownerId: user?.id ?? '', scope: 'request:new', context: 'request:v1', schema: requestDraftSchema,
    createInitial: (): RequestDraft => ({
      currentStep: 1, selectedTypeId: activeTypes[0]?.id ?? '', submissionId: createUuid(),
      formData: { title: '', related_project: '', abstract: '', research_group_id: user?.researchGroupId ?? groups[0]?.id ?? '',
        budget_requested: 0, is_tutor_endorsed: false, funding_call_id: searchParams.get('convocatoria') ?? '',
        funding_mode: searchParams.has('convocatoria') ? 'funded' : 'academic' }, uploadedFiles: {},
    }),
    hasContent: (value) => Boolean(value.selectedTypeId) || value.currentStep > 1 || Boolean(value.formData.title || value.formData.abstract
      || value.formData.related_project || Object.keys(value.uploadedFiles).length),
  });
  const { currentStep, selectedTypeId, formData, uploadedFiles } = savedDraft.value;
  const setCurrentStep = (next: number) => draftController.update((current) => ({ ...current, currentStep: next }));
  const setSelectedTypeId = (next: string) => draftController.update((current) => ({ ...current, selectedTypeId: next }));
  const setFormData: Dispatch<SetStateAction<RequestDraft['formData']>> = (next) => draftController.update((current) => ({
    ...current, formData: typeof next === 'function' ? next(current.formData) : next,
  }));
  const setUploadedFiles: Dispatch<SetStateAction<RequestDraft['uploadedFiles']>> = (next) => draftController.update((current) => ({
    ...current, uploadedFiles: typeof next === 'function' ? next(current.uploadedFiles) : next,
  }));

  useEffect(() => {
    if (!selectedTypeId) {
      const firstActiveType = types.find((type) => type.is_active);
      if (firstActiveType) setSelectedTypeId(firstActiveType.id);
    }
  }, [types, selectedTypeId]);

  useEffect(() => {
    if (!formData.research_group_id && groups[0]) {
      setFormData((current) => ({ ...current, research_group_id: groups[0]?.id || '' }));
    }
  }, [groups, formData.research_group_id]);

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});
  const [uploadingReqId, setUploadingReqId] = useState<string | null>(null);
  const uploadLock = useRef(false);

  const [submittedRequest, setSubmittedRequest] = useState<{
    id: string;
    filing_number: string;
    warning?: string;
  } | null>(null);
  const [copiedRadicado, setCopiedRadicado] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const selectedType = types.find((t) => t.id === selectedTypeId);
  const typeRequirements = requirements.filter(
    (r) => r.is_active !== false && (r.request_type_id || r.application_type_id) === selectedType?.id
  );
  const mandatoryRequirements = typeRequirements.filter((r) => r.is_mandatory);

  const handleFileUpload = async (requirementId: string, file: File) => {
    if (uploadLock.current) return;
    uploadLock.current = true;
    setUploadErrors((prev) => ({ ...prev, [requirementId]: '' }));
    setUploadingReqId(requirementId);

    try {
      if (!user) throw new Error('Inicie sesión para adjuntar documentos.');
      const requirement = typeRequirements.find((item) => item.id === requirementId);
      const payload = await uploadDocumentFile({
        file, requirementId, userId: user.id,
        maxSizeMb: requirement?.max_size_mb,
        allowedFormats: requirement?.allowed_formats,
      });

      setUploadedFiles((prev) => ({
        ...prev,
        [requirementId]: payload,
      }));
    } catch (error: unknown) {
      setUploadErrors((prev) => ({
        ...prev,
        [requirementId]: error instanceof Error
          ? error.message
          : 'Error desconocido al procesar o subir el archivo.',
      }));
    } finally {
      uploadLock.current = false;
      setUploadingReqId(null);
    }
  };

  const handleRemoveFile = (requirementId: string) => {
    setUploadedFiles((prev) => {
      const copy = { ...prev };
      delete copy[requirementId];
      return copy;
    });
    setUploadErrors((prev) => ({ ...prev, [requirementId]: '' }));
  };


  const checkFunding = () => {
    const mode = formData.funding_mode ?? (formData.budget_requested > 0 ? 'funded' : 'academic');
    if (mode === 'funded' && formData.budget_requested <= 0) return 'Indique un monto mayor que cero para solicitar financiamiento.';
    return financingError(formData.budget_requested, formData.funding_call_id, calls.data ?? [], selectedTypeId,
      groups.find((g) => g.id === formData.research_group_id)?.faculty);
  };

  const handleNextStep = () => {
    if (uploadLock.current) return;
    setGeneralError(null);

    if (currentStep === 1) {
      if (!selectedType?.is_active) {
        setGeneralError('Debe seleccionar un tipo de solicitud del catálogo para continuar.');
        return;
      }
      setCurrentStep(2);
      return;
    }

    if (currentStep === 2) {
      const fundingIssue = checkFunding();
      if (fundingIssue) { setGeneralError(fundingIssue); return; }
      const parseResult = step2GeneralDataSchema.safeParse({
        title: formData.title,
        related_project: formData.related_project || null,
        abstract: formData.abstract,
        research_group_id: formData.research_group_id || null,
        budget_requested: Number(formData.budget_requested) || 0,
        is_tutor_endorsed: formData.is_tutor_endorsed,
      });

      if (!parseResult.success) {
        const errors: Record<string, string> = {};
        for (const issue of parseResult.error.issues) {
          const field = issue.path[0] as string;
          errors[field] = issue.message;
        }
        setFormErrors(errors);
        setGeneralError(Object.values(errors).join(' '));
        return;
      }

      setFormErrors({});
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      const missing = mandatoryRequirements.filter((m) => !uploadedFiles[m.id]);
      if (missing.length > 0) {
        setGeneralError(
          `Debe adjuntar todos los requisitos obligatorios (${missing.length} pendiente(s)) antes de continuar al paso de revisión.`
        );
        return;
      }
      setCurrentStep(4);
    }
  };

  const handlePrevStep = () => {
    setGeneralError(null);
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmitFiling = async () => {
    if (useRequestStore.getState().isSubmitting || uploadLock.current) return;
    setGeneralError(null);

    if (!selectedType?.is_active) {
      setGeneralError('El tipo de trámite del borrador ya no está disponible. Seleccione uno activo.');
      setCurrentStep(1);
      return;
    }
    const fundingIssue = checkFunding();
    if (fundingIssue) { setGeneralError(fundingIssue); setCurrentStep(2); return; }
    const checkedData = step2GeneralDataSchema.safeParse(formData);
    if (!checkedData.success || (formData.research_group_id && !groups.some((group) => group.id === formData.research_group_id))) {
      setGeneralError('Revise los datos generales recuperados y el grupo de investigación antes de radicar.');
      setCurrentStep(2);
      return;
    }
    if (mandatoryRequirements.some((requirement) => !uploadedFiles[requirement.id])) {
      setGeneralError('Los requisitos actuales del trámite cambiaron o faltan soportes. Revise la carga documental.');
      setCurrentStep(3);
      return;
    }
    draftController.flush();

    const docsPayload = typeRequirements.flatMap(({ id }) => uploadedFiles[id] ? [uploadedFiles[id]] : []);
    if (!user?.id) {
      setGeneralError('No se pudo identificar la sesión del investigador. Cierre sesión e ingrese nuevamente.');
      return;
    }

    const applicantId = user.id;
    const applicantName = user?.fullName || 'Investigador Principal';

    const result = await createRequest({
      submission_id: savedDraft.value.submissionId,
      request_type_id: selectedTypeId,
      application_type_id: selectedTypeId,
      applicant_id: applicantId,
      applicant_name: applicantName,
      title: formData.title,
      abstract: formData.abstract,
      related_project: formData.related_project || null,
      research_group_id: formData.research_group_id || null,
      funding_call_id: formData.funding_call_id || null,
      budget_requested: Number(formData.budget_requested) || 0,
      is_tutor_endorsed: formData.is_tutor_endorsed,
      documents: docsPayload,
    });

    if (!result.success || !result.request) {
      setGeneralError(result.error || 'Error desconocido al radicar la solicitud.');
      return;
    }

    draftController.complete();
    setSubmittedRequest({
      id: result.request.id,
      filing_number: result.request.filing_number,
      warning: result.warning,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRadicado(true);
    setTimeout(() => setCopiedRadicado(false), 2500);
  };

  if (submittedRequest) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-[#E5E3DC] p-8 md:p-10 text-center space-y-6 shadow-sm">
        <div className="w-20 h-20 rounded-3xl bg-emerald-50 border-2 border-emerald-200 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
          <CheckCircle2 size={40} className="text-emerald-700" />
        </div>

        <div className="space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            Radicación Exitosa
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-[#14281D]">
            ¡Solicitud Radicada Formalmente!
          </h2>
          <p className="text-xs text-stone-600 max-w-lg mx-auto leading-relaxed">
            Su solicitud quedó <strong className="text-[#14281D]">Radicada</strong>. Puede consultar su avance en Mis solicitudes.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#F7F6F2] border border-[#E5E3DC] inline-flex flex-col items-center gap-2 max-w-md w-full">
          <span className="text-[11px] text-stone-500 uppercase tracking-wider font-bold">
            Número Oficial de Radicado Consecutivo
          </span>
          <div className="flex items-center gap-3">
            <span className="text-2xl md:text-3xl font-mono font-extrabold text-[#14281D]">
              {submittedRequest.filing_number}
            </span>
            <button
              onClick={() => copyToClipboard(submittedRequest.filing_number)}
              title="Copiar radicado"
              className="p-2 rounded-xl bg-white border border-[#E5E3DC] text-stone-600 hover:text-[#14281D] hover:border-stone-400 transition-colors cursor-pointer"
            >
              {copiedRadicado ? (
                <CheckCircle2 size={16} className="text-emerald-600" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
          {copiedRadicado && (
            <span className="text-[10px] text-emerald-700 font-semibold animate-pulse">
              ¡Copiado al portapapeles!
            </span>
          )}
        </div>

        {submittedRequest.warning && (
          <div role="alert" className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-950">
            {submittedRequest.warning}
          </div>
        )}

        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-left text-xs text-amber-950 flex items-start gap-3">
          <Info size={18} className="text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block">Próximo paso</span>
            <span>
              El personal administrativo verificará la lista de requisitos y documentos adjuntos en
              la bandeja de validación. Si todos son conformes, pasará a <em>En revisión</em>; si
              falta un requisito subsanable, pasará a <em>Pendiente por documentos</em> con plazo de
              subsanación.
            </span>
          </div>
        </div>

        <div className="pt-3 flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={() => navigate(`/solicitudes/${submittedRequest.id}`)}
            className="px-6 py-3 bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs inline-flex items-center justify-center gap-2"
          >
            <FileText size={15} />
            <span>Ver Detalle del Expediente</span>
          </button>
          <button
            onClick={() => navigate('/mis-solicitudes')}
            className="px-6 py-3 border border-[#E5E3DC] bg-white hover:bg-stone-50 text-stone-800 text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center gap-2"
          >
            <span>Ir a Mis Solicitudes</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <DraftNotice draft={savedDraft} controller={draftController} label="nueva solicitud" disabled={isSubmitting || Boolean(uploadingReqId)} />
      {selectedTypeId && types.length > 0 && !selectedType?.is_active && <p role="alert" className="rounded-xl bg-amber-50 p-3 text-xs text-amber-950">
        El tipo de trámite del borrador ya no está disponible. Sus datos se conservan.
        <button type="button" onClick={() => setCurrentStep(1)} className="ml-2 min-h-11 underline">Revisar tipo de trámite</button>
      </p>}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-3 md:p-4 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {STEPS.map((s) => (
            <div
              key={s.num}
              className={`flex items-center gap-2.5 p-2.5 rounded-xl text-xs transition-all ${
                currentStep === s.num
                  ? 'bg-[#14281D] text-white font-bold shadow-xs'
                  : currentStep > s.num
                  ? 'bg-[#A3E635]/20 text-[#14281D] font-medium border border-[#84CC16]/30'
                  : 'text-stone-400 bg-stone-50 border border-transparent'
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
                  currentStep === s.num
                    ? 'bg-white text-[#14281D]'
                    : currentStep > s.num
                    ? 'bg-[#14281D] text-white'
                    : 'bg-stone-200 text-stone-600'
                }`}
              >
                {currentStep > s.num ? '✓' : s.num}
              </span>
              <span className="truncate">{s.title}</span>
            </div>
          ))}
        </div>
      </div>

      <FloatingAlert message={generalError} onDismiss={() => setGeneralError(null)} />

      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 md:p-8 shadow-xs">
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Paso 1 de 4 · Catálogo Institucional
              </span>
              <h2 className="text-lg md:text-xl font-extrabold text-[#14281D] mt-0.5">
                Seleccione el Tipo de Trámite o Solicitud
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Al seleccionar un tipo de solicitud, se desplegará dinámicamente la lista de
                documentos requeridos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {isCatalogLoading && !isCatalogInitialized ? <div className="md:col-span-2"><TypeOptionsSkeleton count={activeTypes.length || 4} /></div> : activeTypes.map((type) => {
                const isSelected = selectedTypeId === type.id;
                const reqCount = requirements.filter(
                  (r) => r.is_active !== false && (r.request_type_id || r.application_type_id) === type.id
                ).length;
                return (
                  <div
                    key={type.id}
                    onClick={() => setSelectedTypeId(type.id)}
                    className={`p-4 rounded-2xl border text-xs cursor-pointer transition-all space-y-2.5 flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#14281D] bg-[#F7F6F2] ring-2 ring-[#14281D] shadow-xs'
                        : 'border-[#E5E3DC] hover:border-stone-400 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200">
                          {type.code}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            type.requires_committee
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-blue-100 text-blue-900 border border-blue-200'
                          }`}
                        >
                          {type.requires_committee ? 'Deliberación en Comité' : 'Trámite Administrativo'}
                        </span>
                      </div>
                      <h3 className="font-bold text-[#14281D] text-sm leading-snug">{type.name}</h3>
                      <p className="text-[11px] text-stone-600 mt-1 leading-relaxed">
                        {type.description}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-[11px] text-stone-500">
                      <span>{reqCount} documentos requeridos</span>
                      <span className="font-bold text-[#14281D]">
                        {isSelected ? '✓ Seleccionado' : 'Elegir tipo'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedType && (!isCatalogLoading || isCatalogInitialized) && (
              <div className="p-5 rounded-2xl bg-[#F7F6F2] border border-[#E5E3DC] space-y-3 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileCheck size={18} className="text-[#14281D]" />
                    <h4 className="font-bold text-xs md:text-sm text-[#14281D]">
                      Requisitos Documentales Exigidos para: {selectedType.name}
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-stone-600 bg-white px-2.5 py-0.5 rounded-md border border-stone-200">
                    Total: {typeRequirements.length}
                  </span>
                </div>

                {typeRequirements.length === 0 ? (
                  <p className="text-xs text-stone-500 italic">
                    Este tipo de trámite no cuenta con requisitos documentales específicos en el catálogo.
                  </p>
                ) : (
                  <div className="space-y-2.5 pt-1">
                    {typeRequirements.map((req, idx) => (
                      <div
                        key={req.id}
                        className="p-3.5 rounded-xl bg-white border border-[#E5E3DC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
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
                              <span className="text-[10px] font-medium px-2 py-0.2 rounded bg-stone-100 text-stone-700 border border-stone-200">
                                Condicional / Opcional
                              </span>
                            )}
                            {req.is_subsanable ? (
                              <span
                                className="text-[10px] font-bold px-2 py-0.2 rounded bg-emerald-100 text-emerald-900 border border-emerald-200"
                                title="Si se detecta error en validación, se otorgan días hábiles para corregir"
                              >
                                Subsanable ({req.cure_deadline_days} días)
                              </span>
                            ) : (
                              <span
                                className="text-[10px] font-bold px-2 py-0.2 rounded bg-rose-100 text-rose-900 border border-rose-200"
                                title="La falta de este documento causa rechazo inmediato en validación"
                              >
                                No subsanable (Rechazo directo si falta)
                              </span>
                            )}
                          </div>
                          {req.description && (
                            <p className="text-[11px] text-stone-500 leading-relaxed">
                              {req.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <span className="text-[10px] text-stone-400 font-mono">
                            PDF/DOCX · Máx {req.max_size_mb} MB
                          </span>
                          {req.template_url && <TemplateDownload path={req.template_url} />}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Paso 2 de 4 · Información Técnica
              </span>
              <h2 className="text-lg md:text-xl font-extrabold text-[#14281D] mt-0.5">
                Datos Generales de la Solicitud
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Ingrese el título descriptivo, justificación técnica y datos institucionales del
                trámite.
              </p>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Título de la Solicitud o Proyecto de Investigación *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ej: Evaluación biológica de metabolitos secundarios en biocontrol de plagas..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    formErrors.title ? 'border-rose-500 ring-1 ring-rose-500' : 'border-[#E5E3DC]'
                  } focus:border-[#14281D] outline-none text-xs text-stone-800`}
                />
                {formErrors.title && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.title}</p>
                )}
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Código o Título de Proyecto Institucional Previo (Opcional)
                </label>
                <input
                  type="text"
                  value={formData.related_project}
                  onChange={(e) => setFormData({ ...formData, related_project: e.target.value })}
                  placeholder="Ej: INV-2024-0042 / Convocatoria Interna 2024"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none text-xs text-stone-800"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-stone-800 mb-1">
                    Grupo de Investigación Adscrito
                  </label>
                  <select
                    value={formData.research_group_id}
                    onChange={(e) =>
                      setFormData({ ...formData, research_group_id: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none bg-white text-xs text-stone-800"
                  >
                    <option value="">Sin grupo asignado</option>
                    {formData.research_group_id && !groups.some((group) => group.id === formData.research_group_id)
                      && <option value={formData.research_group_id} disabled>Grupo del borrador no disponible; seleccione uno actual</option>}
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        [{g.code}] {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                <FundingFields value={formData} onChange={setFormData} typeId={selectedTypeId}
                  faculty={groups.find((g) => g.id === formData.research_group_id)?.faculty} />
              </div>

              <div>
                <label className="block font-bold text-stone-800 mb-1">
                  Resumen Ejecutivo y Justificación Motivada *
                </label>
                <textarea
                  rows={4}
                  value={formData.abstract}
                  onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                  placeholder="Detalle los antecedentes, objetivos específicos, impacto esperado y justificación técnica de la solicitud..."
                  className={`w-full px-3.5 py-2.5 rounded-xl border ${
                    formErrors.abstract
                      ? 'border-rose-500 ring-1 ring-rose-500'
                      : 'border-[#E5E3DC]'
                  } focus:border-[#14281D] outline-none text-xs text-stone-800 leading-relaxed`}
                />
                {formErrors.abstract && (
                  <p className="text-[11px] text-rose-600 mt-1">{formErrors.abstract}</p>
                )}
                <span className="text-[10px] text-stone-400 block text-right mt-0.5">
                  Mínimo 20 caracteres ({formData.abstract.length}/3000)
                </span>
              </div>

              <div className="p-4 rounded-xl bg-[#F7F6F2] border border-[#E5E3DC] flex items-start gap-3">
                <input
                  type="checkbox"
                  id="chk-tutor"
                  checked={formData.is_tutor_endorsed}
                  onChange={(e) =>
                    setFormData({ ...formData, is_tutor_endorsed: e.target.checked })
                  }
                  className="mt-0.5 rounded border-stone-300 text-[#14281D] focus:ring-[#14281D] cursor-pointer"
                />
                <label htmlFor="chk-tutor" className="cursor-pointer space-y-0.5">
                  <span className="font-bold text-[#14281D] block">
                    Declaración de Aval de Docente Tutor
                  </span>
                  <span className="text-[11px] text-stone-600 block leading-relaxed">
                    Si la solicitud es presentada por estudiantes de semillero o monitores de
                    investigación, se certifica contar con el aval formal y acompañamiento del
                    docente tutor del grupo adscrito.
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Paso 3 de 4 · Carga Documental
              </span>
              <h2 className="text-lg md:text-xl font-extrabold text-[#14281D] mt-0.5">
                Carga de Archivos y Requisitos Obligatorios
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Adjunte los documentos requeridos en PDF o DOCX. El tamaño máximo por archivo es de 10 MB.
              </p>
            </div>

            <div className="space-y-4">
              {typeRequirements.map((req, idx) => {
                const uploaded = uploadedFiles[req.id];
                const error = uploadErrors[req.id];
                const isUploading = uploadingReqId === req.id;

                return (
                  <div
                    key={req.id}
                    className={`p-4 md:p-5 rounded-2xl border transition-all ${
                      uploaded
                        ? 'bg-emerald-50/50 border-emerald-300'
                        : error
                        ? 'bg-rose-50/40 border-rose-300'
                        : 'bg-[#F7F6F2] border-[#E5E3DC]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#14281D]">
                          {idx + 1}. {req.name}
                        </span>
                        {req.is_mandatory ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-stone-800 text-white">
                            Obligatorio
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-stone-200 text-stone-700">
                            Condicional
                          </span>
                        )}
                      </div>

                      {req.template_url && <TemplateDownload path={req.template_url} />}
                    </div>

                    {req.description && (
                      <p className="text-[11px] text-stone-500 mb-3">{req.description}</p>
                    )}

                    {uploaded ? (
                      <div className="p-3.5 rounded-xl bg-white border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
                          <div className="truncate">
                            <span className="font-bold text-[#14281D] block truncate">
                              {uploaded.file_name}
                            </span>
                            <span className="text-[10px] text-stone-500 block font-mono">
                              {(uploaded.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Archivo cargado
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(req.id)}
                            className="p-1.5 rounded-lg border border-stone-200 text-stone-500 hover:text-rose-600 hover:border-rose-300 transition-colors cursor-pointer"
                            title="Quitar archivo"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label
                          htmlFor={`file-input-${req.id}`}
                          className={`border-2 border-dashed rounded-xl p-5 block text-center cursor-pointer transition-all ${
                            isUploading
                              ? 'border-stone-400 bg-stone-100 animate-pulse'
                              : 'border-stone-300 bg-white hover:border-[#14281D] hover:bg-stone-50'
                          }`}
                        >
                          <input
                            type="file"
                            id={`file-input-${req.id}`}
                            accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            disabled={Boolean(uploadingReqId) || (isCatalogLoading && !isCatalogInitialized)}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = '';
                              if (f) void handleFileUpload(req.id, f);
                            }}
                            className="hidden"
                          />
                          <Upload size={20} className="mx-auto text-stone-400 mb-1.5" />
                          <span className="text-xs font-semibold text-[#14281D] block">
                            Haga clic o arrastre su archivo aquí
                          </span>
                          <span className="text-[10px] text-stone-500 block mt-0.5">
                            Formatos autorizados: PDF (.pdf) y Word (.docx) · Tamaño máx: {req.max_size_mb} MB
                          </span>
                        </label>

                        {error && (
                          <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px] flex items-center gap-2">
                            <ShieldAlert size={14} className="text-rose-600 shrink-0" />
                            <span>{error}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                Paso 4 de 4 · Verificación Integral
              </span>
              <h2 className="text-lg md:text-xl font-extrabold text-[#14281D] mt-0.5">
                Revisión Final y Generación de Radicado
              </h2>
              <p className="text-xs text-stone-500 mt-1">
                Verifique que toda la información técnica y los soportes documentales sean correctos
                antes de asentar el radicado oficial.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#F7F6F2] border border-[#E5E3DC] space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-stone-200 pb-3">
                <div>
                  <span className="text-stone-400 block text-[11px]">Tipo de Trámite:</span>
                  <span className="font-bold text-[#14281D] text-sm">{selectedType?.name}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Instancia Resolutiva:</span>
                  <span className="font-semibold text-stone-800">
                    {selectedType?.requires_committee
                      ? 'Comité de Investigaciones (Sesión Colegiada)'
                      : 'Trámite Administrativo Directo'}
                  </span>
                </div>
              </div>

              <div className="border-b border-stone-200 pb-3 space-y-1">
                <span className="text-stone-400 block text-[11px]">Título del Proyecto:</span>
                <span className="font-bold text-[#14281D] text-sm leading-snug">
                  {formData.title}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-stone-200 pb-3">
                <div>
                  <span className="text-stone-400 block text-[11px]">Grupo de Investigación:</span>
                  <span className="font-semibold text-stone-800">
                    {groups.find((g) => g.id === formData.research_group_id)?.name || 'No asignado'}
                  </span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[11px]">Presupuesto Solicitado:</span>
                  <span className="font-mono font-bold text-[#14281D]">
                    {formData.funding_call_id && <p>Convocatoria: {calls.data?.find((c) => c.id === formData.funding_call_id)?.title ?? 'No disponible'}</p>}
                    {formData.budget_requested > 0
                      ? `$ ${formData.budget_requested.toLocaleString('es-CO')} COP`
                      : 'No aplica / Sin presupuesto'}
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-stone-400 block text-[11px]">Resumen Ejecutivo:</span>
                <p className="text-stone-700 leading-relaxed bg-white p-3 rounded-xl border border-stone-200">
                  {formData.abstract}
                </p>
              </div>

              <div className="pt-2">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block mb-2">
                  Documentos y Soportes Listos ({Object.keys(uploadedFiles).length} de{' '}
                  {typeRequirements.length})
                </span>
                <div className="space-y-2">
                  {typeRequirements.map((req) => {
                    const up = uploadedFiles[req.id];
                    return (
                      <div
                        key={req.id}
                        className="p-2.5 rounded-xl bg-white border border-stone-200 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          {up ? (
                            <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                          ) : (
                            <AlertCircle size={15} className="text-amber-600 shrink-0" />
                          )}
                          <span className="font-medium text-stone-800">{req.name}</span>
                        </div>
                        {up ? (
                          <span className="font-mono text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {up.file_name}
                          </span>
                        ) : (
                          <span className="text-[10px] text-stone-400 italic">No adjuntado</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-center gap-3">
              <AlertCircle size={18} className="text-amber-700 shrink-0" />
              <span>
                Al enviar recibirá su número de radicado y podrá consultar el avance de la solicitud.
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mobile-wizard-actions flex items-center justify-between gap-2 pt-2">
        <button
          type="button"
          onClick={handlePrevStep}
          disabled={currentStep === 1 || isSubmitting || Boolean(uploadingReqId)}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#E5E3DC] text-xs font-semibold text-stone-700 bg-white hover:bg-stone-50 disabled:opacity-40 cursor-pointer shadow-xs"
        >
          <ArrowLeft size={14} />
          <span>Atrás</span>
        </button>

        {currentStep < 4 ? (
          <button
            type="button"
            onClick={handleNextStep}
            disabled={Boolean(uploadingReqId) || (isCatalogLoading && !isCatalogInitialized)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
          >
            <span>Continuar al Paso {currentStep + 1}</span>
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmitFiling}
            disabled={isSubmitting || Boolean(uploadingReqId)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#84CC16] hover:bg-[#74b810] text-[#14281D] text-xs font-extrabold cursor-pointer transition-colors shadow-xs disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            <span>{isSubmitting ? 'Radicando...' : 'Confirmar y Radicar Solicitud'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

export const FilingWizard = RequestSubmissionWizard;
