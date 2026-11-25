import {
  Download,
  Search,
  Table,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function ShiftPerformanceTable({
  data = null,
  loading = false,
  error = null,
}) {
  const [search, setSearch] = useState('');
  const [selectedShift, setSelectedShift] = useState('ALL');

  const rawShifts = !error ? (data?.items ?? []) : [];

  const tableData = useMemo(() => {
    if (rawShifts.length > 0) {
      const shiftCodeMap = { A: 'GS1', B: 'S2', C: 'NS3' };
      const shiftNameMap = {
        A: 'General Shift',
        B: 'Second Shift',
        C: 'Night Shift',
      };

      return rawShifts.map((s) => {
        const actual = s.actual_qty ?? 0;
        const target = s.target_qty ?? 0;
        const good = s.good_qty ?? 0;
        const reject = s.reject_qty ?? 0;
        const pres = s.present_employees ?? 0;
        const abs = s.absent_employees ?? 0;
        const tot = s.total_attendance_records || pres + abs || 1;

        const achPct = target > 0 ? (actual / target) * 100 : 0;
        const rejPct = actual > 0 ? (reject / actual) * 100 : 0;
        const attRate = tot > 0 ? (pres / tot) * 100 : 0;
        const tp = pres > 0 ? actual / pres : 0;

        return {
          shift_code: shiftCodeMap[s.shift_id] || s.shift_id,
          shift_name: shiftNameMap[s.shift_id] || `Shift ${s.shift_id}`,
          target_planned: target,
          actual_output: actual,
          achievement_pct: Number(achPct.toFixed(1)),
          good_quantity: good,
          reject_quantity: reject,
          rejection_pct: Number(rejPct.toFixed(2)),
          present_staff: pres,
          absent_staff: abs,
          attendance_rate: Number(attRate.toFixed(1)),
          downtime_min: s.downtime_min ?? 0,
          throughput_present: Number(tp.toFixed(1)),
        };
      });
    }
    return [];
  }, [rawShifts]);

  // Filtering
  const filteredData = useMemo(() => {
    return tableData.filter((row) => {
      const matchesSearch =
        !search.trim() ||
        row.shift_code.toLowerCase().includes(search.toLowerCase().trim()) ||
        row.shift_name.toLowerCase().includes(search.toLowerCase().trim());

      const matchesShift =
        selectedShift === 'ALL' || row.shift_code === selectedShift;

      return matchesSearch && matchesShift;
    });
  }, [tableData, search, selectedShift]);

  // CSV Export
  function handleExportCSV() {
    if (!filteredData || filteredData.length === 0) return;

    const headers = [
      'Shift',
      'Shift Name',
      'Target Planned',
      'Actual Output',
      'Achievement %',
      'Good Quantity',
      'Reject Quantity',
      'Rejection %',
      'Present Staff',
      'Absent Staff',
      'Attendance Rate %',
      'Downtime (mins)',
      'Throughput / Present',
    ];

    const rows = filteredData.map((row) => [
      `"${row.shift_code}"`,
      `"${row.shift_name}"`,
      row.target_planned,
      row.actual_output,
      `"${row.achievement_pct}%"`,
      row.good_quantity,
      row.reject_quantity,
      `"${row.rejection_pct}%"`,
      row.present_staff,
      row.absent_staff,
      `"${row.attendance_rate}%"`,
      `"${row.downtime_min} mins"`,
      row.throughput_present,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `shift_performance_detail_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Card className="p-4 w-full flex flex-col border border-[var(--border)] shadow-xs">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Table className="w-4 h-4 text-purple-600 shrink-0" />
          <h2 className="text-[13px] sm:text-sm font-bold text-[var(--text)] whitespace-nowrap">
            Shift Performance Detail (Comparison)
          </h2>
        </div>

        {/* Right Search, Filter & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[150px] sm:min-w-[170px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--secondary)]" />
            <input
              type="text"
              placeholder="Search by Shift"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 text-[11px] rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-[var(--secondary)]"
            />
          </div>

          {/* Shift Filter Dropdown */}
          <select
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className="px-2.5 py-1 text-[11px] rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
          >
            <option value="ALL">All Shifts</option>
            <option value="GS1">GS1 (General Shift)</option>
            <option value="S2">S2 (Second Shift)</option>
            <option value="NS3">NS3 (Night Shift)</option>
          </select>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#493287] hover:bg-[#3B2870] text-white text-[11px] font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto w-full">
        {loading ? (
          <div className="space-y-2 py-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-9 w-full rounded" />
            ))}
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--secondary)] uppercase text-[9.5px] font-bold tracking-wider bg-[var(--surface-hover)]">
                <th className="py-2.5 px-3">Shift</th>
                <th className="py-2.5 px-2 text-right">Target Planned</th>
                <th className="py-2.5 px-2 text-right">Actual Output</th>
                <th className="py-2.5 px-2 text-center">Achievement %</th>
                <th className="py-2.5 px-2 text-right">Good Quantity</th>
                <th className="py-2.5 px-2 text-right">Reject Quantity</th>
                <th className="py-2.5 px-2 text-center">Rejection %</th>
                <th className="py-2.5 px-2 text-right">Present Staff</th>
                <th className="py-2.5 px-2 text-right">Absent Staff</th>
                <th className="py-2.5 px-2 text-center">Attendance Rate</th>
                <th className="py-2.5 px-2 text-right">Downtime</th>
                <th className="py-2.5 px-3 text-right">Throughput / Present</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-[var(--secondary)]">
                    No matching shift records found.
                  </td>
                </tr>
              ) : (
                filteredData.map((row) => (
                  <tr
                    key={row.shift_code}
                    className="hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <td className="py-2.5 px-3 font-bold text-blue-600">
                      <span className="inline-block px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900 font-extrabold text-[10.5px]">
                        {row.shift_code}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium text-[var(--text)]">
                      {row.target_planned.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-bold text-[var(--text)]">
                      {row.actual_output.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded font-extrabold text-[10px] ${
                          row.achievement_pct >= 83
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200 dark:border-amber-900'
                            : 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 border border-orange-200 dark:border-orange-900'
                        }`}
                      >
                        {row.achievement_pct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {row.good_quantity.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium text-rose-500">
                      {row.reject_quantity.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded font-bold text-[10px] bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-200 dark:border-rose-900">
                        {row.rejection_pct}%
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium text-[var(--text)]">
                      {row.present_staff.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium text-rose-500">
                      {row.absent_staff.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <span className="inline-block px-1.5 py-0.5 rounded font-bold text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-900">
                        {row.attendance_rate}%
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-medium text-[var(--text)]">
                      {row.downtime_min.toLocaleString()} mins
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-purple-600 dark:text-purple-400">
                      {row.throughput_present}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </Card>
  );
}

