import { BarChart3 } from 'lucide-react';
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

const SHIFT_PROD_DATA = [
  { shift: 'GS1', target: 971326, actual: 810814 },
  { shift: 'S2', target: 971326, actual: 805188 },
  { shift: 'NS3', target: 971326, actual: 808182 },
];

export function ShiftProductionOutputCard({
  data = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawShifts = !error ? (data?.items ?? []) : [];
  let chartData = [...SHIFT_PROD_DATA];

  if (rawShifts.length > 0) {
    const shiftCodeMap = { A: 'GS1', B: 'S2', C: 'NS3' };
    chartData = rawShifts.map((s) => ({
      shift: shiftCodeMap[s.shift_id] || s.shift_id,
      target: s.target_qty || 971326,
      actual: s.actual_qty || 810000,
    }));
  }

  return (
    <Card className="p-4 lg:col-span-3 flex flex-col justify-between min-h-[250px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <BarChart3 className="w-4 h-4 shrink-0 text-[#4D8EEB]" aria-hidden="true" />
            <h2 className="text-[12px] sm:text-[13px] font-bold whitespace-nowrap">
              Shift Production Output Comparison
            </h2>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-40 w-full rounded-lg" />
        ) : (
          <div className="h-40 w-full my-1">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis
                  dataKey="shift"
                  stroke={palette.axisText}
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  stroke={palette.axisText}
                  fontSize={9}
                  tickFormatter={(val) => `${val / 1000}K`}
                  domain={[0, 1000000]}
                  ticks={[0, 250000, 500000, 750000, 1000000]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val, name) => [`${val.toLocaleString()} units`, name]}
                />
                <Bar dataKey="target" name="Target Planned" fill="#7C839B" radius={[3, 3, 0, 0]} barSize={16} />
                <Bar dataKey="actual" name="Actual Output" fill="#4D8EEB" radius={[3, 3, 0, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 pt-2 border-t border-[var(--border)] text-[9px]">
        <span className="flex items-center gap-1 font-bold text-[var(--text)]">
          <span className="w-2 h-2 rounded-sm bg-[#7C839B]" /> Target Planned
        </span>
        <span className="flex items-center gap-1 font-bold text-[var(--text)]">
          <span className="w-2 h-2 rounded-sm bg-[#4D8EEB]" /> Actual Output
        </span>
      </div>
    </Card>
  );
}

