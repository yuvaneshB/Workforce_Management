import { Users } from 'lucide-react';
import { useMemo } from 'react';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

function getBarColor(index) {
  // Color palette inspired by reference image (Coral/Red, Purple, Navy/Blue, Amber/Yellow, Teal)
  if (index === 0) return '#E45C72'; // Highest absenteeism: Coral / Red
  if (index <= 2) return '#493287'; // High absenteeism: Purple
  if (index <= 5) return '#4D8EEB'; // Moderate-high absenteeism: Deep Blue / Navy
  if (index <= 8) return '#F58A3A'; // Moderate absenteeism: Warm Amber / Gold
  return '#0E9C86'; // Lower absenteeism: Teal
}

export function DepartmentAbsenteeismCard({
  departmentAnalytics = null,
  loading = false,
  error = null,
}) {
  // Extract and sort real Neon PostgreSQL records
  const chartData = useMemo(() => {
    if (error || !departmentAnalytics?.items) return [];

    return departmentAnalytics.items
      .filter((d) => d.total_records > 0 || d.employee_count > 0 || d.absent_count > 0)
      .map((d) => ({
        department_id: d.department_id,
        department_name: d.department_name,
        absenteeism_pct: Number(
          (
            d.absenteeism_pct ??
            (d.total_records > 0 ? (d.absent_count / d.total_records) * 100 : 0)
          ).toFixed(1)
        ),
        absent_count: d.absent_count || 0,
        total_records: d.total_records || 0,
      }))
      .sort((a, b) => b.absenteeism_pct - a.absenteeism_pct);
  }, [departmentAnalytics, error]);

  // Calculate maximum percentage in the displayed dataset for relative scaling
  const maxPct = useMemo(() => {
    if (!chartData.length) return 1;
    return Math.max(...chartData.map((d) => d.absenteeism_pct), 0.1);
  }, [chartData]);

  return (
    <Card className="p-4 lg:col-span-3 flex flex-col justify-between min-h-[260px]">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-2.5 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 shrink-0 text-[#493287]" aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">
              Department-wise Absenteeism
            </h2>
          </div>

          {chartData.length > 0 && !loading && (
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {chartData.length} Depts
            </span>
          )}
        </div>

        {/* Content States */}
        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : error ? (
          <div className="h-44 w-full my-1 flex flex-col items-center justify-center text-center p-3 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-900">
            <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
              Unable to load absenteeism data
            </p>
            <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-0.5 truncate max-w-xs">
              {error}
            </p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-44 w-full my-1 flex flex-col items-center justify-center text-center p-3 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <Users className="w-6 h-6 text-slate-400 mb-1 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Department Records</p>
            <p className="text-[10px] text-[var(--secondary)] mt-0.5">
              No absenteeism data found for the selected filters.
            </p>
          </div>
        ) : (
          /* Horizontal Rounded Progress Bars Matching Reference Design */
          <div className="h-44 w-full my-1 overflow-y-auto pr-1 space-y-2">
            {chartData.map((dept, index) => {
              // Bar width relative to max percentage in dataset, minimum 12% for visual rounded pill
              const widthPct = Math.min(
                100,
                Math.max(12, Math.round((dept.absenteeism_pct / maxPct) * 100))
              );
              const barColor = getBarColor(index);

              return (
                <div
                  key={dept.department_id || dept.department_name}
                  className="flex items-center gap-2.5 py-0.5 group"
                  title={`${dept.department_name}: ${dept.absenteeism_pct}% absenteeism (${dept.absent_count} absent)`}
                >
                  {/* Department Name on the Left */}
                  <span
                    className="text-[11px] font-medium text-slate-700 dark:text-slate-300 w-[110px] sm:w-[115px] shrink-0 truncate group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors"
                  >
                    {dept.department_name}
                  </span>

                  {/* Rounded Progress Bar Track */}
                  <div className="flex-1 relative h-4 sm:h-4.5 rounded-full border border-slate-200/90 dark:border-slate-700/80 bg-slate-100/80 dark:bg-slate-800/60 p-0.5 flex items-center overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: barColor,
                      }}
                    />
                  </div>

                  {/* Actual Percentage Value Clearly Visible on the Right */}
                  <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100 w-10 text-right shrink-0 font-mono">
                    {dept.absenteeism_pct.toFixed(1)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {chartData.length > 0 && !loading && !error && (
        <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
          <span>
            Highest:{' '}
            <strong className="text-rose-600 dark:text-rose-400">
              {chartData[0]?.department_name}
            </strong>
          </span>
          <span className="font-bold font-mono text-slate-700 dark:text-slate-300">
            {chartData[0]?.absenteeism_pct.toFixed(1)}%
          </span>
        </div>
      )}
    </Card>
  );
}
