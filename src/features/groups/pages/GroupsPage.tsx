import React from 'react';
import { PageHeader } from '../../../components/layout/PageHeader.tsx';
import { ResearchGroupsManagement } from '../ResearchGroupsManagement.tsx';
import { Layers } from 'lucide-react';

export function GroupsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Grupos de Investigación Institucionales"
        description="Directorio de grupos adscritos por facultad y designación de docentes líderes de grupo."
        icon={<Layers size={22} />}
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Grupos de Investigación' },
        ]}
      />

      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs">
        <ResearchGroupsManagement />
      </div>
    </div>
  );
}
