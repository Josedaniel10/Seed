import React, { useState } from 'react';
import {
  FileCheck,
  Search,
  Filter,
  Download,
  Calendar,
  FileText,
  Eye,
  CheckCircle2,
  Lock,
  X,
  FileCode,
  Building,
} from 'lucide-react';
import { useMinutesStore } from '../../features/minutes/minutesStore.ts';
import { useCommitteeSessionsStore } from '../../features/sessions/committeeSessionsStore.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { CommitteeMinutes } from '../../types/database.ts';

export function MinutesPage() {
  const { user } = useSessionStore();
  const { minutes, searchMinutes, approveMinutes, updateDraftContent, exportMinutePdf } =
    useMinutesStore();
  const { sessions } = useCommitteeSessionsStore();

  const [search, setSearch] = useState('');
  const [selectedMinute, setSelectedMinute] = useState<CommitteeMinutes | null>(null);
  const [isEditingDraft, setIsEditingDraft] = useState(false);
  const [editedDraftContent, setEditedDraftContent] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const filteredMinutes = search ? searchMinutes(search) : minutes;
  const isSecretaryOrAdmin =
    user?.activeRole === 'secretary' ||
    user?.activeRole === 'secretario' ||
    user?.activeRole === 'admin';

  const handleOpenDetail = (min: CommitteeMinutes) => {
    setSelectedMinute(min);
    setEditedDraftContent(min.draft_content);
    setIsEditingDraft(false);
    setActionError(null);
    setActionSuccess(null);
  };

  const handleSaveDraft = async () => {
    if (!selectedMinute) return;
    setActionError(null);

    const res = await updateDraftContent(
      selectedMinute.id,
      editedDraftContent,
      user?.id || 'usr-sec-04',
      user?.fullName || 'Technical Secretary'
    );

    if (!res.success) {
      setActionError(res.error || 'Error saving draft.');
    } else {
      setSelectedMinute(res.minute || null);
      setIsEditingDraft(false);
      setActionSuccess('Draft minutes updated successfully.');
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  const handleApproveMinutes = async () => {
    if (!selectedMinute) return;
    setActionError(null);

    const res = await approveMinutes(
      selectedMinute.id,
      user?.id || 'usr-sec-04',
      user?.fullName || 'Technical Secretary'
    );

    if (!res.success) {
      setActionError(res.error || 'Error approving minutes.');
    } else {
      setSelectedMinute(res.minute || null);
      setActionSuccess('Minutes formally approved and signed. Stamped as immutable (RNF-03).');
      setTimeout(() => setActionSuccess(null), 3500);
    }
  };

  const handleDownload = async (minute: CommitteeMinutes) => {
    const res = await exportMinutePdf(minute.id);
    if (res.success && res.pdfUrl) {
      const a = document.createElement('a');
      a.href = res.pdfUrl;
      a.download = res.fileName || `${minute.minute_number}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(res.pdfUrl);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-[#14281D] text-[#A3E635]">
            <FileCheck size={18} />
          </span>
          <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
            Official Minutes & Committee Agreements
          </h1>
        </div>
        <p className="text-xs text-stone-500 mt-1">
          Annual consecutive sequence (RF-31), automatic consolidation of agenda and agreements, solemn approval, and immutability (RNF-03).
        </p>
      </div>

      {/* Historical Search (RF-32) */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 text-stone-400" size={15} />
          <input
            type="text"
            placeholder="Search by minute number (e.g. Minutes 001 of 2026), request filing, or agreement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E3DC] focus:border-[#14281D] outline-none text-xs"
          />
        </div>
        <div className="text-[11px] text-stone-500 shrink-0 font-medium self-center">
          Showing {filteredMinutes.length} institutional minutes
        </div>
      </div>

      {/* Minutes Table */}
      <div className="bg-white rounded-2xl border border-[#E5E3DC] overflow-hidden shadow-xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#F7F6F2] border-b border-[#E5E3DC] text-[11px] font-bold uppercase tracking-wider text-stone-600">
            <tr>
              <th className="py-3 px-4">Minutes Number (RF-31)</th>
              <th className="py-3 px-4">Calendar Year</th>
              <th className="py-3 px-4">Linked Session</th>
              <th className="py-3 px-4">Legal Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E3DC]">
            {filteredMinutes.map((acta) => {
              const ses = sessions.find((s) => s.id === acta.session_id);

              return (
                <tr key={acta.id} className="hover:bg-[#FAF9F6] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#14281D]">
                    <div className="flex items-center gap-2">
                      <FileText size={15} className="text-stone-400" />
                      <span>{acta.minute_number}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-stone-600 font-mono">
                    {acta.year}
                  </td>
                  <td className="py-3.5 px-4 text-stone-600">
                    {ses?.session_number || acta.session_id}
                  </td>
                  <td className="py-3.5 px-4">
                    {acta.is_approved ? (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200 inline-flex items-center gap-1">
                        <Lock size={10} />
                        <span>Approved & Immutable (RNF-03)</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        Draft in Review
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenDetail(acta)}
                      className="px-2.5 py-1.5 border border-[#E5E3DC] rounded-lg hover:bg-stone-50 font-semibold text-xs inline-flex items-center gap-1 cursor-pointer text-[#14281D]"
                    >
                      <Eye size={12} />
                      <span>View</span>
                    </button>
                    <button
                      onClick={() => handleDownload(acta)}
                      className="px-2.5 py-1.5 bg-[#14281D] hover:bg-[#1E3A2B] text-white rounded-lg font-semibold text-xs inline-flex items-center gap-1 cursor-pointer shadow-xs"
                    >
                      <Download size={12} />
                      <span>Download</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: View, Edit Draft & Approve Minutes */}
      {selectedMinute && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl space-y-4 text-xs max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-[#14281D] text-white">
                  <FileCheck size={16} />
                </span>
                <div>
                  <h3 className="font-bold text-sm text-[#14281D]">
                    {selectedMinute.minute_number}
                  </h3>
                  <div className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-2">
                    <span>Year {selectedMinute.year}</span>
                    <span>·</span>
                    <span>
                      {selectedMinute.is_approved
                        ? `Approved on ${new Date(selectedMinute.approved_at || '').toLocaleDateString('en-US')}`
                        : 'Status: Draft in progress'}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedMinute(null)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 shrink-0">
                {actionError}
              </div>
            )}

            {actionSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 shrink-0">
                {actionSuccess}
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {isEditingDraft ? (
                <div>
                  <label className="block font-semibold text-stone-700 mb-1 text-[11px]">
                    Edit Text and Commitments (RF-30):
                  </label>
                  <textarea
                    rows={16}
                    value={editedDraftContent}
                    onChange={(e) => setEditedDraftContent(e.target.value)}
                    className="w-full p-4 rounded-xl border border-[#E5E3DC] font-mono text-xs leading-relaxed outline-none focus:border-[#14281D]"
                  />
                </div>
              ) : (
                <div className="p-5 rounded-xl border border-[#E5E3DC] bg-[#FAF9F6] font-mono text-xs text-stone-700 leading-relaxed whitespace-pre-wrap">
                  {selectedMinute.draft_content}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {!selectedMinute.is_approved && isSecretaryOrAdmin && (
                  <>
                    {isEditingDraft ? (
                      <button
                        onClick={handleSaveDraft}
                        className="px-3.5 py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white rounded-xl font-bold cursor-pointer"
                      >
                        Save Adjustments
                      </button>
                    ) : (
                      <button
                        onClick={() => setIsEditingDraft(true)}
                        className="px-3.5 py-2 border border-[#E5E3DC] hover:bg-stone-50 rounded-xl font-bold text-[#14281D] cursor-pointer"
                      >
                        Edit Commitments
                      </button>
                    )}
                  </>
                )}

                {!selectedMinute.is_approved && isSecretaryOrAdmin && (
                  <button
                    onClick={handleApproveMinutes}
                    className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <CheckCircle2 size={13} />
                    <span>Formally Approve Minutes (RNF-03)</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleDownload(selectedMinute)}
                  className="px-3.5 py-2 border border-[#E5E3DC] hover:bg-stone-50 rounded-xl font-bold text-[#14281D] flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download File</span>
                </button>
                <button
                  onClick={() => setSelectedMinute(null)}
                  className="px-3.5 py-2 border border-stone-200 text-stone-600 rounded-xl font-semibold hover:bg-stone-50 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
