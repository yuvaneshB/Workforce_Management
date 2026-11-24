import {
  AlertTriangle,
  Briefcase,
  CalendarCheck,
  Clock,
  UserCheck,
  UserMinus,
  Users,
  UserX,
} from 'lucide-react';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

function getStatusCount(attendanceAnalytics, statusName) {
  const target = (statusName || '').toUpperCase();
  const row = attendanceAnalytics?.by_status?.find(
    (item) => (item.attendance_status || '').toUpperCase() === target
  );
  return row?.record_count ?? 0;
}

export function WorkforceKPICards({
  workforceSummary = null,
  attendanceAnalytics = null,
  overtimeAnalytics = null,
  shiftEfficiencyAnalytics = null,
  planningShortages = null,
  planningAvailability = null,
  attritionAnalytics = null,
  employmentType = '',
  vendorId = '',
  loading = false,
}) {
  const hasData = Boolean(
    workforceSummary ||
    attendanceAnalytics ||
    overtimeAnalytics ||
    shiftEfficiencyAnalytics ||
    planningShortages ||
    planningAvailability ||
    attritionAnalytics
  );

  const totalEmployeesRaw = workforceSummary?.total_employees ?? null;
  const activeEmployeesRaw = workforceSummary?.active_employees ?? null;

  let permanentCount = workforceSummary?.permanent_count ?? (hasData ? 0 : null);
  let vendorCount = workforceSummary?.vendor_count ?? (hasData ? 0 : null);

  if (vendorId) {
    permanentCount = 0;
    const vendorRow = workforceSummary?.by_vendor?.find(
      (v) => v.key.toUpperCase() === vendorId.toUpperCase()
    );
    if (vendorRow) {
      vendorCount = vendorRow.count;
    }
  } else if (employmentType) {
    if (employmentType.toLowerCase() === 'permanent') {
      vendorCount = 0;
    } else if (employmentType.toLowerCase() === 'vendor') {
      permanentCount = 0;
    }
  }

  const activeVendorsCount = workforceSummary?.by_vendor
    ? workforceSummary.by_vendor.filter((v) => v.key !== 'Permanent' && v.count > 0).length
    : (hasData ? 0 : 0);

  const totalRecords = attendanceAnalytics?.total_records ?? 0;
  const presentCount = getStatusCount(attendanceAnalytics, 'PRESENT');
  const absentCount = getStatusCount(attendanceAnalytics, 'ABSENT');

  const attendanceRate =
    attendanceAnalytics?.attendance_rate != null
      ? Number(attendanceAnalytics.attendance_rate).toFixed(1)
      : totalRecords > 0 && presentCount > 0
      ? ((presentCount / totalRecords) * 100).toFixed(1)
      : planningAvailability?.availability_rate != null
      ? planningAvailability.availability_rate.toFixed(1)
      : hasData
      ? '0.0'
      : '—';

  const absenteeismRate =
    attendanceAnalytics?.absenteeism_rate != null
      ? Number(attendanceAnalytics.absenteeism_rate).toFixed(1)
      : totalRecords > 0 && absentCount > 0
      ? ((absentCount / totalRecords) * 100).toFixed(1)
      : planningAvailability?.absenteeism_rate != null
      ? planningAvailability.absenteeism_rate.toFixed(1)
      : hasData
      ? '0.0'
      : '—';

  // Shortage calculation
  const shortageCount =
    planningShortages?.shortage_count != null
      ? planningShortages.shortage_count
      : planningAvailability?.total_scheduled != null && planningAvailability?.available_count != null
      ? Math.max(0, planningAvailability.total_scheduled - planningAvailability.available_count)
      : hasData
      ? 0
      : null;

  const shortageSeverity =
    planningShortages?.severity || (shortageCount > 20 ? 'CRITICAL' : shortageCount > 0 ? 'MODERATE' : 'NORMAL');

  // Overtime hours
  const totalOvertime =
    overtimeAnalytics && typeof overtimeAnalytics.total_overtime_hours === 'number'
      ? Math.round(overtimeAnalytics.total_overtime_hours).toLocaleString()
      : hasData
      ? '0'
      : '—';

  // Weekly comparison or previous period when available
  const weeklyComp = attendanceAnalytics?.weekly_comparison;
  const attChange =
    weeklyComp && typeof weeklyComp.attendance_pct_change === 'number'
      ? weeklyComp.attendance_pct_change
      : null;

  // Attrition metrics
  const totalEmployeesNum = totalEmployeesRaw != null ? Number(totalEmployeesRaw) : 0;
  const resignedCount = workforceSummary?.resigned_employees ?? null;
  const totalExitsCount =
    attritionAnalytics?.summary?.total_exits != null
      ? attritionAnalytics.summary.total_exits
      : resignedCount != null
      ? resignedCount
      : hasData
      ? 0
      : null;

  const attritionRate =
    attritionAnalytics?.summary?.overall_attrition_rate != null
      ? `${attritionAnalytics.summary.overall_attrition_rate.toFixed(1)}%`
      : totalEmployeesNum > 0 && totalExitsCount != null
      ? `${((totalExitsCount / totalEmployeesNum) * 100).toFixed(1)}%`
      : hasData
      ? '0.0%'
      : '—';

  const cards = [
    {
      id: 'total-workforce',
      label: 'Total Workforce',
      value: totalEmployeesRaw != null ? String(totalEmployeesRaw) : '—',
      icon: Users,
      iconBg: 'bg-[var(--brand-purple-soft)] text-[var(--brand-purple)]',
    },
    {
      id: 'permanent-employees',
      label: 'Permanent Employees',
      value: permanentCount != null ? String(permanentCount) : '—',
      icon: UserCheck,
      iconBg: 'bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]',
    },
    {
      id: 'vendor-employees',
      label: 'Vendor Workforce',
      value: vendorCount != null ? String(vendorCount) : '—',
      icon: Briefcase,
      iconBg: 'bg-[var(--brand-peach-soft)] text-[var(--brand-orange)]',
    },
    {
      id: 'attendance-rate',
      label: 'Attendance Rate',
      value: attendanceRate !== '—' ? `${attendanceRate}%` : '—',
      icon: CalendarCheck,
      iconBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400',
    },
    {
      id: 'absenteeism-rate',
      label: 'Absenteeism Rate',
      value: absenteeismRate !== '—' ? `${absenteeismRate}%` : '—',
      icon: UserX,
      iconBg: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400',
    },
    {
      id: 'attrition-rate',
      label: 'Attrition Rate',
      value: attritionRate,
      icon: UserMinus,
      iconBg: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    },
    {
      id: 'workforce-shortage',
      label: 'Workforce Shortage',
      value: shortageCount != null ? String(shortageCount) : '—',
      icon: AlertTriangle,
      iconBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
    },
    {
      id: 'overtime-hours',
      label: 'Overtime Hours',
      value: totalOvertime !== '—' ? `${totalOvertime} h` : '—',
      icon: Clock,
      iconBg: 'bg-[var(--brand-purple-soft)] text-[var(--brand-purple)]',
    },
  ];

  if (loading && !workforceSummary) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="surface rounded-2xl p-3.5 sm:p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between min-h-[88px] sm:min-h-[94px]"
          >
            <div className="flex items-center justify-between gap-2">
              <LoadingSkeleton className="h-4 w-28" />
              <LoadingSkeleton className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl shrink-0" />
            </div>
            <LoadingSkeleton className="h-7 sm:h-8 w-24 mt-1" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
      {cards.map((c) => {
        const IconComponent = c.icon;
        return (
          <div
            key={c.id}
            className="surface rounded-2xl p-3.5 sm:p-4 border border-[var(--border)] shadow-xs hover:shadow-sm transition-all flex flex-col justify-between min-h-[88px] sm:min-h-[94px]"
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="text-[11px] sm:text-xs font-bold text-[var(--secondary)] uppercase tracking-wider leading-tight truncate"
                title={c.label}
              >
                {c.label}
              </span>
              <div
                className={`w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl ${c.iconBg} flex items-center justify-center shrink-0`}
              >
                <IconComponent className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-[var(--text)] tracking-tight tabular-nums whitespace-nowrap mt-1">
              {c.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

