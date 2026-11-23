import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Table,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const PAGE_SIZE = 10;

export function TeamProductionTable({
  data = null,
  loading = false,
  error = null,
}) {
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const rawItems = !error ? (data?.items ?? []) : [];

  // Filter items based on search and selected team
  const filteredItems = useMemo(() => {
    return rawItems.filter((t) => {
      const matchSearch =
        !search.trim() ||
        t.operator_team.toLowerCase().includes(search.toLowerCase().trim());
      const matchTeam = !selectedTeam || t.operator_team === selectedTeam;
      return matchSearch && matchTeam;
    });
  }, [rawItems, search, selectedTeam]);

  // Pagination calculation
  const totalItems = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedItems = filteredItems.slice(startIndex, startIndex + PAGE_SIZE);

  // CSV Export handler
  function handleExportCSV() {
    if (!filteredItems || filteredItems.length === 0) return;

    const headers = [
      'Team',
      'Headcount',
      'Target',
      'Actual',
      'Good Qty',
      'Reject Qty',
      'Rejection %',
      'Downtime',
      'Achievement %',
      'Present Days',
      'Throughput / Present',
    ];

    const rows = filteredItems.map((t) => {
      const rejectPct =
        t.actual_qty > 0
          ? ((t.reject_qty / t.actual_qty) * 100).toFixed(2)
          : '0.00';
      return [
        `"${t.operator_team}"`,
        t.headcount,
        t.target_qty,
        t.actual_qty,
        t.good_qty,
        t.reject_qty,
        `"${rejectPct}%"`,
        `"${t.downtime_min} mins"`,
        `"${t.production_achievement_pct}%"`,
        t.present_employee_count,
        t.production_per_present_employee,
      ].join(',');
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `team_production_performance_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  return (
    <Card className="p-4 w-full flex flex-col min-h-[380px] border border-[var(--border)] shadow-xs">
      {/* Header and Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Table className="w-4 h-4 text-purple-600 shrink-0" />
          <h2 className="text-[13px] sm:text-sm font-bold text-[var(--text)] whitespace-nowrap">
            Team Production &amp; Attendance Performance Table
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search by Team */}
          <div className="relative min-w-[180px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--secondary)]" />
            <input
              type="text"
              placeholder="Search by Team"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-2.5 py-1.5 rounded-lg border text-[11px] outline-none transition-colors"
              style={{
                background: 'var(--brand-bg)',
                borderColor: 'var(--border)',
                color: 'var(--text)',
              }}
            />
          </div>

          {/* Filter by Team */}
          <select
            value={selectedTeam}
            onChange={(e) => {
              setSelectedTeam(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border px-2.5 py-1.5 text-[11px] font-medium outline-none transition-colors"
            style={{
              background: 'var(--brand-bg)',
              borderColor: 'var(--border)',
              color: 'var(--text)',
            }}
          >
            <option value="">All Teams</option>
            {rawItems.map((t) => (
              <option key={t.operator_team} value={t.operator_team}>
                {t.operator_team}
              </option>
            ))}
          </select>

          {/* Export CSV Button */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={filteredItems.length === 0}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div
        className="border rounded-xl overflow-x-auto max-h-[440px] flex-1"
        style={{ borderColor: 'var(--border)' }}
      >
        <table className="w-full text-left border-collapse text-[11px]">
          <thead className="sticky top-0 z-10">
            <tr
              className="font-bold border-b text-[var(--secondary)]"
              style={{
                borderColor: 'var(--border)',
                background: 'var(--brand-bg)',
              }}
            >
              <th className="px-3 py-2.5 whitespace-nowrap">Team</th>
              <th className="px-3 py-2.5 whitespace-nowrap text-center">
                Headcount
              </th>
              <th className="px-3 py-2.5 whitespace-nowrap text-right">
                Target
              </th>
              <th className="px-3 py-2.5 whitespace-nowrap text-right">
                Actual
              </th>
              <th className="px-3 py-2.5 whitespace-nowrap text-right">
                Good Qty
              </th>
              <th className="px-3 py-2.5 whitespace-nowrap text-right">
                Reject Qty
              </th>
              <th className="px-3 py-2.5 whitespace-nowrap text-right">
                Rejection %
              </th>
              <th className="px-3 py-2.5 whitespace-nowrap text-right">
                Downtime
              </th>
              <th className="px-3 py-2.5 whitespace-nowrap text-right">
                Achievement %
              </th>
              <th className="px-3 py-2.5 whitespace-nowrap text-right">
                Present Days
              </th>
              <th className="px-3 py-2.5 whitespace-nowrap text-right">
                Throughput / Present
              </th>
            </tr>
          </thead>

          {loading ? (
            <tbody>
              <tr>
                <td colSpan={11} className="p-4 space-y-2">
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
                <td
                  colSpan={11}
                  className="py-8 text-center text-rose-500 font-medium"
                >
                  {error}
                </td>
              </tr>
            </tbody>
          ) : pagedItems.length > 0 ? (
            <tbody
              className="divide-y"
              style={{ borderColor: 'var(--border)' }}
            >
              {pagedItems.map((t) => {
                const rejectPct =
                  t.actual_qty > 0
                    ? ((t.reject_qty / t.actual_qty) * 100).toFixed(2)
                    : '0.00';
                return (
                  <tr
                    key={t.operator_team}
                    className="hover:bg-[var(--muted-fill)]/50 transition-colors"
                  >
                    <td className="px-3 py-2 font-bold text-blue-600 whitespace-nowrap">
                      {t.operator_team}
                    </td>
                    <td className="px-3 py-2 text-center text-[var(--secondary)] whitespace-nowrap">
                      {t.headcount}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--text)] whitespace-nowrap">
                      {t.target_qty.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-[var(--text)] whitespace-nowrap">
                      {t.actual_qty.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-emerald-600 whitespace-nowrap">
                      {t.good_qty.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-medium text-rose-500 whitespace-nowrap">
                      {t.reject_qty.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--secondary)] whitespace-nowrap">
                      {rejectPct}%
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--secondary)] whitespace-nowrap">
                      {t.downtime_min} mins
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          t.production_achievement_pct >= 83
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                        }`}
                      >
                        {t.production_achievement_pct}%
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right text-[var(--secondary)] whitespace-nowrap">
                      {t.present_employee_count.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-purple-600 whitespace-nowrap">
                      {t.production_per_present_employee}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          ) : (
            <tbody>
              <tr>
                <td
                  colSpan={11}
                  className="py-8 text-center text-[var(--secondary)]"
                >
                  No team production records found matching the filters.
                </td>
              </tr>
            </tbody>
          )}
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between pt-3 mt-1 border-t border-[var(--border)] text-[10px]">
        <span className="text-[var(--secondary)] font-semibold">
          Showing{' '}
          <strong>{totalItems === 0 ? 0 : startIndex + 1}</strong>–
          <strong>{Math.min(startIndex + PAGE_SIZE, totalItems)}</strong> of{' '}
          <strong>{totalItems}</strong> teams
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={loading || currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="p-1 rounded border border-[var(--border)] hover:bg-[var(--muted-fill)] disabled:opacity-30 cursor-pointer"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-[var(--text)] font-bold">
            Page {currentPage} of {totalPages}
          </span>
          <button
            type="button"
            disabled={loading || currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
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

