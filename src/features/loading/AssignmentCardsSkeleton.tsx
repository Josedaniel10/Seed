import type { ReactElement } from 'react';
import { Skeleton, SkeletonRegion } from '../../components/ui/Skeleton.tsx';

export function AssignmentCardsSkeleton(): ReactElement {
  return <SkeletonRegion label="Cargando asignaciones…">
    <div className="space-y-4">{Array.from({ length: 3 }, (_, index) => <div key={index} className="p-5 rounded-2xl border border-[#E5E3DC] bg-[#F7F6F2] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="space-y-1.5 flex-1"><div className="flex flex-wrap gap-2"><Skeleton className="h-5 w-28" /><Skeleton className="h-5 w-44 max-w-full" /></div><Skeleton className="h-4 w-3/4" /><Skeleton className="h-5 w-1/2" /></div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0"><Skeleton className="h-9 w-52 max-w-full rounded-xl" /><Skeleton className="h-9 w-20 rounded-xl" /></div>
    </div>)}</div>
  </SkeletonRegion>;
}
