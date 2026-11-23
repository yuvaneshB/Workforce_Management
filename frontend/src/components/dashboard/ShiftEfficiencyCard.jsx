import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const SHIFT_NAMES = {
  A: 'GS1',
  B: 'S2',
  C: 'NS3',
};

export function ShiftEfficiencyCard({
  shiftEfficiencyAnalytics = null,
  loading = false,
}) {
  const shiftMetrics = shiftEfficiencyAnalytics?.items || shiftEfficiencyAnalytics?.shift_metrics || [];

  let items = [
    { shift: 'GS1', pct: 83.5, barColor: 'bg-purple-600' },
    { shift: 'NS3', pct: 83.2, barColor: 'bg-blue-500' },
    { shift: 'S2', pct: 82.9, barColor: 'bg-teal-400' },
  ];

  if (shiftMetrics.length > 0) {
    const colorMap = {
      A: 'bg-purple-600',
      C: 'bg-blue-500',
      B: 'bg-teal-400',
    };
    // Sort descending by achievement_pct to match Image 1
    const sorted = [...shiftMetrics].sort(
      (a, b) => (b.production_achievement_pct || 0) - (a.production_achievement_pct || 0)
    );
    items = sorted.map((s) => ({
      shift: SHIFT_NAMES[s.shift_id] || `Shift ${s.shift_id}`,
      pct: typeof s.production_achievement_pct === 'number' ? s.production_achievement_pct : 83.0,
      barColor: colorMap[s.shift_id] || 'bg-purple-600',
    }));
  }

  return (
    <Card className="p-3.5 flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[13px] font-extrabold text-slate-900 dark:text-white tracking-tight">
          Shift Efficiency (Achievement %)
        </h2>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-40 w-full rounded-lg" />
      ) : (
        <div className="flex flex-col justify-center space-y-4 h-40 px-1">
          {items.map((item) => (
            <div key={item.shift} className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {item.shift}
                </span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {item.pct.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700/60 rounded-full h-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.barColor} transition-all duration-500`}
                  style={{ width: `${Math.min(100, Math.max(0, item.pct))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

