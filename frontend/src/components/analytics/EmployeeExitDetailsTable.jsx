import {
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  Users,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { EXITED_EMPLOYEES_RECORDS } from '../../data/attritionData';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function EmployeeExitDetailsTable({
  records = null,
  employmentTypeFilter = 'ALL',
  vendorFilter: externalVendorFilter = 'ALL',
  loading = false,
}) {
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [vendorFilter, setVendorFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState(5);
  const [currentPage, setCurrentPage] = useState(1);

  // Sync external vendor filter if passed
  const effectiveVendorFilter =
    externalVendorFilter !== 'ALL' ? externalVendorFilter : vendorFilter;

  const allRecords = records && records.length > 0 ? records : EXITED_EMPLOYEES_RECORDS;

  // Filter records
  const filteredRecords = useMemo(() => {
    return allRecords.filter((rec) => {
      const matchSearch =
        !search.trim() ||
        rec.employee_id.toLowerCase().includes(search.toLowerCase().trim()) ||
        rec.employee_name.toLowerCase().includes(search.toLowerCase().trim());

      const matchDept =
        departmentFilter === 'ALL' || rec.department === departmentFilter || rec.department_id === departmentFilter;

      const matchVendor =
        effectiveVendorFilter === 'ALL' ||
        (effectiveVendorFilter === 'Permanent'
          ? rec.employment_type === 'Permanent'
          : (rec.vendor && rec.vendor.toLowerCase().includes(effectiveVendorFilter.toLowerCase())) ||
            (rec.vendor_id && rec.vendor_id.toUpperCase() === effectiveVendorFilter.toUpperCase()));

      const matchType =
        employmentTypeFilter === 'ALL' ||
        rec.employment_type.toUpperCase() === employmentTypeFilter.toUpperCase();

      return matchSearch && matchDept && matchVendor && matchType;
    });
  }, [allRecords, search, departmentFilter, effectiveVendorFilter, employmentTypeFilter]);

  // Pagination calculation
  const totalItems = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const pagedRecords = filteredRecords.slice(startIndex, startIndex + pageSize);

  // CSV Export
  function handleExportCSV() {
    if (!filteredRecords || filteredRecords.length === 0) return;

    const headers = [
      'Employee ID',
      'Employee Name',
      'Department',
      'Section',
      'Employment Type',
      'Vendor',
      'Joining Date',
      'Exit Date',
      'Tenure',
      'Exit Reason',
    ];

    const rows = filteredRecords.map((r) => [
      `"${r.employee_id}"`,
      `"${r.employee_name}"`,
      `"${r.department}"`,
      `"${r.section}"`,
      `"${r.employment_type}"`,
      `"${r.vendor}"`,
      `"${r.joining_date}"`,
      `"${r.exit_date}"`,
      `"${r.tenure}"`,
      `"${r.exit_reason}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `employee_exit_details_${new Date().toISOString().slice(0, 10)}.csv`
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
          <Users className="w-4 h-4 text-purple-600 shrink-0" />
          <h2 className="text-[13px] sm:text-sm font-bold text-[var(--text)] whitespace-nowrap">
            Employee Exit Details
          </h2>
        </div>

        {/* Search, Filters & Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[170px] sm:min-w-[190px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--secondary)]" />
            <input
              type="text"
              placeholder="Search by Employee ID / Name"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-2.5 py-1 text-[11px] rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-[var(--secondary)]"
            />
          </div>

          {/* Department Filter */}
          <select
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 text-[11px] rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            <option value="Production">Production</option>
            <option value="Quality">Quality</option>
            <option value="Maintenance">Maintenance</option>
            <option value="Warehouse">Warehouse</option>
            <option value="Operations">Operations</option>
            <option value="Others">Others</option>
          </select>

          {/* Vendor Filter */}
          <select
            value={vendorFilter}
            onChange={(e) => {
              setVendorFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="px-2.5 py-1 text-[11px] rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
          >
            <option value="ALL">All Vendors</option>
            <option value="Permanent">Permanent Only</option>
            <option value="V1">V1 (Apex)</option>
            <option value="V2">V2 (Prime)</option>
            <option value="V3">V3 (Core)</option>
            <option value="V4">V4 (Summit)</option>
            <option value="V5">V5 (Global)</option>
            <option value="V6">V6 (Precision)</option>
          </select>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#6F3DBA] hover:bg-[#5C329D] text-white text-[11px] font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
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
            {Array.from({ length: 5 }).map((_, i) => (
              <LoadingSkeleton key={i} className="h-9 w-full rounded" />
            ))}
          </div>
        ) : (
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--secondary)] uppercase text-[9.5px] font-bold tracking-wider bg-[var(--surface-hover)]">
                <th className="py-2.5 px-3">Employee ID</th>
                <th className="py-2.5 px-3">Employee Name</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3">Section</th>
                <th className="py-2.5 px-2 text-center">Employment Type</th>
                <th className="py-2.5 px-2 text-center">Vendor</th>
                <th className="py-2.5 px-3 text-center">Joining Date</th>
                <th className="py-2.5 px-3 text-center">Exit Date</th>
                <th className="py-2.5 px-2 text-center">Tenure</th>
                <th className="py-2.5 px-3 text-left">Exit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {pagedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-[var(--secondary)]">
                    No employee exits recorded in database.
                  </td>
                </tr>
              ) : (
                pagedRecords.map((rec) => (
                  <tr
                    key={rec.employee_id}
                    className="hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    <td className="py-2.5 px-3 font-bold text-[var(--text)] whitespace-nowrap">
                      {rec.employee_id}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[var(--text)] whitespace-nowrap">
                      {rec.employee_name}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--secondary)] whitespace-nowrap">
                      {rec.department}
                    </td>
                    <td className="py-2.5 px-3 text-[var(--secondary)] whitespace-nowrap">
                      {rec.section}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                          rec.employment_type === 'Permanent'
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900'
                            : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900'
                        }`}
                      >
                        {rec.employment_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-[var(--text)] whitespace-nowrap">
                      {rec.vendor}
                    </td>
                    <td className="py-2.5 px-3 text-center text-[var(--secondary)] whitespace-nowrap">
                      {rec.joining_date}
                    </td>
                    <td className="py-2.5 px-3 text-center font-medium text-[var(--text)] whitespace-nowrap">
                      {rec.exit_date}
                    </td>
                    <td className="py-2.5 px-2 text-center font-bold text-purple-600 dark:text-purple-400 whitespace-nowrap">
                      {rec.tenure}
                    </td>
                    <td className="py-2.5 px-3 text-left font-medium text-[var(--text)] whitespace-nowrap">
                      {rec.exit_reason}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination Footer */}
      {!loading && (
        <div className="pt-3 border-t border-[var(--border)] flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-[var(--secondary)]">
          <span>
            {totalItems === 0 ? (
              <span>Showing <strong className="text-[var(--text)]">0</strong> records (0 exits)</span>
            ) : (
              <span>
                Showing <strong className="text-[var(--text)]">{startIndex + 1}</strong> –{' '}
                <strong className="text-[var(--text)]">
                  {Math.min(startIndex + pageSize, totalItems)}
                </strong>{' '}
                of <strong className="text-[var(--text)]">{totalItems}</strong> records
              </span>
            )}
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-[10.5px] cursor-pointer"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded border border-[var(--border)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((num) => (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={`w-6 h-6 rounded text-[10.5px] font-bold transition-colors cursor-pointer ${
                    currentPage === num
                      ? 'bg-[#6F3DBA] text-white shadow-xs'
                      : 'hover:bg-[var(--surface-hover)] text-[var(--secondary)]'
                  }`}
                >
                  {num}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded border border-[var(--border)] hover:bg-[var(--surface-hover)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

