import { BarChart3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
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

const DEFAULT_GRADE_DATA = [
  { skill_grade: 'L1', employee_count: 43, percentage: '23.9' },
  { skill_grade: 'L2', employee_count: 54, percentage: '30.0' },
  { skill_grade: 'L3', employee_count: 38, percentage: '21.1' },
  { skill_grade: 'L4', employee_count: 45, percentage: '25.0' },
];

export function SkillGradeDistributionCard({
  data = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawGrades = !error && data?.skill_grade_distribution?.length
    ? data.skill_grade_distribution
    : [];

  const totalEmployees = !error ? (data?.total_employees ?? 0) : 0;

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col justify-between min-h-[260px] border border-[var(--border)] shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <BarChart3 className="w-4 h-4 shrink-0 text-purple-600" aria-hidden="true" />
            <h2 className="text-[12px] sm:text-[13px] font-bold whitespace-nowrap text-[var(--text)]">
              Skill Grade Distribution (L1 – L4)
            </h2>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : rawGrades.length === 0 ? (
          <div className="h-44 w-full my-1 flex flex-col items-center justify-center text-center p-3 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <BarChart3 className="w-6 h-6 text-slate-400 mb-1 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Skill Distribution Data</p>
            <p className="text-[10px] text-[var(--secondary)] mt-0.5">
              Connect to FastAPI backend to view live skill grade metrics.
            </p>
          </div>
        ) : (
          <div className="h-44 w-full my-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rawGrades}
                margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                barSize={38}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={palette.grid}
                />
                <XAxis
                  dataKey="skill_grade"
                  stroke={palette.axis}
                  tick={{ fill: palette.text, fontSize: 10, fontWeight: 700 }}
                  axisLine={{ stroke: palette.grid }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 60]}
                  ticks={[0, 10, 20, 30, 40, 50, 60]}
                  stroke={palette.axis}
                  tick={{ fill: palette.text, fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
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
                    `${val} employees (${item.payload.percentage || ((val / totalEmployees) * 100).toFixed(1)}%)`,
                    'Headcount',
                  ]}
                />
                <Bar
                  dataKey="employee_count"
                  fill="#7C3AED"
                  radius={[6, 6, 0, 0]}
                >
                  <LabelList
                    dataKey="employee_count"
                    position="top"
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      fill: 'var(--text)',
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--secondary)]">
        <span>Proficiency Level Classification</span>
        <span className="font-bold text-purple-600">L1 Basic to L4 Expert</span>
      </div>
    </Card>
  );
}

