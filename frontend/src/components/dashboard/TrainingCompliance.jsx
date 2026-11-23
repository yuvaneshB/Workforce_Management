import { ShieldCheck } from 'lucide-react';

export function TrainingCompliance({
  complianceAnalytics = null,
  workforceSummary = null,
  loading = false,
}) {
  const hasData = Boolean(complianceAnalytics);
  const compliancePct = complianceAnalytics?.training_compliance_pct ?? 0;
  const skillMatchPct = complianceAnalytics?.skill_match_pct ?? 0;
  const currentCount = complianceAnalytics?.current_count ?? 0;
  const expiredCount = complianceAnalytics?.expired_count ?? 0;
  const matchedCount = complianceAnalytics?.matched_count ?? 0;
  const gapCount = complianceAnalytics?.gap_count ?? 0;

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                Training & Compliance Audit
              </h3>
              <p className="text-[11px] text-[var(--secondary)]">
                Certification validity, renewal deadlines, and skill match
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            hasData && compliancePct >= 90
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200'
              : 'bg-slate-50 text-slate-700 border border-slate-200'
          }`}>
            {hasData ? (compliancePct >= 90 ? 'Compliant' : 'Audit Required') : 'No Data'}
          </span>
        </div>

        {/* Top 2 Primary Progress Rings / Bars */}
        {!hasData ? (
          <div className="h-32 w-full my-2 flex flex-col items-center justify-center text-center p-3 text-[var(--secondary)]">
            <ShieldCheck className="w-6 h-6 mb-1 text-[var(--secondary)]/50" />
            <span className="text-xs font-semibold">No compliance data</span>
            <span className="text-[10px]">Connect backend to view certification audits</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--secondary)] block mb-1">
                  Training Completion
                </span>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xl font-black text-emerald-600">
                    {compliancePct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--secondary)]">
                    {currentCount.toLocaleString()} valid
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--muted-fill)] overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, compliancePct)}%` }}
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--secondary)] block mb-1">
                  Skill Assignment Match
                </span>
                <div className="flex items-baseline justify-between mb-1.5">
                  <span className="text-xl font-black text-[var(--brand-purple)]">
                    {skillMatchPct.toFixed(1)}%
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--secondary)]">
                    {matchedCount.toLocaleString()} aligned
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--muted-fill)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--brand-purple)] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, skillMatchPct)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Certification Status Tiles */}
            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
              <div className="p-2 rounded-lg bg-[var(--muted-fill)] text-center">
                <span className="text-[10px] font-semibold text-[var(--secondary)] block">Valid Certs</span>
                <span className="text-sm font-extrabold text-[var(--text)]">{currentCount.toLocaleString()}</span>
              </div>
              <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
                <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 block">Expired</span>
                <span className="text-sm font-extrabold text-rose-900 dark:text-rose-200">{expiredCount.toLocaleString()}</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 block">Skill Gaps</span>
                <span className="text-sm font-extrabold text-amber-900 dark:text-amber-200">{gapCount.toLocaleString()}</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] text-[10px] text-[var(--secondary)] flex items-center justify-between">
        <span>{hasData ? 'Upcoming certification audit scheduled in 14 days.' : 'No backend connection.'}</span>
        <span className="font-bold text-emerald-600">{hasData ? 'Audited: Neon Live' : 'Disconnected'}</span>
      </div>
    </div>
  );
}
