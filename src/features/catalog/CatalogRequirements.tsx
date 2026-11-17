import type { ReactElement } from 'react';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import type { Requirement } from '../../types/database.ts';
import { TemplateDownload } from './TemplateDownload.tsx';

export function CatalogRequirements({ requirements, onAdd, onEdit, onRemove, disabled }: {
  requirements: Requirement[]; onAdd: () => void; onEdit: (requirement: Requirement) => void;
  onRemove: (requirement: Requirement) => void; disabled: boolean;
}): ReactElement {
  return <section className="catalog-section" aria-labelledby="catalog-requirements-title">
    <header className="flex flex-wrap justify-between items-start gap-4"><div><h2 id="catalog-requirements-title" className="text-base font-bold">Requisitos y plantillas</h2><p className="mt-1 text-sm text-stone-500">{requirements.length} requisitos · {requirements.filter((item) => item.is_mandatory).length} obligatorios</p></div><button type="button" disabled={disabled} onClick={onAdd} className="catalog-secondary"><Plus size={16} /> Agregar requisito</button></header>
    {!requirements.length && <div className="rounded-xl border border-dashed border-[#E5E3DC] p-6 text-center text-sm text-stone-500"><FileText size={28} className="mx-auto mb-3 text-stone-400" /><p>Aún no hay requisitos. Añade los documentos que debe presentar el solicitante.</p></div>}
    <div className="space-y-3">{requirements.map((requirement) => <details key={requirement.id} className="catalog-requirement">
      <summary className="cursor-pointer p-4 text-sm font-semibold"><span>{requirement.name}</span><span className="ml-2 text-xs font-normal text-stone-500">{requirement.is_mandatory ? 'Obligatorio' : 'Condicional'}</span></summary>
      <div className="space-y-4 border-t border-[#E5E3DC] p-4 text-sm">
        {requirement.description && <p className="text-stone-600">{requirement.description}</p>}
        <dl className="grid sm:grid-cols-2 gap-4 text-xs">
          <div><dt className="text-stone-500">Correcciones</dt><dd className="mt-1 font-semibold">{requirement.is_subsanable ? `Subsanable · ${requirement.cure_deadline_days} días hábiles` : 'No subsanable · causal de rechazo'}</dd></div>
          <div><dt className="text-stone-500">Archivos admitidos</dt><dd className="mt-1 font-semibold break-words">{requirement.allowed_formats.map((format) => format === 'application/pdf' ? 'PDF' : format.includes('wordprocessingml') ? 'Word (.docx)' : format === 'application/msword' ? 'Word (.doc)' : format).join(', ')} · {requirement.max_size_mb} MB</dd></div>
        </dl>
        {requirement.template_url && <div className="space-y-2"><p className="text-xs text-stone-500">Plantilla · Versión {requirement.template_revision ?? 1}</p><TemplateDownload path={requirement.template_url} /></div>}
        <footer className="flex flex-wrap justify-between gap-3"><button type="button" disabled={disabled} onClick={() => onEdit(requirement)} className="catalog-secondary"><Pencil size={14} /> Editar requisito</button><button type="button" disabled={disabled} onClick={() => onRemove(requirement)} className="inline-flex min-h-11 items-center gap-2 px-2 text-xs font-semibold text-rose-700"><Trash2 size={14} /> Retirar requisito</button></footer>
      </div>
    </details>)}</div>
  </section>;
}
