import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Modal } from './Modal.tsx';
import { SelectPresentationContext } from './ResponsiveSelect.tsx';

interface ResponsiveFiltersProps {
  activeCount: number;
  onReset: () => void;
  children: ReactNode;
}

export function ResponsiveFilters({ activeCount, onReset, children }: ResponsiveFiltersProps): ReactElement {
  const [isOpen, setIsOpen] = useState(false);

  return <>
    <div className="hidden md:contents">{children}</div>
    <button type="button" onClick={() => setIsOpen(true)} aria-haspopup="dialog" aria-expanded={isOpen}
      className="md:hidden inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#E5E3DC] bg-white px-3 text-sm font-semibold text-[#14281D]">
      <SlidersHorizontal size={18} aria-hidden="true" />
      <span>Filtros</span>
      {activeCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#14281D] px-1 text-[11px] text-white" aria-label={`${activeCount} filtros activos`}>{activeCount}</span>}
    </button>
    <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Filtrar resultados" maxWidth="md">
      <SelectPresentationContext value="inline">
        <div className="mobile-filter-fields">{children}</div>
      </SelectPresentationContext>
      <div className="mt-6 flex items-center gap-3 border-t border-stone-100 pt-4">
        <button type="button" onClick={onReset} disabled={activeCount === 0}
          className="rounded-xl px-3 text-sm font-semibold text-stone-600 disabled:opacity-40">Limpiar</button>
        <button type="button" onClick={() => setIsOpen(false)}
          className="min-h-12 flex-1 rounded-xl bg-[#14281D] px-4 text-sm font-semibold text-white">Ver resultados</button>
      </div>
    </Modal>
  </>;
}
