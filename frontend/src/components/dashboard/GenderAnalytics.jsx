import { Users } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function GenderAnalytics({ genderAnalytics = null, loading = false, error = null, className = '' }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;
  const sliceStroke = isDark ? (palette.surface || '#192235') : '#FFFFFF';

  const buckets = genderAnalytics?.buckets ?? [];
  const male = buckets.find((b) => b.gender === 'Male');
  const female = buckets.find((b) => b.gender === 'Female');

  const maleCount = male?.employee_count || 0;
  const femaleCount = female?.employee_count || 0;
  const totalEmployees =
    genderAnalytics?.total_employees ||
    maleCount + femaleCount ||
    0;

  // Vibrant, high-contrast gender palette
  const maleColor = '#3B82F6';
  const femaleColor = '#EC4899';

  const malePct = totalEmployees > 0 ? ((maleCount / totalEmployees) * 100).toFixed(1) : '0.0';
  const femalePct = totalEmployees > 0 ? ((femaleCount / totalEmployees) * 100).toFixed(1) : '0.0';

  const chartData =
    !error && (male || female)
      ? [
          ...(male ? [{ name: 'Male', value: maleCount, pct: malePct, color: maleColor }] : []),
          ...(female ? [{ name: 'Female', value: femaleCount, pct: femalePct, color: femaleColor }] : []),
        ]
      : [];

  return (
    <Card className={`p-3.5 sm:p-4 flex flex-col justify-between h-full min-h-[175px] ${className}`}>
      <div>
        <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 shrink-0 text-blue-500" aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap text-[var(--text)]">Gender Analytics</h2>
          </div>
          {totalEmployees > 0 && !loading && (
            <span className="text-[11px] font-bold text-[var(--secondary)] shrink-0">
              {totalEmployees.toLocaleString()} Total
            </span>
          )}
        </div>

        {loading ? (
          <LoadingSkeleton className="h-[110px] w-full rounded-lg my-1" />
        ) : chartData.length === 0 ? (
          <div className="h-[110px] w-full my-1 flex flex-col items-center justify-center text-center p-2 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <Users className="w-5 h-5 text-slate-400 mb-1 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Gender Data</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-row items-center justify-between gap-2 sm:gap-3 my-auto min-h-[110px]">
            {/* Left side: Gender pie chart */}
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
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
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
                    formatter={(val, name, item) => [`${val.toLocaleString()} employees (${item.payload.pct}%)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Right side: Male and Female counts and percentages */}
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

export default GenderAnalytics;
