import { Activity } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
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

export function ShiftAttendanceThroughputCard({
  data = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawShifts = !error ? (data?.items ?? []) : [];
  let chartData = [];

  if (rawShifts.length > 0) {
    const shiftCodeMap = { A: 'GS1', B: 'S2', C: 'NS3' };
    chartData = rawShifts.map((s) => ({
      shift: shiftCodeMap[s.shift_id] || s.shift_id,
      attendance_pct: s.attendance_pct || 0,
      throughput: s.production_per_present_employee || 0,
    }));
  }

  return (
    <Card className="p-4 lg:col-span-3 flex flex-col justify-between min-h-[250px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Activity className="w-4 h-4 shrink-0 text-[#0E9C86]" aria-hidden="true" />
            <h2 className="text-[12px] sm:text-[13px] font-bold whitespace-nowrap">
              Shift Attendance &amp; Throughput Rate
            </h2>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-40 w-full rounded-lg" />
        ) : chartData.length === 0 ? (
          <div className="h-40 w-full my-1 flex flex-col items-center justify-center text-center p-3 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <Activity className="w-5 h-5 text-slate-400 mb-1 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Shift Performance Data</p>
            <p className="text-[10px] text-[var(--secondary)] mt-0.5">
              Connect to FastAPI backend to view live shift throughput.
            </p>
          </div>
        ) : (
          <div className="h-40 w-full my-1">
            <ResponsiveContainer width="100%" height={160}>
              <ComposedChart data={chartData} margin={{ top: 15, right: 10, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis
                  dataKey="shift"
                  stroke={palette.axisText}
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="left"
                  stroke={palette.axisText}
                  fontSize={8}
                  domain={[80, 100]}
                  ticks={[80, 85, 90, 95, 100]}
                  unit="%"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={palette.axisText}
                  fontSize={8}
                  domain={[140, 180]}
                  ticks={[140, 150, 160, 170, 180]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val, name) => [
                    name === 'Attendance Rate' ? `${val}%` : `${val} units`,
                    name,
                  ]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="attendance_pct"
                  name="Attendance Rate"
                  fill="#34D399"
                  radius={[3, 3, 0, 0]}
                  barSize={32}
                >
                  <LabelList
                    dataKey="attendance_pct"
                    position="top"
                    formatter={(val) => `${val}%`}
                    style={{ fontSize: '9px', fontWeight: 800, fill: 'var(--text)' }}
                  />
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="throughput"
                  name="Throughput / Present"
                  stroke="#493287"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#493287' }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 pt-2 border-t border-[var(--border)] text-[9px]">
        <span className="flex items-center gap-1 font-bold text-[var(--text)]">
          <span className="w-2 h-2 rounded-sm bg-[#34D399]" /> Attendance Rate
        </span>
        <span className="flex items-center gap-1 font-bold text-[var(--text)]">
          <span className="w-2 h-2 rounded-full bg-[#493287]" /> Throughput / Present (units)
        </span>
      </div>
    </Card>
  );
}

