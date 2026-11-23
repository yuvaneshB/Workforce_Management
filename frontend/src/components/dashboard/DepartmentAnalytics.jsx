import { BarChart3 } from 'lucide-react';
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
import { EmptyState } from '../common/EmptyState';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function DepartmentAnalytics({
  departmentAnalytics = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const departments = !error
    ? (departmentAnalytics?.items ?? []).filter((d) => d.employee_count > 0)
    : [];

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="w-4 h-4 shrink-0" style={{ color: '#6F3DBA' }} aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Department-wise Analytics</h2>
        </div>
        {!loading && !error && departments.length > 0 && (
          <span className="text-[10px] font-semibold muted shrink-0">
            {departments.length} active
          </span>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton className="h-36 w-full rounded-lg flex-1" />
      ) : departments.length > 0 ? (
        <div className="h-36 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={departments} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
              <XAxis type="number" stroke={palette.axisText} fontSize={10} />
              <YAxis
                type="category"
                dataKey="department_name"
                stroke={palette.axisText}
                fontSize={10}
                width={85}
              />
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
                dataKey="employee_count"
                name="Employees"
                fill={palette.demand}
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-36 flex-1 rounded-lg flex items-center justify-center px-4">
          <EmptyState
            icon={BarChart3}
            iconClassName="w-6 h-6 mx-auto muted mb-1.5"
            title="No data available"
            titleClassName="text-[11px] font-bold"
            description="Department-wise attendance and workforce distribution will appear here."
          />
        </div>
      )}
    </Card>
  );
}
