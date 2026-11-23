import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  UserCheck,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

function exportCsv(filename, rows, columns) {
  if (!rows || !rows.length) return;
  const headerLine = columns.map((col) => `"${col.label}"`).join(',');
  const rowLines = rows.map((r) =>
    columns
      .map((col) => {
        const val = col.accessor(r);
        const str = val === null || val === undefined ? '' : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      })
      .join(',')
  );
  const csvContent = [headerLine, ...rowLines].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function EmployeeMappingTable({
  employees = [],
  departments = [],
  loading = false,
  externalFilter = null,
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [plantFilter, setPlantFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [empTypeFilter, setEmpTypeFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  // Apply filters
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      // External filter trigger from data quality
      if (externalFilter === 'missing-dept' && emp.department) return false;
      if (externalFilter === 'missing-section' && emp.section) return false;
      if (externalFilter === 'missing-team' && emp.team_id) return false;

      if (plantFilter !== 'ALL' && emp.plant !== plantFilter) return false;
      if (deptFilter !== 'ALL' && emp.department !== deptFilter) return false;
      if (empTypeFilter !== 'ALL' && emp.employmentType !== empTypeFilter) return false;

      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const idMatch = emp.employee_id?.toLowerCase().includes(term);
        const nameMatch = emp.employee_name?.toLowerCase().includes(term);
        if (!idMatch && !nameMatch) return false;
      }
      return true;
    });
  }, [employees, externalFilter, plantFilter, deptFilter, empTypeFilter, searchTerm]);

  // Pagination calculation
  const totalRecords = filteredEmployees.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const currentRecords = filteredEmployees.slice(startIndex, startIndex + pageSize);

  function handleExport() {
    const cols = [
      { label: 'Employee ID', accessor: (r) => r.employee_id },
      { label: 'Employee Name', accessor: (r) => r.employee_name },
      { label: 'Plant', accessor: (r) => r.plant },
      { label: 'Department', accessor: (r) => r.department },
      { label: 'Section', accessor: (r) => r.section },
      { label: 'Team', accessor: (r) => r.team_id },
      { label: 'Employment Type', accessor: (r) => r.employmentType },
      { label: 'Vendor', accessor: (r) => r.vendor },
      { label: 'Status', accessor: (r) => r.status },
    ];
    exportCsv('employee_mapping_assignment.csv', filteredEmployees, cols);
  }

  return (
    <Card className="surface rounded-2xl border border-[var(--border)] shadow-xs flex flex-col justify-between h-full overflow-hidden">
      <div>
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 border-b border-[var(--border)]/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                Employee Mapping & Assignment
              </h3>
              <p className="text-[11px] text-[var(--secondary)]">
                Relational mapping to plant, department, section and team
              </p>
            </div>
          </div>

          {/* Filters & Export */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Search */}
            <div className="flex items-center gap-1.5 surface px-2.5 h-8 rounded-xl border border-[var(--border)] shadow-2xs w-44">
              <Search className="w-3.5 h-3.5 text-[var(--secondary)] shrink-0" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search ID / Name..."
                className="bg-transparent text-xs text-[var(--text)] placeholder-[var(--secondary)] outline-none w-full"
              />
            </div>

            {/* Plant */}
            <div className="flex items-center gap-1 surface px-2 h-8 rounded-xl border border-[var(--border)] shadow-2xs">
              <span className="text-[10.5px] text-[var(--secondary)]">Plant:</span>
              <select
                value={plantFilter}
                onChange={(e) => {
                  setPlantFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-[10.5px] font-bold text-[var(--text)] outline-none cursor-pointer"
              >
                <option value="ALL">All</option>
                <option value="Plant 1">Plant 1</option>
                <option value="Plant 2">Plant 2</option>
              </select>
            </div>

            {/* Dept */}
            <div className="flex items-center gap-1 surface px-2 h-8 rounded-xl border border-[var(--border)] shadow-2xs">
              <span className="text-[10.5px] text-[var(--secondary)]">Dept:</span>
              <select
                value={deptFilter}
                onChange={(e) => {
                  setDeptFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-[10.5px] font-bold text-[var(--text)] outline-none cursor-pointer max-w-[90px] truncate"
              >
                <option value="ALL">All</option>
                {departments.map((d) => (
                  <option key={d.department_id || d.id} value={d.department_name || d.name}>
                    {d.department_name || d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Emp Type */}
            <div className="flex items-center gap-1 surface px-2 h-8 rounded-xl border border-[var(--border)] shadow-2xs">
              <span className="text-[10.5px] text-[var(--secondary)]">Type:</span>
              <select
                value={empTypeFilter}
                onChange={(e) => {
                  setEmpTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-transparent text-[10.5px] font-bold text-[var(--text)] outline-none cursor-pointer"
              >
                <option value="ALL">All</option>
                <option value="Permanent">Permanent</option>
                <option value="Vendor">Vendor</option>
              </select>
            </div>

            {/* Export */}
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center gap-1 px-2.5 h-8 rounded-xl surface border border-[var(--border)] text-[var(--text)] hover:border-[var(--brand-purple)] hover:text-[var(--brand-purple)] transition-colors shadow-2xs text-[10.5px] font-bold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto no-scrollbar">
          {loading ? (
            <div className="p-4 space-y-2">
              <LoadingSkeleton className="h-8 w-full rounded-xl" />
              <LoadingSkeleton className="h-8 w-full rounded-xl" />
              <LoadingSkeleton className="h-8 w-full rounded-xl" />
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] font-extrabold uppercase tracking-wider text-[var(--secondary)] bg-[var(--surface-hover)]/40">
                  <th className="py-2.5 px-3">Employee ID</th>
                  <th className="py-2.5 px-3">Employee Name</th>
                  <th className="py-2.5 px-3">Plant</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Section</th>
                  <th className="py-2.5 px-3">Team</th>
                  <th className="py-2.5 px-3">Employment Type</th>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/60 text-[11px]">
                {currentRecords.map((emp) => (
                  <tr
                    key={emp.employee_id}
                    className="hover:bg-[var(--surface-hover)]/50 transition-colors"
                  >
                    <td className="py-2 px-3 font-bold text-[var(--text)] whitespace-nowrap">
                      {emp.employee_id}
                    </td>
                    <td className="py-2 px-3 font-semibold text-[var(--text)] whitespace-nowrap">
                      {emp.employee_name || '—'}
                    </td>
                    <td className="py-2 px-3 text-[var(--secondary)] whitespace-nowrap">
                      {emp.plant}
                    </td>
                    <td className="py-2 px-3 text-[var(--text)] font-medium whitespace-nowrap">
                      {emp.department || '—'}
                    </td>
                    <td className="py-2 px-3 text-[var(--secondary)] whitespace-nowrap">
                      {emp.section || '—'}
                    </td>
                    <td className="py-2 px-3 text-[var(--brand-purple)] font-bold whitespace-nowrap">
                      {emp.team_id || '—'}
                    </td>
                    <td className="py-2 px-3 font-semibold whitespace-nowrap">
                      <span
                        className={
                          emp.employmentType === 'Permanent'
                            ? 'text-purple-600 dark:text-purple-400'
                            : 'text-sky-600 dark:text-sky-400'
                        }
                      >
                        {emp.employmentType}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-[var(--secondary)] font-medium whitespace-nowrap">
                      {emp.vendor || '—'}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-3.5 py-2.5 border-t border-[var(--border)] text-xs text-[var(--secondary)] bg-[var(--surface-hover)]/20">
        <div>
          Showing <span className="font-bold text-[var(--text)]">{totalRecords === 0 ? 0 : startIndex + 1}</span> -{' '}
          <span className="font-bold text-[var(--text)]">{Math.min(startIndex + pageSize, totalRecords)}</span> of{' '}
          <span className="font-bold text-[var(--text)]">{totalRecords}</span> records
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-[11px]">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="surface border border-[var(--border)] rounded-md px-1.5 py-0.5 text-xs text-[var(--text)] font-semibold outline-none cursor-pointer"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </div>

          {/* Page buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded-lg border border-[var(--border)] surface hover:bg-[var(--surface-hover)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 py-0.5 text-[11px] font-bold text-[var(--text)] bg-[var(--brand-purple-soft)] rounded-md">
              {safePage}
            </span>
            <span className="text-[11px] text-[var(--secondary)]">of {totalPages}</span>
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1 rounded-lg border border-[var(--border)] surface hover:bg-[var(--surface-hover)] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Card>
  );
}

