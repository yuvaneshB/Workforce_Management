import { Network } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const DEFAULT_GAP_DATA = [
  { department: 'Production', required: 50, current: 68 },
  { department: 'Quality', required: 48, current: 62 },
  { department: 'Maintenance', required: 40, current: 58 },
  { department: 'Warehouse', required: 40, current: 50 },
  { department: 'Operations', required: 45, current: 58 },
];

export function SkillGapAnalysisCard({
  data = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  return (
    <Card className="p-4 lg:col-span-7 flex flex-col justify-between min-h-[260px] border border-[var(--border)] shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Network className="w-4 h-4 shrink-0 text-purple-600" aria-hidden="true" />
            <h2 className="text-[12px] sm:text-[13px] font-bold whitespace-nowrap text-[var(--text)]">
              Skill Gap Analysis (Current vs Required)
            </h2>
          </div>
          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 shrink-0">
            Competency Benchmark
          </span>
        </div>

        <p className="text-[10px] text-[var(--secondary)] mb-1">
          Comparing required competency standards against evaluated workforce proficiency
        </p>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : (
          <div className="h-44 w-full my-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={DEFAULT_GAP_DATA}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                barGap={4}
                barSize={20}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={palette.grid}
                />
                <XAxis
                  dataKey="department"
                  stroke={palette.axis}
                  tick={{ fill: palette.text, fontSize: 10, fontWeight: 600 }}
                  axisLine={{ stroke: palette.grid }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 80]}
                  ticks={[0, 20, 40, 60, 80]}
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
                  formatter={(val, name) => [`${val} Proficiency Score`, name]}
                />
                <Legend
                  wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
                  iconSize={8}
                />
                <Bar
                  dataKey="required"
                  name="Required Skill Level"
                  fill="#2563EB"
                  radius={[3, 3, 0, 0]}
                />
                <Bar
                  dataKey="current"
                  name="Current Skill Level"
                  fill="#C4B5FD"
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--secondary)]">
        <span>Department Skill Competency</span>
        <span className="font-bold text-emerald-600">All Departments Exceeding Baseline</span>
      </div>
    </Card>
  );
}

