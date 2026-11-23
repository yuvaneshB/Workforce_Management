import { AlertCircle, RefreshCw, TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

function formatTrendTick(tick) {
  if (!tick) return '';
  const str = String(tick);
  const parts = str.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (parts.length === 3) {
    const m = parseInt(parts[1], 10) - 1;
    return `${months[m] || parts[1]} ${parts[2]}`;
  }
  if (parts.length === 2) {
    if (parts[0].length === 4) {
      const m = parseInt(parts[1], 10) - 1;
      return `${months[m] || parts[1]} ${parts[0]}`;
    }
    const m = parseInt(parts[0], 10) - 1;
    return `${months[m] || parts[0]} ${parts[1]}`;
  }
  return str;
}

export function AttendanceTrendChart({
  attendanceAnalytics = null,
  granularity = 'daily',
  onGranularityChange = null,
  loading = false,
  error = null,
  onRetry = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawTrends = !error ? (attendanceAnalytics?.trends ?? []) : [];

  const trendData = rawTrends.map((item) => {
    const total = item.total_records || 0;
    const present_pct =
      item.attendance_pct ?? (total > 0 ? ((item.present_count || 0) / total) * 100 : 0);
    const absent_pct =
      item.absenteeism_pct ?? (total > 0 ? ((item.absent_count || 0) / total) * 100 : 0);
    const leave_pct = total > 0 ? ((item.leave_count || 0) / total) * 100 : 0;
    const late_pct = total > 0 ? ((item.late_count || 0) / total) * 100 : 0;

    return {
      period_key: item.period_key,
      label: item.label,
      present_pct: Number(present_pct.toFixed(1)),
      absent_pct: Number(absent_pct.toFixed(1)),
      leave_pct: Number(leave_pct.toFixed(1)),
      late_pct: Number(late_pct.toFixed(1)),
      present_count: item.present_count || 0,
      absent_count: item.absent_count || 0,
      total_records: total,
    };
  });

  const tickInterval = trendData.length > 0 ? Math.floor(trendData.length / 6.2) : 0;

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      {/* Header and Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
              Attendance Trend (Multi-Line Analytics)
            </h3>
            <p className="text-[11px] text-[var(--secondary)]">
              Daily, Weekly, and Monthly attendance rate trajectory
            </p>
          </div>
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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs font-semibold mb-2">
        <span className="flex items-center gap-1.5 text-[var(--secondary)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#6F3DBA]" />
          <span className="text-[11px]">Present %</span>
        </span>
        <span className="flex items-center gap-1.5 text-[var(--secondary)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E45C72]" />
          <span className="text-[11px]">Absent %</span>
        </span>
        <span className="flex items-center gap-1.5 text-[var(--secondary)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F58A3A]" />
          <span className="text-[11px]">Leave %</span>
        </span>
        <span className="flex items-center gap-1.5 text-[var(--secondary)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4D8EEB]" />
          <span className="text-[11px]">Late %</span>
        </span>
      </div>

      {/* Chart Body */}
      <div className="flex-1 w-full min-h-[220px]">
        {loading && trendData.length === 0 ? (
          <div className="h-full flex items-center justify-center">
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
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData} margin={{ top: 8, right: 12, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
              <XAxis
                dataKey="period_key"
                tickFormatter={formatTrendTick}
                interval={tickInterval}
                tick={{ fill: palette.axisText, fontSize: 10, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: palette.grid }}
              />
              <YAxis
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: palette.axisText, fontSize: 10, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload;
                  return (
                    <div
                      className="p-2.5 rounded-xl shadow-lg border text-xs space-y-1.5"
                      style={{
                        backgroundColor: palette.tooltipBg,
                        borderColor: palette.tooltipBorder,
                        color: palette.tooltipText,
                      }}
                    >
                      <div className="font-extrabold text-[11px] pb-1 border-b border-[var(--border)]">
                        {item?.label || label}
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#6F3DBA]" />
                          Present:
                        </span>
                        <span className="font-bold">{item?.present_pct}%</span>

                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#E45C72]" />
                          Absent:
                        </span>
                        <span className="font-bold">{item?.absent_pct}%</span>

                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#F58A3A]" />
                          Leave:
                        </span>
                        <span className="font-bold">{item?.leave_pct}%</span>

                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-[#4D8EEB]" />
                          Late:
                        </span>
                        <span className="font-bold">{item?.late_pct}%</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="present_pct"
                name="Present %"
                stroke="#6F3DBA"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, stroke: '#6F3DBA', strokeWidth: 2, fill: '#FFFFFF' }}
              />
              <Line
                type="monotone"
                dataKey="absent_pct"
                name="Absent %"
                stroke="#E45C72"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: '#E45C72', strokeWidth: 2, fill: '#FFFFFF' }}
              />
              <Line
                type="monotone"
                dataKey="leave_pct"
                name="Leave %"
                stroke="#F58A3A"
                strokeWidth={1.5}
                strokeDasharray="4 2"
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="late_pct"
                name="Late %"
                stroke="#4D8EEB"
                strokeWidth={1.5}
                strokeDasharray="2 2"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

