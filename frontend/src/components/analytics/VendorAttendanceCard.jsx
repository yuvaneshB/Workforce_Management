import { AlertCircle, RefreshCw, Users } from 'lucide-react';
import { useMemo } from 'react';
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

function getShortVendorName(name, id) {
  if (!name) return id || '';
  const map = {
    'Sri Vignesh Manpower Services': 'Sri Vignesh',
    'Kovai Talent Solutions': 'Kovai Talent',
    'Namma Workforce Pvt Ltd': 'Namma Workforce',
    'Anand Industrial Staffing': 'Anand Staffing',
    'Karnataka Skill Force': 'Karnataka Skill',
    'Prime HR Outsourcing': 'Prime HR',
  };
  return map[name] || (name.length > 15 ? `${name.substring(0, 13)}…` : name);
}

function CustomVendorTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload;
  if (!item) return null;

  return (
    <div className="p-3 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-xl shadow-xl text-xs space-y-1.5 min-w-[220px] z-50">
      <div className="border-b border-[var(--border)] pb-1.5">
        <div className="font-bold text-[13px] text-slate-900 dark:text-slate-100">
          {item.vendor_name || item.fullName}
        </div>
        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          {item.vendor_id || item.vendor} • {item.assigned_employees ?? item.total} Assigned Staff
        </div>
      </div>

      <div className="space-y-1 pt-0.5 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Present:
          </span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {item.present_count?.toLocaleString() ?? item.present} ({item.present_pct}%)
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Absent:
          </span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {item.absent_count?.toLocaleString() ?? item.absent} ({item.absent_pct}%)
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Leave:
          </span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {item.leave_count?.toLocaleString() ?? '0'} ({item.leave_pct ?? 0}%)
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> Late:
          </span>
          <span className="font-bold text-slate-900 dark:text-slate-100">
            {item.late_count?.toLocaleString() ?? '0'} ({item.late_pct ?? 0}%)
          </span>
        </div>

        <div className="pt-1.5 border-t border-[var(--border)] flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
          <span>Overall Attendance:</span>
          <span className="text-[#10B981]">{item.attendance_rate ?? item.pct}%</span>
        </div>
      </div>
    </div>
  );
}

export function VendorAttendanceCard({
  data = null,
  loading = false,
  error = null,
  onRetry = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  // Process & sort vendor records by attendance rate descending
  const chartData = useMemo(() => {
    if (error || !Array.isArray(data)) return [];

    return [...data]
      .map((item) => ({
        ...item,
        shortName: getShortVendorName(item.vendor_name || item.fullName, item.vendor_id || item.vendor),
        present_pct: Number(item.present_pct ?? (item.pct || 0)),
        absent_pct: Number(item.absent_pct ?? 0),
        leave_pct: Number(item.leave_pct ?? 0),
        late_pct: Number(item.late_pct ?? 0),
        attendance_rate: Number(item.attendance_rate ?? (item.pct || 0)),
      }))
      .sort((a, b) => (b.attendance_rate || 0) - (a.attendance_rate || 0));
  }, [data, error]);

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col justify-between min-h-[260px]">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-2 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 shrink-0 text-[#4D8EEB]" aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Vendor-wise Attendance</h2>
          </div>

          {chartData.length > 0 && !loading && (
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              {chartData.length} Vendors
            </span>
          )}
        </div>

        {/* Loading State */}
        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : error ? (
          /* Error State */
          <div className="h-44 w-full my-1 flex flex-col items-center justify-center text-center p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-900">
            <AlertCircle className="w-6 h-6 text-rose-500 mb-1.5" />
            <p className="text-xs font-bold text-rose-700 dark:text-rose-300">Unable to load vendor attendance</p>
            <p className="text-[11px] text-rose-600/80 dark:text-rose-400/80 mt-0.5 mb-2 max-w-xs truncate">
              {error}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="h-7 px-3 rounded-lg border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 flex items-center gap-1 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        ) : chartData.length === 0 ? (
          /* Empty State */
          <div className="h-44 w-full my-1 flex flex-col items-center justify-center text-center p-4 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <Users className="w-6 h-6 text-slate-400 mb-2 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Vendor Attendance Records</p>
            <p className="text-[11px] text-[var(--secondary)] mt-0.5 max-w-xs">
              No vendor attendance records found for the selected filters.
            </p>
          </div>
        ) : (
          /* Horizontal Grouped Bar Chart */
          <div className="h-44 w-full my-1">
            <ResponsiveContainer width="100%" height={176}>
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 2, right: 12, left: 0, bottom: 2 }}
                barCategoryGap="18%"
                barGap={1}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={palette.grid} />
                <XAxis
                  type="number"
                  stroke={palette.axisText}
                  fontSize={8}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  unit="%"
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  stroke={palette.axisText}
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  width={68}
                />
                <Tooltip content={<CustomVendorTooltip />} />
                <Bar dataKey="present_pct" name="Present %" fill="#10B981" radius={[0, 2, 2, 0]} barSize={5} />
                <Bar dataKey="absent_pct" name="Absent %" fill="#EF4444" radius={[0, 2, 2, 0]} barSize={5} />
                <Bar dataKey="leave_pct" name="Leave %" fill="#F59E0B" radius={[0, 2, 2, 0]} barSize={5} />
                <Bar dataKey="late_pct" name="Late %" fill="#3B82F6" radius={[0, 2, 2, 0]} barSize={5} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        {chartData.length > 0 && !loading && !error && (
          <div className="flex items-center justify-center gap-3 pt-1 border-t border-[var(--border)] text-[10px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" /> Present
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> Absent
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" /> Leave
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" /> Late
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
