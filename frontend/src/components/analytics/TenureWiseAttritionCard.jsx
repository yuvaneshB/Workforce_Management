import { Calendar, Clock } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function TenureWiseAttritionCard({ data = null, loading = false }) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const sourceData = data && Array.isArray(data) ? data : [];
  const chartData = sourceData.map((t) => ({
    ...t,
    tenure_range: t.tenure_range || t.band || t.tenure,
    label: t.label || `${t.count} (${t.pct})`,
  }));

  const highestTenure =
    chartData.length > 0
      ? [...chartData].sort((a, b) => (b.count || 0) - (a.count || 0))[0]
      : null;

  const renderTenureLabel = (props) => {
    const { x, y, width, index } = props;
    const item = chartData[index];
    if (!item) return null;
    return (
      <text
        x={x + width / 2}
        y={y - 14}
        textAnchor="middle"
        fill="var(--text)"
        className="select-none"
      >
        <tspan x={x + width / 2} dy="0" fontSize="10px" fontWeight="700">
          {item.count}
        </tspan>
        <tspan x={x + width / 2} dy="11" fontSize="8.5px" fontWeight="600" fill="var(--secondary)">
          ({item.pct})
        </tspan>
      </text>
    );
  };

  return (
    <Card className="p-4 w-full flex flex-col justify-between min-h-[260px] border border-[var(--border)] shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 shrink-0 text-emerald-600" aria-hidden="true" />
            <h2 className="text-[12px] sm:text-[13px] font-bold whitespace-nowrap text-[var(--text)]">
              Tenure-wise Attrition (Service Duration at Exit)
            </h2>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : !chartData || chartData.length === 0 ? (
          <div className="h-44 w-full my-1 flex flex-col items-center justify-center text-center p-4 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <Clock className="w-6 h-6 text-emerald-500 mb-2 opacity-80" />
            <p className="text-xs font-bold text-[var(--text)]">0 Tenure-wise Exits</p>
            <p className="text-[11px] text-[var(--secondary)] mt-0.5">
              Zero employee exits recorded across all tenure cohorts.
            </p>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row items-center gap-4 my-1">
            {/* Left Bar Chart */}
            <div className="h-44 flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 20, right: 15, left: -20, bottom: 0 }}
                  barSize={34}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke={palette.grid}
                  />
                  <XAxis
                    dataKey="tenure_range"
                    stroke={palette.axis}
                    tick={{ fill: palette.text, fontSize: 10, fontWeight: 600 }}
                    axisLine={{ stroke: palette.grid }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 65]}
                    ticks={[0, 15, 30, 45, 60]}
                    stroke={palette.axis}
                    tick={{ fill: palette.text, fontSize: 9 }}
                    axisLine={false}
                    tickLine={false}
                    label={{
                      value: 'No. of Exits',
                      angle: -90,
                      position: 'insideLeft',
                      offset: 28,
                      style: { fontSize: '9px', fill: 'var(--secondary)' },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: palette.tooltipBg,
                      borderColor: palette.tooltipBorder,
                      color: palette.tooltipText,
                      fontSize: '11px',
                      borderRadius: '8px',
                    }}
                    formatter={(val, name, item) => [
                      `${val} exits (${item?.payload?.pct || ''})`,
                      'Duration Bracket',
                    ]}
                  />
                  <Bar
                    dataKey="count"
                    fill="#10B981"
                    radius={[5, 5, 0, 0]}
                  >
                    <LabelList content={renderTenureLabel} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Right Side KPI Box */}
            <div className="w-full lg:w-56 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface-hover)] flex items-center gap-3 shrink-0">
              <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl font-black text-[var(--text)] tracking-tight">
                  4.5 Years
                </div>
                <div className="text-[10px] font-semibold text-[var(--secondary)]">
                  Average Tenure at Exit
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--secondary)]">
        <span>Tenure Vulnerability Window</span>
        <span className="font-bold text-emerald-600">
          {highestTenure ? `Highest Exits in ${highestTenure.tenure_range} Cohort (${highestTenure.pct})` : 'Zero Exits'}
        </span>
      </div>
    </Card>
  );
}

