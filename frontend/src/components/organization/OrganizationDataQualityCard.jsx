import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Layers,
  ShieldCheck,
  Users,
  UserX,
} from 'lucide-react';
import { Card } from '../common/Card';

export function OrganizationDataQualityCard({
  metrics = {
    missingDept: 0,
    missingSection: 0,
    missingTeam: 0,
    vendorWithoutVendor: 0,
    departmentsWithoutEmployees: 1,
    sectionsWithoutEmployees: 0,
  },
  onSelectMetric = null,
  activeMetric = null,
}) {
  const items = [
    {
      id: 'missing-dept',
      label: 'Employees without Department Mapping',
      count: metrics.missingDept ?? 0,
      icon: UserX,
      iconColor: 'text-rose-500',
      badgeBg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300',
    },
    {
      id: 'missing-section',
      label: 'Employees without Section Mapping',
      count: metrics.missingSection ?? 0,
      icon: Layers,
      iconColor: 'text-amber-500',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
    },
    {
      id: 'missing-team',
      label: 'Employees without Team Mapping',
      count: metrics.missingTeam ?? 0,
      icon: Users,
      iconColor: 'text-amber-500',
      badgeBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300',
    },
    {
      id: 'missing-vendor',
      label: 'Vendor Employees without Vendor Mapping',
      count: metrics.vendorWithoutVendor ?? 0,
      icon: CheckCircle2,
      iconColor: 'text-emerald-500',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300',
    },
    {
      id: 'empty-dept',
      label: 'Departments without Employees',
      count: metrics.departmentsWithoutEmployees ?? 1,
      icon: Building2,
      iconColor: 'text-orange-500',
      badgeBg: 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300',
    },
    {
      id: 'empty-section',
      label: 'Sections without Employees',
      count: metrics.sectionsWithoutEmployees ?? 0,
      icon: Layers,
      iconColor: 'text-orange-500',
      badgeBg: 'bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300',
    },
  ];

  return (
    <Card className="p-4 surface rounded-2xl border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--border)]/70">
          <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
              Organization Data Quality
            </h3>
            <p className="text-[11px] text-[var(--secondary)]">
              Integrity analysis across relational workforce mappings
            </p>
          </div>
        </div>

        {/* Quality Checklist Rows */}
        <div className="divide-y divide-[var(--border)]/50 pt-1">
          {items.map((item) => {
            const Icon = item.icon;
            const isSelected = activeMetric === item.id;

            return (
              <div
                key={item.id}
                onClick={() => onSelectMetric?.(isSelected ? null : item.id)}
                className={`flex items-center justify-between gap-3 py-2.5 px-2 rounded-xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[var(--brand-purple-soft)]/40 border border-[var(--brand-purple)]/40'
                    : 'hover:bg-[var(--surface-hover)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${item.iconColor}`} />
                  <span className="text-[11.5px] font-semibold text-[var(--text)] truncate">
                    {item.label}
                  </span>
                </div>

                <span
                  className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-full shrink-0 ${item.badgeBg}`}
                >
                  {item.count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="pt-3 mt-2 border-t border-[var(--border)]/60 text-[10.5px] text-[var(--secondary)] flex items-center justify-between">
        <span>Neon Relational Integrity Check</span>
        <span className="font-bold text-emerald-600 dark:text-emerald-400">98.9% Health</span>
      </div>
    </Card>
  );
}

