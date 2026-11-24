import { Clock } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const DEFAULT_DOWNTIME_DATA = [
  { shift: 'GS1', label: 'General Shift', downtime: 4860 },
  { shift: 'S2', label: 'Second Shift', downtime: 4320 },
  { shift: 'NS3', label: 'Night Shift', downtime: 4970 },
];

export function ShiftDowntimeCard({
  data = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawShifts = !error ? (data?.items ?? []) : [];
  let chartData = [...DEFAULT_DOWNTIME_DATA];

  if (rawShifts.length > 0) {
    const shiftCodeMap = { A: 'GS1', B: 'S2', C: 'NS3' };
    chartData = rawShifts.map((s) => ({
      shift: shiftCodeMap[s.shift_id] || s.shift_id,
      label: `Shift ${s.shift_id}`,
      downtime: s.downtime_min,
    }));
  }

  const totalDowntime = chartData.reduce((acc, curr) => acc + curr.downtime, 0);

  return (
    <Card className="p-4 lg:col-span-3 flex flex-col justify-between min-h-[250px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 shrink-0 text-blue-500" aria-hidden="true" />
            <h2 className="text-[12px] sm:text-[13px] font-bold whitespace-nowrap">
              Shift-wise Downtime
            </h2>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-40 w-full rounded-lg" />
        ) : (
          <div className="h-40 w-full my-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                barSize={32}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={palette.grid}
                />
                <XAxis
                  dataKey="shift"
                  stroke={palette.axis}
                  tick={{ fill: palette.text, fontSize: 10, fontWeight: 600 }}
                  axisLine={{ stroke: palette.grid }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 6000]}
                  ticks={[0, 2000, 4000, 6000]}
                  stroke={palette.axis}
                  tick={{ fill: palette.text, fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => (val === 0 ? '0' : `${val / 1000}K`)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val) => [`${val.toLocaleString()} mins`, 'Downtime']}
                />
                <Bar
                  dataKey="downtime"
                  fill="#38BDF8"
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    dataKey="downtime"
                    position="top"
                    formatter={(val) => val.toLocaleString()}
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      fill: 'var(--text)',
                    }}
                  />
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-dt-${index}`}
                      fill="#38BDF8"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--secondary)]">
        <span>Average Shift Downtime</span>
        <span className="font-bold text-[var(--text)]">
          {Math.round(totalDowntime / (chartData.length || 1)).toLocaleString()} mins
        </span>
      </div>
    </Card>
  );
}

