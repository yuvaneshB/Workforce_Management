import { Factory } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function ProductionPerformance({
  shiftEfficiencyAnalytics = null,
  teamProductionAnalytics = null,
  loading = false,
  compact = false,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const hasData = Boolean(shiftEfficiencyAnalytics || teamProductionAnalytics);

  const totalTarget =
    shiftEfficiencyAnalytics?.total_target_qty ??
    teamProductionAnalytics?.total_target_qty ??
    0;
  const totalActual =
    shiftEfficiencyAnalytics?.total_actual_qty ??
    teamProductionAnalytics?.total_actual_qty ??
    0;
  const variance = totalActual - totalTarget;

  // Compact number formatter splitting value and unit
  const formatCompactNum = (num) => {
    if (num == null) return { value: '—', unit: '' };
    const abs = Math.abs(num);
    const sign = num < 0 ? '-' : '';
    if (abs >= 1000000) {
      return { value: `${sign}${(abs / 1000000).toFixed(1)}M`, unit: 'units' };
    }
    if (abs >= 1000) {
      return { value: `${sign}${(abs / 1000).toFixed(1)}K`, unit: 'units' };
    }
    return { value: `${sign}${abs.toLocaleString()}`, unit: 'units' };
  };

  const targetObj = hasData ? formatCompactNum(totalTarget) : { value: '—', unit: '' };
  const actualObj = hasData ? formatCompactNum(totalActual) : { value: '—', unit: '' };
  const varianceObj = hasData ? formatCompactNum(variance) : { value: '—', unit: '' };

  // Shift-wise Target vs Actual
  const shiftItems = shiftEfficiencyAnalytics?.items || [];
  const shiftData =
    shiftItems.length > 0
      ? shiftItems.map((item) => {
          const sMap = { A: 'Morning GS1', B: 'Evening S2', C: 'Night NS3' };
          return {
            name: sMap[(item.shift_id || '').toUpperCase()] || item.shift_name || `Shift ${item.shift_id}`,
            target: item.target_qty,
            actual: item.actual_qty,
            pct: item.production_achievement_pct != null ? `${item.production_achievement_pct.toFixed(1)}%` : '—',
          };
        })
      : [];

  const formatProductionYAxis = (v) => {
    if (v === 0) return '0';
    if (v >= 1000000) {
      const m = v / 1000000;
      return m % 1 === 0 ? `${m}M` : `${m.toFixed(1)}M`;
    }
    if (v >= 1000) {
      const k = v / 1000;
      return k % 1 === 0 ? `${k}K` : `${k.toFixed(0)}K`;
    }
    return `${v}`;
  };

  return (
    <div className="surface rounded-2xl p-4 sm:p-5 border border-[var(--border)] shadow-xs flex flex-col h-full min-h-0">
      {/* Header: Icon + title on one line, same height */}
      <div className="h-8 flex items-center gap-2 mb-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center shrink-0">
          <Factory className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight whitespace-nowrap">
          Production Performance
        </h3>
      </div>

      {/* Top Metric Tiles: 3 tiles, equal width, equal height (h-20) */}
      <div className="grid grid-cols-3 gap-2.5 mb-3 shrink-0">
        <div
          title={hasData ? `${totalTarget.toLocaleString()} units` : undefined}
          className="h-20 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex flex-col justify-between min-w-0"
        >
          <span className="text-xs font-bold leading-snug text-blue-700 dark:text-blue-300">
            Target Output
          </span>
          <div className="flex items-baseline gap-1 whitespace-nowrap mt-auto">
            <span className="text-xl font-bold text-blue-900 dark:text-blue-100 tabular-nums leading-none">
              {targetObj.value}
            </span>
            {targetObj.unit && (
              <span className="text-xs font-medium text-[var(--secondary)] opacity-80 leading-none">
                {targetObj.unit}
              </span>
            )}
          </div>
        </div>

        <div
          title={hasData ? `${totalActual.toLocaleString()} units` : undefined}
          className="h-20 p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex flex-col justify-between min-w-0"
        >
          <span className="text-xs font-bold leading-snug text-purple-700 dark:text-purple-300">
            Actual Output
          </span>
          <div className="flex items-baseline gap-1 whitespace-nowrap mt-auto">
            <span className="text-xl font-bold text-purple-900 dark:text-purple-100 tabular-nums leading-none">
              {actualObj.value}
            </span>
            {actualObj.unit && (
              <span className="text-xs font-medium text-[var(--secondary)] opacity-80 leading-none">
                {actualObj.unit}
              </span>
            )}
          </div>
        </div>

        <div
          title={hasData ? `${variance < 0 ? '' : '+'}${variance.toLocaleString()} units` : undefined}
          className="h-20 p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col justify-between min-w-0"
        >
          <span className="text-xs font-bold leading-snug text-emerald-700 dark:text-emerald-300">
            Variance
          </span>
          <div className="flex items-baseline gap-1 whitespace-nowrap mt-auto">
            <span className="text-xl font-bold text-emerald-900 dark:text-emerald-100 tabular-nums leading-none">
              {varianceObj.value}
            </span>
            {varianceObj.unit && (
              <span className="text-xs font-medium text-[var(--secondary)] opacity-80 leading-none">
                {varianceObj.unit}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Shift-wise Target vs Actual Bar Chart Area (height: 240px) */}
      {loading && (!hasData || shiftData.length === 0) ? (
        <div className="flex-1 w-full min-h-[240px] flex items-center justify-center">
          <LoadingSkeleton className="h-56 w-full rounded-xl" />
        </div>
      ) : !hasData || shiftData.length === 0 ? (
        <div className="flex-1 w-full min-h-[240px] flex flex-col items-center justify-center text-center p-3 text-[var(--secondary)]">
          <Factory className="w-5 h-5 mb-1 text-[var(--secondary)]/50" />
          <span className="text-xs font-semibold">No production performance data</span>
          <span className="text-[10px]">Connect backend to view shift output targets</span>
        </div>
      ) : (
        <div className="flex-1 w-full min-h-[240px] flex flex-col justify-end">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={shiftData}
              margin={{ top: 10, right: 12, left: -14, bottom: 4 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: palette.axisText, fontSize: 10, fontWeight: 600 }}
                tickLine={false}
                axisLine={{ stroke: palette.grid }}
                interval={0}
              />
              <YAxis
                tickFormatter={formatProductionYAxis}
                tick={{ fill: palette.axisText, fontSize: 10, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div
                      className="p-2.5 rounded-xl shadow-lg border text-xs"
                      style={{
                        backgroundColor: palette.tooltipBg,
                        borderColor: palette.tooltipBorder,
                        color: palette.tooltipText,
                      }}
                    >
                      <div className="font-extrabold text-[11.5px] mb-1.5">{label}</div>
                      {payload.map((entry) => (
                        <div key={entry.dataKey} className="flex items-center justify-between gap-4 py-0.5">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-[var(--secondary)]">{entry.name}:</span>
                          </span>
                          <span className="font-bold">{entry.value.toLocaleString()} units</span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                verticalAlign="bottom"
                align="center"
                wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
                iconType="circle"
                iconSize={8}
              />
              <Bar
                dataKey="actual"
                name="Actual Achieved"
                fill="#493287"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
              <Bar
                dataKey="target"
                name="Target Output"
                fill="#4D8EEB"
                radius={[4, 4, 0, 0]}
                maxBarSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default ProductionPerformance;
