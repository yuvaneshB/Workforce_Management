import { GraduationCap } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const TRAINING_DATA = [
  { name: 'L1 Training', count: 7, pct: '25.0%', color: '#3B82F6' },
  { name: 'L2 Training', count: 9, pct: '32.1%', color: '#A855F7' },
  { name: 'L3 Training', count: 6, pct: '21.4%', color: '#F97316' },
  { name: 'L4 Training', count: 6, pct: '21.4%', color: '#22C55E' },
];

export function TrainingRequirementsCard({
  data = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const totalTrainingEmployees = TRAINING_DATA.reduce((acc, c) => acc + c.count, 0);

  return (
    <Card className="p-4 lg:col-span-5 flex flex-col justify-between min-h-[260px] border border-[var(--border)] shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <GraduationCap className="w-4 h-4 shrink-0 text-purple-600" aria-hidden="true" />
            <h2 className="text-[12px] sm:text-[13px] font-bold whitespace-nowrap text-[var(--text)]">
              Training Requirements by Skill Grade
            </h2>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : (
          <div className="flex items-center justify-between gap-2 my-1">
            {/* Donut Chart with center metric */}
            <div className="relative w-[48%] h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={176}>
                <PieChart>
                  <Pie
                    data={TRAINING_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={2}
                    dataKey="count"
                    stroke="none"
                  >
                    {TRAINING_DATA.map((entry, index) => (
                      <Cell key={`cell-training-${index}`} fill={entry.color} />
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
                    formatter={(val, name, item) => [
                      `${val} employees (${item.payload.pct})`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-[var(--text)] leading-none">
                  {totalTrainingEmployees}
                </span>
                <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-wider mt-0.5">
                  Employees
                </span>
              </div>
            </div>

            {/* Legend Column */}
            <div className="w-[52%] space-y-2 pl-2 text-[10.5px]">
              {TRAINING_DATA.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <div className="font-extrabold text-[var(--text)]">
                    {item.count} <span className="font-medium text-[var(--secondary)] text-[9.5px]">({item.pct})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--secondary)]">
        <span>Skill Matrix Deficit</span>
        <span className="font-bold text-amber-600">Active Training Pipelines</span>
      </div>
    </Card>
  );
}

