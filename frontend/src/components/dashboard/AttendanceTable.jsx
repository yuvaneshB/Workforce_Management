import { CalendarCheck, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { extractApiErrorMessage } from '../../api/client';
import { fetchAttendanceRecords } from '../../api/workforceApi';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { StatusBadge } from '../common/StatusBadge';
import { SHIFT_NAMES } from '../../utils/constants';

const PAGE_SIZE = 50;

const TABLE_COLUMNS = [
  'Employee ID',
  'Employee Name',
  'Department',
  'Shift',
  'Date',
  'Status',
];

const SHIFT_OPTIONS = [
  { value: '', label: 'All Shifts' },
  { value: 'A', label: 'GS1' },
  { value: 'B', label: 'S2' },
  { value: 'C', label: 'NS3' },
];

function renderStatusBadge(status) {
  if (status === 'PRESENT') {
    return (
      <StatusBadge background="var(--blue-soft)" color="#2563EB">
        1 = Present
      </StatusBadge>
    );
  }
  if (status === 'ABSENT') {
    return (
      <StatusBadge background="var(--rose-soft)" color="#E11D48">
        0 = Absent
      </StatusBadge>
    );
  }
  return (
    <StatusBadge background="var(--muted-fill)" color="var(--secondary)">
      {status}
    </StatusBadge>
  );
}

export function AttendanceTable({
  startDate = '',
  endDate = '',
  globalShiftId = '',
  departmentId = '',
  sectionId = '',
}) {
  const [tableShiftId, setTableShiftId] = useState(globalShiftId);
  const [offset, setOffset] = useState(0);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [prevGlobalShiftId, setPrevGlobalShiftId] = useState(globalShiftId);
  if (globalShiftId !== prevGlobalShiftId) {
    setPrevGlobalShiftId(globalShiftId);
    setTableShiftId(globalShiftId);
    setOffset(0);
  }

  const filterKey = `${startDate}|${endDate}|${departmentId}|${sectionId}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setOffset(0);
  }

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadAttendance() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchAttendanceRecords({
          startDate,
          endDate,
          shiftId: tableShiftId,
          departmentId,
          sectionId,
          limit: PAGE_SIZE,
          offset,
          signal: controller.signal,
        });
        if (!active) return;
        setRecords(res?.items ?? []);
        setTotal(res?.pagination?.total ?? 0);
      } catch (err) {
        if (!active) return;
        const message = extractApiErrorMessage(err);
        if (message) {
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAttendance();

    return () => {
      active = false;
      controller.abort();
    };
  }, [startDate, endDate, tableShiftId, departmentId, sectionId, offset]);

  function handleShiftFilterChange(event) {
    setTableShiftId(event.target.value);
    setOffset(0);
  }

  const startRow = total === 0 ? 0 : offset + 1;
  const endRow = Math.min(offset + records.length, total);
  const hasPrev = offset > 0;
  const hasNext = offset + records.length < total;

  return (
    <section aria-label="Date-wise Attendance">
      <Card className="p-4 w-full flex flex-col">
        <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 shrink-0" style={{ color: '#2563EB' }} aria-hidden="true" />
            <h2 className="text-[14px] font-bold">
              Date-wise Attendance{' '}
              <span className="text-[11px] font-medium muted">(0 = Absent, 1 = Present)</span>
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              aria-label="Filter Date-wise Attendance by shift"
              value={tableShiftId}
              onChange={handleShiftFilterChange}
              className="rounded-lg border px-2.5 py-1.5 text-[11px] font-medium outline-none transition-colors"
              style={{
                background: 'var(--brand-bg)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            >
              {SHIFT_OPTIONS.map((opt) => (
                <option key={opt.value || 'all'} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            {!loading && total > 0 && (
              <span className="text-[10px] muted font-semibold whitespace-nowrap">
                Showing {startRow}–{endRow} of {total.toLocaleString()} records
              </span>
            )}

            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous attendance page"
                disabled={loading || !hasPrev}
                onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
                className="rounded-lg border p-1 transition-colors disabled:opacity-40"
                style={{
                  background: 'var(--brand-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                aria-label="Next attendance page"
                disabled={loading || !hasNext}
                onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
                className="rounded-lg border p-1 transition-colors disabled:opacity-40"
                style={{
                  background: 'var(--brand-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text)',
                }}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div
          className="border rounded-xl overflow-auto max-h-[300px] flex-1"
          style={{ borderColor: 'var(--border)' }}
        >
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr
                className="text-[11px] font-semibold border-b"
                style={{ borderColor: 'var(--border)', background: 'var(--brand-bg)' }}
              >
                {TABLE_COLUMNS.map((col) => (
                  <th key={col} className="px-3 py-2.5 whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>

            {loading ? (
              <tbody>
                <tr>
                  <td colSpan={TABLE_COLUMNS.length} className="p-3 space-y-2">
                    <LoadingSkeleton className="h-8 w-full rounded-md" />
                    <LoadingSkeleton className="h-8 w-full rounded-md" />
                    <LoadingSkeleton className="h-8 w-full rounded-md" />
                  </td>
                </tr>
              </tbody>
            ) : error ? (
              <tbody>
                <tr>
                  <td colSpan={TABLE_COLUMNS.length} className="py-8 px-4 text-center text-[11px] muted">
                    {error}
                  </td>
                </tr>
              </tbody>
            ) : records.length > 0 ? (
              <tbody className="divide-y text-[11px]" style={{ borderColor: 'var(--border)' }}>
                {records.map((rec) => (
                  <tr key={rec.attendance_id || `${rec.work_date}-${rec.employee_id}`}>
                    <td className="px-3 py-2 font-bold whitespace-nowrap">{rec.employee_id}</td>
                    <td className="px-3 py-2 muted whitespace-nowrap">{rec.employee_name || '—'}</td>
                    <td className="px-3 py-2 muted whitespace-nowrap">{rec.department || '—'}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{SHIFT_NAMES[rec.shift_id] || rec.shift_id}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{rec.work_date}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {renderStatusBadge(rec.attendance_status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            ) : (
              <tbody>
                <tr>
                  <td colSpan={TABLE_COLUMNS.length} className="py-8 px-4">
                    <EmptyState
                      icon={FileText}
                      iconClassName="w-6 h-6 mx-auto muted mb-1.5"
                      title="No data available"
                      titleClassName="text-[11px] font-bold"
                      description="Date-wise attendance records will appear here once data is integrated."
                    />
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </Card>
    </section>
  );
}
