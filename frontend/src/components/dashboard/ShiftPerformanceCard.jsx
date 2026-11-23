import { AlertCircle, RefreshCw, Zap } from 'lucide-react';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const SHIFT_META = {
  A: {
    name: 'GS1',
    dotColor: '#6F3DBA',
    attBg: 'var(--brand-purple-soft)',
    attColor: 'var(--brand-purple)',
    prodBg: 'rgba(14, 156, 134, 0.12)',
    prodColor: 'var(--brand-emerald)',
  },
  B: {
    name: 'S2',
    dotColor: '#4D8EEB',
    attBg: 'var(--brand-blue-soft)',
    attColor: 'var(--brand-blue)',
    prodBg: 'rgba(14, 156, 134, 0.12)',
    prodColor: 'var(--brand-emerald)',
  },
  C: {
    name: 'NS3',
    dotColor: '#F58A3A',
    attBg: 'var(--brand-peach-soft)',
    attColor: 'var(--brand-orange)',
    prodBg: 'rgba(14, 156, 134, 0.12)',
    prodColor: 'var(--brand-emerald)',
  },
};

export function ShiftPerformanceCard({
  attendanceAnalytics = null,
  shiftEfficiencyAnalytics = null,
  overtimeAnalytics = null,
  loading = false,
  error = null,
  onRetry = null,
}) {
  // Extract shift attendance
  const shiftAttMap = {};
  if (!error) {
    (attendanceAnalytics?.shift_breakdown || attendanceAnalytics?.by_shift || []).forEach((item) => {
      const sId = (item.shift_id || item.key || '').toUpperCase();
      if (sId) {
        shiftAttMap[sId] = item.attendance_pct ?? item.rate;
      }
    });
  }

  // Extract shift production achievement
  const shiftProdMap = {};
  if (!error) {
    (shiftEfficiencyAnalytics?.items || []).forEach((item) => {
      const sId = (item.shift_id || '').toUpperCase();
      if (sId) {
        shiftProdMap[sId] = item.production_achievement_pct;
      }
    });
  }

  // Extract shift overtime hours
  const shiftOtMap = {};
  if (!error) {
    (overtimeAnalytics?.shift_wise || []).forEach((item) => {
      const sId = (item.shift_id || '').toUpperCase();
      if (sId) {
        shiftOtMap[sId] = item.overtime_hours;
      }
    });
  }

  const hasAnyData =
    !error &&
    (Object.keys(shiftAttMap).length > 0 ||
      Object.keys(shiftProdMap).length > 0 ||
      Object.keys(shiftOtMap).length > 0);

  const shifts = ['A', 'B', 'C'].map((id) => {
    const meta = SHIFT_META[id];
    const attVal = shiftAttMap[id];
    const prodVal = shiftProdMap[id];
    const otVal = shiftOtMap[id];

    return {
      id,
      name: meta.name,
      dotColor: meta.dotColor,
      attendance: typeof attVal === 'number' ? `${attVal.toFixed(1)}%` : '-',
      attBg: meta.attBg,
      attColor: meta.attColor,
      production: typeof prodVal === 'number' ? `${prodVal.toFixed(1)}%` : '-',
      prodBg: meta.prodBg,
      prodColor: meta.prodColor,
      overtime: typeof otVal === 'number' ? otVal.toLocaleString() : '-',
    };
  });

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
          <Zap className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
          Shift Performance
        </h3>
      </div>

      {loading ? (
        <LoadingSkeleton className="h-44 w-full rounded-xl" />
      ) : error ? (
        <div className="h-44 flex flex-col items-center justify-center gap-2 p-4 text-center">
          <AlertCircle className="w-5 h-5 text-rose-500" />
          <p className="text-xs text-rose-500 font-semibold">{error}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-1 px-3 py-1 text-[11px] font-semibold rounded-md border border-[var(--border)] hover:bg-[var(--muted-fill)] text-[var(--text)] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          )}
        </div>
      ) : !hasAnyData ? (
        <div className="h-44 flex items-center justify-center text-xs text-[var(--secondary)]">
          No data available
        </div>
      ) : (
        <div className="w-full">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--border)] text-[10px] font-bold text-[var(--secondary)]">
                <th className="py-2 pr-2 text-left">Shift</th>
                <th className="py-2 px-1.5 text-center">Attendance</th>
                <th className="py-2 px-1.5 text-center">Production</th>
                <th className="py-2 pl-2 text-right">Overtime (Hrs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]/60">
              {shifts.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--surface-hi)] transition-colors">
                  <td className="py-3 pr-2 font-bold text-[var(--text)] whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ background: row.dotColor }}
                      />
                      <span>{row.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-1.5 text-center whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold"
                      style={{ background: row.attBg, color: row.attColor }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: row.attColor }}
                      />
                      <span>{row.attendance}</span>
                    </span>
                  </td>
                  <td className="py-3 px-1.5 text-center whitespace-nowrap">
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold"
                      style={{ background: row.prodBg, color: row.prodColor }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: row.prodColor }}
                      />
                      <span>{row.production}</span>
                    </span>
                  </td>
                  <td className="py-3 pl-2 text-right whitespace-nowrap">
                    <span className="inline-block px-3 py-0.5 rounded-md bg-[var(--surface-hi)] text-[var(--text)] font-bold text-[11px]">
                      {row.overtime}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
