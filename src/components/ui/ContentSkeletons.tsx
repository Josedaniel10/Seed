import type { ReactElement } from 'react';
import { Skeleton, SkeletonRegion } from './Skeleton.tsx';

interface CardsSkeletonProps {
  count?: number;
  label?: string;
  className?: string;
}

export function CardsSkeleton({ count = 3, label, className = 'space-y-4' }: CardsSkeletonProps): ReactElement {
  return <SkeletonRegion label={label} className={className}>
    <div className="space-y-4">{Array.from({ length: count }, (_, index) => <div key={index} className="bg-white rounded-2xl border border-[#E5E3DC] p-5 space-y-3">
      <div className="flex items-center justify-between gap-4"><Skeleton className="h-5 w-28" /><Skeleton className="h-6 w-20 rounded-full" /></div>
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex justify-between gap-4 pt-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-7 w-24 rounded-lg" /></div>
    </div>)}</div>
  </SkeletonRegion>;
}

export function NotificationsSkeleton(): ReactElement {
  return <SkeletonRegion label="Cargando notificaciones…" className="bg-white rounded-2xl border border-[#E5E3DC] overflow-hidden shadow-xs">
    <div className="divide-y divide-[#E5E3DC]">{Array.from({ length: 4 }, (_, index) => <div key={index} className="p-4 space-y-2">
      <div className="flex justify-between gap-4"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-20" /></div>
      <Skeleton className="h-5 w-full" />
      <div className="flex justify-between gap-3"><Skeleton className="h-4 w-36" /><Skeleton className="h-4 w-24" /></div>
    </div>)}</div>
  </SkeletonRegion>;
}

export function SessionsSkeleton(): ReactElement {
  return <SkeletonRegion label="Cargando sesiones…">
    <div className="space-y-4">{Array.from({ length: 3 }, (_, index) => <div key={index} className="session-summary bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-stone-100">
        <div className="flex items-center gap-3"><Skeleton className="h-[42px] w-[42px] rounded-xl shrink-0" /><div className="space-y-2 min-w-0 flex-1"><Skeleton className="h-5 w-40" /><Skeleton className="h-4 w-64 max-w-full" /></div></div>
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <div className="flex justify-between gap-3"><Skeleton className="h-4 w-40" /><Skeleton className="h-4 w-24" /></div>
    </div>)}</div>
  </SkeletonRegion>;
}

export function SplitWorkspaceSkeleton({ label = 'Cargando espacio de trabajo…' }: { label?: string }): ReactElement {
  return <SkeletonRegion label={label}>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-5"><CardsSkeleton count={3} /></div>
      <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5E3DC] p-6 space-y-6">
        <Skeleton className="h-5 w-2/3" /><Skeleton className="h-4 w-1/2" />
        {Array.from({ length: 4 }, (_, index) => <div key={index} className="border-t border-[#E5E3DC] pt-4 space-y-3"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-10 w-full rounded-xl" /></div>)}
      </div>
    </div>
  </SkeletonRegion>;
}

export function DetailSkeleton({ kind }: { kind: 'request' | 'session' }): ReactElement {
  const isRequest = kind === 'request';
  if (!isRequest) return <SkeletonRegion label="Cargando sesión…">
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-44" />
        <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Skeleton className="h-[46px] w-[46px] rounded-xl shrink-0" /><div className="space-y-2 min-w-0 flex-1"><Skeleton className="h-6 w-48" /><Skeleton className="h-4 w-64 max-w-full" /></div></div>
          <Skeleton className="h-8 w-40 rounded-full" />
        </div>
      </div>
      <div className="rounded-xl border border-[#E5E3DC] bg-white p-4 space-y-2">
        <Skeleton className="h-4 w-48" /><Skeleton className="h-4 w-32" /><Skeleton className="h-4 w-56" /><Skeleton className="h-4 w-3/4" />
      </div>
      <div className="flex gap-6 border-b border-[#E5E3DC] pb-3 overflow-hidden"><Skeleton className="h-4 w-40 shrink-0" /><Skeleton className="h-4 w-32 shrink-0" /><Skeleton className="h-4 w-36 shrink-0" /></div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5E3DC] p-6 space-y-4"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-3/4" /><CardsSkeleton count={2} /></div>
        <div className="lg:col-span-4"><CardsSkeleton count={2} /></div>
      </div>
    </div>
  </SkeletonRegion>;
  return <SkeletonRegion label="Cargando solicitud…" className="space-y-6">
    <div className="space-y-6">
      <Skeleton className="hidden md:block h-4 w-36" />
      <div className="bg-white border border-[#E5E3DC] shadow-xs space-y-4 rounded-3xl p-6 md:p-8">
        <div className="flex justify-between gap-4"><Skeleton className="h-6 w-48" /><Skeleton className="h-6 w-24 rounded-full" /></div>
        <Skeleton className="h-8 w-3/4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4 border-t border-[#E5E3DC]">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-4 w-3/4" /></div>)}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white border border-[#E5E3DC] rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex gap-6 border-b border-[#E5E3DC] pb-3"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-20" /></div>
          <Skeleton className="h-5 w-1/2" />
          <div className="space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
        <div className="lg:col-span-4"><CardsSkeleton count={2} /></div>
      </div>
    </div>
  </SkeletonRegion>;
}

export function TypeOptionsSkeleton({ count = 4 }: { count?: number }): ReactElement {
  return <SkeletonRegion label="Cargando tipos de trámite y requisitos…">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
      {Array.from({ length: count }, (_, index) => <div key={index} className="p-4 rounded-2xl border border-[#E5E3DC] space-y-2.5">
        <div className="flex justify-between gap-2 mb-1.5"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-32 rounded-full" /></div>
        <Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" />
        <div className="pt-2 border-t border-stone-200 flex justify-between gap-3"><Skeleton className="h-4 w-36" /><Skeleton className="h-4 w-20" /></div>
      </div>)}
    </div>
  </SkeletonRegion>;
}
