import {
  CalendarCheck,
  Clock,
  Target,
  UserX,
  Users,
} from 'lucide-react';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

function getStatusCount(attendanceAnalytics, statusName) {
  const norm = String(statusName || '').trim().toUpperCase();
  const row = attendanceAnalytics?.by_status?.find(
    (item) => String(item.attendance_status || '').trim().toUpperCase() === norm
  );
  if (row?.record_count != null) return row.record_count;
  if (norm === 'PRESENT') return attendanceAnalytics?.present_count ?? 0;
  if (norm === 'ABSENT') return attendanceAnalytics?.absent_count ?? 0;
  return 0;
}

export function AttendanceOverview({
  workforceSummary = null,
  attendanceAnalytics = null,
  overtimeAnalytics = null,
  shiftEfficiencyAnalytics = null,
  teamProductionAnalytics = null,
  loading = false,
  error = null,
}) {
  const totalRecords = attendanceAnalytics?.total_records ?? 0;
  const presentCount = getStatusCount(attendanceAnalytics, 'PRESENT');
  const absentCount = getStatusCount(attendanceAnalytics, 'ABSENT');

  const totalEmployees =
    workforceSummary?.total_employees != null
      ? String(workforceSummary.total_employees)
      : '—';

  const attendancePct =
    attendanceAnalytics && totalRecords > 0
      ? `${((presentCount / totalRecords) * 100).toFixed(1)}%`
      : '—';

  const absenteeismPct =
    attendanceAnalytics && totalRecords > 0
      ? `${((absentCount / totalRecords) * 100).toFixed(1)}%`
      : '—';

  const productionAchievement =
    shiftEfficiencyAnalytics && typeof shiftEfficiencyAnalytics.overall_achievement_pct === 'number'
      ? `${shiftEfficiencyAnalytics.overall_achievement_pct.toFixed(1)}%`
      : teamProductionAnalytics && typeof teamProductionAnalytics.overall_achievement_pct === 'number'
      ? `${teamProductionAnalytics.overall_achievement_pct.toFixed(1)}%`
      : '—';

  const totalOvertime =
    overtimeAnalytics && typeof overtimeAnalytics.total_overtime_hours === 'number'
      ? Math.round(overtimeAnalytics.total_overtime_hours).toLocaleString()
      : '—';

  const kpis = [
    {
      id: 'total-employees',
      label: 'Total Employees',
      value: totalEmployees,
      badge: null,
      icon: Users,
      iconBg: 'var(--brand-purple-soft)',
      iconColor: 'var(--brand-purple)',
    },
    {
      id: 'attendance-rate',
      label: 'Attendance Rate',
      value: attendancePct,
      badge: null,
      icon: CalendarCheck,
      iconBg: 'rgba(14, 156, 134, 0.12)',
      iconColor: 'var(--brand-emerald)',
    },
    {
      id: 'absenteeism-rate',
      label: 'Absenteeism Rate',
      value: absenteeismPct,
      badge: null,
      icon: UserX,
      iconBg: 'var(--rose-soft)',
      iconColor: '#E45C72',
    },
    {
      id: 'production-achievement',
      label: 'Production Achievement',
      value: productionAchievement,
      badge: null,
      icon: Target,
      iconBg: 'var(--brand-purple-soft)',
      iconColor: 'var(--brand-purple)',
    },
    {
      id: 'overtime-hours',
      label: 'Overtime Hours',
      value: totalOvertime,
      badge: null,
      icon: Clock,
      iconBg: 'var(--brand-purple-soft)',
      iconColor: 'var(--brand-purple)',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <LoadingSkeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-3.5">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;

        return (
          <div
            key={kpi.id}
            className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex items-center gap-3.5 hover:shadow-md transition-shadow"
          >
            {/* Left Icon Container */}
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: kpi.iconBg, color: kpi.iconColor }}
            >
              <Icon className="w-5 h-5" />
            </div>

            {/* Right Metric Details */}
            <div className="min-w-0">
              <span className="text-[11px] font-semibold text-[var(--secondary)] block truncate leading-tight">
                {kpi.label}
              </span>
              <div className="text-[22px] font-black text-[var(--text)] tracking-tight leading-tight my-0.5">
                {kpi.value}
              </div>
              {kpi.badge ? (
                <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 truncate">
                  {kpi.badge}
                </div>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
