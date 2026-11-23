import { CalendarClock } from 'lucide-react';
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
import { CHART_COLORS, SHIFT_NAMES } from '../../utils/constants';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function ShiftAnalytics({
  workforceSummary = null,
  attendanceAnalytics = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const homeShifts = workforceSummary?.by_home_shift ?? [];
  const attendanceByShift = new Map(
    (attendanceAnalytics?.by_shift ?? []).map((item) => [item.key, item.count])
  );

  const chartData = homeShifts.map((shift) => ({
    shift: SHIFT_NAMES[shift.key] || `Shift ${shift.key}`,
    assignedEmployees: shift.count,
    attendanceLogs: attendanceByShift.get(shift.key) ?? 0,
  }));

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4" style={{ color: '#2563EB' }} aria-hidden="true" />
          <h2 className="text-[14px] font-bold">Shift-wise Analytics</h2>
        </div>
        {!loading && !error && chartData.length > 0 && (
          <span className="text-[10px] font-semibold muted">
            {chartData.reduce((acc, r) => acc + r.assignedEmployees, 0)} assigned
          </span>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton className="h-36 w-full rounded-lg flex-1" />
      ) : error ? (
        <div className="h-36 flex-1 flex items-center justify-center px-3">
          <EmptyState
            icon={CalendarClock}
            iconClassName="w-6 h-6 mx-auto muted mb-1.5"
            title="Unable to load shift data"
            titleClassName="text-[11px] font-bold"
            description={error}
          />
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-36 flex-1 flex items-center justify-center px-3">
          <EmptyState
            icon={CalendarClock}
            iconClassName="w-6 h-6 mx-auto muted mb-1.5"
            title="No data available"
            titleClassName="text-[11px] font-bold"
            description="Shift-wise workforce and attendance trends will appear here."
          />
        </div>
      ) : (
        <div className="h-36 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
              <XAxis dataKey="shift" stroke={palette.axisText} fontSize={10} />
              <YAxis stroke={palette.axisText} fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: palette.tooltipBg,
                  borderColor: palette.tooltipBorder,
                  color: palette.tooltipText,
                  fontSize: '11px',
                  borderRadius: '8px',
                }}
              />
              <Bar
                dataKey="assignedEmployees"
                name="Assigned Employees"
                fill={palette.demand}
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
