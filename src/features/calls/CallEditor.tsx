import { getUserError } from '../../lib/userMessages.ts';
import { IdentityPicker } from '../../components/ui/IdentityPicker.tsx';
import { IdentityIcon } from '../../components/ui/IdentityIcon.tsx';
import { getTypeAppearance } from '../catalog/typeAppearance.ts';
import { CallCover, StoredCallCover } from './CallCover.tsx';
import { validateCoverFile } from './coverFiles.ts';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactElement } from 'react';
import { ArrowLeft, ArrowRight, Check, CalendarDays, Save } from 'lucide-react';
import type { ApplicationType } from '../../types/database.ts';
import { useDecisionConfirmation } from '../../hooks/useDecisionConfirmation.tsx';
import { formatCallDate } from './callsApi.ts';
import type { FundingCall } from './callsApi.ts';

export interface CallDraftInput {
  id?: string;
  icon_key: string;
  accent_color: string;
  cover_image_path: string | null;
  cover_file?: File | null;
  title: string;
  description: string;
  faculty: string;
  audience: FundingCall['audience'];
  type_ids: string[];
  opens_at: string;
  closes_at: string;
  max_amount: number | null;
}
interface Props {
  call: FundingCall | null;
  faculties: string[];
  types: ApplicationType[];
  onSave: (input: CallDraftInput) => Promise<void>;
  onCancel: () => void;
}
const steps = ['Información', 'Participantes', 'Fechas y monto', 'Revisión'];
const field = 'mt-1.5 w-full rounded-xl border border-[#E5E3DC] bg-white px-3 py-2.5 text-sm text-stone-800 outline-none focus:border-[#4d7c0f] focus:ring-2 focus:ring-lime-100 disabled:opacity-60';
const primary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#14281D] px-5 text-xs font-bold text-white hover:bg-[#1E3A2B] disabled:opacity-50 cursor-pointer';
const secondary = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#E5E3DC] px-4 text-xs font-semibold text-stone-600 hover:bg-stone-50 disabled:opacity-50 cursor-pointer';
const audienceLabels = { all: 'Todos los investigadores', students: 'Estudiantes', teachers: 'Docentes' };
function localDate(value?: string): string {
  return value ? new Date(Date.parse(value) - 5 * 3600000).toISOString().slice(0, 16) : '';
}

export function CallEditor({ call, faculties, types, onSave, onCancel }: Props): ReactElement {
  const [values, setValues] = useState(() => ({ icon_key: call?.icon_key ?? 'megaphone', accent_color: call?.accent_color ?? 'forest', cover_image_path: call?.cover_image_path ?? null, title: call?.title ?? '', description: call?.description ?? '',
    faculty: call?.faculty ?? faculties[0] ?? '', audience: call?.audience ?? 'all',
    type_ids: call?.type_ids ?? [], opens_at: localDate(call?.opens_at), closes_at: localDate(call?.closes_at),
    max_amount: call?.max_amount?.toString() ?? '' }));
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!coverFile) { setPreviewUrl(null); return; }
    const url = URL.createObjectURL(coverFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [coverFile]);
  const [step, setStep] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const { requestDecision, decisionDialog } = useDecisionConfirmation(`call-editor:${call?.id ?? 'new'}`);
  useEffect(() => { heading.current?.focus(); }, [step]);
  const update = <K extends keyof typeof values>(key: K, value: typeof values[K]): void => {
    setValues((previous) => ({ ...previous, [key]: value })); setDirty(true); setError('');
  };
  const cancel = (): void => {
    if (busy) return;
    if (!dirty) { onCancel(); return; }
    requestDecision({ title: '¿Salir sin guardar?', target: values.title || 'Nueva convocatoria',
      details: [], consequence: 'Se perderán los cambios de este formulario.', confirmLabel: 'Salir sin guardar' }, onCancel);
  };
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault(); if (saving.current) return;
    if (step === 0 && (!values.title.trim() || values.description.trim().length < 20)) {
      setError('Escribe un título y una descripción de al menos 20 caracteres.'); return;
    }
    if (step === 1 && (!faculties.includes(values.faculty) || !values.type_ids.length)) {
      setError('Selecciona una facultad y al menos un tipo de solicitud.'); return;
    }
    if (step === 2 && (!values.opens_at || !values.closes_at || values.closes_at <= values.opens_at)) {
      setError('La fecha y hora de cierre deben ser posteriores a la apertura.'); return;
    }
    if (step < 3) { setError(''); setStep(step + 1); return; }
    saving.current = true; setBusy(true); setError('');
    try {
      await onSave({ id: call?.id, icon_key: values.icon_key, accent_color: values.accent_color,
        cover_image_path: values.cover_image_path, cover_file: coverFile, title: values.title.trim(), description: values.description.trim(),
        faculty: values.faculty, audience: values.audience, type_ids: values.type_ids,
        opens_at: new Date(values.opens_at + '-05:00').toISOString(),
        closes_at: new Date(values.closes_at + '-05:00').toISOString(),
        max_amount: values.max_amount ? Number(values.max_amount) : null });
    } catch (failure) { setError(getUserError(failure, 'No se pudo guardar el borrador. Intenta de nuevo.')); }
    finally { saving.current = false; setBusy(false); }
  };
  const availableTypes = types.filter((type) => type.is_active || values.type_ids.includes(type.id));
  return <div className="space-y-6">
    <header className="border-b border-[#E5E3DC] pb-4 space-y-3">
      <button type="button" onClick={cancel} disabled={busy} className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-[#14281D] disabled:opacity-50 cursor-pointer"><ArrowLeft size={14} /> Volver a convocatorias</button>
      <div><h1 className="mobile-section-title text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">{call ? 'Editar convocatoria' : 'Nueva convocatoria'}</h1>
        <p className="text-xs text-stone-500 mt-0.5">Prepara la convocatoria y revisa sus condiciones antes de guardarla como borrador.</p></div>
    </header>
    <ol aria-label="Pasos para crear la convocatoria" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {steps.map((label, index) => <li key={label} aria-current={index === step ? 'step' : undefined} className={`flex items-center gap-2 text-xs ${index === step ? 'text-[#14281D] font-bold' : 'text-stone-500'}`}>
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${index <= step ? 'bg-[#14281D] text-white' : 'border border-[#E5E3DC] bg-white'}`}>{index < step ? <Check size={13} aria-hidden="true" /> : index + 1}</span>{label}
      </li>)}
    </ol>
    <form onSubmit={(event) => void submit(event)} className="rounded-2xl border border-[#E5E3DC] bg-white shadow-xs overflow-hidden">
      <fieldset disabled={busy} className="p-5 sm:p-6 space-y-5">
        <div><p className="text-[10px] uppercase tracking-wider text-stone-400 font-bold">Paso {step + 1} de 4</p>
          <h2 ref={heading} tabIndex={-1} className="text-base font-bold text-[#14281D] mt-1 outline-none">{['Presenta la oportunidad', 'Define quiénes pueden postularse', 'Establece el periodo y el financiamiento', 'Revisa tu convocatoria'][step]}</h2>
          <p className="text-xs text-stone-500 mt-1">{['Explica qué ofrece la convocatoria y qué deben preparar los participantes.', 'Delimita el área, los destinatarios y los trámites que se admitirán.', 'Las fechas se registran en la hora de Colombia (UTC−5).', 'Guardar no publica la convocatoria. Podrás editarla y publicarla después desde el listado.'][step]}</p></div>
        {step === 0 && <>
          <label className="block text-xs font-semibold">Nombre de la convocatoria<input name="title" required maxLength={200} value={values.title} onChange={(e) => update('title', e.target.value)} className={field} placeholder="Ej. Apoyo a proyectos de investigación 2027" /></label>
          <label className="block text-xs font-semibold">Descripción y requisitos<textarea name="description" required minLength={20} rows={6} value={values.description} onChange={(e) => update('description', e.target.value)} className={field} placeholder="Describe el objetivo, los requisitos para participar y los criterios de evaluación." /><span className="block text-[11px] font-normal text-stone-500 mt-1">Incluye la información que necesitarán los solicitantes. Mínimo 20 caracteres.</span></label>
          <section className="space-y-4 border-t border-[#E5E3DC] pt-5" aria-labelledby="call-appearance-title">
            <div><h3 id="call-appearance-title" className="font-bold text-sm">Apariencia de la tarjeta</h3><p className="text-xs text-stone-500 mt-1">Añade una portada o elige un icono y un color para identificar esta oportunidad.</p></div>
            <div className="grid lg:grid-cols-2 gap-6 items-start">
              <div className="space-y-4">
                <label className="block text-sm font-semibold">Imagen de portada (opcional)
                  <input type="file" name="cover" accept="image/jpeg,image/png,image/webp" aria-describedby="call-cover-help" className="mt-2 block w-full min-w-0 rounded-xl border border-[#E5E3DC] p-3 text-xs"
                    onChange={(event) => {
                      const file = event.target.files?.[0]; event.target.value = '';
                      if (!file) return;
                      try { validateCoverFile(file); setCoverFile(file); setDirty(true); setError(''); }
                      catch (failure) { setError(getUserError(failure, 'Imagen inválida.')); }
                    }} />
                </label>
                <p id="call-cover-help" className="text-xs text-stone-500">JPG, PNG o WebP · Máximo 3 MB. Usa una imagen horizontal; se recortará para llenar la cabecera.</p>
                {(coverFile || values.cover_image_path) && <div className="flex flex-wrap gap-2 items-center text-xs"><span className="break-words [overflow-wrap:anywhere]">{coverFile?.name ?? 'Portada actual'}</span><button type="button" className={secondary} onClick={() => { setCoverFile(null); update('cover_image_path', null); }}>Quitar portada</button></div>}
                <IdentityPicker value={values} onChange={(identity) => { setValues((previous) => ({ ...previous, ...identity })); setDirty(true); }} />
              </div>
              <aside aria-label="Vista previa de la convocatoria" className="overflow-hidden rounded-2xl border border-[#E5E3DC] bg-white">
                {values.cover_image_path && !previewUrl ? <StoredCallCover path={values.cover_image_path} {...values} /> : <CallCover imageUrl={previewUrl} {...values} />}
                <div className="p-4 space-y-2"><span className="text-xs text-stone-500">Vista previa · {values.faculty}</span><h3 className="font-semibold text-[#14281D] break-words">{values.title || 'Nombre de la convocatoria'}</h3><p className="text-xs text-stone-500">El icono se muestra cuando no hay una imagen disponible.</p></div>
              </aside>
            </div>
          </section>
        </>}
        {step === 1 && <>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-xs font-semibold">Facultad o área<select name="faculty" required value={values.faculty} onChange={(e) => update('faculty', e.target.value)} className={field}>{faculties.map((faculty) => <option key={faculty}>{faculty}</option>)}</select></label>
            <label className="block text-xs font-semibold">Dirigida a<select name="audience" value={values.audience} onChange={(e) => { const value = e.target.value; if (value === 'all' || value === 'students' || value === 'teachers') update('audience', value); }} className={field}>{Object.entries(audienceLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          </div>
          <fieldset><legend className="text-xs font-semibold">Tipos de solicitud admitidos</legend><p className="text-xs text-stone-500 mt-1 mb-3">Selecciona al menos uno.</p>
            <div className="grid sm:grid-cols-2 gap-2">{availableTypes.map((type) => <label key={type.id} className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${values.type_ids.includes(type.id) ? 'border-lime-600 bg-lime-50/50' : 'border-[#E5E3DC] hover:bg-stone-50'}`}>
              <input type="checkbox" name="type_ids" value={type.id} checked={values.type_ids.includes(type.id)} onChange={(e) => update('type_ids', e.target.checked ? [...values.type_ids, type.id] : values.type_ids.filter((id) => id !== type.id))} className="mt-0.5 accent-[#14281D] shrink-0" />
              <IdentityIcon {...getTypeAppearance(type)} size={18} /><span className="text-xs leading-relaxed"><span className="block font-semibold">{type.name}</span><span className="text-[10px] text-stone-500">{type.code}{!type.is_active ? ' · Inactivo' : ''}</span></span>
            </label>)}</div>
            {!availableTypes.length && <p className="text-xs text-amber-700">No hay tipos de solicitud disponibles. Solicita al administrador que habilite al menos uno.</p>}
          </fieldset>
        </>}
        {step === 2 && <>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="block text-xs font-semibold">Fecha y hora de apertura<input type="datetime-local" name="opens_at" required value={values.opens_at} onChange={(e) => update('opens_at', e.target.value)} className={field} /></label>
            <label className="block text-xs font-semibold">Fecha y hora de cierre<input type="datetime-local" name="closes_at" required value={values.closes_at} onChange={(e) => update('closes_at', e.target.value)} className={field} /></label>
          </div>
          <label className="block text-xs font-semibold max-w-sm">Tope de financiamiento por solicitud (COP)<input type="number" name="max_amount" min="0.01" step="0.01" value={values.max_amount} onChange={(e) => update('max_amount', e.target.value)} className={field} placeholder="Ej. 5000000" /><span className="block text-[11px] font-normal text-stone-500 mt-1">Opcional. Déjalo vacío si no se define un tope individual.</span></label>
        </>}
        {step === 3 && <div className="space-y-4 text-sm">
          {values.cover_image_path && !previewUrl ? <StoredCallCover path={values.cover_image_path} {...values} /> : <CallCover imageUrl={previewUrl} {...values} />}
          <div className="rounded-xl bg-[#F7F6F2] p-4"><span className="text-[10px] uppercase font-bold text-stone-500">Borrador · aún no publicado</span><h3 className="font-bold mt-1 break-words">{values.title}</h3><p className="text-xs text-stone-600 mt-2 whitespace-pre-wrap break-words">{values.description}</p></div>
          <dl className="grid sm:grid-cols-2 gap-4 text-xs">
            <div><dt className="text-stone-500">Facultad o área</dt><dd className="font-semibold mt-1">{values.faculty}</dd></div>
            <div><dt className="text-stone-500">Dirigida a</dt><dd className="font-semibold mt-1">{audienceLabels[values.audience]}</dd></div>
            <div><dt className="text-stone-500">Apertura (Colombia)</dt><dd className="font-semibold mt-1">{formatCallDate(values.opens_at + '-05:00')}</dd></div>
            <div><dt className="text-stone-500">Cierre (Colombia)</dt><dd className="font-semibold mt-1">{formatCallDate(values.closes_at + '-05:00')}</dd></div>
            <div><dt className="text-stone-500">Tope por solicitud</dt><dd className="font-semibold mt-1">{values.max_amount ? `$ ${Number(values.max_amount).toLocaleString('es-CO')} COP` : 'Sin tope individual definido'}</dd></div>
            <div><dt className="text-stone-500">Tipos de solicitud</dt><dd className="font-semibold mt-1"><ul className="space-y-1">{availableTypes.filter((type) => values.type_ids.includes(type.id)).map((type) => <li key={type.id}>{type.name}</li>)}</ul></dd></div>
          </dl>
        </div>}
      </fieldset>
      <div className="px-5 sm:px-6 pb-4">{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}</div>
      <footer className="flex items-center justify-between gap-3 border-t border-[#E5E3DC] bg-stone-50/50 p-4 sm:px-6">
        <button type="button" disabled={busy} onClick={() => { if (step) { setStep(step - 1); setError(''); } else cancel(); }} className={secondary}>{step ? <><ArrowLeft size={14} /> Anterior</> : 'Cancelar'}</button>
        <button type="submit" disabled={busy} className={primary}>{step === 3 ? <><Save size={14} /> {busy ? 'Guardando…' : 'Guardar borrador'}</> : <>Continuar <ArrowRight size={14} /></>}</button>
      </footer>
      {busy && <p role="status" className="px-6 pb-3 text-xs text-stone-500">Guardando convocatoria. Espera un momento…</p>}
    </form>
    <p className="flex items-start gap-2 text-xs text-stone-500"><CalendarDays size={15} className="shrink-0" /> La recepción de postulaciones comenzará al publicar, dentro del periodo que definas.</p>
    {decisionDialog}
  </div>;
}
