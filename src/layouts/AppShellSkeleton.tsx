import { readSidebarCollapsed } from '../lib/sidebarPreference.ts';
import type { ReactElement } from 'react';
import { SeedLogo } from '../components/SeedLogo.tsx';
import { Skeleton, SkeletonRegion } from '../components/ui/Skeleton.tsx';

export function AppShellSkeleton(): ReactElement {
  return <SkeletonRegion label="Cargando sesión institucional…" className="min-h-dvh bg-[#F7F6F2]">
    <div className="h-14 px-4 md:px-6 bg-white border-b border-[#E5E3DC] flex items-center justify-between">
      <div className="flex items-center gap-6"><SeedLogo size={30} /><Skeleton className="h-7 w-32" /></div>
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
    <div className="flex min-h-[calc(100dvh-56px)]">
      <div className={`${readSidebarCollapsed() ? 'w-20' : 'w-60'} bg-white border-r border-[#E5E3DC] p-3.5 space-y-1 hidden md:block shrink-0`}>
        {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-10 w-full rounded-xl" />)}
      </div>
      <div className="min-w-0 flex-1 p-4 sm:p-6 md:p-8 max-w-6xl w-full mx-auto space-y-6">
        <div className="border-b border-[#E5E3DC] pb-4 space-y-2"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-4 w-1/2" /></div>
        <Skeleton className="h-[70px] w-full rounded-2xl" />
        <div className="bg-white border border-[#E5E3DC] rounded-2xl p-4 space-y-4">
          {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-10 w-full" />)}
        </div>
      </div>
    </div>
  </SkeletonRegion>;
}
