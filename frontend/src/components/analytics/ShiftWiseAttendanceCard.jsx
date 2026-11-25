import { TrendingUp } from 'lucide-react';
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

const SHIFT_DISPLAY = {
  A: { name: 'Morning', code: 'Shift A' },
  B: { name: 'Evening', code: 'Shift B' },
  C: { name: 'Night', code: 'Shift C' },
};

export function ShiftWiseAttendanceCard({
  attendance = null,
  selectedShiftId = '',
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawShifts = !error ? (attendance?.shift_breakdown ?? []) : [];

  const shiftNameMap = {
    A: 'Morning',
    B: 'Evening',
    C: 'Night',
  };

  const chartData = rawShifts.map((s) => ({
    shift_id: s.shift_id,
    name: shiftNameMap[s.shift_id] || `Shift ${s.shift_id}`,
    pct: Number((s.attendance_pct || 0).toFixed(2)),
    present: s.present_count || 0,
    absent: s.absent_count || 0,
  }));

  return (
    <Card className="p-4 lg:col-span-3 flex flex-col justify-between min-h-[260px]">
      <div>
        <div className="flex items-center gap-2 mb-3 min-w-0">
          <TrendingUp className="w-4 h-4 shrink-0 text-[#493287]" aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Shift-wise Attendance</h2>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : chartData.length === 0 ? (
          <div className="h-44 w-full my-1 flex flex-col items-center justify-center text-center p-3 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <TrendingUp className="w-6 h-6 text-slate-400 mb-1 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Shift Attendance Records</p>
            <p className="text-[10px] text-[var(--secondary)] mt-0.5">
              Connect to FastAPI backend to view live shift attendance metrics.
            </p>
          </div>
        ) : (
          <div className="h-44 w-full my-1">
            <ResponsiveContainer width="100%" height={176}>
              <BarChart data={chartData} margin={{ top: 20, right: 10, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis
                  dataKey="name"
                  stroke={palette.axisText}
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  stroke={palette.axisText}
                  fontSize={9}
                  domain={[0, 100]}
                  ticks={[20, 40, 60, 80, 100]}
                  tickFormatter={(val) => `${val}%`}
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
                    `${val}% (${item.payload.present.toLocaleString()} present, ${item.payload.absent} absent)`,
                    `${item.payload.name} (${item.payload.shift_id})`,
                  ]}
                />
                <Bar dataKey="pct" name="Attendance %" fill="#4D8EEB" radius={[4, 4, 0, 0]} barSize={34}>
                  <LabelList
                    dataKey="pct"
                    position="top"
                    formatter={(val) => `${val}%`}
                    style={{ fontSize: '10px', fontWeight: 800, fill: 'var(--text)' }}
                  />
                  {chartData.map((entry, index) => {
                    const isFiltered = !selectedShiftId || selectedShiftId === entry.shift_id;
                    return (
                      <Cell
                        key={`cell-shift-${index}`}
                        fill={isFiltered ? '#4D8EEB' : '#CBD5E1'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {chartData.length > 0 && (
        <div className="grid grid-cols-3 gap-1 pt-2 border-t border-[var(--border)] text-[9px] text-center">
          {chartData.map((s) => (
            <div key={s.shift_id} className="bg-[var(--muted-fill)]/50 rounded p-1 border border-[var(--border)]/60">
              <div className="font-extrabold text-[var(--text)]">{s.name}</div>
              <div className="font-black text-[#4D8EEB] mt-0.5">{s.pct}%</div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

