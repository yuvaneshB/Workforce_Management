import { Building2 } from 'lucide-react';
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

export const ALL_SIX_VENDORS = [
  { id: 'V01', code: 'V01', name: 'Sri Vignesh Manpower Services', assigned: 117, active: 117, resigned: 21, pct: 18.1 },
  { id: 'V02', code: 'V02', name: 'Kovai Talent Solutions', assigned: 110, active: 110, resigned: 9, pct: 17.0 },
  { id: 'V03', code: 'V03', name: 'Namma Workforce Pvt Ltd', assigned: 123, active: 123, resigned: 11, pct: 19.0 },
  { id: 'V04', code: 'V04', name: 'Anand Industrial Staffing', assigned: 108, active: 108, resigned: 13, pct: 16.7 },
  { id: 'V05', code: 'V05', name: 'Karnataka Skill Force', assigned: 134, active: 134, resigned: 17, pct: 20.7 },
  { id: 'V06', code: 'V06', name: 'Prime HR Outsourcing', assigned: 55, active: 55, resigned: 3, pct: 8.5 },
];

export function VendorWorkforceChart({
  selectedVendorId = '',
  workforceSummary = null,
  loading = false,
  hasData = false,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const totalVendorCount = workforceSummary?.vendor_count || 647;

  const chartData = hasData
    ? ALL_SIX_VENDORS.map((v) => {
        const isSelected = !selectedVendorId || selectedVendorId === v.id || selectedVendorId === v.code;
        const vendorRow = workforceSummary?.by_vendor?.find(
          (r) => r.key.toUpperCase() === v.id.toUpperCase()
        );
        const count = vendorRow ? vendorRow.count : v.assigned;
        const pct = totalVendorCount > 0 ? ((count / totalVendorCount) * 100).toFixed(1) : v.pct;
        return {
          ...v,
          assigned: count,
          active: count,
          pct: parseFloat(pct),
          shortLabel: v.code,
          fillActive: isSelected ? '#6F3DBA' : '#D1D5DB',
          fillAssigned: isSelected ? '#4D8EEB' : '#E5E7EB',
        };
      })
    : [];

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                Vendor-wise Workforce Distribution (6 Vendors)
              </h3>
              <p className="text-[11px] text-[var(--secondary)]">
                Assigned, active, resigned, and contribution share across 6 vendors
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-bold">
            <span className="flex items-center gap-1 text-[var(--secondary)]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#4D8EEB]" /> Assigned
            </span>
            <span className="flex items-center gap-1 text-[var(--secondary)]">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#6F3DBA]" /> Active
            </span>
          </div>
        </div>

        {/* Horizontal Bar Chart */}
        {!hasData || chartData.length === 0 ? (
          <div className="w-full h-[220px] flex flex-col items-center justify-center text-center p-4 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <Building2 className="w-6 h-6 text-slate-400 mb-2 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Vendor Workforce Records</p>
            <p className="text-[11px] text-[var(--secondary)] mt-0.5">
              Connect to FastAPI backend to view live vendor workforce distribution.
            </p>
          </div>
        ) : (
          <div className="w-full h-[220px]">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 5, right: 24, left: 10, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={palette.grid} />
                <XAxis
                  type="number"
                  domain={[0, 160]}
                  ticks={[0, 40, 80, 120, 160]}
                  tick={{ fill: palette.axisText, fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: palette.grid }}
                />
                <YAxis
                  type="category"
                  dataKey="code"
                  width={55}
                  tick={{ fill: palette.axisText, fontSize: 10, fontWeight: 700 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0]?.payload;
                    return (
                      <div
                        className="p-2.5 rounded-xl shadow-lg border text-xs space-y-1"
                        style={{
                          backgroundColor: palette.tooltipBg,
                          borderColor: palette.tooltipBorder,
                          color: palette.tooltipText,
                        }}
                      >
                        <div className="font-bold text-[11px] text-[var(--brand-purple)]">
                          {item.code}: {item.name}
                        </div>
                        <div className="flex justify-between gap-4 text-[11px]">
                          <span>Assigned Employees:</span>
                          <span className="font-bold">{item.assigned}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-[11px]">
                          <span>Active Employees:</span>
                          <span className="font-bold text-emerald-600">{item.active}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-[11px]">
                          <span>Resigned Employees:</span>
                          <span className="font-bold">{item.resigned}</span>
                        </div>
                        <div className="flex justify-between gap-4 text-[11px] pt-1 border-t border-[var(--border)]">
                          <span>Workforce Share:</span>
                          <span className="font-black">{item.pct}%</span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="assigned" name="Assigned" fill="#4D8EEB" radius={[0, 4, 4, 0]} barSize={10} />
                <Bar dataKey="active" name="Active" fill="#6F3DBA" radius={[0, 4, 4, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Summary Footer of All 6 Vendors */}
      {hasData && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-[var(--border)] text-[10px]">
          {ALL_SIX_VENDORS.map((v) => (
            <div key={v.id} className="bg-[var(--muted-fill)]/50 rounded-lg p-1.5 border border-[var(--border)]/60">
              <div className="font-extrabold text-[var(--text)] truncate" title={v.name}>
                {v.code}
              </div>
              <div className="text-[var(--secondary)] truncate text-[9px]">{v.name}</div>
              <div className="flex items-center justify-between mt-1">
                <span className="font-black text-[var(--text)]">{v.active} active</span>
                <span className="text-[9px] font-bold text-[var(--brand-purple)]">{v.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
