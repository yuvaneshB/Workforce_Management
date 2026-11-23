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
import { runAttendanceAgentAnalysis } from '../../api/workforceApi';
import { useAgentExecutionStream } from '../../hooks/useAgentExecutionStream';
import { AgentExecutionPipeline } from './AgentExecutionPipeline';
import { Button } from '../common/Button';
import { Card } from '../common/Card';

export function AttendanceAgentDrawer({ isOpen, onClose, filters = {} }) {
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
    agentType: 'attendance',
    filters,
    autoStart: true,
    isOpen,
  });

  const [activeTab, setActiveTab] = useState('findings'); // 'findings' | 'streaks' | 'recommendations'
  const [hrNotes, setHrNotes] = useState('');
  const [hrDecisionStatus, setHrDecisionStatus] = useState(null); // 'ACKNOWLEDGED' | 'APPROVED' | 'FOLLOWUP'
  const [decisionTimestamp, setDecisionTimestamp] = useState(null);

  const handleExecute = () => execute();

  if (!isOpen) return null;

  const severityBadge = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800';
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
  const streaks = result?.consecutive_streaks || [];
  const chronic = result?.chronic_absentees || [];
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
          aria-labelledby="attendance-agent-drawer-title"
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
                  <h2 id="attendance-agent-drawer-title" className="text-sm font-bold truncate">Attendance Intelligence Agent</h2>
                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                    Neon Grounded
                  </span>
                </div>
                <p className="text-[11px] text-[var(--secondary)] truncate">
                  Evidence-based shopfloor absenteeism & punctuality analysis
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
                title="Re-run Agent"
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
                Filter Scope:
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 font-medium">
                {filters.startDate || '2026-08-01'} → {filters.endDate || '2026-11-19'}
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
                  <span>Analyzing 177,043 attendance records from Neon PostgreSQL...</span>
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
                        Attendance Risk Level: {result.severity}
                      </div>
                      <div className="text-[11px] opacity-90 leading-tight mt-0.5">
                        {result.severity === 'CRITICAL' || result.severity === 'HIGH'
                          ? 'Significant shift variance or multi-day absence streaks require HR intervention.'
                          : 'Attendance patterns within acceptable manufacturing operating limits.'}
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
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Attendance</span>
                    <span className="text-lg font-black text-purple-600 dark:text-purple-400">
                      {metrics?.attendance_rate ?? 0}%
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {metrics?.present_count?.toLocaleString()} present
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Absenteeism</span>
                    <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                      {metrics?.absenteeism_rate ?? 0}%
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {metrics?.absent_count?.toLocaleString()} absences
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Late Arrivals</span>
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                      {metrics?.late_arrival_rate ?? 0}%
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      {metrics?.late_count?.toLocaleString()} punches
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-center">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Lost Labor</span>
                    <span className="text-lg font-black text-slate-800 dark:text-slate-100">
                      {metrics?.lost_hours?.toLocaleString()} h
                    </span>
                    <span className="text-[9px] text-slate-400 block mt-0.5">
                      across {metrics?.total_records?.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Executive Summary Markdown Box */}
                {result.executive_synthesis && (
                  <div className="p-3.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/40 text-xs text-purple-950 dark:text-purple-200 leading-relaxed space-y-1">
                    <div className="flex items-center gap-1.5 font-bold text-purple-800 dark:text-purple-300 text-[11px] uppercase tracking-wider mb-1">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                      Executive Analysis & Findings
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
                    onClick={() => setActiveTab('streaks')}
                    className={`pb-2 px-3 font-bold border-b-2 transition-all ${
                      activeTab === 'streaks'
                        ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                        : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Chronic & Streaks ({streaks.length + chronic.length})
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
                          <span className="text-[11px] text-[var(--secondary)]">Observed Evidence:</span>
                          <span className="font-bold font-mono text-[var(--text)]">{f.metric}</span>
                        </div>

                        <p className="text-[11px] text-[var(--secondary)] leading-relaxed">{f.evidence}</p>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] space-y-1">
                          <div className="text-slate-700 dark:text-slate-300">
                            <span className="font-semibold text-rose-600 dark:text-rose-400">Operational Impact: </span>
                            {f.operational_impact}
                          </div>
                          <div className="text-purple-700 dark:text-purple-300 font-medium">
                            <span className="font-semibold">HR Action: </span>
                            {f.recommendation}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {/* TAB 2: Chronic & Consecutive Streaks */}
                {activeTab === 'streaks' && (
                  <div className="space-y-3">
                    {/* Consecutive Streaks */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                          Consecutive Absent Streaks (&ge; 3 Shifts)
                        </h4>
                        <span className="text-[10px] text-slate-400">Neon DB Verified</span>
                      </div>

                      {streaks.length > 0 ? (
                        <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] text-xs">
                          {streaks.map((st, sidx) => (
                            <div
                              key={sidx}
                              className="p-3 flex items-center justify-between gap-3 bg-[var(--surface)] hover:bg-slate-50 dark:hover:bg-slate-900/40"
                            >
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold flex items-center justify-center text-xs">
                                  {st.consecutive_days}d
                                </div>
                                <div>
                                  <div className="font-bold text-[var(--text)]">
                                    {st.employee_name}{' '}
                                    <span className="font-mono text-[10px] text-slate-400 font-normal">
                                      ({st.employee_id})
                                    </span>
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Plant: {st.plant_id} · {st.streak_start} to {st.streak_end}
                                  </div>
                                </div>
                              </div>
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
                                High Risk
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-500">
                          No &ge;3 day consecutive absent streaks in this filtered date window.
                        </div>
                      )}
                    </div>

                    {/* Top Repeated Chronic Absentees */}
                    <div className="space-y-2 pt-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
                        Top Frequency Absences
                      </h4>
                      <div className="border border-[var(--border)] rounded-xl overflow-hidden divide-y divide-[var(--border)] text-xs">
                        {chronic.slice(0, 5).map((ch, cidx) => (
                          <div
                            key={cidx}
                            className="p-3 flex items-center justify-between gap-3 bg-[var(--surface)]"
                          >
                            <div>
                              <div className="font-bold text-[var(--text)]">
                                {ch.employee_name}{' '}
                                <span className="font-mono text-[10px] text-slate-400 font-normal">
                                  ({ch.employee_id})
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                Plant {ch.plant_id} · Shift {ch.shift_id}
                              </div>
                            </div>
                            <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-xs">
                              {ch.absent_days} Total Absences
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: HR Actionable Recommendations */}
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
                    <strong>Advisory Governance:</strong> Neon PostgreSQL functions in read-only mode. Attendance
                    Agent generates recommendations for HR and Plant leadership. Disciplinary action is not
                    automatically applied.
                  </p>

                  {/* HR Notes / Comments */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-[var(--text)]">
                      HR Review Notes / Action Justification:
                    </label>
                    <textarea
                      value={hrNotes}
                      onChange={(e) => setHrNotes(e.target.value)}
                      placeholder="Add administrative review notes (e.g., Scheduled HR check-in with Shift C lead; verified medical slip on file)..."
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
                      Approve Standby Adjustments
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
            <span>Workforce Management AI · Attendance Agent</span>
            <Button size="sm" variant="outline" onClick={onClose} className="h-7 px-3 text-xs">
              Close Drawer
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default AttendanceAgentDrawer;

