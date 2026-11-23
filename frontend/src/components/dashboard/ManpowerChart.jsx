import { ChartNoAxesColumnIncreasing } from 'lucide-react';
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
import { EmptyState } from '../common/EmptyState';
import { StatusBadge } from '../common/StatusBadge';

export function ManpowerChart({ data = [] }) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  return (
    <Card className="p-5 xl:col-span-3">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-bold text-xs">Manpower demand vs. supply</h3>
          <p className="text-[10px] muted mt-1">
            Compare required and available workforce by operation.
          </p>
        </div>
        <StatusBadge background="var(--blue-soft)" color="#4D8EEB">
          Analytics
        </StatusBadge>
      </div>

      {data.length > 0 ? (
        <div className="h-52 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
              <XAxis dataKey="operation" stroke={palette.axisText} fontSize={10} />
              <YAxis stroke={palette.axisText} fontSize={10} />
              <Tooltip
                contentStyle={{
                  backgroundColor: palette.tooltipBg,
                  borderColor: palette.tooltipBorder,
                  color: palette.tooltipText,
                  fontSize: '11px',
                  borderRadius: '8px',
                }}
              />
              <Bar dataKey="demand" fill={palette.demand} radius={[6, 6, 0, 0]} />
              <Bar dataKey="supply" fill={palette.supply} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-52 mt-4 rounded-lg chart-grid flex items-center justify-center">
          <EmptyState
            icon={ChartNoAxesColumnIncreasing}
            title="Chart will appear when data is connected"
            description="No workforce figures are being simulated."
          />
        </div>
      )}
    </Card>
  );
}

