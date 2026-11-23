import { Users } from 'lucide-react';
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

const UTILIZATION_DATA = [
  { shift: 'GS1', required: 5300, available: 5200, present: 5047 },
  { shift: 'S2', required: 5300, available: 5200, present: 5052 },
  { shift: 'NS3', required: 5300, available: 5200, present: 5040 },
];

export function WorkforceUtilizationCard({
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  return (
    <Card className="p-4 lg:col-span-3 flex flex-col justify-between min-h-[250px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Users className="w-4 h-4 shrink-0 text-[#4D8EEB]" aria-hidden="true" />
            <h2 className="text-[12px] sm:text-[13px] font-bold whitespace-nowrap">
              Workforce Utilization
            </h2>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-40 w-full rounded-lg" />
        ) : (
          <div className="h-40 w-full my-1">
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={UTILIZATION_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis
                  dataKey="shift"
                  stroke={palette.axisText}
                  fontSize={10}
                  tickLine={false}
                />
                <YAxis
                  stroke={palette.axisText}
                  fontSize={8}
                  tickFormatter={(val) => `${val / 1000}K`}
                  domain={[0, 7500]}
                  ticks={[0, 2500, 5000, 7500]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val, name) => [`${val.toLocaleString()} staff`, name]}
                />
                <Bar dataKey="required" name="Required Staff" fill="#4D8EEB" radius={[2, 2, 0, 0]} barSize={10} />
                <Bar dataKey="available" name="Available Staff" fill="#6F3DBA" radius={[2, 2, 0, 0]} barSize={10} />
                <Bar dataKey="present" name="Present Staff" fill="#0E9C86" radius={[2, 2, 0, 0]} barSize={10} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 pt-2 border-t border-[var(--border)] text-[8.5px]">
        <span className="flex items-center gap-1 font-bold text-[var(--text)]">
          <span className="w-1.5 h-1.5 rounded-sm bg-[#4D8EEB]" /> Required
        </span>
        <span className="flex items-center gap-1 font-bold text-[var(--text)]">
          <span className="w-1.5 h-1.5 rounded-sm bg-[#6F3DBA]" /> Available
        </span>
        <span className="flex items-center gap-1 font-bold text-[var(--text)]">
          <span className="w-1.5 h-1.5 rounded-sm bg-[#0E9C86]" /> Present
        </span>
      </div>
    </Card>
  );
}

