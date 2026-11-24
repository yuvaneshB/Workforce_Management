import { UserX } from 'lucide-react';
import { ATTRITION_BY_REASON } from '../../data/attritionData';

export function AttritionReasonsChart({
  attritionAnalytics = null,
  loading = false,
  hasData = false,
}) {
  const reasonsList =
    attritionAnalytics?.by_reason && attritionAnalytics.by_reason.length > 0
      ? attritionAnalytics.by_reason
      : [];

  const totalExits =
    attritionAnalytics?.summary?.total_exits != null
      ? attritionAnalytics.summary.total_exits
      : reasonsList.reduce((acc, curr) => acc + (curr.count || 0), 0);

  const displayReasons = reasonsList.slice(0, 8);

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--rose-soft)] text-rose-600 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                Attrition Reasons Analysis
              </h3>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[var(--secondary)]">
            {totalExits > 0 ? `${totalExits} Recorded Exits` : 'No Exits'}
          </span>
        </div>

        {/* Horizontal Reason Bars */}
        {reasonsList.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center p-4 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <UserX className="w-6 h-6 text-slate-400 mb-2 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Attrition Records</p>
            <p className="text-[11px] text-[var(--secondary)] mt-0.5">
              No exit records match the current filter selection.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 mt-2">
            {displayReasons.map((r) => {
              const countVal = r.count || 0;
              const pctVal = r.pct || `${((countVal / (totalExits || 1)) * 100).toFixed(1)}%`;
              const barWidth = totalExits > 0 ? Math.max(4, Math.round((countVal / totalExits) * 100)) : 4;
              return (
                <div key={r.reason} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-semibold text-[var(--text)] truncate" title={r.reason}>
                      {r.reason}
                    </span>
                    <span className="font-bold text-[var(--secondary)] shrink-0">
                      {countVal} ({pctVal})
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-[var(--muted-fill)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#6F3DBA]"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
