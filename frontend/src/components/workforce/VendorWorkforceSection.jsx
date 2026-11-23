import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Database,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Layers,
  RefreshCw,
  RotateCcw,
  Search,
  Shield,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
  UserX,
} from 'lucide-react';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import {
  fetchDepartments,
  fetchEmployees,
  fetchSections,
  fetchVendorWorkforceOverview,
} from '../../api/workforceApi';
import { extractApiErrorMessage } from '../../api/client';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { KPICard } from '../common/KPICard';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { PaginationControls } from '../common/PaginationControls';
import { StatusBadge } from '../common/StatusBadge';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS, PLANT_OPTIONS, SHIFT_NAMES } from '../../utils/constants';
import { VendorDetailDrawer } from './VendorDetailDrawer';

const PAGE_SIZE = 20;

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

export function VendorWorkforceSection({
  startDate: parentStartDate,
  endDate: parentEndDate,
  plantId: parentPlantId,
  departmentId: parentDepartmentId,
  sectionId: parentSectionId,
  shiftId: parentShiftId,
  search: parentSearch,
  departments = [],
  sections = [],
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  // ---------------------------------------------------------------------------
  // OVERVIEW DATA STATE (KPIs, Vendors, Allocation, Attendance, Attrition)
  // ---------------------------------------------------------------------------
  const [overviewData, setOverviewData] = useState(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState(null);

  // Vendor Attendance Trend Period State: 'daily' | 'weekly' | 'monthly'
  const [attendancePeriod, setAttendancePeriod] = useState('daily');

  // Allocation Sub-tab: 'plant' | 'department' | 'section' | 'shift'
  const [allocationTab, setAllocationTab] = useState('department');

  // Attrition View Tab: 'trend' | 'reasons' | 'vendor' | 'plant'
  const [attritionTab, setAttritionTab] = useState('trend');

  // Vendor Directory Table Local Filter State
  const [vendorSearch, setVendorSearch] = useState('');
  const [vendorStatusFilter, setVendorStatusFilter] = useState('');

  // ---------------------------------------------------------------------------
  // VENDOR EMPLOYEE DIRECTORY STATE
  // ---------------------------------------------------------------------------
  const [vendorEmployees, setVendorEmployees] = useState([]);
  const [vendorEmployeesTotal, setVendorEmployeesTotal] = useState(0);
  const [vendorEmpOffset, setVendorEmpOffset] = useState(0);
  const [vendorEmpLoading, setVendorEmpLoading] = useState(true);
  const [vendorEmpError, setVendorEmpError] = useState(null);

  // Dedicated filters for Vendor Employee Directory
  const [selectedVendorFilter, setSelectedVendorFilter] = useState('');
  const [selectedPlantFilter, setSelectedPlantFilter] = useState(parentPlantId || '');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState(parentDepartmentId || '');
  const [selectedSecFilter, setSelectedSecFilter] = useState(parentSectionId || '');
  const [empDirectorySearch, setEmpDirectorySearch] = useState(parentSearch || '');

  // ---------------------------------------------------------------------------
  // VENDOR DETAIL DRAWER STATE
  // ---------------------------------------------------------------------------
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Synchronize parent filter changes
  useEffect(() => {
    if (parentPlantId !== undefined) setSelectedPlantFilter(parentPlantId);
  }, [parentPlantId]);

  useEffect(() => {
    if (parentDepartmentId !== undefined) setSelectedDeptFilter(parentDepartmentId);
  }, [parentDepartmentId]);

  useEffect(() => {
    if (parentSectionId !== undefined) setSelectedSecFilter(parentSectionId);
  }, [parentSectionId]);

  // ---------------------------------------------------------------------------
  // LOAD VENDOR WORKFORCE OVERVIEW
  // ---------------------------------------------------------------------------
  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    setOverviewError(null);
    try {
      const data = await fetchVendorWorkforceOverview({
        plantId: selectedPlantFilter || parentPlantId || undefined,
        departmentId: selectedDeptFilter || parentDepartmentId || undefined,
        sectionId: selectedSecFilter || parentSectionId || undefined,
        shiftId: parentShiftId || undefined,
        vendorId: selectedVendorFilter || undefined,
        startDate: parentStartDate || undefined,
        endDate: parentEndDate || undefined,
        period: attendancePeriod,
      });
      setOverviewData(data);
    } catch (err) {
      const msg = extractApiErrorMessage(err);
      setOverviewError(msg || 'Failed to load vendor workforce data');
    } finally {
      setOverviewLoading(false);
    }
  }, [
    selectedPlantFilter,
    parentPlantId,
    selectedDeptFilter,
    parentDepartmentId,
    selectedSecFilter,
    parentSectionId,
    parentShiftId,
    selectedVendorFilter,
    parentStartDate,
    parentEndDate,
    attendancePeriod,
  ]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // ---------------------------------------------------------------------------
  // LOAD VENDOR EMPLOYEES
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadVendorEmployeeRoster() {
      setVendorEmpLoading(true);
      setVendorEmpError(null);
      try {
        const res = await fetchEmployees({
          search: empDirectorySearch.trim() || undefined,
          plantId: selectedPlantFilter || parentPlantId || undefined,
          departmentId: selectedDeptFilter || parentDepartmentId || undefined,
          sectionId: selectedSecFilter || parentSectionId || undefined,
          vendorId: selectedVendorFilter || undefined,
          homeShift: parentShiftId || undefined,
          employmentType: 'Vendor',
          limit: PAGE_SIZE,
          offset: vendorEmpOffset,
          signal: controller.signal,
        });
        if (!active) return;
        setVendorEmployees(res.items ?? []);
        setVendorEmployeesTotal(res.pagination?.total ?? 0);
      } catch (err) {
        if (!active) return;
        const msg = extractApiErrorMessage(err);
        setVendorEmpError(msg || 'Failed to load vendor employees');
      } finally {
        if (active) setVendorEmpLoading(false);
      }
    }

    loadVendorEmployeeRoster();
    return () => {
      active = false;
      controller.abort();
    };
  }, [
    empDirectorySearch,
    selectedPlantFilter,
    parentPlantId,
    selectedDeptFilter,
    parentDepartmentId,
    selectedSecFilter,
    parentSectionId,
    selectedVendorFilter,
    parentShiftId,
    vendorEmpOffset,
  ]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleOpenVendorDrawer = (vendor) => {
    setSelectedVendor(vendor);
    setIsDrawerOpen(true);
  };

  const handleCloseVendorDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedVendor(null);
  };

  const handleExportVendorDirectory = () => {
    const columns = [
      { label: 'Vendor ID', accessor: (r) => r.vendor_id },
      { label: 'Vendor Name', accessor: (r) => r.vendor_name },
      { label: 'Total Employees', accessor: (r) => r.total_employees },
      { label: 'Assigned Employees', accessor: (r) => r.assigned_employees },
      { label: 'Unassigned Employees', accessor: (r) => r.unassigned_employees },
      { label: 'Plant', accessor: (r) => r.plant },
      { label: 'Department', accessor: (r) => r.department },
      { label: 'Status', accessor: (r) => r.status },
      { label: 'Contact Person', accessor: (r) => r.contact_person || '' },
      { label: 'Service Category', accessor: (r) => r.service_category || '' },
    ];
    exportCsv('vendor_directory.csv', filteredVendors, columns);
  };

  const handleExportVendorEmployees = () => {
    const columns = [
      { label: 'Employee ID', accessor: (r) => r.employee_id },
      { label: 'Employee Name', accessor: (r) => r.employee_name || '' },
      { label: 'Vendor ID', accessor: (r) => r.vendor_id || '' },
      { label: 'Vendor Name', accessor: (r) => r.vendor_name || '' },
      { label: 'Plant', accessor: (r) => r.plant_id || '' },
      { label: 'Department', accessor: (r) => r.department_name || r.department_id || '' },
      { label: 'Section', accessor: (r) => r.section_name || r.section_id || '' },
      { label: 'Team', accessor: (r) => r.team_id || '' },
      { label: 'Role', accessor: (r) => r.role || '' },
      { label: 'Skill Grade', accessor: (r) => r.skill_grade || '' },
      { label: 'Home Shift', accessor: (r) => SHIFT_NAMES[r.home_shift] || r.home_shift },
      { label: 'Status', accessor: (r) => r.active_status || '' },
    ];
    exportCsv('vendor_employee_directory.csv', vendorEmployees, columns);
  };

  // ---------------------------------------------------------------------------
  // FILTERED VENDOR DIRECTORY ITEMS
  // ---------------------------------------------------------------------------
  const rawVendors = overviewData?.vendors || [];
  const filteredVendors = rawVendors.filter((v) => {
    const q = vendorSearch.trim().toLowerCase();
    const matchSearch =
      !q ||
      v.vendor_name.toLowerCase().includes(q) ||
      v.vendor_id.toLowerCase().includes(q) ||
      (v.plant && v.plant.toLowerCase().includes(q));
    const matchStatus =
      !vendorStatusFilter ||
      (v.status || '').toLowerCase() === vendorStatusFilter.toLowerCase();
    return matchSearch && matchStatus;
  });

  const kpis = overviewData?.kpis;
  const allocation = overviewData?.allocation;
  const attendance = overviewData?.attendance;
  const attrition = overviewData?.attrition;

  const selectClass =
    'h-9 rounded-xl border px-3 text-[11px] font-medium outline-none transition-colors shadow-2xs hover:border-purple-300 dark:hover:border-purple-700';
  const selectStyle = {
    borderColor: 'var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
  };

  return (
    <div className="space-y-6">
      {/* ==================================================================== */}
      {/* 1. ERROR ALERT                                                       */}
      {/* ==================================================================== */}
      {overviewError && (
        <div
          role="alert"
          className="rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs border bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
        >
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{overviewError}</span>
          </div>
          <Button variant="outline" onClick={loadOverview}>
            <RefreshCw className="w-3 h-3 inline mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. SECTION A: VENDOR WORKFORCE KPI CARDS                             */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <KPICard
          label="Total Vendor Employees"
          value={kpis?.total_vendor_employees != null ? kpis.total_vendor_employees.toLocaleString() : '—'}
          subtitle="Enrolled contractor personnel"
          icon={Users}
          iconBg="var(--brand-purple-soft)"
          iconColor="#6F3DBA"
          loading={overviewLoading}
        />
        <KPICard
          label="Active Vendors"
          value={kpis?.active_vendors != null ? `${kpis.active_vendors} Agencies` : '—'}
          subtitle="Contractually active partners"
          icon={Building2}
          iconBg="var(--brand-blue-soft)"
          iconColor="#4D8EEB"
          loading={overviewLoading}
        />
        <KPICard
          label="Assigned Employees"
          value={
            kpis?.assigned_employees != null && kpis?.total_vendor_employees
              ? `${kpis.assigned_employees.toLocaleString()} (${((kpis.assigned_employees / kpis.total_vendor_employees) * 100).toFixed(0)}%)`
              : '—'
          }
          subtitle="Current active assignments"
          icon={UserCheck}
          iconBg="var(--emerald-soft)"
          iconColor="#0E9C86"
          loading={overviewLoading}
        />
        <KPICard
          label="Unassigned Employees"
          value={
            kpis?.unassigned_employees != null && kpis?.total_vendor_employees
              ? `${kpis.unassigned_employees.toLocaleString()} (${((kpis.unassigned_employees / kpis.total_vendor_employees) * 100).toFixed(0)}%)`
              : '—'
          }
          subtitle="Exited or unassigned quota"
          icon={UserX}
          iconBg="var(--rose-soft)"
          iconColor="#E45C72"
          loading={overviewLoading}
        />
      </div>

      {/* ==================================================================== */}
      {/* 3. SECTION B: VENDOR DIRECTORY TABLE                                 */}
      {/* ==================================================================== */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Building2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Vendor Directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Authorized staffing partners supplying contractor personnel across manufacturing facilities.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search input for vendors */}
            <div className="relative min-w-[180px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                placeholder="Search vendor name or ID..."
                className="w-full h-8 pl-8 pr-3 rounded-xl border text-[11px] outline-none transition-colors"
                style={selectStyle}
              />
            </div>

            {/* Filter by status */}
            <select
              value={vendorStatusFilter}
              onChange={(e) => setVendorStatusFilter(e.target.value)}
              className="h-8 rounded-xl border px-2.5 text-[11px] outline-none"
              style={selectStyle}
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Renewal Pending">Renewal Pending</option>
            </select>

            {/* Export button */}
            <button
              type="button"
              onClick={handleExportVendorDirectory}
              disabled={filteredVendors.length === 0}
              className="h-8 px-3 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Vendor Table */}
        <div className="mt-4 border rounded-xl overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className="text-[10px] font-bold muted uppercase border-b"
                style={{ borderColor: 'var(--border)', background: 'var(--brand-bg)' }}
              >
                <th className="p-3">Vendor ID</th>
                <th className="p-3">Vendor Name</th>
                <th className="p-3">Total Employees</th>
                <th className="p-3">Assigned Active</th>
                <th className="p-3">Unassigned</th>
                <th className="p-3">Plant</th>
                <th className="p-3">Department</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            {overviewLoading ? (
              <tbody>
                <tr>
                  <td colSpan={9} className="p-4 space-y-2">
                    <LoadingSkeleton className="h-8 w-full rounded" />
                    <LoadingSkeleton className="h-8 w-full rounded" />
                    <LoadingSkeleton className="h-8 w-full rounded" />
                  </td>
                </tr>
              </tbody>
            ) : filteredVendors.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={9} className="py-10 text-center">
                    <EmptyState
                      icon={Database}
                      iconClassName="w-7 h-7 mx-auto muted mb-2"
                      title="No vendors found"
                      titleClassName="text-xs font-bold"
                      description="No partner vendors match the selected filters."
                    />
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y text-[11px]" style={{ borderColor: 'var(--border)' }}>
                {filteredVendors.map((v) => {
                  const isActive = (v.status || '').toLowerCase() === 'active';
                  return (
                    <tr
                      key={v.vendor_id}
                      onClick={() => handleOpenVendorDrawer(v)}
                      className="hover:bg-purple-50/40 dark:hover:bg-purple-950/20 transition-colors cursor-pointer"
                    >
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        {v.vendor_id}
                      </td>
                      <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                        {v.vendor_name}
                      </td>
                      <td className="p-3 font-bold text-slate-900 dark:text-white">
                        {v.total_employees}
                      </td>
                      <td className="p-3 font-medium text-emerald-600 dark:text-emerald-400">
                        {v.assigned_employees} ({v.total_employees ? ((v.assigned_employees / v.total_employees) * 100).toFixed(0) : 0}%)
                      </td>
                      <td className="p-3 font-medium text-amber-600 dark:text-amber-400">
                        {v.unassigned_employees}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {v.plant || '—'}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 max-w-[200px] truncate" title={v.department}>
                        {v.department || '—'}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <StatusBadge
                          background={isActive ? 'var(--emerald-soft)' : 'var(--brand-peach-soft)'}
                          color={isActive ? '#0E9C86' : '#F58A3A'}
                        >
                          {v.status || 'Active'}
                        </StatusBadge>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenVendorDrawer(v);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>
      </Card>

      {/* ==================================================================== */}
      {/* 4. SECTION C: VENDOR EMPLOYEE DIRECTORY TABLE                        */}
      {/* ==================================================================== */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Users className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Vendor Employee Directory</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Complete roster of contractor staff showing assigned vendor, plant, department, and skill grade.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleExportVendorEmployees}
            disabled={vendorEmployees.length === 0}
            className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Roster</span>
          </button>
        </div>

        {/* Directory Local Filter Bar */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={empDirectorySearch}
              onChange={(e) => {
                setEmpDirectorySearch(e.target.value);
                setVendorEmpOffset(0);
              }}
              placeholder="Search by Employee ID, Name, Role..."
              className="w-full h-8 pl-8 pr-3 rounded-xl border text-[11px] outline-none"
              style={selectStyle}
            />
          </div>

          {/* Vendor Filter */}
          <select
            value={selectedVendorFilter}
            onChange={(e) => {
              setSelectedVendorFilter(e.target.value);
              setVendorEmpOffset(0);
            }}
            className="h-8 rounded-xl border px-3 text-[11px] font-medium outline-none"
            style={selectStyle}
          >
            <option value="">All Partner Vendors</option>
            {rawVendors.map((v) => (
              <option key={v.vendor_id} value={v.vendor_id}>
                {v.vendor_id} – {v.vendor_name}
              </option>
            ))}
          </select>

          {/* Plant Filter */}
          <select
            value={selectedPlantFilter}
            onChange={(e) => {
              setSelectedPlantFilter(e.target.value);
              setVendorEmpOffset(0);
            }}
            className="h-8 rounded-xl border px-3 text-[11px] font-medium outline-none"
            style={selectStyle}
          >
            {PLANT_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>

          {/* Department Filter */}
          <select
            value={selectedDeptFilter}
            onChange={(e) => {
              setSelectedDeptFilter(e.target.value);
              setVendorEmpOffset(0);
            }}
            className="h-8 rounded-xl border px-3 text-[11px] font-medium outline-none"
            style={selectStyle}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.department_id} value={d.department_id}>
                {d.department_name}
              </option>
            ))}
          </select>

          {/* Section Filter */}
          <select
            value={selectedSecFilter}
            onChange={(e) => {
              setSelectedSecFilter(e.target.value);
              setVendorEmpOffset(0);
            }}
            className="h-8 rounded-xl border px-3 text-[11px] font-medium outline-none"
            style={selectStyle}
          >
            <option value="">All Sections</option>
            {sections.map((s) => (
              <option key={s.section_id} value={s.section_id}>
                {s.section_name}
              </option>
            ))}
          </select>

          {/* Reset button */}
          {(selectedVendorFilter || selectedPlantFilter || selectedDeptFilter || selectedSecFilter || empDirectorySearch) && (
            <button
              type="button"
              onClick={() => {
                setSelectedVendorFilter('');
                setSelectedPlantFilter('');
                setSelectedDeptFilter('');
                setSelectedSecFilter('');
                setEmpDirectorySearch('');
                setVendorEmpOffset(0);
              }}
              className="h-8 px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Employee Table */}
        <div className="mt-4 border rounded-xl overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr
                className="text-[10px] font-bold muted uppercase border-b"
                style={{ borderColor: 'var(--border)', background: 'var(--brand-bg)' }}
              >
                <th className="p-3">Employee ID</th>
                <th className="p-3">Employee Name</th>
                <th className="p-3">Vendor Partner</th>
                <th className="p-3">Plant</th>
                <th className="p-3">Department</th>
                <th className="p-3">Section</th>
                <th className="p-3">Team</th>
                <th className="p-3">Role</th>
                <th className="p-3">Skill Grade</th>
                <th className="p-3">Home Shift</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            {vendorEmpLoading ? (
              <tbody>
                <tr>
                  <td colSpan={11} className="p-4 space-y-2">
                    <LoadingSkeleton className="h-8 w-full rounded" />
                    <LoadingSkeleton className="h-8 w-full rounded" />
                    <LoadingSkeleton className="h-8 w-full rounded" />
                    <LoadingSkeleton className="h-8 w-full rounded" />
                  </td>
                </tr>
              </tbody>
            ) : vendorEmployees.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={11} className="py-12 text-center">
                    <EmptyState
                      icon={Database}
                      iconClassName="w-8 h-8 mx-auto muted mb-2"
                      title="No vendor employees found"
                      titleClassName="text-xs font-bold"
                      description="No contractor personnel match the selected criteria."
                    />
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y text-[11px]" style={{ borderColor: 'var(--border)' }}>
                {vendorEmployees.map((emp) => {
                  const isActive = (emp.active_status || '').toLowerCase() === 'active';
                  return (
                    <tr key={emp.employee_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white whitespace-nowrap">
                        {emp.employee_id}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                        {emp.employee_name || '—'}
                      </td>
                      <td className="p-3 text-purple-700 dark:text-purple-300 font-semibold whitespace-nowrap">
                        {emp.vendor_name || emp.vendor_id || '—'}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {emp.plant_id}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {emp.department_name || emp.department_id || '—'}
                      </td>
                      <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {emp.section_name || emp.section_id || '—'}
                      </td>
                      <td className="p-3 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                        {emp.team_id || emp.section_id || '—'}
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">
                        {emp.role}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <StatusBadge background="var(--brand-blue-soft)" color="#4D8EEB">
                          {emp.skill_grade}
                        </StatusBadge>
                      </td>
                      <td className="p-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                        {SHIFT_NAMES[emp.home_shift] || `Shift ${emp.home_shift}`}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <StatusBadge
                          background={isActive ? 'var(--emerald-soft)' : 'var(--rose-soft)'}
                          color={isActive ? '#0E9C86' : '#E45C72'}
                        >
                          {emp.active_status}
                        </StatusBadge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            )}
          </table>
        </div>

        {/* Pagination */}
        <PaginationControls
          total={vendorEmployeesTotal}
          limit={PAGE_SIZE}
          offset={vendorEmpOffset}
          onPageChange={setVendorEmpOffset}
        />
      </Card>

      {/* ==================================================================== */}
      {/* 5. SECTION D: VENDOR WORKFORCE ALLOCATION                            */}
      {/* ==================================================================== */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Vendor Workforce Allocation</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Contractor headcount distribution across manufacturing plants, departments, sections, and shifts.
              </p>
            </div>
          </div>

          {/* Sub Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800">
            {[
              { id: 'department', label: 'By Department' },
              { id: 'plant', label: 'By Plant' },
              { id: 'section', label: 'By Section' },
              { id: 'shift', label: 'By Shift' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setAllocationTab(t.id)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  allocationTab === t.id
                    ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-2xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Allocation Content */}
        {overviewLoading ? (
          <div className="py-8 space-y-3">
            <LoadingSkeleton className="h-6 w-full rounded" />
            <LoadingSkeleton className="h-40 w-full rounded" />
          </div>
        ) : (
          <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Chart Column */}
            <div className="lg:col-span-7 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={
                    allocationTab === 'plant'
                      ? allocation?.by_plant || []
                      : allocationTab === 'section'
                      ? allocation?.by_section || []
                      : allocationTab === 'shift'
                      ? allocation?.by_shift || []
                      : allocation?.by_department || []
                  }
                  margin={{ top: 10, right: 10, left: -15, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: palette.text }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10, fill: palette.text }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                      borderRadius: '12px',
                      fontSize: '11px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="assigned" name="Assigned Active" fill="#0E9C86" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="unassigned" name="Unassigned" fill="#F58A3A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Breakdown List Column */}
            <div className="lg:col-span-5 space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {(
                allocationTab === 'plant'
                  ? allocation?.by_plant || []
                  : allocationTab === 'section'
                  ? allocation?.by_section || []
                  : allocationTab === 'shift'
                  ? allocation?.by_shift || []
                  : allocation?.by_department || []
              ).map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-slate-800 dark:text-slate-200">{item.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {item.assigned} Assigned Active • {item.unassigned} Unassigned
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-purple-600 dark:text-purple-400">
                      {item.total} workers
                    </span>
                    <div className="text-[10px] text-slate-400">{item.percentage}% share</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* ==================================================================== */}
      {/* 6. SECTION E & F: VENDOR ATTENDANCE & ATTRITION SUMMARIES            */}
      {/* ==================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* SECTION E: VENDOR ATTENDANCE SUMMARY */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Vendor Attendance Summary</h3>
                  <p className="text-[11px] text-slate-500">Contractor presence and shift reliability metrics</p>
                </div>
              </div>

              {/* Daily/Weekly/Monthly Toggle */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px]">
                {['daily', 'weekly', 'monthly'].map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAttendancePeriod(p)}
                    className={`px-2 py-0.5 rounded capitalize font-semibold transition-colors ${
                      attendancePeriod === p
                        ? 'bg-purple-600 text-white font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Metric Tiles */}
            <div className="grid grid-cols-4 gap-2 mt-4 text-center">
              <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/30">
                <div className="text-[10px] text-emerald-700 font-bold uppercase">Present</div>
                <div className="text-base font-extrabold text-emerald-600 mt-0.5">
                  {attendance?.present_count?.toLocaleString() ?? '—'}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200/50 dark:border-rose-800/30">
                <div className="text-[10px] text-rose-700 font-bold uppercase">Absent</div>
                <div className="text-base font-extrabold text-rose-600 mt-0.5">
                  {attendance?.absent_count?.toLocaleString() ?? '—'}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/30">
                <div className="text-[10px] text-purple-700 font-bold uppercase">Leave</div>
                <div className="text-base font-extrabold text-purple-600 mt-0.5">
                  {attendance?.leave_count?.toLocaleString() ?? '—'}
                </div>
              </div>
              <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/30">
                <div className="text-[10px] text-amber-700 font-bold uppercase">Late</div>
                <div className="text-base font-extrabold text-amber-600 mt-0.5">
                  {attendance?.late_count?.toLocaleString() ?? '—'}
                </div>
              </div>
            </div>

            {/* Attendance Rate Banner */}
            <div className="mt-3.5 p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400 font-medium">Overall Contractor Attendance Rate:</span>
              <span className="font-extrabold text-purple-700 dark:text-purple-300 text-sm">
                {attendance?.attendance_pct != null ? `${attendance.attendance_pct}% Rate` : '—'}
              </span>
            </div>

            {/* Attendance Trend Area Chart */}
            <div className="h-44 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={attendance?.trend || []}
                  margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="vendorAttGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6F3DBA" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6F3DBA" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: palette.text }}
                    interval={attendancePeriod === 'daily' ? 14 : 0}
                  />
                  <YAxis tick={{ fontSize: 9, fill: palette.text }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--surface)',
                      borderColor: 'var(--border)',
                      borderRadius: '10px',
                      fontSize: '11px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="attendance_pct"
                    name="Attendance %"
                    stroke="#6F3DBA"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#vendorAttGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* SECTION F: VENDOR ATTRITION SUMMARY */}
        <Card className="p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
                  <UserMinus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">Vendor Attrition Summary</h3>
                  <p className="text-[11px] text-slate-500">Contractor departures, exit trajectory & recorded reasons</p>
                </div>
              </div>

              {/* Sub-view toggle */}
              <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px]">
                {[
                  { id: 'trend', label: 'Monthly' },
                  { id: 'reasons', label: 'Reasons' },
                  { id: 'vendor', label: 'By Vendor' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAttritionTab(t.id)}
                    className={`px-2 py-0.5 rounded font-semibold transition-colors ${
                      attritionTab === t.id
                        ? 'bg-purple-600 text-white font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Exits Metric */}
            <div className="mt-4 p-3 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-800/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300">
                  Total Vendor Exits in Database:
                </span>
                <p className="text-[10px] text-slate-500">Historical contractor resignation & contract completion events</p>
              </div>
              <span className="text-2xl font-black text-rose-600 dark:text-rose-400">
                {attrition?.total_exits ?? 0}
              </span>
            </div>

            {/* Attrition Views */}
            <div className="mt-3.5 h-48">
              {attritionTab === 'trend' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={attrition?.monthly_trends || []}
                    margin={{ top: 5, right: 10, left: -20, bottom: 15 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 9, fill: palette.text }}
                      angle={-25}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 9, fill: palette.text }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--surface)',
                        borderColor: 'var(--border)',
                        borderRadius: '10px',
                        fontSize: '11px',
                      }}
                    />
                    <Bar dataKey="exits" name="Contractor Exits" fill="#E45C72" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {attritionTab === 'reasons' && (
                <div className="h-full overflow-y-auto space-y-2 pr-1">
                  {(attrition?.exit_reasons || []).map((r) => (
                    <div key={r.reason} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[240px]" title={r.reason}>
                          {r.reason}
                        </span>
                        <span className="font-mono text-slate-500 text-[11px]">
                          {r.count} ({r.percentage}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-rose-500 transition-all duration-300"
                          style={{ width: `${Math.min(100, r.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {attritionTab === 'vendor' && (
                <div className="h-full overflow-y-auto space-y-2 pr-1">
                  {(attrition?.by_vendor || []).map((v) => (
                    <div
                      key={v.key}
                      className="p-2 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">{v.label}</span>
                        <span className="text-[10px] text-slate-400 font-mono ml-2">({v.key})</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-rose-600 dark:text-rose-400">{v.exits} exits</span>
                        <span className="text-[10px] text-slate-400 ml-2">({v.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* ==================================================================== */}
      {/* 7. SECTION G: VENDOR DETAIL DRAWER                                   */}
      {/* ==================================================================== */}
      <VendorDetailDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseVendorDrawer}
        vendor={selectedVendor}
        filters={{
          plantId: selectedPlantFilter || parentPlantId,
          departmentId: selectedDeptFilter || parentDepartmentId,
          sectionId: selectedSecFilter || parentSectionId,
          shiftId: parentShiftId,
          startDate: parentStartDate,
          endDate: parentEndDate,
        }}
      />
    </div>
  );
}

export default VendorWorkforceSection;

