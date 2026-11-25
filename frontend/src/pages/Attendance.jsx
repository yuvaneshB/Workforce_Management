import { AlertCircle, Database, RefreshCw, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { extractApiErrorMessage } from '../api/client';
import { fetchAttendanceRecords } from '../api/workforceApi';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { PaginationControls } from '../components/common/PaginationControls';
import { StatusBadge } from '../components/common/StatusBadge';
import { SearchInput } from '../components/workforce/SearchInput';
import { PLANT_OPTIONS, ROUTE_META, SHIFT_NAMES } from '../utils/constants';

const PAGE_SIZE = 25;

function getStatusBadgeStyle(status) {
  const norm = String(status || '').trim().toUpperCase();
  if (norm === 'PRESENT') {
    return { background: 'var(--emerald-soft)', color: '#059669' };
  }
  if (norm === 'ABSENT') {
    return { background: 'var(--rose-soft)', color: '#E11D48' };
  }
  if (norm === 'LATE') {
    return { background: 'var(--purple-soft)', color: '#493287' };
  }
  if (norm === 'LEAVE') {
    return { background: 'rgba(245, 138, 58, 0.12)', color: '#F58A3A' };
  }
  return { background: 'var(--blue-soft)', color: '#2563EB' };
}

export function Attendance() {
  const meta = ROUTE_META['/attendance'];
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [plantId, setPlantId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState('');
  const [offset, setOffset] = useState(0);

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
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
        const res = await fetchAttendanceRecords({
          search: search.trim() || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          plantId: plantId || undefined,
          shiftId: shiftId || undefined,
          attendanceStatus: attendanceStatus || undefined,
          limit: PAGE_SIZE,
          offset,
          signal: controller.signal,
        });
        if (!active) return;
        setItems(res.items ?? []);
        setTotal(res.pagination?.total ?? 0);
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
  }, [search, startDate, endDate, plantId, shiftId, attendanceStatus, offset, reloadToken]);

  function handleReset() {
    setSearch('');
    setStartDate('');
    setEndDate('');
    setPlantId('');
    setShiftId('');
    setAttendanceStatus('');
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

      <Card className="p-5">
        <div className="flex flex-col xl:flex-row gap-3 justify-between mb-5">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setOffset(0);
            }}
            placeholder="Search employee ID, attendance ID, plant..."
          />

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setOffset(0);
              }}
              aria-label="Attendance start date"
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
              aria-label="Attendance end date"
              className={selectClass}
              style={selectStyle}
            />

            <select
              value={plantId}
              onChange={(e) => {
                setPlantId(e.target.value);
                setOffset(0);
              }}
              aria-label="Filter by plant"
              className={selectClass}
              style={selectStyle}
            >
              {PLANT_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>

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

            <select
              value={attendanceStatus}
              onChange={(e) => {
                setAttendanceStatus(e.target.value);
                setOffset(0);
              }}
              aria-label="Filter by attendance status"
              className={selectClass}
              style={selectStyle}
            >
              <option value="">All statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
              <option value="LEAVE">Leave</option>
            </select>

            {(search || startDate || endDate || plantId || shiftId || attendanceStatus) && (
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
                <th className="p-3">Date</th>
                <th className="p-3">Employee ID</th>
                <th className="p-3">Employee Name</th>
                <th className="p-3">Plant</th>
                <th className="p-3">Shift</th>
                <th className="p-3">Scheduled Hrs</th>
                <th className="p-3">Actual Hrs</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>

            {loading ? (
              <tbody>
                <tr>
                  <td colSpan={8} className="p-4 space-y-2">
                    <LoadingSkeleton className="h-8 w-full rounded" />
                    <LoadingSkeleton className="h-8 w-full rounded" />
                    <LoadingSkeleton className="h-8 w-full rounded" />
                  </td>
                </tr>
              </tbody>
            ) : items.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={8} className="py-14">
                    <EmptyState
                      icon={Database}
                      iconClassName="w-8 h-8 mx-auto muted mb-2"
                      title="No records to display"
                      titleClassName="text-xs font-bold"
                      description="No matching attendance records found in attendance_transactions."
                    />
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y text-[11px]" style={{ borderColor: 'var(--border)' }}>
                {items.map((row) => {
                  const badgeStyle = getStatusBadgeStyle(row.attendance_status);
                  return (
                    <tr key={row.attendance_id}>
                      <td className="p-3 font-medium whitespace-nowrap">{row.work_date}</td>
                      <td className="p-3 font-bold whitespace-nowrap">{row.employee_id}</td>
                      <td className="p-3 muted whitespace-nowrap">{row.employee_name || '—'}</td>
                      <td className="p-3 whitespace-nowrap">{row.plant_id}</td>
                      <td className="p-3 whitespace-nowrap">{SHIFT_NAMES[row.shift_id] || `Shift ${row.shift_id}`}</td>
                      <td className="p-3 whitespace-nowrap">{row.scheduled_hours}</td>
                      <td className="p-3 whitespace-nowrap">{row.actual_hours}</td>
                      <td className="p-3 whitespace-nowrap">
                        <StatusBadge
                          background={badgeStyle.background}
                          color={badgeStyle.color}
                        >
                          {row.attendance_status}
                        </StatusBadge>
                      </td>
                    </tr>
                  );
                })}
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
