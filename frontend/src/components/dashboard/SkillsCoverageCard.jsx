import { Layers } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function SkillsCoverageCard({
  complianceAnalytics = null,
  workforceSummary = null,
  loading = false,
}) {
  const { theme } = useTheme();

  const skillMatchPct =
    typeof complianceAnalytics?.skill_match_pct === 'number'
      ? complianceAnalytics.skill_match_pct.toFixed(1)
      : null;

  const matchedCount = complianceAnalytics?.matched_count ?? 0;
  const gapCount = complianceAnalytics?.gap_count ?? 0;
  const totalSkillRecs = complianceAnalytics?.total_skill_match_records ?? (matchedCount + gapCount);
  const skillGapPct =
    totalSkillRecs > 0
      ? ((gapCount / totalSkillRecs) * 100).toFixed(1)
      : skillMatchPct !== null
      ? (100 - parseFloat(skillMatchPct)).toFixed(1)
      : null;

  // L1-L4 grades dynamically calculated from database workforceSummary
  const gradeList = workforceSummary?.by_skill_grade || [];
  const totalEmployees =
    workforceSummary?.total_employees ||
    gradeList.reduce((acc, g) => acc + (g.count || 0), 0) ||
    0;

  const colorMap = {
    L4: theme === 'dark' ? '#8295E8' : '#1F2F59',
    L3: theme === 'dark' ? '#78ACF5' : '#4D8EEB',
    L2: theme === 'dark' ? '#CFC8E6' : '#A290DB',
    L1: theme === 'dark' ? '#8DB4F8' : '#7FB0F2',
  };

  const pieData =
    gradeList.length > 0 && totalEmployees > 0
      ? gradeList.map((g) => ({
          name: g.key,
          value: g.count,
          pct: ((g.count / totalEmployees) * 100).toFixed(0),
          color: colorMap[g.key] || '#A290DB',
        }))
      : [];

  const hasData = skillMatchPct !== null || pieData.length > 0;

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
          <Layers className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
          Skills Coverage
        </h3>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-44 w-full rounded-xl" />
      ) : !hasData ? (
        <div className="h-44 flex items-center justify-center text-xs text-[var(--secondary)]">
          No skills coverage data available
        </div>
      ) : (
        <div className="flex items-center gap-3 h-44">
          {/* Donut Chart with Center Percentage */}
          <div className="relative w-32 h-32 shrink-0 flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width={128} height={128}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={52}
                    paddingAngle={3}
                    dataKey="value"
                    isAnimationActive={false}
                  >
                    {pieData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-24 h-24 rounded-full border-4 border-slate-200 dark:border-slate-800" />
            )}

            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[17px] font-black text-[var(--text)] tracking-tight leading-none">
                {skillMatchPct !== null ? `${skillMatchPct}%` : '—'}
              </span>
              <span className="text-[9px] font-semibold text-[var(--secondary)] mt-0.5">
                Skill Match
              </span>
            </div>
          </div>

          {/* Right Legend List */}
          <div className="flex-1 space-y-1.5 text-xs">
            {pieData.length > 0 ? (
              pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-semibold text-[var(--text)] text-[11px]">
                    {item.name} – {item.pct}% ({item.value})
                  </span>
                </div>
              ))
            ) : (
              <span className="text-[11px] text-[var(--secondary)]">No grade distribution</span>
            )}

            <div className="pt-1.5 border-t border-[var(--border)] text-[10px] text-[var(--secondary)] font-semibold">
              <span className="text-purple-600 dark:text-purple-400 font-bold">•</span> Skill Gap –{' '}
              {skillGapPct !== null ? `${skillGapPct}% (${gapCount.toLocaleString()})` : '—'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
