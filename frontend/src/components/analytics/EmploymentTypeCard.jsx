import { Briefcase } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function EmploymentTypeCard({
  workforceSummary = null,
  loading = false,
  error = null,
  className = '',
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;
  const sliceStroke = isDark ? (palette.surface || '#192235') : '#FFFFFF';

  const totalEmployees = !error && workforceSummary ? (workforceSummary.total_employees ?? 0) : 0;

  // Extract counts from workforceSummary
  let permanentEmployees = workforceSummary?.permanent_count ?? 0;
  let vendorEmployees = workforceSummary?.vendor_count ?? 0;

  if (workforceSummary?.by_employment_type && workforceSummary.by_employment_type.length > 0) {
    workforceSummary.by_employment_type.forEach((item) => {
      const key = String(item.key || '').toLowerCase();
      if (key === 'permanent') permanentEmployees = item.count;
      else if (key === 'vendor') vendorEmployees = item.count;
    });
  }

  const unclassifiedEmployees = Math.max(0, totalEmployees - (permanentEmployees + vendorEmployees));

  const permanentPct = totalEmployees > 0 ? ((permanentEmployees / totalEmployees) * 100).toFixed(1) : '0.0';
  const vendorPct = totalEmployees > 0 ? ((vendorEmployees / totalEmployees) * 100).toFixed(1) : '0.0';
  const unclassifiedPct = totalEmployees > 0 ? ((unclassifiedEmployees / totalEmployees) * 100).toFixed(1) : '0.0';

  const chartData = [
    { name: 'Permanent Direct', value: permanentEmployees, pct: permanentPct, color: '#4D8EEB' },
    { name: 'Vendor Contract', value: vendorEmployees, pct: vendorPct, color: '#F58A3A' },
  ];

  if (unclassifiedEmployees > 0) {
    chartData.push({
      name: 'Unclassified',
      value: unclassifiedEmployees,
      pct: unclassifiedPct,
      color: '#9CA3AF',
    });
  }

  return (
    <Card className={`p-3.5 sm:p-4 flex flex-col justify-between h-full min-h-[175px] ${className}`}>
      <div>
        <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Briefcase className="w-4 h-4 shrink-0" style={{ color: '#4D8EEB' }} aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap text-[var(--text)]">Employment Type Distribution</h2>
          </div>
          {totalEmployees > 0 && !loading && (
            <span className="text-[11px] font-bold text-[var(--secondary)] shrink-0">
              {totalEmployees.toLocaleString()} Total
            </span>
          )}
        </div>

        {loading ? (
          <LoadingSkeleton className="h-[110px] w-full rounded-lg my-1" />
        ) : totalEmployees === 0 ? (
          <div className="h-[110px] w-full my-1 flex flex-col items-center justify-center text-center p-2 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <Briefcase className="w-5 h-5 text-slate-400 mb-1 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Employment Data</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-row items-center justify-between gap-2 sm:gap-3 my-auto min-h-[110px]">
            {/* Left side: Employment type pie chart */}
            <div className="relative w-[110px] h-[110px] shrink-0 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={110}>
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={0}
                    outerRadius={46}
                    dataKey="value"
                    stroke={sliceStroke}
                    strokeWidth={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
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

            {/* Right side: Permanent Direct and Vendor Contract counts and percentages */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 sm:gap-2">
              {chartData.map((item) => (
                <div
                  key={item.name}
                  className="px-2.5 py-1.5 rounded-lg bg-[var(--surface-hover)]/40 border border-[var(--border)]/60 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-semibold text-[var(--text)] truncate text-[11px] sm:text-xs">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 shrink-0 pl-1 text-right">
                    <span className="font-extrabold text-[var(--text)] tabular-nums text-xs sm:text-[13px]">
                      {item.value.toLocaleString()}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-bold text-[var(--secondary)] tabular-nums">
                      ({item.pct}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export default EmploymentTypeCard;
