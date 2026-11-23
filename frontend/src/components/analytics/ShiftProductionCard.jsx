import { Zap } from 'lucide-react';
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

const SHIFT_PROD_DATA = [
  { shift: 'Morning', shift_id: 'A', actual: 820000, target: 950000, achievement: 86.3 },
  { shift: 'Evening', shift_id: 'B', actual: 810000, target: 970000, achievement: 83.5 },
  { shift: 'Night', shift_id: 'C', actual: 794184, target: 994560, achievement: 79.8 },
];

export function ShiftProductionCard({
  production = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawShifts = !error ? (production?.by_shift ?? []) : [];
  let chartData = [...SHIFT_PROD_DATA];

  if (rawShifts.length > 0) {
    chartData = SHIFT_PROD_DATA.map((def) => {
      const match = rawShifts.find((s) => s.shift_id === def.shift_id);
      if (match) {
        const actual = match.actual_qty || def.actual;
        const target = match.target_qty || def.target;
        const achievement = target > 0 ? Number(((actual / target) * 100).toFixed(1)) : def.achievement;
        return {
          ...def,
          actual,
          target,
          achievement,
        };
      }
      return def;
    });
  }

  return (
    <Card className="p-4 lg:col-span-3 flex flex-col justify-between min-h-[260px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Zap className="w-4 h-4 shrink-0 text-[#6F3DBA]" aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Shift-wise Production Performance</h2>
          </div>
          <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 shrink-0">
            3 Shifts
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : (
          <div className="h-44 w-full my-1">
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={chartData} margin={{ top: 22, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis
                  dataKey="shift"
                  stroke={palette.axisText}
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  stroke={palette.axisText}
                  fontSize={9}
                  tickFormatter={(val) => `${val / 1000}K`}
                  domain={[0, 1000000]}
                  ticks={[0, 250000, 500000, 750000, 1000000]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val, name, item) => [
                    `${val.toLocaleString()} units (${name})`,
                    `${item.payload.shift} (Achievement: ${item.payload.achievement}%)`,
                  ]}
                />
                <Bar dataKey="actual" name="Actual Production" fill="#4D8EEB" radius={[3, 3, 0, 0]} barSize={16} />
                <Bar dataKey="target" name="Target Production" fill="#DDD6FE" radius={[3, 3, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Shift Achievement Badges & Legend */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[9px]">
        {chartData.map((s) => (
          <span
            key={s.shift_id}
            className="px-1.5 py-0.5 rounded font-extrabold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
          >
            {s.shift}: {s.achievement}%
          </span>
        ))}
      </div>
    </Card>
  );
}

