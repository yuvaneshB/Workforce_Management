import { Factory } from 'lucide-react';
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

export function VendorAttritionCard({ data = null, loading = false }) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const sourceData = (data && Array.isArray(data) ? data : []).map((v) => ({
    ...v,
    shortVendor: v.vendor_id || (v.vendor.includes('(') ? v.vendor.split('(')[1].replace(')', '') : v.vendor.slice(0, 8)),
  }));

  const totalVendorExits = sourceData.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const highestVendor = sourceData.find((v) => v.vendor_id !== null) || sourceData[0];

  return (
    <Card className="p-4 lg:col-span-5 flex flex-col justify-between min-h-[260px] border border-[var(--border)] shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Factory className="w-4 h-4 shrink-0 text-purple-600" aria-hidden="true" />
            <h2 className="text-[12px] sm:text-[13px] font-bold whitespace-nowrap text-[var(--text)]">
              Vendor-wise Attrition
            </h2>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : totalVendorExits === 0 ? (
          <div className="h-44 w-full my-1 flex flex-col items-center justify-center text-center p-4 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <Factory className="w-6 h-6 text-emerald-500 mb-2 opacity-80" />
            <p className="text-xs font-bold text-[var(--text)]">0 Vendor Exits</p>
            <p className="text-[11px] text-[var(--secondary)] mt-0.5">
              100% contractor workforce retention across all vendors.
            </p>
          </div>
        ) : (
          <div className="h-44 w-full my-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sourceData}
                margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                barSize={28}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke={palette.grid}
                />
                <XAxis
                  dataKey="shortVendor"
                  stroke={palette.axis}
                  tick={{ fill: palette.text, fontSize: 10, fontWeight: 700 }}
                  axisLine={{ stroke: palette.grid }}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 25]}
                  ticks={[0, 5, 10, 15, 20, 25]}
                  stroke={palette.axis}
                  tick={{ fill: palette.text, fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: 'No. of Exits',
                    angle: -90,
                    position: 'insideLeft',
                    offset: 28,
                    style: { fontSize: '9px', fill: 'var(--secondary)' },
                  }}
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
                    `${val} exits (${item?.payload?.pct || ''})`,
                    item?.payload?.vendor || name,
                  ]}
                />
                <Bar
                  dataKey="count"
                  fill="#493287"
                  radius={[5, 5, 0, 0]}
                >
                  <LabelList
                    dataKey="count"
                    position="top"
                    style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      fill: 'var(--text)',
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--secondary)]">
        <span>Vendor Concentration</span>
        <span className="font-bold text-amber-600">
          {highestVendor ? `${highestVendor.vendor} (${highestVendor.count} exits)` : '0 Vendor Exits'}
        </span>
      </div>
    </Card>
  );
}

