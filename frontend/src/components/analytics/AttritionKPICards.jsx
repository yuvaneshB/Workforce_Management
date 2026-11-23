import {
  Calendar,
  Percent,
  TrendingDown,
  TrendingUp,
  User,
  Users,
} from 'lucide-react';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function AttritionKPICards({
  summary = null,
  loading = false,
}) {
  const data = summary || {
    total_exits: 0,
    total_exits_change_pct: 0.0,
    overall_attrition_rate: 0.0,
    attrition_rate_change_pp: 0.0,
    permanent_exits: 0,
    permanent_pct: 0.0,
    vendor_exits: 0,
    vendor_pct: 0.0,
    average_tenure_years: 0.0,
    tenure_change_years: 0.0,
  };

  const cards = [
    {
      title: 'Total Employee Exits',
      value: data.total_exits.toString(),
      trend: `${data.total_exits_change_pct > 0 ? '+' : ''}${data.total_exits_change_pct}% vs previous period`,
      trendType: 'good', // reduction in exits is good (green)
      subtext: 'Exits in selected period',
      icon: User,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
    },
    {
      title: 'Overall Attrition Rate',
      value: `${data.overall_attrition_rate.toFixed(1)}%`,
      trend: `${data.attrition_rate_change_pp > 0 ? '+' : ''}${data.attrition_rate_change_pp} pp vs previous period`,
      trendType: 'good', // reduction in attrition rate is good (green)
      subtext: 'Annualized workforce rate',
      icon: Percent,
      iconColor: 'text-rose-500 dark:text-rose-400',
      iconBg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900',
    },
    {
      title: 'Permanent Employee Exits',
      value: data.permanent_exits.toString(),
      subtext: `(${data.permanent_pct}% of exits)`,
      icon: User,
      iconColor: 'text-blue-600 dark:text-blue-400',
      iconBg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900',
    },
    {
      title: 'Vendor Employee Exits',
      value: data.vendor_exits.toString(),
      subtext: `(${data.vendor_pct}% of exits)`,
      icon: Users,
      iconColor: 'text-amber-600 dark:text-amber-400',
      iconBg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900',
    },
    {
      title: 'Average Tenure at Exit',
      value: `${data.average_tenure_years} Years`,
      trend: `+${data.tenure_change_years} Years vs previous period`,
      trendType: 'good',
      subtext: 'Service length before exit',
      icon: Calendar,
      iconColor: 'text-purple-600 dark:text-purple-400',
      iconBg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900',
    },
  ];

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
              {card.trend ? (
                <div className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5 truncate">
                  {card.trend.startsWith('+') ? (
                    <TrendingUp className="w-2.5 h-2.5 shrink-0" />
                  ) : (
                    <TrendingDown className="w-2.5 h-2.5 shrink-0" />
                  )}
                  <span>{card.trend}</span>
                </div>
              ) : (
                <div className="text-[9.5px] text-[var(--secondary)] truncate">
                  {card.subtext}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

