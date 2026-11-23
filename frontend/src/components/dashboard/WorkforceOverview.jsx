import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  CalendarCheck,
  Clock3,
  UserCheck,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DASHBOARD_KPIS } from '../../utils/constants';
import { Button } from '../common/Button';
import { KPICard } from '../common/KPICard';

const KPI_ICONS = {
  Users,
  UserCheck,
  CalendarCheck,
  AlertTriangle,
  BadgeCheck,
  Clock3,
};

function findGroupCount(items, key) {
  const match = items?.find((item) => item.key === key);
  return match ? match.count : 0;
}

function resolveDashboardKpis({ workforceSummary, attendanceAnalytics, error }) {
  const presentRow = attendanceAnalytics?.by_status?.find(
    (item) => item.attendance_status === 'PRESENT'
  );
  const presentCount = presentRow?.record_count ?? 0;
  const totalAttendance = attendanceAnalytics?.total_records ?? 0;
  const matchedSkillCount = findGroupCount(attendanceAnalytics?.by_skill_match, 'MATCHED');
  const gapSkillCount = findGroupCount(attendanceAnalytics?.by_skill_match, 'GAP');

  return DASHBOARD_KPIS.map((kpi) => {
    if (error) {
      return {
        ...kpi,
        value: '—',
        subtitle:
          kpi.id === 'manpower-shortages' || kpi.id === 'overtime-risk'
            ? 'Not supported by existing endpoints'
            : 'Unable to load backend data',
      };
    }

    switch (kpi.id) {
      case 'total-employees':
        return workforceSummary
          ? {
              ...kpi,
              value: workforceSummary.total_employees.toLocaleString(),
              subtitle: `${workforceSummary.distinct_teams} teams across workforce`,
            }
          : kpi;

      case 'available-workforce':
        return workforceSummary
          ? {
              ...kpi,
              value: workforceSummary.active_employees.toLocaleString(),
              subtitle: `Active status (${workforceSummary.active_employees} of ${workforceSummary.total_employees})`,
            }
          : kpi;

      case 'attendance-rate':
        if (!attendanceAnalytics) return kpi;
        if (totalAttendance === 0) {
          return { ...kpi, value: '—', subtitle: 'No attendance records in database' };
        }
        return {
          ...kpi,
          value: `${((presentCount / totalAttendance) * 100).toFixed(1)}%`,
          subtitle: `${presentCount.toLocaleString()} PRESENT of ${totalAttendance.toLocaleString()} records`,
        };

      case 'manpower-shortages':
        return {
          ...kpi,
          value: '—',
          subtitle: 'Not supported by existing endpoints',
        };

      case 'skill-coverage':
        if (!attendanceAnalytics) return kpi;
        if (totalAttendance === 0) {
          return { ...kpi, value: '—', subtitle: 'No skill-match records in database' };
        }
        return {
          ...kpi,
          value: `${((matchedSkillCount / totalAttendance) * 100).toFixed(1)}%`,
          subtitle: `${matchedSkillCount.toLocaleString()} MATCHED · ${gapSkillCount.toLocaleString()} GAP`,
        };

      case 'overtime-risk':
        return {
          ...kpi,
          value: '—',
          subtitle: attendanceAnalytics
            ? `${attendanceAnalytics.total_overtime_hours.toLocaleString()} OT hrs logged · no risk endpoint`
            : 'Not supported by existing endpoints',
        };

      default:
        return kpi;
    }
  });
}

export function WorkforceOverview({
  workforceSummary = null,
  attendanceAnalytics = null,
  loading = false,
  error = null,
}) {
  const navigate = useNavigate();
  const kpis = resolveDashboardKpis({ workforceSummary, attendanceAnalytics, error });

  return (
    <>
      <div
        className="rounded-xl p-4 md:p-5 mb-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(110deg, #1F2F59, #34245F 70%, #4B3880)' }}
      >
        <div className="relative z-10 max-w-2xl">
          <div className="text-[9px] font-bold tracking-[.16em] text-cyan-300 mb-2">
            WORKFORCE MANAGEMENT AGENT
          </div>
          <h2 className="text-lg md:text-xl font-bold">Make workforce decisions with clarity.</h2>
          <p className="text-[11px] text-blue-100 mt-2 leading-5 max-w-xl">
            Understand manpower demand, employee availability, skill coverage and shift readiness
            from one intelligent workspace.
          </p>
          <Button
            variant="banner"
            className="mt-4"
            onClick={() => navigate('/assistant')}
          >
            Open AI assistant <ArrowUpRight className="w-3 h-3 inline ml-1" />
          </Button>
        </div>
        <div
          className="absolute right-8 -top-14 w-64 h-64 rounded-full border opacity-20"
          style={{ borderColor: '#FFFFFF' }}
          aria-hidden="true"
        />
        <div
          className="absolute right-20 -top-4 w-44 h-44 rounded-full border opacity-20"
          style={{ borderColor: '#FFFFFF' }}
          aria-hidden="true"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-5">
        {kpis.map((kpi) => (
          <KPICard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            subtitle={kpi.subtitle}
            icon={KPI_ICONS[kpi.icon]}
            iconBg={kpi.iconBg}
            iconColor={kpi.iconColor}
            loading={loading}
          />
        ))}
      </div>
    </>
  );
}
