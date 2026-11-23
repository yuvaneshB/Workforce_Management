import { Clock } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const LATE_DATA = [
  { name: 'Production', value: 127, pct: '32.4%', color: '#6F3DBA' },
  { name: 'Maintenance', value: 73, pct: '18.6%', color: '#1E293B' },
  { name: 'Warehouse', value: 56, pct: '14.3%', color: '#06B6D4' },
  { name: 'Quality', value: 50, pct: '12.8%', color: '#F58A3A' },
  { name: 'Operations', value: 39, pct: '9.9%', color: '#4D8EEB' },
  { name: 'Others', value: 47, pct: '12.0%', color: '#94A3B8' },
];

export function LateArrivalCard({
  attendance = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const lateItem = !error
    ? attendance?.by_status?.find(
        (s) => String(s.attendance_status || '').trim().toUpperCase() === 'LATE'
      )
    : null;
  const totalLate =
    lateItem?.record_count ??
    (!error && typeof attendance?.late_count === 'number' ? attendance.late_count : 0);

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col justify-between min-h-[260px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 shrink-0 text-[#6F3DBA]" aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Late Arrival Analysis</h2>
          </div>
          <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 shrink-0">
            {totalLate} Total
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : (
          <div className="flex items-center justify-between gap-2 my-1">
            {/* Donut Chart with center metric */}
            <div className="relative w-1/2 h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={176}>
                <PieChart>
                  <Pie
                    data={LATE_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {LATE_DATA.map((entry, index) => (
                      <Cell key={`cell-late-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: palette.tooltipBg,
                      borderColor: palette.tooltipBorder,
                      color: palette.tooltipText,
                      fontSize: '11px',
                      borderRadius: '8px',
                    }}
                    formatter={(val, name, item) => [`${val} records (${item.payload.pct})`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-lg font-black text-[var(--text)] leading-none">
                  {totalLate}
                </span>
                <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-wider mt-0.5">
                  Late Arrivals
                </span>
              </div>
            </div>

            {/* Legend Column */}
            <div className="w-1/2 space-y-1.5 pl-2 text-[10px]">
              {LATE_DATA.map((d) => (
                <div key={d.name} className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    <span className="text-[var(--text)] font-semibold truncate">{d.name}</span>
                  </div>
                  <span className="font-bold text-[var(--secondary)] shrink-0">{d.pct}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[9px] text-[var(--secondary)]">
        <span>Late Rate: <strong className="text-purple-600 font-bold">2.37%</strong> of scheduled</span>
        <span>Departments: <strong className="text-[var(--text)]">6 Groups</strong></span>
      </div>
    </Card>
  );
}

