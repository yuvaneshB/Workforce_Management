import { BarChart2, UserPlus } from 'lucide-react';
import {
  Area,
  AreaChart,
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
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const PERIODS = [
  { id: 'daily', label: 'D' },
  { id: 'weekly', label: 'W' },
  { id: 'monthly', label: 'M' },
];

export function NewJoinerAnalytics({
  newJoinerAnalytics = null,
  granularity = 'weekly',
  onGranularityChange,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const totalNewJoiners = !error ? (newJoinerAnalytics?.total_new_joiners ?? 0) : 0;
  const trends = !error ? (newJoinerAnalytics?.trends ?? []) : [];

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col min-h-[185px]">
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <UserPlus className="w-4 h-4 shrink-0" style={{ color: '#F58A3A' }} aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">New Joiner Analytics</h2>
        </div>

        <div
          className="inline-flex rounded-md border p-0.5 shrink-0"
          style={{ borderColor: 'var(--border)', background: 'var(--brand-bg)' }}
          role="group"
          aria-label="New joiner trend period"
        >
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onGranularityChange?.(p.id)}
              className="px-1.5 py-0.5 rounded text-[9px] font-bold cursor-pointer"
              style={
                granularity === p.id
                  ? { background: 'var(--brand-purple)', color: 'var(--on-accent)' }
                  : { color: 'var(--secondary)' }
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {!loading && !error && newJoinerAnalytics && (
        <div className="flex items-center justify-between text-[10px] muted mb-2">
          <span>
            Joiners: <strong style={{ color: 'var(--text)' }}>{totalNewJoiners}</strong>
          </span>
          <span>
            Att:{' '}
            <strong style={{ color: '#2563EB' }}>
              {newJoinerAnalytics.attendance_pct !== null
                ? `${newJoinerAnalytics.attendance_pct}%`
                : '—'}
            </strong>
          </span>
          <span>
            Avg Tenure:{' '}
            <strong style={{ color: 'var(--text)' }}>
              {newJoinerAnalytics.avg_tenure_months !== null
                ? `${newJoinerAnalytics.avg_tenure_months}m`
                : '—'}
            </strong>
          </span>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton className="h-32 w-full rounded-lg flex-1" />
      ) : trends.length > 0 ? (
        <div className="h-32 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
              <XAxis dataKey="label" stroke={palette.axisText} fontSize={9} />
              <YAxis stroke={palette.axisText} fontSize={9} domain={[0, 100]} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: palette.tooltipBg,
                  borderColor: palette.tooltipBorder,
                  color: palette.tooltipText,
                  fontSize: '11px',
                  borderRadius: '8px',
                }}
              />
              <Area
                type="monotone"
                dataKey="attendance_pct"
                name="Attendance %"
                stroke={palette.demand}
                fill={palette.demand}
                fillOpacity={0.18}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-2">
          <EmptyState
            icon={BarChart2}
            iconClassName="w-6 h-6 mx-auto muted mb-1.5"
            title="No data available"
            titleClassName="text-[11px] font-bold"
            description="No new joiners within 12 months of the selected period start date."
          />
        </div>
      )}
    </Card>
  );
}
