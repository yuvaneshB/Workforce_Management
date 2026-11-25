import { BarChart3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function DepartmentAnalytics({
  departmentAnalytics = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawDepartments = !error
    ? (departmentAnalytics?.items ?? []).filter((d) => (d.employee_count || 0) > 0)
    : [];

  // Sorted descending by count
  const departments = [...rawDepartments].sort(
    (a, b) => (b.employee_count || 0) - (a.employee_count || 0)
  );

  const totalHeadcount = departments.reduce((acc, d) => acc + (d.employee_count || 0), 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = totalHeadcount > 0 ? ((data.employee_count / totalHeadcount) * 100).toFixed(1) : 0;
      return (
        <div
          className="p-2.5 rounded-lg text-xs shadow-lg border"
          style={{
            backgroundColor: palette.tooltipBg,
            borderColor: palette.tooltipBorder,
            color: palette.tooltipText,
          }}
        >
          <p className="font-bold mb-1 text-[var(--foreground)]">{data.department_name}</p>
          <p className="text-[11px] font-semibold text-[#493287]">
            {data.employee_count.toLocaleString()} employees ({pct}%)
          </p>
          {data.attendance_pct != null && (
            <p className="text-[10px] muted mt-0.5">
              Attendance: {data.attendance_pct}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 flex flex-col h-full min-h-[280px]">
      {/* Single clean line header - no subtitles */}
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="w-4 h-4 shrink-0" style={{ color: '#493287' }} aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold truncate">Department-wise Analytics</h2>
        </div>
        {departments.length > 0 && !loading && (
          <span className="text-[11px] font-bold text-[var(--secondary)] shrink-0">
            {departments.length} Departments
          </span>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton className="h-[200px] w-full rounded-lg flex-1" />
      ) : departments.length > 0 ? (
        <div className="h-[200px] w-full flex-1">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={departments}
              layout="vertical"
              margin={{ top: 4, right: 15, left: 10, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} horizontal={false} />
              <XAxis
                type="number"
                stroke={palette.axisText}
                fontSize={9}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="department_name"
                stroke={palette.axisText}
                fontSize={9}
                width={120}
                tickLine={false}
                axisLine={false}
                tick={{ fill: palette.axisText, fontSize: 9, fontWeight: 500 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="employee_count"
                name="Employees"
                fill={palette.demand}
                radius={[0, 4, 4, 0]}
                barSize={12}
              >
                {departments.map((entry, index) => (
                  <Cell
                    key={`cell-dept-${index}`}
                    fill={index === 0 ? '#493287' : index < 3 ? '#4D8EEB' : '#1F2F59'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[200px] flex-1 rounded-lg flex items-center justify-center px-4">
          <EmptyState
            icon={BarChart3}
            title="No data available"
            description="Department-wise workforce distribution will appear here."
          />
        </div>
      )}
    </Card>
  );
}
