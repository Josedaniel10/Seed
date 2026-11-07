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
import { useRequestStore } from '../../features/requests/requestStore.ts';
import { useCatalogStore } from '../../features/catalog/catalogStore.ts';
import { useCommitteeSessionsStore } from '../../features/sessions/committeeSessionsStore.ts';

export function ReportsPage() {
  const { requests } = useRequestStore();
  const { types } = useCatalogStore();
  const { sessions, decisions } = useCommitteeSessionsStore();

  const [period, setPeriod] = useState('2026-I');
  const [reportType, setReportType] = useState('requests_by_type');

  // Analytical quantitative calculations (RF-36)
  const totalRequests = requests.length;
  const approvedCount = requests.filter((r) => r.current_status === 'APROBADA' || r.current_status === 'APPROVED').length;
  const approvedWithAdjustmentsCount = requests.filter(
    (r) => r.current_status === 'APROBADA_CON_AJUSTES' || r.current_status === 'APPROVED_WITH_CONDITIONS'
  ).length;
  const rejectedCount = requests.filter((r) => r.current_status === 'RECHAZADA' || r.current_status === 'REJECTED').length;
  const inProgressCount = requests.filter(
    (r) =>
      r.current_status === 'RADICADA' ||
      r.current_status === 'SUBMITTED' ||
      r.current_status === 'PENDIENTE_DOCUMENTOS' ||
      r.current_status === 'PENDING_DOCS' ||
      r.current_status === 'EN_REVISION' ||
      r.current_status === 'UNDER_REVIEW' ||
      r.current_status === 'LISTA_COMITE' ||
      r.current_status === 'READY_FOR_COMMITTEE'
  ).length;

  const approvalRate =
    totalRequests > 0
      ? Math.round(((approvedCount + approvedWithAdjustmentsCount) / totalRequests) * 100)
      : 0;

  // Quantitative breakdown by request type
  const breakdownByType = types
    .filter((t) => t.is_active)
    .map((t) => {
      const requestsOfType = requests.filter(
        (r) => r.request_type_id === t.id || (r as any).application_type_id === t.id
      );
      const approved = requestsOfType.filter(
        (r) =>
          r.current_status === 'APROBADA' ||
          r.current_status === 'APPROVED' ||
          r.current_status === 'APROBADA_CON_AJUSTES' ||
          r.current_status === 'APPROVED_WITH_CONDITIONS'
      ).length;
      const rejected = requestsOfType.filter(
        (r) => r.current_status === 'RECHAZADA' || r.current_status === 'REJECTED'
      ).length;
      const inProcess = requestsOfType.length - approved - rejected;

      return {
        id: t.id,
        code: t.code,
        name: t.name,
        total: requestsOfType.length,
        approved,
        rejected,
        inProcess,
      };
    });

  // Export report to CSV (RF-36)
  const handleExportCsv = () => {
    const csvHeader =
      'Request_Type_Code,Request_Type_Name,Total_Filed,Approved,Rejected,In_Process,Approval_Rate_Pct\n';
    const csvRows = breakdownByType
      .map((b) => {
        const rate = b.total > 0 ? Math.round((b.approved / b.total) * 100) : 0;
        return `"${b.code}","${b.name}",${b.total},${b.approved},${b.rejected},${b.inProcess},${rate}%`;
      })
      .join('\n');

    const csvContent = `${csvHeader}${csvRows}\n\nCONSOLIDATED SUMMARY\nTotal Filed Requests,${totalRequests}\nTotal Approved,${approvedCount + approvedWithAdjustmentsCount}\nRejected,${rejectedCount}\nIn Process,${inProgressCount}\nAcademic Period,${period}`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `research_committee_report_${period}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-[#14281D] text-[#A3E635]">
              <BarChart3 size={18} />
            </span>
            <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
              Management Reports & Analytics
            </h1>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Consolidated quantitative analytics, docket throughput effectiveness, and official report export (RF-36).
          </p>
        </div>

        <button
          onClick={handleExportCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs shrink-0"
        >
          <Download size={14} />
          <span>Export to CSV / Excel (RF-36)</span>
        </button>
      </div>

      {/* Selectors */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3 text-xs">
        <div className="w-full sm:w-auto">
          <label className="block text-stone-500 text-[10px] uppercase font-bold mb-1">
            Report Type
          </label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white outline-none w-full sm:w-64 font-medium"
          >
            <option value="requests_by_type">Requests by Docket Type</option>
            <option value="committee_sessions">Committee Session Effectiveness</option>
          </select>
        </div>

        <div className="w-full sm:w-auto">
          <label className="block text-stone-500 text-[10px] uppercase font-bold mb-1">
            Academic Period
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white outline-none w-full sm:w-44 font-medium"
          >
            <option value="2026-I">Term 2026 - I</option>
            <option value="2025-II">Term 2025 - II</option>
            <option value="2025-I">Term 2025 - I</option>
          </select>
        </div>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white p-5 rounded-2xl border border-[#E5E3DC] shadow-xs space-y-1">
          <span className="text-xs text-stone-500 font-medium">Total Filed Requests</span>
          <div className="text-2xl font-extrabold text-[#14281D]">{totalRequests}</div>
          <span className="text-[10px] text-stone-500 font-semibold">Live database query</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E3DC] shadow-xs space-y-1">
          <span className="text-xs text-stone-500 font-medium">Endorsed & Approved</span>
          <div className="text-2xl font-extrabold text-emerald-800">
            {approvedCount + approvedWithAdjustmentsCount}
          </div>
          <span className="text-[10px] text-emerald-700 font-semibold">
            {approvedWithAdjustmentsCount} with minor conditions
          </span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E3DC] shadow-xs space-y-1">
          <span className="text-xs text-stone-500 font-medium">Global Approval Rate</span>
          <div className="text-2xl font-extrabold text-[#14281D]">{approvalRate}%</div>
          <span className="text-[10px] text-stone-500 font-semibold">Collegiate throughput</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E5E3DC] shadow-xs space-y-1">
          <span className="text-xs text-stone-500 font-medium">Convoked Sessions</span>
          <div className="text-2xl font-extrabold text-[#14281D]">{sessions.length}</div>
          <span className="text-[10px] text-stone-500 font-semibold">
            {sessions.filter((s) => s.is_completed).length} completed formally
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] overflow-hidden shadow-xs">
        <div className="p-4 bg-[#FAF9F6] border-b border-[#E5E3DC] flex items-center justify-between">
          <h3 className="font-bold text-xs text-[#14281D] uppercase tracking-wider">
            Consolidated Breakdown by Docket Type
          </h3>
          <span className="text-[11px] text-stone-500">
            Term {period} · {breakdownByType.length} request types
          </span>
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#F7F6F2] border-b border-[#E5E3DC] text-[11px] font-bold uppercase tracking-wider text-stone-600">
            <tr>
              <th className="py-3 px-4">Code</th>
              <th className="py-3 px-4">Request Type</th>
              <th className="py-3 px-4 text-center">Filed</th>
              <th className="py-3 px-4 text-center">Approved</th>
              <th className="py-3 px-4 text-center">Rejected</th>
              <th className="py-3 px-4 text-center">In Process</th>
              <th className="py-3 px-4 text-right">Approval Rate</th>
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
