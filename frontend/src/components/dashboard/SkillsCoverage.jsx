import { Award, ShieldAlert } from 'lucide-react';

export function SkillsCoverage({
  skillsAnalytics = null,
  complianceAnalytics = null,
  workforceSummary = null,
  loading = false,
}) {
  const hasData = Boolean(skillsAnalytics || workforceSummary);
  const totalEmployees = workforceSummary?.total_employees ?? 0;

  // L1-L4 skill grade distribution from workforceSummary or skillsAnalytics
  const rawGrades =
    skillsAnalytics?.skill_grade_distribution ||
    workforceSummary?.by_skill_grade ||
    [];

  const gradeItems = rawGrades.map((g) => {
    const grade = g.skill_grade || g.key || '';
    const count = g.employee_count ?? g.count ?? 0;
    const pct = g.percentage != null ? Number(g.percentage).toFixed(1) : (totalEmployees > 0 ? ((count / totalEmployees) * 100).toFixed(1) : '0.0');
    return { grade, count, pct };
  });

  // Certifications distribution
  const rawCerts =
    skillsAnalytics?.certification_distribution ||
    workforceSummary?.by_certification ||
    [];

  const certItems = rawCerts.map((c) => {
    const cert = c.certification || c.key || '';
    const count = c.employee_count ?? c.count ?? 0;
    const pct = c.percentage != null ? Number(c.percentage).toFixed(1) : (totalEmployees > 0 ? ((count / totalEmployees) * 100).toFixed(1) : '0.0');
    return { cert, count, pct };
  });

  const criticalGaps = complianceAnalytics?.gap_count ?? 0;

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                Skills Coverage & Matrix (L1–L4)
              </h3>
              <p className="text-[11px] text-[var(--secondary)]">
                Proficiency grading, certified specialists, and skill match
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--brand-purple-soft)] text-[var(--brand-purple)]">
            {hasData ? `${totalEmployees} Skilled Staff` : 'No Connection'}
          </span>
        </div>

        {/* Skill Levels L1 to L4 Grid */}
        {!hasData || gradeItems.length === 0 ? (
          <div className="h-36 w-full flex flex-col items-center justify-center text-center p-3 text-[var(--secondary)]">
            <Award className="w-6 h-6 mb-1 text-[var(--secondary)]/50" />
            <span className="text-xs font-semibold">No skills distribution data</span>
            <span className="text-[10px]">Connect backend to view L1–L4 grade matrix</span>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)] block mb-1.5">
                Skill Grade Distribution
              </span>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {gradeItems.map((g) => (
                  <div
                    key={g.grade}
                    className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--border)] text-center"
                  >
                    <div className="text-xs font-black text-[var(--brand-purple)]">{g.grade}</div>
                    <div className="text-base font-black text-[var(--text)] leading-tight">{g.count}</div>
                    <div className="text-[9px] font-semibold text-[var(--secondary)]">{g.pct}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Certification Badges */}
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)]">
                  Core Certifications
                </span>
                <span className="text-[10px] font-semibold text-rose-600 flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3" />
                  {criticalGaps} Skill Gaps
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[11px]">
                {certItems.map((c) => (
                  <div
                    key={c.cert}
                    className="flex items-center justify-between p-1.5 px-2 rounded-lg bg-[var(--muted-fill)]"
                  >
                    <span className="font-semibold text-[var(--text)] truncate">{c.cert}</span>
                    <span className="font-extrabold text-[var(--brand-purple)] shrink-0 ml-1">
                      {c.count} <span className="font-normal text-[9px] text-[var(--secondary)]">({c.pct}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] text-[10px] text-[var(--secondary)] flex items-center justify-between">
        <span>L4 advanced technicians ensure critical line safety & robotics operation.</span>
        <span className="font-bold text-[var(--text)]">L3/L4 Ratio: 46.1%</span>
      </div>
    </div>
  );
}
