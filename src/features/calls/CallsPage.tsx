import { useState } from 'react';
import type { ReactElement, FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { PlusCircle, CalendarDays } from 'lucide-react';
import { FloatingAlert } from '../../components/ui/FloatingAlert.tsx';
import { CallEditor } from './CallEditor.tsx';
import type { CallDraftInput } from './CallEditor.tsx';
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
  const [editor, setEditor] = useState<{ call: FundingCall | null } | null>(null);
  const [success, setSuccess] = useState('');
  const openEditor = (call: FundingCall | null = null): void => {
    setError(''); setSuccess(''); setEditor({ call });
  };
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
  const create = async (input: CallDraftInput): Promise<void> => {
    const { error: failure } = await callsClient().rpc('create_funding_call', { p_data: input });
    if (failure) throw new Error(failure.message);
    await refresh(); setEditor(null);
    setSuccess('Borrador guardado. Revisa la convocatoria en el listado y pulsa Publicar cuando esté lista.');
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
  if (editor) return <CallEditor call={editor.call} faculties={allowed} types={types} onSave={create} onCancel={() => setEditor(null)} />;
  return <div className="space-y-6">
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E3DC] pb-4">
      <div>
      <h1 className="mobile-section-title text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">Convocatorias de investigación</h1>
      <p className="text-xs text-stone-500 mt-0.5">Consulta oportunidades de financiamiento y sus requisitos. Postularse está sujeto a evaluación y no garantiza recursos.</p>
      </div>
      {allowed.length > 0 && <button type="button" onClick={() => openEditor()} className="inline-flex shrink-0 items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"><PlusCircle size={15} /> Nueva convocatoria</button>}
    </header>
    <FloatingAlert message={success} tone="success" onDismiss={() => setSuccess('')} />
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
        {call.status === 'draft' && <><button className="underline" onClick={() => openEditor(call)}>Editar borrador</button><button className={button} onClick={() => changeStatus(call, 'published')}>Publicar</button></>}
        {call.status === 'published' && <button className={button} onClick={() => changeStatus(call, 'closed')}>Cerrar recepción</button>}
        {['draft', 'published'].includes(call.status) && <button className="underline" onClick={() => changeStatus(call, 'cancelled')}>Cancelar convocatoria</button>}
      </div>}
    </article>)}</div>
    {calls.isSuccess && !calls.data.length && <section className="rounded-2xl border border-[#E5E3DC] bg-white px-6 py-12 text-center space-y-3">
      <CalendarDays size={36} className="mx-auto text-stone-300" aria-hidden="true" />
      <h2 className="text-sm font-bold text-[#14281D]">Aún no hay convocatorias</h2>
      <p className="text-xs text-stone-500 max-w-md mx-auto">{allowed.length ? 'Crea la primera convocatoria. Te guiaremos para definir los requisitos, participantes y fechas antes de publicarla.' : 'Cuando se publique una convocatoria, podrás consultar aquí sus requisitos y fechas. Mientras tanto, puedes solicitar aval académico.'}</p>
      {allowed.length > 0 && <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-[#14281D] px-4 py-2.5 text-xs font-bold text-white cursor-pointer" onClick={() => openEditor()}><PlusCircle size={15} /> Crear primera convocatoria</button>}
    </section>}
    {(calls.data ?? []).some((call) => (admin || allowed.includes(call.faculty)) && ['draft', 'published'].includes(call.status)) && <section className="rounded-2xl border border-[#E5E3DC] bg-white p-5 space-y-2">
      <h2 className="text-sm font-bold">Cierre o cancelación</h2>
      <p className="text-xs text-stone-500">Para cerrar o cancelar una convocatoria del listado, indica primero el motivo.</p>
      <label className="block text-xs font-semibold">Motivo<input className={field} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
    </section>}
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
