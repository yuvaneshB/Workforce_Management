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
  className = '',
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;
  const sliceStroke = isDark ? (palette.surface || '#192235') : '#FFFFFF';

  const hasData = !error && (workforceSummary?.total_employees != null || employees.length > 0);

  let activeCount = workforceSummary?.active_employees ?? (employees.length || 0);
  let resignedCount = workforceSummary?.resigned_employees ?? 0;
  let inactiveCount = workforceSummary?.inactive_employees ?? 0;

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
    <Card className={`p-4 flex flex-col justify-between h-full min-h-[340px] ${className}`}>
      <div>
        <div className="flex items-center gap-2 mb-2 min-w-0">
          <ShieldCheck className="w-4 h-4 shrink-0" style={{ color: '#0E9C86' }} aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Employee Status Distribution</h2>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-[220px] w-full rounded-lg my-1" />
        ) : !hasData || totalHeadcount === 0 ? (
          <div className="h-[220px] w-full my-1 flex flex-col items-center justify-center text-center p-2 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <ShieldCheck className="w-5 h-5 text-slate-400 mb-1 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Status Data</p>
          </div>
        ) : (
          <div className="relative w-full h-[220px] flex items-center justify-center my-1">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={78}
                  dataKey="value"
                  stroke={sliceStroke}
                  strokeWidth={2}
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
          </div>
        )}
      </div>

      <div className="space-y-1.5 pt-2 border-t border-[var(--border)] text-[11px]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
            <span className="w-2 h-2 rounded-full bg-[#0E9C86]" />
            Active:
          </span>
          <span className="font-extrabold text-[var(--text)] tabular-nums">
            {totalHeadcount > 0 ? `${activeCount.toLocaleString()} (${activePct}%)` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
            <span className="w-2 h-2 rounded-full bg-[#E45C72]" />
            Resigned:
          </span>
          <span className="font-extrabold text-[var(--text)] tabular-nums">
            {totalHeadcount > 0 ? `${resignedCount.toLocaleString()} (${resignedPct}%)` : '—'}
          </span>
        </div>
        {inactiveCount > 0 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-[var(--secondary)]">
              <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
              Inactive:
            </span>
            <span className="font-extrabold text-slate-500 tabular-nums">
              {`${inactiveCount.toLocaleString()} (${inactivePct}%)`}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

export default EmployeeStatusCard;
