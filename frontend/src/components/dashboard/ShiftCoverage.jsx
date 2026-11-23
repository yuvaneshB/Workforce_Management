import { CalendarClock } from 'lucide-react';
import { SHIFT_NAMES } from '../../utils/constants';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { StatusBadge } from '../common/StatusBadge';

const SHIFT_BAR_COLORS = {
  A: '#6F3DBA',
  B: '#4D8EEB',
  C: '#31B7C3',
};

export function ShiftCoverage({
  workforceSummary = null,
  attendanceAnalytics = null,
  shiftCalendarMeta = null,
  loading = false,
  error = null,
}) {
  const homeShifts = workforceSummary?.by_home_shift ?? [];
  const totalEmployees = workforceSummary?.total_employees ?? 0;
  const totalShiftEntries = shiftCalendarMeta?.pagination?.total;

  const attendanceByShift = new Map(
    (attendanceAnalytics?.by_shift ?? []).map((entry) => [entry.key, entry.count])
  );

  return (
    <Card className="p-5 xl:col-span-2">
      <div className="flex justify-between items-start gap-2">
        <div>
          <h3 className="font-bold text-xs">Shift coverage</h3>
          <p className="text-[10px] muted mt-1">
            Home-shift roster and attendance log counts from Neon.
          </p>
        </div>
        {typeof totalShiftEntries === 'number' && !loading && !error && (
          <StatusBadge background="var(--purple-soft)" color="#6F3DBA">
            {totalShiftEntries} shifts
          </StatusBadge>
        )}
      </div>

      {loading ? (
        <div className="h-52 flex flex-col justify-center space-y-4">
          <LoadingSkeleton className="h-9 w-full rounded-lg" />
          <LoadingSkeleton className="h-9 w-full rounded-lg" />
          <LoadingSkeleton className="h-9 w-full rounded-lg" />
        </div>
      ) : error ? (
        <div className="h-52 flex items-center justify-center">
          <EmptyState
            icon={CalendarClock}
            title="Unable to load shift data"
            description={error}
          />
        </div>
      ) : homeShifts.length === 0 ? (
        <div className="h-52 flex items-center justify-center">
          <EmptyState
            icon={CalendarClock}
            title="No shift data available"
            description="Connect your roster to view coverage."
          />
        </div>
      ) : (
        <div className="h-52 flex flex-col justify-center space-y-4 mt-2">
          {homeShifts.map((shift) => {
            const pct = totalEmployees > 0 ? Math.round((shift.count / totalEmployees) * 100) : 0;
            const logCount = attendanceByShift.get(shift.key);
            const barColor = SHIFT_BAR_COLORS[shift.key] || '#4D8EEB';

            return (
              <div key={shift.key}>
                <div className="flex items-center justify-between text-[11px] mb-1.5">
                  <span className="font-bold">{SHIFT_NAMES[shift.key] || `Shift ${shift.key}`}</span>
                  <span className="text-[10px] muted font-medium">
                    {shift.count.toLocaleString()} employees ({pct}%)
                    {typeof logCount === 'number'
                      ? ` · ${logCount.toLocaleString()} attendance logs`
                      : ''}
                  </span>
                </div>
                <div
                  className="h-2.5 w-full rounded-full overflow-hidden"
                  style={{ background: 'var(--muted-fill)' }}
                >
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
