import { Clock } from 'lucide-react';
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
import { LoadingSkeleton } from '../common/LoadingSkeleton';

function splitDepartmentLabel(name) {
  if (!name) return [''];
  if (name === 'Testing & Calibration') return ['Testing &', 'Calibration'];
  if (name === 'Final Assembly') return ['Final', 'Assembly'];
  if (name === 'Module Assembly') return ['Module', 'Assembly'];
  if (name === 'Quality Assurance') return ['Quality', 'Assurance'];
  if (name === 'SMT Production') return ['SMT', 'Production'];
  if (name === 'SMT Prod') return ['SMT', 'Prod'];
  if (name === 'Maintenance & Facility') return ['Maintenance', '& Facility'];
  if (name === 'Warehouse & Logistics') return ['Warehouse', '& Logistics'];

  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    const mid = Math.ceil(words.length / 2);
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
  }
  return [name];
}

function CustomTick({ x, y, payload, fill }) {
  const lines = splitDepartmentLabel(payload.value);
  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, idx) => (
        <text
          key={idx}
          x={0}
          y={0}
          dy={10 + idx * 12}
          textAnchor="middle"
          fill={fill}
          fontSize={10}
          fontWeight={600}
        >
          {line}
        </text>
      ))}
    </g>
  );
}

export function OvertimeAnalytics({
  overtimeAnalytics = null,
  workforceSummary = null,
  loading = false,
  compact = false,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const hasData = Boolean(overtimeAnalytics && typeof overtimeAnalytics.total_overtime_hours === 'number');
  const totalOvertimeHours = hasData ? overtimeAnalytics.total_overtime_hours : 0;
  const estimatedCost = Math.round(totalOvertimeHours * 25);

  const deptWise = overtimeAnalytics?.department_wise || [];
  const deptData = deptWise.slice(0, 5).map((d) => {
    const rawName = d.department_name || d.department_id || '';
    return {
      fullName: rawName,
      name: rawName,
      hours: Math.round(d.overtime_hours || 0),
    };
  });

  // Value formatting
  const otHoursValue = totalOvertimeHours >= 1000
    ? `${(totalOvertimeHours / 1000).toFixed(1)}K`
    : `${totalOvertimeHours}`;

  const costDisplay = estimatedCost >= 1000000
    ? `$${(estimatedCost / 1000000).toFixed(2)}M`
    : estimatedCost >= 1000
    ? `$${(estimatedCost / 1000).toFixed(1)}K`
    : `$${estimatedCost}`;

  const vendorOtPct = overtimeAnalytics?.vendor_ot_pct != null
    ? `${overtimeAnalytics.vendor_ot_pct.toFixed(1)}%`
    : hasData
    ? '0.0%'
    : '—';

  const avgOtValue = overtimeAnalytics?.avg_overtime_hours_per_employee != null
    ? overtimeAnalytics.avg_overtime_hours_per_employee.toFixed(1)
    : hasData
    ? '0.0'
    : '—';

  return (
    <div className="surface rounded-2xl p-4 sm:p-5 border border-[var(--border)] shadow-xs flex flex-col h-full min-h-0">
      {/* Header: Icon + title on one line, same height */}
      <div className="h-8 flex items-center gap-2 mb-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight whitespace-nowrap">
          Overtime Analytics
        </h3>
      </div>

      {/* KPI Tiles: 4 tiles, equal width, equal height (h-20) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-3 shrink-0">
        <div
          title={hasData ? `${totalOvertimeHours.toLocaleString()} hours` : undefined}
          className="h-20 p-2.5 rounded-xl bg-purple-50/70 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 flex flex-col justify-between min-w-0"
        >
          <span className="text-xs font-bold leading-snug text-purple-700 dark:text-purple-300">
            Total OT Hours
          </span>
          <div className="flex items-baseline gap-1 whitespace-nowrap mt-auto">
            <span className="text-xl font-bold text-purple-900 dark:text-purple-100 tabular-nums leading-none">
              {hasData ? otHoursValue : '—'}
            </span>
            {hasData && (
              <span className="text-xs font-medium text-[var(--secondary)] opacity-80 leading-none">
                h
              </span>
            )}
          </div>
        </div>

        <div
          title={hasData ? `$${estimatedCost.toLocaleString()}` : undefined}
          className="h-20 p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex flex-col justify-between min-w-0"
        >
          <span className="text-xs font-bold leading-snug text-emerald-700 dark:text-emerald-300">
            Estimated Cost
          </span>
          <div className="flex items-baseline gap-1 whitespace-nowrap mt-auto">
            <span className="text-xl font-bold text-emerald-900 dark:text-emerald-100 tabular-nums leading-none">
              {hasData ? costDisplay : '—'}
            </span>
          </div>
        </div>

        <div
          title={hasData ? `Vendor Overtime Share: ${vendorOtPct}` : 'Vendor Contractor Overtime Share'}
          className="h-20 p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex flex-col justify-between min-w-0"
        >
          <span className="text-xs font-bold leading-snug text-blue-700 dark:text-blue-300">
            Vendor OT Share
          </span>
          <div className="flex items-baseline gap-1 whitespace-nowrap mt-auto">
            <span className="text-xl font-bold text-blue-900 dark:text-blue-100 tabular-nums leading-none">
              {hasData ? vendorOtPct : '—'}
            </span>
          </div>
        </div>

        <div
          title={hasData ? `Average Overtime: ${avgOtValue} hours per worker` : 'Average Overtime Hours per Worker'}
          className="h-20 p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex flex-col justify-between min-w-0"
        >
          <span className="text-xs font-bold leading-snug text-amber-700 dark:text-amber-300">
            Avg OT / Worker
          </span>
          <div className="flex items-baseline gap-1 whitespace-nowrap mt-auto">
            <span className="text-xl font-bold text-amber-900 dark:text-amber-100 tabular-nums leading-none">
              {hasData ? avgOtValue : '—'}
            </span>
            {hasData && (
              <span className="text-xs font-medium text-[var(--secondary)] opacity-80 leading-none">
                h
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Department-wise OT Bar Chart Area (height: 240px) */}
      {loading && (!hasData || deptData.length === 0) ? (
        <div className="flex-1 w-full min-h-[240px] flex items-center justify-center">
          <LoadingSkeleton className="h-56 w-full rounded-xl" />
        </div>
      ) : !hasData || deptData.length === 0 ? (
        <div className="flex-1 w-full min-h-[240px] flex flex-col items-center justify-center text-center p-3 text-[var(--secondary)]">
          <Clock className="w-5 h-5 mb-1 text-[var(--secondary)]/50" />
          <span className="text-xs font-semibold">No overtime records</span>
          <span className="text-[10px]">Connect backend to view live overtime</span>
        </div>
      ) : (
        <div className="flex-1 w-full min-h-[240px] flex flex-col justify-end">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={deptData}
              margin={{ top: 10, right: 12, left: -14, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
              <XAxis
                dataKey="name"
                interval={0}
                tick={<CustomTick fill={palette.axisText} />}
                height={38}
                axisLine={{ stroke: palette.grid }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
                tick={{ fill: palette.axisText, fontSize: 10, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0]?.payload;
                  if (!item) return null;
                  return (
                    <div
                      className="p-2.5 rounded-xl shadow-lg border text-xs"
                      style={{
                        backgroundColor: palette.tooltipBg,
                        borderColor: palette.tooltipBorder,
                        color: palette.tooltipText,
                      }}
                    >
                      <div className="font-extrabold text-[11.5px] mb-1">
                        {item.fullName}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#493287]" />
                        <span className="text-[var(--secondary)]">Overtime Logged:</span>
                        <span className="font-bold">{item.hours.toLocaleString()} hrs</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="hours"
                name="Overtime Hours"
                fill="#493287"
                radius={[4, 4, 0, 0]}
                maxBarSize={42}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default OvertimeAnalytics;
