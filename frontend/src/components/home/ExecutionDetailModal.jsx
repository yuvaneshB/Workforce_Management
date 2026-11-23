import {
  AlertTriangle,
  Bot,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';

export function ExecutionDetailModal({ execution, onClose }) {
  if (!execution) return null;

  const StatusIcon =
    execution.status === 'Completed' || execution.status === 'Approved'
      ? CheckCircle2
      : execution.status === 'In Review'
        ? Clock
        : AlertTriangle;

  const statusColor =
    execution.status === 'Completed' || execution.status === 'Approved'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400'
      : execution.status === 'In Review'
        ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400'
        : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="surface w-full max-w-xl rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-hover)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-[var(--secondary)]">
                  {execution.time}
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${statusColor}`}
                >
                  <StatusIcon className="w-3 h-3" />
                  {execution.status}
                </span>
              </div>
              <h3 className="text-sm font-extrabold text-[var(--text)] mt-0.5">
                {execution.task}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--muted-fill)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
          {/* Recommendation / Summary */}
          <div className="p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]">
            <h4 className="text-[11px] font-bold text-[var(--secondary)] uppercase tracking-wider mb-1">
              Agent Finding & Recommendation
            </h4>
            <p className="text-xs font-semibold text-[var(--text)] leading-relaxed">
              {execution.details}
            </p>
          </div>

          {/* Trigger & Query */}
          <div>
            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider mb-1.5">
              Task Trigger & Context
            </h4>
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--secondary)]">
              <span className="font-semibold text-[var(--text)]">Operational Trigger: </span>
              {execution.trigger || 'Scheduled manufacturing shift inspection & shortage scan.'}
            </div>
          </div>

          {/* Tools Executed */}
          <div>
            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider mb-2">
              Agent Tools Invoked
            </h4>
            <div className="space-y-1.5">
              {(
                execution.tools || [
                  'detect_workforce_shortages',
                  'get_attendance_summary',
                  'score_replacement_candidates',
                ]
              ).map((tool, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[11px]"
                >
                  <div className="flex items-center gap-2 font-mono font-bold text-purple-700 dark:text-purple-400">
                    <Zap className="w-3.5 h-3.5 text-purple-500" />
                    <span>{tool}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                    Success (0.24s)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Governance & Action Status */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center gap-1.5 font-bold text-[var(--text)] mb-1">
                <ShieldCheck className="w-4 h-4 text-amber-500" />
                <span>Governance Review</span>
              </div>
              <p className="text-[11px] text-[var(--secondary)]">
                {execution.governance || 'HR verified replacement credentials.'}
              </p>
            </div>
            <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="flex items-center gap-1.5 font-bold text-[var(--text)] mb-1">
                <UserCheck className="w-4 h-4 text-emerald-500" />
                <span>Closed-Loop Action</span>
              </div>
              <p className="text-[11px] text-[var(--secondary)]">
                {execution.action || 'Shift allocation updated in MES roster with notifications sent.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-hover)] flex items-center justify-between">
          <span className="text-[11px] text-[var(--secondary)]">
            Execution ID: <span className="font-mono font-bold text-[var(--text)]">RUN-{execution.id || '2026-10-884'}</span>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

