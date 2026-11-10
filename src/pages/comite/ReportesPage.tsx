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
  AlertCircle,
  FileText,
  PieChart,
} from 'lucide-react';
import { useApplicationStore } from '../../features/applications/applicationStore.ts';
import { useCatalogStore } from '../../features/catalog/catalogStore.ts';
import { useCommitteeSessionsStore } from '../../features/sessions/committeeSessionsStore.ts';

export function ReportesPage() {
  const { requests } = useApplicationStore();
  const { types } = useCatalogStore();
  const { sessions, decisions } = useCommitteeSessionsStore();

  const [periodo, setPeriodo] = useState('2026-I');
  const [tipoReporte, setTipoReporte] = useState('solicitudes_por_tipo');

  // Cálculos analíticos basados en la base de datos real (RF-36)
  const totalApplications = requests.length;
  const approvedCount = requests.filter((a) => a.current_status === 'APROBADA').length;
  const approvedWithAdjustmentsCount = requests.filter(
    (a) => a.current_status === 'APROBADA_CON_AJUSTES'
  ).length;
  const rejectedCount = requests.filter((a) => a.current_status === 'RECHAZADA').length;
  const inProgressCount = requests.filter(
    (a) =>
      a.current_status === 'RADICADA' ||
      a.current_status === 'PENDIENTE_DOCUMENTOS' ||
      a.current_status === 'EN_REVISION' ||
      a.current_status === 'LISTA_COMITE'
  ).length;

  const approvalRate =
    totalApplications > 0
      ? Math.round(((approvedCount + approvedWithAdjustmentsCount) / totalApplications) * 100)
      : 0;

  // Desglose cuantitativo por tipo de solicitud
  const breakdownByType = types
    .filter((t) => t.is_active)
    .map((t) => {
      const appsOfType = requests.filter((a) => a.application_type_id === t.id);
      const approved = appsOfType.filter(
        (a) => a.current_status === 'APROBADA' || a.current_status === 'APROBADA_CON_AJUSTES'
      ).length;
      const rejected = appsOfType.filter((a) => a.current_status === 'RECHAZADA').length;
      const inProcess = appsOfType.length - approved - rejected;

      return {
        id: t.id,
        code: t.code,
        name: t.name,
        total: appsOfType.length,
        approved,
        rejected,
        inProcess,
      };
    });

  // Exportar reporte consolidado a formato CSV estructurado (RF-36)
  const handleExportCsv = () => {
    const csvHeader =
      'Codigo_Tramite,Nombre_Tramite,Total_Radicadas,Aprobadas,Rechazadas,En_Tramite,Tasa_Aprobacion_Pct\n';
    const csvRows = breakdownByType
      .map((b) => {
        const rate = b.total > 0 ? Math.round((b.approved / b.total) * 100) : 0;
        return `"${b.code}","${b.name}",${b.total},${b.approved},${b.rejected},${b.inProcess},${rate}%`;
      })
      .join('\n');

    const csvContent = `${csvHeader}${csvRows}\n\nRESUMEN CONSOLIDADO\nTotal Radicadas,${totalApplications}\nAprobadas Totales,${approvedCount + approvedWithAdjustmentsCount}\nRechazadas,${rejectedCount}\nEn Tramite,${inProgressCount}\nPeriodo Academico,${periodo}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte_comite_investigaciones_${periodo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#14281D] text-[#A3E635]">
              <BarChart3 size={18} />
            </span>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
              Reportes e Indicadores de Gestión
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Analítica cuantitativa consolidada, efectividad de trámites y exportación oficial (RF-36).
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs shrink-0"
        >
          <Download size={14} />
          <span>Exportar a CSV / Excel (RF-36)</span>
        </button>
      </div>

      {/* Selectores de Periodo y Tipología */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3 text-xs">
        <div className="w-full sm:w-auto">
          <label className="block text-stone-500 text-[10px] uppercase font-bold mb-1">
            Tipo de Reporte
          </label>
          <select
            value={tipoReporte}
            onChange={(e) => setTipoReporte(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white outline-none w-full sm:w-64 font-medium"
          >
            <option value="solicitudes_por_tipo">Solicitudes por Tipo de Trámite</option>
            <option value="sesiones_comite">Efectividad de Sesiones de Comité</option>
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <label className="block text-stone-500 text-[10px] uppercase font-bold mb-1">
            Periodo Académico
          </label>
          <select
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white outline-none w-full sm:w-44 font-medium"
          >
            <option value="2026-I">Vigencia 2026 - I</option>
            <option value="2025-II">Vigencia 2025 - II</option>
            <option value="2025-I">Vigencia 2025 - I</option>
          </select>
        </div>
      </div>

      {/* Franja de Indicadores Cuantitativos Consolidados */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E3DC] shadow-xs space-y-1">
          <span className="text-xs text-stone-500 font-medium">Expedientes Totales Radicados</span>
          <div className="text-2xl font-extrabold text-[#14281D]">{totalApplications}</div>
          <span className="text-[10px] text-stone-500 font-semibold">Base de datos en tiempo real</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E3DC] shadow-xs space-y-1">
          <span className="text-xs text-stone-500 font-medium">Avalados y Aprobados</span>
          <div className="text-2xl font-extrabold text-emerald-800">
            {approvedCount + approvedWithAdjustmentsCount}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold">
            {approvedWithAdjustmentsCount} con ajustes menores
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E3DC] shadow-xs space-y-1">
          <span className="text-xs text-stone-500 font-medium">Tasa de Aprobación Global</span>
          <div className="text-2xl font-extrabold text-[#14281D]">{approvalRate}%</div>
          <span className="text-[10px] text-stone-500 font-semibold">Efectividad colegiada</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E3DC] shadow-xs space-y-1">
          <span className="text-xs text-stone-500 font-medium">Sesiones Convocadas</span>
          <div className="text-2xl font-extrabold text-[#14281D]">{sessions.length}</div>
          <span className="text-[10px] text-stone-500 font-semibold">
            {sessions.filter((s) => s.is_completed).length} finalizadas formalmente
          </span>
        </div>
      </div>

      {/* Tabla Estructurada Consolidada por Tipología */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] overflow-hidden shadow-xs">
        <div className="p-4 bg-[#FAF9F6] border-b border-[#E5E3DC] flex items-center justify-between">
          <h3 className="font-bold text-xs text-[#14281D] uppercase tracking-wider">
            Consolidado Analítico por Tipología de Trámite
          </h3>
          <span className="text-[11px] text-stone-500">
            Vigencia {periodo} · {breakdownByType.length} trámites institucionales
          </span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#F7F6F2] border-b border-[#E5E3DC] text-[11px] font-bold uppercase tracking-wider text-stone-600">
            <tr>
              <th className="py-3 px-4">Código</th>
              <th className="py-3 px-4">Tipo de Solicitud</th>
              <th className="py-3 px-4 text-center">Radicadas</th>
              <th className="py-3 px-4 text-center">Aprobadas</th>
              <th className="py-3 px-4 text-center">Rechazadas</th>
              <th className="py-3 px-4 text-center">En Trámite</th>
              <th className="py-3 px-4 text-right">Efectividad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E3DC]">
            {breakdownByType.map((item) => {
              const rate = item.total > 0 ? Math.round((item.approved / item.total) * 100) : 0;

              return (
                <tr key={item.id} className="hover:bg-[#FAF9F6] transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#14281D]">
                    {item.code}
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-stone-800">
                    {item.name}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-stone-700">
                    {item.total}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-emerald-800">
                    {item.approved}
                  </td>
                  <td className="py-3.5 px-4 text-center font-bold text-rose-700">
                    {item.rejected}
                  </td>
                  <td className="py-3.5 px-4 text-center font-semibold text-stone-500">
                    {item.inProcess}
                  </td>
                  <td className="py-3.5 px-4 text-right font-bold text-[#14281D]">
                    {rate}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
