import { useState } from 'react';
import type { ReactElement, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useSessionStore } from '../../stores/session.store.ts';
import { useCatalogStore } from '../catalog/catalogStore.ts';
import { useGroupsStore } from '../groups/groupsStore.ts';
import { useUserStore } from '../users/userStore.ts';
import { useDecisionConfirmation } from '../../hooks/useDecisionConfirmation.tsx';
import { callsClient, formatCallDate, isCallOpen, managerSchema, useCalls } from './callsApi.ts';
import type { FundingCall } from './callsApi.ts';

const field = 'w-full rounded-xl border border-stone-300 p-3 text-sm bg-white';
const button = 'rounded-xl bg-[#14281D] px-4 py-2 text-sm text-white disabled:opacity-50';

export function CallsPage(): ReactElement {
  const user = useSessionStore((s) => s.user);
  const queryClient = useQueryClient();
  const calls = useCalls();
  const groups = useGroupsStore((s) => s.groups);
  const types = useCatalogStore((s) => s.types);
  const users = useUserStore((s) => s.users);
  const admin = user?.roles.includes('admin') ?? false;
  const managers = useQuery({ queryKey: ['call-managers', user?.id], queryFn: async () => {
    const { data, error } = await callsClient().from('funding_call_managers').select('*');
    if (error) throw new Error(error.message);
    return z.array(managerSchema).parse(data);
  } });
  const faculties = [...new Set(groups.map((g) => g.faculty))];
  const allowed = admin ? faculties : [...new Set((managers.data ?? []).filter((m) => m.user_id === user?.id).map((m) => m.faculty))];
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<FundingCall | null>(null);
  const [params] = useSearchParams();
  const [selected, setSelected] = useState<string | null>(params.get('convocatoria'));
  const [reason, setReason] = useState('');
  const { requestDecision, decisionDialog } = useDecisionConfirmation(`calls:${user?.id}`);
  const refresh = async () => { await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['funding-calls'] }),
    queryClient.invalidateQueries({ queryKey: ['call-managers'] }),
  ]); };
  const changeStatus = (call: FundingCall, status: string) => {
    const explanation = reason.trim();
    if (status !== 'published' && !explanation) { setError('Escriba el motivo del cierre o cancelación.'); return; }
    requestDecision({ title: 'Confirmar convocatoria', target: call.title, confirmLabel: status === 'published' ? 'Publicar convocatoria' : 'Registrar cambio',
      details: [{ label: 'Estado solicitado', value: status }, { label: 'Motivo', value: explanation || 'Publicación' }],
      consequence: 'Se actualizará la recepción de postulaciones. Las solicitudes ya radicadas conservarán su historial.',
    }, async () => {
      const { error: failure } = await callsClient().rpc('change_funding_call_status', { p_id: call.id, p_status: status, p_reason: explanation });
      if (failure) throw new Error(failure.message);
      await refresh(); setReason('');
    });
  };
  const create = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (busy) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true); setError('');
    try {
      const { error: failure } = await callsClient().rpc('create_funding_call', { p_data: {
        id: editing?.id,
        title: values.get('title'), description: values.get('description'), faculty: values.get('faculty'),
        audience: values.get('audience'), type_ids: values.getAll('type_ids'),
        opens_at: new Date(String(values.get('opens_at')) + '-05:00').toISOString(),
        closes_at: new Date(String(values.get('closes_at')) + '-05:00').toISOString(),
        max_amount: values.get('max_amount') ? Number(values.get('max_amount')) : null,
      } });
      if (failure) throw new Error(failure.message);
      await refresh(); form.reset(); setEditing(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo guardar.'); }
    finally { setBusy(false); }
  };
  const assign = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const values = new FormData(event.currentTarget); setError('');
    try {
      const { error: failure } = await callsClient().from('funding_call_managers').upsert({
        user_id: values.get('user_id'), faculty: values.get('faculty'), designation: values.get('designation'),
      });
      if (failure) throw new Error(failure.message);
      await refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'No se pudo asignar.'); }
  };
  const detail = calls.data?.find((c) => c.id === selected);
  return <div className="max-w-5xl mx-auto p-4 md:p-8 space-y-6">
    <header><h1 className="text-2xl font-bold text-[#14281D]">Convocatorias de investigación</h1>
      <p className="text-stone-600 mt-2">Consulta oportunidades de financiamiento y sus requisitos. Postularse está sujeto a evaluación y no garantiza recursos.</p></header>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {calls.isPending && <p role="status">Cargando convocatorias…</p>}
    {calls.error && <p role="alert">No se pudieron consultar las convocatorias: {calls.error.message} <button onClick={() => void calls.refetch()}>Reintentar</button></p>}
    {managers.error && <p role="alert">No se pudieron consultar los permisos de gestión: {managers.error.message}</p>}
    {detail && <section className="bg-white border rounded-2xl p-5 space-y-3">
      <button onClick={() => setSelected(null)} className="underline">Volver al listado</button>
      <h2 className="text-xl font-bold">{detail.title}</h2><p className="whitespace-pre-wrap">{detail.description}</p>
      <p>{detail.faculty} · Destinatarios: {detail.audience === 'all' ? 'Todos' : detail.audience === 'students' ? 'Estudiantes' : 'Docentes'}</p>
      <p>Apertura: {formatCallDate(detail.opens_at)} · Cierre: {formatCallDate(detail.closes_at)} (Colombia)</p>
      <p>Tope: {detail.max_amount === null ? 'Sin tope individual definido' : `$ ${detail.max_amount.toLocaleString('es-CO')} COP`}</p>
      <p>Trámites: {types.filter((t) => detail.type_ids.includes(t.id)).map((t) => t.name).join(', ')}</p>
      {isCallOpen(detail) && user?.roles.includes('researcher') && <Link className={button} to={`/solicitudes/nueva?convocatoria=${detail.id}`}>Postularme</Link>}
    </section>}
    <div className="grid md:grid-cols-2 gap-4">{(calls.data ?? []).map((call) => <article key={call.id} className="bg-white border rounded-2xl p-5 space-y-3">
      <p className="text-xs uppercase text-stone-500">{call.faculty} · {isCallOpen(call) ? 'Abierta' : call.status === 'published' ? (Date.now() < Date.parse(call.opens_at) ? 'Próximamente' : 'Finalizada') : { draft: 'Borrador', closed: 'Cerrada', cancelled: 'Cancelada' }[call.status]}</p>
      <h2 className="text-lg font-bold">{call.title}</h2><p>Cierra el {formatCallDate(call.closes_at)}</p>
      <button className="underline" onClick={() => setSelected(call.id)}>Ver requisitos y detalle</button>
      {(admin || allowed.includes(call.faculty)) && <div className="flex gap-2 flex-wrap">
        {call.status === 'draft' && <><button className="underline" onClick={() => setEditing(call)}>Editar borrador</button><button className={button} onClick={() => changeStatus(call, 'published')}>Publicar</button></>}
        {call.status === 'published' && <button className={button} onClick={() => changeStatus(call, 'closed')}>Cerrar recepción</button>}
        {['draft', 'published'].includes(call.status) && <button className="underline" onClick={() => changeStatus(call, 'cancelled')}>Cancelar convocatoria</button>}
      </div>}
    </article>)}</div>
    {calls.isSuccess && !calls.data.length && <p>No hay convocatorias publicadas. Puedes solicitar únicamente aval académico o conservar tu borrador.</p>}
    {allowed.length > 0 && <section className="border rounded-2xl p-5 bg-white space-y-4"><h2 className="text-lg font-bold">Gestión de convocatorias</h2>
      <label className="block">Motivo para cerrar o cancelar<input className={field} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
      <form key={editing?.id ?? 'new'} onSubmit={create} className="space-y-3"><h3 className="font-semibold">{editing ? 'Editar convocatoria en borrador' : 'Nueva convocatoria en borrador'}</h3>
        {editing && <button type="button" onClick={() => setEditing(null)} className="underline">Volver a crear una nueva</button>}
        <label className="block">Título<input name="title" defaultValue={editing?.title} required maxLength={200} className={field} /></label>
        <label className="block">Descripción y requisitos<textarea name="description" defaultValue={editing?.description} required minLength={20} className={field} rows={4} /></label>
        <label className="block">Facultad o área<select name="faculty" defaultValue={editing?.faculty} className={field}>{allowed.map((f) => <option key={f}>{f}</option>)}</select></label>
        <label className="block">Destinatarios<select name="audience" defaultValue={editing?.audience} className={field}><option value="all">Todos</option><option value="students">Estudiantes</option><option value="teachers">Docentes</option></select></label>
        <fieldset><legend>Tipos de solicitud admitidos (selecciona al menos uno)</legend>{types.filter((t) => t.is_active).map((t) => <label key={t.id} className="block"><input type="checkbox" name="type_ids" value={t.id} defaultChecked={editing?.type_ids.includes(t.id)} /> {t.name}</label>)}</fieldset>
        <label className="block">Apertura (hora de Colombia)<input type="datetime-local" name="opens_at" defaultValue={editing ? new Date(Date.parse(editing.opens_at) - 5 * 3600000).toISOString().slice(0, 16) : ''} required className={field} /></label>
        <label className="block">Cierre (hora de Colombia)<input type="datetime-local" name="closes_at" defaultValue={editing ? new Date(Date.parse(editing.closes_at) - 5 * 3600000).toISOString().slice(0, 16) : ''} required className={field} /></label>
        <label className="block">Tope por solicitud en COP (opcional)<input type="number" defaultValue={editing?.max_amount ?? ''} min="0.01" step="0.01" name="max_amount" className={field} /></label>
        <button disabled={busy} className={button}>{busy ? 'Guardando…' : 'Guardar borrador'}</button>
      </form></section>}
    {admin && <section className="border rounded-2xl p-5 bg-white space-y-3"><h2 className="font-bold">Responsables por facultad o área</h2>
      <form onSubmit={assign} className="space-y-3"><label className="block">Responsable<select required name="user_id" className={field}>{users.filter((u) => u.is_active).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}</select></label>
        <label className="block">Facultad o área<select name="faculty" required className={field}>{faculties.map((f) => <option key={f}>{f}</option>)}</select></label>
        <label className="block">Cargo<select name="designation" className={field}><option value="decano">Decano</option><option value="lider">Líder de investigación</option></select></label>
        <button className={button}>Asignar responsable</button></form>
      {(managers.data ?? []).map((m) => <div key={`${m.user_id}:${m.faculty}`} className="flex gap-3"><span>{users.find((u) => u.id === m.user_id)?.full_name ?? m.user_id} · {m.faculty} · {m.designation}</span>
        <button className="underline" onClick={async () => { const { error: failure } = await callsClient().from('funding_call_managers').delete().eq('user_id', m.user_id).eq('faculty', m.faculty); if (failure) setError(failure.message); else await refresh(); }}>Retirar permiso</button></div>)}
    </section>}
    {decisionDialog}
  </div>;
}
