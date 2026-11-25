import { Building, Users } from 'lucide-react';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const COLOR_CYCLE = [
  'bg-[var(--brand-purple)]',
  'bg-[#4D8EEB]',
  'bg-[#0E9C86]',
  'bg-[#F58A3A]',
  'bg-[#493287]',
  'bg-[#EC4899]',
  'bg-[#10B981]',
  'bg-[#6366F1]',
  'bg-[#F97316]',
  'bg-[#14B8A6]',
  'bg-[#3B82F6]',
  'bg-[#5B44A3]',
];

export function DepartmentWorkforceChart({
  departmentAnalytics = null,
  workforceSummary = null,
  selectedDepartment = '',
  loading = false,
}) {
  const totalEmployees = workforceSummary?.total_employees || 0;
  const items = departmentAnalytics?.items || [];

  const departmentRows = items.length > 0
    ? items.map((item) => {
        const name = item.department_name || item.name || item.department_id || '';
        const count = item.employee_count || 0;
        const calculatedPct = totalEmployees > 0 ? (count / totalEmployees) * 100 : 0;
        const pct = item.employee_percentage != null ? item.employee_percentage : Number(calculatedPct.toFixed(1));
        const attendanceRate = item.attendance_rate != null ? item.attendance_rate : null;

        return {
          id: item.department_id,
          name,
          count,
          pct,
          attendanceRate,
        };
      })
    : [];

  const maxCount = Math.max(...departmentRows.map((d) => d.count), 1);
  const topDept = departmentRows.length > 0
    ? [...departmentRows].sort((a, b) => b.count - a.count)[0]
    : null;

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                Department-wise Workforce
              </h3>
            </div>
          </div>
          <span className="text-xs font-bold text-[var(--secondary)]">
            Total: {totalEmployees > 0 ? totalEmployees : '—'}
          </span>
        </div>

        {/* Horizontal Bars */}
        {departmentRows.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center p-4 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <Building className="w-6 h-6 text-slate-400 mb-2 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Department Records Available</p>
            <p className="text-[11px] text-[var(--secondary)] mt-0.5">
              Connect to FastAPI backend to view live department workforce allocation.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {departmentRows.map((dept, idx) => {
              const widthPct = Math.min(100, Math.round((dept.count / maxCount) * 100));
              const isZero = dept.count === 0;
              const barColor = COLOR_CYCLE[idx % COLOR_CYCLE.length];

              return (
                <div key={dept.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[var(--text)] text-[11px] flex items-center gap-1.5 truncate max-w-[200px]">
                      {dept.name}
                      {dept.attendanceRate != null && (
                        <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200 shrink-0">
                          {dept.attendanceRate.toFixed(1)}% Att.
                        </span>
                      )}
                    </span>
                    <div className="flex items-center gap-2 text-[11px] shrink-0">
                      <span className="font-extrabold text-[var(--text)]">
                        {dept.count} <span className="font-normal text-[var(--secondary)] text-[10px]">({dept.pct}%)</span>
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-[var(--muted-fill)] overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isZero ? 'bg-slate-300 dark:bg-slate-700' : barColor
                      }`}
                      style={{ width: `${Math.max(widthPct, isZero ? 2 : 4)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="pt-2 mt-3 border-t border-[var(--border)] text-[10px] text-[var(--secondary)] flex items-center justify-between">
        <span>
          {topDept
            ? `${topDept.name} constitutes the largest operational headcount (${topDept.count} workers).`
            : 'Department allocation module.'}
        </span>
        <span className={`font-bold ${items.length > 0 ? 'text-[var(--text)]' : 'text-slate-400'}`}>
          {totalEmployees > 0 ? `${totalEmployees} Total Staff` : 'No Data'}
        </span>
      </div>
    </div>
  );
}

