import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
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

const SHIFT_BAR_COLORS = ['#493287', '#4D8EEB', '#F58A3A'];

const SHIFT_NAMES = {
  A: 'GS1',
  B: 'S2',
  C: 'NS3',
};

export function OvertimeOverviewCard({
  overtimeAnalytics = null,
  loading = false,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const shiftWise = overtimeAnalytics?.shift_wise || [];

  const data = shiftWise.map((item) => ({
    shift: SHIFT_NAMES[item.shift_id] || `Shift ${item.shift_id}`,
    hours: Math.round(item.overtime_hours),
  }));

  return (
    <Card className="p-3.5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[13px] font-bold text-[var(--text)]">
          Overtime Overview
        </h2>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-40 w-full rounded-lg" />
      ) : data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-xs text-[var(--secondary)]">
          No overtime data available
        </div>
      ) : (
        <div className="h-40 w-full" style={{ minHeight: 160 }}>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart
              data={data}
              margin={{ top: 18, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
              <XAxis
                dataKey="shift"
                stroke={palette.axisText}
                fontSize={10}
                tickLine={false}
              />
              <YAxis
                stroke={palette.axisText}
                fontSize={10}
                domain={[0, 'auto']}
                tickLine={false}
              />
              <Tooltip
                formatter={(val) => [`${val.toLocaleString()} hrs`, 'Overtime']}
                contentStyle={{
                  backgroundColor: palette.tooltipBg,
                  borderColor: palette.tooltipBorder,
                  color: palette.tooltipText,
                  fontSize: '11px',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="hours" radius={[4, 4, 0, 0]} maxBarSize={38}>
                <LabelList
                  dataKey="hours"
                  position="top"
                  formatter={(v) => v.toLocaleString()}
                  fontSize={10}
                  fontWeight={700}
                  fill={theme === 'dark' ? '#F1F5F9' : '#0F1E3D'}
                  offset={4}
                />
                {data.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={SHIFT_BAR_COLORS[index % SHIFT_BAR_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

