import {
  AlertCircle,
  AlertTriangle,
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
  UserMinus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { runAttritionAgentAnalysis } from '../../api/workforceApi';
import { useAgentExecutionStream } from '../../hooks/useAgentExecutionStream';
import { AgentExecutionPipeline } from './AgentExecutionPipeline';
import { Button } from '../common/Button';
import { Card } from '../common/Card';

export function AttritionAgentDrawer({ isOpen, onClose, filters = {} }) {
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
    agentType: 'attrition',
    filters,
    autoStart: true,
    isOpen,
  });

  const [activeTab, setActiveTab] = useState('findings'); // 'findings' | 'hotspots' | 'tenure' | 'retention'
  const [hrNotes, setHrNotes] = useState('');
  const [hrDecisionStatus, setHrDecisionStatus] = useState(null); // 'ACKNOWLEDGED' | 'APPROVED'
  const [decisionTimestamp, setDecisionTimestamp] = useState(null);

  const handleExecute = () => execute();

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

  const handleRecordHrReview = (actionType) => {
    setHrDecisionStatus(actionType);
    setDecisionTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
  };

  const metrics = result?.metrics;
  const findings = result?.findings || [];
  const byDept = result?.by_department || [];
  const byPlant = result?.by_plant || [];
  const byVendor = result?.by_vendor || [];
  const byTenure = result?.by_tenure || [];
  const byReason = result?.by_reason || [];
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
          aria-labelledby="attrition-agent-drawer-title"
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
                  <h2 id="attrition-agent-drawer-title" className="text-sm font-bold truncate">
                    Attrition & Retention Agent
                  </h2>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Neon Grounded
                  </span>
                </div>
                <p className="text-[11px] text-[var(--secondary)] truncate">
                  Evidence-based employee exits, tenure patterns & retention strategy
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
                title="Re-run Attrition Agent"
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
                Attrition Scope:
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-medium">
                {filters.startDate || '2025-10-25'} → {filters.endDate || '2026-11-02'}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-medium">
                Plant: {filters.plantId || 'All Plants'}
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
                  <span>Auditing 120 verified employee exit records from Neon PostgreSQL...</span>
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
                        Attrition Risk Level: {result.severity}
                      </div>
                      <div className="text-[11px] opacity-90 leading-tight mt-0.5">
                        {metrics?.overall_attrition_rate >= 7.0
                          ? `Overall attrition rate at ${metrics?.overall_attrition_rate}%. Concentrated departures in Final Assembly require retention interventions.`
                          : 'Attrition levels within sustainable manufacturing industry benchmarks.'}
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
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Exits</span>
                    <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                      {metrics?.total_exits ?? 0}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {metrics?.permanent_exits} Perm · {metrics?.vendor_exits} Vendor
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Attrition Rate</span>
                    <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                      {metrics?.overall_attrition_rate ?? 0}%
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      of {metrics?.total_workforce_base?.toLocaleString()} base staff
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Retention Rate</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {metrics?.retention_rate ?? 0}%
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {metrics?.active_employees?.toLocaleString()} retained
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Avg Exit Tenure</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                      {metrics?.average_tenure_years ?? 0} y
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {metrics?.early_exits_count} early (&lt; 2 yrs)
                    </span>
                  </div>
                </div>

                {/* Executive Summary Box */}
                {result.executive_synthesis && (
                  <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 text-xs text-purple-950 dark:text-purple-200 leading-relaxed space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-purple-800 dark:text-purple-300 text-[11px] uppercase tracking-wider mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Executive Retention Analysis & Findings
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
                    onClick={() => setActiveTab('hotspots')}
                    className={`pb-2 px-3 font-bold border-b-2 transition-all ${
                      activeTab === 'hotspots'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Dept & Plant Churn ({byDept.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('tenure')}
                    className={`pb-2 px-3 font-bold border-b-2 transition-all ${
                      activeTab === 'tenure'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Tenure & Early Exits ({byTenure.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('retention')}
                    className={`pb-2 px-3 font-bold border-b-2 transition-all ${
                      activeTab === 'retention'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Retention Plan ({recs.length})
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
                          <span className="text-[11px] text-[var(--secondary)]">Observed Turnover:</span>
                          <span className="font-bold font-mono text-[var(--text)]">{f.metric}</span>
                        </div>

                        <p className="text-[11px] text-[var(--secondary)] leading-relaxed">{f.evidence}</p>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                          <div className="text-slate-700 dark:text-slate-300">
                            <span className="font-semibold text-rose-600 dark:text-rose-400">Operational Impact: </span>
                            {f.operational_impact}
                          </div>
                          <div className="text-purple-700 dark:text-purple-300 font-medium">
                            <span className="font-semibold">HR Retention Action: </span>
                            {f.recommendation}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* TAB 2: Department & Plant Churn */}
                {activeTab === 'hotspots' && (
                  <div className="space-y-4">
                    {/* Department-wise Churn Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                          Department Exit Concentration (Neon DB Verified)
                        </h4>
                        <span className="text-[10px] text-slate-400">Ranked by Headcount Exits</span>
                      </div>

                      <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] text-xs">
                        {byDept.map((d, didx) => (
                          <div
                            key={didx}
                            className="p-3 flex items-center justify-between gap-3 bg-[var(--surface)] hover:bg-slate-50 dark:hover:bg-slate-900/40"
                          >
                            <div>
                              <div className="font-bold text-[var(--text)] flex items-center gap-1.5">
                                <span>{d.department}</span>
                                <span className="font-mono text-[10px] text-slate-400 font-normal">
                                  ({d.department_id})
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                                {d.count} Exits
                              </span>
                              <span className="block text-[9.5px] text-slate-400">
                                {d.pct} of total
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Plant & Vendor Split */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Plant Breakdown */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                          Plant Comparison
                        </h4>
                        <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] text-xs">
                          {byPlant.map((p, pidx) => (
                            <div key={pidx} className="p-2.5 flex items-center justify-between bg-[var(--surface)]">
                              <span className="font-bold text-[var(--text)]">{p.plant_id}</span>
                              <div className="text-right">
                                <span className="font-mono font-bold text-[var(--text)]">{p.count} Exits</span>
                                <span className="block text-[9.5px] text-slate-400">({p.pct})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Vendor Breakdown */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                          Top Vendor Sources
                        </h4>
                        <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] text-xs">
                          {byVendor.slice(0, 4).map((v, vidx) => (
                            <div key={vidx} className="p-2.5 flex items-center justify-between bg-[var(--surface)]">
                              <span className="font-bold text-[var(--text)] truncate max-w-[120px]">{v.vendor}</span>
                              <div className="text-right">
                                <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-xs">
                                  {v.count} Exits
                                </span>
                                <span className="block text-[9.5px] text-slate-400">({v.pct})</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: Tenure & Early Exits */}
                {activeTab === 'tenure' && (
                  <div className="space-y-4">
                    {/* Tenure Distribution Cards */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                          Tenure-Wise Departure Bands
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          Avg Tenure: {metrics?.average_tenure_years} Years
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                        {byTenure.map((t, tidx) => (
                          <div
                            key={tidx}
                            className={`p-3 rounded-xl border text-center ${
                              t.band === '< 1 Year' || t.band === '1 - 2 Years'
                                ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20'
                                : 'border-[var(--border)] bg-[var(--surface)]'
                            }`}
                          >
                            <span className="text-[10px] uppercase font-bold text-slate-400 block">{t.band}</span>
                            <span className="text-base font-black text-rose-600 dark:text-rose-400">
                              {t.count}
                            </span>
                            <span className="text-[9.5px] text-slate-500 block mt-0.5">{t.pct}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Infant Mortality Highlight */}
                    <div className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-amber-900 dark:text-amber-200 text-[11px] uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        Early-Career Turnover Concentration (&lt; 2 Years)
                      </div>
                      <p className="text-[11px] text-amber-900/80 dark:text-amber-300 leading-relaxed">
                        <strong>{metrics?.early_exits_count} departures ({metrics?.early_exits_share_pct}%)</strong> occur within the first 24 months of service.
                        This indicates that retention vulnerabilities are highest during onboarding, line familiarization, and post-probation transition phases.
                      </p>
                    </div>
                  </div>
                )}

                {/* TAB 4: Retention Action Plan */}
                {activeTab === 'retention' && (
                  <div className="space-y-4">
                    {/* Top Recorded Reasons */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                        Leading Recorded Exit Reasons (Neon DB)
                      </h4>
                      <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] text-xs">
                        {byReason.slice(0, 6).map((r, ridx) => (
                          <div
                            key={ridx}
                            className="p-3 flex items-center justify-between gap-3 bg-[var(--surface)]"
                          >
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                              <span className="font-bold text-[var(--text)]">{r.reason}</span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                                {r.count} Exits
                              </span>
                              <span className="block text-[9.5px] text-slate-400">({r.pct})</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations List */}
                    <div className="space-y-2.5 pt-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                        Prioritized HR Retention Recommendations
                      </h4>
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
                  </div>
                )}

                {/* HR Decision Support Section (Section 6 Requirement) */}
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
                        {hrDecisionStatus === 'APPROVED' ? 'Retention Strategy Approved' : 'Review Acknowledged'} (
                        {decisionTimestamp})
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300 leading-relaxed">
                    <strong>Advisory Governance:</strong> Neon PostgreSQL functions in read-only mode. Attrition
                    Agent findings provide advisory decision-support for HR and Plant leadership without modifying
                    employee records, employment status, or payroll entries.
                  </p>

                  {/* HR Notes / Comments */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[var(--text)]">
                      HR Review Notes / Retention Justification:
                    </label>
                    <textarea
                      value={hrNotes}
                      onChange={(e) => setHrNotes(e.target.value)}
                      placeholder="Add administrative review notes (e.g., Scheduled cross-functional meeting on Final Assembly absconding trends; approved peer buddy pilot)..."
                      className="w-full text-xs p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none h-16"
                    />
                  </div>

                  {/* Decision Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      onClick={() => handleRecordHrReview('ACKNOWLEDGED')}
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
                      Approve Retention Action Plan
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setHrDecisionStatus(null);
                        setHrNotes('');
                      }}
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
            <span>Workforce Management AI · Attrition Agent</span>
            <Button size="sm" variant="outline" onClick={onClose} className="h-7 px-3 text-xs">
              Close Drawer
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default AttritionAgentDrawer;
