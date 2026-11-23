import {
  AlertCircle,
  AlertTriangle,
  Bot,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coins,
  ExternalLink,
  Factory,
  FileCheck2,
  Filter,
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
import React, { useEffect, useState } from 'react';
import { runOvertimeAgentAnalysis } from '../../api/workforceApi';
import { useAgentExecutionStream } from '../../hooks/useAgentExecutionStream';
import { AgentExecutionPipeline } from './AgentExecutionPipeline';
import { Button } from '../common/Button';
import { Card } from '../common/Card';

export function OvertimeAgentDrawer({ isOpen, onClose, filters = {} }) {
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
    agentType: 'overtime',
    filters,
    autoStart: true,
    isOpen,
  });

  const [activeTab, setActiveTab] = useState('findings'); // 'findings' | 'breakdown' | 'repeat' | 'optimization'
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
  const deptBreakdown = result?.department_breakdown || [];
  const shiftBreakdown = result?.shift_breakdown || [];
  const plantBreakdown = result?.plant_breakdown || [];
  const typeBreakdown = result?.employment_type_breakdown || [];
  const reasonsBreakdown = result?.reasons_breakdown || [];
  const topRepeatEmployees = result?.top_repeat_employees || [];
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
          aria-labelledby="overtime-agent-drawer-title"
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
                  <h2 id="overtime-agent-drawer-title" className="text-sm font-bold truncate">
                    Overtime Optimization Agent
                  </h2>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Neon Grounded
                  </span>
                </div>
                <p className="text-[11px] text-[var(--secondary)] truncate">
                  Evidence-based overtime audit, cost optimization & fatigue risk analysis
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
                title="Re-run Overtime Optimization Agent"
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
                Overtime Scope:
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-medium">
                {result?.date_range?.start_date || filters.startDate || '2026-08-01'} →{' '}
                {result?.date_range?.end_date || filters.endDate || '2026-11-19'}
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
                  <span>Auditing 23,700 overtime transactions & financial costs from Neon PostgreSQL...</span>
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
                        Overtime Severity: {result.severity}
                      </div>
                      <div className="text-[11px] opacity-90 leading-tight mt-0.5">
                        {metrics?.total_overtime_hours > 30000
                          ? `Heavy overtime volume (${metrics?.total_overtime_hours.toLocaleString()} hrs). High department concentration and absenteeism cover identified.`
                          : 'Overtime distribution within normal operational parameters.'}
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
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total OT Hours</span>
                    <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                      {metrics?.total_overtime_hours?.toLocaleString() ?? 0} h
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {metrics?.overtime_records_count?.toLocaleString()} shifts logged
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Total OT Cost</span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                      ₹{((metrics?.total_overtime_cost_inr || 0) / 100000).toFixed(2)} L
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      ₹{metrics?.avg_hourly_base_rate_inr}/hr @ 2.0x
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Potential Savings</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      ₹{((metrics?.potential_savings_inr || 0) / 100000).toFixed(2)} L
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      via standby absence pool
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Staff</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                      {metrics?.employees_with_overtime?.toLocaleString() ?? 0}
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      avg {metrics?.avg_ot_hours_per_worker} h / worker
                    </span>
                  </div>
                </div>

                {/* Executive Summary Box */}
                {result.executive_synthesis && (
                  <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 text-xs text-purple-950 dark:text-purple-200 leading-relaxed space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-purple-800 dark:text-purple-300 text-[11px] uppercase tracking-wider mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Executive Overtime Optimization Summary
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
                    onClick={() => setActiveTab('breakdown')}
                    className={`pb-2 px-3 font-bold border-b-2 transition-all ${
                      activeTab === 'breakdown'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Dept & Shift Breakdown ({deptBreakdown.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('repeat')}
                    className={`pb-2 px-3 font-bold border-b-2 transition-all ${
                      activeTab === 'repeat'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Repeat OT & Fatigue ({topRepeatEmployees.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('optimization')}
                    className={`pb-2 px-3 font-bold border-b-2 transition-all ${
                      activeTab === 'optimization'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Optimization Plan ({recs.length})
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
                          <span className="text-[11px] text-[var(--secondary)]">Observed Exposure:</span>
                          <span className="font-bold font-mono text-[var(--text)]">{f.metric}</span>
                        </div>

                        <p className="text-[11px] text-[var(--secondary)] leading-relaxed">{f.evidence}</p>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                          <div className="text-slate-700 dark:text-slate-300">
                            <span className="font-semibold text-rose-600 dark:text-rose-400">Operational Impact: </span>
                            {f.operational_impact}
                          </div>
                          <div className="text-purple-700 dark:text-purple-300 font-medium">
                            <span className="font-semibold">HR & Plant Action: </span>
                            {f.recommendation}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* TAB 2: Department & Shift Breakdown */}
                {activeTab === 'breakdown' && (
                  <div className="space-y-4">
                    {/* Department-wise Overtime Table */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                          Department Overtime Concentration (Neon DB Verified)
                        </h4>
                        <span className="text-[10px] text-slate-400">Hours & Cost Share</span>
                      </div>

                      <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] text-xs">
                        {deptBreakdown.map((d, didx) => (
                          <div
                            key={didx}
                            className="p-3 flex items-center justify-between gap-3 bg-[var(--surface)] hover:bg-slate-50 dark:hover:bg-slate-900/40"
                          >
                            <div>
                              <div className="font-bold text-[var(--text)] flex items-center gap-1.5">
                                <span>{d.department_name}</span>
                                <span className="font-mono text-[10px] text-slate-400 font-normal">
                                  ({d.department_id})
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {d.ot_shifts.toLocaleString()} shifts · {d.employees_count} active workers
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-xs">
                                {d.ot_hours.toLocaleString()} h
                              </span>
                              <span className="block text-[9.5px] text-slate-400">
                                ₹{(d.ot_cost_inr / 100000).toFixed(2)} L ({d.share_pct}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Shift-wise & Plant-wise Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Shift Breakdown */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                          Shift Distribution
                        </h4>
                        <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] text-xs">
                          {shiftBreakdown.map((s, sidx) => (
                            <div key={sidx} className="p-2.5 flex items-center justify-between bg-[var(--surface)]">
                              <div>
                                <span className="font-bold text-[var(--text)]">{s.shift_name}</span>
                                <span className="block text-[9.5px] text-slate-400">
                                  {s.ot_shifts.toLocaleString()} shifts
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-[var(--text)]">{s.ot_hours.toLocaleString()} h</span>
                                <span className="block text-[9.5px] text-slate-400">({s.share_pct}%)</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Plant Breakdown */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                          Plant Comparison
                        </h4>
                        <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] text-xs">
                          {plantBreakdown.map((p, pidx) => (
                            <div key={pidx} className="p-2.5 flex items-center justify-between bg-[var(--surface)]">
                              <div>
                                <span className="font-bold text-[var(--text)]">{p.plant_id}</span>
                                <span className="block text-[9.5px] text-slate-400">
                                  {p.ot_shifts.toLocaleString()} shifts
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="font-mono font-bold text-[var(--text)]">{p.ot_hours.toLocaleString()} h</span>
                                <span className="block text-[9.5px] text-slate-400">
                                  ₹{(p.ot_cost_inr / 100000).toFixed(2)} L
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: Repeat Overtime & Staff Fatigue */}
                {activeTab === 'repeat' && (
                  <div className="space-y-4">
                    {/* Employment Type Distribution (Permanent vs Vendor) */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                        Employment Type Distribution
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {typeBreakdown.map((t, tidx) => (
                          <div
                            key={tidx}
                            className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-between"
                          >
                            <div>
                              <span className="font-bold text-xs text-[var(--text)]">{t.employment_type} Staff</span>
                              <span className="block text-[10px] text-slate-400">
                                Base: ₹{t.avg_base_rate}/hr · {t.ot_shifts.toLocaleString()} shifts
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-purple-600 dark:text-purple-400 text-xs">
                                {t.ot_hours.toLocaleString()} h
                              </span>
                              <span className="block text-[9.5px] text-slate-400">
                                ₹{(t.ot_cost_inr / 100000).toFixed(2)} L ({t.share_pct}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Top Repeat Overtime Operators */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                          Top Repeat Overtime Operators (Fatigue Gating)
                        </h4>
                        <span className="text-[10px] text-slate-400">Ranked by Extended Shifts</span>
                      </div>

                      <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] text-xs">
                        {topRepeatEmployees.map((e, eidx) => (
                          <div
                            key={eidx}
                            className="p-3 flex items-center justify-between gap-3 bg-[var(--surface)] hover:bg-slate-50 dark:hover:bg-slate-900/40"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold flex items-center justify-center text-xs">
                                #{eidx + 1}
                              </div>
                              <div>
                                <div className="font-bold text-[var(--text)]">
                                  {e.employee_name}{' '}
                                  <span className="font-mono text-[10px] text-slate-400 font-normal">
                                    ({e.employee_id})
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {e.department_name} · Plant: {e.plant_id} · {e.employment_type}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                                {e.ot_shifts} Shifts ({e.ot_hours} h)
                              </span>
                              <span className="block text-[9.5px] text-slate-400">
                                ₹{e.ot_cost_inr.toLocaleString()} logged
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 4: Cost Optimization Plan */}
                {activeTab === 'optimization' && (
                  <div className="space-y-4">
                    {/* Primary Drivers (Reasons Breakdown) */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                        Overtime Root-Causes & Drivers (Neon DB)
                      </h4>
                      <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] text-xs">
                        {reasonsBreakdown.map((r, ridx) => (
                          <div
                            key={ridx}
                            className="p-3 flex items-center justify-between gap-3 bg-[var(--surface)]"
                          >
                            <div>
                              <div className="font-bold text-[var(--text)]">{r.reason}</div>
                              <div className="text-[10px] text-slate-500">
                                {r.ot_shifts.toLocaleString()} shifts logged
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-[var(--text)] text-xs">
                                {r.ot_hours.toLocaleString()} h
                              </span>
                              <span className="block text-[9.5px] text-slate-400">
                                ₹{(r.ot_cost_inr / 100000).toFixed(2)} L ({r.share_pct}%)
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Transparent Savings Card */}
                    <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                          <Coins className="w-4 h-4 text-emerald-600" />
                          Transparent Cost Optimization Opportunity
                        </div>
                        <span className="font-mono font-black text-emerald-700 dark:text-emerald-300 text-sm">
                          ₹{((metrics?.potential_savings_inr || 0) / 100000).toFixed(2)} Lakhs
                        </span>
                      </div>
                      <p className="text-[11px] text-emerald-900/80 dark:text-emerald-300 leading-relaxed">
                        {metrics?.savings_calculation_basis}
                      </p>
                    </div>

                    {/* Recommendations List */}
                    <div className="space-y-2.5 pt-1">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                        Actionable HR & Plant Leadership Measures
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
                        {hrDecisionStatus === 'APPROVED' ? 'Optimization Plan Approved' : 'Review Acknowledged'} (
                        {decisionTimestamp})
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-indigo-900/80 dark:text-indigo-300 leading-relaxed">
                    <strong>Advisory Governance:</strong> Neon PostgreSQL functions in read-only mode. Overtime
                    Optimization Agent recommendations provide advisory guidance for HR and Factory Managers.
                    Payroll adjustments, overtime approvals, or shift reassignments are not automatically applied.
                  </p>

                  {/* HR Notes / Comments */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[var(--text)]">
                      HR Review Notes / Optimization Justification:
                    </label>
                    <textarea
                      value={hrNotes}
                      onChange={(e) => setHrNotes(e.target.value)}
                      placeholder="Add administrative review notes (e.g., Reviewed ₹11.99L absenteeism cover surcharge; authorized Shift A standby roster pilot)..."
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
                      Approve OT Optimization Plan
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
            <span>Workforce Management AI · Overtime Optimization Agent</span>
            <Button size="sm" variant="outline" onClick={onClose} className="h-7 px-3 text-xs">
              Close Drawer
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default OvertimeAgentDrawer;

