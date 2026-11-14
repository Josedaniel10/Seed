import type { ReactElement } from 'react';
import { Skeleton, SkeletonRegion } from '../../components/ui/Skeleton.tsx';

export function ReviewCardsSkeleton(): ReactElement {
  return <SkeletonRegion label="Cargando revisiones técnicas…">
    <div className="space-y-4">{Array.from({ length: 3 }, (_, index) => <div key={index} className="bg-white rounded-3xl border border-[#E5E3DC] overflow-hidden shadow-xs">
      <div className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1 flex-1"><div className="flex flex-wrap gap-2 items-center"><Skeleton className="h-5 w-28" /><Skeleton className="h-5 w-48 max-w-full" /></div><Skeleton className="h-4 w-3/4" /></div>
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center"><Skeleton className="h-6 w-32 rounded-full" /><Skeleton className="h-[34px] w-[34px] rounded-xl" /></div>
      </div>
    </div>)}</div>
  </SkeletonRegion>;
}
