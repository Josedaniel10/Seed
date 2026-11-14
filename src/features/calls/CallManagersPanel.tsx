import { useRef, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { PlusCircle, Users, Trash2 } from 'lucide-react';
import type { Profile } from '../../types/database.ts';
import { Modal } from '../../components/ui/Modal.tsx';
import { useDecisionConfirmation } from '../../hooks/useDecisionConfirmation.tsx';

export interface CallManager {
  user_id: string;
  faculty: string;
  designation: string;
}
interface Props {
  managers: CallManager[];
  users: Profile[];
  faculties: string[];
  onAssign: (manager: CallManager) => Promise<void>;
  onRemove: (manager: CallManager) => Promise<void>;
}
const field = 'mt-1.5 w-full rounded-xl border border-[#E5E3DC] p-3 text-sm bg-white focus:outline-2 focus:outline-lime-700';
const primary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#14281D] px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 cursor-pointer';

export function CallManagersPanel({ managers, users, faculties, onAssign, onRemove }: Props): ReactElement {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  const { requestDecision, decisionDialog } = useDecisionConfirmation('call-managers');
  const activeUsers = users.filter((user) => user.is_active);
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); if (saving.current) return;
    const data = new FormData(event.currentTarget);
    const manager = { user_id: String(data.get('user_id') ?? ''), faculty: String(data.get('faculty') ?? ''), designation: String(data.get('designation') ?? '') };
    if (!manager.user_id || !manager.faculty) { setError('Selecciona una persona y una facultad o área.'); return; }
    saving.current = true; setBusy(true); setError('');
    try { await onAssign(manager); setOpen(false); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo asignar el responsable.'); }
    finally { saving.current = false; setBusy(false); }
  };
  const remove = (manager: CallManager): void => {
    requestDecision({ title: 'Retirar responsable', target: users.find((user) => user.id === manager.user_id)?.full_name ?? manager.user_id,
      details: [{ label: 'Facultad o área', value: manager.faculty }], consequence: 'Esta persona dejará de gestionar las convocatorias de esta facultad o área. Las convocatorias existentes se conservarán.',
      confirmLabel: 'Retirar responsable', intent: 'warning' }, () => onRemove(manager));
  };
  return <section aria-labelledby="call-managers-title" className="space-y-4">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div><h2 id="call-managers-title" className="text-base font-bold text-[#14281D]">Responsables por facultad o área</h2>
        <p className="text-xs text-stone-500 mt-1">Administra quién puede crear y gestionar convocatorias en cada área.</p></div>
      <button type="button" onClick={() => { setError(''); setOpen(true); }} disabled={!faculties.length || !activeUsers.length} className={`${primary} shrink-0`}><PlusCircle size={15} /> Asignar responsable</button>
    </div>
    {managers.length ? <div className="rounded-2xl border border-[#E5E3DC] bg-white overflow-x-auto">
      <table className="w-full text-left text-xs"><thead className="bg-[#F7F6F2] text-stone-500"><tr><th className="px-4 py-3 font-semibold">Responsable</th><th className="px-4 py-3 font-semibold">Facultad o área</th><th className="px-4 py-3 font-semibold">Cargo</th><th className="px-4 py-3 font-semibold text-right">Acciones</th></tr></thead>
        <tbody className="divide-y divide-[#E5E3DC]">{[...managers].sort((a, b) => a.faculty.localeCompare(b.faculty, 'es')).map((manager) => {
          const name = users.find((user) => user.id === manager.user_id)?.full_name ?? manager.user_id;
          return <tr key={`${manager.user_id}:${manager.faculty}`}><td className="px-4 py-4 font-semibold text-[#14281D]">{name}</td><td className="px-4 py-4 text-stone-600">{manager.faculty}</td><td className="px-4 py-4 text-stone-600">{manager.designation === 'decano' ? 'Decano' : 'Líder de investigación'}</td>
            <td className="px-4 py-3 text-right"><button type="button" aria-label={`Retirar a ${name} de ${manager.faculty}`} onClick={() => remove(manager)} className="inline-flex items-center gap-1.5 rounded-lg px-2 py-2 text-stone-500 hover:bg-red-50 hover:text-red-700 cursor-pointer"><Trash2 size={14} /> Retirar</button></td></tr>;
        })}</tbody></table>
    </div> : <div className="rounded-2xl border border-dashed border-[#E5E3DC] bg-white px-6 py-12 text-center space-y-2"><Users size={32} className="mx-auto text-stone-300" /><h3 className="font-bold text-sm">Sin responsables asignados</h3><p className="text-xs text-stone-500">Asigna una persona para delegar la gestión de una facultad o área.</p></div>}
    {(!faculties.length || !activeUsers.length) && <p className="text-xs text-amber-700">Para asignar responsables debe haber usuarios activos y facultades registradas.</p>}
    <Modal isOpen={open} onClose={() => setOpen(false)} isDismissible={!busy} title="Asignar responsable" subtitle="Permisos de gestión por facultad o área" maxWidth="md">
      {open && <form onSubmit={(event) => void submit(event)} className="space-y-4">
        <p className="text-xs text-stone-500">Selecciona quién gestionará las convocatorias y el área a su cargo.</p>
        <fieldset disabled={busy} className="space-y-4">
          <label className="block font-semibold">Responsable<select name="user_id" required defaultValue="" className={field}><option value="" disabled>Selecciona una persona</option>{activeUsers.map((user) => <option key={user.id} value={user.id}>{user.full_name}</option>)}</select></label>
          <label className="block font-semibold">Facultad o área<select name="faculty" required defaultValue="" className={field}><option value="" disabled>Selecciona una facultad o área</option>{faculties.map((faculty) => <option key={faculty}>{faculty}</option>)}</select></label>
          <label className="block font-semibold">Cargo<select name="designation" className={field}><option value="decano">Decano</option><option value="lider">Líder de investigación</option></select></label>
        </fieldset>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 border-t border-[#E5E3DC] pt-4"><button type="button" disabled={busy} onClick={() => setOpen(false)} className="rounded-xl px-4 py-2.5 font-semibold text-stone-500 cursor-pointer">Cancelar</button><button type="submit" disabled={busy} className={primary}>{busy ? 'Guardando…' : 'Guardar responsable'}</button></div>
      </form>}
    </Modal>
    {decisionDialog}
  </section>;
}
