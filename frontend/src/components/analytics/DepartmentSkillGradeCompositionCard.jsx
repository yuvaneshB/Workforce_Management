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
  { department: 'Final Assembly', displayName: 'Final Assembly', l1_pct: 62.0, l2_pct: 14.6, l3_pct: 10.6, l4_pct: 12.9, total: 426, l1_count: 264, l2_count: 62, l3_count: 45, l4_count: 55 },
  { department: 'SMT Production', displayName: 'SMT Production', l1_pct: 0.0, l2_pct: 51.0, l3_pct: 33.8, l4_pct: 15.2, total: 204, l1_count: 0, l2_count: 104, l3_count: 69, l4_count: 31 },
  { department: 'Module Assembly', displayName: 'Module Assembly', l1_pct: 65.9, l2_pct: 14.7, l3_pct: 11.8, l4_pct: 7.6, total: 170, l1_count: 112, l2_count: 25, l3_count: 20, l4_count: 13 },
  { department: 'Testing & Calibration', displayName: 'Testing & Cal.', l1_pct: 0.0, l2_pct: 45.1, l3_pct: 39.2, l4_pct: 15.7, total: 153, l1_count: 0, l2_count: 69, l3_count: 60, l4_count: 24 },
  { department: 'Quality Assurance', displayName: 'Quality Assurance', l1_pct: 0.0, l2_pct: 51.6, l3_pct: 30.1, l4_pct: 18.3, total: 153, l1_count: 0, l2_count: 79, l3_count: 46, l4_count: 28 },
];

function formatDeptName(name) {
  if (!name) return '';
  if (name === 'Material Handling & Logistics') return 'Material Handling';
  if (name === 'Supply Chain & Stores') return 'Supply Chain';
  if (name === 'Production Engineering') return 'Prod. Engineering';
  if (name === 'Testing & Calibration') return 'Testing & Cal.';
  return name;
}

export function DepartmentSkillGradeCompositionCard({
  data = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const allDepts = !error && data?.department_skills?.length
    ? data.department_skills
        .filter((d) => (d.total_employees || (d.l1_count + d.l2_count + d.l3_count + d.l4_count)) > 0)
        .map((d) => {
          const l1 = d.l1_count || 0;
          const l2 = d.l2_count || 0;
          const l3 = d.l3_count || 0;
          const l4 = d.l4_count || 0;
          const total = d.total_employees || (l1 + l2 + l3 + l4) || 1;
          return {
            department: d.department_name,
            displayName: formatDeptName(d.department_name),
            l1_pct: Number(((l1 / total) * 100).toFixed(1)),
            l2_pct: Number(((l2 / total) * 100).toFixed(1)),
            l3_pct: Number(((l3 / total) * 100).toFixed(1)),
            l4_pct: Number(((l4 / total) * 100).toFixed(1)),
            total,
            l1_count: l1,
            l2_count: l2,
            l3_count: l3,
            l4_count: l4,
          };
        })
    : DEFAULT_DEPT_COMPOSITION;

  // Sort by headcount descending and show top 6 evaluated departments
  const sortedDepts = [...allDepts].sort((a, b) => b.total - a.total);
  const rawDepts = sortedDepts.length > 6 ? sortedDepts.slice(0, 6) : sortedDepts;

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
                  margin={{ top: 5, right: 10, left: 10, bottom: 0 }}
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
                    dataKey="displayName"
                    type="category"
                    stroke={palette.axis}
                    tick={{ fill: palette.text, fontSize: 9.5, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={92}
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
                      `${val}% (${item.payload[`${name.toLowerCase()}_count`] || 0} operators)`,
                      name,
                    ]}
                    labelFormatter={(_, items) => items?.[0]?.payload?.department || _}
                  />
                  <Bar dataKey="l4_pct" name="L4" stackId="composition" fill="#1F2F59" />
                  <Bar dataKey="l3_pct" name="L3" stackId="composition" fill="#3B82F6" />
                  <Bar dataKey="l2_pct" name="L2" stackId="composition" fill="#06B6D4" />
                  <Bar dataKey="l1_pct" name="L1" stackId="composition" fill="#34D399" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Right Legend Column */}
            <div className="w-11 flex flex-col gap-1.5 pl-1 text-[9.5px] font-bold text-[var(--secondary)]">
              <div className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#1F2F59] shrink-0" />
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
        <span className="font-bold text-purple-600">{allDepts.length} Evaluated Departments</span>
      </div>
    </Card>
  );
}

