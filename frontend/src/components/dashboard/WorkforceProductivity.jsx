import { Zap } from 'lucide-react';
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
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function WorkforceProductivity({
  shiftEfficiencyAnalytics = null,
  teamProductionAnalytics = null,
  loading = false,
  compact = false,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const hasData = Boolean(shiftEfficiencyAnalytics);

  // Shift-wise productivity
  const shiftItems = shiftEfficiencyAnalytics?.items || [];
  const sMap = { A: 'Morning GS1', B: 'Evening S2', C: 'Night NS3' };
  const shiftProductivity = ['A', 'B', 'C'].map((shiftKey) => {
    const item = shiftItems.find((s) => (s.shift_id || '').toUpperCase() === shiftKey);
    if (!item) {
      return {
        name: sMap[shiftKey],
        prodPerWorker: 0,
        present: 0,
        actual: 0,
        hasRecord: false,
      };
    }
    const prodPerWorker =
      item.production_per_present_employee != null
        ? item.production_per_present_employee
        : item.present_employees > 0
        ? Number((item.actual_qty / item.present_employees).toFixed(1))
        : 0;

    return {
      name: sMap[shiftKey],
      prodPerWorker,
      present: item.present_employees || 0,
      actual: item.actual_qty || 0,
      hasRecord: true,
    };
  });

  // Productivity trend across weeks
  const trendData =
    shiftEfficiencyAnalytics?.weekly_trend && shiftEfficiencyAnalytics.weekly_trend.length > 0
      ? shiftEfficiencyAnalytics.weekly_trend
      : [];

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      {/* Header: Icon + title on ONE line */}
      <div className="flex items-center gap-2 mb-3 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight whitespace-nowrap">
          Workforce Productivity
        </h3>
      </div>

      {/* Shift Productivity Comparison Tiles: 3 tiles, equal width & height */}
      <div className="grid grid-cols-3 gap-2 mb-3 shrink-0">
        {shiftProductivity.map((s) => (
          <div
            key={s.name}
            title={s.hasRecord ? `${s.name}: ${s.prodPerWorker.toFixed(1)} u/w (${(s.present || 0).toLocaleString()} present)` : undefined}
            className="h-[68px] p-2.5 rounded-xl border border-[var(--border)] surface flex flex-col justify-between min-w-0"
          >
            <span className="text-[10px] sm:text-[11px] font-bold text-[var(--secondary)] block truncate leading-tight">
              {s.name}
            </span>
            <div className="text-sm sm:text-base lg:text-lg font-black text-[var(--text)] tabular-nums whitespace-nowrap leading-none mt-auto">
              {s.hasRecord ? (
                <>
                  {s.prodPerWorker.toFixed(1)}{' '}
                  <span className="text-[10px] sm:text-[11px] font-semibold text-[var(--secondary)]">u/w</span>
                </>
              ) : (
                '—'
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Productivity Trend Mini Area Chart */}
      {loading && trendData.length === 0 ? (
        <div className="flex-1 w-full min-h-[175px] flex items-center justify-center">
          <LoadingSkeleton className="h-40 w-full rounded-xl" />
        </div>
      ) : trendData.length === 0 ? (
        <div className="flex-1 w-full min-h-[175px] flex flex-col items-center justify-center text-center p-3 text-[var(--secondary)]">
          <Zap className="w-5 h-5 mb-1 text-[var(--secondary)]/50" />
          <span className="text-xs font-semibold">No productivity data</span>
          <span className="text-[10px]">No records match the current filter selection</span>
        </div>
      ) : (
        <div className="flex-1 w-full min-h-[175px] flex flex-col justify-end">
          <ResponsiveContainer width="100%" height={175}>
            <AreaChart data={trendData} margin={{ top: 10, right: 12, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="prodGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#493287" stopOpacity={0.28} />
                  <stop offset="95%" stopColor="#493287" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fill: palette.axisText, fontSize: 10, fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: palette.grid }}
              />
              <YAxis
                domain={['auto', 'auto']}
                tick={{ fill: palette.axisText, fontSize: 10, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload;
                  if (!item) return null;
                  return (
                    <div
                      className="p-2.5 rounded-xl shadow-lg border text-xs"
                      style={{
                        backgroundColor: palette.tooltipBg,
                        borderColor: palette.tooltipBorder,
                        color: palette.tooltipText,
                      }}
                    >
                      <div className="font-extrabold text-[11.5px] mb-1">{label}</div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#493287]" />
                        <span className="text-[var(--secondary)]">Throughput:</span>
                        <span className="font-bold">{item.productivity} units / emp</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="productivity"
                stroke="#493287"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#prodGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default WorkforceProductivity;
