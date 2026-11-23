import { PieChart as PieIcon } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';

export function EmploymentTypeDistribution({
  workforceSummary = null,
  employmentType = '',
  vendorId = '',
  loading = false,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  let permanentCount = workforceSummary?.permanent_count ?? 0;
  let vendorCount = workforceSummary?.vendor_count ?? 0;

  if (vendorId) {
    permanentCount = 0;
    const vendorRow = workforceSummary?.by_vendor?.find(
      (v) => v.key.toUpperCase() === vendorId.toUpperCase()
    );
    if (vendorRow) {
      vendorCount = vendorRow.count;
    }
  } else if (employmentType) {
    if (employmentType.toLowerCase() === 'permanent') {
      vendorCount = 0;
    } else if (employmentType.toLowerCase() === 'vendor') {
      permanentCount = 0;
    }
  }

  const effectiveTotal = permanentCount + vendorCount;
  const vendorPct = effectiveTotal > 0 ? ((vendorCount / effectiveTotal) * 100).toFixed(1) : '0.0';
  const permanentPct = effectiveTotal > 0 ? ((permanentCount / effectiveTotal) * 100).toFixed(1) : '0.0';

  const data = [
    { name: 'Vendor Contract', value: vendorCount, pct: vendorPct, color: '#F58A3A' },
    { name: 'Permanent Direct', value: permanentCount, pct: permanentPct, color: '#4D8EEB' },
  ];

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
            <PieIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
              Permanent vs Vendor
            </h3>
            <p className="text-[11px] text-[var(--secondary)]">
              Workforce employment composition donut
            </p>
          </div>
        </div>

        {/* Donut Chart with center metric */}
        {effectiveTotal === 0 ? (
          <div className="h-[170px] w-full flex flex-col items-center justify-center text-center p-3 text-[var(--secondary)]">
            <PieIcon className="w-6 h-6 mb-1 text-[var(--secondary)]/50" />
            <span className="text-xs font-semibold">No workforce data</span>
            <span className="text-[10px] mt-0.5">Connect backend to view live breakdown</span>
          </div>
        ) : (
          <div className="relative w-full h-[170px] flex items-center justify-center my-1">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={74}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0]?.payload;
                    return (
                      <div
                        className="p-2 rounded-xl shadow-md border text-xs"
                        style={{
                          backgroundColor: palette.tooltipBg,
                          borderColor: palette.tooltipBorder,
                          color: palette.tooltipText,
                        }}
                      >
                        <span className="font-extrabold">{item.name}</span>: {item.value} workers ({item.pct}%)
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Callout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-lg font-black text-[var(--text)] leading-none">
                {effectiveTotal}
              </span>
              <span className="text-[9px] font-bold text-[var(--secondary)] uppercase tracking-wider mt-0.5">
                Workforce
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Breakdown Legends */}
      <div className="space-y-1.5 pt-2 border-t border-[var(--border)] text-xs">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold text-[var(--text)] text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#F58A3A]" />
            Vendor Employees:
          </span>
          <span className="font-extrabold text-[11px] text-[var(--text)]">
            {effectiveTotal > 0 ? `${vendorCount} (${vendorPct}%)` : '—'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-semibold text-[var(--secondary)] text-[11px]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4D8EEB]" />
            Permanent Staff:
          </span>
          <span className="font-extrabold text-[11px] text-[var(--secondary)]">
            {effectiveTotal > 0 ? `${permanentCount} (${permanentPct}%)` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
