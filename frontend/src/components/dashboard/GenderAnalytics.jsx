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

  const chartData =
    !error && (male || female)
      ? [
          ...(male ? [{ name: 'Male', value: male.employee_count, pct: totalEmployees > 0 ? ((male.employee_count / totalEmployees) * 100).toFixed(1) : '0.0', color: maleColor }] : []),
          ...(female ? [{ name: 'Female', value: female.employee_count, pct: totalEmployees > 0 ? ((female.employee_count / totalEmployees) * 100).toFixed(1) : '0.0', color: femaleColor }] : []),
        ]
      : [];

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, value, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="#FFFFFF"
        textAnchor="middle"
        dominantBaseline="central"
        className="font-bold pointer-events-none select-none"
        style={{
          filter: 'drop-shadow(0px 1px 3px rgba(0, 0, 0, 0.85))',
        }}
      >
        <tspan x={x} dy="-0.35em" fontSize="11px" fontWeight="800">
          {name}: {value?.toLocaleString()}
        </tspan>
        <tspan x={x} dy="1.35em" fontSize="10px" fontWeight="700" fill="#F8FAFC">
          ({(percent * 100).toFixed(1)}%)
        </tspan>
      </text>
    );
  };

  return (
    <Card className={`p-4 flex flex-col justify-between h-full min-h-[340px] ${className}`}>
      <div>
        <div className="flex items-center justify-between gap-2 mb-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 shrink-0 text-blue-500" aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Gender Analytics</h2>
          </div>
          {totalEmployees > 0 && !loading && (
            <span className="text-[11px] font-bold text-[var(--secondary)] shrink-0">
              {totalEmployees.toLocaleString()} Total
            </span>
          )}
        </div>

        {loading ? (
          <LoadingSkeleton className="h-[220px] w-full rounded-lg my-1" />
        ) : chartData.length === 0 ? (
          <div className="h-[220px] w-full my-1 flex flex-col items-center justify-center text-center p-2 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <Users className="w-5 h-5 text-slate-400 mb-1 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Gender Data</p>
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
                  outerRadius={82}
                  dataKey="value"
                  stroke={sliceStroke}
                  strokeWidth={2}
                  label={renderCustomizedLabel}
                  labelLine={false}
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
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[var(--border)]">
        <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-semibold text-blue-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              Male
            </span>
            <span className="text-[10px] font-bold text-blue-400">
              {totalEmployees > 0 && male ? `${((male.employee_count / totalEmployees) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm font-extrabold text-[var(--text)] tabular-nums">
              {male ? male.employee_count.toLocaleString() : '0'}
            </span>
            <span className="text-[10px] font-medium text-[var(--secondary)]">Headcount</span>
          </div>
        </div>

        <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 flex flex-col justify-between">
          <div className="flex items-center justify-between text-[11px] font-semibold text-pink-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#EC4899]" />
              Female
            </span>
            <span className="text-[10px] font-bold text-pink-400">
              {totalEmployees > 0 && female ? `${((female.employee_count / totalEmployees) * 100).toFixed(1)}%` : '0%'}
            </span>
          </div>
          <div className="mt-1 flex items-baseline justify-between">
            <span className="text-sm font-extrabold text-[var(--text)] tabular-nums">
              {female ? female.employee_count.toLocaleString() : '0'}
            </span>
            <span className="text-[10px] font-medium text-[var(--secondary)]">Headcount</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default GenderAnalytics;
