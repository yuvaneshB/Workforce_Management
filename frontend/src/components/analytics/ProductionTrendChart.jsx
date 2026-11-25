import { TrendingUp } from 'lucide-react';
import { useState } from 'react';
import {
  Area,
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
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const PERIODS = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];

// Production Trend points from actual operational date range (Aug 1 - Oct 31, 2026)
const DAILY_TREND_DATA = [
  { date: 'Aug 01', actual: 165000, target: 195000 },
  { date: 'Aug 10', actual: 182000, target: 210000 },
  { date: 'Aug 20', actual: 178000, target: 215000 },
  { date: 'Sep 01', actual: 160000, target: 198000 },
  { date: 'Sep 10', actual: 185000, target: 220000 },
  { date: 'Sep 20', actual: 195000, target: 230000 },
  { date: 'Oct 01', actual: 205000, target: 235000 },
  { date: 'Oct 10', actual: 180000, target: 215000 },
  { date: 'Oct 20', actual: 192000, target: 225000 },
  { date: 'Oct 31', actual: 220000, target: 255000 },
];

const WEEKLY_TREND_DATA = [
  { date: 'W31', actual: 540000, target: 650000 },
  { date: 'W33', actual: 580000, target: 690000 },
  { date: 'W35', actual: 560000, target: 680000 },
  { date: 'W37', actual: 610000, target: 730000 },
  { date: 'W39', actual: 630000, target: 750000 },
  { date: 'W41', actual: 590000, target: 710000 },
  { date: 'W43', actual: 650000, target: 780000 },
];

const MONTHLY_TREND_DATA = [
  { date: 'Aug 2026', actual: 785000, target: 945000 },
  { date: 'Sep 2026', actual: 805000, target: 968000 },
  { date: 'Oct 2026', actual: 834184, target: 1001560 },
];

export function ProductionTrendChart({
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;
  const [period, setPeriod] = useState('daily');

  const hasData = !error;
  const chartData = !hasData
    ? []
    : period === 'weekly'
    ? WEEKLY_TREND_DATA
    : period === 'monthly'
    ? MONTHLY_TREND_DATA
    : DAILY_TREND_DATA;

  return (
    <Card className="p-4 lg:col-span-6 flex flex-col justify-between min-h-[260px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="w-4 h-4 shrink-0 text-[#493287]" aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Production Trend</h2>
          </div>

          {/* Granularity Toggle */}
          <div
            className="inline-flex rounded-lg border p-0.5 shrink-0"
            style={{ borderColor: 'var(--border)', background: 'var(--brand-bg)' }}
            role="group"
            aria-label="Production trend period"
          >
            {PERIODS.map((p) => {
              const active = period === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPeriod(p.id)}
                  className="px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer"
                  style={
                    active
                      ? { background: '#493287', color: '#FFFFFF' }
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
        ) : !hasData || chartData.length === 0 ? (
          <div className="h-44 w-full my-1 flex flex-col items-center justify-center text-center p-4 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <TrendingUp className="w-6 h-6 text-slate-400 mb-2 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Production Trend Data</p>
            <p className="text-[11px] text-[var(--secondary)] mt-0.5">
              Connect to FastAPI backend to view live production trends.
            </p>
          </div>
        ) : (
          <div className="h-44 w-full my-1">
            <ResponsiveContainer width="100%" height={176}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="actualProdGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4D8EEB" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4D8EEB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis
                  dataKey="date"
                  stroke={palette.axisText}
                  fontSize={9}
                  tickLine={false}
                />
                <YAxis
                  stroke={palette.axisText}
                  fontSize={9}
                  tickFormatter={(val) => `${val / 1000}K`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val, name) => [`${val.toLocaleString()} units`, name]}
                />
                <Area
                  type="monotone"
                  dataKey="actual"
                  name="Actual Production"
                  stroke="#4D8EEB"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#actualProdGrad)"
                />
                <Line
                  type="monotone"
                  dataKey="target"
                  name="Target Production"
                  stroke="#1F2F59"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#1F2F59' }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Legend matching reference image */}
      <div className="flex items-center justify-center gap-6 pt-2 border-t border-[var(--border)] text-[10px]">
        <span className="flex items-center gap-1.5 font-bold text-[var(--text)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#4D8EEB]" />
          Actual Production
        </span>
        <span className="flex items-center gap-1.5 font-bold text-[var(--text)]">
          <span className="w-2.5 h-2.5 rounded-full bg-[#1F2F59]" />
          Target Production
        </span>
      </div>
    </Card>
  );
}

