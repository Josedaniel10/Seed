import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Table,
  Kanban,
  Search,
  Filter,
  Clock,
  AlertCircle,
  FileText,
  User,
  ArrowRight,
} from 'lucide-react';

interface TarjetaSeguimiento {
  id: string;
  radicado: string;
  tipo: string;
  investigador: string;
  responsable: string;
  diasEnEstado: number;
  plazoVencido: boolean;
  estado: 'Radicada' | 'Pendiente por documentos' | 'En revisión' | 'Lista para comité' | 'Decididas';
}

const ITEMS_SEGUIMIENTO: TarjetaSeguimiento[] = [
  {
    id: 'sol-001',
    radicado: 'Radicado 2026-014',
    tipo: 'Presentación de Proyecto',
    investigador: 'Dra. Carmen Morales',
    responsable: 'Lic. Fernando Ortiz',
    diasEnEstado: 2,
    plazoVencido: false,
    estado: 'Radicada',
  },
  {
    id: 'sol-002',
    radicado: 'Radicado 2026-009',
    tipo: 'Modificación Presupuestal',
    investigador: 'Dr. Alejandro Restrepo',
    responsable: 'Dra. Carmen Morales',
    diasEnEstado: 6,
    plazoVencido: true,
    estado: 'Pendiente por documentos',
  },
  {
    id: 'sol-003',
    radicado: 'Radicado 2026-005',
    tipo: 'Aval Institucional',
    investigador: 'Ing. Mateo Cárdenas',
    responsable: 'Dr. Alejandro Restrepo',
    diasEnEstado: 3,
    plazoVencido: false,
    estado: 'En revisión',
  },
  {
    id: 'sol-004',
    radicado: 'Radicado 2026-001',
    tipo: 'Prórroga de Cronograma',
    investigador: 'Dra. Patricia Salamanca',
    responsable: 'Secretaría Técnica',
    diasEnEstado: 1,
    plazoVencido: false,
    estado: 'Lista para comité',
  },
  {
    id: 'sol-005',
    radicado: 'Radicado 2025-089',
    tipo: 'Informe Final',
    investigador: 'Dr. Germán Valenzuela',
    responsable: 'Comité Institucional',
    diasEnEstado: 15,
    plazoVencido: false,
    estado: 'Decididas',
  },
];

const COLUMNAS_KANBAN: Array<TarjetaSeguimiento['estado']> = [
  'Radicada',
  'Pendiente por documentos',
  'En revisión',
  'Lista para comité',
  'Decididas',
];

export function PanelSeguimientoPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'KANBAN' | 'TABLE'>('KANBAN');
  const [search, setSearch] = useState('');
  const [selectedEstado, setSelectedEstado] = useState('TODOS');

  const filteredItems = ITEMS_SEGUIMIENTO.filter((item) => {
    const matchesSearch =
      item.radicado.toLowerCase().includes(search.toLowerCase()) ||
      item.investigador.toLowerCase().includes(search.toLowerCase()) ||
      item.tipo.toLowerCase().includes(search.toLowerCase());
    const matchesEstado = selectedEstado === 'TODOS' || item.estado === selectedEstado;
    return matchesSearch && matchesEstado;
  });

  // Métricas de contadores por estado
  const countsByEstado = COLUMNAS_KANBAN.reduce((acc, col) => {
    acc[col] = ITEMS_SEGUIMIENTO.filter((i) => i.estado === col).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
          Panel de Seguimiento
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Trazabilidad operativa de solicitudes en todas las etapas del ciclo institucional.
        </p>
      </div>

      {/* 1. Franja de Métricas por Estado */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {COLUMNAS_KANBAN.map((col) => (
          <div
            key={col}
            onClick={() => setSelectedEstado(selectedEstado === col ? 'TODOS' : col)}
            className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
              selectedEstado === col
                ? 'bg-white border-[#14281D] shadow-xs ring-1 ring-[#14281D]'
                : 'bg-white border-[#E5E3DC] hover:border-stone-300'
            }`}
          >
            <div className="text-[11px] text-stone-500 font-semibold truncate">{col}</div>
            <div className="text-2xl font-extrabold text-[#14281D] mt-1">
              {countsByEstado[col] || 0}
            </div>
          </div>
        ))}
      </div>

      {/* 2. Barra de Herramientas y Conmutador */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-stone-400" size={15} />
          <input
            type="text"
            placeholder="Filtrar por radicado, investigador o tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-[#E5E3DC] bg-[#F7F6F2] p-1">
            <button
              onClick={() => setViewMode('KANBAN')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                viewMode === 'KANBAN'
                  ? 'bg-white text-[#14281D] shadow-2xs'
                  : 'text-stone-500 hover:text-[#14281D]'
              }`}
            >
              <Kanban size={14} />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('TABLE')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold cursor-pointer transition-colors ${
                viewMode === 'TABLE'
                  ? 'bg-white text-[#14281D] shadow-2xs'
                  : 'text-stone-500 hover:text-[#14281D]'
              }`}
            >
              <Table size={14} />
              <span>Tabla</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. Vista Kanban o Vista Tabla */}
      {viewMode === 'KANBAN' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-start">
          {COLUMNAS_KANBAN.map((col) => {
            const itemsInCol = filteredItems.filter((i) => i.estado === col);
            return (
              <div
                key={col}
                className="bg-[#F7F6F2] rounded-2xl border border-[#E5E3DC] p-3 space-y-2.5 min-h-[400px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#E5E3DC]">
                  <span className="font-bold text-xs text-[#14281D]">{col}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white text-stone-700 border border-stone-200">
                    {itemsInCol.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {itemsInCol.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => navigate(`/solicitudes/${item.id}`)}
                      className="bg-white rounded-xl border border-[#E5E3DC] p-3 shadow-2xs hover:border-[#14281D] cursor-pointer transition-all space-y-2 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-[#F7F6F2] text-[#14281D]">
                          {item.radicado}
                        </span>
                        {item.plazoVencido && (
                          <span className="text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded font-bold flex items-center gap-1">
                            <AlertCircle size={10} /> Vencido
                          </span>
                        )}
                      </div>

                      <h4 className="font-bold text-[#14281D] leading-snug">{item.tipo}</h4>

                      <div className="text-[11px] text-stone-500 space-y-0.5">
                        <div className="truncate">Sol: {item.investigador}</div>
                        <div className="truncate">Resp: {item.responsable}</div>
                      </div>

                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[10px] text-stone-400">
                        <span className="flex items-center gap-1">
                          <Clock size={11} />
                          <span>{item.diasEnEstado} días en etapa</span>
                        </span>
                        <ArrowRight size={12} className="text-stone-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-[#E5E3DC] overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F6F2] border-b border-[#E5E3DC] text-[11px] font-bold uppercase tracking-wider text-stone-600">
              <tr>
                <th className="py-3 px-4">Radicado</th>
                <th className="py-3 px-4">Tipo</th>
                <th className="py-3 px-4">Investigador</th>
                <th className="py-3 px-4">Responsable</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4">Días</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E3DC]">
              {filteredItems.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => navigate(`/solicitudes/${item.id}`)}
                  className="hover:bg-[#FAF9F6] cursor-pointer transition-colors"
                >
                  <td className="py-3 px-4 font-mono font-bold text-[#14281D]">
                    {item.radicado}
                  </td>
                  <td className="py-3 px-4 text-stone-700">{item.tipo}</td>
                  <td className="py-3 px-4 text-stone-600">{item.investigador}</td>
                  <td className="py-3 px-4 text-stone-600">{item.responsable}</td>
                  <td className="py-3 px-4 font-semibold text-[#14281D]">{item.estado}</td>
                  <td className="py-3 px-4 text-stone-500">{item.diasEnEstado} días</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
