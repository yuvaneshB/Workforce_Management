import { GraduationCap } from 'lucide-react';
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
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const DEFAULT_DEPT_COMPOSITION = [
  { department: 'Production', l1_pct: 27.8, l2_pct: 29.6, l3_pct: 24.1, l4_pct: 18.5, total: 54 },
  { department: 'Quality', l1_pct: 28.6, l2_pct: 35.7, l3_pct: 14.3, l4_pct: 21.4, total: 28 },
  { department: 'Maintenance', l1_pct: 24.2, l2_pct: 30.3, l3_pct: 15.2, l4_pct: 30.3, total: 33 },
  { department: 'Warehouse', l1_pct: 17.9, l2_pct: 33.3, l3_pct: 25.6, l4_pct: 23.1, total: 39 },
  { department: 'Operations', l1_pct: 19.2, l2_pct: 19.2, l3_pct: 23.1, l4_pct: 38.5, total: 26 },
];

export function DepartmentSkillGradeCompositionCard({
  data = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawDepts = !error && data?.department_skills?.length
    ? data.department_skills.map((d) => {
        const total = d.total_employees || (d.l1_count + d.l2_count + d.l3_count + d.l4_count) || 1;
        return {
          department: d.department_name,
          l1_pct: Number(((d.l1_count / total) * 100).toFixed(1)),
          l2_pct: Number(((d.l2_count / total) * 100).toFixed(1)),
          l3_pct: Number(((d.l3_count / total) * 100).toFixed(1)),
          l4_pct: Number(((d.l4_count / total) * 100).toFixed(1)),
          total,
          l1_count: d.l1_count,
          l2_count: d.l2_count,
          l3_count: d.l3_count,
          l4_count: d.l4_count,
        };
      })
    : DEFAULT_DEPT_COMPOSITION;

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col justify-between min-h-[260px] border border-[var(--border)] shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <GraduationCap className="w-4 h-4 shrink-0 text-purple-600" aria-hidden="true" />
            <h2 className="text-[12px] sm:text-[13px] font-bold whitespace-nowrap text-[var(--text)]">
              Department Skill Grade Composition
            </h2>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : (
          <div className="flex items-center gap-1 my-1">
            <div className="h-44 flex-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={rawDepts}
                  layout="vertical"
                  margin={{ top: 5, right: 10, left: -10, bottom: 0 }}
                  barSize={12}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke={palette.grid}
                  />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    stroke={palette.axis}
                    tick={{ fill: palette.text, fontSize: 9 }}
                    axisLine={{ stroke: palette.grid }}
                    tickLine={false}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <YAxis
                    dataKey="department"
                    type="category"
                    stroke={palette.axis}
                    tick={{ fill: palette.text, fontSize: 9.5, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={72}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: palette.tooltipBg,
                      borderColor: palette.tooltipBorder,
                      color: palette.tooltipText,
                      fontSize: '11px',
                      borderRadius: '8px',
                    }}
                    formatter={(val, name) => [`${val}%`, name]}
                  />
                  <Bar dataKey="l4_pct" name="L4" stackId="composition" fill="#6D28D9" />
                  <Bar dataKey="l3_pct" name="L3" stackId="composition" fill="#3B82F6" />
                  <Bar dataKey="l2_pct" name="L2" stackId="composition" fill="#06B6D4" />
                  <Bar dataKey="l1_pct" name="L1" stackId="composition" fill="#34D399" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Right Legend Column */}
            <div className="w-11 flex flex-col gap-1.5 pl-1 text-[9.5px] font-bold text-[var(--secondary)]">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#6D28D9] shrink-0" />
                <span>L4</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#3B82F6] shrink-0" />
                <span>L3</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#06B6D4] shrink-0" />
                <span>L2</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#34D399] shrink-0" />
                <span>L1</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--secondary)]">
        <span>Department Tier Spread</span>
        <span className="font-bold text-purple-600">5 Evaluated Departments</span>
      </div>
    </Card>
  );
}

