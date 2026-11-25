import { AlertCircle, Factory, RefreshCw } from 'lucide-react';
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
import { LoadingSkeleton } from '../common/LoadingSkeleton';

function formatK(val) {
  if (typeof val !== 'number') return '0';
  if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `${Math.round(val / 1000)}K`;
  return String(val);
}

export function ProductionOverviewCard({
  shiftEfficiencyAnalytics = null,
  teamProductionAnalytics = null,
  loading = false,
  error = null,
  onRetry = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const SHIFT_NAMES = { A: 'GS1', B: 'S2', C: 'NS3' };
  const shiftItems = !error ? (shiftEfficiencyAnalytics?.items ?? []) : [];

  const chartData = shiftItems
    .filter((item) => item && (item.target_qty != null || item.actual_qty != null))
    .map((item) => {
      const key = (item.shift_id || '').toUpperCase();
      return {
        key,
        name: SHIFT_NAMES[key] || item.shift_id || 'Shift',
        target: item.target_qty ?? 0,
        actual: item.actual_qty ?? 0,
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));

  const overallAchievement = !error
    ? typeof shiftEfficiencyAnalytics?.overall_achievement_pct === 'number'
      ? shiftEfficiencyAnalytics.overall_achievement_pct.toFixed(1)
      : typeof teamProductionAnalytics?.overall_achievement_pct === 'number'
      ? teamProductionAnalytics.overall_achievement_pct.toFixed(1)
      : null
    : null;

  // SVG circular gauge math
  const pctNum = overallAchievement !== null ? parseFloat(overallAchievement) : 0;
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pctNum / 100) * circumference;

  return (
    <div className="surface rounded-2xl p-4.5 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      {/* Card Header & Legends */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
            <Factory className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
            Production Performance
          </h2>
        </div>

        {/* Legend dots */}
        <div className="flex items-center gap-3 text-xs font-semibold">
          <span className="flex items-center gap-1.5 text-[var(--secondary)]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#96A1C7] dark:bg-[#6775A8]" />
            <span className="text-[11px]">Target</span>
          </span>
          <span className="flex items-center gap-1.5 text-[var(--secondary)]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#493287] dark:bg-[#8295E8]" />
            <span className="text-[11px]">Actual</span>
          </span>
        </div>
      </div>

      {/* Card Body: Grouped Bar Chart on Left, Circular Achievement on Right */}
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
      ) : chartData.length > 0 ? (
        <div className="flex flex-col sm:flex-row items-center gap-2 h-52">
          {/* Bar Chart Area */}
          <div className="flex-1 h-full w-full">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart
                data={chartData}
                margin={{ top: 22, right: 12, left: -14, bottom: 0 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke={palette.axisText}
                  fontSize={11}
                  fontWeight="bold"
                  tickLine={false}
                />
                <YAxis
                  stroke={palette.axisText}
                  fontSize={10}
                  domain={[0, 'auto']}
                  tickFormatter={formatK}
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
                  formatter={(val, name) => [val.toLocaleString(), name]}
                />
                <Bar
                  dataKey="target"
                  name="Target"
                  fill={theme === 'dark' ? '#6775A8' : '#96A1C7'}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="target"
                    position="top"
                    formatter={formatK}
                    fontSize={10}
                    fontWeight="bold"
                    fill={theme === 'dark' ? '#DFE6F4' : '#1F2F59'}
                    offset={5}
                  />
                </Bar>
                <Bar
                  dataKey="actual"
                  name="Actual"
                  fill={theme === 'dark' ? '#8295E8' : '#493287'}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                  isAnimationActive={false}
                >
                  <LabelList
                    dataKey="actual"
                    position="top"
                    formatter={formatK}
                    fontSize={10}
                    fontWeight="bold"
                    fill={theme === 'dark' ? '#DFE6F4' : '#1F2F59'}
                    offset={5}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Circular Progress Gauge Indicator */}
          <div className="flex flex-col items-center justify-center shrink-0 w-36 py-1">
            <div className="relative w-28 h-28 flex items-center justify-center">
              <svg className="w-28 h-28 transform -rotate-90" viewBox="0 0 120 120">
                {/* Background track */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="9"
                  fill="transparent"
                  className="text-slate-100 dark:text-slate-800"
                />
                {/* Active progress stroke */}
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  stroke={theme === 'dark' ? '#8295E8' : '#493287'}
                  strokeWidth="9"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-700 ease-out"
                />
              </svg>

              {/* Center Value */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[21px] font-black text-[var(--text)] tracking-tight leading-none">
                  {overallAchievement !== null ? `${overallAchievement}%` : '—'}
                </span>
                <span className="text-[10px] font-semibold text-[var(--secondary)] mt-1">
                  Achievement
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-52 flex items-center justify-center text-[var(--secondary)] text-xs">
          No production performance data available
        </div>
      )}
    </div>
  );
}
