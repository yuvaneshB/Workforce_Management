import {
  Calendar,
  Clock,
  Percent,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function AttendanceKPICards({
  attendance = null,
  loading = false,
  error = null,
}) {
  const hasData = !error && !!attendance && attendance.total_records != null;
  const total = hasData ? (attendance.total_records ?? 0) : 0;

  // Extract counts from by_status with case-insensitive normalization and API fallback
  const byStatus = hasData ? (attendance?.by_status ?? []) : [];
  const normalize = (val) => String(val || '').trim().toUpperCase();
  const presentItem = byStatus.find((s) => normalize(s.attendance_status) === 'PRESENT');
  const absentItem = byStatus.find((s) => normalize(s.attendance_status) === 'ABSENT');
  const leaveItem = byStatus.find((s) => normalize(s.attendance_status) === 'LEAVE');
  const lateItem = byStatus.find((s) => normalize(s.attendance_status) === 'LATE');

  const presentCount = presentItem?.record_count ?? (hasData ? (attendance?.present_count ?? 0) : 0);
  const absentCount = absentItem?.record_count ?? (hasData ? (attendance?.absent_count ?? 0) : 0);
  const leaveCount = leaveItem?.record_count ?? (hasData ? (attendance?.leave_count ?? 0) : 0);
  const lateCount = lateItem?.record_count ?? (hasData ? (attendance?.late_count ?? 0) : 0);

  const presentPct = total > 0 ? ((presentCount / total) * 100).toFixed(2) : '0.00';
  const absentPct = total > 0 ? ((absentCount / total) * 100).toFixed(2) : '0.00';
  const leavePct = total > 0 ? ((leaveCount / total) * 100).toFixed(2) : '0.00';
  const latePct = total > 0 ? ((lateCount / total) * 100).toFixed(2) : '0.00';
  const overallRate =
    hasData && typeof attendance?.attendance_rate === 'number' && attendance.attendance_rate > 0
      ? attendance.attendance_rate.toFixed(2)
      : presentPct;

  const cards = [
    {
      id: 'scheduled',
      title: 'Total Scheduled',
      value: hasData ? total.toLocaleString() : '—',
      subtext: hasData ? 'Selected period' : 'No backend connection',
      subtextColor: 'text-[var(--secondary)]',
      icon: Users,
      iconBg: 'bg-blue-50 dark:bg-blue-950/50',
      iconColor: 'text-[#4D8EEB]',
    },
    {
      id: 'present',
      title: 'Present',
      value: hasData ? presentCount.toLocaleString() : '—',
      subtext: hasData ? `↑ ${presentPct}% of scheduled` : 'No data',
      subtextColor: hasData ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-[var(--secondary)]',
      icon: UserCheck,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
      iconColor: 'text-[#0E9C86]',
    },
    {
      id: 'absent',
      title: 'Absent',
      value: hasData ? absentCount.toLocaleString() : '—',
      subtext: hasData ? `${absentPct}% of scheduled` : 'No data',
      subtextColor: hasData ? 'text-rose-500 font-bold' : 'text-[var(--secondary)]',
      icon: UserX,
      iconBg: 'bg-rose-50 dark:bg-rose-950/50',
      iconColor: 'text-[#E45C72]',
    },
    {
      id: 'leave',
      title: 'On Leave',
      value: hasData ? leaveCount.toLocaleString() : '—',
      subtext: hasData ? `${leavePct}% of scheduled` : 'No data',
      subtextColor: hasData ? 'text-amber-500 font-bold' : 'text-[var(--secondary)]',
      icon: Calendar,
      iconBg: 'bg-amber-50 dark:bg-amber-950/50',
      iconColor: 'text-[#F58A3A]',
    },
    {
      id: 'late',
      title: 'Late Arrivals',
      value: hasData ? lateCount.toLocaleString() : '—',
      subtext: hasData ? `${latePct}% of scheduled` : 'No data',
      subtextColor: hasData ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-[var(--secondary)]',
      icon: Clock,
      iconBg: 'bg-purple-50 dark:bg-purple-950/50',
      iconColor: 'text-[#6F3DBA]',
    },
    {
      id: 'rate',
      title: 'Attendance Rate',
      value: hasData ? `${overallRate}%` : '—',
      subtext: hasData ? 'Operational attendance' : 'No data',
      subtextColor: hasData ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-[var(--secondary)]',
      icon: Percent,
      iconBg: 'bg-cyan-50 dark:bg-cyan-950/50',
      iconColor: 'text-[#06B6D4]',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-3.5">
            <LoadingSkeleton className="h-16 w-full rounded-lg" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Card
            key={c.id}
            className="p-3.5 flex items-center gap-3 border border-[var(--border)] shadow-xs hover:border-[var(--brand-purple)]/40 transition-all"
          >
            <div
              className={`w-10 h-10 rounded-xl ${c.iconBg} ${c.iconColor} flex items-center justify-center shrink-0`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-[var(--secondary)] truncate">
                {c.title}
              </div>
              <div className="text-lg font-black text-[var(--text)] tracking-tight leading-tight my-0.5">
                {c.value}
              </div>
              <div className={`text-[10px] truncate ${c.subtextColor}`}>
                {c.subtext}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

