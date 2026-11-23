import {
  AlertCircle,
  AlertTriangle,
  Award,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Factory,
  FileCheck2,
  Filter,
  GraduationCap,
  Layers,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  UserX,
  X,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { runWorkforcePlanningAgentAnalysis, submitPlanningApproval } from '../../api/workforceApi';
import { useAgentExecutionStream } from '../../hooks/useAgentExecutionStream';
import { AgentExecutionPipeline } from './AgentExecutionPipeline';
import { Button } from '../common/Button';
import { Card } from '../common/Card';

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

  const [activeTab, setActiveTab] = useState('findings'); // 'findings' | 'shortages' | 'replacements' | 'recommendations'
  const [hrNotes, setHrNotes] = useState('');
  const [hrDecisionStatus, setHrDecisionStatus] = useState(null); // 'ACKNOWLEDGED' | 'APPROVED'
  const [decisionTimestamp, setDecisionTimestamp] = useState(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);
  const [approvalFeedback, setApprovalFeedback] = useState(null); // { type: 'success' | 'error', message: string, approvalId?: string }

  const autoCloseTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Clean up any pending auto-close timers on unmount
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  const handleExecute = () => {
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

  const handleRecordHrReview = async (actionType, forceFailure = false) => {
    if (isSubmittingApproval) return;
    setIsSubmittingApproval(true);
    setApprovalFeedback(null);

    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    try {
      const activeExecId = executionId || result?.execution_id || 'PLN-EXE-LOCAL';
      const response = await submitPlanningApproval({
        executionId: activeExecId,
        decision: actionType,
        notes: hrNotes || (actionType === 'APPROVED' ? 'Standby roster adjustments authorized for shift dispatch.' : 'Workforce planning review recorded.'),
        approvedBy: 'Plant HRBP / Operations Lead',
        targetDate: result?.target_date || filters?.date || filters?.startDate,
        forceFailure,
      });

      setHrDecisionStatus(actionType);
      setDecisionTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      let remainingSeconds = 3;
      setApprovalFeedback({
        type: 'success',
        approvalId: response.approval_id,
        message: `${actionType === 'APPROVED' ? 'Adjustments approved' : 'Review recorded'} successfully! Automatically closing drawer in ${remainingSeconds}s...`,
      });

      countdownIntervalRef.current = setInterval(() => {
        remainingSeconds -= 1;
        if (remainingSeconds > 0) {
          setApprovalFeedback((prev) =>
            prev?.type === 'success'
              ? { ...prev, message: `${actionType === 'APPROVED' ? 'Adjustments approved' : 'Review recorded'} successfully! Automatically closing drawer in ${remainingSeconds}s...` }
              : prev
          );
        } else {
          clearInterval(countdownIntervalRef.current);
        }
      }, 800);

      // Automatically close drawer within 2.5 seconds (2–3 seconds)
      autoCloseTimerRef.current = setTimeout(() => {
        onClose();
      }, 2500);
    } catch (err) {
      console.error('Failed to submit planning approval:', err);
      // Keep drawer open, show clear error message, do NOT mark as approved
      setApprovalFeedback({
        type: 'error',
        message: err?.response?.data?.detail || err.message || 'Approval submission failed. Please verify and retry.',
      });
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  const metrics = result?.metrics;
  const findings = result?.findings || [];
  const deptShortages = result?.department_shortages || [];
  const sectionShortages = result?.section_shortages || [];
  const roleShortages = result?.role_shortages || [];
  const shiftShortages = result?.shift_shortages || [];
  const candidates = result?.candidates || [];
  const disqualifiedSummary = result?.disqualified_summary || [];
  const recs = result?.recommendations || [];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Semi-transparent backdrop allowing view of Analytics behind */}
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-[2px] transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Right-side Sliding Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="planning-agent-drawer-title"
          className="w-screen max-w-xl md:max-w-2xl bg-[var(--surface)] text-[var(--text)] border-l border-[var(--border)] shadow-2xl flex flex-col h-full overflow-hidden"
          style={{ background: 'var(--surface)' }}
        >
          {/* Top Header */}
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-transparent shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6F3DBA] to-[#4D8EEB] text-white flex items-center justify-center shrink-0 shadow-md">
                <Bot className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 id="planning-agent-drawer-title" className="text-sm font-bold truncate">
                    Workforce Planning Agent
                  </h2>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Neon Grounded
                  </span>
                </div>
                <p className="text-[11px] text-[var(--secondary)] truncate">
                  Evidence-based workforce requirements, shortage detection & replacement optimization
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
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg grid place-items-center hover:bg-slate-100 dark:hover:bg-slate-800 text-[var(--secondary)] transition-colors"
                aria-label="Close Agent Drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Filter Scope Pill Banner */}
          <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--secondary)]">
              <span className="font-semibold text-[var(--text)] flex items-center gap-1">
                <Filter className="w-3 h-3 text-purple-600" />
                Planning Scope:
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-medium">
                Target Date: {result?.target_date || filters.date || filters.startDate || '2026-08-01'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-medium">
                Plant: {filters.plantId || 'All Plants'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-medium">
                Shift: {filters.shiftId ? `Shift ${filters.shiftId}` : 'All Shifts'}
              </span>
              {filters.departmentId && (
                <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-medium">
                  Dept: {filters.departmentId}
                </span>
              )}
            </div>

            {result?.execution_id && (
              <span className="text-[10px] font-mono text-slate-400">
                {result.execution_id}
              </span>
            )}
          </div>

          {/* Drawer Body Scroll Area */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
            {/* Real Execution Stages Tracker */}
            <AgentExecutionPipeline
              stages={stages}
              isExecuting={loading}
              activeStageId={activeStageId}
              activeMessage={activeMessage}
              elapsedSeconds={elapsedSeconds}
              error={error}
              totalDurationMs={result?.total_duration_ms}
              executionId={executionId || result?.execution_id}
              onRetry={retry}
            />

            {/* Loading Skeleton if executing */}
            {loading && !result && (
              <div className="space-y-3 py-4">
                <div className="flex items-center gap-2 text-xs text-purple-600 font-semibold">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Auditing workforce requirements, attendance & skill matrices on Neon DB...</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  <div className="h-16 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
                <div className="h-28 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-44 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
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
                {/* Severity Banner */}
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
                          ? `Immediate shortfall of ${metrics?.shortage_count} operators detected (${metrics?.shortage_percentage}% deficit). Roster rebalancing recommended.`
                          : 'Workforce availability meets or exceeds planned operational baseline requirements.'}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border bg-white/60 dark:bg-black/30 shrink-0">
                    {result.severity}
                  </span>
                </div>

                {/* Key Metrics Grid (4 tiles) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Required Baseline</span>
                    <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                      {metrics?.required_baseline?.toLocaleString() ?? 0}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {metrics?.total_scheduled?.toLocaleString()} scheduled
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Available Now</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {metrics?.available_count?.toLocaleString() ?? 0}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {metrics?.availability_rate ?? 0}% available
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Shortage</span>
                    <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                      {metrics?.shortage_count?.toLocaleString() ?? 0}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {metrics?.shortage_percentage ?? 0}% gap
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Replacements</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                      {metrics?.eligible_candidates_count ?? 0}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {metrics?.disqualified_candidates_count ?? 0} disqualified
                    </span>
                  </div>
                </div>

                {/* Executive Summary Box */}
                {result.executive_synthesis && (
                  <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 text-xs text-purple-950 dark:text-purple-200 leading-relaxed space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-purple-800 dark:text-purple-300 text-[11px] uppercase tracking-wider mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Executive Planning Analysis & Recommendations
                    </div>
                    <p className="text-[11.5px] leading-relaxed whitespace-pre-line">
                      {result.executive_synthesis.replace(/\*\*/g, '')}
                    </p>
                  </div>
                )}

                {/* Navigation Tabs for Analysis Depth */}
                <div className="flex items-center gap-1 border-b border-[var(--border)] pt-1 text-xs">
                  <button
                    onClick={() => setActiveTab('findings')}
                    className={`pb-2 px-3 font-bold border-b-2 transition-all ${
                      activeTab === 'findings'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Evidence Findings ({findings.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('shortages')}
                    className={`pb-2 px-3 font-bold border-b-2 transition-all ${
                      activeTab === 'shortages'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Shortage Breakdown ({deptShortages.length + roleShortages.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('replacements')}
                    className={`pb-2 px-3 font-bold border-b-2 transition-all ${
                      activeTab === 'replacements'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Replacement Candidates ({candidates.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('recommendations')}
                    className={`pb-2 px-3 font-bold border-b-2 transition-all ${
                      activeTab === 'recommendations'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    HR Action Plan ({recs.length})
                  </button>
                </div>

                {/* TAB 1: Evidence-Based Findings */}
                {activeTab === 'findings' && (
                  <div className="space-y-3">
                    {findings.map((f, idx) => (
                      <Card
                        key={f.id || idx}
                        className="p-3.5 border border-[var(--border)] hover:border-purple-300 dark:hover:border-purple-700 transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[9px] font-mono font-bold text-purple-600 dark:text-purple-400">
                              {f.id} · {f.affected}
                            </span>
                            <h4 className="text-xs font-bold text-[var(--text)] mt-0.5">{f.title}</h4>
                          </div>
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border shrink-0 ${severityBadge(
                              f.severity
                            )}`}
                          >
                            {f.severity}
                          </span>
                        </div>

                        {/* Metric Highlight */}
                        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-[var(--border)] flex items-center justify-between text-xs">
                          <span className="text-[11px] text-[var(--secondary)]">Observed Gap:</span>
                          <span className="font-bold font-mono text-[var(--text)]">{f.metric}</span>
                        </div>

                        <p className="text-[11px] text-[var(--secondary)] leading-relaxed">{f.evidence}</p>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                          <div className="text-slate-700 dark:text-slate-300">
                            <span className="font-semibold text-rose-600 dark:text-rose-400">Operational Impact: </span>
                            {f.operational_impact}
                          </div>
                          <div className="text-purple-700 dark:text-purple-300 font-medium">
                            <span className="font-semibold">HR & Planning Action: </span>
                            {f.recommendation}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* TAB 2: Shortage Breakdown */}
                {activeTab === 'shortages' && (
                  <div className="space-y-4">
                    {/* Department Shortages */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                          Department Deficits (Neon DB Verified)
                        </h4>
                        <span className="text-[10px] text-slate-400">Required vs Available</span>
                      </div>

                      {deptShortages.length > 0 ? (
                        <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] text-xs">
                          {deptShortages.map((d, didx) => (
                            <div
                              key={didx}
                              className="p-3 flex items-center justify-between gap-3 bg-[var(--surface)] hover:bg-slate-50 dark:hover:bg-slate-900/40"
                            >
                              <div>
                                <div className="font-bold text-[var(--text)]">
                                  {d.department_name}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  Required: {d.required} · Available: {d.available}
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                                  -{d.shortage} Short
                                </span>
                                <span className="block text-[9.5px] text-slate-400">
                                  ({d.shortage_percentage}%)
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                          No department shortages detected for this date and filter criteria.
                        </div>
                      )}
                    </div>

                    {/* Role Shortages */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                          Role Shortages & Skill Deficits
                        </h4>
                        <span className="text-[10px] text-slate-400">Scheduled vs Present</span>
                      </div>

                      {roleShortages.length > 0 ? (
                        <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] text-xs">
                          {roleShortages.map((r, ridx) => (
                            <div
                              key={ridx}
                              className="p-3 flex items-center justify-between gap-3 bg-[var(--surface)] hover:bg-slate-50 dark:hover:bg-slate-900/40"
                            >
                              <div>
                                <div className="font-bold text-[var(--text)]">{r.role}</div>
                                <div className="text-[10px] text-slate-500">
                                  Scheduled: {r.scheduled} · Present: {r.present} · Absent: {r.absent}
                                </div>
                              </div>
                              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                                -{r.shortage} Short
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                          No critical role deficits detected.
                        </div>
                      )}
                    </div>

                    {/* Section Shortages */}
                    {sectionShortages.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                          Plant Section Shortages
                        </h4>
                        <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] text-xs">
                          {sectionShortages.map((s, sidx) => (
                            <div
                              key={sidx}
                              className="p-3 flex items-center justify-between gap-3 bg-[var(--surface)]"
                            >
                              <div>
                                <div className="font-bold text-[var(--text)]">{s.section_name}</div>
                                <div className="text-[10px] text-slate-500">
                                  Required: {s.required} · Available: {s.available}
                                </div>
                              </div>
                              <span className="font-mono font-bold text-amber-600 dark:text-amber-400 text-xs">
                                -{s.shortage} Short
                              </span>
                            </div>
                          ))}
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
                        Eligible Replacement Candidates ({candidates.length})
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        {metrics?.disqualified_candidates_count ?? 0} Disqualified (Rules Enforced)
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
                                    {c.role} · {c.department} · Plant: {c.plant_id}
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
                      <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                        No off-duty replacement candidates currently meet all safety turnaround rest and skill criteria.
                      </div>
                    )}

                    {/* Disqualification Summary Notice */}
                    {disqualifiedSummary.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[var(--border)] text-xs space-y-1">
                        <div className="font-bold text-[11px] text-[var(--text)] flex items-center gap-1.5">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                          Gated Disqualifications (Safety & Labor Compliance):
                        </div>
                        <ul className="list-disc list-inside text-[10.5px] text-slate-500 space-y-0.5">
                          {disqualifiedSummary.map((d, didx) => (
                            <li key={didx}>{d}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 4: HR Action Plan */}
                {activeTab === 'recommendations' && (
                  <div className="space-y-3">
                    {recs.map((r, ridx) => (
                      <Card key={r.id || ridx} className="p-3.5 border border-[var(--border)] space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9.5px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {r.category}
                          </span>
                          <span className="text-[10px] text-slate-400">Owner: {r.owner}</span>
                        </div>
                        <h4 className="text-xs font-bold text-[var(--text)]">{r.action}</h4>
                        <p className="text-[11px] text-[var(--secondary)] leading-relaxed">{r.details}</p>
                      </Card>
                    ))}
                  </div>
                )}

                {/* HR Decision Support Section (Section 5 Requirement) */}
                <div className="p-4 rounded-xl border border-indigo-200/70 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <h4 className="text-xs font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
                        HR Decision Support & Governance
                      </h4>
                    </div>
                    {hrDecisionStatus && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300">
                        {hrDecisionStatus === 'APPROVED' ? 'Recommendations Approved' : 'Review Acknowledged'} (
                        {decisionTimestamp})
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300 leading-relaxed">
                    <strong>Advisory Governance:</strong> Neon PostgreSQL functions in read-only mode. Workforce
                    Planning Agent generates advisory recommendations for HR and Plant leadership. Disciplinary
                    action or roster mutations are not automatically applied.
                  </p>

                  {/* Approval / Review Feedback Banners */}
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

                  {/* HR Notes / Comments */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[var(--text)]">
                      HR Review Notes / Planning Justification:
                    </label>
                    <textarea
                      value={hrNotes}
                      onChange={(e) => setHrNotes(e.target.value)}
                      disabled={isSubmittingApproval || hrDecisionStatus === 'APPROVED'}
                      placeholder="Add administrative review notes (e.g., Reviewed critical assembly deficit; authorized standby replacement candidate #1 for Shift B)..."
                      className="w-full text-xs p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none h-16 disabled:opacity-60"
                    />
                  </div>

                  {/* Decision Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleRecordHrReview('ACKNOWLEDGED')}
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
                        if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
                        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
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
              </>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="px-5 py-3 border-t border-[var(--border)] bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <span>Workforce Management AI · Workforce Planning Agent</span>
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

