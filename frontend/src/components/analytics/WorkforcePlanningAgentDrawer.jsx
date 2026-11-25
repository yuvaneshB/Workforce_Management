import {
  AlertCircle,
  AlertTriangle,
  Award,
  Bot,
  Check,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Filter,
  GraduationCap,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { submitPlanningApproval } from '../../api/workforceApi';
import { useAgentExecutionStream } from '../../hooks/useAgentExecutionStream';
import { AgentExecutionPipeline } from './AgentExecutionPipeline';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { AgentFindingList } from '../common/AgentFindingCard';
import { cleanText } from '../../utils/humanizeAgentOutput';
import { useAutoCloseOnApproval, AutoCloseBanner } from '../../hooks/useAutoCloseOnApproval';
import { AgentReviewPanel } from '../common/AgentReviewPanel';
import { AGENT_REVIEW_CONFIGS } from '../../utils/agentReviewConfig';

function sanitizeLabel(text) {
  if (!text) return 'Unmapped Production Line';
  return text
    .replace(/\bNone Line\b/gi, 'Unmapped Production Line')
    .replace(/\bConcentrated Deficit in None\b/gi, 'Concentrated Deficit in Unmapped Operations')
    .replace(/\bconcentrated in None\b/gi, 'concentrated in Unmapped Operations')
    .replace(/\bNone has\b/gi, 'Unmapped line has')
    .replace(/\bNone\b/g, 'Unmapped Operations');
}

export function WorkforcePlanningAgentDrawer({ isOpen, onClose, filters = {} }) {
  const {
    isExecuting: loading,
    executionId,
    stages,
    activeStageId,
    activeMessage,
    elapsedSeconds,
    error,
    result,
    execute,
    retry,
  } = useAgentExecutionStream({
    agentType: 'workforce_planning',
    filters,
    autoStart: true,
    isOpen,
  });

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'shortages' | 'replacements' | 'actions'
  const [hrNotes, setHrNotes] = useState('');
  const [hrDecisionStatus, setHrDecisionStatus] = useState(null); // 'ACKNOWLEDGED' | 'APPROVED'
  const [decisionTimestamp, setDecisionTimestamp] = useState(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [approvalFeedback, setApprovalFeedback] = useState(null); // { type: 'success' | 'error', message: string, approvalId?: string }
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [recordedReviewData, setRecordedReviewData] = useState(null);
  const recordReviewBtnRef = useRef(null);

  const autoClose = useAutoCloseOnApproval({
    onClose,
    agentName: 'Workforce Planning Agent',
    isOpen,
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isReviewPanelOpen) {
          e.stopPropagation();
          setIsReviewPanelOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isReviewPanelOpen, onClose]);

  const handleBackdropClick = () => {
    if (isReviewPanelOpen) {
      setIsReviewPanelOpen(false);
      return;
    }
    onClose();
  };

  const handleOpenReviewPanel = () => {
    autoClose.cancel();
    setIsReviewPanelOpen(true);
  };

  const handleExecute = () => {
    autoClose.cancel();
    setIsReviewPanelOpen(false);
    setRecordedReviewData(null);
    setApprovalFeedback(null);
    setHrDecisionStatus(null);
    execute();
  };

  if (!isOpen) return null;

  const severityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
      case 'MODERATE':
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800';
    }
  };

  const handleRecordHrReview = async (actionType, forceFailure = false, customNotes) => {
    if (isSubmittingApproval) return;
    setIsSubmittingApproval(true);
    setApprovalFeedback(null);

    const notesToSave = customNotes !== undefined ? customNotes : hrNotes;
    const activeExecId = executionId || result?.execution_id || 'PLN-EXE-LOCAL';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setHrDecisionStatus(actionType);
    setDecisionTimestamp(timestamp);
    if (customNotes !== undefined) {
      setHrNotes(customNotes);
    }

    if (actionType === 'APPROVED' && !forceFailure) {
      setApprovalFeedback({
        type: 'success',
        approvalId: activeExecId,
        message: 'Adjustments approved successfully.',
      });
      autoClose.start({
        agentName: 'Workforce Planning Agent',
        approvalId: activeExecId,
      });
    } else if (actionType !== 'APPROVED') {
      autoClose.cancel();
      setApprovalFeedback({
        type: 'success',
        approvalId: activeExecId,
        message: 'Review recorded successfully.',
      });
    }

    try {
      const response = await submitPlanningApproval({
        executionId: activeExecId,
        decision: actionType,
        notes: notesToSave || (actionType === 'APPROVED' ? 'Standby roster adjustments authorized for shift dispatch.' : 'Workforce planning review recorded.'),
        approvedBy: 'Plant HRBP / Operations Lead',
        targetDate: result?.target_date || filters?.date || filters?.startDate,
        forceFailure,
      });

      if (response?.approval_id) {
        setApprovalFeedback((prev) => ({ ...prev, approvalId: response.approval_id }));
      }
    } catch (err) {
      console.warn('Failed to submit planning approval:', err);
      if (forceFailure) {
        autoClose.cancel();
        setHrDecisionStatus(null);
        setApprovalFeedback({
          type: 'error',
          message: err?.response?.data?.detail || err.message || 'Approval submission failed. Please verify and retry.',
        });
      }
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const handleSaveReview = async (composedText, reviewData) => {
    await handleRecordHrReview('ACKNOWLEDGED', false, composedText);
    setRecordedReviewData(reviewData);
    setIsReviewPanelOpen(false);
  };

  const metrics = result?.metrics;
  const findings = result?.findings || [];
  const deptShortages = result?.department_shortages || [];
  const sectionShortages = result?.section_shortages || [];
  const roleShortages = result?.role_shortages || [];
  const candidates = result?.candidates || [];
  const disqualifiedSummary = result?.disqualified_summary || [];
  const rawRecs = result?.recommendations || [];

  // De-duplicate recommendations by action string
  const recs = rawRecs.filter(
    (item, index, self) => index === self.findIndex((r) => r.action === item.action)
  );

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Semi-transparent backdrop allowing view of Analytics behind */}
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Right-side Sliding Drawer with Docked Review Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <AgentReviewPanel
          isOpen={isReviewPanelOpen}
          onClose={() => setIsReviewPanelOpen(false)}
          onSave={handleSaveReview}
          agentConfig={AGENT_REVIEW_CONFIGS.workforce_planning}
          result={result}
          filters={filters}
          executionId={executionId || result?.execution_id}
          initialNotes={hrNotes}
          reviewerName="Plant HRBP / Operations Lead"
          returnFocusRef={recordReviewBtnRef}
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="planning-agent-drawer-title"
          className="w-screen max-w-xl md:max-w-2xl lg:max-w-3xl bg-[var(--surface)] text-[var(--text)] border-l border-[var(--border)] shadow-2xl flex flex-col h-full overflow-hidden"
          style={{ background: 'var(--surface)' }}
        >
          {/* SECTION 1 – Agent Header */}
          <div className="px-5 py-3.5 border-b border-[var(--border)] flex items-center justify-between gap-3 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-transparent shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#493287] to-[#5B44A3] text-white flex items-center justify-center shrink-0 shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 id="planning-agent-drawer-title" className="text-sm font-bold truncate">
                    Workforce Planning Agent
                  </h2>
                </div>
                <p className="text-[11px] text-[var(--secondary)] truncate">
                  Workforce Availability &amp; Shortage Analysis
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExecute}
                disabled={loading}
                className="h-8 px-2.5 text-xs gap-1 border-[var(--border)]"
                title="Re-run Workforce Planning Agent"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Rerun</span>
              </Button>
            </div>
          </div>

          {/* SECTION 2 – Planning Scope Filter Summary */}
          <div className="px-5 py-2 bg-slate-50 dark:bg-slate-900/50 border-b border-[var(--border)] flex items-center justify-between gap-2 text-xs shrink-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--secondary)]">
              <span className="font-semibold text-[var(--text)] flex items-center gap-1">
                <Filter className="w-3 h-3 text-purple-600" />
                Planning Scope:
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-medium text-[var(--text)]">
                Target Date: {result?.target_date || filters.date || filters.startDate || '2026-08-01'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-medium text-[var(--text)]">
                Plant: {filters.plantId || 'All Plants'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-medium text-[var(--text)]">
                Shift: {filters.shiftId ? `Shift ${filters.shiftId}` : 'All Shifts'}
              </span>
              {filters.departmentId && (
                <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-medium text-[var(--text)]">
                  Dept: {filters.departmentId}
                </span>
              )}
            </div>

            {loading && (
              <span className="text-[10px] text-purple-600 font-bold flex items-center gap-1 shrink-0">
                <Loader2 className="w-3 h-3 animate-spin" /> Processing...
              </span>
            )}
          </div>

          {/* Drawer Body Scroll Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
            {/* Execution Pipeline Tracker */}
            <AgentExecutionPipeline
              stages={stages}
              isExecuting={loading}
              activeStageId={activeStageId}
              activeMessage={activeMessage}
              elapsedSeconds={elapsedSeconds}
              error={error}
              totalDurationMs={result?.total_duration_ms}
              executionId={result?.execution_id}
              onRetry={retry}
              collapsible
            />

            {/* Loading Skeleton */}
            {loading && !result && (
              <div className="space-y-3 py-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-20 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
                <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-28 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <Card className="p-4 border-l-4 border-rose-500 bg-rose-50/40 dark:bg-rose-950/20">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">Execution Error</h4>
                    <p className="text-xs text-rose-800 dark:text-rose-300 mt-0.5">{error}</p>
                    <Button size="sm" onClick={handleExecute} className="mt-2 text-xs">
                      Retry Analysis
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Analysis Results Display */}
            {result && (
              <>
                {/* SECTION 4 – Workforce Risk Status Banner */}
                <div
                  className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${severityBadge(
                    result.severity
                  )}`}
                >
                  <div className="flex items-center gap-2.5">
                    {result.severity === 'CRITICAL' ? (
                      <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0" />
                    ) : result.severity === 'HIGH' ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
                    )}
                    <div>
                      <div className="text-xs font-black uppercase tracking-wide">
                        Workforce Gap Risk: {result.severity}
                      </div>
                      <div className="text-[11px] opacity-90 leading-tight mt-0.5">
                        {metrics?.shortage_count > 0
                          ? `Total Shortage: ${metrics.shortage_count.toLocaleString()} operators (${metrics.shortage_percentage}% deficit). Recommendation: Immediate cross-shift standby roster activation.`
                          : 'Workforce availability meets planned operational baseline requirements across all lines.'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border bg-white/60 dark:bg-black/30 shrink-0">
                    {result.severity}
                  </span>
                </div>

                {/* SECTION 3 – Workforce Summary (4 Equal KPI Cards) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between text-center min-h-[88px]">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                      Required Workforce
                    </span>
                    <span className="text-xl font-black text-purple-600 dark:text-purple-400 my-0.5">
                      {metrics?.required_baseline?.toLocaleString() ?? 0}
                    </span>
                    <span className="text-[9.5px] text-slate-400 block font-medium">
                      {metrics?.total_scheduled?.toLocaleString()} scheduled
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between text-center min-h-[88px]">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                      Available Workforce
                    </span>
                    <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 my-0.5">
                      {metrics?.available_count?.toLocaleString() ?? 0}
                    </span>
                    <span className="text-[9.5px] text-slate-400 block font-medium">
                      {metrics?.availability_rate ?? 0}% floor availability
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between text-center min-h-[88px]">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                      Total Shortage
                    </span>
                    <span className="text-xl font-black text-rose-600 dark:text-rose-400 my-0.5">
                      {metrics?.shortage_count?.toLocaleString() ?? 0}
                    </span>
                    <span className="text-[9.5px] text-slate-400 block font-medium">
                      {metrics?.shortage_percentage ?? 0}% operational deficit
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between text-center min-h-[88px]">
                    <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block tracking-wider">
                      Eligible Replacements
                    </span>
                    <span className="text-xl font-black text-blue-600 dark:text-blue-400 my-0.5">
                      {metrics?.eligible_candidates_count ?? 0}
                    </span>
                    <span className="text-[9.5px] text-slate-400 block font-medium">
                      {metrics?.disqualified_candidates_count ?? 0} gated for rest/skills
                    </span>
                  </div>
                </div>

                {/* SECTION 5 – Executive Summary Box */}
                {result.executive_synthesis && (
                  <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 text-xs text-purple-950 dark:text-purple-200 leading-relaxed space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-purple-800 dark:text-purple-300 text-[11px] uppercase tracking-wider">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Executive Planning Analysis
                    </div>
                    <p className="text-[11.5px] leading-relaxed whitespace-pre-line text-slate-700 dark:text-slate-300">
                      {cleanText(sanitizeLabel(result.executive_synthesis.replace(/\*\*/g, '')))}
                    </p>
                  </div>
                )}

                {/* Simplified Result Tabs (4 Meaningful Tabs) */}
                <div className="flex items-center gap-1 border-b border-[var(--border)] pt-1 text-xs">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`pb-2 px-3.5 font-bold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'overview'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Overview ({findings.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('shortages')}
                    className={`pb-2 px-3.5 font-bold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'shortages'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Shortage Analysis ({deptShortages.length + roleShortages.length + sectionShortages.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('replacements')}
                    className={`pb-2 px-3.5 font-bold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'replacements'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Replacement Candidates ({candidates.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('actions')}
                    className={`pb-2 px-3.5 font-bold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'actions'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    HR Action Plan ({recs.length})
                  </button>
                </div>

                {/* TAB 1: Overview */}
                {activeTab === 'overview' && (
                  <div className="space-y-3">
                    <AgentFindingList
                      findings={findings}
                      emptyMessage="No shortage findings observed for the selected scope."
                    />
                  </div>
                )}

                {/* TAB 2: Shortage Analysis */}
                {activeTab === 'shortages' && (
                  <div className="space-y-4">
                    {/* Department Shortages Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                          Department-wise Shortage
                        </h4>
                        <span className="text-[10px] text-slate-400">Required vs Available</span>
                      </div>

                      {deptShortages.length > 0 ? (
                        <div className="border border-[var(--border)] rounded-xl overflow-hidden text-xs">
                          <div className="grid grid-cols-12 bg-slate-100/70 dark:bg-slate-800/70 p-2.5 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-[var(--border)]">
                            <div className="col-span-5">Department</div>
                            <div className="col-span-2 text-center">Required</div>
                            <div className="col-span-2 text-center">Available</div>
                            <div className="col-span-3 text-right">Shortage</div>
                          </div>
                          <div className="divide-y divide-[var(--border)]">
                            {deptShortages.map((d, didx) => (
                              <div
                                key={didx}
                                className="grid grid-cols-12 p-3 items-center bg-[var(--surface)] hover:bg-slate-50 dark:hover:bg-slate-900/40"
                              >
                                <div className="col-span-5 font-bold text-[var(--text)] truncate">
                                  {sanitizeLabel(d.department_name)}
                                </div>
                                <div className="col-span-2 text-center font-medium text-slate-600 dark:text-slate-300">
                                  {d.required}
                                </div>
                                <div className="col-span-2 text-center font-medium text-slate-600 dark:text-slate-300">
                                  {d.available}
                                </div>
                                <div className="col-span-3 text-right">
                                  <span className="font-bold text-rose-600 dark:text-rose-400">
                                    -{d.shortage} Short
                                  </span>
                                  <span className="text-[9.5px] text-slate-400 ml-1">
                                    ({d.shortage_percentage}%)
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                          No department shortages detected for this planning scope.
                        </div>
                      )}
                    </div>

                    {/* Role Shortages Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                          Role-wise Shortage
                        </h4>
                        <span className="text-[10px] text-slate-400">Scheduled vs Present</span>
                      </div>

                      {roleShortages.length > 0 ? (
                        <div className="border border-[var(--border)] rounded-xl overflow-hidden text-xs">
                          <div className="grid grid-cols-12 bg-slate-100/70 dark:bg-slate-800/70 p-2.5 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-[var(--border)]">
                            <div className="col-span-5">Role</div>
                            <div className="col-span-2 text-center">Scheduled</div>
                            <div className="col-span-2 text-center">Present</div>
                            <div className="col-span-3 text-right">Shortage</div>
                          </div>
                          <div className="divide-y divide-[var(--border)]">
                            {roleShortages.map((r, ridx) => (
                              <div
                                key={ridx}
                                className="grid grid-cols-12 p-3 items-center bg-[var(--surface)] hover:bg-slate-50 dark:hover:bg-slate-900/40"
                              >
                                <div className="col-span-5 font-bold text-[var(--text)] truncate">
                                  {r.role}
                                </div>
                                <div className="col-span-2 text-center font-medium text-slate-600 dark:text-slate-300">
                                  {r.scheduled}
                                </div>
                                <div className="col-span-2 text-center font-medium text-slate-600 dark:text-slate-300">
                                  {r.present}
                                </div>
                                <div className="col-span-3 text-right font-bold text-rose-600 dark:text-rose-400">
                                  -{r.shortage} Short
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                          No critical role deficits detected.
                        </div>
                      )}
                    </div>

                    {/* Section Shortages Table */}
                    {sectionShortages.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                            Production Line &amp; Section Shortage
                          </h4>
                          <span className="text-[10px] text-slate-400">Required vs Available</span>
                        </div>
                        <div className="border border-[var(--border)] rounded-xl overflow-hidden text-xs">
                          <div className="grid grid-cols-12 bg-slate-100/70 dark:bg-slate-800/70 p-2.5 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-[var(--border)]">
                            <div className="col-span-5">Section / Line</div>
                            <div className="col-span-2 text-center">Required</div>
                            <div className="col-span-2 text-center">Available</div>
                            <div className="col-span-3 text-right">Shortage</div>
                          </div>
                          <div className="divide-y divide-[var(--border)]">
                            {sectionShortages.map((s, sidx) => (
                              <div
                                key={sidx}
                                className="grid grid-cols-12 p-3 items-center bg-[var(--surface)]"
                              >
                                <div className="col-span-5 font-bold text-[var(--text)] truncate">
                                  {sanitizeLabel(s.section_name)}
                                </div>
                                <div className="col-span-2 text-center font-medium text-slate-600 dark:text-slate-300">
                                  {s.required}
                                </div>
                                <div className="col-span-2 text-center font-medium text-slate-600 dark:text-slate-300">
                                  {s.available}
                                </div>
                                <div className="col-span-3 text-right font-bold text-amber-600 dark:text-amber-400">
                                  -{s.shortage} Short
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Replacement Candidates */}
                {activeTab === 'replacements' && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                        Eligible Candidates ({candidates.length})
                      </h4>
                      <span className="text-[10px] font-semibold text-slate-500">
                        {metrics?.disqualified_candidates_count ?? 0} Gated by Labor / Skill Rules
                      </span>
                    </div>

                    {candidates.length > 0 ? (
                      <div className="space-y-2.5">
                        {candidates.map((c, cidx) => (
                          <Card
                            key={c.employee_id || cidx}
                            className="p-3.5 border border-[var(--border)] hover:border-purple-300 dark:hover:border-purple-700 transition-all space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-black flex items-center justify-center text-xs">
                                  #{c.rank || cidx + 1}
                                </div>
                                <div>
                                  <div className="font-bold text-xs text-[var(--text)]">
                                    {c.full_name}{' '}
                                    <span className="font-mono text-[10px] text-slate-400 font-normal">
                                      ({c.employee_id})
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    {c.role} · {sanitizeLabel(c.department)} · Plant: {c.plant_id}
                                  </div>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
                                Match: {c.overall_score ?? c.score ?? 95}%
                              </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[10.5px]">
                              <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-[var(--border)]">
                                <span className="text-slate-400 block text-[9.5px]">Skill Grade</span>
                                <span className="font-bold text-[var(--text)] flex items-center gap-1">
                                  <GraduationCap className="w-3 h-3 text-purple-600" />
                                  {c.skill_level || c.skill_grade || 'Certified'}
                                </span>
                              </div>
                              <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-[var(--border)]">
                                <span className="text-slate-400 block text-[9.5px]">Turnaround Rest</span>
                                <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                  <Check className="w-3 h-3" />
                                  &ge; 12 Hours Rest
                                </span>
                              </div>
                              <div className="p-1.5 rounded bg-slate-50 dark:bg-slate-900 border border-[var(--border)] col-span-2 sm:col-span-1">
                                <span className="text-slate-400 block text-[9.5px]">Availability</span>
                                <span className="font-bold text-purple-600 dark:text-purple-400">
                                  Off-Duty / Standby
                                </span>
                              </div>
                            </div>

                            {c.certifications && c.certifications.length > 0 && (
                              <div className="text-[10px] text-slate-500 flex items-center gap-1.5 pt-1">
                                <Award className="w-3 h-3 text-purple-600 shrink-0" />
                                <span className="font-medium">Valid Certifications:</span>
                                <span className="truncate">{c.certifications.join(', ')}</span>
                              </div>
                            )}
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2">
                        <Users className="w-8 h-8 text-slate-400 mx-auto" />
                        <h5 className="font-bold text-xs text-[var(--text)]">
                          No eligible replacement candidates found for the selected planning scope.
                        </h5>
                        <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                          All evaluated standby personnel are either scheduled on active shifts or gated by mandatory safety rest rules (&ge; 12 hrs) and skill grade compliance.
                        </p>
                      </div>
                    )}

                    {/* Disqualification Audit Breakdown */}
                    {disqualifiedSummary.length > 0 && (
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[var(--border)] text-xs space-y-1.5">
                        <div className="font-bold text-[11px] text-[var(--text)] flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                          Compliance &amp; Labor Rest Gating ({metrics?.disqualified_candidates_count ?? 0} Disqualified):
                        </div>
                        <ul className="list-disc list-inside text-[10.5px] text-slate-500 space-y-1">
                          {disqualifiedSummary.map((d, didx) => {
                            if (typeof d === 'string') {
                              return <li key={didx}>{d}</li>;
                            }
                            if (typeof d === 'object' && d !== null) {
                              const reasons = Array.isArray(d.disqualify_reasons)
                                ? d.disqualify_reasons.join(', ')
                                : d.disqualify_reasons || 'Safety or compliance rule';
                              return (
                                <li key={d.employee_id || didx}>
                                  <span className="font-semibold text-[var(--text)]">
                                    {d.employee_name ? `${d.employee_name} (${d.employee_id})` : d.employee_id || `Candidate #${didx + 1}`}
                                  </span>
                                  {d.shift ? ` [Shift ${d.shift}]` : ''}: {reasons}
                                </li>
                              );
                            }
                            return <li key={didx}>{String(d)}</li>;
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: HR Action Plan & Governance */}
                {activeTab === 'actions' && (
                  <div className="space-y-4">
                    {/* Action Recommendations */}
                    <div className="space-y-2.5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                        Recommended Operational Actions
                      </h4>
                      {recs.map((r, ridx) => (
                        <Card key={r.id || ridx} className="p-3.5 border border-[var(--border)] space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[9.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              {r.category || 'Operations'}
                            </span>
                            <span className="text-[10px] text-slate-400">Owner: {r.owner || 'HRBP / Operations Lead'}</span>
                          </div>
                          <h5 className="text-xs font-bold text-[var(--text)]">{sanitizeLabel(r.action)}</h5>
                          <p className="text-[11px] text-[var(--secondary)] leading-relaxed">{sanitizeLabel(r.details)}</p>
                        </Card>
                      ))}
                    </div>

                    {/* HR Governance & Decision Support */}
                    <div className="p-4 rounded-xl border border-indigo-200/70 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                            HR Decision Support &amp; Governance
                          </h4>
                        </div>
                        {hrDecisionStatus && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                            {hrDecisionStatus === 'APPROVED' ? 'Recommendations Approved' : 'Review Acknowledged'} ({decisionTimestamp})
                          </span>
                        )}
                      </div>

                      <AutoCloseBanner
                        isCounting={autoClose.isCounting}
                        secondsLeft={autoClose.secondsLeft}
                        onCancel={autoClose.cancel}
                      />

                      <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300 leading-relaxed">
                        <strong>Advisory Governance:</strong> Database functions in read-only mode. Workforce Planning Agent generates advisory recommendations for HR and Plant leadership. Disciplinary action or roster mutations are not automatically applied.
                      </p>

                      {/* Approval Feedback */}
                      {approvalFeedback && approvalFeedback.type === 'success' && (
                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100 text-xs flex items-center justify-between gap-2 shadow-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span className="font-bold truncate">{approvalFeedback.message}</span>
                          </div>
                          {approvalFeedback.approvalId && (
                            <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300 shrink-0 px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60">
                              {approvalFeedback.approvalId}
                            </span>
                          )}
                        </div>
                      )}

                      {approvalFeedback && approvalFeedback.type === 'error' && (
                        <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/70 border border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-100 text-xs flex items-center justify-between gap-2 shadow-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span className="font-semibold">{approvalFeedback.message}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setApprovalFeedback(null)}
                            className="text-[10px] font-bold text-rose-700 dark:text-rose-300 hover:underline shrink-0"
                          >
                            Dismiss
                          </button>
                        </div>
                      )}

                      {/* Recorded HR Review Summary Box */}
                      {hrDecisionStatus === 'ACKNOWLEDGED' && recordedReviewData && (
                        <div className="p-3 rounded-lg bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs space-y-1.5">
                          <div className="flex items-center justify-between text-purple-900 dark:text-purple-300 font-semibold">
                            <span className="flex items-center gap-1.5">
                              <ClipboardCheck className="w-3.5 h-3.5 text-purple-600" />
                              HR Review Recorded ({decisionTimestamp}) by {recordedReviewData.reviewerName || 'Plant HRBP / Operations Lead'}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 font-bold uppercase">
                              {recordedReviewData.decisionLabel || 'Review Recorded'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--secondary)] whitespace-pre-wrap bg-white/70 dark:bg-slate-900/50 p-2 rounded border border-purple-100 dark:border-purple-900">
                            {recordedReviewData.notes}
                          </p>
                        </div>
                      )}

                      {/* HR Notes */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-[var(--text)]">
                          HR Review Notes / Planning Justification:
                        </label>
                        <textarea
                          value={hrNotes}
                          onChange={(e) => {
                            autoClose.cancel();
                            setHrNotes(e.target.value);
                          }}
                          disabled={isSubmittingApproval || hrDecisionStatus === 'APPROVED'}
                          placeholder="Add administrative review notes (e.g., Reviewed critical assembly deficit; authorized standby replacement candidate #1 for Shift B)..."
                          className="w-full text-xs p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none h-16 disabled:opacity-60"
                        />
                      </div>

                      {/* Decision Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Button
                          ref={recordReviewBtnRef}
                          size="sm"
                          onClick={handleOpenReviewPanel}
                          disabled={loading || isSubmittingApproval || hrDecisionStatus === 'APPROVED'}
                          className={`text-xs gap-1.5 h-8 px-3 ${
                            hrDecisionStatus === 'ACKNOWLEDGED'
                              ? 'bg-purple-700 text-white'
                              : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                          }`}
                        >
                          {isSubmittingApproval ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <FileCheck2 className="w-3.5 h-3.5" />
                          )}
                          Record HR Review
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => handleRecordHrReview('APPROVED')}
                          disabled={loading || isSubmittingApproval || hrDecisionStatus === 'APPROVED'}
                          className={`text-xs gap-1.5 h-8 px-3 ${
                            hrDecisionStatus === 'APPROVED'
                              ? 'bg-emerald-700 text-white'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700'
                          }`}
                        >
                          {isSubmittingApproval ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          Approve Standby Adjustments
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            autoClose.cancel();
                            setIsReviewPanelOpen(false);
                            setRecordedReviewData(null);
                            setHrDecisionStatus(null);
                            setApprovalFeedback(null);
                            setHrNotes('');
                          }}
                          disabled={isSubmittingApproval}
                          className="text-xs text-slate-400 hover:text-slate-600 h-8 ml-auto"
                        >
                          Reset Decision
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="px-5 py-3 border-t border-[var(--border)] bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <div className="flex items-center gap-2">
              <span>Workforce Planning Agent</span>
              {result?.execution_id && (
                <span className="font-mono text-[10px] text-slate-400">
                  · {result.execution_id}
                </span>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={onClose} className="h-7 px-3 text-xs">
              Close Drawer
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default WorkforcePlanningAgentDrawer;
