import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  FileText,
  FileCheck,
  Download,
  Plus,
  Trash2,
  ArrowLeft,
  Scale,
  Lock,
  AlertTriangle,
  AlertCircle,
  Clock,
  Sparkles,
  Info,
} from 'lucide-react';
import { useCommitteeSessionsStore } from '../../features/sessions/committeeSessionsStore.ts';
import { useRequestStore } from '../../features/requests/requestStore.ts';
import { useUserStore } from '../../features/users/userStore.ts';
import { useSessionStore } from '../../stores/session.store.ts';
import { SessionDecisionType } from '../../types/database.ts';

export function SessionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSessionStore();

  const {
    sessions,
    getAgendaBySession,
    addApplicationToAgenda,
    removeApplicationFromAgenda,
    closeAgendaAndSummon,
    getAttendanceBySession,
    toggleAttendance,
    checkSessionQuorum,
    registerSessionDecision,
    getDecisionsBySession,
    finalizeSession,
  } = useCommitteeSessionsStore();

  const { requests, getRequestById } = useRequestStore();
  const { users } = useUserStore();

  const session = sessions.find((s) => s.id === id);

  const [activeTab, setActiveTab] = useState<'agenda' | 'quorum' | 'decisions' | 'minutes'>('agenda');
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('usr-003');
  const [selectedRequestId, setSelectedRequestId] = useState<string>('');
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Deliberation state per request
  const [decisionPayloads, setDecisionPayloads] = useState<
    Record<string, { decision: SessionDecisionType; justification: string }>
  >({});

  if (!session) {
    return (
      <div className="bg-white rounded-2xl border border-[#E5E3DC] p-8 text-center space-y-4 max-w-lg mx-auto">
        <AlertTriangle size={36} className="text-amber-500 mx-auto" />
        <h2 className="text-base font-bold text-[#14281D]">Session Not Found</h2>
        <p className="text-xs text-stone-500">
          The requested session identifier does not match any active record in the research committee.
        </p>
        <button
          onClick={() => navigate('/sessions')}
          className="px-4 py-2 bg-[#14281D] text-white rounded-xl text-xs font-bold hover:bg-[#1E3A2B] cursor-pointer"
        >
          Return to Sessions
        </button>
      </div>
    );
  }

  const agenda = getAgendaBySession(session.id);
  const attendances = getAttendanceBySession(session.id);
  const quorum = checkSessionQuorum(session.id);
  const decisions = getDecisionsBySession(session.id);

  // Eligible requests for agenda: Requests in LISTA_COMITE (RN-04)
  const agendaReqIds = new Set(agenda.map((a) => (a as any).request_id || a.application_id));
  const candidateRequests = requests.filter(
    (r) =>
      (r.current_status === 'LISTA_COMITE' || r.current_status === 'READY_FOR_COMMITTEE') &&
      !agendaReqIds.has(r.id)
  );

  const committeeMembers = users.filter(
    (u) =>
      u.role === 'committee_member' ||
      u.role === 'integrante_comite' ||
      u.role === 'secretary' ||
      u.role === 'secretario'
  );

  const isSecretaryOrAdmin =
    user?.activeRole === 'secretary' ||
    user?.activeRole === 'secretario' ||
    user?.activeRole === 'admin';

  // Handler: Add request to agenda
  const handleAddToAgenda = async (reqIdToAdd: string) => {
    setActionError(null);
    setActionSuccess(null);

    const res = await addApplicationToAgenda(
      session.id,
      reqIdToAdd,
      selectedSpeakerId || null,
      user?.id || 'usr-sec-04',
      user?.fullName || 'Technical Secretary'
    );

    if (!res.success) {
      setActionError(res.error || 'Error adding request to agenda.');
    } else {
      setActionSuccess('Request docket successfully added to the agenda.');
      setSelectedRequestId('');
      setTimeout(() => setActionSuccess(null), 3000);
    }
  };

  // Handler: Remove from agenda
  const handleRemoveFromAgenda = async (reqIdToRemove: string) => {
    setActionError(null);
    const res = await removeApplicationFromAgenda(
      session.id,
      reqIdToRemove,
      user?.id || 'usr-sec-04',
      user?.fullName || 'Technical Secretary'
    );
    if (!res.success) {
      setActionError(res.error || 'Error removing request from agenda.');
    }
  };

  // Handler: Close agenda (RF-26)
  const handleCloseAgenda = async () => {
    setActionError(null);
    const res = await closeAgendaAndSummon(
      session.id,
      user?.id || 'usr-sec-04',
      user?.fullName || 'Technical Secretary'
    );
    if (!res.success) {
      setActionError(res.error || 'Error closing agenda.');
    } else {
      setActionSuccess('Agenda formally closed. Official convocation dispatched.');
      setTimeout(() => setActionSuccess(null), 3500);
    }
  };

  // Handler: Register Collegiate Decision (RF-28, RN-05, RN-06, RN-07)
  const handleRegisterDecision = async (reqId: string) => {
    setActionError(null);
    const itemData = decisionPayloads[reqId] || {
      decision: 'APROBADA' as SessionDecisionType,
      justification: '',
    };

    if (!itemData.justification.trim()) {
      setActionError('RN-05: Registering a collegiate decision requires written justification.');
      return;
    }

    const res = await registerSessionDecision(
      session.id,
      reqId,
      itemData.decision,
      itemData.justification,
      user?.id || 'usr-sec-04',
      user?.fullName || 'Technical Secretary'
    );

    if (!res.success) {
      setActionError(res.error || 'Error registering decision.');
    } else {
      setActionSuccess('Collegiate decision recorded and request workflow updated.');
      setTimeout(() => setActionSuccess(null), 3500);
    }
  };

  // Handler: Finalize session
  const handleFinalizeSession = async () => {
    setActionError(null);
    const res = await finalizeSession(
      session.id,
      user?.id || 'usr-sec-04',
      user?.fullName || 'Technical Secretary'
    );
    if (!res.success) {
      setActionError(res.error || 'Error completing session.');
    } else {
      setActionSuccess('Session completed successfully with all agreements recorded.');
      setTimeout(() => setActionSuccess(null), 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Return button and header */}
      <div className="space-y-2">
        <button
          onClick={() => navigate('/sessions')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-stone-500 hover:text-[#14281D] cursor-pointer"
        >
          <ArrowLeft size={13} />
          <span>Return to Committee Sessions</span>
        </button>

        <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-3 rounded-xl bg-[#14281D] text-[#A3E635]">
              <Calendar size={22} />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-[#14281D]">
                  {session.session_number}
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200 uppercase">
                  {session.session_type}
                </span>
                {session.is_agenda_closed && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200 flex items-center gap-1">
                    <Lock size={10} />
                    <span>Agenda Closed</span>
                  </span>
                )}
                {session.is_completed && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-200 text-stone-800 border border-stone-300">
                    Completed
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-2">
                <span>{new Date(session.scheduled_at).toLocaleString('en-US')}</span>
                <span>·</span>
                <span>{session.location_or_url}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Live Quorum Monitor */}
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border ${
                quorum.hasQuorum
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <CheckCircle2 size={14} />
              <span>
                {quorum.attendedCount} of {quorum.totalMembers} members ({quorum.hasQuorum ? 'Quorum Valid' : 'No Quorum'})
              </span>
            </span>

            {isSecretaryOrAdmin && !session.is_completed && (
              <button
                onClick={handleFinalizeSession}
                className="px-3.5 py-1.5 rounded-xl bg-[#14281D] hover:bg-[#1E3A2B] text-white text-xs font-bold cursor-pointer transition-colors shadow-xs"
              >
                Complete Session
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Action Feedback */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="shrink-0 text-rose-600" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="cursor-pointer text-stone-500 hover:text-stone-800">
            <XCircle size={14} />
          </button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Session Navigation Tabs */}
      <div className="flex border-b border-[#E5E3DC] gap-6 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('agenda')}
          className={`pb-3 cursor-pointer transition-colors border-b-2 shrink-0 ${
            activeTab === 'agenda'
              ? 'border-[#14281D] text-[#14281D]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Agenda & Docket ({agenda.length})
        </button>
        <button
          onClick={() => setActiveTab('quorum')}
          className={`pb-3 cursor-pointer transition-colors border-b-2 shrink-0 ${
            activeTab === 'quorum'
              ? 'border-[#14281D] text-[#14281D]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Attendance & Quorum ({quorum.attendedCount}/{quorum.totalMembers})
        </button>
        <button
          onClick={() => setActiveTab('decisions')}
          className={`pb-3 cursor-pointer transition-colors border-b-2 shrink-0 ${
            activeTab === 'decisions'
              ? 'border-[#14281D] text-[#14281D]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Decisions & Deliberation ({decisions.length}/{agenda.length})
        </button>
        <button
          onClick={() => setActiveTab('minutes')}
          className={`pb-3 cursor-pointer transition-colors border-b-2 shrink-0 ${
            activeTab === 'minutes'
              ? 'border-[#14281D] text-[#14281D]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Official Minutes Draft
        </button>
      </div>

      {/* Tab 1: Agenda & Docket (RF-25, RN-04, RF-26) */}
      {activeTab === 'agenda' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="font-bold text-xs text-[#14281D] uppercase tracking-wider">
                  Approved Agenda
                </h3>
                <p className="text-[11px] text-stone-500 mt-0.5">
                  Requests assembled for deliberation during this collegiate session.
                </p>
              </div>

              {isSecretaryOrAdmin && !session.is_agenda_closed && agenda.length > 0 && (
                <button
                  onClick={handleCloseAgenda}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-800 hover:bg-amber-900 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Lock size={12} />
                  <span>Close Agenda & Summon (RF-26)</span>
                </button>
              )}
            </div>

            {agenda.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500 border border-dashed border-stone-200 rounded-xl space-y-1">
                <FileText size={24} className="mx-auto text-stone-400 mb-1" />
                <p className="font-bold text-stone-700">No requests incorporated into the agenda</p>
                <p className="text-[11px]">
                  Select requests in "Ready for Committee" status from the side panel.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                {agenda.map((item) => {
                  const reqId = (item as any).request_id || item.application_id;
                  const reqData = getRequestById(reqId);
                  const decisionRecorded = decisions.find(
                    (d) => (d as any).request_id === reqId || d.application_id === reqId
                  );

                  return (
                    <div
                      key={item.id}
                      className="p-4 rounded-xl border border-[#E5E3DC] bg-[#FAF9F6] space-y-2.5 hover:border-stone-400 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-[#14281D] text-white font-mono font-bold text-[11px] flex items-center justify-center">
                            {item.agenda_order}
                          </span>
                          <span className="font-mono font-bold text-[#14281D] bg-white px-2 py-0.5 rounded border border-stone-200">
                            {reqData?.filing_number || reqId}
                          </span>
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                            {reqData?.current_status}
                          </span>
                          {decisionRecorded && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Decision: {decisionRecorded.decision}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-[11px] font-semibold text-stone-600">
                            Speaker: {item.speaker_name || 'Unassigned'}
                          </span>
                          {isSecretaryOrAdmin && !session.is_agenda_closed && (
                            <button
                              onClick={() => handleRemoveFromAgenda(reqId)}
                              className="text-stone-400 hover:text-rose-600 cursor-pointer p-1"
                              title="Remove from agenda"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>

                      <h4 className="font-bold text-xs text-[#14281D]">
                        {reqData?.title || 'Docket in deliberation'}
                      </h4>

                      <div className="text-[11px] text-stone-500">
                        {reqData?.abstract}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Side Panel: Eligible Requests for Agenda (RN-04) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E5E3DC] p-5 shadow-xs space-y-4 text-xs">
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#14281D]" />
                <h4 className="font-bold text-xs text-[#14281D]">Ready for Committee (RN-04)</h4>
              </div>
              <p className="text-[11px] text-stone-500 mt-1">
                Under rule <strong>RN-04</strong>, only requests in <strong>LISTA_COMITE</strong> status with prior technical concept are eligible.
              </p>
            </div>

            {session.is_agenda_closed ? (
              <div className="p-3.5 rounded-xl bg-stone-50 border border-stone-200 text-stone-600 text-xs flex items-center gap-2">
                <Lock size={15} className="shrink-0 text-amber-600" />
                <span>The agenda is closed. No additional requests may be added (RN-04).</span>
              </div>
            ) : candidateRequests.length === 0 ? (
              <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-center text-[11px] text-stone-500">
                No further requests currently ready for committee.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1 text-[11px]">
                    Select Speaker / Topic Lead
                  </label>
                  <select
                    value={selectedSpeakerId}
                    onChange={(e) => setSelectedSpeakerId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E3DC] bg-white outline-none text-xs"
                  >
                    {committeeMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {candidateRequests.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="p-3 rounded-xl border border-[#E5E3DC] bg-[#FAF9F6] space-y-2 hover:border-[#14281D] transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-[#14281D] text-[11px]">
                          {candidate.filing_number}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          {candidate.current_status}
                        </span>
                      </div>
                      <p className="font-semibold text-stone-800 line-clamp-2 text-[11px]">
                        {candidate.title}
                      </p>
                      <button
                        onClick={() => handleAddToAgenda(candidate.id)}
                        className="w-full py-1.5 rounded-lg bg-[#14281D] hover:bg-[#1E3A2B] text-white font-bold text-[11px] flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-xs"
                      >
                        <Plus size={12} />
                        <span>Add to Agenda (RN-04)</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Attendance & Quorum (RF-27, RN-07) */}
      {activeTab === 'quorum' && (
        <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <Users size={16} className="text-[#14281D]" />
                <h3 className="font-bold text-sm text-[#14281D]">
                  Attendance Register & Regulatory Quorum (RF-27)
                </h3>
              </div>
              <p className="text-stone-500 mt-0.5 text-[11px]">
                Rule <strong>RN-07</strong>: Deliberation and voting requires at least half plus one of the committee members ({quorum.requiredCount} of {quorum.totalMembers}).
              </p>
            </div>

            <div
              className={`p-3 rounded-xl border flex items-center gap-3 ${
                quorum.hasQuorum
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="text-right">
                <span className="font-extrabold text-base block">
                  {quorum.attendedCount} / {quorum.totalMembers}
                </span>
                <span className="text-[10px] font-semibold">
                  {quorum.hasQuorum ? 'Valid Quorum' : 'Insufficient Quorum'}
                </span>
              </div>
              {quorum.hasQuorum ? (
                <CheckCircle2 size={24} className="text-emerald-700" />
              ) : (
                <XCircle size={24} className="text-rose-600" />
              )}
            </div>
          </div>

          <div className="divide-y divide-[#E5E3DC]">
            {attendances.map((att) => (
              <div
                key={att.id}
                className="py-3 px-2 flex items-center justify-between hover:bg-[#FAF9F6] rounded-xl transition-colors"
              >
                <div>
                  <div className="font-bold text-[#14281D]">{att.user_name}</div>
                  <div className="text-[11px] text-stone-500 flex items-center gap-2">
                    <span>{att.user_role}</span>
                    <span>·</span>
                    <span className="text-stone-400">{att.notes || 'No annotations'}</span>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <span className={`text-[11px] font-bold ${att.attended ? 'text-emerald-800' : 'text-stone-400'}`}>
                    {att.attended ? 'Present' : 'Absent'}
                  </span>
                  <input
                    type="checkbox"
                    checked={att.attended}
                    onChange={(e) =>
                      toggleAttendance(
                        session.id,
                        att.user_id,
                        e.target.checked,
                        e.target.checked ? 'In Person' : 'Unjustified Absence'
                      )
                    }
                    className="w-4 h-4 text-[#14281D] rounded cursor-pointer accent-[#14281D]"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Collegiate Decisions (RF-28, RN-05, RN-06, RN-07) */}
      {activeTab === 'decisions' && (
        <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <Scale size={16} className="text-[#14281D]" />
                <h3 className="font-bold text-sm text-[#14281D]">
                  Deliberation & Decisions by Request (RF-28)
                </h3>
              </div>
              <p className="text-stone-500 text-[11px] mt-0.5">
                Rules: <strong>RN-07</strong> (Quorum lock), <strong>RN-05</strong> (Mandatory written rationale), <strong>RN-06</strong> (Postponement preserves status).
              </p>
            </div>

            <div className="text-right">
              <span className="font-bold text-xs text-[#14281D]">
                {decisions.length} of {agenda.length} decided
              </span>
            </div>
          </div>

          {!quorum.hasQuorum && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-xs">Voting and Decisions Locked Due to Lack of Quorum (RN-07)</p>
                <p className="text-[11px] mt-0.5">
                  The committee only has {quorum.attendedCount} of the {quorum.requiredCount} required members in attendance. Verify attendance under the "Attendance & Quorum" tab before recording decisions.
                </p>
              </div>
            </div>
          )}

          {agenda.length === 0 ? (
            <div className="p-6 text-center text-stone-500">
              No requests on the agenda to deliberate.
            </div>
          ) : (
            <div className="space-y-4">
              {agenda.map((item) => {
                const reqId = (item as any).request_id || item.application_id;
                const reqData = getRequestById(reqId);
                const recordedDecision = decisions.find(
                  (d) => (d as any).request_id === reqId || d.application_id === reqId
                );
                const currentPayload = decisionPayloads[reqId] || {
                  decision: recordedDecision?.decision || ('APROBADA' as SessionDecisionType),
                  justification: recordedDecision?.justification || '',
                };

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-2xl border border-[#E5E3DC] bg-[#FAF9F6] space-y-3.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-200">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white bg-[#14281D] px-2 py-0.5 rounded text-[11px]">
                          Item #{item.agenda_order}
                        </span>
                        <span className="font-mono font-bold text-[#14281D]">
                          {reqData?.filing_number}
                        </span>
                        <span className="text-[11px] text-stone-500">
                          Speaker: {item.speaker_name || 'Unassigned'}
                        </span>
                      </div>

                      {recordedDecision && (
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-900 border border-emerald-200">
                          Recorded Decision: {recordedDecision.decision}
                        </span>
                      )}
                    </div>

                    <h4 className="font-bold text-xs text-[#14281D]">{reqData?.title}</h4>
                    <p className="text-[11px] text-stone-500">{reqData?.abstract}</p>

                    {/* Collegiate Decision Form */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2">
                      <div className="md:col-span-4 space-y-1">
                        <label className="block font-semibold text-stone-700 text-[11px]">
                          Decision Outcome
                        </label>
                        <select
                          disabled={!quorum.hasQuorum || !isSecretaryOrAdmin}
                          value={currentPayload.decision}
                          onChange={(e) =>
                            setDecisionPayloads({
                              ...decisionPayloads,
                              [reqId]: {
                                ...currentPayload,
                                decision: e.target.value as SessionDecisionType,
                              },
                            })
                          }
                          className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white outline-none font-medium disabled:bg-stone-100 disabled:text-stone-400"
                        >
                          <option value="APROBADA">Approved</option>
                          <option value="APROBADA_CON_AJUSTES">Approved with Adjustments</option>
                          <option value="RECHAZADA">Rejected</option>
                          <option value="APLAZADA">Postponed (Preserves LISTA_COMITE - RN-06)</option>
                        </select>
                      </div>

                      <div className="md:col-span-6 space-y-1">
                        <label className="block font-semibold text-stone-700 text-[11px]">
                          Substantiated Written Justification (RN-05)
                        </label>
                        <input
                          type="text"
                          disabled={!quorum.hasQuorum || !isSecretaryOrAdmin}
                          value={currentPayload.justification}
                          onChange={(e) =>
                            setDecisionPayloads({
                              ...decisionPayloads,
                              [reqId]: {
                                ...currentPayload,
                                justification: e.target.value,
                              },
                            })
                          }
                          placeholder="Technical and legal rationale for the collegiate decision..."
                          className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white outline-none font-medium disabled:bg-stone-100 disabled:text-stone-400"
                        />
                      </div>

                      <div className="md:col-span-2 flex items-end">
                        <button
                          disabled={!quorum.hasQuorum || !isSecretaryOrAdmin}
                          onClick={() => handleRegisterDecision(reqId)}
                          className="w-full py-2 bg-[#14281D] hover:bg-[#1E3A2B] text-white rounded-xl font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
                        >
                          {recordedDecision ? 'Update' : 'Record'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Minutes Draft (RF-29, RF-31) */}
      {activeTab === 'minutes' && (
        <div className="bg-white rounded-2xl border border-[#E5E3DC] p-6 shadow-xs space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <div className="flex items-center gap-2">
                <FileCheck size={16} className="text-[#14281D]" />
                <h3 className="font-bold text-sm text-[#14281D]">
                  Consolidated Draft Minutes (RF-29)
                </h3>
              </div>
              <p className="text-stone-500 text-[11px] mt-0.5">
                Automatically generated from agenda, attendance register, and recorded decisions.
              </p>
            </div>

            <button
              onClick={() => navigate('/minutes')}
              className="px-3.5 py-1.5 bg-[#14281D] hover:bg-[#1E3A2B] text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download size={13} />
              <span>View in Minutes Module</span>
            </button>
          </div>

          <div className="p-6 rounded-2xl border border-[#E5E3DC] bg-[#FAF9F6] font-mono text-xs text-stone-700 leading-relaxed space-y-4">
            <div className="text-center font-bold text-[#14281D] text-sm pb-2 border-b border-stone-200">
              OFFICIAL MINUTES OF {session.session_number.toUpperCase()}
            </div>

            <div>
              <p><strong>DATE & TIME:</strong> {new Date(session.scheduled_at).toLocaleString('en-US')}</p>
              <p><strong>LOCATION / MODALITY:</strong> {session.location_or_url}</p>
              <p><strong>SESSION TYPE:</strong> {session.session_type}</p>
            </div>

            <div>
              <p className="font-bold text-[#14281D]">1. QUORUM VERIFICATION (RN-07):</p>
              <p>
                Attendees ({quorum.attendedCount} of {quorum.totalMembers}):{' '}
                {attendances
                  .filter((a) => a.attended)
                  .map((a) => `${a.user_name} (${a.user_role})`)
                  .join(', ')}
              </p>
              <p className="text-emerald-800 font-bold">
                Ruling: {quorum.hasQuorum ? 'VALID REGULATORY QUORUM' : 'INSUFFICIENT QUORUM'}
              </p>
            </div>

            <div>
              <p className="font-bold text-[#14281D]">2. DECISIONS & AGREEMENTS ADOPTED:</p>
              {decisions.length === 0 ? (
                <p className="italic text-stone-500">Pending deliberation agreements recording.</p>
              ) : (
                <ol className="list-decimal pl-4 space-y-2 mt-1">
                  {decisions.map((dec) => {
                    const decReqId = (dec as any).request_id || dec.application_id;
                    const decReq = getRequestById(decReqId);
                    return (
                      <li key={dec.id}>
                        <strong>{decReq?.filing_number}:</strong> {decReq?.title} ·{' '}
                        <span className="font-bold text-[#14281D]">[{dec.decision}]</span>. Rationale:{' '}
                        {dec.justification}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
