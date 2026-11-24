import { Clock, TrendingDown } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const MONTHLY_DOWNTIME = [
  { month: 'Aug', mins: 3620 },
  { month: 'Sep', mins: 4125 },
  { month: 'Oct', mins: 3980 },
];

export function DowntimeAnalysisCard({
  data = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const totalDowntime = !error ? (data?.total_downtime_min ?? 14150) : 14150;

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col justify-between min-h-[260px]">
      <div>
        <div className="flex items-center gap-2 mb-2 min-w-0">
          <Clock className="w-4 h-4 shrink-0 text-[#F97316]" aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Downtime Analysis</h2>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : (
          <div className="flex items-center justify-between gap-3 my-1">
            {/* Bar Chart */}
            <div className="w-[58%] h-44">
              <ResponsiveContainer width="100%" height={176}>
                <BarChart data={MONTHLY_DOWNTIME} margin={{ top: 15, right: 10, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                  <XAxis
                    dataKey="month"
                    stroke={palette.axisText}
                    fontSize={10}
                    tickLine={false}
                  />
                  <YAxis
                    stroke={palette.axisText}
                    fontSize={9}
                    tickFormatter={(val) => `${val / 1000}K`}
                    domain={[0, 5000]}
                    ticks={[0, 1000, 2000, 3000, 4000, 5000]}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: palette.tooltipBg,
                      borderColor: palette.tooltipBorder,
                      color: palette.tooltipText,
                      fontSize: '11px',
                      borderRadius: '8px',
                    }}
                    formatter={(val) => [`${val.toLocaleString()} mins`, 'Downtime Duration']}
                  />
                  <Bar dataKey="mins" name="Downtime" fill="#4D8EEB" radius={[4, 4, 0, 0]} barSize={26} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Total Callout Box */}
            <div className="w-[42%] bg-[var(--muted-fill)]/60 rounded-xl p-3 border border-[var(--border)] flex flex-col justify-center items-start">
              <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-[#F97316] flex items-center justify-center mb-2">
                <Clock className="w-4 h-4" />
              </div>
              <div className="text-[10px] font-semibold text-[var(--secondary)]">
                Total Downtime
              </div>
              <div className="text-base font-black text-[var(--text)] my-0.5">
                {totalDowntime.toLocaleString()} mins
              </div>
              <div className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 mt-1">
                <TrendingDown className="w-3 h-3" />
                <span>-3.4% vs previous period</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

