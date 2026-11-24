import { Building2 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export const ALL_SIX_VENDORS = [
  { id: 'V01', code: 'V01', name: 'Sri Vignesh Manpower Services', assigned: 117, active: 117, resigned: 21, pct: 18.1 },
  { id: 'V02', code: 'V02', name: 'Kovai Talent Solutions', assigned: 110, active: 110, resigned: 9, pct: 17.0 },
  { id: 'V03', code: 'V03', name: 'Namma Workforce Pvt Ltd', assigned: 123, active: 123, resigned: 11, pct: 19.0 },
  { id: 'V04', code: 'V04', name: 'Anand Industrial Staffing', assigned: 108, active: 108, resigned: 13, pct: 16.7 },
  { id: 'V05', code: 'V05', name: 'Karnataka Skill Force', assigned: 134, active: 134, resigned: 17, pct: 20.7 },
  { id: 'V06', code: 'V06', name: 'Prime HR Outsourcing', assigned: 55, active: 55, resigned: 3, pct: 8.5 },
];

export const VENDOR_PALETTE = [
  {
    name: 'red',
    lightTop: '#F87171',
    lightBottom: '#DC2626',
    darkTop: '#FCA5A5',
    darkBottom: '#B91C1C',
    main: '#EF4444',
  },
  {
    name: 'orange',
    lightTop: '#FB923C',
    lightBottom: '#EA580C',
    darkTop: '#FDBA74',
    darkBottom: '#C2410C',
    main: '#F97316',
  },
  {
    name: 'teal',
    lightTop: '#2DD4BF',
    lightBottom: '#0D9488',
    darkTop: '#5EEAD4',
    darkBottom: '#0F766E',
    main: '#14B8A6',
  },
  {
    name: 'blue',
    lightTop: '#60A5FA',
    lightBottom: '#2563EB',
    darkTop: '#93C5FD',
    darkBottom: '#1D4ED8',
    main: '#3B82F6',
  },
  {
    name: 'purple',
    lightTop: '#C084FC',
    lightBottom: '#9333EA',
    darkTop: '#D8B4FE',
    darkBottom: '#7E22CE',
    main: '#A855F7',
  },
  {
    name: 'green',
    lightTop: '#4ADE80',
    lightBottom: '#16A34A',
    darkTop: '#86EFAC',
    darkBottom: '#15803D',
    main: '#22C55E',
  },
];

export function VendorWorkforceChart({
  selectedVendorId = '',
  workforceSummary = null,
  loading = false,
  hasData = false,
  variant = 'columns',
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const totalVendorCount = workforceSummary?.vendor_count ?? 0;

  const chartData = hasData
    ? ALL_SIX_VENDORS.map((v, index) => {
        const vendorRow = workforceSummary?.by_vendor?.find(
          (r) => r.key.toUpperCase() === v.id.toUpperCase()
        );
        const count = vendorRow ? vendorRow.count : 0;
        const pct = totalVendorCount > 0 ? ((count / totalVendorCount) * 100).toFixed(1) : '0.0';
        const pal = VENDOR_PALETTE[index % VENDOR_PALETTE.length];
        return {
          ...v,
          active: count,
          pct: parseFloat(pct),
          color: pal.main,
          palIndex: index,
        };
      })
    : [];

  // Custom label renderer placed right on top of each rising column
  const renderCustomBarLabel = (props) => {
    const { x, y, width, index } = props;
    const item = chartData[index];
    if (!item) return null;
    const color = item.color || (isDark ? '#A78BFA' : '#6F3DBA');
    return (
      <text
        x={x + width / 2}
        y={y - 8}
        fill={color}
        textAnchor="middle"
        style={{
          fontWeight: 800,
          fontSize: '11px',
          letterSpacing: '-0.02em',
        }}
      >
        {item.pct}%
      </text>
    );
  };

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
          <Building2 className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
          Vendor-wise Workforce Distribution
        </h3>
      </div>

      {/* Main Chart Body */}
      {loading && chartData.length === 0 ? (
        <div className="flex-1 w-full min-h-[260px] flex items-center justify-center">
          <LoadingSkeleton className="h-56 w-full rounded-xl" />
        </div>
      ) : !hasData || chartData.length === 0 || totalVendorCount === 0 ? (
        <div className="flex-1 w-full min-h-[260px] flex flex-col items-center justify-center text-center p-4 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
          <Building2 className="w-6 h-6 text-slate-400 mb-2 opacity-60" />
          <p className="text-xs font-bold text-[var(--text)]">No Vendor Workforce Records</p>
          <p className="text-[11px] text-[var(--secondary)] mt-0.5">
            {totalVendorCount === 0
              ? 'No vendor employees match the selected filters.'
              : 'Connect to FastAPI backend to view live vendor workforce distribution.'}
          </p>
        </div>
      ) : (
        <div className="flex-1 w-full min-h-[260px] flex items-center">
          <ResponsiveContainer width="100%" height={270}>
            <BarChart
              data={chartData}
              margin={{ top: 24, right: 16, left: -14, bottom: 4 }}
              barCategoryGap="20%"
            >
              <defs>
                {VENDOR_PALETTE.map((pal, idx) => (
                  <linearGradient
                    key={`vendor-grad-${idx}`}
                    id={`vendor-grad-${idx}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={isDark ? pal.darkTop : pal.lightTop}
                      stopOpacity={1}
                    />
                    <stop
                      offset="100%"
                      stopColor={isDark ? pal.darkBottom : pal.lightBottom}
                      stopOpacity={0.92}
                    />
                  </linearGradient>
                ))}
                <filter id="bar-3d-shadow" x="-10%" y="-10%" width="120%" height="120%">
                  <feDropShadow
                    dx="0"
                    dy="3"
                    stdDeviation="3"
                    floodOpacity={isDark ? '0.35' : '0.15'}
                  />
                </filter>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                horizontal={true}
                stroke={palette.grid}
              />

              <XAxis
                dataKey="code"
                tick={{ fill: palette.axisText, fontSize: 11, fontWeight: 700 }}
                tickLine={false}
                axisLine={{ stroke: palette.grid }}
                interval={0}
              />

              <YAxis
                domain={[0, (dataMax) => (dataMax > 0 ? Math.ceil(dataMax * 1.2) : 160)]}
                tick={{ fill: palette.axisText, fontSize: 10, fontWeight: 500 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />

              <Tooltip
                cursor={{ fill: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)' }}
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
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-extrabold text-[11.5px] text-[var(--text)]">
                          {item.name}:
                        </span>
                        <span className="font-extrabold text-[11.5px] text-[var(--text)]">
                          {item.active} active ({item.pct}%)
                        </span>
                      </div>
                    </div>
                  );
                }}
              />

              <Bar
                dataKey="active"
                radius={[6, 6, 0, 0]}
                maxBarSize={46}
                label={renderCustomBarLabel}
                filter="url(#bar-3d-shadow)"
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${entry.id}`}
                    fill={`url(#vendor-grad-${index % VENDOR_PALETTE.length})`}
                    stroke={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.06)'}
                    strokeWidth={1}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default VendorWorkforceChart;
