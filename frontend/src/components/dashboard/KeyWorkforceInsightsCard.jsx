import {
  AlertTriangle,
  Clock,
  Sparkles,
  Target,
  Users,
} from 'lucide-react';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function KeyWorkforceInsightsCard({
  overtimeAnalytics = null,
  shiftEfficiencyAnalytics = null,
  complianceAnalytics = null,
  departmentAnalytics = null,
  workforceSummary = null,
  loading = false,
}) {
  const insights = [];

  // 1. Shift with highest overtime
  const shifts = overtimeAnalytics?.shift_wise || [];
  if (shifts.length > 0) {
    const sorted = [...shifts].sort(
      (a, b) => (b.overtime_hours || 0) - (a.overtime_hours || 0)
    );
    const top = sorted[0];
    if (top && top.overtime_hours > 0) {
      const sMap = { A: 'GS1', B: 'S2', C: 'NS3' };
      const shiftName =
        sMap[(top.shift_id || '').toUpperCase()] || top.shift_id;
      insights.push({
        icon: Clock,
        text: (
          <span>
            <strong>{shiftName}</strong> has the highest overtime (
            <strong>{top.overtime_hours.toLocaleString()} hrs</strong>).
          </span>
        ),
      });
    }
  }

  // 2. Department with largest workforce
  const deptItems = departmentAnalytics?.items || [];
  if (deptItems.length > 0) {
    const sortedDepts = [...deptItems].sort(
      (a, b) => (b.employee_count || 0) - (a.employee_count || 0)
    );
    const topDept = sortedDepts[0];
    const totalEmp =
      workforceSummary?.total_employees ||
      deptItems.reduce((acc, d) => acc + (d.employee_count || 0), 0);
    const deptPct =
      totalEmp > 0
        ? `${((topDept.employee_count / totalEmp) * 100).toFixed(1)}%`
        : '';
    insights.push({
      icon: Users,
      text: (
        <span>
          <strong>{topDept.department_name}</strong> department has the largest workforce (
          <strong>
            {topDept.employee_count} employees{deptPct ? `, ${deptPct}` : ''}
          </strong>
          ).
        </span>
      ),
    });
  }

  // 3. Production Achievement
  if (
    typeof shiftEfficiencyAnalytics?.overall_achievement_pct === 'number' &&
    shiftEfficiencyAnalytics?.total_actual_qty != null
  ) {
    const prodActual = shiftEfficiencyAnalytics.total_actual_qty;
    const prodTarget = shiftEfficiencyAnalytics.total_target_qty;
    const prodPct = shiftEfficiencyAnalytics.overall_achievement_pct.toFixed(1);
    insights.push({
      icon: Target,
      text: (
        <span>
          Production achievement is <strong>{prodPct}%</strong> (
          {prodActual.toLocaleString()} / {prodTarget.toLocaleString()}).
        </span>
      ),
    });
  }

  // 4. Compliance numbers
  if (
    typeof complianceAnalytics?.training_compliance_pct === 'number' &&
    complianceAnalytics?.current_count != null
  ) {
    const compCurrent = complianceAnalytics.current_count;
    const compTotal =
      complianceAnalytics.total_compliance_records ||
      compCurrent + (complianceAnalytics.expired_count || 0);
    const compPct = complianceAnalytics.training_compliance_pct.toFixed(1);
    insights.push({
      icon: Sparkles,
      text: (
        <span>
          Training compliance is <strong>{compPct}%</strong> (
          {compCurrent.toLocaleString()} / {compTotal.toLocaleString()}).
        </span>
      ),
    });
  }

  // 5. Skill gap
  if (
    complianceAnalytics &&
    typeof complianceAnalytics.gap_count === 'number' &&
    complianceAnalytics.gap_count > 0
  ) {
    const totalSkill =
      complianceAnalytics.total_skill_match_records ||
      (complianceAnalytics.matched_count || 0) + complianceAnalytics.gap_count;
    const gapPct =
      totalSkill > 0
        ? ((complianceAnalytics.gap_count / totalSkill) * 100).toFixed(1)
        : complianceAnalytics?.skill_gap_pct?.toFixed(1) ?? '0.0';
    insights.push({
      icon: AlertTriangle,
      text: (
        <span>
          Skill gap is <strong>{gapPct}%</strong> (
          {complianceAnalytics.gap_count.toLocaleString()} records) – focus on upskilling.
        </span>
      ),
    });
  }

  return (
    <div className="surface rounded-2xl p-4.5 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
          <Sparkles className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
          Key Workforce Insights
        </h3>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-40 w-full rounded-xl" />
      ) : insights.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-xs text-[var(--secondary)]">
          No insight data available
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-[var(--page-bg)] border border-[var(--border)] space-y-2.5">
          {insights.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div key={idx} className="flex items-start gap-2.5 text-xs text-[var(--text)]">
                <Icon className="w-4 h-4 text-[var(--brand-purple)] shrink-0 mt-0.5" />
                <div className="leading-snug">{item.text}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
