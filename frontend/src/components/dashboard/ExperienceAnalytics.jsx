import { BarChart3 } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const ORDER_MAP = {
  '0–1 Years': 1,
  '0-1 Years': 1,
  '1–3 Years': 2,
  '1-3 Years': 2,
  '3–5 Years': 3,
  '3-5 Years': 3,
  '5–7 Years': 4,
  '5-7 Years': 4,
  'Above 7 Years': 5,
  'Above 7': 5,
};

export function ExperienceAnalytics({
  experienceAnalytics = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawItems = !error ? (experienceAnalytics?.items ?? []) : [];
  const hasAnyCount = rawItems.some((i) => (i.employee_count || 0) > 0);

  // Logical sort: 0-1, 1-3, 3-5, 5-7, Above 7
  const sorted = [...rawItems].sort(
    (a, b) => (ORDER_MAP[a.category] || 99) - (ORDER_MAP[b.category] || 99)
  );

  const totalHeadcount = sorted.reduce((acc, i) => acc + (i.employee_count || 0), 0);

  let cumulative = 0;
  const chartData = sorted.map((item) => {
    cumulative += item.employee_count || 0;
    const cumPct = totalHeadcount > 0 ? Number(((cumulative / totalHeadcount) * 100).toFixed(1)) : 0;
    return {
      category: item.category,
      employee_count: item.employee_count || 0,
      cumPct,
    };
  });

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
          <p className="font-bold mb-1 text-[var(--foreground)]">{data.category}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-[#6F3DBA]">
            <span className="w-2 h-2 rounded-full bg-[#6F3DBA]" />
            <span>Headcount: <strong>{data.employee_count.toLocaleString()}</strong></span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-[#F58A3A] mt-0.5">
            <span className="w-2 h-2 rounded-full bg-[#F58A3A]" />
            <span>Cumulative: <strong>{data.cumPct}%</strong></span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 flex flex-col h-full min-h-[300px]">
      {/* Single clean line header - no subtitles */}
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <BarChart3 className="w-4 h-4 shrink-0" style={{ color: '#6F3DBA' }} aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold truncate">Employee Experience Analytics</h2>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-[240px] w-full rounded-lg flex-1" />
      ) : hasAnyCount ? (
        <div className="h-[240px] w-full flex-1">
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData} margin={{ top: 18, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="expGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6F3DBA" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#4D8EEB" stopOpacity={0.55} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
              <XAxis
                dataKey="category"
                stroke={palette.axisText}
                fontSize={9}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke={palette.axisText}
                fontSize={9}
                tickLine={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                unit="%"
                stroke={palette.axisText}
                fontSize={9}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="circle"
                iconSize={7}
                wrapperStyle={{ fontSize: '10px', paddingTop: '4px' }}
              />
              <Bar
                yAxisId="left"
                dataKey="employee_count"
                name="Headcount"
                fill="url(#expGradient)"
                radius={[4, 4, 0, 0]}
                barSize={28}
              >
                <LabelList
                  dataKey="employee_count"
                  position="top"
                  offset={4}
                  style={{ fontSize: '9px', fontWeight: 700, fill: palette.axisText }}
                />
              </Bar>
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumPct"
                name="Cumulative %"
                stroke="#F58A3A"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#F58A3A', strokeWidth: 1.5, stroke: '#fff' }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[240px] flex-1 flex flex-col items-center justify-center px-2">
          <EmptyState
            icon={BarChart3}
            title="No data available"
            description="Experience-wise workforce distribution will appear here."
          />
        </div>
      )}
    </Card>
  );
}
