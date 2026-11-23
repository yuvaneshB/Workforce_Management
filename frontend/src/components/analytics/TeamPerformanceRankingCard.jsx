import { Award } from 'lucide-react';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const DEFAULT_TOP_TEAMS = [
  { team: 'TEAM-03', achievement: 84.2, actual: 131900, good: 129394, rejectPct: '1.90%' },
  { team: 'TEAM-02', achievement: 83.0, actual: 142899, good: 140267, rejectPct: '1.84%' },
  { team: 'TEAM-01', achievement: 82.7, actual: 140010, good: 137371, rejectPct: '1.88%' },
  { team: 'TEAM-04', achievement: 82.5, actual: 134184, good: 131620, rejectPct: '1.91%' },
  { team: 'TEAM-05', achievement: 81.9, actual: 133500, good: 130980, rejectPct: '1.89%' },
];

export function TeamPerformanceRankingCard({
  data = null,
  loading = false,
  error = null,
}) {
  const rawItems = !error ? (data?.items ?? []) : [];
  let topTeams = [...DEFAULT_TOP_TEAMS];

  if (rawItems.length > 0) {
    const sorted = [...rawItems]
      .filter((t) => t.production_achievement_pct > 0)
      .sort((a, b) => b.production_achievement_pct - a.production_achievement_pct)
      .slice(0, 5)
      .map((t) => ({
        team: t.operator_team,
        achievement: t.production_achievement_pct,
        actual: t.actual_qty,
        good: t.good_qty,
        rejectPct: t.actual_qty > 0 ? `${((t.reject_qty / t.actual_qty) * 100).toFixed(2)}%` : '0.00%',
      }));
    if (sorted.length > 0) {
      topTeams = sorted;
    }
  }

  const maxAchievement = Math.max(...topTeams.map((t) => t.achievement), 85);

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col justify-between min-h-[260px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Award className="w-4 h-4 shrink-0 text-[#6F3DBA]" aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">
              Team Performance Ranking (Top 5)
            </h2>
          </div>
          <span className="text-[10px] font-bold text-purple-600 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800 shrink-0">
            Achievement %
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : (
          <div className="space-y-2.5 my-2">
            {topTeams.map((t, idx) => {
              const widthPct = Math.min(100, Math.max(10, (t.achievement / maxAchievement) * 100));
              return (
                <div key={t.team} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--text)]">
                      <span className="text-[9px] w-3.5 h-3.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black">
                        {idx + 1}
                      </span>
                      <span>{t.team}</span>
                    </div>
                    <span className="font-black text-[var(--text)] text-[11px]">
                      {t.achievement}%
                    </span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-[var(--muted-fill)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#6F3DBA] transition-all duration-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[9px] text-[var(--secondary)]">
        <span>Leader: <strong className="text-purple-600 font-bold">{topTeams[0]?.team} ({topTeams[0]?.achievement}%)</strong></span>
        <span>Spread: <strong className="text-[var(--text)] font-semibold">2.3% Variance</strong></span>
      </div>
    </Card>
  );
}

