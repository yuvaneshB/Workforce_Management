import {
  BarChart3,
  Target,
  UserCheck,
  Users,
} from 'lucide-react';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function ShiftEfficiencyKPICards({
  data = null,
  loading = false,
  error = null,
}) {
  const hasData = !error && !!data && data.total_actual_qty != null;
  const actualQty = hasData ? (data.total_actual_qty ?? 0) : 0;
  const targetQty = hasData ? (data.total_target_qty ?? 0) : 0;
  const presentStaff = hasData ? (data.total_present_employees ?? 0) : 0;
  const absentStaff = hasData ? (data.total_absent_employees ?? 0) : 0;
  const totalStaffRecords = presentStaff + absentStaff;

  const achievementPct =
    targetQty > 0 ? ((actualQty / targetQty) * 100).toFixed(1) : '0.0';
  const attendanceRate =
    totalStaffRecords > 0
      ? ((presentStaff / totalStaffRecords) * 100).toFixed(1)
      : '0.0';

  const cards = [
    {
      id: 'achievement',
      title: 'Overall Shift Achievement',
      value: hasData ? `${achievementPct}%` : '—',
      subtext: hasData ? 'Output vs planned target' : 'No backend connection',
      subtextColor: hasData ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-[var(--secondary)]',
      icon: Target,
      iconBg: 'bg-rose-50 dark:bg-rose-950/50',
      iconColor: 'text-[#E45C72]',
    },
    {
      id: 'attendance_rate',
      title: 'Average Attendance Rate',
      value: hasData ? `${attendanceRate}%` : '—',
      subtext: hasData ? 'Across all scheduled shifts' : 'No data',
      subtextColor: hasData ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-[var(--secondary)]',
      icon: Users,
      iconBg: 'bg-blue-50 dark:bg-blue-950/50',
      iconColor: 'text-[#4D8EEB]',
    },
    {
      id: 'present_staff',
      title: 'Total Present Staff',
      value: hasData ? presentStaff.toLocaleString() : '—',
      subtext: hasData ? 'Across all shifts' : 'No data',
      subtextColor: 'text-[var(--secondary)]',
      icon: UserCheck,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
      iconColor: 'text-[#0E9C86]',
    },
    {
      id: 'total_production',
      title: 'Total Shift Production',
      value: hasData ? `${actualQty.toLocaleString()} units` : '—',
      subtext: hasData ? 'Aggregated output' : 'No data',
      subtextColor: hasData ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-[var(--secondary)]',
      icon: BarChart3,
      iconBg: 'bg-purple-50 dark:bg-purple-950/50',
      iconColor: 'text-[#6F3DBA]',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="p-3.5">
            <LoadingSkeleton className="h-16 w-full rounded-lg" />
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
            </div>
          </Card>
        );
      })}
    </div>
  );
}

