import { useEffect, useId, useRef } from 'react';
import type { FormEventHandler, ReactElement, ReactNode } from 'react';
import { ArrowLeft, Save } from 'lucide-react';
import { IdentityPicker } from '../../components/ui/IdentityPicker.tsx';
import { IdentityIcon } from '../../components/ui/IdentityIcon.tsx';

export interface CatalogTypeInput {
  code: string;
  name: string;
  description: string;
  requires_committee: boolean;
  display_order: number;
  is_active: boolean;
  icon_key: string;
  accent_color: string;
}

const field = 'mt-2 w-full rounded-xl border border-[#E5E3DC] bg-white px-3 py-3 text-sm focus-visible:outline-2 focus-visible:outline-[#4d7c0f]';

export function CatalogTypeEditor({ value, onChange, onSave, onCancel, saving, error, isNew, children }: {
  value: CatalogTypeInput; onChange: (value: CatalogTypeInput) => void; onSave: FormEventHandler<HTMLFormElement>;
  onCancel: () => void; saving: boolean; error: string; isNew: boolean; children: ReactNode;
}): ReactElement {
  const id = useId();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  return <div className="space-y-6">
    <header className="space-y-3 border-b border-[#E5E3DC] pb-4">
      <button type="button" disabled={saving} onClick={onCancel} className="inline-flex min-h-11 items-center gap-2 text-sm text-stone-600"><ArrowLeft size={16} /> Volver al catálogo</button>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div><h1 ref={heading} tabIndex={-1} className="mobile-section-title text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D] outline-none">{isNew ? 'Nuevo tipo de solicitud' : 'Editar tipo de solicitud'}</h1><p className="mt-1 text-sm text-stone-500">Define cómo se identifica este trámite y qué documentos necesita.</p></div>
        <button type="submit" form={id} disabled={saving} className="catalog-primary"><Save size={16} />{saving ? 'Guardando…' : 'Guardar tipo de solicitud'}</button>
      </div>
    </header>
    {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}
    <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
      <div className="min-w-0 space-y-6">
        <form id={id} onSubmit={onSave} className="space-y-6">
          <fieldset disabled={saving} className="contents">
            <section className="catalog-section" aria-labelledby={`${id}-general`}>
              <div><h2 id={`${id}-general`} className="text-base font-bold">Información general</h2><p className="mt-1 text-sm text-stone-500">Usa un nombre claro y una descripción que ayude a elegir el trámite.</p></div>
              <label className="block text-sm font-semibold">Nombre del tipo de solicitud *<input required maxLength={200} value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })} className={field} placeholder="Ej. Aval de proyecto de investigación" /></label>
              <label className="block text-sm font-semibold">Código institucional *<input required maxLength={50} value={value.code} onChange={(event) => onChange({ ...value, code: event.target.value })} className={`${field} font-mono uppercase`} placeholder="Ej. SOL-AVAL-01" /></label>
              <label className="block text-sm font-semibold">Descripción<textarea rows={4} value={value.description} onChange={(event) => onChange({ ...value, description: event.target.value })} className={field} placeholder="Explica cuándo se utiliza este tipo de solicitud." /></label>
            </section>
            <section className="catalog-section" aria-labelledby={`${id}-appearance`}>
              <div><h2 id={`${id}-appearance`} className="text-base font-bold">Identidad visual</h2><p className="mt-1 text-sm text-stone-500">El icono y el color acompañarán al nombre en toda la plataforma.</p></div>
              <IdentityPicker value={value} onChange={(identity) => onChange({ ...value, ...identity })} />
            </section>
            <section className="catalog-section" aria-labelledby={`${id}-settings`}>
              <h2 id={`${id}-settings`} className="text-base font-bold">Configuración</h2>
              <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={value.requires_committee} onChange={(event) => onChange({ ...value, requires_committee: event.target.checked })} className="mt-1 accent-[#14281D]" /><span><strong className="block">Requiere revisión en comité</strong><span className="text-stone-500">El trámite se incorpora a una sesión antes de recibir una decisión.</span></span></label>
              <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={value.is_active} onChange={(event) => onChange({ ...value, is_active: event.target.checked })} className="mt-1 accent-[#14281D]" /><span><strong className="block">Disponible para nuevas solicitudes</strong><span className="text-stone-500">Desactivarlo conserva las solicitudes y el historial existentes.</span></span></label>
              <label className="block max-w-xs text-sm font-semibold">Orden de visualización<input type="number" required min={0} step={1} value={value.display_order} onChange={(event) => onChange({ ...value, display_order: Number(event.target.value) })} className={field} /></label>
            </section>
          </fieldset>
        </form>
        {children}
      </div>
      <aside className="catalog-section lg:sticky lg:top-6" aria-label="Vista previa del tipo de solicitud">
        <span className="text-xs font-semibold uppercase tracking-wide text-stone-500">Vista previa</span>
        <IdentityIcon {...value} size={28} />
        <div><h2 className="text-lg font-bold break-words">{value.name || 'Nombre de la solicitud'}</h2><p className="mt-2 font-mono text-xs text-stone-500 break-words">{value.code || 'CÓDIGO'}</p></div>
        <p className="text-sm text-stone-600 break-words">{value.description || 'Una descripción breve del trámite aparecerá aquí.'}</p>
        <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-stone-100 px-3 py-1">{value.requires_committee ? 'Revisión en comité' : 'Trámite directo'}</span><span className="rounded-full bg-stone-100 px-3 py-1">{value.is_active ? 'Activo' : 'Inactivo'}</span></div>
      </aside>
    </div>
  </div>;
}
