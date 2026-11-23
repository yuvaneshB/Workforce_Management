import {
  CheckCircle,
  Clock,
  Crosshair,
  Factory,
  Layers,
  Settings,
  Target,
  Users,
} from 'lucide-react';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function ProductionKPICards({
  data = null,
  loading = false,
  error = null,
}) {
  const actualQty = !error ? (data?.total_actual_qty ?? 2424184) : 0;
  const targetQty = !error ? (data?.total_target_qty ?? 2914560) : 0;
  const rejectQty = !error ? (data?.total_reject_qty ?? 45224) : 0;
  const reworkQty = !error ? (data?.total_rework_qty ?? 24852) : 0;
  const goodQty = !error ? (data?.total_good_qty ?? 2378960) : 0;
  const downtimeMin = !error ? (data?.total_downtime_min ?? 14150) : 0;
  const presentDays = !error ? (data?.total_present_employees ?? 15139) : 0;

  const achievementPct = targetQty > 0 ? ((actualQty / targetQty) * 100).toFixed(1) : '83.2';
  const goodPct = actualQty > 0 ? ((goodQty / actualQty) * 100).toFixed(1) : '98.1';
  const rejectionRate = actualQty > 0 ? ((rejectQty / actualQty) * 100).toFixed(2) : '1.86';
  const throughputPerPresent = presentDays > 0 ? (actualQty / presentDays).toFixed(1) : '160.1';

  const row1Cards = [
    {
      id: 'actual_prod',
      title: 'Total Actual Production',
      value: actualQty.toLocaleString(),
      subtext: `Target: ${targetQty.toLocaleString()} units`,
      subtextColor: 'text-[var(--secondary)]',
      icon: Factory,
      iconBg: 'bg-blue-50 dark:bg-blue-950/50',
      iconColor: 'text-[#4D8EEB]',
    },
    {
      id: 'achievement',
      title: 'Overall Achievement',
      value: `${achievementPct}%`,
      subtext: '▲ +2.8% vs previous period',
      subtextColor: 'text-emerald-600 dark:text-emerald-400 font-bold',
      icon: Target,
      iconBg: 'bg-blue-50 dark:bg-blue-950/50',
      iconColor: 'text-[#4D8EEB]',
    },
    {
      id: 'scrap_reject',
      title: 'Total Quality Scrap & Reject',
      value: `${rejectQty.toLocaleString()} units`,
      subtext: `Rework: ${reworkQty.toLocaleString()} units`,
      subtextColor: 'text-[var(--secondary)]',
      icon: Layers,
      iconBg: 'bg-purple-50 dark:bg-purple-950/50',
      iconColor: 'text-[#6F3DBA]',
    },
    {
      id: 'throughput',
      title: 'Overall Prod / Present Staff',
      value: `${throughputPerPresent} units`,
      subtext: `Across ${presentDays.toLocaleString()} present team days`,
      subtextColor: 'text-[var(--secondary)]',
      icon: Users,
      iconBg: 'bg-purple-50 dark:bg-purple-950/50',
      iconColor: 'text-[#6F3DBA]',
    },
  ];

  const row2Cards = [
    {
      id: 'efficiency',
      title: 'Production Efficiency',
      value: `${achievementPct}%`,
      subtext: 'Actual vs target output',
      subtextColor: 'text-[var(--secondary)]',
      icon: Settings,
      iconBg: 'bg-amber-50 dark:bg-amber-950/50',
      iconColor: 'text-[#F58A3A]',
    },
    {
      id: 'good_qty',
      title: 'Good Production Quantity',
      value: `${goodQty.toLocaleString()} units`,
      subtext: `${goodPct}% of total production`,
      subtextColor: 'text-emerald-600 dark:text-emerald-400 font-bold',
      icon: CheckCircle,
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/50',
      iconColor: 'text-[#0E9C86]',
    },
    {
      id: 'rejection_rate',
      title: 'Rejection Rate',
      value: `${rejectionRate}%`,
      subtext: `${rejectQty.toLocaleString()} / ${actualQty.toLocaleString()} units`,
      subtextColor: 'text-rose-500 font-bold',
      icon: Crosshair,
      iconBg: 'bg-rose-50 dark:bg-rose-950/50',
      iconColor: 'text-[#E45C72]',
    },
    {
      id: 'total_downtime',
      title: 'Total Downtime',
      value: `${downtimeMin.toLocaleString()} mins`,
      subtext: '▲ +5.2% vs previous period',
      subtextColor: 'text-rose-500 font-bold',
      icon: Clock,
      iconBg: 'bg-orange-50 dark:bg-orange-950/50',
      iconColor: 'text-[#F97316]',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={`skel-1-${i}`} className="p-3.5">
              <LoadingSkeleton className="h-16 w-full rounded-lg" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={`skel-2-${i}`} className="p-3.5">
              <LoadingSkeleton className="h-16 w-full rounded-lg" />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {row1Cards.map((c) => {
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

      {/* Row 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {row2Cards.map((c) => {
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
    </div>
  );
}

