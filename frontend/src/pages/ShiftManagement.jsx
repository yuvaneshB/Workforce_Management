import { AlertCircle, CalendarClock, RefreshCw, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { extractApiErrorMessage } from '../api/client';
import { fetchShifts, fetchWorkforceSummary } from '../api/workforceApi';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { KPICard } from '../components/common/KPICard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { PaginationControls } from '../components/common/PaginationControls';
import { StatusBadge } from '../components/common/StatusBadge';
import { ROUTE_META, SHIFT_NAMES } from '../utils/constants';

const PAGE_SIZE = 25;

export function ShiftManagement() {
  const meta = ROUTE_META['/shifts'];
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [offset, setOffset] = useState(0);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [shiftCounts, setShiftCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(() => setReloadToken((p) => p + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [shiftsRes, summaryRes] = await Promise.all([
          fetchShifts({
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            shiftId: shiftId || undefined,
            limit: PAGE_SIZE,
            offset,
            signal: controller.signal,
          }),
          fetchWorkforceSummary({ signal: controller.signal }),
        ]);
        if (!active) return;
        setItems(shiftsRes.items ?? []);
        setTotal(shiftsRes.pagination?.total ?? 0);
        setShiftCounts(summaryRes.by_home_shift ?? []);
      } catch (err) {
        if (!active) return;
        const msg = extractApiErrorMessage(err);
        if (msg) setError(msg);
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [startDate, endDate, shiftId, offset, reloadToken]);

  function handleReset() {
    setStartDate('');
    setEndDate('');
    setShiftId('');
    setOffset(0);
  }

  const selectClass = 'h-9 rounded-lg border px-2.5 text-[11px] font-medium outline-none';
  const selectStyle = {
    borderColor: 'var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
  };

  return (
    <section aria-label={meta.title}>
      {error && (
        <div
          role="alert"
          className="surface rounded-xl p-3.5 mb-4 flex items-center justify-between gap-3"
          style={{ background: 'var(--rose-soft)' }}
        >
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#E11D48' }} />
            <span>{error}</span>
          </div>
          <Button variant="outline" onClick={refetch}>
            <RefreshCw className="w-3 h-3 inline mr-1" /> Retry
          </Button>
        </div>
      )}

      {shiftCounts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {shiftCounts.map((s) => (
            <KPICard
              key={s.key}
              label={`${SHIFT_NAMES[s.key] || `Shift ${s.key}`} Assigned Employees`}
              value={s.count.toLocaleString()}
              subtitle="Home shift assignment in employee_master"
              icon={CalendarClock}
              iconBg="var(--blue-soft)"
              iconColor="#2563EB"
              loading={loading}
            />
          ))}
        </div>
      )}

      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div className="text-xs font-bold">
            Shift Calendar Schedules ({total.toLocaleString()} entries)
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setOffset(0);
              }}
              aria-label="Shift start date"
              className={selectClass}
              style={selectStyle}
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setOffset(0);
              }}
              aria-label="Shift end date"
              className={selectClass}
              style={selectStyle}
            />
            <select
              value={shiftId}
              onChange={(e) => {
                setShiftId(e.target.value);
                setOffset(0);
              }}
              aria-label="Filter by shift"
              className={selectClass}
              style={selectStyle}
            >
              <option value="">All shifts</option>
              <option value="A">GS1</option>
              <option value="B">S2</option>
              <option value="C">NS3</option>
            </select>
            {(startDate || endDate || shiftId) && (
              <Button variant="outline" onClick={handleReset}>
                <RotateCcw className="w-3 h-3 inline mr-1" /> Reset
              </Button>
            )}
          </div>
        </div>

        <div className="border rounded-xl overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className="text-[10px] font-bold muted uppercase border-b"
                style={{ borderColor: 'var(--border)', background: 'var(--brand-bg)' }}
              >
                <th className="p-3">Calendar Date</th>
                <th className="p-3">Shift</th>
                <th className="p-3">Shift Start</th>
                <th className="p-3">Shift End</th>
                <th className="p-3">Planned (min)</th>
                <th className="p-3">Break (min)</th>
                <th className="p-3">Working Day</th>
              </tr>
            </thead>
            {loading ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="p-4 space-y-2">
                    <LoadingSkeleton className="h-8 w-full rounded" />
                    <LoadingSkeleton className="h-8 w-full rounded" />
                  </td>
                </tr>
              </tbody>
            ) : items.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="py-14">
                    <EmptyState
                      icon={CalendarClock}
                      iconClassName="w-8 h-8 mx-auto muted mb-2"
                      title="No shift schedules found"
                      titleClassName="text-xs font-bold"
                      description="No matching entries in dim_shift_calendar."
                    />
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y text-[11px]" style={{ borderColor: 'var(--border)' }}>
                {items.map((row) => (
                  <tr key={`${row.calendar_date}-${row.shift_id}`}>
                    <td className="p-3 font-bold whitespace-nowrap">{row.calendar_date}</td>
                    <td className="p-3 whitespace-nowrap">
                      <StatusBadge background="var(--blue-soft)" color="#2563EB">
                        {SHIFT_NAMES[row.shift_id] || `Shift ${row.shift_id}`}
                      </StatusBadge>
                    </td>
                    <td className="p-3 whitespace-nowrap">{row.shift_start.replace('T', ' ')}</td>
                    <td className="p-3 whitespace-nowrap">{row.shift_end.replace('T', ' ')}</td>
                    <td className="p-3 whitespace-nowrap">{row.planned_minutes}</td>
                    <td className="p-3 whitespace-nowrap">{row.break_minutes}</td>
                    <td className="p-3 whitespace-nowrap">
                      {row.is_working_day ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        <PaginationControls
          total={total}
          limit={PAGE_SIZE}
          offset={offset}
          onPageChange={setOffset}
        />
      </Card>
    </section>
  );
}
