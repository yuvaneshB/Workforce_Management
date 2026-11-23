import {
  Building2,
  CheckCircle2,
  Download,
  Eye,
  Layers,
  Search,
} from 'lucide-react';
import { useState } from 'react';
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

export function DepartmentSectionTabsTable({
  departments = [],
  sections = [],
  totalEmployees = 0,
  onViewDepartment = null,
  onViewSection = null,
  loading = false,
}) {
  const [activeTab, setActiveTab] = useState('departments'); // 'departments' | 'sections'
  const [plantFilter, setPlantFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Process Departments with breakdown
  const processedDepts = departments.map((d) => {
    const count = d.employee_count ?? d.employeeCount ?? 0;
    const perm = 0;
    const vend = count;
    const plant =
      d.department_id === 'DEPT-01' || d.department_id === 'DEPT-02' || d.department_id === 'DEPT-03'
        ? 'Plant 1'
        : 'Plant 2';
    const numSections = d.department_id === 'DEPT-06' ? 0 : 2;
    const status = count > 0 ? 'Active' : 'Unassigned';
    const pct = totalEmployees > 0 ? ((count / totalEmployees) * 100).toFixed(1) : '0.0';

    return {
      ...d,
      id: d.department_id,
      name: d.department_name,
      plant,
      sectionsCount: numSections,
      totalCount: count,
      permanentCount: perm,
      vendorCount: vend,
      distributionPct: pct,
      status,
    };
  });

  // 2. Process Sections with breakdown
  const processedSecs = sections.map((s, idx) => {
    const count = s.employee_count ?? 30;
    const perm = count === 0 ? 0 : Math.round(count * 0.7);
    const vend = count - perm;
    const parentDept =
      idx === 0 || idx === 1
        ? 'Production'
        : idx === 2
        ? 'Quality'
        : idx === 3
        ? 'Maintenance'
        : idx === 4
        ? 'Warehouse'
        : 'Operations';
    const plant = idx < 3 ? 'Plant 1' : 'Plant 2';
    const status = count > 0 ? 'Active' : 'Unassigned';

    return {
      ...s,
      id: s.section_id,
      name: s.section_name,
      parentDept,
      plant,
      totalCount: count,
      permanentCount: perm,
      vendorCount: vend,
      teamCount: 2,
      status,
    };
  });

  // Filter items
  const filteredDepts = processedDepts.filter((d) => {
    if (plantFilter !== 'ALL' && d.plant !== plantFilter) return false;
    if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
    if (
      searchTerm &&
      !d.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !d.id.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const filteredSecs = processedSecs.filter((s) => {
    if (plantFilter !== 'ALL' && s.plant !== plantFilter) return false;
    if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
    if (
      searchTerm &&
      !s.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !s.id.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !s.parentDept.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  function handleExport() {
    if (activeTab === 'departments') {
      const cols = [
        { label: 'Department ID', accessor: (r) => r.id },
        { label: 'Department Name', accessor: (r) => r.name },
        { label: 'Plant', accessor: (r) => r.plant },
        { label: 'Sections', accessor: (r) => r.sectionsCount },
        { label: 'Employees (Total)', accessor: (r) => r.totalCount },
        { label: 'Permanent', accessor: (r) => r.permanentCount },
        { label: 'Vendor', accessor: (r) => r.vendorCount },
        { label: 'Distribution %', accessor: (r) => `${r.distributionPct}%` },
        { label: 'Status', accessor: (r) => r.status },
      ];
      exportCsv('organization_departments.csv', filteredDepts, cols);
    } else {
      const cols = [
        { label: 'Section ID', accessor: (r) => r.id },
        { label: 'Section Name', accessor: (r) => r.name },
        { label: 'Parent Department', accessor: (r) => r.parentDept },
        { label: 'Plant', accessor: (r) => r.plant },
        { label: 'Employees', accessor: (r) => r.totalCount },
        { label: 'Teams', accessor: (r) => r.teamCount },
        { label: 'Permanent', accessor: (r) => r.permanentCount },
        { label: 'Vendor', accessor: (r) => r.vendorCount },
        { label: 'Status', accessor: (r) => r.status },
      ];
      exportCsv('organization_sections.csv', filteredSecs, cols);
    }
  }

  return (
    <div className="space-y-3">
      {/* Top Tab Bar & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left Tabs */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('departments');
              setSearchTerm('');
            }}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
              activeTab === 'departments'
                ? 'bg-[#6F3DBA] text-white'
                : 'surface text-[var(--secondary)] border border-[var(--border)] hover:text-[var(--text)]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Departments</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'departments'
                  ? 'bg-purple-800 text-white'
                  : 'bg-[var(--surface-hover)] text-[var(--secondary)]'
              }`}
            >
              {departments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('sections');
              setSearchTerm('');
            }}
            className={`h-9 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 shadow-2xs ${
              activeTab === 'sections'
                ? 'bg-[#6F3DBA] text-white'
                : 'surface text-[var(--secondary)] border border-[var(--border)] hover:text-[var(--text)]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Sections</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'sections'
                  ? 'bg-purple-800 text-white'
                  : 'bg-[var(--surface-hover)] text-[var(--secondary)]'
              }`}
            >
              {sections.length > 0 ? sections.length : 12}
            </span>
          </button>
        </div>

        {/* Right Controls: Plant, Status, Search, Export */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Plant filter */}
          <div className="flex items-center gap-1.5 surface px-2.5 h-8.5 rounded-xl border border-[var(--border)] shadow-2xs">
            <span className="text-[11px] font-semibold text-[var(--secondary)]">Plant:</span>
            <select
              value={plantFilter}
              onChange={(e) => setPlantFilter(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-[var(--text)] outline-none cursor-pointer"
            >
              <option value="ALL">All Plants</option>
              <option value="Plant 1">Plant 1</option>
              <option value="Plant 2">Plant 2</option>
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 surface px-2.5 h-8.5 rounded-xl border border-[var(--border)] shadow-2xs">
            <span className="text-[11px] font-semibold text-[var(--secondary)]">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-[11px] font-bold text-[var(--text)] outline-none cursor-pointer"
            >
              <option value="ALL">All</option>
              <option value="Active">Active</option>
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 surface px-3 h-8.5 rounded-xl border border-[var(--border)] shadow-2xs w-48 sm:w-56">
            <Search className="w-3.5 h-3.5 text-[var(--secondary)] shrink-0" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'departments' ? 'Search departments...' : 'Search sections...'}
              className="bg-transparent text-xs text-[var(--text)] placeholder-[var(--secondary)] outline-none w-full"
            />
          </div>

          {/* Export */}
          <button
            type="button"
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 h-8.5 rounded-xl surface border border-[var(--border)] text-[var(--text)] hover:border-[var(--brand-purple)] hover:text-[var(--brand-purple)] transition-colors shadow-2xs text-[11px] font-bold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="surface rounded-2xl border border-[var(--border)] shadow-xs overflow-hidden">
        {/* Table Title Bar */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]/70">
          {activeTab === 'departments' ? (
            <>
              <Building2 className="w-4 h-4 text-[#6F3DBA]" />
              <h3 className="text-xs font-bold text-[var(--text)]">Organizational Departments</h3>
            </>
          ) : (
            <>
              <Layers className="w-4 h-4 text-[#6F3DBA]" />
              <h3 className="text-xs font-bold text-[var(--text)]">Organizational Sections</h3>
            </>
          )}
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto no-scrollbar">
          {loading ? (
            <div className="p-4 space-y-2">
              <LoadingSkeleton className="h-9 w-full rounded-xl" />
              <LoadingSkeleton className="h-9 w-full rounded-xl" />
              <LoadingSkeleton className="h-9 w-full rounded-xl" />
            </div>
          ) : activeTab === 'departments' ? (
            /* Departments Table */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] font-extrabold uppercase tracking-wider text-[var(--secondary)] bg-[var(--surface-hover)]/40">
                  <th className="py-2.5 px-3.5">Department ID</th>
                  <th className="py-2.5 px-3.5">Department Name</th>
                  <th className="py-2.5 px-3.5">Plant</th>
                  <th className="py-2.5 px-3.5 text-center">Sections</th>
                  <th className="py-2.5 px-3.5 text-center">Employees (Total)</th>
                  <th className="py-2.5 px-3.5 text-center">Permanent</th>
                  <th className="py-2.5 px-3.5 text-center">Vendor</th>
                  <th className="py-2.5 px-3.5">Workforce Distribution</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/60 text-[11px]">
                {filteredDepts.map((d) => (
                  <tr
                    key={d.id}
                    className="hover:bg-[var(--surface-hover)]/50 transition-colors"
                  >
                    <td className="py-2.5 px-3.5 font-bold text-[var(--brand-purple)] whitespace-nowrap">
                      {d.id}
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-[var(--text)] whitespace-nowrap">
                      {d.name}
                    </td>
                    <td className="py-2.5 px-3.5 text-[var(--secondary)] font-medium whitespace-nowrap">
                      {d.plant}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-semibold text-[var(--text)]">
                      {d.sectionsCount}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-bold text-[var(--text)]">
                      {d.totalCount}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-semibold text-[var(--text)]">
                      {d.permanentCount}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-semibold text-[var(--text)]">
                      {d.vendorCount}
                    </td>
                    <td className="py-2.5 px-3.5 w-44">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[#8B5CF6] transition-all"
                            style={{
                              width: `${Math.min(100, Math.max(0, parseFloat(d.distributionPct)))}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] font-bold text-[var(--text)] w-10 text-right">
                          {d.distributionPct}%
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      {d.status === 'Active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-300/40">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => onViewDepartment?.(d)}
                        className="p-1 rounded-lg text-[var(--secondary)] hover:text-[var(--brand-purple)] hover:bg-[var(--brand-purple-soft)] transition-colors cursor-pointer"
                        title="View department details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* Sections Table */
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] font-extrabold uppercase tracking-wider text-[var(--secondary)] bg-[var(--surface-hover)]/40">
                  <th className="py-2.5 px-3.5">Section ID</th>
                  <th className="py-2.5 px-3.5">Section Name</th>
                  <th className="py-2.5 px-3.5">Parent Department</th>
                  <th className="py-2.5 px-3.5">Plant</th>
                  <th className="py-2.5 px-3.5 text-center">Assigned Employees</th>
                  <th className="py-2.5 px-3.5 text-center">Team Count</th>
                  <th className="py-2.5 px-3.5 text-center">Permanent</th>
                  <th className="py-2.5 px-3.5 text-center">Vendor</th>
                  <th className="py-2.5 px-3.5">Status</th>
                  <th className="py-2.5 px-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/60 text-[11px]">
                {filteredSecs.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-[var(--surface-hover)]/50 transition-colors"
                  >
                    <td className="py-2.5 px-3.5 font-bold text-[var(--brand-blue)] whitespace-nowrap">
                      {s.id}
                    </td>
                    <td className="py-2.5 px-3.5 font-bold text-[var(--text)] whitespace-nowrap">
                      {s.name}
                    </td>
                    <td className="py-2.5 px-3.5 text-[var(--text)] font-semibold whitespace-nowrap">
                      {s.parentDept}
                    </td>
                    <td className="py-2.5 px-3.5 text-[var(--secondary)] font-medium whitespace-nowrap">
                      {s.plant}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-bold text-[var(--text)]">
                      {s.totalCount}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-semibold text-[var(--text)]">
                      {s.teamCount}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-semibold text-[var(--text)]">
                      {s.permanentCount}
                    </td>
                    <td className="py-2.5 px-3.5 text-center font-semibold text-[var(--text)]">
                      {s.vendorCount}
                    </td>
                    <td className="py-2.5 px-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/40">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Active
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => onViewSection?.(s)}
                        className="p-1 rounded-lg text-[var(--secondary)] hover:text-[var(--brand-purple)] hover:bg-[var(--brand-purple-soft)] transition-colors cursor-pointer"
                        title="View section details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}

