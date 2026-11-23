import { Award, CalendarClock, Clock, Factory, TrendingUp } from 'lucide-react';
import { SHIFT_NAMES } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function ManufacturingSummary({
  teamProductionAnalytics = null,
  overtimeAnalytics = null,
  shiftEfficiencyAnalytics = null,
  complianceAnalytics = null,
  loading = false,
}) {
  // 1. Production metrics
  const actualQty = teamProductionAnalytics?.total_actual_qty ?? 0;
  const targetQty = teamProductionAnalytics?.total_target_qty ?? 0;
  const prodAchievement = teamProductionAnalytics?.overall_achievement_pct ?? 0;
  const downtimeMin = teamProductionAnalytics?.total_downtime_min ?? 0;

  // 2. Overtime metrics
  const totalOtHours = overtimeAnalytics?.total_overtime_hours ?? 0;
  const shiftWiseOt = overtimeAnalytics?.shift_wise ?? [];
  const highestOtShift = shiftWiseOt.length > 0
    ? [...shiftWiseOt].sort((a, b) => b.overtime_hours - a.overtime_hours)[0]
    : null;

  // 3. Shift efficiency metrics
  const shifts = shiftEfficiencyAnalytics?.items ?? [];
  const bestShift = shifts.length > 0
    ? [...shifts].sort((a, b) => b.production_achievement_pct - a.production_achievement_pct)[0]
    : null;

  // 4. Compliance metrics
  const trainingCompPct = complianceAnalytics?.training_compliance_pct ?? 0;
  const skillMatchPct = complianceAnalytics?.skill_match_pct ?? 0;
  const currentCount = complianceAnalytics?.current_count ?? 0;
  const expiredCount = complianceAnalytics?.expired_count ?? 0;

  return (
    <div className="mb-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-[13px] font-bold flex items-center gap-2">
          <Factory className="w-4 h-4 text-purple-600" />
          Manufacturing Operations Overview
        </h2>
        <span className="text-[10px] font-semibold muted">Executive Operational Pulse</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Production Performance */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[var(--foreground)]">Production Target vs Actual</span>
              <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600">
                <Factory className="w-3.5 h-3.5" />
              </span>
            </div>

            {loading ? (
              <LoadingSkeleton className="h-10 w-full rounded-md" />
            ) : (
              <>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-lg font-black">{prodAchievement.toFixed(1)}%</span>
                  <span className="text-[10px] muted">Achievement</span>
                </div>

                <div className="w-full bg-[var(--muted-fill)] rounded-full h-1.5 mb-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, prodAchievement))}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] muted">
                  <span>Act: {actualQty.toLocaleString()}</span>
                  <span>Tgt: {targetQty.toLocaleString()}</span>
                </div>
              </>
            )}
          </div>
          <div className="mt-2.5 pt-2 border-t text-[10px] muted flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span>Downtime:</span>
            <span className="font-semibold text-[var(--foreground)]">{downtimeMin.toLocaleString()} min</span>
          </div>
        </Card>

        {/* Card 2: Overtime Summary */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[var(--foreground)]">Overtime Operations</span>
              <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
                <Clock className="w-3.5 h-3.5" />
              </span>
            </div>

            {loading ? (
              <LoadingSkeleton className="h-10 w-full rounded-md" />
            ) : (
              <>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-lg font-black">{Math.round(totalOtHours).toLocaleString()} hrs</span>
                  <span className="text-[10px] muted">Total Logged</span>
                </div>

                <div className="text-[10px] p-2 rounded-lg bg-[var(--muted-fill)] flex items-center justify-between">
                  <span className="muted">Highest OT Shift:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    {highestOtShift ? `${SHIFT_NAMES[highestOtShift.shift_id] || `Shift ${highestOtShift.shift_id}`} (${highestOtShift.overtime_hours.toLocaleString()}h)` : '—'}
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="mt-2.5 pt-2 border-t text-[10px] muted flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span>OT Employee Ratio:</span>
            <span className="font-semibold text-[var(--foreground)]">{overtimeAnalytics?.overtime_rate_pct ?? 0}%</span>
          </div>
        </Card>

        {/* Card 3: Shift Efficiency */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[var(--foreground)]">Shift Efficiency</span>
              <span className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600">
                <CalendarClock className="w-3.5 h-3.5" />
              </span>
            </div>

            {loading ? (
              <LoadingSkeleton className="h-10 w-full rounded-md" />
            ) : (
              <>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-lg font-black">
                    {bestShift ? (SHIFT_NAMES[bestShift.shift_id] || `Shift ${bestShift.shift_id}`) : '—'}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> Best Performer
                  </span>
                </div>

                <div className="text-[10px] p-2 rounded-lg bg-[var(--muted-fill)] flex items-center justify-between">
                  <span className="muted">Throughput:</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">
                    {bestShift ? `${bestShift.production_per_present_employee.toFixed(1)} units/emp` : '—'}
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="mt-2.5 pt-2 border-t text-[10px] muted flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span>Shift Target Yield:</span>
            <span className="font-semibold text-[var(--foreground)]">{bestShift ? `${bestShift.production_achievement_pct.toFixed(1)}%` : '—'}</span>
          </div>
        </Card>

        {/* Card 4: Training & Skill Compliance */}
        <Card className="p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-[var(--foreground)]">Compliance & Readiness</span>
              <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600">
                <Award className="w-3.5 h-3.5" />
              </span>
            </div>

            {loading ? (
              <LoadingSkeleton className="h-10 w-full rounded-md" />
            ) : (
              <>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-lg font-black">{trainingCompPct.toFixed(1)}%</span>
                  <span className="text-[10px] muted">Compliance</span>
                </div>

                <div className="flex items-center justify-between text-[10px] p-2 rounded-lg bg-[var(--muted-fill)]">
                  <span className="muted">Skill Match:</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">{skillMatchPct.toFixed(1)}%</span>
                </div>
              </>
            )}
          </div>
          <div className="mt-2.5 pt-2 border-t text-[10px] muted flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <span>Records Status:</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">
              {currentCount.toLocaleString()} OK · {expiredCount} Exp
            </span>
          </div>
        </Card>
      </div>
    </div>
  );
}

