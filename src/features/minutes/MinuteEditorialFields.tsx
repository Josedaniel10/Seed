import { useFieldArray, useFormContext } from 'react-hook-form';
import { useUserStore } from '../users/userStore.ts';
import type { MinuteEditorial } from './minuteContent.ts';

const inputClass = 'w-full rounded-xl border border-stone-300 bg-white p-2.5 text-sm disabled:bg-stone-50';

export function MinuteEditorialFields() {
  const { register, control, watch, setValue } = useFormContext<MinuteEditorial>();
  const commitments = useFieldArray({ control, name: 'commitments' });
  const signatories = useFieldArray({ control, name: 'signatories' });
  const rows = watch('commitments');
  const users = useUserStore((state) => state.users);
  return <>
    <section className="space-y-3" aria-label="Compromisos y responsables">
      <h3 className="text-base font-bold text-[#14281D]">Compromisos y responsables</h3>
      {!commitments.fields.length && <p className="text-stone-500">Sin compromisos registrados.</p>}
      {commitments.fields.map((field, index) => <fieldset key={field.id} className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-3">
        <legend className="px-1 font-semibold">Compromiso {index + 1}</legend>
        <label className="block">Acción<textarea {...register(`commitments.${index}.action`)} maxLength={4000} rows={2} className={inputClass} /></label>
        <label className="block">Asignar a una persona registrada
          <select {...register(`commitments.${index}.responsibleUserId`)} className={inputClass} onChange={(event) => {
            const person = users.find((entry) => entry.id === event.target.value);
            setValue(`commitments.${index}.responsibleUserId`, event.target.value, { shouldDirty: true });
            setValue(`commitments.${index}.responsible`, person?.full_name ?? '', { shouldDirty: true });
          }}>
            <option value="">Otra persona o dependencia</option>
            {rows[index]?.responsibleUserId && !users.some((person) => person.id === rows[index].responsibleUserId) &&
              <option value={rows[index].responsibleUserId}>{rows[index].responsible}</option>}
            {users.filter((person) => person.is_active || person.id === rows[index]?.responsibleUserId).map((person) => <option key={person.id} value={person.id}>{person.full_name}</option>)}
          </select>
        </label>
        <label className="block">Nombre del responsable o dependencia
          <input {...register(`commitments.${index}.responsible`)} readOnly={Boolean(rows[index]?.responsibleUserId)} maxLength={300} className={inputClass} />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>Plazo<select {...register(`commitments.${index}.deadlineType`)} className={inputClass}>
            <option value="pending">Por definir</option><option value="date">Fecha específica</option><option value="next_session">Próxima sesión</option>
            {rows[index]?.deadlineType === 'legacy' && <option value="legacy">Plazo del borrador anterior</option>}
          </select></label>
          {rows[index]?.deadlineType === 'date' && <label>Fecha límite<input type="date" {...register(`commitments.${index}.deadline`)} className={inputClass} /></label>}
          {rows[index]?.deadlineType === 'legacy' && <label>Plazo anterior<input {...register(`commitments.${index}.deadline`)} readOnly className={inputClass} /></label>}
        </div>
        <button type="button" onClick={() => commitments.remove(index)} className="text-rose-800 underline">Eliminar compromiso {index + 1}</button>
      </fieldset>)}
      <button type="button" disabled={commitments.fields.length >= 100} onClick={() => commitments.append({ action: '', responsible: '', responsibleUserId: '', deadlineType: 'pending', deadline: '' })}
        className="rounded-xl border border-stone-300 px-4 py-2">Añadir compromiso</button>
    </section>
    <section className="space-y-3" aria-label="Firmantes">
      <h3 className="text-base font-bold text-[#14281D]">Firmantes</h3>
      {signatories.fields.map((field, index) => <fieldset key={field.id} className="rounded-xl border border-stone-200 p-4 space-y-3">
        <legend className="font-semibold px-1">Firmante {index + 1}</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label>Nombre completo<input {...register(`signatories.${index}.name`)} maxLength={150} className={inputClass} /></label>
          <label>Cargo en el acta<input {...register(`signatories.${index}.role`)} maxLength={150} className={inputClass} /></label>
        </div>
        <button type="button" onClick={() => signatories.remove(index)} className="text-rose-800 underline">Eliminar firmante {index + 1}</button>
      </fieldset>)}
      <button type="button" disabled={signatories.fields.length >= 12} onClick={() => signatories.append({ name: '', role: '' })}
        className="rounded-xl border border-stone-300 px-4 py-2">Añadir firmante</button>
    </section>
  </>;
}
