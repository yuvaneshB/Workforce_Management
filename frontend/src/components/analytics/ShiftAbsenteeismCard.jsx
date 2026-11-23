import { UserX } from 'lucide-react';
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

const SHIFT_ABSENT_DATA = [
  { shift: 'GS1', rate: 3.6, count: 185 },
  { shift: 'S2', rate: 3.4, count: 181 },
  { shift: 'NS3', rate: 3.7, count: 188 },
];

export function ShiftAbsenteeismCard({
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
      rate: s.absenteeism_pct || 0,
      count: s.absent_employees || 0,
    }));
  }

  return (
    <Card className="p-4 lg:col-span-3 flex flex-col justify-between min-h-[250px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <UserX className="w-4 h-4 shrink-0 text-[#E45C72]" aria-hidden="true" />
            <h2 className="text-[12px] sm:text-[13px] font-bold whitespace-nowrap">
              Shift-wise Absenteeism
            </h2>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-40 w-full rounded-lg" />
        ) : chartData.length === 0 ? (
          <div className="h-40 w-full my-1 flex flex-col items-center justify-center text-center p-3 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <UserX className="w-5 h-5 text-slate-400 mb-1 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Shift Absenteeism Data</p>
            <p className="text-[10px] text-[var(--secondary)] mt-0.5">
              Connect to FastAPI backend to view live shift absenteeism.
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
                  domain={[0, 5]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  unit="%"
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={palette.axisText}
                  fontSize={8}
                  domain={[120, 200]}
                  ticks={[120, 140, 160, 180, 200]}
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
                    name === 'Absenteeism Rate' ? `${val}%` : `${val} staff`,
                    name,
                  ]}
                />
                <Bar
                  yAxisId="left"
                  dataKey="rate"
                  name="Absenteeism Rate"
                  fill="#A855F7"
                  radius={[3, 3, 0, 0]}
                  barSize={30}
                >
                  <LabelList
                    dataKey="rate"
                    position="top"
                    formatter={(val) => `${val}%`}
                    style={{ fontSize: '9px', fontWeight: 800, fill: 'var(--text)' }}
                  />
                </Bar>
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="count"
                  name="Absent Staff"
                  stroke="#E45C72"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#E45C72' }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 pt-2 border-t border-[var(--border)] text-[9px]">
        <span className="flex items-center gap-1 font-bold text-[var(--text)]">
          <span className="w-2 h-2 rounded-sm bg-[#A855F7]" /> Absenteeism Rate
        </span>
        <span className="flex items-center gap-1 font-bold text-[var(--text)]">
          <span className="w-2 h-2 rounded-full bg-[#E45C72]" /> Absent Staff
        </span>
      </div>
    </Card>
  );
}

