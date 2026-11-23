import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';

export function WorkforceShortage({
  planningShortages = null,
  planningAvailability = null,
  attendanceAnalytics = null,
  loading = false,
}) {
  const [activeTab, setActiveTab] = useState('Shift');

  const hasData = Boolean(planningShortages || planningAvailability);

  // Live shortage data from backend planning service
  const shiftShortages = planningShortages?.shift_shortages || [];
  const deptShortages = planningShortages?.department_shortages || [];
  const sectionShortages = planningShortages?.section_shortages || [];
  const plantShortages = planningShortages?.plant_shortages || [];

  const currentList =
    activeTab === 'Shift'
      ? shiftShortages
      : activeTab === 'Department'
      ? deptShortages
      : activeTab === 'Section'
      ? sectionShortages
      : plantShortages;

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                Workforce Shortage Detection
              </h3>
              <p className="text-[11px] text-[var(--secondary)]">
                Required vs Available baseline gap analysis
              </p>
            </div>
          </div>

          {/* Dimension Tabs */}
          <div className="flex items-center gap-1 bg-[var(--muted-fill)] p-1 rounded-xl">
            {['Shift', 'Department', 'Section', 'Plant'].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                  activeTab === tab
                    ? 'bg-white dark:bg-[var(--surface)] text-[var(--brand-purple)] shadow-2xs'
                    : 'text-[var(--secondary)] hover:text-[var(--text)]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Shortage Item Cards */}
        {loading && !hasData ? (
          <div className="h-44 w-full flex flex-col items-center justify-center text-center p-3 text-[var(--secondary)]">
            <div className="w-7 h-7 rounded-full border-2 border-amber-600 border-t-transparent animate-spin mb-2" />
            <span className="text-xs font-semibold text-[var(--text)]">Analyzing workforce shortages...</span>
            <span className="text-[10px] text-[var(--secondary)] mt-0.5">Evaluating baseline gaps across shifts & departments</span>
          </div>
        ) : !hasData || currentList.length === 0 ? (
          <div className="h-44 w-full flex flex-col items-center justify-center text-center p-3 text-[var(--secondary)]">
            <AlertTriangle className="w-6 h-6 mb-1 text-[var(--secondary)]/50" />
            <span className="text-xs font-semibold">No shortage data available</span>
            <span className="text-[10px]">Connect backend to view shift, department, and plant shortages</span>
          </div>
        ) : (
          <div className="space-y-2 mt-2">
            {currentList.map((item) => {
              const hasShortage = item.shortage > 0;
              const req = item.required;
              const avail = item.available;
              const pctAvail = req > 0 ? Math.round((avail / req) * 100) : 100;

              return (
                <div
                  key={item.name}
                  className="p-2.5 rounded-xl border border-[var(--border)] surface hover:border-[var(--brand-purple)]/40 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="font-bold text-[var(--text)] text-[11px] flex items-center gap-2">
                      <span className="truncate">{item.name}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase ${
                          item.severity === 'CRITICAL'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : item.severity === 'MODERATE'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {item.severity}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] shrink-0">
                      <span className="text-[var(--secondary)]">
                        {avail} / {req} workers
                      </span>
                      <span
                        className={`font-black text-xs ${
                          hasShortage ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600'
                        }`}
                      >
                        {hasShortage ? `${item.shortage} Short` : 'Full Roster'}
                      </span>
                    </div>
                  </div>

                  {/* Progress Comparison Bar */}
                  <div className="w-full h-2 rounded-full bg-[var(--muted-fill)] overflow-hidden flex">
                    <div
                      className="h-full bg-[var(--brand-purple)] rounded-l-full transition-all duration-500"
                      style={{ width: `${Math.min(100, pctAvail)}%` }}
                    />
                    {hasShortage && (
                      <div
                        className="h-full bg-amber-400 rounded-r-full transition-all duration-500"
                        style={{ width: `${Math.max(0, 100 - pctAvail)}%` }}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] text-[10px] text-[var(--secondary)] flex items-center justify-between">
        <span>{hasData ? 'Live shortage monitoring active.' : 'No backend connection.'}</span>
        <span className="font-bold text-[var(--text)]">{hasData ? 'Verified Records' : 'Disconnected'}</span>
      </div>
    </div>
  );
}
