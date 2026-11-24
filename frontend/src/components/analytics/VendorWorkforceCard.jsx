import { Building2 } from 'lucide-react';
import {
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const VENDOR_COLORS = {
  V01: '#6F3DBA',
  V02: '#4D8EEB',
  V03: '#0E9C86',
  V04: '#F58A3A',
  V05: '#E45C72',
  V06: '#8B5CF6',
};

const FALLBACK_PALETTE = ['#6F3DBA', '#4D8EEB', '#0E9C86', '#F58A3A', '#E45C72', '#8B5CF6'];

export function VendorWorkforceCard({
  vendorData = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawItems = !error && vendorData?.items ? vendorData.items : [];
  const items = rawItems.filter((v) => (v.active_count || 0) > 0 || (v.assigned_count || 0) > 0);

  const totalActive = items.reduce((acc, v) => acc + (v.active_count || 0), 0);

  // Ranked vendor list sorted descending by active_count
  const rankedVendors = [...items]
    .sort((a, b) => (b.active_count || 0) - (a.active_count || 0))
    .map((v, idx) => ({
      ...v,
      fill: VENDOR_COLORS[v.vendor_id] || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length],
      pct: totalActive > 0 ? ((v.active_count / totalActive) * 100).toFixed(1) : '0.0',
    }));

  // Recharts RadialBarChart stacks concentric rings based on array order
  // Reverse so the highest count is on the outer ring
  const radialData = [...rankedVendors].reverse();

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="p-2.5 rounded-lg text-xs shadow-lg border"
          style={{
            backgroundColor: palette.tooltipBg,
            borderColor: palette.tooltipBorder,
            color: palette.tooltipText,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.fill }} />
            <span className="font-bold">{data.vendor_name} ({data.vendor_id})</span>
          </div>
          <p className="text-[11px] font-semibold">
            {data.active_count.toLocaleString()} active workers ({data.pct}%)
          </p>
          {data.assigned_count != null && (
            <p className="text-[10px] muted mt-0.5">
              Assigned: {data.assigned_count.toLocaleString()} total
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 flex flex-col h-full min-h-[340px]">
      {/* Single clean line header - no subtitles, no overlapping legends */}
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 shrink-0" style={{ color: '#6F3DBA' }} aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold truncate">Vendor-wise Workforce Distribution</h2>
        </div>
        {totalActive > 0 && !loading && (
          <span className="text-[11px] font-bold text-[var(--secondary)] shrink-0">
            {totalActive.toLocaleString()} Active Total
          </span>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton className="h-[280px] w-full rounded-lg flex-1" />
      ) : items.length === 0 ? (
        <div className="h-[280px] flex-1 flex items-center justify-center">
          <EmptyState
            icon={Building2}
            title="No Vendor Data"
            description="Vendor workforce records will appear here."
          />
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 flex-1 h-[280px] w-full">
          {/* Concentric rings RadialBarChart */}
          <div className="w-full sm:w-[50%] h-[260px] flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height={260}>
              <RadialBarChart
                cx="50%"
                cy="50%"
                innerRadius="20%"
                outerRadius="95%"
                barSize={10}
                data={radialData}
                startAngle={90}
                endAngle={-270}
              >
                <RadialBar
                  background={{ fill: theme === 'dark' ? '#1e293b' : '#f1f5f9' }}
                  dataKey="active_count"
                  cornerRadius={6}
                />
                <Tooltip content={<CustomTooltip />} />
              </RadialBarChart>
            </ResponsiveContainer>
          </div>

          {/* Compact ranked list to the right */}
          <div className="w-full sm:w-[50%] flex flex-col justify-center space-y-2.5 px-1 py-1">
            {rankedVendors.map((v) => (
              <div
                key={v.vendor_id}
                className="flex items-center justify-between gap-2 text-xs py-1 px-2 rounded-lg transition-colors hover:bg-[var(--muted-fill)]/60"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: v.fill }}
                  />
                  <div className="min-w-0 flex-1 leading-tight">
                    <span className="font-bold text-[var(--foreground)] mr-1.5 text-[11px]">
                      {v.vendor_id}
                    </span>
                    <span className="text-[11px] text-[var(--secondary)] break-words">
                      {v.vendor_name}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <span className="font-bold text-[var(--foreground)] text-[12px]">
                    {v.active_count.toLocaleString()}
                  </span>
                  <span className="text-[10px] muted ml-1 font-medium">({v.pct}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
