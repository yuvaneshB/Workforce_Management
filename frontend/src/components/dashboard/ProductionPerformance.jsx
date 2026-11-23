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

export function ProductionPerformance({
  shiftEfficiencyAnalytics = null,
  teamProductionAnalytics = null,
  loading = false,
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
  const achievementPct =
    shiftEfficiencyAnalytics?.overall_achievement_pct != null
      ? shiftEfficiencyAnalytics.overall_achievement_pct
      : totalTarget > 0
      ? Number(((totalActual / totalTarget) * 100).toFixed(1))
      : 0;

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

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
              <Factory className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                Production Performance (Target vs Actual)
              </h3>
              <p className="text-[11px] text-[var(--secondary)]">
                Manufacturing output targets vs actual throughput achieved
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[var(--secondary)]">Overall Achievement:</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-black text-xs border border-emerald-200">
              {hasData ? `${achievementPct.toFixed(1)}%` : '—'}
            </span>
          </div>
        </div>

        {/* Top Summary Bar */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
          <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--border)]">
            <span className="text-[10px] font-bold text-[var(--secondary)] block">Target Output</span>
            <span className="text-sm font-black text-[var(--text)]">{hasData ? `${totalTarget.toLocaleString()} units` : '—'}</span>
          </div>
          <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 block">Actual Output</span>
            <span className="text-sm font-black text-purple-900 dark:text-purple-200">{hasData ? `${totalActual.toLocaleString()} units` : '—'}</span>
          </div>
          <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 block">Variance</span>
            <span className="text-sm font-black text-emerald-900 dark:text-emerald-200">
              {hasData ? `-${(totalTarget - totalActual).toLocaleString()} units` : '—'}
            </span>
          </div>
        </div>

        {/* Shift-wise Target vs Actual Bar Chart */}
        {!hasData || shiftData.length === 0 ? (
          <div className="w-full h-[160px] flex flex-col items-center justify-center text-center p-3 text-[var(--secondary)]">
            <Factory className="w-6 h-6 mb-1 text-[var(--secondary)]/50" />
            <span className="text-xs font-semibold">No production performance data</span>
            <span className="text-[10px]">Connect backend to view shift output targets</span>
          </div>
        ) : (
          <div className="w-full h-[160px]">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={shiftData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: palette.axisText, fontSize: 10, fontWeight: 600 }}
                  tickLine={false}
                  axisLine={{ stroke: palette.grid }}
                />
                <YAxis
                  tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  tick={{ fill: palette.axisText, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div
                        className="p-2.5 rounded-xl shadow-md border text-xs"
                        style={{
                          backgroundColor: palette.tooltipBg,
                          borderColor: palette.tooltipBorder,
                          color: palette.tooltipText,
                        }}
                      >
                        <div className="font-extrabold mb-1">{label}</div>
                        {payload.map((entry) => (
                          <div key={entry.dataKey} className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            <span className="text-[var(--secondary)]">{entry.name}:</span>
                            <span className="font-bold">{entry.value.toLocaleString()} units</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                  iconType="circle"
                  iconSize={8}
                />
                <Bar dataKey="target" name="Target Output" fill="#4D8EEB" radius={[3, 3, 0, 0]} />
                <Bar dataKey="actual" name="Actual Achieved" fill="#6F3DBA" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] text-[10px] text-[var(--secondary)] flex items-center justify-between">
        <span>Good production quality rate is maintained above 98.4%.</span>
        <span className="font-bold text-[var(--text)]">Downtime: 240 mins</span>
      </div>
    </div>
  );
}
