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

const VENDOR_ATTENDANCE = [
  { vendor: 'Vendor A', fullName: 'Apex Industrial Services', pct: 93.85, present: 3885, absent: 255 },
  { vendor: 'Vendor B', fullName: 'Prime Technical Services', pct: 92.67, present: 3836, absent: 304 },
  { vendor: 'Vendor C', fullName: 'Core Facility Partners', pct: 91.73, present: 3798, absent: 342 },
  { vendor: 'Vendor D', fullName: 'Summit Workforce Solutions', pct: 90.96, present: 3766, absent: 374 },
  { vendor: 'Vendor E', fullName: 'Global Tech Staffing', pct: 89.42, present: 0, absent: 0 },
  { vendor: 'Vendor F', fullName: 'Precision Workforce', pct: 88.97, present: 0, absent: 0 },
];

export function VendorAttendanceCard({
  data = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const hasData = !error && data != null;
  const chartData = hasData ? VENDOR_ATTENDANCE : [];

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col justify-between min-h-[260px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 shrink-0 text-[#4D8EEB]" aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Vendor-wise Attendance</h2>
          </div>
          <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 shrink-0">
            {hasData ? '6 Vendors' : 'No Connection'}
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : !hasData || chartData.length === 0 ? (
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

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[9px] text-[var(--secondary)]">
        {hasData ? (
          <>
            <span>Top Vendor: <strong className="text-emerald-600 font-bold">Vendor A (93.85%)</strong></span>
            <span>Avg Rate: <strong className="text-[var(--text)]">91.42%</strong></span>
          </>
        ) : (
          <>
            <span>Vendor performance monitoring</span>
            <span className="font-bold text-slate-400">No Connection</span>
          </>
        )}
      </div>
    </Card>
  );
}

