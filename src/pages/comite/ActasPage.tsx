import React, { useState } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  Download,
  Calendar,
  FileText,
  Eye,
  CheckCircle2,
  Lock,
  X,
  FileCode,
  Building,
} from 'lucide-react';
import { useMinutesStore } from '../../features/minutes/minutesStore.ts';
import { useCommitteeSessionsStore } from '../../features/sessions/committeeSessionsStore.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { CommitteeMinutes } from '../../types/database.ts';

export function ActasPage() {
  const { user } = useSessionStore();
  const { minutes, searchMinutes, approveMinutes, updateDraftContent, exportMinutePdf } =
    useMinutesStore();
  const { sessions } = useCommitteeSessionsStore();

  const [search, setSearch] = useState('');
  const [selectedMinute, setSelectedMinute] = useState<CommitteeMinutes | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editedDraftContent, setEditedDraftContent] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filteredMinutes = search ? searchMinutes(search) : minutes;
  const isSecretaryOrAdmin = user?.activeRole === 'secretario' || user?.activeRole === 'admin';

  const handleOpenDetail = (min: CommitteeMinutes) => {
    setSelectedMinute(min);
    setEditedDraftContent(min.draft_content);
    setIsEditingDraft(false);
    setActionError(null);
    setActionSuccess(null);
  };

  const handleSaveDraft = async () => {
    if (!selectedMinute) return;
    setActionError(null);

    const res = await updateDraftContent(
      selectedMinute.id,
      editedDraftContent,
      user?.id || 'usr-sec-04',
      user?.fullName || 'Secretaria Técnica'
    );

    if (!res.success) {
      setActionError(res.error || 'Error al guardar borrador.');
    } else {
      setSelectedMinute(res.minute || null);
      setIsEditingDraft(false);
      setActionSuccess('Borrador de acta actualizado con éxito.');
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleApproveMinutes = async () => {
    if (!selectedMinute) return;
    setActionError(null);

    const res = await approveMinutes(
      selectedMinute.id,
      user?.id || 'usr-sec-04',
      user?.fullName || 'Secretaria Técnica'
    );

    if (!res.success) {
      setActionError(res.error || 'Error al aprobar el acta.');
    } else {
      setSelectedMinute(res.minute || null);
      setActionSuccess('Acta formalmente aprobada y firmada. Ha pasado a estado inmutable (RNF-03).');
      setTimeout(() => setActionSuccess(null), 3500);
    }
  };

  const handleDownload = async (minute: CommitteeMinutes) => {
    const res = await exportMinutePdf(minute.id);
    if (res.success && res.pdfUrl) {
      const a = document.createElement('a');
      a.href = res.pdfUrl;
      a.download = res.fileName || `${minute.minute_number}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(res.pdfUrl);
    }
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-[#14281D] text-[#A3E635]">
            <FileCheck size={18} />
          </span>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
            Actas Oficiales y Acuerdos de Comité
          </h1>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Secuencia anual consecutiva (RF-31), consolidación automática de orden del día y acuerdos, aprobación solemne e inmutabilidad (RNF-03).
        </p>
      </div>

      {/* Buscador Histórico (RF-32) */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-stone-400" size={15} />
          <input
            type="text"
            placeholder="Buscar por número de acta (ej. Acta 001 de 2026), radicado o acuerdo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none text-xs"
          />
        </div>
        <div className="text-[11px] text-stone-500 shrink-0 font-medium self-center">
          Mostrando {filteredMinutes.length} actas institucionales
        </div>
      </div>

      {/* Tabla de Actas */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F7F6F2] border-b border-[#E5E3DC] text-[11px] font-bold uppercase tracking-wider text-stone-600">
            <tr>
              <th className="py-3 px-4">Número de Acta (RF-31)</th>
              <th className="py-3 px-4">Vigencia Anual</th>
              <th className="py-3 px-4">Sesión Vinculada</th>
              <th className="py-3 px-4">Estado Legal</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E3DC]">
            {filteredMinutes.map((acta) => {
              const ses = sessions.find((s) => s.id === acta.session_id);

              return (
                <tr key={acta.id} className="hover:bg-[#FAF9F6] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#14281D]">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-stone-400" />
                      <span>{acta.minute_number}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-stone-600 font-mono">
                    {acta.year}
                  </td>
                  <td className="py-3.5 px-4 text-stone-600">
                    {ses?.session_number || acta.session_id}
                  </td>
                  <td className="py-3.5 px-4">
                    {acta.is_approved ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 inline-flex items-center gap-1">
                        <Lock size={10} />
                        <span>Aprobada e Inmutable (RNF-03)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        Borrador en Revisión
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenDetail(acta)}
                      className="px-2.5 py-1.5 border border-[#E5E3DC] rounded-lg hover:bg-stone-50 font-semibold text-xs inline-flex items-center gap-1 cursor-pointer text-[#14281D]"
                    >
                      <Eye size={12} />
                      <span>Ver Acta</span>
                    </button>
                    <button
                      onClick={() => handleDownload(acta)}
                      className="px-2.5 py-1.5 bg-[#14281D] hover:bg-[#1E3A2B] text-white rounded-lg font-semibold text-xs inline-flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Download size={12} />
                      <span>Descargar</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal de Lectura, Edición y Aprobación de Acta */}
      {selectedMinute && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl space-y-4 text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#14281D] text-white">
                  <FileCheck size={16} />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-[#14281D]">
                    {selectedMinute.minute_number}
                  </h3>
                  <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2">
                    <span>Vigencia {selectedMinute.year}</span>
                    <span>·</span>
                    <span>
                      {selectedMinute.is_approved
                        ? `Aprobada el ${new Date(selectedMinute.approved_at || '').toLocaleDateString('es-CO')}`
                        : 'Estado: Borrador en trámite'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedMinute(null)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 shrink-0">
                {actionError}
              </div>
            )}

            {actionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shrink-0">
                {actionSuccess}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {isEditingDraft ? (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1 text-[11px]">
                    Editar Texto y Compromisos del Acta (RF-30):
                  </label>
                  <textarea
                    rows={16}
                    value={editedDraftContent}
                    onChange={(e) => setEditedDraftContent(e.target.value)}
                    className="w-full p-4 rounded-xl border border-[#E5E3DC] font-mono text-xs leading-relaxed outline-none focus:border-[#14281D]"
                  />
                </div>
              ) : (
                <div className="p-5 rounded-xl border border-[#E5E3DC] bg-[#FAF9F6] font-mono text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
                  {selectedMinute.draft_content}
                </div>
              )}
            </div>

            {/* Acciones de Pie del Modal */}
            <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {!selectedMinute.is_approved && isSecretaryOrAdmin && (
                  <>
                    {isEditingDraft ? (
                      <button
                        onClick={handleSaveDraft}
                        className="px-3.5 py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white rounded-xl font-bold cursor-pointer"
                      >
                        Guardar Ajustes
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditingDraft(true)}
                        className="px-3.5 py-2 border border-[#E5E3DC] hover:bg-stone-50 rounded-xl font-bold text-[#14281D] cursor-pointer"
                      >
                        Editar Compromisos
                      </button>
                    )}
                  </>
                )}

                {!selectedMinute.is_approved && isSecretaryOrAdmin && (
                  <button
                    onClick={handleApproveMinutes}
                    className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 size={13} />
                    <span>Aprobar Acta Formalmente (RNF-03)</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedMinute)}
                  className="px-3.5 py-2 border border-[#E5E3DC] hover:bg-stone-50 rounded-xl font-bold text-[#14281D] flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Descargar Documento</span>
                </button>
                <button
                  onClick={() => setSelectedMinute(null)}
                  className="px-3.5 py-2 border border-stone-200 text-stone-600 rounded-xl font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
