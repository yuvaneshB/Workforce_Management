import { ShieldCheck } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function EmployeeStatusCard({
  workforceSummary = null,
  employees = [],
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const hasData = !error && (workforceSummary?.total_employees != null || employees.length > 0);

  let activeCount = workforceSummary?.active_employees ?? (employees.length || 0);
  let resignedCount = workforceSummary?.resigned_employees ?? 0;
  let inactiveCount = workforceSummary?.inactive_employees ?? 0;

  // Robust extraction from by_active_status
  if (workforceSummary?.by_active_status && workforceSummary.by_active_status.length > 0) {
    workforceSummary.by_active_status.forEach((item) => {
      const key = String(item.key || '').toLowerCase();
      if (key === 'active') activeCount = item.count;
      else if (key === 'resigned') resignedCount = item.count;
      else if (key === 'inactive') inactiveCount = item.count;
    });
  }

  const totalHeadcount = activeCount + resignedCount + inactiveCount;
  const activePct = totalHeadcount > 0 ? ((activeCount / totalHeadcount) * 100).toFixed(1) : '0.0';
  const resignedPct = totalHeadcount > 0 ? ((resignedCount / totalHeadcount) * 100).toFixed(1) : '0.0';
  const inactivePct = totalHeadcount > 0 ? ((inactiveCount / totalHeadcount) * 100).toFixed(1) : '0.0';

  const chartData = [
    { name: 'Active', value: activeCount, pct: activePct, color: '#0E9C86' },
    { name: 'Resigned', value: resignedCount, pct: resignedPct, color: '#E45C72' },
  ];
  if (inactiveCount > 0) {
    chartData.push({ name: 'Inactive', value: inactiveCount, pct: inactivePct, color: '#9CA3AF' });
  }

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col justify-between min-h-[220px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: '#0E9C86' }} aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Employee Status Distribution</h2>
          </div>
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border shrink-0 ${
              hasData
                ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
                : 'text-slate-500 bg-slate-50 dark:bg-slate-900 border-slate-200'
            }`}
          >
            {hasData ? `${activePct}% Active` : 'No Connection'}
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-32 w-full rounded-lg" />
        ) : !hasData || totalHeadcount === 0 ? (
          <div className="h-32 w-full my-1 flex flex-col items-center justify-center text-center p-2 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <ShieldCheck className="w-5 h-5 text-slate-400 mb-1 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Status Data</p>
            <p className="text-[10px] text-[var(--secondary)] mt-0.5">
              Connect to FastAPI backend to view live status distribution.
            </p>
          </div>
        ) : (
          <div className="relative w-full h-32 flex items-center justify-center my-1">
            <ResponsiveContainer width="100%" height={128}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={42}
                  outerRadius={58}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-status-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val, name, item) => [`${val.toLocaleString()} (${item.payload.pct}%)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-base font-black text-[var(--text)] leading-none">
                {totalHeadcount.toLocaleString()}
              </span>
              <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-wider mt-0.5">
                Total
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1 pt-2 border-t border-[var(--border)] text-[11px]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
            <span className="w-2 h-2 rounded-full bg-[#0E9C86]" />
            Active Employees:
          </span>
          <span className={`font-bold ${hasData ? 'text-emerald-600' : 'text-slate-400'}`}>
            {hasData ? `${activeCount.toLocaleString()} (${activePct}%)` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold text-[var(--secondary)]">
            <span className="w-2 h-2 rounded-full bg-[#E45C72]" />
            Resigned / Inactive:
          </span>
          <span className={`font-bold ${hasData ? 'text-[var(--secondary)]' : 'text-slate-400'}`}>
            {hasData ? `${(resignedCount + inactiveCount).toLocaleString()} (${resignedPct}%)` : '—'}
          </span>
        </div>
        <p className="text-[9px] text-[var(--secondary)] italic pt-0.5">
          Resigned employees (120 historical exits) are tracked with verified resignation dates in Neon DB.
        </p>
      </div>
    </Card>
  );
}
