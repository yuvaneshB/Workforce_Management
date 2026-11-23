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
  if (parts.length === 2 && parts[0].length === 2) {
    const m = parseInt(parts[0], 10) - 1;
    return `${months[m] || parts[0]} ${parts[1]}`;
  }
  return str;
}

export function AttendanceTrends({
  attendanceAnalytics = null,
  loading = false,
  error = null,
  onRetry = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawTrends = !error ? (attendanceAnalytics?.trends ?? []) : [];

  const trendData = rawTrends.map((item) => {
    const total = item.total_records || 0;
    const present_pct = item.attendance_pct ?? (total > 0 ? ((item.present_count || 0) / total) * 100 : 0);
    const absent_real = item.absenteeism_pct ?? (total > 0 ? ((item.absent_count || 0) / total) * 100 : 0);
    const leave_real = total > 0 ? ((item.leave_count || 0) / total) * 100 : 0;
    const late_real = total > 0 ? ((item.late_count || 0) / total) * 100 : 0;

    return {
      period_key: item.period_key,
      label: item.label,
      present_pct: Number(present_pct.toFixed(1)),
      absent_plot: Number(absent_real.toFixed(1)),
      leave_plot: Number(leave_real.toFixed(1)),
      late_plot: Number(late_real.toFixed(1)),
      // Real percentages for tooltips
      absent_pct: Number(absent_real.toFixed(1)),
      leave_pct: Number(leave_real.toFixed(1)),
      late_pct: Number(late_real.toFixed(1)),
    };
  });

  // Calculate interval so ticks show Aug 01, Aug 16, Aug 31, Sep 15, Sep 30, Oct 15, Oct 31
  const tickInterval = trendData.length > 0 ? Math.floor(trendData.length / 6.2) : 0;

  return (
    <div className="surface rounded-2xl p-4.5 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      {/* Card Header & Legends */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
            Attendance Trend
          </h2>
        </div>

        {/* Legend dots */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-[var(--secondary)]">
            <span className="w-2 h-2 rounded-full bg-[#6F3DBA] dark:bg-[#A684EE]" />
            <span className="text-[11px]">Present</span>
          </span>
          <span className="flex items-center gap-1.5 text-[var(--secondary)]">
            <span className="w-2 h-2 rounded-full bg-[#E45C72] dark:bg-[#FF7D90]" />
            <span className="text-[11px]">Absent</span>
          </span>
          <span className="flex items-center gap-1.5 text-[var(--secondary)]">
            <span className="w-2 h-2 rounded-full bg-[#F58A3A] dark:bg-[#FFAB63]" />
            <span className="text-[11px]">Leave</span>
          </span>
          <span className="flex items-center gap-1.5 text-[var(--secondary)]">
            <span className="w-2 h-2 rounded-full bg-[#4D8EEB] dark:bg-[#78ACF5]" />
            <span className="text-[11px]">Late</span>
          </span>
        </div>
      </div>

      {/* Chart Body */}
      {loading ? (
        <LoadingSkeleton className="h-52 w-full rounded-xl" />
      ) : error ? (
        <div className="h-52 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <AlertCircle className="w-5 h-5 text-rose-500" />
          <p className="text-xs text-rose-500 font-semibold">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 px-3 py-1 text-[11px] font-semibold rounded-md border border-[var(--border)] hover:bg-[var(--muted-fill)] text-[var(--text)] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          )}
        </div>
      ) : trendData.length > 0 ? (
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height={210}>
            <LineChart data={trendData} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
              <XAxis
                dataKey="period_key"
                stroke={palette.axisText}
                fontSize={10}
                interval={tickInterval}
                tickFormatter={formatTrendTick}
                tickLine={false}
              />
              <YAxis
                stroke={palette.axisText}
                fontSize={10}
                domain={[0, 100]}
                ticks={[0, 20, 40, 60, 80, 100]}
                unit="%"
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: palette.tooltipBg,
                  borderColor: palette.tooltipBorder,
                  color: palette.tooltipText,
                  fontSize: '11px',
                  borderRadius: '10px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
                formatter={(val, name, item) => {
                  const p = item.payload;
                  if (name === 'Present') return [`${p.present_pct}%`, 'Present'];
                  if (name === 'Absent') return [`${p.absent_pct}%`, 'Absent'];
                  if (name === 'Leave') return [`${p.leave_pct}%`, 'Leave'];
                  if (name === 'Late') return [`${p.late_pct}%`, 'Late'];
                  return [`${val}%`, name];
                }}
                labelFormatter={(lbl) => formatTrendTick(lbl)}
              />
              <Line
                type="monotone"
                dataKey="present_pct"
                name="Present"
                stroke={theme === 'dark' ? '#A684EE' : '#6F3DBA'}
                strokeWidth={2}
                isAnimationActive={false}
                connectNulls={true}
                dot={{
                  r: 1.5,
                  fill: theme === 'dark' ? '#192235' : '#FFFFFF',
                  stroke: theme === 'dark' ? '#A684EE' : '#6F3DBA',
                  strokeWidth: 1,
                }}
                activeDot={{ r: 4, fill: theme === 'dark' ? '#A684EE' : '#6F3DBA' }}
              />
              <Line
                type="monotone"
                dataKey="absent_plot"
                name="Absent"
                stroke={theme === 'dark' ? '#FF7D90' : '#E45C72'}
                strokeWidth={1.5}
                isAnimationActive={false}
                connectNulls={true}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="leave_plot"
                name="Leave"
                stroke={theme === 'dark' ? '#FFAB63' : '#F58A3A'}
                strokeWidth={1.5}
                isAnimationActive={false}
                connectNulls={true}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="late_plot"
                name="Late"
                stroke={theme === 'dark' ? '#78ACF5' : '#4D8EEB'}
                strokeWidth={1.5}
                isAnimationActive={false}
                connectNulls={true}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-52 flex items-center justify-center text-[var(--secondary)] text-xs">
          No attendance trend data available
        </div>
      )}
    </div>
  );
}
