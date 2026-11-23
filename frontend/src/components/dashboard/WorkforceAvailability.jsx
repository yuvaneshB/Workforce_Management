import { Gauge } from 'lucide-react';

export function WorkforceAvailability({
  planningAvailability = null,
  workforceSummary = null,
  attendanceAnalytics = null,
  loading = false,
}) {
  const hasData = Boolean(planningAvailability || workforceSummary);

  const totalScheduled =
    planningAvailability?.total_scheduled ?? workforceSummary?.total_employees ?? 0;
  const availableCount =
    planningAvailability?.available_count ??
    planningAvailability?.present_count ??
    0;
  const presentCount = planningAvailability?.present_count ?? 0;
  const absentCount = planningAvailability?.absent_count ?? 0;
  const leaveCount = planningAvailability?.leave_count ?? 0;
  const lateCount = planningAvailability?.late_count ?? 0;

  const availabilityRate =
    planningAvailability?.availability_rate != null
      ? planningAvailability.availability_rate
      : totalScheduled > 0
      ? Number(((availableCount / totalScheduled) * 100).toFixed(1))
      : 0;

  // Semi-circle gauge calculation
  const strokeDashoffset = 251.2 - (251.2 * availabilityRate) / 100;

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                Workforce Availability Gauge
              </h3>
              <p className="text-[11px] text-[var(--secondary)]">
                Required vs Available immediate start-of-shift headcount
              </p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            loading && !hasData
              ? 'bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
              : hasData && availabilityRate >= 90
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : hasData
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-slate-50 text-slate-700 border border-slate-200'
          }`}>
            {loading && !hasData ? 'Loading...' : hasData ? (availabilityRate >= 90 ? 'Line Ready' : 'Low Availability') : 'No Data'}
          </span>
        </div>

        {/* Circular Gauge Visualization */}
        {loading && !hasData ? (
          <div className="h-32 w-full my-2 flex flex-col items-center justify-center text-center p-3 text-[var(--secondary)]">
            <div className="w-7 h-7 rounded-full border-2 border-purple-600 border-t-transparent animate-spin mb-2" />
            <span className="text-xs font-semibold text-[var(--text)]">Loading availability data...</span>
            <span className="text-[10px] text-[var(--secondary)] mt-0.5">Calculating shift rosters and attendance</span>
          </div>
        ) : !hasData || totalScheduled === 0 ? (
          <div className="h-32 w-full my-2 flex flex-col items-center justify-center text-center p-3 text-[var(--secondary)]">
            <Gauge className="w-6 h-6 mb-1 text-[var(--secondary)]/50" />
            <span className="text-xs font-semibold">No availability data</span>
            <span className="text-[10px]">Connect backend to view availability metrics</span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-4 my-2">
            <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  className="stroke-slate-100 dark:stroke-slate-800"
                  strokeWidth="10"
                  fill="none"
                />
                {/* Progress arc */}
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  stroke="url(#availabilityGradient)"
                  strokeWidth="10"
                  strokeDasharray="251.2"
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="availabilityGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#4D8EEB" />
                    <stop offset="100%" stopColor="#6F3DBA" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-[var(--text)] leading-none">
                  {availabilityRate}%
                </span>
                <span className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-wider mt-0.5">
                  Available
                </span>
              </div>
            </div>

            {/* Breakdown KPI Tiles */}
            <div className="flex-1 w-full grid grid-cols-2 gap-2 text-xs">
              <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--border)]">
                <span className="text-[10px] font-bold text-[var(--secondary)] block">Required Workforce</span>
                <span className="text-sm font-black text-[var(--text)]">{totalScheduled} workers</span>
              </div>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 block">Available Now</span>
                <span className="text-sm font-black text-purple-900 dark:text-purple-200">{availableCount} workers</span>
              </div>
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block">Present On Floor</span>
                <span className="text-sm font-black text-emerald-900 dark:text-emerald-200">{presentCount}</span>
              </div>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800">
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-300 block">Absent Workers</span>
                <span className="text-sm font-black text-rose-900 dark:text-rose-200">{absentCount}</span>
              </div>
            </div>
          </div>
        )}

        {/* Leave and Late breakdown */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)] text-[11px]">
          <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-[var(--muted-fill)]">
            <span className="font-semibold text-[var(--secondary)]">Approved Leave:</span>
            <span className="font-extrabold text-[var(--text)]">{hasData ? leaveCount : '—'}</span>
          </div>
          <div className="flex items-center justify-between px-2 py-1 rounded-lg bg-[var(--muted-fill)]">
            <span className="font-semibold text-[var(--secondary)]">Late Arrival:</span>
            <span className="font-extrabold text-[var(--text)]">{hasData ? lateCount : '—'}</span>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-[var(--border)] text-[10px] text-[var(--secondary)]">
        Late employees are tracked separately to protect start-of-shift line reliability.
      </div>
    </div>
  );
}
