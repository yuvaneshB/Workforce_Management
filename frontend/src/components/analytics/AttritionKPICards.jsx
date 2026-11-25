import {
  Calendar,
  Percent,
  User,
  Users,
} from 'lucide-react';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function AttritionKPICards({
  summary = null,
  loading = false,
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="p-3.5 flex items-center gap-3">
            <LoadingSkeleton className="w-10 h-10 rounded-xl shrink-0" />
            <div className="flex-1 min-w-0">
              <LoadingSkeleton className="h-3 w-20 rounded mb-1.5" />
              <LoadingSkeleton className="h-5 w-24 rounded mb-1" />
              <LoadingSkeleton className="h-2.5 w-16 rounded" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  const totalExits = Number(summary?.total_exits ?? summary?.total_attrition ?? 0);
  const totalExitsChange = Number(summary?.total_exits_change_pct ?? 0);
  const overallRate = Number(summary?.overall_attrition_rate ?? summary?.attrition_rate ?? 0);
  const rateChangePP = Number(summary?.attrition_rate_change_pp ?? 0);
  const permanentExits = Number(summary?.permanent_exits ?? 0);
  const permanentPct = Number(summary?.permanent_pct ?? 0);
  const vendorExits = Number(summary?.vendor_exits ?? 0);
  const vendorPct = Number(summary?.vendor_pct ?? 0);
  const avgTenure = Number(summary?.average_tenure_years ?? 0);
  const tenureChange = Number(summary?.tenure_change_years ?? 0);

  const cards = [
    {
      title: 'Total Employee Exits',
      value: totalExits.toLocaleString(),
      trend: `${totalExitsChange > 0 ? '+' : ''}${totalExitsChange}% vs previous period`,
      trendType: 'good', // reduction in exits is good (green)
      subtext: 'Exits in selected period',
      icon: User,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
    },
    {
      title: 'Overall Attrition Rate',
      value: `${overallRate.toFixed(1)}%`,
      trend: `${rateChangePP > 0 ? '+' : ''}${rateChangePP} pp vs previous period`,
      trendType: 'good', // reduction in attrition rate is good (green)
      subtext: 'Annualized workforce rate',
      icon: Percent,
      iconColor: 'text-rose-500 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
    },
    {
      title: 'Permanent Employee Exits',
      value: permanentExits.toLocaleString(),
      subtext: `(${permanentPct.toFixed(1)}% of exits)`,
      icon: User,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
    },
    {
      title: 'Vendor Employee Exits',
      value: vendorExits.toLocaleString(),
      subtext: `(${vendorPct.toFixed(1)}% of exits)`,
      icon: Users,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
    },
    {
      title: 'Average Tenure at Exit',
      value: `${avgTenure.toFixed(1)} Years`,
      trend: `+${tenureChange.toFixed(1)} Years vs previous period`,
      trendType: 'good',
      subtext: 'Service length before exit',
      icon: Calendar,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <Card
            key={idx}
            className="p-3.5 flex items-center gap-3 border border-[var(--border)] shadow-xs transition-shadow hover:shadow-sm"
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${card.iconBg} ${card.iconColor}`}
            >
              <Icon className="w-5 h-5" />
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-[var(--secondary)] truncate">
                {card.title}
              </div>
              <div className="text-xl font-black text-[var(--text)] tracking-tight leading-tight">
                {card.value}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

