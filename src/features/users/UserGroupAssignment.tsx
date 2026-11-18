import { useEffect, useId, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import type { Profile } from '../../types/database.ts';
import { Modal } from '../../components/ui/Modal.tsx';
import { useGroupsStore } from '../groups/groupsStore.ts';
import { useUserStore } from './userStore.ts';
import { useSessionStore } from '../../stores/session.store.ts';

interface UserGroupAssignmentProps {
  user: Profile;
  onClose: () => void;
  onSaved: () => void;
}

export function UserGroupAssignment({ user, onClose, onSaved }: UserGroupAssignmentProps): ReactElement {
  const groups = useGroupsStore(state => state.groups);
  const loading = useGroupsStore(state => state.isLoading);
  const loadError = useGroupsStore(state => state.error);
  const [groupId, setGroupId] = useState(user.research_group_id ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savingRef = useRef(false);
  const fieldId = useId();
  const helpId = useId();
  const activeGroups = groups.filter(group => group.is_active);
  useEffect(() => { void useGroupsStore.getState().loadFromSupabase(); }, []);

  const handleSave = async () => {
    if (savingRef.current) return;
    if (groupId && !activeGroups.some(group => group.id === groupId)) {
      setError('Selecciona un grupo activo o retira la vinculación.'); return;
    }
    savingRef.current = true; setSaving(true); setError(null);
    try {
      const result = await useUserStore.getState().assignResearchGroup(user.id, groupId || null);
      if (!result.success) { setError(result.error ?? 'No se pudo guardar la asignación.'); return; }
      if (useSessionStore.getState().user?.id === user.id) await useSessionStore.getState().initializeSession();
      onSaved();
    } finally { savingRef.current = false; setSaving(false); }
  };

  return <Modal isOpen title="Asignar grupo de investigación" subtitle={user.email} onClose={onClose} isDismissible={!saving}>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); void handleSave(); }}>
      <p className="text-sm font-semibold">{user.full_name}</p>
      <label htmlFor={fieldId} className="block font-semibold">Grupo de investigación</label>
      <select id={fieldId} name="research_group_id" value={groupId} disabled={saving || loading}
        aria-describedby={helpId} onChange={event => { setGroupId(event.target.value); setError(null); }}
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm">
        <option value="">Sin grupo asignado</option>
        {groupId && !activeGroups.some(group => group.id === groupId) && <option value={groupId} disabled>Grupo anterior inactivo o no disponible</option>}
        {activeGroups.map(group => <option key={group.id} value={group.id}>[{group.code}] {group.name}</option>)}
      </select>
      <p id={helpId} className="text-xs text-stone-600">Esta vinculación determina las convocatorias disponibles y el grupo de las nuevas solicitudes. Las solicitudes ya radicadas conservan su grupo original.</p>
      {loading && <p role="status">Consultando grupos…</p>}
      {loadError && <p role="alert">No se pudieron actualizar los grupos. <button type="button" className="underline" onClick={() => { void useGroupsStore.getState().loadFromSupabase(); }}>Reintentar</button></p>}
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <div className="flex justify-end gap-3">
        <button type="button" disabled={saving} onClick={onClose} className="rounded-lg border border-stone-300 px-3 py-2">Cancelar</button>
        <button type="submit" disabled={saving || loading} className="rounded-lg bg-[#14281D] px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar asignación'}</button>
      </div>
    </form>
  </Modal>;
}
