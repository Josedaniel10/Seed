import { useDecisionConfirmation } from '../../hooks/useDecisionConfirmation.tsx';
import { useListFilter } from '../../hooks/useListFilter.ts';
import { ResponsiveOverlay } from '../../components/ui/ResponsiveOverlay.tsx';
import { useState } from 'react';
import { Download, Eye, FileCheck, Lock, Search, X } from 'lucide-react';
import { normalizeRole } from '../../lib/permissions.ts';
import { useCommitteeData } from '../../features/sessions/useCommitteeData.ts';
import { useMinutesStore } from '../../features/minutes/minutesStore.ts';
import { MinuteWorkspace } from '../../features/minutes/MinuteWorkspace.tsx';
import { useCommitteeSessionsStore } from '../../features/sessions/committeeSessionsStore.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import type { CommitteeMinutes } from '../../types/database.ts';

export function ActasPage() {
  useCommitteeData();
  const user = useSessionStore((state) => state.user);
  const { minutes, isLoading, isSaving, error, searchMinutes, exportMinutePdf } = useMinutesStore();
  const sessions = useCommitteeSessionsStore((state) => state.sessions);
  const [search, setSearch] = useListFilter('search', '');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { requestDecision, decisionDialog } = useDecisionConfirmation(`${user?.id ?? 'anonymous'}:${selectedId}`);
  const selectedMinute = minutes.find((minute) => minute.id === selectedId);
  const filteredMinutes = search ? searchMinutes(search) : minutes;
  const role = normalizeRole(user?.activeRole);
  const canManage = role === 'secretary' || role === 'admin';

  const handleCloseMinute = () => {
    if (isSaving) return;
    if (!hasUnsavedChanges) { setSelectedId(null); return; }
    requestDecision({
      title: 'Confirmar descarte de cambios', target: selectedMinute?.minute_number ?? 'Acta',
      confirmLabel: 'Descartar cambios y cerrar', intent: 'danger',
      consequence: 'Se perderán los cambios sin guardar. El último borrador guardado se conservará.',
    }, () => { setSelectedId(null); });
  };

  const handleDownload = async (minute: CommitteeMinutes) => {
    setActionError(null);
    const result = await exportMinutePdf(minute.id);
    if (!result.success || !result.pdfUrl) { setActionError(result.error || 'No se pudo descargar el PDF.'); return; }
    const anchor = document.createElement('a');
    anchor.href = result.pdfUrl;
    anchor.download = result.fileName || 'acta.pdf';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(result.pdfUrl ?? ''), 1000);
  };

  return <div className="space-y-6 min-w-0">
    <div>
      <div className="flex items-center gap-2 text-[#14281D]">
        <FileCheck size={24} />
        <h1 className="mobile-section-title text-xl md:text-2xl font-extrabold tracking-tight">Actas Oficiales y Acuerdos de Comité</h1>
      </div>
      <p className="text-xs text-stone-500 mt-1">Consulte las actas y las decisiones de cada sesión.</p>
    </div>
    <div className="bg-white rounded-2xl border border-[#E5E3DC] p-4 flex flex-wrap items-center gap-3 text-xs">
      <label className="relative flex-1 min-w-48">
        <span className="sr-only">Buscar actas</span><Search className="absolute left-3 top-2.5 text-stone-400" size={15} />
        <input type="search" placeholder="Buscar por número de acta, radicado o acuerdo..." value={search} onChange={(event) => setSearch(event.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E3DC]" />
      </label>
      <span className="text-stone-500">Mostrando {filteredMinutes.length} actas institucionales</span>
    </div>
    {isLoading && <p role="status">Cargando actas…</p>}
    {(error || actionError) && <p role="alert" className="text-rose-800">{error || actionError}</p>}
    {!isLoading && !error && !filteredMinutes.length && <p>No hay actas para esta búsqueda. Puede generarlas desde una sesión finalizada.</p>}
    <div className="bg-white rounded-2xl border border-[#E5E3DC] overflow-x-auto">
      <table className="mobile-data-table w-full text-left text-xs">
        <thead className="bg-[#F7F6F2] text-stone-600"><tr>
          <th className="p-4">Número de acta</th><th className="p-4">Vigencia anual</th><th className="p-4">Sesión vinculada</th><th className="p-4">Estado</th><th className="p-4 text-right">Acciones</th>
        </tr></thead>
        <tbody className="divide-y divide-[#E5E3DC]">{filteredMinutes.map((minute) => <tr key={minute.id} className="hover:bg-stone-50">
          <td data-label="Número de acta" className="p-4 font-bold text-[#14281D]">{minute.minute_number}</td>
          <td data-label="Vigencia anual" className="p-4">{minute.year}</td>
          <td data-label="Sesión vinculada" className="p-4">{sessions.find((session) => session.id === minute.session_id)?.session_number || minute.session_id}</td>
          <td data-label="Estado" className="p-4">{minute.is_approved ? <span className="inline-flex items-center gap-1 text-emerald-900"><Lock size={12} /> Aprobada</span> : <span className="text-amber-900">Borrador en revisión</span>}</td>
          <td data-label="Acciones" className="p-4"><div className="flex justify-end gap-2">
            <button onClick={() => setSelectedId(minute.id)} className="inline-flex gap-1 items-center rounded-xl border px-3 py-2"><Eye size={13} />Ver acta</button>
            <button disabled={isSaving} onClick={() => void handleDownload(minute)} className="inline-flex gap-1 items-center rounded-xl bg-[#14281D] text-white px-3 py-2"><Download size={13} />Descargar</button>
          </div></td>
        </tr>)}</tbody>
      </table>
    </div>
    <ResponsiveOverlay isOpen={Boolean(selectedMinute)} onClose={handleCloseMinute} label="Acta de comité">
      {selectedMinute && (<>
      <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-xl space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 pb-3 shrink-0">
          <h2 id="minute-dialog-title" className="font-bold text-[#14281D]">{selectedMinute.minute_number}</h2>
          <button type="button" aria-label="Cerrar acta" disabled={isSaving} onClick={handleCloseMinute} className="rounded-xl p-2 hover:bg-stone-100"><X size={18} /></button>
        </div>
        <div className="overflow-y-auto pr-1"><MinuteWorkspace minuteId={selectedMinute.id} canManage={canManage} onDirtyChange={setHasUnsavedChanges} /></div>
      </div>
    </>)}
    </ResponsiveOverlay>
    {decisionDialog}
  </div>;
}
