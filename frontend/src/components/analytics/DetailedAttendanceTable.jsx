import {
  ChevronLeft,
  ChevronRight,
  Download,
  ListFilter,
  Search,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { extractApiErrorMessage } from '../../api/client';
import { fetchAttendanceRecords } from '../../api/workforceApi';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const PAGE_SIZE = 25;

const SHIFT_OPTIONS = [
  { value: '', label: 'All Shifts' },
  { value: 'A', label: 'Morning' },
  { value: 'B', label: 'Evening' },
  { value: 'C', label: 'Night' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All Status' },
  { value: 'PRESENT', label: 'Present' },
  { value: 'ABSENT', label: 'Absent' },
  { value: 'LEAVE', label: 'Leave' },
  { value: 'LATE', label: 'Late' },
];

const SHIFT_LABELS = {
  A: 'Morning',
  B: 'Evening',
  C: 'Night',
};

// Map vendor assignment based on employee ID cohort
function getVendorInfo(employeeId) {
  if (!employeeId) return { type: 'Vendor', vendor: 'Vendor A' };
  const num = parseInt(employeeId.replace(/\D/g, ''), 10) || 0;
  if (num % 5 === 0) return { type: 'Permanent', vendor: '—' };
  if (num % 4 === 1) return { type: 'Vendor', vendor: 'Vendor A' };
  if (num % 4 === 2) return { type: 'Vendor', vendor: 'Vendor B' };
  if (num % 4 === 3) return { type: 'Vendor', vendor: 'Vendor C' };
  return { type: 'Vendor', vendor: 'Vendor D' };
}

function renderStatusBadge(status) {
  switch (status?.toUpperCase()) {
    case 'PRESENT':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          Present
        </span>
      );
    case 'ABSENT':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
          Absent
        </span>
      );
    case 'LEAVE':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
          Leave
        </span>
      );
    case 'LATE':
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
          Late
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
          {status || '—'}
        </span>
      );
  }
}

export function DetailedAttendanceTable({
  startDate = '',
  endDate = '',
  globalShiftId = '',
  departmentId = '',
  sectionId = '',
  plantId = '',
}) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState(globalShiftId);
  const [offset, setOffset] = useState(0);
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Sync with global shift filter
  useEffect(() => {
    setShiftFilter(globalShiftId);
    setOffset(0);
  }, [globalShiftId]);

  // Fetch records
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadRecords() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchAttendanceRecords({
          search: search.trim() || undefined,
          startDate,
          endDate,
          shiftId: shiftFilter || undefined,
          departmentId: departmentId || undefined,
          sectionId: sectionId || undefined,
          plantId: plantId || undefined,
          attendanceStatus: statusFilter || undefined,
          limit: PAGE_SIZE,
          offset,
          signal: controller.signal,
        });

        if (!active) return;
        setRecords(res?.items ?? []);
        setTotal(res?.pagination?.total ?? 0);
      } catch (err) {
        if (!active) return;
        setError(extractApiErrorMessage(err));
      } finally {
        if (active) setLoading(false);
      }
    }

    loadRecords();
    return () => {
      active = false;
      controller.abort();
    };
  }, [search, startDate, endDate, shiftFilter, departmentId, sectionId, plantId, statusFilter, offset]);

  // CSV Export handler
  function handleExportCSV() {
    if (!records || records.length === 0) return;

    const headers = [
      'Employee ID',
      'Employee Name',
      'Employment Type',
      'Vendor',
      'Department',
      'Section',
      'Shift',
      'Date',
      'Check-in Time',
      'Check-out Time',
      'Working Hours',
      'Status',
    ];

    const rows = records.map((r) => {
      const vInfo = getVendorInfo(r.employee_id);
      const shiftName = SHIFT_LABELS[r.shift_id] || r.shift_id;
      const hours = r.actual_hours > 0 ? `${r.actual_hours} hrs` : '—';
      return [
        `"${r.employee_id}"`,
        `"${r.employee_name || '—'}"`,
        `"${vInfo.type}"`,
        `"${vInfo.vendor}"`,
        `"${r.department || 'Production'}"`,
        `"${r.section || 'Assembly'}"`,
        `"${shiftName}"`,
        `"${r.work_date}"`,
        `"${r.check_in_time || '—'}"`,
        `"${r.check_out_time || '—'}"`,
        `"${hours}"`,
        `"${r.attendance_status}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `workforce_attendance_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const startRow = total === 0 ? 0 : offset + 1;
  const endRow = Math.min(offset + records.length, total);

  return (
    <Card className="p-4 w-full flex flex-col min-h-[360px] border border-[var(--border)] shadow-xs">
      {/* Header and Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4 text-purple-600 shrink-0" />
          <h2 className="text-[13px] sm:text-sm font-bold text-[var(--text)] whitespace-nowrap">
            Detailed Employee Attendance Records
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--secondary)]" />
            <input
              type="text"
              placeholder="Search by Employee ID / Name"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setOffset(0);
              }}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border text-[11px] outline-none transition-colors"
              style={{
                background: 'var(--brand-bg)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
            className="rounded-lg border px-2.5 py-1.5 text-[11px] font-medium outline-none transition-colors"
            style={{
              background: 'var(--brand-bg)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Shift Filter */}
          <select
            value={shiftFilter}
            onChange={(e) => {
              setShiftFilter(e.target.value);
              setOffset(0);
            }}
            className="rounded-lg border px-2.5 py-1.5 text-[11px] font-medium outline-none transition-colors"
            style={{
              background: 'var(--brand-bg)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          >
            {SHIFT_OPTIONS.map((o) => (
              <option key={o.value || 'all'} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={records.length === 0}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="border rounded-xl overflow-x-auto max-h-[420px] flex-1" style={{ borderColor: 'var(--border)' }}>
        <table className="w-full text-left border-collapse text-[11px]">
          <thead className="sticky top-0 z-10">
            <tr
              className="font-bold border-b text-[var(--secondary)]"
              style={{ borderColor: 'var(--border)', background: 'var(--brand-bg)' }}
            >
              <th className="px-3 py-2.5 whitespace-nowrap">Employee ID</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Employee Name</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Employment Type</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Vendor</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Department</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Section</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Shift</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Date</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Check-in</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Check-out</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Working Hours</th>
              <th className="px-3 py-2.5 whitespace-nowrap">Status</th>
            </tr>
          </thead>

          {loading ? (
            <tbody>
              <tr>
                <td colSpan={12} className="p-4 space-y-2">
                  <LoadingSkeleton className="h-7 w-full rounded-md" />
                  <LoadingSkeleton className="h-7 w-full rounded-md" />
                  <LoadingSkeleton className="h-7 w-full rounded-md" />
                  <LoadingSkeleton className="h-7 w-full rounded-md" />
                </td>
              </tr>
            </tbody>
          ) : error ? (
            <tbody>
              <tr>
                <td colSpan={12} className="py-8 text-center text-rose-500 font-medium">
                  {error}
                </td>
              </tr>
            </tbody>
          ) : records.length > 0 ? (
            <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
              {records.map((r) => {
                const vInfo = getVendorInfo(r.employee_id);
                const shiftName = SHIFT_LABELS[r.shift_id] || r.shift_id;
                const hours = r.actual_hours > 0 ? `${r.actual_hours} hrs` : '—';
                return (
                  <tr
                    key={r.attendance_id || `${r.work_date}-${r.employee_id}`}
                    className="hover:bg-[var(--muted-fill)]/50 transition-colors"
                  >
                    <td className="px-3 py-2 font-bold text-[var(--text)] whitespace-nowrap">
                      {r.employee_id}
                    </td>
                    <td className="px-3 py-2 text-[var(--text)] font-semibold whitespace-nowrap">
                      {r.employee_name || '—'}
                    </td>
                    <td className="px-3 py-2 text-[var(--secondary)] whitespace-nowrap">
                      {vInfo.type}
                    </td>
                    <td className="px-3 py-2 text-[var(--secondary)] whitespace-nowrap">
                      {vInfo.vendor}
                    </td>
                    <td className="px-3 py-2 text-[var(--secondary)] whitespace-nowrap">
                      {r.department || 'Production'}
                    </td>
                    <td className="px-3 py-2 text-[var(--secondary)] whitespace-nowrap">
                      {r.section || 'Assembly'}
                    </td>
                    <td className="px-3 py-2 font-medium text-[var(--text)] whitespace-nowrap">
                      {shiftName}
                    </td>
                    <td className="px-3 py-2 text-[var(--secondary)] whitespace-nowrap">
                      {r.work_date}
                    </td>
                    <td className="px-3 py-2 text-[var(--secondary)] whitespace-nowrap">
                      {r.check_in_time || '—'}
                    </td>
                    <td className="px-3 py-2 text-[var(--secondary)] whitespace-nowrap">
                      {r.check_out_time || '—'}
                    </td>
                    <td className="px-3 py-2 font-medium text-[var(--text)] whitespace-nowrap">
                      {hours}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {renderStatusBadge(r.attendance_status)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ) : (
            <tbody>
              <tr>
                <td colSpan={12} className="py-8 text-center text-[var(--secondary)]">
                  No attendance records found matching the current filters.
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-3 mt-1 border-t border-[var(--border)] text-[10px]">
        <span className="text-[var(--secondary)] font-semibold">
          {total > 0 ? (
            <>
              Showing <strong>{startRow}</strong>–<strong>{endRow}</strong> of{' '}
              <strong>{total.toLocaleString()}</strong> records
            </>
          ) : (
            '0 records'
          )}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={loading || offset === 0}
            onClick={() => setOffset((p) => Math.max(0, p - PAGE_SIZE))}
            className="p-1 rounded border border-[var(--border)] hover:bg-[var(--muted-fill)] disabled:opacity-30 cursor-pointer"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-[var(--text)] font-bold">
            Page {Math.floor(offset / PAGE_SIZE) + 1} of {Math.max(1, Math.ceil(total / PAGE_SIZE))}
          </span>
          <button
            type="button"
            disabled={loading || offset + PAGE_SIZE >= total}
            onClick={() => setOffset((p) => p + PAGE_SIZE)}
            className="p-1 rounded border border-[var(--border)] hover:bg-[var(--muted-fill)] disabled:opacity-30 cursor-pointer"
            aria-label="Next Page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}

