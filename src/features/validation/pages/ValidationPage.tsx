import React, { useState } from 'react';
import { PageHeader } from '../../../components/layout/PageHeader.tsx';
import { RoleGuard } from '../../auth/RoleGuard.tsx';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Download,
  AlertCircle,
  Filter,
  Search,
  Check,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../components/ui/Button.tsx';

interface SubmissionItem {
  id: string;
  filingNumber: string;
  title: string;
  applicant: string;
  type: string;
  submittedAt: string;
  documents: Array<{
    id: string;
    name: string;
    isMandatory: boolean;
    isSubsanable: boolean;
    fileUrl: string;
    status: 'PENDING' | 'VALID' | 'REJECTED';
    observation?: string;
  }>;
}

const INITIAL_SUBMISSIONS: SubmissionItem[] = [
  {
    id: 'sub-001',
    filingNumber: 'INV-2026-0014',
    title: 'Modelamiento de Redes Neuronales Profundas para Detección Temprana de Fitopatógenos',
    applicant: 'Dra. Carmen Lucía Morales',
    type: 'Presentación de Proyecto de Investigación',
    submittedAt: '03 Nov 2026 · 14:30',
    documents: [
      {
        id: 'doc-1',
        name: 'Propuesta Técnica Completa',
        isMandatory: true,
        isSubsanable: false,
        fileUrl: '/templates/formato_propuesta_investigacion.pdf',
        status: 'VALID',
      },
      {
        id: 'doc-2',
        name: 'Presupuesto Detallado y Cronograma',
        isMandatory: true,
        isSubsanable: true,
        fileUrl: '/templates/formato_presupuesto_cronograma.xlsx',
        status: 'PENDING',
      },
      {
        id: 'doc-3',
        name: 'Carta de Aval del Líder de Grupo',
        isMandatory: true,
        isSubsanable: true,
        fileUrl: '/templates/formato_aval_lider_grupo.pdf',
        status: 'PENDING',
      },
    ],
  },
  {
    id: 'sub-002',
    filingNumber: 'INV-2026-0015',
    title: 'Ajuste de Presupuesto para Adquisición de Reactivos de Espectrometría de Masas',
    applicant: 'Dr. Alejandro Restrepo',
    type: 'Modificación de Rubro Presupuestal (> 20%)',
    submittedAt: '04 Nov 2026 · 09:15',
    documents: [
      {
        id: 'doc-4',
        name: 'Justificación Técnica de Modificación Presupuestal',
        isMandatory: true,
        isSubsanable: true,
        fileUrl: '/templates/formato_propuesta_investigacion.pdf',
        status: 'VALID',
      },
      {
        id: 'doc-5',
        name: 'Cuadro Comparativo de Rubros',
        isMandatory: true,
        isSubsanable: true,
        fileUrl: '/templates/formato_presupuesto_cronograma.xlsx',
        status: 'PENDING',
      },
    ],
  },
];

export function ValidationPage() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState(INITIAL_SUBMISSIONS);
  const [selectedSubId, setSelectedSubId] = useState('sub-001');
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const selectedSubmission =
    submissions.find((s) => s.id === selectedSubId) || submissions[0];

  const handleUpdateDocStatus = (docId: string, status: 'VALID' | 'REJECTED') => {
    setSubmissions((prev) =>
      prev.map((sub) => {
        if (sub.id !== selectedSubmission.id) return sub;
        return {
          ...sub,
          documents: sub.documents.map((doc) =>
            doc.id === docId ? { ...doc, status } : doc
          ),
        };
      })
    );

    setFeedbackMessage(
      status === 'VALID'
        ? 'Documento validado exitosamente.'
        : 'Documento observado. Se solicitará subsanación al investigador.'
    );
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  return (
    <RoleGuard
      allowedRoles={['administrativo', 'secretario', 'admin']}
      fallbackTitle="Módulo de Validación Documental"
      onNavigateHome={() => navigate('/')}
    >
      <div className="space-y-6">
        <PageHeader
          title="Validación Documental de Trámites"
          description="Bandeja de verificación de requisitos para el personal administrativo y secretaría técnica del comité."
          icon={<ClipboardCheck size={22} />}
          breadcrumbs={[
            { label: 'Inicio', href: '/' },
            { label: 'Validación Documental' },
          ]}
        />

        {feedbackMessage && (
          <div className="p-3 bg-[#A3E635]/25 border border-[#84CC16] text-[#14281D] rounded-xl text-xs flex items-center gap-2">
            <Check size={15} />
            <span>{feedbackMessage}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Submissions Queue (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-500 font-medium">
              <span>Expedientes por Validar ({submissions.length})</span>
            </div>

            <div className="space-y-2.5">
              {submissions.map((sub) => {
                const isSelected = sub.id === selectedSubmission?.id;
                const pendingDocs = sub.documents.filter((d) => d.status === 'PENDING').length;

                return (
                  <div
                    key={sub.id}
                    onClick={() => setSelectedSubId(sub.id)}
                    className={`p-4 rounded-xl border text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white border-[#14281D] shadow-sm ring-1 ring-[#14281D]'
                        : 'bg-white border-[#E5E3DC] hover:border-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-[#F7F6F2] border border-[#E5E3DC] text-[#14281D]">
                        {sub.filingNumber}
                      </span>
                      <span className="text-[10px] text-stone-500">{sub.submittedAt}</span>
                    </div>

                    <h4 className="font-bold text-[#14281D] line-clamp-1">{sub.title}</h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">{sub.applicant}</p>

                    <div className="pt-2 mt-2 border-t border-stone-100 flex items-center justify-between text-[11px]">
                      <span className="text-stone-500">{sub.type}</span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                          pendingDocs > 0
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {pendingDocs > 0 ? `${pendingDocs} pendientes` : 'Completado'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Documents Checklist (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4">
            {selectedSubmission && (
              <>
                <div className="pb-3 border-b border-stone-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#14281D] text-white rounded">
                      {selectedSubmission.filingNumber}
                    </span>
                    <span className="text-xs text-stone-500 font-medium">
                      {selectedSubmission.type}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-[#14281D]">
                    {selectedSubmission.title}
                  </h3>
                  <p className="text-xs text-stone-600 mt-1">
                    Solicitante: <strong>{selectedSubmission.applicant}</strong>
                  </p>
                </div>

                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
                    Lista de Chequeo Documental
                  </h4>

                  {selectedSubmission.documents.map((doc, idx) => (
                    <div
                      key={doc.id}
                      className="p-3.5 rounded-xl border border-[#E5E3DC] bg-[#F7F6F2] text-xs space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="font-bold text-[#14281D] flex items-center gap-2">
                            <span>
                              {idx + 1}. {doc.name}
                            </span>
                            {doc.status === 'VALID' && (
                              <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                                <Check size={11} /> Válido
                              </span>
                            )}
                            {doc.status === 'REJECTED' && (
                              <span className="text-[10px] font-semibold text-rose-800 bg-rose-100 px-2 py-0.5 rounded flex items-center gap-1">
                                <XCircle size={11} /> Con Observaciones
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-stone-500">
                            <span>{doc.isMandatory ? 'Obligatorio' : 'Opcional'}</span>
                            <span>·</span>
                            <span>{doc.isSubsanable ? 'Subsanable (5 días)' : 'No subsanable'}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleUpdateDocStatus(doc.id, 'VALID')}
                            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                              doc.status === 'VALID'
                                ? 'bg-emerald-700 text-white border-emerald-700'
                                : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                            title="Marcar como válido"
                          >
                            <Check size={13} />
                            <span>Aprobar</span>
                          </button>

                          <button
                            onClick={() => handleUpdateDocStatus(doc.id, 'REJECTED')}
                            className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                              doc.status === 'REJECTED'
                                ? 'bg-rose-700 text-white border-rose-700'
                                : 'bg-white hover:bg-rose-50 text-rose-800 border-rose-200'
                            }`}
                            title="Solicitar subsanación"
                          >
                            <XCircle size={13} />
                            <span>Observar</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}
