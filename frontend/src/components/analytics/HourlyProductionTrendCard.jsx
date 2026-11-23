import { Clock } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const HOURLY_PROD_DATA = [
  { hour: '06:00', GS1: 85000, S2: 78000, NS3: 82000 },
  { hour: '08:00', GS1: 110000, S2: 95000, NS3: 102000 },
  { hour: '10:00', GS1: 135000, S2: 120000, NS3: 128000 },
  { hour: '12:00', GS1: 145000, S2: 130000, NS3: 138000 },
  { hour: '14:00', GS1: 165000, S2: 152000, NS3: 158000 },
  { hour: '16:00', GS1: 190000, S2: 178000, NS3: 182000 }, // Peak
  { hour: '18:00', GS1: 160000, S2: 145000, NS3: 152000 },
  { hour: '20:00', GS1: 130000, S2: 120000, NS3: 125000 },
  { hour: '22:00', GS1: 105000, S2: 98000, NS3: 102000 },
];

export function HourlyProductionTrendCard({
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
            <Clock className="w-4 h-4 shrink-0 text-[#06B6D4]" aria-hidden="true" />
            <h2 className="text-[12px] sm:text-[13px] font-bold whitespace-nowrap">
              Hourly Production Trend
            </h2>
          </div>
          <span className="text-[9px] font-bold text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-200 dark:border-cyan-800 shrink-0">
            Peak: 16:00
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-40 w-full rounded-lg" />
        ) : (
          <div className="h-40 w-full my-1">
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={HOURLY_PROD_DATA} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis
                  dataKey="hour"
                  stroke={palette.axisText}
                  fontSize={8}
                  tickLine={false}
                />
                <YAxis
                  stroke={palette.axisText}
                  fontSize={8}
                  tickFormatter={(val) => `${val / 1000}K`}
                  domain={[0, 200000]}
                  ticks={[0, 50000, 100000, 150000, 200000]}
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
                <Line
                  type="monotone"
                  dataKey="GS1"
                  name="GS1"
                  stroke="#4D8EEB"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="S2"
                  name="S2"
                  stroke="#6F3DBA"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
                <Line
                  type="monotone"
                  dataKey="NS3"
                  name="NS3"
                  stroke="#06B6D4"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-4 pt-2 border-t border-[var(--border)] text-[9px]">
        <span className="flex items-center gap-1 font-bold text-[var(--text)]">
          <span className="w-2 h-2 rounded-full bg-[#4D8EEB]" /> GS1
        </span>
        <span className="flex items-center gap-1 font-bold text-[var(--text)]">
          <span className="w-2 h-2 rounded-full bg-[#6F3DBA]" /> S2
        </span>
        <span className="flex items-center gap-1 font-bold text-[var(--text)]">
          <span className="w-2 h-2 rounded-full bg-[#06B6D4]" /> NS3
        </span>
      </div>
    </Card>
  );
}

