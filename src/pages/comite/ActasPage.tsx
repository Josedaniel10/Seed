import React, { useState } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  Download,
  Calendar,
  FileText,
  ChevronDown,
} from 'lucide-react';

interface ActaItem {
  id: string;
  numero: string;
  fecha: string;
  estado: string;
  acuerdosCount: number;
  pdfUrl: string;
}

const ACTAS_MOCK: ActaItem[] = [
  {
    id: 'acta-03',
    numero: 'Acta Ordinaria Nº 03 - 2026',
    fecha: '28 de Octubre de 2026',
    estado: 'Aprobada y Firmada',
    acuerdosCount: 5,
    pdfUrl: '#',
  },
  {
    id: 'acta-02',
    numero: 'Acta Ordinaria Nº 02 - 2026',
    fecha: '14 de Octubre de 2026',
    estado: 'Aprobada y Firmada',
    acuerdosCount: 4,
    pdfUrl: '#',
  },
  {
    id: 'acta-01',
    numero: 'Acta Ordinaria Nº 01 - 2026',
    fecha: '30 de Septiembre de 2026',
    estado: 'Aprobada y Firmada',
    acuerdosCount: 6,
    pdfUrl: '#',
  },
];

export function ActasPage() {
  const [search, setSearch] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
          Actas y Decisiones Colegiadas
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Repositorio institucional de actas solemnes y acuerdos del Comité de Investigación.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-stone-400" size={15} />
          <input
            type="text"
            placeholder="Buscar por número de acta o fecha..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none text-xs"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E3DC] overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F7F6F2] border-b border-[#E5E3DC] text-[11px] font-bold uppercase tracking-wider text-stone-600">
            <tr>
              <th className="py-3 px-4">Número de Acta</th>
              <th className="py-3 px-4">Fecha de Sesión</th>
              <th className="py-3 px-4">Estado</th>
              <th className="py-3 px-4">Acuerdos Formalizados</th>
              <th className="py-3 px-4 text-right">Documento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E3DC]">
            {ACTAS_MOCK.map((acta) => (
              <tr key={acta.id} className="hover:bg-[#FAF9F6] transition-colors">
                <td className="py-3.5 px-4 font-bold text-[#14281D]">
                  {acta.numero}
                </td>
                <td className="py-3.5 px-4 text-stone-600">{acta.fecha}</td>
                <td className="py-3.5 px-4">
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                    {acta.estado}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-stone-600">
                  {acta.acuerdosCount} acuerdos adoptados
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button className="px-3 py-1.5 border border-[#E5E3DC] rounded-lg hover:bg-stone-50 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer text-[#14281D]">
                    <Download size={13} />
                    <span>Descargar PDF</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
