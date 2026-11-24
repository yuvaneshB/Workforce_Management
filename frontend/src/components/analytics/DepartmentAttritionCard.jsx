import { Building2 } from 'lucide-react';
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

export function DepartmentAttritionCard({ data = null, loading = false }) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const sourceData = data && Array.isArray(data) ? data : [];
  const chartData = sourceData.map((d) => ({
    ...d,
    label: d.label || `${d.count} (${d.pct})`,
  }));

  const highestDept =
    chartData.length > 0 && chartData[0].count > 0
      ? `${chartData[0].department} (${chartData[0].pct} of total exits)`
      : '0 Department Exits (100% Retention)';

  return (
    <Card className="p-4 lg:col-span-7 flex flex-col justify-between min-h-[260px] border border-[var(--border)] shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 shrink-0 text-purple-600" aria-hidden="true" />
            <h2 className="text-[12px] sm:text-[13px] font-bold whitespace-nowrap text-[var(--text)]">
              Department-wise Attrition
            </h2>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : !chartData || chartData.length === 0 ? (
          <div className="h-44 w-full my-1 flex flex-col items-center justify-center text-center p-4 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <Building2 className="w-6 h-6 text-emerald-500 mb-2 opacity-80" />
            <p className="text-xs font-bold text-[var(--text)]">0 Department Exits</p>
            <p className="text-[11px] text-[var(--secondary)] mt-0.5">
              100% employee retention across all 6 departments.
            </p>
          </div>
        ) : (
          <div className="h-44 w-full my-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 65, left: -10, bottom: 0 }}
                barSize={12}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke={palette.grid}
                />
                <XAxis
                  type="number"
                  domain={[0, 15]}
                  ticks={[0, 3, 6, 9, 12, 15]}
                  stroke={palette.axis}
                  tick={{ fill: palette.text, fontSize: 9 }}
                  axisLine={{ stroke: palette.grid }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="department"
                  type="category"
                  stroke={palette.axis}
                  tick={{ fill: palette.text, fontSize: 9.5, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  width={75}
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
                    `${val} exits ${item?.payload?.pct ? `(${item.payload.pct})` : ''}`,
                    'Exited Employees',
                  ]}
                />
                <Bar
                  dataKey="count"
                  fill="#3B82F6"
                  radius={[0, 4, 4, 0]}
                >
                  <LabelList
                    dataKey="label"
                    position="right"
                    style={{
                      fontSize: '9.5px',
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
        <span>Highest Department Impact</span>
        <span className={`font-bold ${chartData.length > 0 && chartData.some((d) => d.count > 0) ? 'text-rose-500' : 'text-emerald-600'}`}>
          {highestDept}
        </span>
      </div>
    </Card>
  );
}

