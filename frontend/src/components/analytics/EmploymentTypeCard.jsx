import { Briefcase } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function EmploymentTypeCard({
  workforceSummary = null,
  loading = false,
  error = null,
  className = '',
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;
  const sliceStroke = isDark ? (palette.surface || '#192235') : '#FFFFFF';

  const totalEmployees = !error && workforceSummary ? (workforceSummary.total_employees ?? 0) : 0;

  // Extract counts from workforceSummary
  let permanentEmployees = workforceSummary?.permanent_count ?? 0;
  let vendorEmployees = workforceSummary?.vendor_count ?? 0;

  if (workforceSummary?.by_employment_type && workforceSummary.by_employment_type.length > 0) {
    workforceSummary.by_employment_type.forEach((item) => {
      const key = String(item.key || '').toLowerCase();
      if (key === 'permanent') permanentEmployees = item.count;
      else if (key === 'vendor') vendorEmployees = item.count;
    });
  }

  const unclassifiedEmployees = Math.max(0, totalEmployees - (permanentEmployees + vendorEmployees));

  const permanentPct = totalEmployees > 0 ? ((permanentEmployees / totalEmployees) * 100).toFixed(1) : '0.0';
  const vendorPct = totalEmployees > 0 ? ((vendorEmployees / totalEmployees) * 100).toFixed(1) : '0.0';
  const unclassifiedPct = totalEmployees > 0 ? ((unclassifiedEmployees / totalEmployees) * 100).toFixed(1) : '0.0';

  const chartData = [
    { name: 'Permanent Direct', value: permanentEmployees, pct: permanentPct, color: '#4D8EEB' },
    { name: 'Vendor Contract', value: vendorEmployees, pct: vendorPct, color: '#F58A3A' },
  ];

  if (unclassifiedEmployees > 0) {
    chartData.push({
      name: 'Unclassified',
      value: unclassifiedEmployees,
      pct: unclassifiedPct,
      color: '#9CA3AF',
    });
  }

  return (
    <Card className={`p-4 flex flex-col justify-between h-full min-h-[340px] ${className}`}>
      <div>
        <div className="flex items-center gap-2 mb-2 min-w-0">
          <Briefcase className="w-4 h-4 shrink-0" style={{ color: '#4D8EEB' }} aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Employment Type Distribution</h2>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-[220px] w-full rounded-lg my-1" />
        ) : totalEmployees === 0 ? (
          <div className="h-[220px] w-full my-1 flex flex-col items-center justify-center text-center p-2 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <Briefcase className="w-5 h-5 text-slate-400 mb-1 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Employment Data</p>
          </div>
        ) : (
          <div className="relative w-full h-[220px] flex items-center justify-center my-1">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={78}
                  dataKey="value"
                  stroke={sliceStroke}
                  strokeWidth={2}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
                  formatter={(val, name, item) => [`${val.toLocaleString()} (${item.payload.pct}%)`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="space-y-1.5 pt-2 border-t border-[var(--border)] text-[11px]">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
            <span className="w-2 h-2 rounded-full bg-[#4D8EEB]" />
            Permanent Direct:
          </span>
          <span className="font-extrabold text-[var(--text)] tabular-nums">
            {totalEmployees > 0 ? `${permanentEmployees.toLocaleString()} (${permanentPct}%)` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold text-[var(--text)]">
            <span className="w-2 h-2 rounded-full bg-[#F58A3A]" />
            Vendor Contract:
          </span>
          <span className="font-extrabold text-[var(--text)] tabular-nums">
            {totalEmployees > 0 ? `${vendorEmployees.toLocaleString()} (${vendorPct}%)` : '—'}
          </span>
        </div>
        {unclassifiedEmployees > 0 && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-[var(--secondary)]">
              <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
              Unclassified:
            </span>
            <span className="font-extrabold text-slate-500 tabular-nums">
              {`${unclassifiedEmployees.toLocaleString()} (${unclassifiedPct}%)`}
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}

export default EmploymentTypeCard;
