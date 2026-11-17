import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Megaphone } from 'lucide-react';
import { useCalls, isCallOpen, formatCallDate } from './callsApi.ts';

export function CallsNotice(): ReactElement | null {
  const calls = useCalls();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const open = (calls.data ?? []).filter((call) => isCallOpen(call))
    .sort((a, b) => Date.parse(a.closes_at) - Date.parse(b.closes_at) || a.id.localeCompare(b.id));
  if (!open.length) return null;
  const selectedIndex = Math.max(0, open.findIndex((call) => call.id === selectedId));
  const current = open[selectedIndex];
  const move = (direction: number): void => {
    setSelectedId(open[(selectedIndex + direction + open.length) % open.length].id);
  };
  return <section className="overflow-hidden rounded-2xl border border-[#DCE4D4] bg-white shadow-xs" aria-label="Convocatorias abiertas">
    <div className="flex items-center justify-between gap-3 border-b border-[#E5EBDD] bg-[#F1F5EB] px-4 py-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#14281D] text-[#BEF264]"><Megaphone size={16} strokeWidth={1.75} aria-hidden="true" /></span>
        <div><p className="text-[9px] font-bold uppercase tracking-widest text-[#526541]">Oportunidades de investigación</p>
          <h2 className="text-xs font-bold text-[#14281D]">Convocatorias abiertas</h2></div>
      </div>
      <Link className="shrink-0 rounded-lg px-1 py-2 text-[11px] font-semibold text-[#405733] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-[#4d7c0f]" to="/convocatorias">Ver todas<span className="sr-only"> las convocatorias</span></Link>
    </div>
    <div className="p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
        <div className="min-w-0 flex-1" aria-live="polite" aria-atomic="true">
          <div className="flex items-center gap-2 text-[10px] text-stone-500">
            <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold text-[#4D6B31]"><span className="size-1.5 rounded-full bg-[#65A30D]" aria-hidden="true" />Postulaciones abiertas</span>
            <span aria-hidden="true">·</span><span className="truncate">{current.faculty}</span>
          </div>
          <h3 className="mt-2 text-sm sm:text-base font-bold tracking-tight leading-snug text-[#14281D] line-clamp-2 break-words" title={current.title}>{current.title}</h3>
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-stone-500"><CalendarDays size={13} className="mt-0.5 shrink-0" aria-hidden="true" /><span>Cierre: <time dateTime={current.closes_at}>{formatCallDate(current.closes_at)}</time> <span className="text-stone-400">(Colombia)</span></span></p>
        </div>
        <div className="shrink-0 sm:max-w-44">
          <Link to={`/convocatorias?convocatoria=${current.id}`} aria-label={`Ver requisitos de ${current.title}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#14281D] px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-[#1E3A2B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d7c0f]">
            Ver requisitos <ArrowRight size={14} aria-hidden="true" />
          </Link>
          <p className="mt-1.5 text-[10px] leading-relaxed text-stone-500 sm:text-center">Conoce las condiciones antes de postularte.</p>
        </div>
      </div>
      {open.length > 1 && <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#E5E3DC] pt-3">
        <p className="text-[10px] text-stone-500">{open.length} oportunidades disponibles</p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => move(-1)} aria-label="Convocatoria anterior" className="flex size-8 items-center justify-center rounded-lg border border-[#E5E3DC] text-stone-500 transition-colors hover:bg-stone-50 hover:text-[#14281D] focus-visible:outline-2 focus-visible:outline-[#4d7c0f] cursor-pointer"><ChevronLeft size={14} aria-hidden="true" /></button>
          <span className="min-w-8 text-center text-[10px] tabular-nums text-stone-500" aria-label={`Convocatoria ${selectedIndex + 1} de ${open.length}`}>{selectedIndex + 1} / {open.length}</span>
          <button type="button" onClick={() => move(1)} aria-label="Siguiente convocatoria" className="flex size-8 items-center justify-center rounded-lg border border-[#E5E3DC] text-stone-500 transition-colors hover:bg-stone-50 hover:text-[#14281D] focus-visible:outline-2 focus-visible:outline-[#4d7c0f] cursor-pointer"><ChevronRight size={14} aria-hidden="true" /></button>
        </div>
      </div>}
    </div>
  </section>;
}
