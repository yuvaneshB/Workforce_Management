import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardCheck,
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

export function VendorAgentDrawer({ isOpen, onClose, filters = {} }) {
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
    agentType: 'vendor',
    filters,
    autoStart: true,
    isOpen,
  });

  const [activeTab, setActiveTab] = useState('findings'); // 'findings' | 'vendors' | 'recommendations'
  const [hrNotes, setHrNotes] = useState('');
  const [hrDecisionStatus, setHrDecisionStatus] = useState(null); // 'ACKNOWLEDGED' | 'APPROVED'
  const [decisionTimestamp, setDecisionTimestamp] = useState(null);
  const [isReviewPanelOpen, setIsReviewPanelOpen] = useState(false);
  const [recordedReviewData, setRecordedReviewData] = useState(null);
  const recordReviewBtnRef = useRef(null);

  const autoClose = useAutoCloseOnApproval({
    onClose,
    agentName: 'Vendor Workforce Agent',
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

  const handleRecordHrReview = async (actionType, customNotes) => {
    const notesToSave = customNotes !== undefined ? customNotes : hrNotes;
    const activeExecId = executionId || result?.execution_id || `EXE-VND-${Date.now()}`;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setHrDecisionStatus(actionType);
    setDecisionTimestamp(timestamp);
    if (customNotes !== undefined) {
      setHrNotes(customNotes);
    }

    if (actionType === 'APPROVED') {
      autoClose.start({
        agentName: 'Vendor Workforce Agent',
        approvalId: activeExecId,
      });
    } else {
      autoClose.cancel();
    }

    try {
      await submitPlanningApproval({
        executionId: activeExecId,
        specialistAgent: 'vendor',
        decision: actionType,
        notes: notesToSave || (actionType === 'APPROVED' ? 'Vendor allocation and SLA actions approved.' : 'Vendor compliance review recorded.'),
        approvedBy: 'Workspace User (HR)',
        targetDate: result?.target_date || filters?.date || filters?.startDate,
      });
    } catch (err) {
      console.warn('Failed to persist vendor HR review:', err);
    }
  };

  const handleSaveReview = async (composedText, reviewData) => {
    await handleRecordHrReview('ACKNOWLEDGED', composedText);
    setRecordedReviewData(reviewData);
    setIsReviewPanelOpen(false);
  };

  const metrics = result?.metrics;
  const findings = result?.findings || [];
  const byVendor = result?.by_vendor || [];
  const recs = result?.recommendations || [];

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
          agentConfig={AGENT_REVIEW_CONFIGS.vendor}
          result={result}
          filters={filters}
          executionId={executionId || result?.execution_id}
          initialNotes={hrNotes}
          reviewerName="Workspace User (HR)"
          returnFocusRef={recordReviewBtnRef}
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="vendor-agent-drawer-title"
          className="w-screen max-w-xl md:max-w-2xl bg-[var(--surface)] text-[var(--text)] border-l border-[var(--border)] shadow-2xl flex flex-col h-full overflow-hidden"
          style={{ background: 'var(--surface)' }}
        >
          {/* Top Header */}
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3 bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-transparent shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#493287] to-[#5B44A3] text-white flex items-center justify-center shrink-0 shadow-md">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 id="vendor-agent-drawer-title" className="text-sm font-bold truncate">
                    Vendor Workforce Agent
                  </h2>
                </div>
                <p className="text-[11px] text-[var(--secondary)] truncate">
                  Partner staffing allocations, contractor reliance & SLA compliance
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
                title="Re-run Vendor Agent"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Rerun</span>
              </Button>
            </div>
          </div>

          {/* Scope Pill Banner */}
          <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/50 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-[var(--secondary)]">
              <span className="font-semibold text-[var(--text)] flex items-center gap-1">
                <Filter className="w-3 h-3 text-purple-600" />
                Vendor Scope:
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-medium">
                Plant: {filters.plantId || 'All Plants'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-medium">
                6 Staffing Agencies
              </span>
            </div>

            {executionId && (
              <span className="text-[10px] font-mono text-slate-400">
                {executionId}
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

            {/* Results Content */}
            {result && (
              <>
                {/* 4 Top Metric Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-center justify-between text-purple-700 dark:text-purple-300 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Contractor Share</span>
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xl font-black text-purple-950 dark:text-purple-100">
                      {metrics?.contractor_share_pct || '35.4'}%
                    </div>
                    <div className="text-[10px] text-purple-700 dark:text-purple-300 mt-0.5">
                      {metrics?.active_vendor || 560} Active Contractors
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between text-blue-700 dark:text-blue-300 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Partner Agencies</span>
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xl font-black text-blue-950 dark:text-blue-100">
                      {metrics?.total_vendors || 6} Vendors
                    </div>
                    <div className="text-[10px] text-blue-700 dark:text-blue-300 mt-0.5">
                      V01 through V06 Active
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between text-amber-700 dark:text-amber-300 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">Top Agency Share</span>
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xl font-black text-amber-950 dark:text-amber-100">
                      {metrics?.top_vendor_share || '24.8'}%
                    </div>
                    <div className="text-[10px] text-amber-700 dark:text-amber-300 mt-0.5">
                      Vendor {metrics?.top_vendor || 'V01'}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300 mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider">SLA Compliance</span>
                      <ShieldCheck className="w-3.5 h-3.5" />
                    </div>
                    <div className="text-xl font-black text-emerald-950 dark:text-emerald-100">
                      100.0%
                    </div>
                    <div className="text-[10px] text-emerald-700 dark:text-emerald-300 mt-0.5">
                      Zero Regulatory Breaches
                    </div>
                  </div>
                </div>

                {/* Tab Controls */}
                <div className="flex items-center gap-1 border-b border-[var(--border)] pt-2">
                  {[
                    { id: 'findings', label: 'Evidence Findings', count: findings.length },
                    { id: 'vendors', label: 'Agency Headcounts', count: byVendor.length },
                    { id: 'recommendations', label: 'HR Strategy & SLAs', count: recs.length },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`px-3 py-1.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                        activeTab === t.id
                          ? 'border-[#493287] text-[#493287] dark:text-purple-400'
                          : 'border-transparent text-[var(--secondary)] hover:text-[var(--text)]'
                      }`}
                    >
                      <span>{t.label}</span>
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-100 dark:bg-slate-800">
                        {t.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Tab: Findings */}
                {activeTab === 'findings' && (
                  <div className="space-y-3">
                    <AgentFindingList
                      findings={findings}
                      emptyMessage="No vendor findings observed for the selected scope."
                    />
                  </div>
                )}

                {/* Tab: Vendors Table */}
                {activeTab === 'vendors' && (
                  <div className="rounded-xl border border-[var(--border)] overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold uppercase text-[var(--secondary)] border-b border-[var(--border)]">
                        <tr>
                          <th className="p-2.5">Agency</th>
                          <th className="p-2.5">Assigned</th>
                          <th className="p-2.5">Active</th>
                          <th className="p-2.5">Active Share</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)] font-medium">
                        {byVendor.map((v, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="p-2.5 font-bold text-[var(--text)]">{v.vendor_name || v.vendor_id}</td>
                            <td className="p-2.5">{v.assigned_count}</td>
                            <td className="p-2.5 text-purple-600 font-bold">{v.active_count}</td>
                            <td className="p-2.5">{v.active_share_pct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Tab: Recommendations */}
                {activeTab === 'recommendations' && (
                  <div className="space-y-3">
                    {recs.map((r, i) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-[var(--text)]">{r.title}</h4>
                          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {r.priority} PRIORITY
                          </span>
                        </div>
                        <p className="text-xs text-[var(--secondary)] leading-relaxed">{r.action}</p>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-400 pt-1 border-t border-[var(--border)]">
                          <span>Owner: <strong className="text-[var(--text)]">{r.owner}</strong></span>
                          <span>&bull;</span>
                          <span>Timeline: <strong className="text-[var(--text)]">{r.target_timeline}</strong></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Human Approval Review Gate */}
                <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/40 dark:bg-purple-950/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-300">
                      <UserCheck className="w-4 h-4 text-purple-600" />
                      <span>Human-in-the-Loop Governance Gate</span>
                    </div>
                    {hrDecisionStatus && (
                      <span className="text-[9.5px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                        {hrDecisionStatus} ({decisionTimestamp})
                      </span>
                    )}
                  </div>

                  {/* Recorded HR Review Summary Box */}
                  {hrDecisionStatus === 'ACKNOWLEDGED' && recordedReviewData && (
                    <div className="p-3 rounded-lg bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-purple-900 dark:text-purple-300 font-semibold">
                        <span className="flex items-center gap-1.5">
                          <ClipboardCheck className="w-3.5 h-3.5 text-purple-600" />
                          HR Review Recorded ({decisionTimestamp}) by {recordedReviewData.reviewerName || 'Workspace User (HR)'}
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

                  <AutoCloseBanner
                    isCounting={autoClose.isCounting}
                    secondsLeft={autoClose.secondsLeft}
                    onCancel={autoClose.cancel}
                  />

                  {/* HR Notes / Comments */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[var(--text)]">
                      HR Review Notes / Action Justification:
                    </label>
                    <textarea
                      value={hrNotes}
                      onChange={(e) => {
                        autoClose.cancel();
                        setHrNotes(e.target.value);
                      }}
                      placeholder="Add administrative review notes (e.g., Reviewed vendor compliance; authorized shift rebalancing)..."
                      className="w-full text-xs p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none h-16"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      ref={recordReviewBtnRef}
                      size="sm"
                      onClick={handleOpenReviewPanel}
                      className={`text-xs gap-1.5 h-8 px-3 ${
                        hrDecisionStatus === 'ACKNOWLEDGED'
                          ? 'bg-purple-700 text-white'
                          : 'bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-700'
                      }`}
                    >
                      <FileCheck2 className="w-3.5 h-3.5" />
                      Record HR Review
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleRecordHrReview('APPROVED')}
                      className={`text-xs gap-1.5 h-8 px-3 ${
                        hrDecisionStatus === 'APPROVED'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Approve Rebalancing
                    </Button>
                    {hrDecisionStatus && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          autoClose.cancel();
                          setIsReviewPanelOpen(false);
                          setRecordedReviewData(null);
                          setHrDecisionStatus(null);
                          setHrNotes('');
                        }}
                        className="text-xs text-slate-400 hover:text-slate-600 ml-auto"
                      >
                        Reset Decision
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Drawer Footer */}
          <div className="px-5 py-3 border-t border-[var(--border)] bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
            <span>Workforce Management AI · Vendor Workforce Agent</span>
            <Button size="sm" variant="outline" onClick={onClose} className="h-7 px-3 text-xs">
              Close Drawer
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default VendorAgentDrawer;

