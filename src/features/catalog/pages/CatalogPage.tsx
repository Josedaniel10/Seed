import React from 'react';
import { PageHeader } from '../../../components/layout/PageHeader.tsx';
import { CatalogManagement } from '../CatalogManagement.tsx';
import { FileText } from 'lucide-react';

export function CatalogPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo Institucional de Tipos de Trámite y Requisitos"
        description="Gestión de procedimientos académicos, especificación de requisitos obligatorios y plazos reglamentarios de subsanación."
        icon={<FileText size={22} />}
        breadcrumbs={[
          { label: 'Inicio', href: '/' },
          { label: 'Catálogo de Trámites' },
        ]}
      />

      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs">
        <CatalogManagement />
      </div>
    </div>
  );
}
