import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  FileText,
  Eye,
  CheckCircle2,
  Send,
  MessageSquare,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { useSessionStore } from '../../stores/session.store.ts';
import { useRequestStore } from '../../features/requests/requestStore.ts';
import { useCatalogStore } from '../../features/catalog/catalogStore.ts';
import { useUserStore } from '../../features/users/userStore.ts';
import { ReviewerConcept, ObservationCategory } from '../../types/database.ts';

export function ReviewsPage() {
  const navigate = useNavigate();
  const { user } = useSessionStore();
  const {
    requests,
    assignments,
    documents,
    observations,
    getDeadlineStatus,
    addTechnicalObservation,
    submitReviewerConcept,
  } = useRequestStore();
  const { types } = useCatalogStore();
  const { users } = useUserStore();

  const currentUserId = user?.id || 'usr-003';

  // Requests assigned to the current reviewer (or all in review if secretary)
  const isSecretary = user?.activeRole === 'secretary' || user?.activeRole === 'secretario';
  const myAssignedRequests = useMemo(() => {
    return requests.filter((req) => {
      if (req.current_status !== 'EN_REVISION' && req.current_status !== 'UNDER_REVIEW') return false;
      if (isSecretary) return true;
      const asg = assignments.find(
        (a) => a.request_id === req.id && a.reviewer_id === currentUserId && a.is_active
      );
      return !!asg;
    });
  }, [requests, assignments, currentUserId, isSecretary]);

  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(
    myAssignedRequests[0]?.id || null
  );

  // Observations form (RF-17)
  const [obsCategory, setObsCategory] = useState<ObservationCategory>('SUGERENCIA');
  const [obsContent, setObsContent] = useState('');

  // Technical concept form (RF-19, RF-20)
  const [concept, setConcept] = useState<ReviewerConcept>('FAVORABLE');
  const [conceptJustification, setConceptJustification] = useState('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const handleAddObservation = async (reqId: string) => {
    if (!obsContent.trim()) {
      setFeedback({ type: 'error', message: 'Technical observation cannot be empty.' });
      return;
    }

    const res = await addTechnicalObservation(
      reqId,
      user?.id || currentUserId,
      user?.fullName || 'Peer Reviewer',
      obsCategory,
      obsContent.trim()
    );

    if (res.success) {
      setFeedback({ type: 'success', message: 'Technical observation recorded in the request docket.' });
      setObsContent('');
      setTimeout(() => setFeedback(null), 3000);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Error saving observation.' });
    }
  };

  const handleSubmitConcept = async (reqId: string) => {
    if (!conceptJustification.trim()) {
      setFeedback({
        type: 'error',
        message: 'RN-05: Emitting a technical concept requires written justification and rationale.',
      });
      return;
    }

    const res = await submitReviewerConcept(
      reqId,
      user?.id || currentUserId,
      user?.fullName || 'Peer Reviewer',
      concept,
      conceptJustification.trim()
    );

    if (res.success) {
      setFeedback({
        type: 'success',
        message: `Concept ${concept} submitted successfully. The request has advanced in the committee workflow.`,
      });
      setConceptJustification('');
      setTimeout(() => setFeedback(null), 4000);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Error submitting technical concept.' });
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      <div className="border-b border-[#E5E3DC] pb-4">
        <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#14281D]">
          My Assigned Technical Reviews
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">
          Research Committee Member · Technical evaluation, observations recording, and regulatory concept submission (RF-17, RF-18, RF-19, RF-20, RF-22).
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center gap-2.5 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
          ) : (
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {myAssignedRequests.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#E5E3DC] p-12 text-center text-xs text-stone-500 space-y-2">
          <CheckSquare size={36} className="mx-auto text-stone-300" />
          <h3 className="font-bold text-sm text-[#14281D]">No Pending Reviews</h3>
          <p>You currently do not have requests assigned in the technical review stage.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {myAssignedRequests.map((req) => {
            const isExpanded = expandedRequestId === req.id;
            const deadline = getDeadlineStatus(req.id);
            const reqType = types.find((t) => t.id === req.request_type_id || t.id === (req as any).application_type_id);
            const applicant = users.find((u) => u.id === req.applicant_id);
            const reqDocs = documents.filter((d) => d.request_id === req.id || (d as any).application_id === req.id);
            const reqObs = observations.filter((o) => o.request_id === req.id || (o as any).application_id === req.id);

            return (
              <div
                key={req.id}
                className="bg-white rounded-3xl border border-[#E5E3DC] overflow-hidden shadow-xs"
              >
                {/* Header with deadline tracker (RF-22) */}
                <div
                  onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                  className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-stone-50/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-lg bg-[#F7F6F2] border border-[#E5E3DC] text-[#14281D]">
                        {req.filing_number}
                      </span>
                      <span className="font-bold text-[#14281D] text-sm md:text-base">
                        {req.title}
                      </span>
                    </div>
                    <div className="text-[11px] text-stone-500 flex items-center gap-3">
                      <span>
                        Applicant: <strong>{applicant?.full_name}</strong>
                      </span>
                      <span>·</span>
                      <span>Type: {reqType?.name}</span>
                    </div>
                  </div>

                  {/* Deadline status monitor (RF-22) */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {deadline.isOverdue ? (
                      <span className="text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                        <AlertCircle size={13} className="text-rose-600" />
                        <span>{deadline.description}</span>
                      </span>
                    ) : deadline.isUrgent ? (
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Clock size={13} className="text-amber-600" />
                        <span>Approaching deadline ({deadline.daysRemaining} days left)</span>
                      </span>
                    ) : (
                      <span className="text-[11px] font-semibold text-stone-600 bg-stone-100 border border-stone-200 px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Clock size={13} className="text-stone-400" />
                        <span>{deadline.description}</span>
                      </span>
                    )}

                    <button
                      type="button"
                      className="p-2 rounded-xl text-stone-400 hover:text-[#14281D] bg-stone-50 border border-stone-200"
                    >
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Collapsible Content */}
                {isExpanded && (
                  <div className="p-6 md:p-8 border-t border-[#E5E3DC] bg-[#FAF9F6] space-y-6 text-xs">
                    {/* Executive Abstract */}
                    <div className="space-y-1.5">
                      <span className="font-bold text-xs text-[#14281D] uppercase tracking-wider block">
                        Executive Summary / Justification
                      </span>
                      <p className="p-3.5 bg-white rounded-2xl border border-[#E5E3DC] text-stone-700 leading-relaxed">
                        {req.abstract}
                      </p>
                    </div>

                    {/* Uploaded Documents */}
                    <div className="space-y-2">
                      <span className="font-bold text-xs text-[#14281D] uppercase tracking-wider block">
                        Request Documents ({reqDocs.length})
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {reqDocs.map((doc) => (
                          <div
                            key={doc.id}
                            className="p-3 rounded-xl bg-white border border-[#E5E3DC] flex items-center justify-between gap-2"
                          >
                            <span className="truncate font-medium text-stone-800">
                              📄 {doc.file_name}
                            </span>
                            <span className="font-mono text-[10px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {doc.validation_status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recorded Observations */}
                    <div className="space-y-2">
                      <span className="font-bold text-xs text-[#14281D] uppercase tracking-wider block">
                        Recorded Observations ({reqObs.length})
                      </span>
                      {reqObs.length === 0 ? (
                        <p className="text-[11px] text-stone-400 italic">
                          No technical observations recorded yet for this request.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {reqObs.map((obs) => (
                            <div
                              key={obs.id}
                              className="p-3.5 rounded-xl bg-white border border-[#E5E3DC] space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#14281D] text-[11px] px-2 py-0.5 rounded bg-stone-100">
                                  {obs.category}
                                </span>
                                <span className="text-[10px] text-stone-400">
                                  {obs.is_resolved ? '✓ Adjustment resolved' : 'Pending resolution'}
                                </span>
                              </div>
                              <p className="text-stone-700">{obs.content}</p>
                              {obs.applicant_response && (
                                <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px]">
                                  <strong>Applicant response:</strong> {obs.applicant_response}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 1. Technical Observations Form (RF-17) */}
                    <div className="p-5 rounded-2xl bg-white border border-[#E5E3DC] space-y-3">
                      <h4 className="font-bold text-xs text-[#14281D] uppercase tracking-wider">
                        Submit Technical Observation / Adjustments Request (RF-17, RF-18)
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Observation Type *
                          </label>
                          <select
                            value={obsCategory}
                            onChange={(e) => setObsCategory(e.target.value as ObservationCategory)}
                            className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white text-xs outline-none"
                          >
                            <option value="SUGERENCIA">Academic Suggestion</option>
                            <option value="ACLARACION">Methodological Clarification</option>
                            <option value="AJUSTE_OBLIGATORIO">Mandatory Adjustment Required</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Observation Details *
                          </label>
                          <textarea
                            rows={2}
                            value={obsContent}
                            onChange={(e) => setObsContent(e.target.value)}
                            placeholder="Describe clearly the recommendation or required technical adjustment..."
                            className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] outline-none text-xs text-stone-800 leading-relaxed"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleAddObservation(req.id)}
                          className="px-4 py-2 bg-stone-800 hover:bg-stone-900 text-white font-bold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Send size={12} />
                          <span>Record Observation</span>
                        </button>
                      </div>
                    </div>

                    {/* 2. Reviewer Technical Concept (RF-19, RF-20) */}
                    <div className="p-5 rounded-2xl bg-white border-2 border-[#14281D] space-y-3 shadow-xs">
                      <h4 className="font-bold text-xs text-[#14281D] uppercase tracking-wider">
                        Emit Reviewer Technical Concept (RF-19, RF-20)
                      </h4>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Technical Decision *
                          </label>
                          <select
                            value={concept}
                            onChange={(e) => setConcept(e.target.value as ReviewerConcept)}
                            className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] bg-white text-xs font-bold text-[#14281D] outline-none"
                          >
                            <option value="FAVORABLE">
                              Favorable (Advances to "Ready for Committee")
                            </option>
                            <option value="FAVORABLE_CON_AJUSTES">
                              Favorable with Adjustments (Advances to "Ready for Committee")
                            </option>
                            <option value="NO_FAVORABLE">
                              Not Favorable (Transitions to "Rejected")
                            </option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Substantiated Justification (RN-05) *
                          </label>
                          <textarea
                            rows={3}
                            value={conceptJustification}
                            onChange={(e) => setConceptJustification(e.target.value)}
                            placeholder="Substantiate with academic and technical rigor the rationale for this concept..."
                            className="w-full px-3 py-2 rounded-xl border border-[#E5E3DC] outline-none text-xs text-stone-800 leading-relaxed"
                          />
                        </div>

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => handleSubmitConcept(req.id)}
                            className="px-5 py-2.5 bg-[#14281D] hover:bg-[#1E3A2B] text-white font-extrabold rounded-xl text-xs cursor-pointer inline-flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <CheckCircle2 size={15} />
                            <span>Sign and Emit Technical Concept</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
