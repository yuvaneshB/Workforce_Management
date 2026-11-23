import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  Crosshair,
  Factory,
  Percent,
  Target,
  UserCheck,
  UserX,
  Zap,
} from 'lucide-react';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const SHIFT_CONFIG = {
  A: { code: 'GS1', label: 'General Shift', color: 'text-blue-600' },
  B: { code: 'S2', label: 'Second Shift', color: 'text-purple-600' },
  C: { code: 'NS3', label: 'Night Shift', color: 'text-indigo-600' },
};

const SHIFT_TEMPLATES = [
  { shift_id: 'A', code: 'GS1', label: 'General Shift' },
  { shift_id: 'B', code: 'S2', label: 'Second Shift' },
  { shift_id: 'C', code: 'NS3', label: 'Night Shift' },
];

export function IndividualShiftSummaryCards({
  data = null,
  loading = false,
  error = null,
}) {
  const rawShifts = !error ? (data?.items ?? []) : [];
  let shifts = [];

  if (rawShifts.length > 0) {
    shifts = SHIFT_TEMPLATES.map((def) => {
      const match = rawShifts.find((s) => s.shift_id === def.shift_id);
      if (match) {
        const actual = match.actual_qty || 0;
        const target = match.target_qty || 0;
        const reject = match.reject_qty || 0;
        const good = match.good_qty || 0;
        const present = match.present_employees || 0;
        const absent = match.absent_employees || 0;
        const downtime = match.downtime_min || 0;
        const achievement =
          match.production_achievement_pct ||
          (target > 0 ? Number(((actual / target) * 100).toFixed(1)) : 0);
        const attendance =
          match.attendance_pct ||
          (present + absent > 0 ? Number(((present / (present + absent)) * 100).toFixed(1)) : 0);
        const throughput =
          match.production_per_present_employee ||
          (present > 0 ? Number((actual / present).toFixed(1)) : 0);
        const rejRate = actual > 0 ? Number(((reject / actual) * 100).toFixed(2)) : 0;

        return {
          ...def,
          actual_qty: actual,
          target_qty: target,
          good_qty: good,
          reject_qty: reject,
          present_employees: present,
          absent_employees: absent,
          downtime_min: downtime,
          production_achievement_pct: achievement,
          attendance_pct: attendance,
          rejection_rate: rejRate,
          production_per_present_employee: throughput,
        };
      }
      return null;
    }).filter(Boolean);
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="p-4">
            <LoadingSkeleton className="h-44 w-full rounded-lg" />
          </Card>
        ))}
      </div>
    );
  }

  if (shifts.length === 0) {
    return (
      <div className="p-8 flex flex-col items-center justify-center text-center bg-[var(--surface-hover)]/30 rounded-xl border border-dashed border-[var(--border)]">
        <Activity className="w-6 h-6 text-slate-400 mb-2 opacity-60" />
        <p className="text-xs font-bold text-[var(--text)]">No Shift Performance Data</p>
        <p className="text-[11px] text-[var(--secondary)] mt-0.5">
          Connect to FastAPI backend to view individual shift operational summaries.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
      {shifts.map((s) => {
        const conf = SHIFT_CONFIG[s.shift_id] || {
          code: s.shift_id,
          label: `Shift ${s.shift_id}`,
          color: 'text-blue-600',
        };
        return (
          <Card
            key={s.shift_id}
            className="p-4 border border-[var(--border)] shadow-xs flex flex-col justify-between"
          >
            <div>
              {/* Card Top Title & Achievement Badge */}
              <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className={`text-[13px] font-extrabold ${conf.color}`}>
                    {conf.code}
                  </span>
                  <span className="text-[11px] font-semibold text-[var(--secondary)]">
                    ({conf.label})
                  </span>
                </div>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  {s.production_achievement_pct}% Target Met
                </span>
              </div>

              {/* 2-Column Grid: Production vs Workforce */}
              <div className="grid grid-cols-2 gap-3 mb-3 text-[11px]">
                {/* Left: Production */}
                <div className="space-y-2">
                  <div>
                    <div className="text-[10px] text-[var(--secondary)] flex items-center gap-1">
                      <Zap className="w-3 h-3 text-purple-600" />
                      <span>Actual Output</span>
                    </div>
                    <div className="font-black text-[13px] text-[var(--text)] mt-0.5">
                      {s.actual_qty.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-[var(--secondary)] flex items-center gap-1">
                      <Target className="w-3 h-3 text-blue-500" />
                      <span>Target Planned</span>
                    </div>
                    <div className="font-bold text-[var(--text)] mt-0.5">
                      {s.target_qty.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-[var(--secondary)] flex items-center gap-1">
                      <Crosshair className="w-3 h-3 text-rose-500" />
                      <span>Reject Quantity</span>
                    </div>
                    <div className="font-bold text-rose-500 mt-0.5">
                      {s.reject_qty.toLocaleString()} units
                    </div>
                  </div>
                </div>

                {/* Right: Workforce */}
                <div className="space-y-2">
                  <div>
                    <div className="text-[10px] text-[var(--secondary)] flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-emerald-600" />
                      <span>Present Staff</span>
                    </div>
                    <div className="font-black text-[13px] text-emerald-600 mt-0.5">
                      {s.present_employees.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-[var(--secondary)] flex items-center gap-1">
                      <UserX className="w-3 h-3 text-rose-500" />
                      <span>Absent Staff</span>
                    </div>
                    <div className="font-bold text-rose-500 mt-0.5">
                      {s.absent_employees.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-[var(--secondary)] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-orange-500" />
                      <span>Downtime</span>
                    </div>
                    <div className="font-bold text-[var(--text)] mt-0.5">
                      {s.downtime_min.toLocaleString()} mins
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Efficiency Highlights */}
            <div className="pt-2.5 border-t border-[var(--border)] text-[10px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[var(--secondary)] font-medium">Throughput / Present:</span>
                <span className="font-black text-purple-600 text-[11px]">
                  {s.production_per_present_employee} units
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--secondary)] font-medium">Attendance Rate:</span>
                <span className="font-extrabold text-emerald-600">
                  {s.attendance_pct}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--secondary)] font-medium">Rejection Rate:</span>
                <span className="font-extrabold text-emerald-600">
                  {s.rejection_rate}%
                </span>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

