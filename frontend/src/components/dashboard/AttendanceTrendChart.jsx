import { AlertCircle, RefreshCw, TrendingUp } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export function AttendanceTrendChart({
  attendanceAnalytics = null,
  granularity = 'daily',
  onGranularityChange = null,
  loading = false,
  error = null,
  onRetry = null,
  minimal = false,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const maleColor = isDark ? '#6BA5F5' : '#3B82F6';
  const femaleColor = isDark ? '#F472B6' : '#EC4899';
  const absentColor = isDark ? '#F87171' : '#EF4444';

  const rawTrends = !error ? (attendanceAnalytics?.trends ?? []) : [];

  // Slice from the end: daily -> 7, weekly -> 4, monthly -> 4
  const sliceCount = granularity === 'daily' ? 7 : 4;
  const slicedTrends = rawTrends.slice(-sliceCount);

  const trendData = slicedTrends.map((item, index) => {
    let xLabel = item.label || item.period_key || '';
    let fullLabel = item.label || item.period_key || '';

    if (granularity === 'daily') {
      // Format like "Nov 13"
      if (item.period_key && item.period_key.includes('-')) {
        const parts = item.period_key.split('-');
        if (parts.length >= 3) {
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          const month = MONTH_NAMES_SHORT[m] || parts[1];
          xLabel = `${month} ${d}`;
          fullLabel = `${month} ${d}, ${parts[0]}`;
        }
      }
    } else if (granularity === 'weekly') {
      // Format like "Wk 1 (Nov 3)"
      const weekNum = index + 1;
      let dateStr = '';
      if (item.period_key && item.period_key.includes('-')) {
        const parts = item.period_key.split('-');
        if (parts.length >= 3) {
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          const month = MONTH_NAMES_SHORT[m] || parts[1];
          dateStr = `${month} ${d}`;
        }
      }
      if (!dateStr && item.label) {
        const match = item.label.match(/(\d+)-(\d+)/);
        if (match) {
          const m = parseInt(match[1], 10) - 1;
          const month = MONTH_NAMES_SHORT[m] || match[1];
          dateStr = `${month} ${parseInt(match[2], 10)}`;
        }
      }
      xLabel = dateStr ? `Wk ${weekNum} (${dateStr})` : `Wk ${weekNum}`;
      fullLabel = dateStr ? `Week ${weekNum} (${dateStr})` : `Week ${weekNum}`;
    } else if (granularity === 'monthly') {
      // Format like "Aug", "Sep"
      if (item.period_key && item.period_key.includes('-')) {
        const parts = item.period_key.split('-');
        const m = parseInt(parts[1], 10) - 1;
        const month = MONTH_NAMES_SHORT[m] || parts[1];
        xLabel = month;
        fullLabel = `${month} ${parts[0]}`;
      } else if (item.label) {
        xLabel = item.label.split(' ')[0];
        fullLabel = item.label;
      }
    }

    const total = item.total_records || 0;
    const absent_pct =
      item.absenteeism_pct != null
        ? Number(Number(item.absenteeism_pct).toFixed(1))
        : total > 0
          ? Number((((item.absent_count || 0) / total) * 100).toFixed(1))
          : 0;

    return {
      period_key: item.period_key,
      displayLabel: xLabel,
      fullLabel,
      male_present_count: item.male_present_count ?? 0,
      female_present_count: item.female_present_count ?? 0,
      present_count: item.present_count ?? 0,
      absent_count: item.absent_count ?? 0,
      total_records: total,
      absent_pct,
    };
  });

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
            Attendance Trend
          </h3>
        </div>

        {/* Daily / Weekly / Monthly Toggle */}
        <div className="flex items-center gap-1 bg-[var(--muted-fill)] p-1 rounded-xl">
          {['daily', 'weekly', 'monthly'].map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => onGranularityChange?.(g)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${
                granularity === g
                  ? 'bg-white dark:bg-[var(--surface)] text-[var(--brand-purple)] shadow-2xs'
                  : 'text-[var(--secondary)] hover:text-[var(--text)]'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Body */}
      <div className="flex-1 w-full min-h-[220px]">
        {loading ? (
          <div className="h-full min-h-[220px] flex items-center justify-center">
            <LoadingSkeleton className="h-48 w-full rounded-xl" />
          </div>
        ) : error ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <AlertCircle className="w-6 h-6 text-rose-500 mb-1" />
            <p className="text-xs font-bold text-[var(--text)]">Failed to load attendance trends</p>
            <p className="text-[10px] text-[var(--secondary)] mt-0.5">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="mt-2 text-xs font-bold text-[var(--brand-purple)] hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            )}
          </div>
        ) : trendData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-4 text-[var(--secondary)] text-xs">
            No attendance trend records for the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart
              data={trendData}
              barGap={4}
              barCategoryGap="25%"
              margin={{ top: 10, right: 10, left: -10, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
              <XAxis
                dataKey="displayLabel"
                interval={0}
                tick={{ fill: palette.axisText, fontSize: 10, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: palette.grid }}
              />
              {/* Left Y Axis: Headcount for Male and Female Present */}
              <YAxis
                yAxisId="left"
                orientation="left"
                domain={[0, (dataMax) => (dataMax > 0 ? Math.ceil(dataMax * 1.1) : 'auto')]}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                tick={{ fill: palette.axisText, fontSize: 10, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
              />
              {/* Right Y Axis: Percentage for Absent % */}
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, (dataMax) => (dataMax > 0 ? Number((dataMax * 1.25).toFixed(1)) : 5)]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: palette.axisText, fontSize: 10, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload;
                  if (!item) return null;
                  return (
                    <div
                      className="p-3 rounded-xl shadow-lg border text-xs space-y-2 min-w-[190px]"
                      style={{
                        backgroundColor: palette.tooltipBg,
                        borderColor: palette.tooltipBorder,
                        color: palette.tooltipText,
                      }}
                    >
                      <div className="font-extrabold text-[12px] pb-1.5 border-b border-[var(--border)] flex items-center justify-between">
                        <span>{item.fullLabel || item.displayLabel}</span>
                        <span className="text-[10px] font-normal text-[var(--secondary)]">
                          Total: {item.total_records.toLocaleString()}
                        </span>
                      </div>
                      <div className="space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: maleColor }} />
                            <span className="font-medium">Male Present:</span>
                          </span>
                          <span className="font-bold">{item.male_present_count.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: femaleColor }} />
                            <span className="font-medium">Female Present:</span>
                          </span>
                          <span className="font-bold">{item.female_present_count.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]/60">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: absentColor }} />
                            <span className="font-medium">Absent %:</span>
                          </span>
                          <span className="font-bold">
                            {item.absent_pct}% <span className="text-[10px] font-normal text-[var(--secondary)]">({item.absent_count})</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="male_present_count"
                name="Male Present"
                fill={maleColor}
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
              <Bar
                yAxisId="left"
                dataKey="female_present_count"
                name="Female Present"
                fill={femaleColor}
                radius={[4, 4, 0, 0]}
                maxBarSize={30}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="absent_pct"
                name="Absent %"
                stroke={absentColor}
                strokeWidth={2.5}
                dot={{ r: 4, fill: absentColor, stroke: '#FFFFFF', strokeWidth: 1.5 }}
                activeDot={{ r: 6, fill: absentColor, stroke: '#FFFFFF', strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend at bottom with all 3 series */}
      <div className="flex flex-wrap items-center justify-center gap-5 text-xs font-semibold pt-2 mt-auto">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: maleColor }} />
          <span className="text-[11px] font-semibold text-[var(--text)]">Male Present</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-xs" style={{ backgroundColor: femaleColor }} />
          <span className="text-[11px] font-semibold text-[var(--text)]">Female Present</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center w-4 h-3 relative">
            <span className="w-4 h-[2px]" style={{ backgroundColor: absentColor }} />
            <span
              className="w-2 h-2 rounded-full absolute border border-white dark:border-[var(--surface)]"
              style={{ backgroundColor: absentColor }}
            />
          </span>
          <span className="text-[11px] font-semibold text-[var(--text)]">Absent %</span>
        </span>
      </div>
    </div>
  );
}
