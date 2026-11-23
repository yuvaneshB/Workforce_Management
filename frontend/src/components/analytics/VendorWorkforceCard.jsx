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
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function VendorWorkforceCard({
  vendorData = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const items = !error && vendorData?.items ? vendorData.items : [];
  const totalVendorWorkforce = vendorData?.total_vendor_workforce ?? 647;
  const totalActiveVendor = vendorData?.total_active_vendor_workforce ?? 573;
  const totalPermanent = vendorData?.total_permanent_workforce ?? 1053;
  const totalWorkforce = vendorData?.total_workforce ?? 1700;

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col justify-between min-h-[220px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 shrink-0" style={{ color: '#6F3DBA' }} aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Vendor-wise Workforce Distribution</h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-[9px] font-bold">
              <span className="flex items-center gap-1 text-[var(--secondary)]">
                <span className="w-2 h-2 rounded-sm bg-[#4D8EEB]" /> Assigned
              </span>
              <span className="flex items-center gap-1 text-[var(--secondary)]">
                <span className="w-2 h-2 rounded-sm bg-[#6F3DBA]" /> Active
              </span>
            </div>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-32 w-full rounded-lg" />
        ) : items.length === 0 ? (
          <div className="h-32 w-full my-1 flex flex-col items-center justify-center text-center p-2 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <Building2 className="w-5 h-5 text-slate-400 mb-1 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">No Vendor Data</p>
            <p className="text-[10px] text-[var(--secondary)] mt-0.5">
              Connect to FastAPI backend to view live vendor workforce.
            </p>
          </div>
        ) : (
          <div className="h-32 w-full my-1">
            <ResponsiveContainer width="100%" height={128}>
              <BarChart
                layout="vertical"
                data={items}
                margin={{ top: 2, right: 15, left: -15, bottom: 2 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={palette.grid} />
                <XAxis
                  type="number"
                  domain={[0, 160]}
                  ticks={[0, 40, 80, 120, 160]}
                  stroke={palette.axisText}
                  fontSize={9}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="vendor_id"
                  width={40}
                  stroke={palette.axisText}
                  fontSize={9}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
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
                    `${val} workers (${name === 'Assigned' ? `${item.payload.percentage}% vendor share` : `${item.payload.active_count} active`})`,
                    `${item.payload.vendor_name} (${item.payload.vendor_id})`,
                  ]}
                />
                <Bar dataKey="assigned_count" name="Assigned" fill="#4D8EEB" radius={[0, 3, 3, 0]} barSize={6} />
                <Bar dataKey="active_count" name="Active" fill="#6F3DBA" radius={[0, 3, 3, 0]} barSize={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
          <div className="grid grid-cols-6 gap-1 text-[9px] text-center">
            {items.map((v) => (
              <div
                key={v.vendor_id}
                className="bg-[var(--muted-fill)]/50 rounded p-1 border border-[var(--border)]/60"
                title={`${v.vendor_name} - Assigned: ${v.assigned_count}, Active: ${v.active_count}`}
              >
                <div className="font-extrabold text-[var(--text)] truncate">{v.vendor_id}</div>
                <div className="font-black text-[#6F3DBA]">{v.active_count}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-[10px] text-[var(--secondary)] pt-0.5">
            <span>Vendor: <strong className="text-[var(--text)]">{totalVendorWorkforce.toLocaleString()} ({totalActiveVendor.toLocaleString()} active)</strong></span>
            <span>Permanent: <strong className="text-[var(--text)]">{totalPermanent.toLocaleString()}</strong></span>
            <span>Total: <strong className="text-[var(--text)]">{totalWorkforce.toLocaleString()}</strong></span>
          </div>
        </div>
      )}
    </Card>
  );
}
