import { PieChart as PieIcon } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function EmploymentTypeDistribution({
  workforceSummary = null,
  employmentType = '',
  vendorId = '',
  loading = false,
  variant = 'pie',
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
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
    {
      name: 'Permanent Staff',
      shortName: 'Permanent',
      value: permanentCount,
      pct: permanentPct,
      color: '#4D8EEB',
    },
    {
      name: 'Vendor Employees',
      shortName: 'Vendor',
      value: vendorCount,
      pct: vendorPct,
      color: '#F58A3A',
    },
  ];

  // Custom label renderer with bold, colored text matching the slice
  const renderCustomLabel = ({
    x,
    y,
    textAnchor,
    payload,
  }) => {
    const labelText = `${payload.shortName}: ${payload.pct}%`;
    return (
      <text
        x={x}
        y={y}
        fill={payload.color}
        textAnchor={textAnchor}
        dominantBaseline="central"
        style={{
          fontWeight: 700,
          fontSize: '11px',
        }}
      >
        {labelText}
      </text>
    );
  };

  // Custom leader line matching the slice color
  const renderLabelLine = (props) => {
    const { points, payload } = props;
    if (!points || points.length < 2) return null;
    const strokeColor = payload?.color || (isDark ? '#8D97AE' : '#7C839B');
    const path = points.reduce((acc, p, i) => `${acc}${i === 0 ? 'M' : 'L'}${p.x},${p.y}`, '');
    return (
      <path
        d={path}
        stroke={strokeColor}
        strokeWidth={1.5}
        fill="none"
        strokeLinecap="round"
      />
    );
  };

  const sliceStroke = isDark ? (palette.surface || '#192235') : '#FFFFFF';

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
          <PieIcon className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
          Permanent vs Vendor
        </h3>
      </div>

      {/* Main Chart Body */}
      {loading && effectiveTotal === 0 ? (
        <div className="h-[220px] w-full flex items-center justify-center">
          <LoadingSkeleton className="h-44 w-44 rounded-full" />
        </div>
      ) : effectiveTotal === 0 ? (
        <div className="h-[220px] w-full flex flex-col items-center justify-center text-center p-3 text-[var(--secondary)]">
          <PieIcon className="w-6 h-6 mb-1 text-[var(--secondary)]/50" />
          <span className="text-xs font-semibold">No workforce data</span>
          <span className="text-[10px] mt-0.5">Connect backend to view live breakdown</span>
        </div>
      ) : variant === 'pie' ? (
        <div className="w-full flex-1 min-h-[220px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart margin={{ top: 12, right: 32, bottom: 12, left: 32 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={0}
                outerRadius={68}
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                label={renderCustomLabel}
                labelLine={renderLabelLine}
                stroke={sliceStroke}
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
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
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="font-bold text-[11px]">{item.name}:</span>
                        <span className="font-extrabold text-[11px]">
                          {item.value.toLocaleString()} ({item.pct}%)
                        </span>
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        /* Fallback Donut variant if ever requested */
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
  );
}
