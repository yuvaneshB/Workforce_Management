import { UserMinus } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ATTRITION_MONTHLY_TREND } from '../../data/attritionData';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';

export function AttritionTrendChart({
  selectedPeriod = 'monthly',
  attritionAnalytics = null,
  loading = false,
  hasData = false,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const chartData =
    attritionAnalytics?.monthly_trend && attritionAnalytics.monthly_trend.length > 0
      ? attritionAnalytics.monthly_trend.map((pt) => ({
          month: pt.label || pt.month,
          permanentAttrition: pt.permanent_exits,
          vendorAttrition: pt.vendor_exits,
          totalExits: pt.total_exits,
        }))
      : [];

  const totalExits =
    attritionAnalytics?.summary?.total_exits != null
      ? attritionAnalytics.summary.total_exits
      : 0;

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--rose-soft)] text-rose-600 flex items-center justify-center">
              <UserMinus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                Employee Attrition Trend
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-[var(--secondary)]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4D8EEB]" />
              <span className="text-[11px]">Permanent</span>
            </span>
            <span className="flex items-center gap-1.5 text-[var(--secondary)]">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F58A3A]" />
              <span className="text-[11px]">Vendor</span>
            </span>
          </div>
        </div>

        {/* Line Chart */}
        {chartData.length === 0 ? (
          <div className="w-full h-[180px] flex flex-col items-center justify-center text-center p-4 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <UserMinus className="w-6 h-6 text-slate-400 mb-2 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Attrition Trend Data</p>
            <p className="text-[11px] text-[var(--secondary)] mt-0.5">
              No attrition records match the current filter selection.
            </p>
          </div>
        ) : (
          <div className="w-full h-[180px]">
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={chartData} margin={{ top: 8, right: 12, left: -20, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fill: palette.axisText, fontSize: 10, fontWeight: 500 }}
                tickLine={false}
                axisLine={{ stroke: palette.grid }}
              />
              <YAxis
                domain={[0, (dataMax) => (dataMax > 0 ? Math.ceil(dataMax * 1.2) : 10)]}
                tick={{ fill: palette.axisText, fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload;
                  return (
                    <div
                      className="p-2.5 rounded-xl shadow-lg border text-xs space-y-1"
                      style={{
                        backgroundColor: palette.tooltipBg,
                        borderColor: palette.tooltipBorder,
                        color: palette.tooltipText,
                      }}
                    >
                      <div className="font-bold text-[11px] pb-1 border-b border-[var(--border)]">
                        {label}
                      </div>
                      <div className="flex justify-between gap-4 text-[11px]">
                        <span>Permanent Attrition:</span>
                        <span className="font-bold">{item.permanentAttrition}</span>
                      </div>
                      <div className="flex justify-between gap-4 text-[11px]">
                        <span>Vendor Attrition:</span>
                        <span className="font-bold">{item.vendorAttrition}</span>
                      </div>
                      <div className="flex justify-between gap-4 text-[11px] pt-1 border-t border-[var(--border)] font-black">
                        <span>Total Monthly Exits:</span>
                        <span>{item.totalExits}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="permanentAttrition"
                name="Permanent Staff"
                stroke="#4D8EEB"
                strokeWidth={2}
                dot={{ r: 3, fill: '#4D8EEB' }}
              />
              <Line
                type="monotone"
                dataKey="vendorAttrition"
                name="Vendor Contract"
                stroke="#F58A3A"
                strokeWidth={2}
                dot={{ r: 3, fill: '#F58A3A' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] text-[10px] text-[var(--secondary)] flex items-center justify-between">
        <span>
          {hasData
            ? 'No historical attrition detected in active records. Retention rate: 100%.'
            : 'No telemetry connection.'}
        </span>
        <span className={`font-bold ${hasData ? 'text-emerald-600' : 'text-slate-400'}`}>
          {hasData ? 'Zero Exits' : 'No Data'}
        </span>
      </div>
    </div>
  );
}
