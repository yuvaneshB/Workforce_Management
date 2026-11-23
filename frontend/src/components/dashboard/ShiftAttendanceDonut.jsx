import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const SHIFT_COLORS = {
  A: '#6F3DBA',
  B: '#4D8EEB',
  C: '#F58A3A',
};

export function ShiftAttendanceDonut({
  _attendanceAnalytics = null,
  shiftEfficiencyAnalytics = null,
  loading = false,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  // Extract shift metrics
  const shiftMetrics = shiftEfficiencyAnalytics?.items || shiftEfficiencyAnalytics?.shift_metrics || [];
  
  let shiftA = 5047;
  let shiftB = 5052;
  let shiftC = 5040;

  if (shiftMetrics.length > 0) {
    const a = shiftMetrics.find((s) => s.shift_id === 'A');
    const b = shiftMetrics.find((s) => s.shift_id === 'B');
    const c = shiftMetrics.find((s) => s.shift_id === 'C');
    if (a?.present_employees) shiftA = a.present_employees;
    if (b?.present_employees) shiftB = b.present_employees;
    if (c?.present_employees) shiftC = c.present_employees;
  }

  const totalPresent = shiftA + shiftB + shiftC;

  const chartData = [
    { name: 'GS1', value: shiftA, color: SHIFT_COLORS.A, pct: '34.1' },
    { name: 'S2', value: shiftB, color: SHIFT_COLORS.B, pct: '33.3' },
    { name: 'NS3', value: shiftC, color: SHIFT_COLORS.C, pct: '33.3' },
  ];

  return (
    <Card className="p-3.5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[13px] font-extrabold text-slate-900 dark:text-white tracking-tight">
          Shift-wise Attendance
        </h2>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-40 w-full rounded-lg" />
      ) : (
        <div className="flex items-center justify-between gap-2 h-40">
          {/* Donut Chart with center text */}
          <div className="relative w-26 h-26 shrink-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={28}
                  outerRadius={40}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`${val.toLocaleString()} (${totalPresent > 0 ? ((val / totalPresent) * 100).toFixed(1) : 0}%)`, name]}
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[13px] font-black tracking-tight text-slate-900 dark:text-white leading-none">
                {totalPresent.toLocaleString()}
              </span>
              <span className="text-[8.5px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">
                Present
              </span>
            </div>
          </div>

          {/* Right Legend */}
          <div className="flex flex-col justify-center space-y-2 flex-1 min-w-0 pl-1.5">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-1 text-[10.5px]">
                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {item.name}
                  </span>
                </div>
                <span className="font-extrabold text-slate-900 dark:text-white shrink-0 ml-auto">
                  {item.pct}% <span className="font-normal text-slate-500 dark:text-slate-400 text-[10px]">({item.value.toLocaleString()})</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
