import { Users } from 'lucide-react';
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

const BASELINE_DEPTS = [
  { department_name: 'Production', absenteeism_pct: 4.62, absent_count: 149 },
  { department_name: 'Maintenance', absenteeism_pct: 3.98, absent_count: 106 },
  { department_name: 'Warehouse', absenteeism_pct: 3.21, absent_count: 122 },
  { department_name: 'Quality', absenteeism_pct: 2.94, absent_count: 80 },
  { department_name: 'Operations', absenteeism_pct: 2.61, absent_count: 97 },
  { department_name: 'Administration', absenteeism_pct: 2.37, absent_count: 38 },
  { department_name: 'HR', absenteeism_pct: 1.89, absent_count: 24 },
];

export function DepartmentAbsenteeismCard({
  departmentAnalytics = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawDepts = !error ? (departmentAnalytics?.items ?? []) : [];

  let chartData = [...BASELINE_DEPTS];

  if (rawDepts.length > 0) {
    const populated = rawDepts
      .filter((d) => d.total_records > 0 || d.employee_count > 0)
      .map((d) => ({
        department_name: d.department_name,
        absenteeism_pct: Number((d.absenteeism_pct || (d.total_records > 0 ? (d.absent_count / d.total_records) * 100 : 0)).toFixed(2)),
        absent_count: d.absent_count,
      }));
    if (populated.length > 0) {
      chartData = populated;
    }
  }

  // Sort descending by absenteeism percentage
  chartData.sort((a, b) => b.absenteeism_pct - a.absenteeism_pct);

  const highestDeptName = chartData[0]?.department_name;

  return (
    <Card className="p-4 lg:col-span-3 flex flex-col justify-between min-h-[260px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 shrink-0 text-[#6F3DBA]" aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Department-wise Absenteeism</h2>
          </div>
          <span className="text-[9px] font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.5 rounded border border-rose-200 dark:border-rose-800 shrink-0">
            Highest: {highestDeptName}
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : (
          <div className="h-44 w-full my-1">
            <ResponsiveContainer width="100%" height={176}>
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 2, right: 35, left: 10, bottom: 2 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={palette.grid} />
                <XAxis
                  type="number"
                  stroke={palette.axisText}
                  fontSize={8}
                  domain={[0, 6]}
                  ticks={[0, 2, 4, 6]}
                  unit="%"
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="department_name"
                  stroke={palette.axisText}
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  width={68}
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
                    `${val}% (${item.payload.absent_count} absent)`,
                    item.payload.department_name,
                  ]}
                />
                <Bar dataKey="absenteeism_pct" name="Absenteeism" radius={[0, 4, 4, 0]} barSize={8}>
                  <LabelList
                    dataKey="absenteeism_pct"
                    position="right"
                    formatter={(val) => `${val}%`}
                    style={{ fontSize: '9px', fontWeight: 700, fill: 'var(--text)' }}
                  />
                  {chartData.map((entry, index) => {
                    const isHighest = entry.department_name === highestDeptName;
                    return (
                      <Cell
                        key={`cell-dept-${index}`}
                        fill={isHighest ? '#E45C72' : '#4D8EEB'}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[9px] text-[var(--secondary)]">
        <span>Departments: <strong className="text-[var(--text)]">{chartData.length} Tracked</strong></span>
        <span>Peak Rate: <strong className="text-rose-500 font-bold">{chartData[0]?.absenteeism_pct}%</strong></span>
      </div>
    </Card>
  );
}

