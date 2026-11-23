import { TrendingUp } from 'lucide-react';
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
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const PERIODS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

function formatTrendTick(tick) {
  if (!tick) return '';
  const str = String(tick);
  const parts = str.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (parts.length === 3) {
    const m = parseInt(parts[1], 10) - 1;
    return `${months[m] || parts[1]} ${parts[2]}`;
  }
  return str;
}

export function AttendanceTrendChart({
  attendance = null,
  period = 'daily',
  onPeriodChange = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawTrends = !error ? (attendance?.trends ?? []) : [];

  const trendData = rawTrends.map((item) => {
    const total = item.total_records || 0;
    const present_pct = item.attendance_pct ?? (total > 0 ? ((item.present_count || 0) / total) * 100 : 0);
    const absent_real = item.absenteeism_pct ?? (total > 0 ? ((item.absent_count || 0) / total) * 100 : 0);
    const leave_real = total > 0 ? ((item.leave_count || 0) / total) * 100 : 0;
    const late_real = total > 0 ? ((item.late_count || 0) / total) * 100 : 0;

    return {
      period_key: item.period_key,
      label: item.label,
      present_pct: Number(present_pct.toFixed(2)),
      absent_pct: Number(absent_real.toFixed(2)),
      leave_pct: Number(leave_real.toFixed(2)),
      late_pct: Number(late_real.toFixed(2)),
      total_records: total,
    };
  });

  const tickInterval = trendData.length > 0 ? Math.max(1, Math.floor(trendData.length / 8)) : 0;

  return (
    <Card className="p-4 lg:col-span-6 flex flex-col justify-between min-h-[260px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="w-4 h-4 shrink-0 text-[#4D8EEB]" aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Attendance Trend</h2>
          </div>

          {/* Daily / Weekly / Monthly Toggle */}
          <div
            className="inline-flex rounded-lg border p-0.5 shrink-0"
            style={{ borderColor: 'var(--border)', background: 'var(--brand-bg)' }}
            role="group"
            aria-label="Attendance trend granularity"
          >
            {PERIODS.map((p) => {
              const active = period === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onPeriodChange?.(p.id)}
                  className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                  style={
                    active
                      ? { background: '#6F3DBA', color: '#FFFFFF' }
                      : { color: 'var(--secondary)' }
                  }
                >
                  {p.label}
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : !trendData || trendData.length === 0 ? (
          <div className="h-44 w-full my-1 flex flex-col items-center justify-center text-center p-4 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <TrendingUp className="w-6 h-6 text-slate-400 mb-2 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Attendance Trend Data</p>
            <p className="text-[11px] text-[var(--secondary)] mt-0.5">
              Connect to FastAPI backend to view attendance trend trajectory.
            </p>
          </div>
        ) : (
          <div className="h-44 w-full my-1">
            <ResponsiveContainer width="100%" height={176}>
              <LineChart data={trendData} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis
                  dataKey="period_key"
                  stroke={palette.axisText}
                  fontSize={9}
                  interval={tickInterval}
                  tickFormatter={formatTrendTick}
                  tickLine={false}
                />
                <YAxis
                  stroke={palette.axisText}
                  fontSize={9}
                  domain={[80, 100]}
                  ticks={[80, 85, 90, 95, 100]}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val, name) => [`${val}%`, name]}
                />
                <Line
                  type="monotone"
                  dataKey="present_pct"
                  name="Present"
                  stroke="#6F3DBA"
                  strokeWidth={2}
                  dot={{ r: 2.5, fill: '#6F3DBA' }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="absent_pct"
                  name="Absent"
                  stroke="#E45C72"
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: '#E45C72' }}
                />
                <Line
                  type="monotone"
                  dataKey="leave_pct"
                  name="Leave"
                  stroke="#F58A3A"
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: '#F58A3A' }}
                />
                <Line
                  type="monotone"
                  dataKey="late_pct"
                  name="Late"
                  stroke="#4D8EEB"
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: '#4D8EEB' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 pt-2 border-t border-[var(--border)] text-[10px]">
        <span className="flex items-center gap-1.5 font-bold text-[var(--text)]">
          <span className="w-2 h-2 rounded-full bg-[#6F3DBA]" />
          Present
        </span>
        <span className="flex items-center gap-1.5 font-bold text-[var(--text)]">
          <span className="w-2 h-2 rounded-full bg-[#E45C72]" />
          Absent
        </span>
        <span className="flex items-center gap-1.5 font-bold text-[var(--text)]">
          <span className="w-2 h-2 rounded-full bg-[#F58A3A]" />
          Leave
        </span>
        <span className="flex items-center gap-1.5 font-bold text-[var(--text)]">
          <span className="w-2 h-2 rounded-full bg-[#4D8EEB]" />
          Late
        </span>
      </div>
    </Card>
  );
}

