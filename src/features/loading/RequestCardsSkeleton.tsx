import type { ReactElement } from 'react';
import { Skeleton, SkeletonRegion } from '../../components/ui/Skeleton.tsx';

export function RequestCardsSkeleton(): ReactElement {
  return <SkeletonRegion label="Cargando sus solicitudes…">
    <div className="space-y-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="mobile-record space-y-3">
      <Skeleton className="h-5 w-24 rounded-full" />
      <div className="space-y-2 py-1"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
      <div className="rounded-xl bg-[#F7F6F2] px-3 py-2.5 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-2/3" /></div>
      <div className="flex justify-between gap-2 pt-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-4 w-28" /></div>
    </div>)}</div>
  </SkeletonRegion>;
}
