import { BarChart2, UserPlus } from 'lucide-react';
import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const PERIODS = [
  { id: 'daily', label: 'D' },
  { id: 'weekly', label: 'W' },
  { id: 'monthly', label: 'M' },
];

export function NewJoinerAnalytics({
  newJoinerAnalytics = null,
  granularity = 'daily',
  onGranularityChange,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const totalNewJoiners = !error ? (newJoinerAnalytics?.total_new_joiners ?? 0) : 0;
  const trends = !error ? (newJoinerAnalytics?.trends ?? []) : [];

  // Apply 7-point moving average when granularity is daily to smooth out day-to-day noise
  const processedTrends = useMemo(() => {
    if (!trends || trends.length === 0) return [];
    if (granularity !== 'daily' || trends.length < 5) {
      return trends.map((t) => ({
        ...t,
        display_pct: t.attendance_pct,
        raw_pct: t.attendance_pct,
      }));
    }
    return trends.map((pt, idx, arr) => {
      const start = Math.max(0, idx - 6);
      const window = arr.slice(start, idx + 1);
      const valid = window.filter((w) => w.attendance_pct != null);
      const avg = valid.length > 0
        ? valid.reduce((sum, curr) => sum + curr.attendance_pct, 0) / valid.length
        : pt.attendance_pct;
      return {
        ...pt,
        display_pct: Number(avg.toFixed(1)),
        raw_pct: pt.attendance_pct,
      };
    });
  }, [trends, granularity]);

  // Compute auto-scaled Y axis bounds based on real data
  const { yMin, yMax } = useMemo(() => {
    const vals = processedTrends.map((d) => d.display_pct).filter((v) => v != null);
    if (!vals.length) return { yMin: 50, yMax: 100 };
    const min = Math.max(0, Math.floor(Math.min(...vals) - 5));
    const max = Math.min(100, Math.ceil(Math.max(...vals) + 5));
    return { yMin: min, yMax: max };
  }, [processedTrends]);

  // Limit X-axis ticks to 6 to 8 readable labels
  const xInterval = useMemo(() => {
    if (processedTrends.length <= 8) return 0;
    return Math.ceil(processedTrends.length / 7);
  }, [processedTrends.length]);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="p-2.5 rounded-lg text-xs shadow-lg border"
          style={{
            backgroundColor: palette.tooltipBg,
            borderColor: palette.tooltipBorder,
            color: palette.tooltipText,
          }}
        >
          <p className="font-bold mb-1 text-[var(--foreground)]">{data.label || data.period_key}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-[#6F3DBA]">
            <span className="w-2 h-2 rounded-full bg-[#6F3DBA]" />
            <span>
              Attendance Rate:{' '}
              <strong>{data.display_pct}%</strong>
              {granularity === 'daily' && data.raw_pct != null && (
                <span className="muted ml-1 text-[10px]">(Raw: {data.raw_pct}%)</span>
              )}
            </span>
          </div>
          {data.present_count != null && (
            <p className="text-[10px] muted mt-0.5">
              Present: {data.present_count} / {data.total_records}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 flex flex-col h-full min-h-[300px]">
      {/* Single clean line header with D/W/M toggle */}
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <UserPlus className="w-4 h-4 shrink-0" style={{ color: '#F58A3A' }} aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold truncate">New Joiner Analytics</h2>
        </div>

        <div
          className="inline-flex rounded-lg border p-0.5 shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--muted-fill)' }}
          role="group"
          aria-label="New joiner trend period"
        >
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onGranularityChange?.(p.id)}
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                granularity === p.id
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'text-[var(--secondary)] hover:text-[var(--foreground)]'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI strip: Joiners / Att % / Avg Tenure */}
      {!loading && !error && newJoinerAnalytics && (
        <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-md bg-[var(--muted-fill)]/40 border border-[var(--border)]/60 mb-2 shrink-0">
          <span>
            Joiners: <strong className="text-[var(--foreground)]">{totalNewJoiners}</strong>
          </span>
          <span>
            Att:{' '}
            <strong className="text-[#6F3DBA]">
              {newJoinerAnalytics.attendance_pct !== null
                ? `${newJoinerAnalytics.attendance_pct}%`
                : '—'}
            </strong>
          </span>
          <span>
            Avg Tenure:{' '}
            <strong className="text-[var(--foreground)]">
              {newJoinerAnalytics.avg_tenure_months !== null
                ? `${newJoinerAnalytics.avg_tenure_months}m`
                : '—'}
            </strong>
          </span>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton className="h-[200px] w-full rounded-lg flex-1" />
      ) : processedTrends.length > 0 ? (
        <div className="h-[200px] w-full flex-1">
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={processedTrends} margin={{ top: 12, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="njGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6F3DBA" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6F3DBA" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
              <XAxis
                dataKey="label"
                stroke={palette.axisText}
                fontSize={9}
                interval={xInterval}
                tickLine={false}
              />
              <YAxis
                stroke={palette.axisText}
                fontSize={9}
                domain={[yMin, yMax]}
                unit="%"
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="display_pct"
                name="Attendance %"
                stroke="#6F3DBA"
                strokeWidth={2.2}
                fill="url(#njGradient)"
                dot={false}
                activeDot={{ r: 4, stroke: '#6F3DBA', strokeWidth: 1.5, fill: '#ffffff' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[200px] flex-1 flex items-center justify-center px-2">
          <EmptyState
            icon={BarChart2}
            title="No data available"
            description="No new joiner attendance records found for this period."
          />
        </div>
      )}
    </Card>
  );
}
