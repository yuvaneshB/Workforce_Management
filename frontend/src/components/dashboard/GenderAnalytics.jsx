import { Check, User, Users, X } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function GenderAnalytics({ genderAnalytics = null, loading = false, error = null }) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const buckets = genderAnalytics?.buckets ?? [];
  const male = buckets.find((b) => b.gender === 'Male');
  const female = buckets.find((b) => b.gender === 'Female');

  const chartData =
    !error && (male || female)
      ? [
          ...(male ? [{ name: 'Male', value: male.employee_count, color: '#4D8EEB' }] : []),
          ...(female ? [{ name: 'Female', value: female.employee_count, color: '#6F3DBA' }] : []),
        ]
      : [];

  const rows = [
    {
      label: 'Male Employees',
      value: !error && male ? male.employee_count.toLocaleString() : '—',
      icon: User,
      bg: 'var(--brand-blue-soft)',
      color: '#4D8EEB',
    },
    {
      label: 'Female Employees',
      value: !error && female ? female.employee_count.toLocaleString() : '—',
      icon: User,
      bg: 'var(--brand-purple-soft)',
      color: '#6F3DBA',
    },
    {
      label: 'Male Attendance',
      value: !error && male ? `${male.attendance_pct}%` : '—',
      icon: Check,
      bg: 'var(--emerald-soft)',
      color: '#0E9C86',
    },
    {
      label: 'Female Attendance',
      value: !error && female ? `${female.attendance_pct}%` : '—',
      icon: X,
      bg: 'var(--rose-soft)',
      color: '#E45C72',
    },
  ];

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Users className="w-4 h-4 shrink-0" style={{ color: '#4D8EEB' }} aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Gender Analytics</h2>
        </div>
        {!loading && !error && genderAnalytics && (
          <span className="text-[10px] font-semibold muted shrink-0">
            {genderAnalytics.total_employees} total
          </span>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton className="h-36 w-full rounded-lg flex-1" />
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4 flex-1">
          {chartData.length > 0 ? (
            <div className="w-[126px] h-[126px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={38}
                    outerRadius={56}
                    paddingAngle={3}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: palette.tooltipBg,
                      borderColor: palette.tooltipBorder,
                      color: palette.tooltipText,
                      fontSize: '11px',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              className="w-[122px] h-[122px] rounded-full border-[14px] grid place-items-center shrink-0 text-center"
              style={{ borderColor: 'var(--muted-fill)' }}
            >
              <div className="px-2">
                <Users className="w-4 h-4 mx-auto muted mb-0.5" aria-hidden="true" />
                <div className="text-[9px] font-semibold muted leading-tight">
                  No data available
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 w-full space-y-2">
            {rows.map((row) => {
              const Icon = row.icon;
              return (
                <div
                  key={row.label}
                  className="flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5"
                  style={{ borderColor: 'var(--border)', background: 'var(--brand-bg)' }}
                >
                  <span className="flex items-center gap-2 text-[11px] font-semibold">
                    <span
                      className="w-5 h-5 rounded-full grid place-items-center shrink-0"
                      style={{ background: row.bg, color: row.color }}
                      aria-hidden="true"
                    >
                      <Icon className="w-3 h-3" />
                    </span>
                    <span>{row.label}</span>
                  </span>
                  <span className="text-[12px] font-bold">{row.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
