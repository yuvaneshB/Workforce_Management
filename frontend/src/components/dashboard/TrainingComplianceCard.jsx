import { AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function TrainingComplianceCard({
  complianceAnalytics = null,
  loading = false,
}) {
  const hasData = typeof complianceAnalytics?.training_compliance_pct === 'number';

  const compliancePct = hasData
    ? complianceAnalytics.training_compliance_pct.toFixed(1)
    : null;

  // Real values computed from database attendance records
  const completedCount = complianceAnalytics?.current_count ?? 0;
  const expiredCount = complianceAnalytics?.expired_count ?? 0;
  const totalCount =
    complianceAnalytics?.total_compliance_records ?? (completedCount + expiredCount);

  const completedPct =
    totalCount > 0 ? ((completedCount / totalCount) * 100).toFixed(1) : '0.0';
  const expiredPct =
    totalCount > 0 ? ((expiredCount / totalCount) * 100).toFixed(1) : '0.0';

  // SVG Gauge math
  const pctNum = hasData ? complianceAnalytics.training_compliance_pct : 0;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pctNum / 100) * circumference;

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
          Training & Compliance
        </h3>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-44 w-full rounded-xl" />
      ) : !hasData && totalCount === 0 ? (
        <div className="h-44 flex items-center justify-center text-xs text-[var(--secondary)]">
          No compliance data available
        </div>
      ) : (
        <div className="flex items-center gap-3.5 h-44">
          {/* Circular Progress Gauge */}
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="currentColor"
                strokeWidth="8"
                fill="transparent"
                className="text-slate-100 dark:text-slate-800"
              />
              <circle
                cx="50"
                cy="50"
                r={radius}
                stroke="#0E9C86"
                strokeWidth="8"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="transparent"
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-[19px] font-black text-[var(--text)] tracking-tight leading-none">
                {compliancePct !== null ? `${compliancePct}%` : '—'}
              </span>
              <span className="text-[10px] font-semibold text-[var(--secondary)] mt-0.5">
                Compliant
              </span>
            </div>
          </div>

          {/* Right Status Breakdown */}
          <div className="flex-1 space-y-2.5 text-xs">
            <div className="flex items-center justify-between gap-1 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-bold text-[var(--text)] truncate">Current</span>
              </div>
              <span className="font-semibold text-[var(--secondary)] whitespace-nowrap">
                {completedCount.toLocaleString()} ({completedPct}%)
              </span>
            </div>

            <div className="flex items-center justify-between gap-1 text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="font-bold text-[var(--text)] truncate">Expired</span>
              </div>
              <span className="font-semibold text-[var(--secondary)] whitespace-nowrap">
                {expiredCount.toLocaleString()} ({expiredPct}%)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
