import type { ReactElement } from 'react';
import { Skeleton, SkeletonRegion } from '../../components/ui/Skeleton.tsx';

export function BoardCardsSkeleton({ label }: { label: string }): ReactElement {
  return <SkeletonRegion label={label}>
    <div className="space-y-2.5">{Array.from({ length: 2 }, (_, index) => <div key={index} className="bg-white rounded-2xl border border-[#E5E3DC] p-3.5 space-y-2 shadow-2xs">
      <div className="flex justify-between gap-1"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-16 rounded-full" /></div>
      <div className="space-y-1"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
      <div className="hidden md:block space-y-1 pt-1"><Skeleton className="h-3 w-3/4" /><Skeleton className="h-3 w-1/2" /></div>
      <div className="md:hidden rounded-lg bg-[#F7F6F2] p-2.5 space-y-2"><Skeleton className="h-3 w-24" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div>
      <div className="pt-2 border-t border-stone-100 flex justify-between"><Skeleton className="h-3 w-20" /><Skeleton className="h-3 w-3" /></div>
    </div>)}</div>
  </SkeletonRegion>;
}
