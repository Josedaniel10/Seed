import React, { useState } from 'react';
import {
  BarChart3,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  TrendingUp,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export function ReportesPage() {
  const [periodo, setPeriodo] = useState('2026-I');
  const [tipoReporte, setTipoReporte] = useState('solicitudes_por_tipo');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
            Reportes e Indicadores de Gestión
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Analítica de convocatorias, tiempos de atención y estado de trámites institucionales.
          </p>
        </div>

        <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs shrink-0">
          <Download size={14} />
          <span>Exportar a Excel / CSV</span>
        </button>
      </div>

      {/* Selectores de Reporte y Periodo */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3 text-xs">
        <div className="w-full sm:w-auto">
          <label className="block text-stone-500 text-[10px] uppercase font-bold mb-1">
            Tipo de Reporte
          </label>
          <select
            value={tipoReporte}
            onChange={(e) => setTipoReporte(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white outline-none w-full sm:w-64"
          >
            <option value="solicitudes_por_tipo">Solicitudes por Tipo de Trámite</option>
            <option value="tiempos_atencion">Tiempos Promedio de Atención</option>
            <option value="productividad_grupos">Productividad por Grupo de Investigación</option>
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <label className="block text-stone-500 text-[10px] uppercase font-bold mb-1">
            Periodo Académico
          </label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white outline-none w-full sm:w-44"
          >
            <option value="2026-I">Vigencia 2026 - I</option>
            <option value="2025-II">Vigencia 2025 - II</option>
            <option value="2025-I">Vigencia 2025 - I</option>
          </select>
        </div>
      </div>

      {/* Tarjetas Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E3DC] shadow-xs space-y-1">
          <span className="text-xs text-stone-500 font-medium">Total Solicitudes Radicadas</span>
          <div className="text-2xl font-extrabold text-[#14281D]">48</div>
          <span className="text-[10px] text-emerald-700 font-semibold">+14% vs periodo anterior</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E3DC] shadow-xs space-y-1">
          <span className="text-xs text-stone-500 font-medium">Tiempo Promedio de Decisión</span>
          <div className="text-2xl font-extrabold text-[#14281D]">11.4 días</div>
          <span className="text-[10px] text-emerald-700 font-semibold">Dentro del límite institucional</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E3DC] shadow-xs space-y-1">
          <span className="text-xs text-stone-500 font-medium">Tasa de Aprobación</span>
          <div className="text-2xl font-extrabold text-[#14281D]">87.5%</div>
          <span className="text-[10px] text-stone-500 font-semibold">42 trámites avalados</span>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F7F6F2] border-b border-[#E5E3DC] text-[11px] font-bold uppercase tracking-wider text-stone-600">
            <tr>
              <th className="py-3 px-4">Tipo de Solicitud</th>
              <th className="py-3 px-4">Radicadas</th>
              <th className="py-3 px-4">Aprobadas</th>
              <th className="py-3 px-4">Con Ajustes</th>
              <th className="py-3 px-4">Rechazadas</th>
              <th className="py-3 px-4">Tiempo Promedio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E3DC]">
            <tr className="hover:bg-[#FAF9F6]">
              <td className="py-3.5 px-4 font-bold text-[#14281D]">
                Presentación de Proyecto de Investigación
              </td>
              <td className="py-3.5 px-4">22</td>
              <td className="py-3.5 px-4 text-emerald-800 font-semibold">18</td>
              <td className="py-3.5 px-4 text-amber-800 font-semibold">3</td>
              <td className="py-3.5 px-4 text-rose-800 font-semibold">1</td>
              <td className="py-3.5 px-4 text-stone-600">14 días</td>
            </tr>
            <tr className="hover:bg-[#FAF9F6]">
              <td className="py-3.5 px-4 font-bold text-[#14281D]">
                Modificación de Rubro Presupuestal
              </td>
              <td className="py-3.5 px-4">12</td>
              <td className="py-3.5 px-4 text-emerald-800 font-semibold">11</td>
              <td className="py-3.5 px-4 text-amber-800 font-semibold">1</td>
              <td className="py-3.5 px-4 text-rose-800 font-semibold">0</td>
              <td className="py-3.5 px-4 text-stone-600">7 días</td>
            </tr>
            <tr className="hover:bg-[#FAF9F6]">
              <td className="py-3.5 px-4 font-bold text-[#14281D]">
                Prórroga de Calendario de Ejecución
              </td>
              <td className="py-3.5 px-4">14</td>
              <td className="py-3.5 px-4 text-emerald-800 font-semibold">13</td>
              <td className="py-3.5 px-4 text-amber-800 font-semibold">1</td>
              <td className="py-3.5 px-4 text-rose-800 font-semibold">0</td>
              <td className="py-3.5 px-4 text-stone-600">6 días</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
