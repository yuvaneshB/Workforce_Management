import {
  AlertTriangle,
  Building,
  Building2,
  Factory,
  Layers,
  UserCheck,
  Users,
  UserX,
} from 'lucide-react';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function OrganizationKPICards({
  plantCount = 0,
  departmentCount = 0,
  sectionCount = 0,
  teamCount = 0,
  activeEmployeeCount = 0,
  unassignedEmployeeCount = 0,
  loading = false,
}) {
  const hasData = plantCount > 0 || activeEmployeeCount > 0 || departmentCount > 0;

  const cards = [
    {
      id: 'plants',
      title: 'Total Plants',
      value: hasData ? plantCount : '—',
      subtext: hasData ? 'Operational manufacturing units' : 'No connection',
      icon: Factory,
      iconBg: 'bg-purple-100 dark:bg-purple-950/60',
      iconColor: 'text-[#6F3DBA]',
    },
    {
      id: 'departments',
      title: 'Total Departments',
      value: hasData ? departmentCount : '—',
      subtext: hasData ? 'Organizational divisions' : 'No data',
      icon: Building2,
      iconBg: 'bg-purple-100 dark:bg-purple-950/60',
      iconColor: 'text-[#6F3DBA]',
    },
    {
      id: 'sections',
      title: 'Total Sections',
      value: hasData ? sectionCount : '—',
      subtext: hasData ? 'Operational shop-floor sections' : 'No data',
      icon: Layers,
      iconBg: 'bg-blue-100 dark:bg-blue-950/60',
      iconColor: 'text-[#4D8EEB]',
    },
    {
      id: 'teams',
      title: 'Total Teams',
      value: hasData ? teamCount : '—',
      subtext: hasData ? 'Active shift operating teams' : 'No data',
      icon: Users,
      iconBg: 'bg-purple-100 dark:bg-purple-950/60',
      iconColor: 'text-[#6F3DBA]',
    },
    {
      id: 'active',
      title: 'Active Employees',
      value: hasData ? activeEmployeeCount.toLocaleString() : '—',
      subtext: hasData ? 'Registered workforce headcount' : 'No data',
      icon: UserCheck,
      iconBg: 'bg-emerald-100 dark:bg-emerald-950/60',
      iconColor: 'text-[#0E9C86]',
    },
    {
      id: 'unassigned',
      title: 'Unassigned Employees',
      value: hasData ? unassignedEmployeeCount : '—',
      subtext: hasData ? 'Pending organizational mapping' : 'No data',
      icon: unassignedEmployeeCount > 0 ? AlertTriangle : UserX,
      iconBg: unassignedEmployeeCount > 0 ? 'bg-orange-100 dark:bg-orange-950/60' : 'bg-slate-100 dark:bg-slate-800',
      iconColor: unassignedEmployeeCount > 0 ? 'text-[#F58A3A]' : 'text-slate-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card
            key={card.id}
            className="p-3.5 flex items-center gap-3 surface rounded-2xl border border-[var(--border)] shadow-xs transition-transform hover:-translate-y-0.5 duration-200"
          >
            <div
              className={`w-10 h-10 rounded-xl ${card.iconBg} ${card.iconColor} flex items-center justify-center shrink-0 shadow-2xs`}
            >
              <Icon className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-[var(--secondary)] truncate">
                {card.title}
              </span>
              {loading ? (
                <LoadingSkeleton className="h-6 w-12 rounded mt-1" />
              ) : (
                <div className="text-xl sm:text-2xl font-black text-[var(--text)] tracking-tight leading-tight mt-0.5">
                  {card.value}
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

