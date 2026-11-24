import { Users } from 'lucide-react';
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

export function VendorAttendanceCard({
  data = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const chartData = !error && Array.isArray(data) ? data : [];

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col justify-between min-h-[260px]">
      <div>
        <div className="flex items-center gap-2 mb-2 min-w-0">
          <Users className="w-4 h-4 shrink-0 text-[#4D8EEB]" aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Vendor-wise Attendance</h2>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : chartData.length === 0 ? (
          <div className="h-44 w-full my-1 flex flex-col items-center justify-center text-center p-4 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <Users className="w-6 h-6 text-slate-400 mb-2 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Vendor Attendance Data</p>
            <p className="text-[11px] text-[var(--secondary)] mt-0.5">
              Connect to FastAPI backend to view live vendor attendance performance.
            </p>
          </div>
        ) : (
          <div className="h-44 w-full my-1">
            <ResponsiveContainer width="100%" height={176}>
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 2, right: 38, left: 10, bottom: 2 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={palette.grid} />
                <XAxis
                  type="number"
                  stroke={palette.axisText}
                  fontSize={8}
                  domain={[80, 100]}
                  ticks={[80, 85, 90, 95, 100]}
                  unit="%"
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="vendor"
                  stroke={palette.axisText}
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  width={58}
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
                    `${val}% Attendance (${item.payload.present} present, ${item.payload.absent} absent)`,
                    `${item.payload.vendor}: ${item.payload.fullName}`,
                  ]}
                />
                <Bar dataKey="pct" name="Attendance %" fill="#4D8EEB" radius={[0, 4, 4, 0]} barSize={8}>
                  <LabelList
                    dataKey="pct"
                    position="right"
                    formatter={(val) => `${val}%`}
                    style={{ fontSize: '9px', fontWeight: 700, fill: 'var(--text)' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Card>
  );
}

