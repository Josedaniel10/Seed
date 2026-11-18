import { getUserError } from '../../lib/userMessages.ts';
import { StoredCallCover } from './CallCover.tsx';
import { uploadCallCover } from './coverFiles.ts';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { PlusCircle, CalendarDays, Users, FileText } from 'lucide-react';
import { Modal } from '../../components/ui/Modal.tsx';
import { CallManagersPanel } from './CallManagersPanel.tsx';
import type { CallManager } from './CallManagersPanel.tsx';
import { FloatingAlert } from '../../components/ui/FloatingAlert.tsx';
import { CallEditor } from './CallEditor.tsx';
import type { CallDraftInput } from './CallEditor.tsx';
import { useSessionStore } from '../../stores/session.store.ts';
import { useCatalogStore } from '../catalog/catalogStore.ts';
import { useGroupsStore } from '../groups/groupsStore.ts';
import { useUserStore } from '../users/userStore.ts';
import { useDecisionConfirmation } from '../../hooks/useDecisionConfirmation.tsx';
import { callsClient, formatCallDate, isCallOpen, managerSchema, matchesFundingApplicant, useCalls } from './callsApi.ts';
import { useFundingApplicant } from './useFundingApplicant.ts';
import { roleMatches } from '../../lib/permisos.ts';
import type { FundingCall } from './callsApi.ts';

const button = 'inline-flex items-center justify-center gap-2 rounded-xl bg-[#14281D] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#1E3A2B] disabled:opacity-50 cursor-pointer';
const secondary = 'inline-flex items-center justify-center rounded-xl border border-[#E5E3DC] px-3 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50 cursor-pointer';

export function CallsPage(): ReactElement {
  const user = useSessionStore((s) => s.user);
  const queryClient = useQueryClient();
  const calls = useCalls();
  const applicant = useFundingApplicant();
  const groups = useGroupsStore((s) => s.groups);
  const types = useCatalogStore((s) => s.types);
  const users = useUserStore((s) => s.users);
  const admin = user?.roles.includes('admin') ?? false;
  const managers = useQuery({ queryKey: ['call-managers', user?.id], queryFn: async () => {
    const { data, error } = await callsClient().from('funding_call_managers').select('*');
    if (error) throw new Error(getUserError(error));
    return z.array(managerSchema).parse(data);
  } });
  const faculties = [...new Set(groups.map((g) => g.faculty))];
  const allowed = admin ? faculties : [...new Set((managers.data ?? []).filter((m) => m.user_id === user?.id).map((m) => m.faculty))];
  const [editor, setEditor] = useState<{ call: FundingCall | null } | null>(null);
  const [success, setSuccess] = useState('');
  const openEditor = (call: FundingCall | null = null): void => {
    setSuccess(''); setEditor({ call });
  };
  const [params, setParams] = useSearchParams();
  const managersView = admin && params.get('vista') === 'responsables';
  const showDetail = (id: string | null): void => {
    const next = new URLSearchParams(params);
    if (id) next.set('convocatoria', id); else next.delete('convocatoria');
    setParams(next);
  };
  const [statusAction, setStatusAction] = useState<{ call: FundingCall; status: 'closed' | 'cancelled' } | null>(null);
  const [reason, setReason] = useState('');
  const { requestDecision, decisionDialog, isDecisionOpen } = useDecisionConfirmation(`calls:${user?.id}`);
  const refresh = async () => { await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['funding-calls'] }),
    queryClient.invalidateQueries({ queryKey: ['call-managers'] }),
  ]); };
  const changeStatus = (call: FundingCall, status: string, explanation = ''): void => {
    if (status !== 'published' && !explanation.trim()) return;
    requestDecision({ title: 'Confirmar convocatoria', target: call.title, confirmLabel: status === 'published' ? 'Publicar convocatoria' : 'Registrar cambio',
      details: [{ label: 'Estado solicitado', value: status === 'published' ? 'Publicada' : status === 'closed' ? 'Cerrada' : 'Cancelada' }, { label: 'Motivo', value: explanation || 'Publicación' }],
      consequence: 'Se actualizará la recepción de postulaciones. Las solicitudes ya radicadas conservarán su historial.',
    }, async () => {
      const { error: failure } = await callsClient().rpc('change_funding_call_status', { p_id: call.id, p_status: status, p_reason: explanation });
      if (failure) throw new Error(getUserError(failure));
      await refresh(); setReason(''); setStatusAction(null);
      setSuccess('El estado de la convocatoria se actualizó correctamente.');
    });
  };
  const create = async (input: CallDraftInput): Promise<void> => {
    const { cover_file, ...data } = input;
    const cover_image_path = cover_file ? await uploadCallCover(cover_file) : data.cover_image_path;
    const { error: failure } = await callsClient().rpc('create_funding_call', { p_data: { ...data, cover_image_path } });
    if (failure) throw new Error(getUserError(failure));
    await refresh(); setEditor(null);
    setSuccess('Borrador guardado. Revisa la convocatoria en el listado y pulsa Publicar cuando esté lista.');
  };
  const assign = async (manager: CallManager): Promise<void> => {
    const { error: failure } = await callsClient().from('funding_call_managers').upsert(manager);
    if (failure) throw new Error(getUserError(failure));
    await refresh(); setSuccess('Responsable asignado correctamente.');
  };
  const remove = async (manager: CallManager): Promise<void> => {
    const { error: failure } = await callsClient().from('funding_call_managers').delete().eq('user_id', manager.user_id).eq('faculty', manager.faculty);
    if (failure) throw new Error(getUserError(failure));
    await refresh(); setSuccess('Se retiró el permiso de gestión.');
  };
  const researcher = roleMatches(user?.activeRole, 'researcher');
  const visibleCalls = (calls.data ?? []).filter(call => !researcher || admin || allowed.includes(call.faculty)
    || matchesFundingApplicant(call, applicant));
  const detail = visibleCalls.find((call) => call.id === params.get('convocatoria'));
  const sections = [
    { title: 'En preparación', description: 'Borradores que puedes revisar y publicar.', items: visibleCalls.filter((call) => call.status === 'draft') },
    { title: 'Convocatorias vigentes', description: 'Recepción abierta o programada para una próxima fecha.', items: visibleCalls.filter((call) => call.status === 'published' && Date.now() < Date.parse(call.closes_at)) },
    { title: 'Historial', description: 'Convocatorias finalizadas, cerradas o canceladas.', items: visibleCalls.filter((call) => call.status === 'closed' || call.status === 'cancelled' || (call.status === 'published' && Date.now() >= Date.parse(call.closes_at))) },
  ];
  const startStatusChange = (call: FundingCall, status: 'closed' | 'cancelled'): void => {
    setReason(''); setStatusAction({ call, status });
  };
  if (editor) return <CallEditor call={editor.call} faculties={allowed} types={types} onSave={create} onCancel={() => setEditor(null)} />;
  return <div className="space-y-6">
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E3DC] pb-4">
      <div>
      <h1 className="mobile-section-title text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">Convocatorias de investigación</h1>
      <p className="text-xs text-stone-500 mt-0.5">Consulta oportunidades de financiamiento y sus requisitos. Postularse está sujeto a evaluación y no garantiza recursos.</p>
      </div>
      {!managersView && allowed.length > 0 && <button type="button" onClick={() => openEditor()} className="inline-flex shrink-0 items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"><PlusCircle size={15} /> Nueva convocatoria</button>}
    </header>
    <FloatingAlert message={success} tone="success" onDismiss={() => setSuccess('')} />
    {admin && <nav aria-label="Secciones de convocatorias" className="flex gap-1 border-b border-[#E5E3DC]">
      {[{ path: '/convocatorias', label: 'Convocatorias', icon: FileText, active: !managersView }, { path: '/convocatorias?vista=responsables', label: 'Responsables', icon: Users, active: managersView }].map((item) => <Link key={item.path} to={item.path} aria-current={item.active ? 'page' : undefined} className={`inline-flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${item.active ? 'border-[#14281D] text-[#14281D]' : 'border-transparent text-stone-500 hover:text-[#14281D]'}`}><item.icon size={15} />{item.label}</Link>)}
    </nav>}
    {managersView ? <>
      {managers.isPending && <p role="status" className="text-xs text-stone-500">Cargando responsables…</p>}
      {managers.error && <p role="alert" className="text-xs text-red-700">No se pudieron consultar los responsables. <button className="underline cursor-pointer" onClick={() => void managers.refetch()}>Reintentar</button></p>}
      {managers.isSuccess && <CallManagersPanel key={user?.id} managers={managers.data} users={users} faculties={faculties} onAssign={assign} onRemove={remove} />}
    </> : <>
    {calls.isPending && <p role="status" className="text-xs text-stone-500">Cargando convocatorias…</p>}
    {calls.error && <p role="alert" className="text-xs text-red-700">{getUserError(calls.error, 'No pudimos consultar las convocatorias. Inténtalo nuevamente.')} <button className="underline cursor-pointer" onClick={() => void calls.refetch()}>Reintentar</button></p>}
    {managers.error && <p role="alert" className="text-xs text-red-700">{getUserError(managers.error, 'No pudimos comprobar tus permisos. Inténtalo nuevamente.')}</p>}
    {sections.filter((section) => section.items.length).map((section) => <section key={section.title} aria-label={section.title} className="space-y-3">
      <div><h2 className="text-sm font-bold text-[#14281D]">{section.title} <span className="ml-1 rounded-full bg-stone-200/60 px-2 py-0.5 text-[10px] text-stone-500">{section.items.length}</span></h2><p className="text-xs text-stone-500 mt-1">{section.description}</p></div>
      <div className="grid md:grid-cols-2 gap-4">{section.items.map((call) => <article key={call.id} className="flex flex-col rounded-2xl border border-[#E5E3DC] bg-white shadow-xs overflow-hidden">
        <StoredCallCover path={call.cover_image_path} icon_key={call.icon_key ?? 'megaphone'} accent_color={call.accent_color} />
        <div className="p-5 space-y-3 flex-1">
          <div className="flex items-start justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-stone-500">{call.faculty}</p><span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${isCallOpen(call) ? 'bg-lime-100 text-lime-800' : 'bg-stone-100 text-stone-600'}`}>{isCallOpen(call) ? 'Abierta' : call.status === 'published' ? (Date.now() < Date.parse(call.opens_at) ? 'Próximamente' : 'Finalizada') : { draft: 'Borrador', closed: 'Cerrada', cancelled: 'Cancelada' }[call.status]}</span></div>
          <h3 className="text-sm font-bold text-[#14281D] break-words">{call.title}</h3>
          <p className="flex items-start gap-2 text-xs text-stone-500"><CalendarDays size={14} className="shrink-0" />Cierra el {formatCallDate(call.closes_at)}</p>
          <button type="button" className="text-xs font-semibold text-[#14281D] underline underline-offset-4 cursor-pointer" onClick={() => showDetail(call.id)} aria-label={`Ver requisitos y detalle de ${call.title}`}>Ver requisitos y detalle</button>
        </div>
        {(admin || allowed.includes(call.faculty)) && ['draft', 'published'].includes(call.status) && <footer className="flex items-center justify-between gap-2 flex-wrap border-t border-[#E5E3DC] bg-stone-50/50 px-5 py-3">
          <div className="flex gap-2 flex-wrap">
            {call.status === 'draft' && <><button type="button" className={secondary} onClick={() => openEditor(call)}>Editar borrador</button><button type="button" className={button} onClick={() => changeStatus(call, 'published')}>Publicar</button></>}
            {call.status === 'published' && <button type="button" className={secondary} onClick={() => startStatusChange(call, 'closed')}>Cerrar recepción</button>}
          </div>
          <button type="button" className="py-2 text-xs text-stone-500 hover:text-red-700 cursor-pointer" onClick={() => startStatusChange(call, 'cancelled')}>Cancelar convocatoria</button>
        </footer>}
      </article>)}</div>
    </section>)}
    {calls.isSuccess && !visibleCalls.length && <section className="rounded-2xl border border-[#E5E3DC] bg-white px-6 py-12 text-center space-y-3">
      <CalendarDays size={36} className="mx-auto text-stone-300" aria-hidden="true" />
      <h2 className="text-sm font-bold text-[#14281D]">{researcher ? 'No hay convocatorias disponibles para tu perfil' : 'Aún no hay convocatorias'}</h2>
      <p className="text-xs text-stone-500 max-w-md mx-auto">{allowed.length ? 'Crea la primera convocatoria. Te guiaremos para definir los requisitos, participantes y fechas antes de publicarla.' : researcher && !applicant.groupId ? 'Para consultar oportunidades de financiamiento necesitas un grupo de investigación activo asignado en tu perfil. Contacta al administrador para actualizarlo.' : 'Cuando se publique una convocatoria compatible con tu perfil, podrás consultar aquí sus requisitos y fechas. Mientras tanto, puedes solicitar aval académico.'}</p>
      {allowed.length > 0 && <button type="button" className="inline-flex items-center gap-2 rounded-xl bg-[#14281D] px-4 py-2.5 text-xs font-bold text-white cursor-pointer" onClick={() => openEditor()}><PlusCircle size={15} /> Crear primera convocatoria</button>}
    </section>}
    </>}
    <Modal key={`${user?.id}:${applicant.groupId}:${applicant.academicLink}`} isOpen={Boolean(detail) && !managersView} onClose={() => showDetail(null)} title="Detalle de convocatoria" maxWidth="2xl">
      {detail && <div className="space-y-4 text-sm"><StoredCallCover path={detail.cover_image_path} icon_key={detail.icon_key ?? 'megaphone'} accent_color={detail.accent_color} />
        <div><p className="text-xs text-stone-500">{detail.faculty}</p><h2 className="text-lg font-bold mt-1">{detail.title}</h2></div>
        <p className="whitespace-pre-wrap break-words text-stone-600">{detail.description}</p>
        <dl className="grid sm:grid-cols-2 gap-4 text-xs border-t border-[#E5E3DC] pt-4">
          <div><dt className="text-stone-500">Dirigida a</dt><dd className="font-semibold mt-1">{detail.audience === 'all' ? 'Todos los investigadores' : detail.audience === 'students' ? 'Estudiantes' : 'Docentes'}</dd></div>
          <div><dt className="text-stone-500">Tope por solicitud</dt><dd className="font-semibold mt-1">{detail.max_amount === null ? 'Sin tope individual definido' : `$ ${detail.max_amount.toLocaleString('es-CO')} COP`}</dd></div>
          <div><dt className="text-stone-500">Apertura (Colombia)</dt><dd className="font-semibold mt-1">{formatCallDate(detail.opens_at)}</dd></div>
          <div><dt className="text-stone-500">Cierre (Colombia)</dt><dd className="font-semibold mt-1">{formatCallDate(detail.closes_at)}</dd></div>
        </dl>
        <div className="border-t border-[#E5E3DC] pt-4"><h3 className="font-semibold text-xs">Tipos de solicitud admitidos</h3><ul className="mt-2 space-y-1 text-xs text-stone-600">{types.filter((type) => detail.type_ids.includes(type.id)).map((type) => <li key={type.id}>{type.name}</li>)}</ul></div>
        {isCallOpen(detail) && researcher && matchesFundingApplicant(detail, applicant) && <Link className={button} to={`/solicitudes/nueva?convocatoria=${detail.id}`}>Postularme</Link>}
      </div>}
    </Modal>
    <Modal isOpen={Boolean(statusAction)} onClose={() => setStatusAction(null)} isDismissible={!isDecisionOpen} title={statusAction?.status === 'closed' ? 'Cerrar recepción' : 'Cancelar convocatoria'} subtitle={statusAction?.call.title} maxWidth="md">
      {statusAction && <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); changeStatus(statusAction.call, statusAction.status, reason.trim()); }}>
        <p className="text-stone-500">{statusAction.status === 'closed' ? 'Se detendrá la recepción de nuevas postulaciones.' : 'La convocatoria dejará de recibir postulaciones.'} Las solicitudes ya radicadas conservarán su historial.</p>
        <label className="block font-semibold">Motivo<textarea name="reason" required value={reason} onChange={(event) => setReason(event.target.value)} disabled={isDecisionOpen} rows={3} className="mt-1.5 w-full rounded-xl border border-[#E5E3DC] p-3 font-normal" placeholder="Explica el motivo de este cambio…" /></label>
        <div className="flex justify-end gap-2 border-t border-[#E5E3DC] pt-4"><button type="button" className={secondary} disabled={isDecisionOpen} onClick={() => setStatusAction(null)}>Volver</button><button type="submit" disabled={!reason.trim() || isDecisionOpen} className={button}>Revisar cambio</button></div>
      </form>}
    </Modal>
    {decisionDialog}
  </div>;
}
