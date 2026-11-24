import { TrendingUp } from 'lucide-react';
import { useState } from 'react';
import {
  CartesianGrid,
  Legend,
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

export function AttritionTrendCard({ data = null, loading = false }) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;
  const [period, setPeriod] = useState('monthly');

  const baseData = Array.isArray(data) ? data : [];

  const chartData = baseData.map((item) => ({
    ...item,
    period: item.period || item.label || item.month,
    total: item.total != null ? item.total : (item.totalExits != null ? item.totalExits : item.total_exits ?? 0),
    permanent: item.permanent != null ? item.permanent : (item.permanentAttrition != null ? item.permanentAttrition : item.permanent_exits ?? 0),
    vendor: item.vendor != null ? item.vendor : (item.vendorAttrition != null ? item.vendorAttrition : item.vendor_exits ?? 0),
  }));

  return (
    <Card className="p-4 lg:col-span-7 flex flex-col justify-between min-h-[260px] border border-[var(--border)] shadow-xs">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <TrendingUp className="w-4 h-4 shrink-0 text-purple-600" aria-hidden="true" />
            <h2 className="text-[12px] sm:text-[13px] font-bold whitespace-nowrap text-[var(--text)]">
              Attrition Trend
            </h2>
          </div>

          {/* Timeframe Controls */}
          <div className="flex items-center gap-1 bg-[var(--surface-hover)] p-0.5 rounded-lg border border-[var(--border)] self-start sm:self-auto">
            {['monthly', 'weekly', 'daily'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold capitalize transition-colors cursor-pointer ${
                  period === p
                    ? 'bg-[#6F3DBA] text-white shadow-xs'
                    : 'text-[var(--secondary)] hover:text-[var(--text)]'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : !chartData || chartData.length === 0 ? (
          <div className="h-44 w-full my-1 flex flex-col items-center justify-center text-center p-4 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <TrendingUp className="w-6 h-6 text-emerald-500 mb-2 opacity-80" />
            <p className="text-xs font-bold text-[var(--text)]">Zero Employee Exits Recorded</p>
            <p className="text-[11px] text-[var(--secondary)] mt-0.5">
              100% workforce retention across all shifts and plants (0.0% attrition rate).
            </p>
          </div>
        ) : (
          <div className="h-44 w-full my-1">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 15, right: 15, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={palette.grid}
                />
                <XAxis
                  dataKey="period"
                  stroke={palette.axis}
                  tick={{ fill: palette.text, fontSize: 10, fontWeight: 600 }}
                  axisLine={{ stroke: palette.grid }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 15]}
                  ticks={[0, 3, 6, 9, 12, 15]}
                  stroke={palette.axis}
                  tick={{ fill: palette.text, fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: 'No. of Exits',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 28,
                    style: { fontSize: '9px', fill: 'var(--secondary)' },
                  }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val, name) => [`${val} exits`, name]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '10.5px', paddingTop: '4px' }}
                  iconSize={8}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  name="Total Exits"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#8B5CF6' }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="permanent"
                  name="Permanent"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#3B82F6' }}
                />
                <Line
                  type="monotone"
                  dataKey="vendor"
                  name="Vendor"
                  stroke="#F59E0B"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#F59E0B' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--secondary)]">
        <span>Exit Velocity Dynamics</span>
        <span className="font-bold text-purple-600">Peak Exits in September 2026</span>
      </div>
    </Card>
  );
}

