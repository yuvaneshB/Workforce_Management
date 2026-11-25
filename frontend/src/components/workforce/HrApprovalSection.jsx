import {
  Activity,
  AlertCircle,
  Award,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Copy,
  Eye,
  Info,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UserMinus,
  Users,
  X,
  XCircle,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AgentFindingList } from '../common/AgentFindingCard';
import { cleanText } from '../../utils/humanizeAgentOutput';
import { useAutoCloseOnApproval, AutoCloseBanner } from '../../hooks/useAutoCloseOnApproval';

import {
  fetchHrApprovalDetails,
  fetchHrApprovals,
  recordHrDecision,
  recordHrReview,
  resetHrDecision,
} from '../../api/workforceApi';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { PaginationControls } from '../common/PaginationControls';

const AGENT_CONFIG = {
  attendance: {
    label: 'Attendance Agent',
    icon: CalendarCheck,
    color: 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800',
  },
  workforce_planning: {
    label: 'Workforce Planning Agent',
    icon: Users,
    color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800',
  },
  overtime: {
    label: 'Overtime Optimization Agent',
    icon: Clock,
    color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
  },
  attrition: {
    label: 'Attrition Agent',
    icon: UserMinus,
    color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
  },
  skill: {
    label: 'Skill & Training Agent',
    icon: Award,
    color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
  },
  vendor: {
    label: 'Vendor Workforce Agent',
    icon: Building2,
    color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
  },
  production: {
    label: 'Production Workforce Agent',
    icon: Activity,
    color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
  },
};

const STATUS_FILTERS = [
  { value: '', label: 'All' },
  { value: 'PENDING_REVIEW', label: 'Pending Review' },
  { value: 'PENDING_APPROVAL', label: 'Pending Approval' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];

function formatDate(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

function formatDateTime(isoStr) {
  if (!isoStr) return '—';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return isoStr;
    return `${d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })} at ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return isoStr;
  }
}

export function HrApprovalSection() {
  // Status Filter State (derived from click on KPI cards or status pills)
  const [statusFilter, setStatusFilter] = useState('');

  // Data States (retrieved strictly from backend)
  const [items, setItems] = useState([]);
  const [kpis, setKpis] = useState({
    pending_reviews: 0,
    pending_approvals: 0,
    approved: 0,
    rejected: 0,
    total_records: 0,
  });
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshToken, setRefreshToken] = useState(0);

  // Drawer / Details State
  const [selectedApprovalId, setSelectedApprovalId] = useState(null);
  const [detailsRecord, setDetailsRecord] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [actionFeedback, setActionFeedback] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Review Form in Drawer
  const [reviewerName, setReviewerName] = useState('Workspace User (HR)');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Approve / Reject Modal / Form in Drawer
  const [decisionModalMode, setDecisionModalMode] = useState(null); // 'APPROVE' | 'REJECT' | null
  const [approverName, setApproverName] = useState('Workspace User (HR Operations Lead)');
  const [decisionNotes, setDecisionNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);

  const autoClose = useAutoCloseOnApproval({
    onClose: () => setSelectedApprovalId(null),
    agentName: detailsRecord?.agent_name || 'Agent',
    isOpen: !!selectedApprovalId,
  });

  // Fetch Approval Records & KPIs directly from backend
  const loadApprovals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchHrApprovals({
        status: statusFilter || undefined,
        limit,
        offset,
      });

      if (res) {
        setItems(res.items || []);
        if (res.kpis) {
          setKpis(res.kpis);
        }
        if (res.pagination) {
          setTotal(res.pagination.total);
        } else {
          setTotal(res.items?.length || 0);
        }
      }
    } catch (err) {
      console.error('Failed to load HR approval records:', err);
      setError('Unable to retrieve HR approval records from server.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, limit, offset]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals, refreshToken]);

  // Load Single Approval Details when drawer opened
  useEffect(() => {
    if (!selectedApprovalId) {
      setDetailsRecord(null);
      setDecisionModalMode(null);
      setActionFeedback(null);
      setReviewNotes('');
      setDecisionNotes('');
      setRejectionReason('');
      return;
    }

    let active = true;
    async function loadDetails() {
      setDetailsLoading(true);
      setActionFeedback(null);
      try {
        const data = await fetchHrApprovalDetails(selectedApprovalId);
        if (active && data) {
          setDetailsRecord(data);
          if (data.reviewed_by) {
            setReviewerName(data.reviewed_by);
          }
          if (data.approved_by) {
            setApproverName(data.approved_by);
          }
        }
      } catch (err) {
        console.error('Failed to load approval details:', err);
        if (active) {
          setActionFeedback({
            type: 'error',
            message: 'Failed to retrieve approval details from server.',
          });
        }
      } finally {
        if (active) setDetailsLoading(false);
      }
    }

    loadDetails();
    return () => {
      active = false;
    };
  }, [selectedApprovalId]);

  // Handle Record HR Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!selectedApprovalId || !reviewNotes.trim()) return;

    setIsSubmittingReview(true);
    setActionFeedback(null);
    try {
      const res = await recordHrReview(selectedApprovalId, {
        reviewedBy: reviewerName.trim() || 'Workspace User (HR)',
        reviewNotes: reviewNotes.trim(),
      });

      if (res?.record) {
        setDetailsRecord(res.record);
        setActionFeedback({
          type: 'success',
          message: 'Initial HR review recorded successfully. Record moved to Pending Approval.',
        });
        setRefreshToken((p) => p + 1);
      }
    } catch (err) {
      console.error('Failed to record review:', err);
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.detail || 'Failed to record review decision.',
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Handle Approve or Reject
  const handleSubmitDecision = async (e) => {
    e.preventDefault();
    if (!selectedApprovalId || !decisionModalMode) return;

    if (decisionModalMode === 'REJECT' && !rejectionReason.trim()) {
      setActionFeedback({
        type: 'error',
        message: 'A rejection rationale is required when rejecting a recommendation.',
      });
      return;
    }

    setIsSubmittingDecision(true);
    setActionFeedback(null);
    try {
      const res = await recordHrDecision(selectedApprovalId, {
        decision: decisionModalMode === 'APPROVE' ? 'APPROVED' : 'REJECTED',
        approvedBy: approverName.trim() || 'Workspace User (HR Operations Lead)',
        decisionNotes: decisionNotes.trim() || undefined,
        rejectionReason:
          decisionModalMode === 'REJECT' ? rejectionReason.trim() : undefined,
      });

      if (res?.record) {
        setDetailsRecord(res.record);
        setDecisionModalMode(null);
        setActionFeedback({
          type: 'success',
          message: `Recommendation ${
            decisionModalMode === 'APPROVE' ? 'approved' : 'rejected'
          } successfully.`,
        });
        setRefreshToken((p) => p + 1);

        if (decisionModalMode === 'APPROVE') {
          autoClose.start({
            agentName: detailsRecord?.agent_name || 'Agent',
            approvalId: selectedApprovalId,
          });
        } else {
          autoClose.cancel();
        }
      }
    } catch (err) {
      autoClose.cancel();
      console.error('Failed to record decision:', err);
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.detail || 'Failed to submit decision.',
      });
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Handle Reset Decision
  const handleResetDecision = async () => {
    if (!selectedApprovalId) return;
    autoClose.cancel();
    setIsSubmittingDecision(true);
    setActionFeedback(null);
    try {
      const res = await resetHrDecision(selectedApprovalId);
      if (res?.record) {
        setDetailsRecord(res.record);
        setActionFeedback({
          type: 'success',
          message: 'Decision reset back to Pending successfully.',
        });
        setRefreshToken((p) => p + 1);
      }
    } catch (err) {
      console.error('Failed to reset decision:', err);
      setActionFeedback({
        type: 'error',
        message: err?.response?.data?.detail || 'Failed to reset decision.',
      });
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Handle Copy ID
  const handleCopyId = (id, rowKey) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(rowKey);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // KPI card click toggle
  const handleKpiClick = (statusKey) => {
    setOffset(0);
    setStatusFilter((prev) => (prev === statusKey ? '' : statusKey));
  };

  return (
    <div className="space-y-4">
      {/* ==================================================================== */}
      {/* 1. APPROVAL KPI CARDS (Real counts from persisted backend data)      */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Pending Reviews */}
        <div
          onClick={() => handleKpiClick('PENDING_REVIEW')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleKpiClick('PENDING_REVIEW')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'PENDING_REVIEW'
              ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
              : 'bg-[var(--surface)] border-[var(--border)] hover:border-amber-400/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Pending Reviews
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ClipboardCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
            {kpis.pending_reviews}
          </div>
          <p className="mt-1 text-xs font-medium text-amber-600 dark:text-amber-400">
            Awaiting initial review
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 truncate">
            Requires HRBP preliminary assessment
          </p>
        </div>

        {/* Card 2: Pending Approvals */}
        <div
          onClick={() => handleKpiClick('PENDING_APPROVAL')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleKpiClick('PENDING_APPROVAL')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'PENDING_APPROVAL'
              ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/30'
              : 'bg-[var(--surface)] border-[var(--border)] hover:border-blue-400/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Pending Approvals
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
            {kpis.pending_approvals}
          </div>
          <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
            Reviewed, awaiting signoff
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 truncate">
            Ready for VP / HR Director authorization
          </p>
        </div>

        {/* Card 3: Approved */}
        <div
          onClick={() => handleKpiClick('APPROVED')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleKpiClick('APPROVED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'APPROVED'
              ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/30'
              : 'bg-[var(--surface)] border-[var(--border)] hover:border-emerald-400/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Approved
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
            {kpis.approved}
          </div>
          <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Authorized recommendations
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 truncate">
            Confirmed for operational rollout
          </p>
        </div>

        {/* Card 4: Rejected */}
        <div
          onClick={() => handleKpiClick('REJECTED')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleKpiClick('REJECTED')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            statusFilter === 'REJECTED'
              ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/30'
              : 'bg-[var(--surface)] border-[var(--border)] hover:border-rose-400/60'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Rejected
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">
            {kpis.rejected}
          </div>
          <p className="mt-1 text-xs font-medium text-rose-600 dark:text-rose-400">
            Declined with notes
          </p>
          <p className="mt-0.5 text-[11px] text-slate-400 truncate">
            Audit reason recorded in system
          </p>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 2. SIMPLIFIED STATUS BAR + REFRESH ACTION                            */}
      {/* ==================================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 py-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1.5">
            Status:
          </span>
          {STATUS_FILTERS.map((sf) => {
            const isActive = statusFilter === sf.value;
            return (
              <button
                key={sf.value}
                type="button"
                onClick={() => {
                  setStatusFilter(sf.value);
                  setOffset(0);
                }}
                className={`h-8 px-3.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {sf.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setRefreshToken((p) => p + 1)}
            title="Refresh approval records"
            className="h-8 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. SIMPLIFIED APPROVALS TABLE (9 Columns)                            */}
      {/* ==================================================================== */}
      <Card className="overflow-hidden border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Agent Recommendations Governance Log
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Centralized HR evaluation & sign-off across all 7 specialist agents
              </p>
            </div>
          </div>

          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {total} Total Records
          </span>
        </div>

        {loading ? (
          <div className="p-6">
            <LoadingSkeleton count={6} />
          </div>
        ) : error ? (
          <div className="p-6 text-center">
            <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
            <p className="text-xs text-rose-600 dark:text-rose-400 font-semibold mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={loadApprovals}>
              Retry Loading
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title={statusFilter ? 'No Records in this Status' : 'No Agent Recommendations Found'}
              description={
                statusFilter
                  ? `There are no specialist agent recommendations currently marked as ${
                      STATUS_FILTERS.find((s) => s.value === statusFilter)?.label
                    }.`
                  : 'When specialist agents complete an analysis requiring HR review, their findings and recommendations will appear here automatically.'
              }
              actionText={statusFilter ? 'View All Records' : undefined}
              onAction={statusFilter ? () => setStatusFilter('') : undefined}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-800/40 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3.5 whitespace-nowrap">Execution ID</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Specialist Agent</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Execution Date</th>
                  <th className="py-3 px-3.5 min-w-[220px]">Recommendation</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Review Status</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Approval Status</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Reviewed By</th>
                  <th className="py-3 px-3.5 whitespace-nowrap">Decision Date</th>
                  <th className="py-3 px-3.5 text-right whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {items.map((row) => {
                  const agentConf = AGENT_CONFIG[row.specialist_agent] || {
                    label: row.agent_name || row.specialist_agent,
                    icon: ShieldCheck,
                    color: 'text-purple-600 bg-purple-50 border-purple-200',
                  };
                  const AgentIcon = agentConf.icon;

                  const isReviewed = row.review_status === 'REVIEWED';
                  const isApproved = row.approval_status === 'APPROVED';
                  const isRejected = row.approval_status === 'REJECTED';

                  return (
                    <tr
                      key={row.approval_id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      {/* 1. Execution ID */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <code className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {row.execution_id}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyId(row.execution_id, row.approval_id)}
                            title="Copy Execution ID"
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            {copiedId === row.approval_id ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* 2. Specialist Agent */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-semibold ${agentConf.color}`}
                          >
                            <AgentIcon className="w-3 h-3 shrink-0" />
                            <span>{agentConf.label}</span>
                          </span>
                        </div>
                      </td>

                      {/* 3. Execution Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-700 dark:text-slate-300 font-medium">
                        {row.target_date || formatDate(row.created_at)}
                      </td>

                      {/* 4. Recommendation */}
                      <td className="py-3 px-3.5 text-slate-600 dark:text-slate-300 line-clamp-2 max-w-sm text-[11px] leading-relaxed">
                        {row.recommendation}
                      </td>

                      {/* 5. Review Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {isReviewed ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            <Check className="w-2.5 h-2.5" /> Reviewed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            <Clock className="w-2.5 h-2.5" /> Pending Review
                          </span>
                        )}
                      </td>

                      {/* 6. Approval Status */}
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Approved
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                            <XCircle className="w-2.5 h-2.5" /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            <Clock className="w-2.5 h-2.5" /> Pending
                          </span>
                        )}
                      </td>

                      {/* 7. Reviewed By */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-600 dark:text-slate-400 font-medium">
                        {row.reviewed_by || '—'}
                      </td>

                      {/* 8. Decision Date */}
                      <td className="py-3 px-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400 font-medium">
                        {row.decision_date ? formatDate(row.decision_date) : '—'}
                      </td>

                      {/* 9. Action Button */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedApprovalId(row.approval_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/50 font-semibold text-xs transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {total > limit && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <PaginationControls
              total={total}
              limit={limit}
              offset={offset}
              onPageChange={(newOffset) => setOffset(newOffset)}
            />
          </div>
        )}
      </Card>

      {/* ==================================================================== */}
      {/* 4. DETAILS VIEW (RIGHT-SIDE DRAWER)                                  */}
      {/* ==================================================================== */}
      {selectedApprovalId && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end transition-opacity">
          <div className="w-full max-w-2xl bg-[var(--surface)] text-[var(--text)] h-full shadow-2xl flex flex-col border-l border-[var(--border)] overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 border-b border-[var(--border)] flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                      {detailsRecord?.agent_name || 'Agent Recommendation'}
                    </h3>
                    {detailsRecord?.approval_status === 'APPROVED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        APPROVED
                      </span>
                    )}
                    {detailsRecord?.approval_status === 'REJECTED' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                        REJECTED
                      </span>
                    )}
                    {detailsRecord?.approval_status === 'PENDING' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                        PENDING
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <code className="text-xs font-mono font-semibold text-slate-500">
                      {detailsRecord?.execution_id}
                    </code>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs text-slate-500">{detailsRecord?.approval_id}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Non-executable Governance Disclaimer Callout */}
            <div className="mx-5 mt-4 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-start gap-2.5 shrink-0">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                <strong className="font-semibold">HR Governance Policy:</strong> HR approval confirms
                the recommendation. Operational changes require separate authorization and
                execution.
              </div>
            </div>

            {/* Action Feedback Banner */}
            {actionFeedback && (
              <div
                className={`mx-5 mt-3 p-3 rounded-xl border flex items-center justify-between text-xs font-medium shrink-0 ${
                  actionFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                    : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {actionFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <span>{actionFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActionFeedback(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            <AutoCloseBanner
              isCounting={autoClose.isCounting}
              secondsLeft={autoClose.secondsLeft}
              onCancel={autoClose.cancel}
              className="mx-5 mt-3"
            />

            {/* Drawer Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {detailsLoading || !detailsRecord ? (
                <LoadingSkeleton count={6} />
              ) : (
                <>
                  {/* SECTION 1: Agent & Context Information */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      1. Agent Context & Planning Scope
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                          Specialist Agent
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                          {detailsRecord.agent_name}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                          Plant Facility
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                          {detailsRecord.plant_id || 'All Facilities'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                          Department
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                          {detailsRecord.department_id || 'Cross-Functional'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-semibold text-slate-400 block uppercase">
                          Target Date
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                          {detailsRecord.target_date || formatDate(detailsRecord.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: Agent Findings & Recommendation */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      2. Agent Findings & Evidence
                    </h4>

                    {/* Recommendation Card */}
                    <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-800/60 bg-purple-50/50 dark:bg-purple-950/20">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block mb-1">
                        Primary Recommendation
                      </span>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                        {cleanText(detailsRecord.recommendation)}
                      </p>
                    </div>

                    {/* Executive Summary & Verified Metrics (from payload if available) */}
                    {detailsRecord.result_payload && (
                      <div className="space-y-3">
                        {detailsRecord.result_payload.summary && (
                          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                              Executive Summary
                            </span>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                              {cleanText(detailsRecord.result_payload.summary)}
                            </p>
                          </div>
                        )}

                        {/* Verified Metrics Grid */}
                        {detailsRecord.result_payload.metrics && (
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1.5">
                              Verified Ground Truth Metrics
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              {Object.entries(detailsRecord.result_payload.metrics).map(
                                ([key, val]) => (
                                  <div
                                    key={key}
                                    className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-[var(--surface)] text-center"
                                  >
                                    <span className="text-[10px] font-medium text-slate-400 block capitalize truncate">
                                      {key.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-0.5 block truncate">
                                      {cleanText(String(val))}
                                    </span>
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                        )}

                        {/* Detailed Findings */}
                        {detailsRecord.result_payload.findings &&
                          Array.isArray(detailsRecord.result_payload.findings) && (
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                                Observed Findings ({detailsRecord.result_payload.findings.length})
                              </span>
                              <AgentFindingList findings={detailsRecord.result_payload.findings} />
                            </div>
                          )}

                        {/* Grounding Evidence */}
                        {detailsRecord.result_payload.evidence && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            Grounding Evidence: {cleanText(String(detailsRecord.result_payload.evidence))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* SECTION 3: HR Review Workflow */}
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        3. HR Initial Review
                      </h4>
                      {detailsRecord.review_status === 'REVIEWED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                          REVIEWED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          PENDING REVIEW
                        </span>
                      )}
                    </div>

                    {detailsRecord.review_status === 'REVIEWED' ? (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500">
                          <span>
                            Reviewed by:{' '}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {detailsRecord.reviewed_by || 'HR Reviewer'}
                            </strong>
                          </span>
                          <span>{formatDateTime(detailsRecord.reviewed_at)}</span>
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 pt-1 leading-relaxed border-t border-slate-200/60 dark:border-slate-700/60">
                          {detailsRecord.review_notes || 'Initial assessment recorded.'}
                        </div>
                      </div>
                    ) : (
                      <form
                        onSubmit={handleSubmitReview}
                        className="p-4 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-950/10 space-y-3"
                      >
                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            HR Reviewer Name & Title:
                          </label>
                          <input
                            type="text"
                            value={reviewerName}
                            onChange={(e) => setReviewerName(e.target.value)}
                            required
                            className="w-full h-8 px-3 rounded-lg border text-xs outline-none bg-[var(--surface)] border-[var(--border)] text-[var(--text)]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                            Review Assessment & Notes:
                          </label>
                          <textarea
                            value={reviewNotes}
                            onChange={(e) => setReviewNotes(e.target.value)}
                            rows={3}
                            required
                            placeholder="Record HR evaluation, operational feasibility, and shift impact assessment..."
                            className="w-full p-2.5 rounded-lg border text-xs outline-none bg-[var(--surface)] border-[var(--border)] text-[var(--text)]"
                          />
                        </div>

                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={isSubmittingReview || !reviewNotes.trim()}
                            className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <ClipboardCheck className="w-3.5 h-3.5" />
                            <span>
                              {isSubmittingReview ? 'Recording Review...' : 'Record HR Review'}
                            </span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>

                  {/* SECTION 4: HR Final Approval Decision */}
                  <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        4. Final Authorization & Decision
                      </h4>
                      {detailsRecord.approval_status === 'APPROVED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          APPROVED
                        </span>
                      ) : detailsRecord.approval_status === 'REJECTED' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                          REJECTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          PENDING DECISION
                        </span>
                      )}
                    </div>

                    {/* If Already Decided */}
                    {detailsRecord.approval_status !== 'PENDING' ? (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px] text-slate-500">
                          <span>
                            Decided by:{' '}
                            <strong className="text-slate-800 dark:text-slate-200">
                              {detailsRecord.approved_by || 'HR Authority'}
                            </strong>
                          </span>
                          <span>{formatDateTime(detailsRecord.decision_date)}</span>
                        </div>

                        {detailsRecord.approval_status === 'REJECTED' &&
                          detailsRecord.rejection_reason && (
                            <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-300 text-xs">
                              <strong className="block text-[10px] uppercase font-bold text-rose-600">
                                Rejection Rationale:
                              </strong>
                              {detailsRecord.rejection_reason}
                            </div>
                          )}

                        {detailsRecord.decision_notes && (
                          <div className="text-slate-700 dark:text-slate-300 pt-1 leading-relaxed border-t border-slate-200/60 dark:border-slate-700/60">
                            {detailsRecord.decision_notes}
                          </div>
                        )}

                        {/* Reset Decision Button */}
                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={handleResetDecision}
                            disabled={isSubmittingDecision}
                            className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset Decision to Pending</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* If Pending Decision: Action Buttons or Modal Form */
                      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                        {!decisionModalMode ? (
                          <div>
                            <p className="text-xs text-slate-600 dark:text-slate-400 mb-3">
                              Authorize or decline this specialist agent recommendation. Decisions
                              are recorded permanently in the HR compliance audit trail.
                            </p>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => setDecisionModalMode('APPROVE')}
                                className="flex-1 h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Approve Recommendation</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => setDecisionModalMode('REJECT')}
                                className="flex-1 h-9 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                              >
                                <XCircle className="w-4 h-4" />
                                <span>Reject Recommendation</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Interactive Decision Form */
                          <form onSubmit={handleSubmitDecision} className="space-y-3">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
                              <span
                                className={`text-xs font-bold ${
                                  decisionModalMode === 'APPROVE'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {decisionModalMode === 'APPROVE'
                                  ? 'Confirm Recommendation Approval'
                                  : 'Reject Recommendation with Rationale'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setDecisionModalMode(null)}
                                className="text-slate-400 hover:text-slate-600 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>

                            <div>
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Approver Name & Title:
                              </label>
                              <input
                                type="text"
                                value={approverName}
                                onChange={(e) => setApproverName(e.target.value)}
                                required
                                className="w-full h-8 px-3 rounded-lg border text-xs outline-none bg-[var(--surface)] border-[var(--border)] text-[var(--text)]"
                              />
                            </div>

                            {decisionModalMode === 'REJECT' && (
                              <div>
                                <label className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block mb-1">
                                  Rejection Reason (Required):
                                </label>
                                <textarea
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  rows={2}
                                  required
                                  placeholder="State mandatory compliance, operational, or budgetary reason for rejection..."
                                  className="w-full p-2 rounded-lg border border-rose-300 dark:border-rose-800 text-xs outline-none bg-[var(--surface)] text-[var(--text)]"
                                />
                              </div>
                            )}

                            <div>
                              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1">
                                Decision Notes / Rollout Conditions:
                              </label>
                              <textarea
                                value={decisionNotes}
                                onChange={(e) => setDecisionNotes(e.target.value)}
                                rows={2}
                                placeholder="Optional implementation notes, condition precedents, or trial period..."
                                className="w-full p-2 rounded-lg border text-xs outline-none bg-[var(--surface)] border-[var(--border)] text-[var(--text)]"
                              />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() => setDecisionModalMode(null)}
                                className="h-8 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>

                              <button
                                type="submit"
                                disabled={
                                  isSubmittingDecision ||
                                  (decisionModalMode === 'REJECT' && !rejectionReason.trim())
                                }
                                className={`h-8 px-4 rounded-lg font-semibold text-xs text-white transition-colors cursor-pointer ${
                                  decisionModalMode === 'APPROVE'
                                    ? 'bg-emerald-600 hover:bg-emerald-700'
                                    : 'bg-rose-600 hover:bg-rose-700'
                                }`}
                              >
                                {isSubmittingDecision
                                  ? 'Submitting...'
                                  : decisionModalMode === 'APPROVE'
                                  ? 'Confirm Approval'
                                  : 'Confirm Rejection'}
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-[var(--border)] bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400">
                Workforce Management AI • HR Governance System
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  autoClose.cancel();
                  setSelectedApprovalId(null);
                }}
              >
                Close Drawer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
