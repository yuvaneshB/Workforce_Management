import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  Clock,
  Database,
  Download,
  Filter,
  Layers,
  RefreshCw,
  RotateCcw,
  Search,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  Users,
  UserX,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { extractApiErrorMessage } from '../api/client';
import {
  fetchAttendanceAnalytics,
  fetchAttendanceRecords,
  fetchDepartments,
  fetchEmployees,
  fetchSections,
  fetchShifts,
  fetchWorkforceSummary,
} from '../api/workforceApi';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { EmptyState } from '../components/common/EmptyState';
import { KPICard } from '../components/common/KPICard';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { PaginationControls } from '../components/common/PaginationControls';
import { StatusBadge } from '../components/common/StatusBadge';
import { VendorWorkforceSection } from '../components/workforce/VendorWorkforceSection';
import { useTheme } from '../hooks/useTheme';
import { CHART_COLORS, PLANT_OPTIONS, SHIFT_NAMES } from '../utils/constants';

const PAGE_SIZE = 25;

const PLANTS = PLANT_OPTIONS;

const SHIFTS = [
  { id: '', label: 'All Shifts' },
  { id: 'A', label: 'GS1 (Shift A)' },
  { id: 'B', label: 'S2 (Shift B)' },
  { id: 'C', label: 'NS3 (Shift C)' },
];

function getAttendanceStatusBadge(status) {
  const norm = String(status || '').trim().toUpperCase();
  if (norm === 'PRESENT') {
    return { background: 'var(--emerald-soft)', color: '#0E9C86' };
  }
  if (norm === 'ABSENT') {
    return { background: 'var(--rose-soft)', color: '#E45C72' };
  }
  if (norm === 'LATE') {
    return { background: 'var(--brand-peach-soft)', color: '#F58A3A' };
  }
  if (norm === 'LEAVE') {
    return { background: 'var(--brand-purple-soft)', color: '#6F3DBA' };
  }
  return { background: 'var(--brand-blue-soft)', color: '#4D8EEB' };
}

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

export function WorkforceManagement() {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const validTabs = ['workforce', 'vendor-workforce', 'attendance', 'shifts'];
  const activeTab = validTabs.includes(tabParam) ? tabParam : 'workforce';

  const handleTabChange = useCallback(
    (newTab) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', newTab);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  // ---------------------------------------------------------------------------
  // SHARED FILTER STATES
  // ---------------------------------------------------------------------------
  const [startDate, setStartDate] = useState('2026-08-01');
  const [endDate, setEndDate] = useState('2026-10-31');
  const [plantId, setPlantId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [search, setSearch] = useState('');

  // Dropdown options
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);

  // Applied filter trigger token
  const [filterToken, setFilterToken] = useState(0);

  // ---------------------------------------------------------------------------
  // DATA STATES FOR EACH TAB
  // ---------------------------------------------------------------------------
  // Workforce Tab
  const [workforceItems, setWorkforceItems] = useState([]);
  const [workforceTotal, setWorkforceTotal] = useState(0);
  const [workforceOffset, setWorkforceOffset] = useState(0);
  const [workforceLoading, setWorkforceLoading] = useState(true);
  const [workforceError, setWorkforceError] = useState(null);
  const [summaryData, setSummaryData] = useState(null);

  // Attendance Tab
  const [attendanceItems, setAttendanceItems] = useState([]);
  const [attendanceTotal, setAttendanceTotal] = useState(0);
  const [attendanceOffset, setAttendanceOffset] = useState(0);
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState(null);
  const [attendanceAnalytics, setAttendanceAnalytics] = useState(null);

  // Shifts Tab
  const [shiftItems, setShiftItems] = useState([]);
  const [shiftTotal, setShiftTotal] = useState(0);
  const [shiftOffset, setShiftOffset] = useState(0);
  const [shiftLoading, setShiftLoading] = useState(true);
  const [shiftError, setShiftError] = useState(null);

  // ---------------------------------------------------------------------------
  // LOAD DROPDOWNS (Departments & Sections)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadOptions() {
      try {
        const [deptRes, secRes] = await Promise.all([
          fetchDepartments({ plantId: plantId || undefined, limit: 100, signal: controller.signal }),
          fetchSections({ departmentId: departmentId || undefined, plantId: plantId || undefined, limit: 100, signal: controller.signal }),
        ]);
        if (!active) return;
        setDepartments(deptRes?.items ?? []);
        setSections(secRes?.items ?? []);
      } catch (err) {
        // Non-blocking fallback for dropdowns
        console.warn('Could not load organization dropdowns:', err);
      }
    }

    loadOptions();
    return () => {
      active = false;
      controller.abort();
    };
  }, [plantId, departmentId]);

  // Auto-reset department and section if selection becomes invalid
  useEffect(() => {
    if (departmentId && departments.length > 0) {
      const isValid = departments.some((d) => d.department_id === departmentId);
      if (!isValid) {
        setDepartmentId('');
        setSectionId('');
      }
    }
  }, [departments, departmentId]);

  useEffect(() => {
    if (sectionId && sections.length > 0) {
      const isValid = sections.some((s) => s.section_id === sectionId);
      if (!isValid) {
        setSectionId('');
      }
    }
  }, [sections, sectionId]);

  // ---------------------------------------------------------------------------
  // LOAD WORKFORCE SUMMARY (For Top KPI cards across tabs)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadSummary() {
      try {
        const data = await fetchWorkforceSummary({
          plantId: plantId || undefined,
          departmentId: departmentId || undefined,
          sectionId: sectionId || undefined,
          shiftId: shiftId || undefined,
          signal: controller.signal,
        });
        if (!active) return;
        setSummaryData(data);
      } catch (err) {
        console.warn('Could not load workforce summary:', err);
      }
    }

    loadSummary();
    return () => {
      active = false;
      controller.abort();
    };
  }, [plantId, departmentId, sectionId, shiftId, filterToken]);

  // ---------------------------------------------------------------------------
  // TAB 1: LOAD WORKFORCE EMPLOYEES
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'workforce') return;

    let active = true;
    const controller = new AbortController();

    async function loadWorkforce() {
      setWorkforceLoading(true);
      setWorkforceError(null);
      try {
        const res = await fetchEmployees({
          search: search.trim() || undefined,
          plantId: plantId || undefined,
          homeShift: shiftId || undefined,
          limit: PAGE_SIZE,
          offset: workforceOffset,
          signal: controller.signal,
        });
        if (!active) return;
        setWorkforceItems(res.items ?? []);
        setWorkforceTotal(res.pagination?.total ?? 0);
      } catch (err) {
        if (!active) return;
        const msg = extractApiErrorMessage(err);
        if (msg) setWorkforceError(msg);
      } finally {
        if (active) setWorkforceLoading(false);
      }
    }

    loadWorkforce();
    return () => {
      active = false;
      controller.abort();
    };
  }, [activeTab, search, plantId, shiftId, workforceOffset, filterToken]);

  // ---------------------------------------------------------------------------
  // TAB 2: LOAD ATTENDANCE DATA & ANALYTICS
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'attendance') return;

    let active = true;
    const controller = new AbortController();

    async function loadAttendance() {
      setAttendanceLoading(true);
      setAttendanceError(null);
      try {
        const [recordsRes, analyticsRes] = await Promise.all([
          fetchAttendanceRecords({
            search: search.trim() || undefined,
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            plantId: plantId || undefined,
            departmentId: departmentId || undefined,
            sectionId: sectionId || undefined,
            shiftId: shiftId || undefined,
            limit: PAGE_SIZE,
            offset: attendanceOffset,
            signal: controller.signal,
          }),
          fetchAttendanceAnalytics({
            period: 'daily',
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            plantId: plantId || undefined,
            shiftId: shiftId || undefined,
            signal: controller.signal,
          }),
        ]);
        if (!active) return;
        setAttendanceItems(recordsRes.items ?? []);
        setAttendanceTotal(recordsRes.pagination?.total ?? 0);
        setAttendanceAnalytics(analyticsRes);
      } catch (err) {
        if (!active) return;
        const msg = extractApiErrorMessage(err);
        if (msg) setAttendanceError(msg);
      } finally {
        if (active) setAttendanceLoading(false);
      }
    }

    loadAttendance();
    return () => {
      active = false;
      controller.abort();
    };
  }, [activeTab, search, startDate, endDate, plantId, departmentId, sectionId, shiftId, attendanceOffset, filterToken]);

  // ---------------------------------------------------------------------------
  // TAB 3: LOAD SHIFT CALENDAR DATA
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (activeTab !== 'shifts') return;

    let active = true;
    const controller = new AbortController();

    async function loadShiftsData() {
      setShiftLoading(true);
      setShiftError(null);
      try {
        const res = await fetchShifts({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          shiftId: shiftId || undefined,
          limit: PAGE_SIZE,
          offset: shiftOffset,
          signal: controller.signal,
        });
        if (!active) return;
        setShiftItems(res.items ?? []);
        setShiftTotal(res.pagination?.total ?? 0);
      } catch (err) {
        if (!active) return;
        const msg = extractApiErrorMessage(err);
        if (msg) setShiftError(msg);
      } finally {
        if (active) setShiftLoading(false);
      }
    }

    loadShiftsData();
    return () => {
      active = false;
      controller.abort();
    };
  }, [activeTab, startDate, endDate, shiftId, shiftOffset, filterToken]);

  // ---------------------------------------------------------------------------
  // FILTER ACTIONS
  // ---------------------------------------------------------------------------
  function handleApplyFilters() {
    setWorkforceOffset(0);
    setAttendanceOffset(0);
    setShiftOffset(0);
    setFilterToken((prev) => prev + 1);
  }

  function handleResetFilters() {
    setStartDate('2026-08-01');
    setEndDate('2026-10-31');
    setPlantId('');
    setDepartmentId('');
    setSectionId('');
    setShiftId('');
    setSearch('');
    setWorkforceOffset(0);
    setAttendanceOffset(0);
    setShiftOffset(0);
    setFilterToken((prev) => prev + 1);
  }

  // ---------------------------------------------------------------------------
  // EXPORT HANDLERS
  // ---------------------------------------------------------------------------
  function handleExportEmployees() {
    const columns = [
      { label: 'Employee ID', accessor: (r) => r.employee_id },
      { label: 'Employee Name', accessor: (r) => r.employee_name || '' },
      { label: 'Team', accessor: (r) => r.team_id },
      { label: 'Role', accessor: (r) => r.role },
      { label: 'Skill Grade', accessor: (r) => r.skill_grade },
      { label: 'Certification', accessor: (r) => r.certification },
      { label: 'Home Shift', accessor: (r) => SHIFT_NAMES[r.home_shift] || r.home_shift },
      { label: 'Status', accessor: (r) => r.active_status },
    ];
    exportCsv('workforce_employee_directory.csv', workforceItems, columns);
  }

  function handleExportAttendance() {
    const columns = [
      { label: 'Date', accessor: (r) => r.work_date },
      { label: 'Employee ID', accessor: (r) => r.employee_id },
      { label: 'Employee Name', accessor: (r) => r.employee_name || '' },
      { label: 'Plant', accessor: (r) => r.plant_id },
      { label: 'Shift', accessor: (r) => SHIFT_NAMES[r.shift_id] || r.shift_id },
      { label: 'Scheduled Hours', accessor: (r) => r.scheduled_hours },
      { label: 'Actual Hours', accessor: (r) => r.actual_hours },
      { label: 'Status', accessor: (r) => r.attendance_status },
    ];
    exportCsv('workforce_attendance_records.csv', attendanceItems, columns);
  }

  const selectClass =
    'h-9 rounded-xl border px-3 text-[11px] font-medium outline-none transition-colors shadow-2xs hover:border-purple-300 dark:hover:border-purple-700';
  const selectStyle = {
    borderColor: 'var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
  };

  return (
    <div className="space-y-5">
      {/* ==================================================================== */}
      {/* 1. SHARED FILTERS CONTAINER (Clean 2-Row Layout)                    */}
      {/* ==================================================================== */}
      <Card className="p-4 border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col gap-3">
          {/* Row 1: Date range, All Plants, All Departments, All Sections, All Shifts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_1fr_1fr] gap-3 items-center w-full">
            {/* Date Range Picker */}
            <div
              className="h-10 rounded-xl border px-3 flex items-center gap-2 text-xs font-medium bg-[var(--surface)] border-[var(--border)] text-[var(--text)] transition-colors hover:border-purple-300 dark:hover:border-purple-700 shadow-2xs w-full min-w-0"
              title="Attendance & Shifts date window"
            >
              <Calendar className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs outline-none cursor-pointer flex-1 min-w-0 text-[var(--text)]"
                aria-label="Start Date"
              />
              <span className="text-slate-400 dark:text-slate-500 font-bold shrink-0">–</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs outline-none cursor-pointer flex-1 min-w-0 text-[var(--text)]"
                aria-label="End Date"
              />
            </div>

            {/* Plant Dropdown */}
            <select
              value={plantId}
              onChange={(e) => {
                setPlantId(e.target.value);
                setDepartmentId('');
                setSectionId('');
                setWorkforceOffset(0);
                setAttendanceOffset(0);
              }}
              aria-label="Filter by Plant"
              className="h-10 w-full rounded-xl border px-3 text-xs font-medium outline-none transition-colors shadow-2xs hover:border-purple-300 dark:hover:border-purple-700 focus:border-purple-500 bg-[var(--surface)] border-[var(--border)] text-[var(--text)] cursor-pointer"
            >
              {PLANTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>

            {/* Department Dropdown */}
            <select
              value={departmentId}
              onChange={(e) => {
                setDepartmentId(e.target.value);
                setSectionId('');
                setWorkforceOffset(0);
                setAttendanceOffset(0);
              }}
              aria-label="Filter by Department"
              className="h-10 w-full rounded-xl border px-3 text-xs font-medium outline-none transition-colors shadow-2xs hover:border-purple-300 dark:hover:border-purple-700 focus:border-purple-500 bg-[var(--surface)] border-[var(--border)] text-[var(--text)] cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.department_name}
                </option>
              ))}
            </select>

            {/* Section Dropdown */}
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              aria-label="Filter by Section"
              className="h-10 w-full rounded-xl border px-3 text-xs font-medium outline-none transition-colors shadow-2xs hover:border-purple-300 dark:hover:border-purple-700 focus:border-purple-500 bg-[var(--surface)] border-[var(--border)] text-[var(--text)] cursor-pointer"
            >
              <option value="">All Sections</option>
              {sections.map((s) => (
                <option key={s.section_id} value={s.section_id}>
                  {s.section_name}
                </option>
              ))}
            </select>

            {/* Shift Dropdown */}
            <select
              value={shiftId}
              onChange={(e) => setShiftId(e.target.value)}
              aria-label="Filter by Shift"
              className="h-10 w-full rounded-xl border px-3 text-xs font-medium outline-none transition-colors shadow-2xs hover:border-purple-300 dark:hover:border-purple-700 focus:border-purple-500 bg-[var(--surface)] border-[var(--border)] text-[var(--text)] cursor-pointer"
            >
              {SHIFTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Row 2: Search Box (flex-1) + Reset & Apply Filters (far right) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
                placeholder="Search by Employee ID, Name, Role..."
                className="w-full h-10 pl-10 pr-3.5 rounded-xl border text-xs outline-none transition-colors shadow-2xs hover:border-purple-300 dark:hover:border-purple-700 focus:border-purple-500 bg-[var(--surface)] border-[var(--border)] text-[var(--text)]"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleResetFilters}
                className="h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>

              <button
                type="button"
                onClick={handleApplyFilters}
                className="h-10 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Apply Filters</span>
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* ==================================================================== */}
      {/* 2. UNIFIED INTERNAL NAVIGATION TABS                                  */}
      {/* ==================================================================== */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => handleTabChange('workforce')}
          className={`h-10 px-5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'workforce'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Workforce</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('vendor-workforce')}
          className={`h-10 px-5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'vendor-workforce'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Vendor Workforce</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('attendance')}
          className={`h-10 px-5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'attendance'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>Attendance</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('shifts')}
          className={`h-10 px-5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-2 shrink-0 ${
            activeTab === 'shifts'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Shifts</span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* 3. TAB 1: WORKFORCE CONTENT                                         */}
      {/* ==================================================================== */}
      {activeTab === 'workforce' && (
        <div className="space-y-5">
          {/* Error Alert */}
          {workforceError && (
            <div
              role="alert"
              className="rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs border bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            >
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{workforceError}</span>
              </div>
              <Button variant="outline" onClick={handleApplyFilters}>
                <RefreshCw className="w-3 h-3 inline mr-1" /> Retry
              </Button>
            </div>
          )}

          {/* KPI Summary Cards (5 Cards driven by live database metrics) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <KPICard
              label="Total Employees"
              value={summaryData?.total_employees != null ? summaryData.total_employees.toLocaleString() : summaryData ? '0' : '—'}
              subtitle="Registered workforce"
              icon={Users}
              iconBg="var(--brand-purple-soft)"
              iconColor="#6F3DBA"
              loading={!summaryData}
            />
            <KPICard
              label="Active Employees"
              value={
                summaryData?.active_employees != null && summaryData?.total_employees > 0
                  ? `${summaryData.active_employees.toLocaleString()} (${((summaryData.active_employees / summaryData.total_employees) * 100).toFixed(0)}%)`
                  : summaryData?.active_employees != null
                  ? summaryData.active_employees.toLocaleString()
                  : summaryData ? '0' : '—'
              }
              subtitle="Current active headcount"
              icon={UserCheck}
              iconBg="var(--emerald-soft)"
              iconColor="#0E9C86"
              loading={!summaryData}
            />
            <KPICard
              label="Active Operations Headcount"
              value={summaryData?.active_employees != null ? summaryData.active_employees.toLocaleString() : summaryData ? '0' : '—'}
              subtitle="Operational operators"
              icon={Clock}
              iconBg="var(--brand-peach-soft)"
              iconColor="#F58A3A"
              loading={!summaryData}
            />
            <KPICard
              label="Operational Departments"
              value={
                summaryData?.total_employees === 0
                  ? '0'
                  : summaryData?.distinct_departments != null
                  ? summaryData.distinct_departments.toLocaleString()
                  : departments?.length > 0
                  ? departments.length.toLocaleString()
                  : '0'
              }
              subtitle="Factory departments"
              icon={Layers}
              iconBg="var(--brand-blue-soft)"
              iconColor="#4D8EEB"
              loading={!summaryData}
            />
            <KPICard
              label="Operational Teams"
              value={
                summaryData?.total_employees === 0
                  ? '0'
                  : summaryData?.distinct_teams != null
                  ? summaryData.distinct_teams.toLocaleString()
                  : summaryData ? '0' : '—'
              }
              subtitle="Roster production teams"
              icon={Users}
              iconBg="var(--rose-soft)"
              iconColor="#E45C72"
              loading={!summaryData}
            />
          </div>

          {/* Employee Directory Card */}
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Users className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Employee Directory</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Complete list of employees with role, skill grade and shift information.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportEmployees}
                disabled={workforceItems.length === 0}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
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
                    <th className="p-3">Team</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Skill Grade</th>
                    <th className="p-3">Certification</th>
                    <th className="p-3">Home Shift</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                {workforceLoading ? (
                  <tbody>
                    <tr>
                      <td colSpan={8} className="p-4 space-y-2">
                        <LoadingSkeleton className="h-8 w-full rounded" />
                        <LoadingSkeleton className="h-8 w-full rounded" />
                        <LoadingSkeleton className="h-8 w-full rounded" />
                        <LoadingSkeleton className="h-8 w-full rounded" />
                      </td>
                    </tr>
                  </tbody>
                ) : workforceItems.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan={8} className="py-14">
                        <EmptyState
                          icon={Database}
                          iconClassName="w-8 h-8 mx-auto muted mb-2"
                          title="No records to display"
                          titleClassName="text-xs font-bold"
                          description="No matching employees found in employee_master with current filter criteria."
                        />
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody className="divide-y text-[11px]" style={{ borderColor: 'var(--border)' }}>
                    {workforceItems.map((emp) => (
                      <tr key={emp.employee_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{emp.employee_id}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">{emp.employee_name || '—'}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{emp.team_id}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{emp.role}</td>
                        <td className="p-3 whitespace-nowrap">
                          <StatusBadge background="var(--brand-blue-soft)" color="#4D8EEB">
                            {emp.skill_grade}
                          </StatusBadge>
                        </td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{emp.certification}</td>
                        <td className="p-3 whitespace-nowrap font-medium text-slate-700 dark:text-slate-300">
                          {SHIFT_NAMES[emp.home_shift] || `Shift ${emp.home_shift}`}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          <StatusBadge background="var(--emerald-soft)" color="#0E9C86">
                            {emp.active_status}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>

            {/* Pagination Controls */}
            <PaginationControls
              total={workforceTotal}
              limit={PAGE_SIZE}
              offset={workforceOffset}
              onPageChange={setWorkforceOffset}
            />
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 4. TAB 2: VENDOR WORKFORCE CONTENT                                   */}
      {/* ==================================================================== */}
      {activeTab === 'vendor-workforce' && (
        <VendorWorkforceSection
          startDate={startDate}
          endDate={endDate}
          plantId={plantId}
          departmentId={departmentId}
          sectionId={sectionId}
          shiftId={shiftId}
          search={search}
          departments={departments}
          sections={sections}
        />
      )}

      {/* ==================================================================== */}
      {/* 5. TAB 3: ATTENDANCE CONTENT                                         */}
      {/* ==================================================================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-5">
          {/* Error Alert */}
          {attendanceError && (
            <div
              role="alert"
              className="rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs border bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            >
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{attendanceError}</span>
              </div>
              <Button variant="outline" onClick={handleApplyFilters}>
                <RefreshCw className="w-3 h-3 inline mr-1" /> Retry
              </Button>
            </div>
          )}

          {/* Attendance KPI Cards (From attendanceAnalytics) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
            <KPICard
              label="Total Scheduled"
              value={attendanceAnalytics?.total_records != null ? `${attendanceAnalytics.total_records.toLocaleString()}` : '—'}
              subtitle="Biometric shift shifts"
              icon={Calendar}
              iconBg="var(--brand-purple-soft)"
              iconColor="#6F3DBA"
              loading={attendanceLoading && !attendanceAnalytics}
            />
            <KPICard
              label="Present Records"
              value={
                attendanceAnalytics?.by_status?.find((s) => String(s.attendance_status || '').toUpperCase() === 'PRESENT')?.record_count != null
                  ? attendanceAnalytics.by_status.find((s) => String(s.attendance_status || '').toUpperCase() === 'PRESENT').record_count.toLocaleString()
                  : attendanceAnalytics?.present_count != null
                  ? attendanceAnalytics.present_count.toLocaleString()
                  : '—'
              }
              subtitle="Verified on-floor presence"
              icon={CheckCircle2}
              iconBg="var(--emerald-soft)"
              iconColor="#0E9C86"
              loading={attendanceLoading && !attendanceAnalytics}
            />
            <KPICard
              label="Absent Records"
              value={
                attendanceAnalytics?.by_status?.find((s) => String(s.attendance_status || '').toUpperCase() === 'ABSENT')?.record_count != null
                  ? attendanceAnalytics.by_status.find((s) => String(s.attendance_status || '').toUpperCase() === 'ABSENT').record_count.toLocaleString()
                  : attendanceAnalytics?.absent_count != null
                  ? attendanceAnalytics.absent_count.toLocaleString()
                  : '—'
              }
              subtitle="Unplanned absenteeism"
              icon={UserX}
              iconBg="var(--rose-soft)"
              iconColor="#E45C72"
              loading={attendanceLoading && !attendanceAnalytics}
            />
            <KPICard
              label="Leave Records"
              value={
                attendanceAnalytics?.by_status?.find((s) => String(s.attendance_status || '').toUpperCase() === 'LEAVE')?.record_count != null
                  ? attendanceAnalytics.by_status.find((s) => String(s.attendance_status || '').toUpperCase() === 'LEAVE').record_count.toLocaleString()
                  : attendanceAnalytics?.leave_count != null
                  ? attendanceAnalytics.leave_count.toLocaleString()
                  : '—'
              }
              subtitle="Approved casual/sick leave"
              icon={CalendarClock}
              iconBg="var(--brand-blue-soft)"
              iconColor="#4D8EEB"
              loading={attendanceLoading && !attendanceAnalytics}
            />
            <KPICard
              label="Late Arrivals"
              value={
                attendanceAnalytics?.by_status?.find((s) => String(s.attendance_status || '').toUpperCase() === 'LATE')?.record_count != null
                  ? attendanceAnalytics.by_status.find((s) => String(s.attendance_status || '').toUpperCase() === 'LATE').record_count.toLocaleString()
                  : attendanceAnalytics?.late_count != null
                  ? attendanceAnalytics.late_count.toLocaleString()
                  : '—'
              }
              subtitle="Tardiness punch logs"
              icon={Clock}
              iconBg="var(--brand-peach-soft)"
              iconColor="#F58A3A"
              loading={attendanceLoading && !attendanceAnalytics}
            />
            <KPICard
              label="Attendance Rate"
              value={
                typeof attendanceAnalytics?.attendance_pct === 'number'
                  ? `${attendanceAnalytics.attendance_pct.toFixed(1)}%`
                  : '—'
              }
              subtitle="Operational presence ratio"
              icon={TrendingUp}
              iconBg="var(--emerald-soft)"
              iconColor="#0E9C86"
              loading={attendanceLoading && !attendanceAnalytics}
            />
          </div>

          {/* Attendance Trends Chart */}
          {attendanceAnalytics?.trends && attendanceAnalytics.trends.length > 0 && (
            <Card className="p-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily Attendance Trend Analysis</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Presence rate and daily attendance percentage across active plants ({startDate} to {endDate}).
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600" />
                    <span className="text-slate-600 dark:text-slate-300">Attendance %</span>
                  </div>
                </div>
              </div>

              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={attendanceAnalytics.trends.slice(-30)} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6F3DBA" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6F3DBA" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                    <XAxis dataKey="label" stroke={palette.axisText} tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} stroke={palette.axisText} tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: palette.tooltipBg,
                        borderColor: palette.tooltipBorder,
                        borderRadius: '0.75rem',
                        fontSize: '11px',
                        color: palette.tooltipText,
                      }}
                      formatter={(val) => [`${val}%`, 'Attendance Rate']}
                    />
                    <Area
                      type="monotone"
                      dataKey="attendance_pct"
                      stroke="#6F3DBA"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#attendanceGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          {/* Attendance Records Table */}
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <CalendarCheck className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Attendance Logs</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Biometric attendance and scheduled hours across manufacturing plants and shifts.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleExportAttendance}
                disabled={attendanceItems.length === 0}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>

            {/* Attendance Table */}
            <div className="mt-4 border rounded-xl overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
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

                {attendanceLoading ? (
                  <tbody>
                    <tr>
                      <td colSpan={8} className="p-4 space-y-2">
                        <LoadingSkeleton className="h-8 w-full rounded" />
                        <LoadingSkeleton className="h-8 w-full rounded" />
                        <LoadingSkeleton className="h-8 w-full rounded" />
                        <LoadingSkeleton className="h-8 w-full rounded" />
                      </td>
                    </tr>
                  </tbody>
                ) : attendanceItems.length === 0 ? (
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
                    {attendanceItems.map((row) => {
                      const badgeStyle = getAttendanceStatusBadge(row.attendance_status);
                      return (
                        <tr key={row.attendance_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                          <td className="p-3 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">{row.work_date}</td>
                          <td className="p-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{row.employee_id}</td>
                          <td className="p-3 text-slate-700 dark:text-slate-300 font-medium whitespace-nowrap">{row.employee_name || '—'}</td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{row.plant_id}</td>
                          <td className="p-3 whitespace-nowrap font-medium">
                            {SHIFT_NAMES[row.shift_id] || `Shift ${row.shift_id}`}
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{row.scheduled_hours} hrs</td>
                          <td className="p-3 text-slate-800 dark:text-slate-200 font-medium whitespace-nowrap">{row.actual_hours} hrs</td>
                          <td className="p-3 whitespace-nowrap">
                            <StatusBadge background={badgeStyle.background} color={badgeStyle.color}>
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

            {/* Pagination Controls */}
            <PaginationControls
              total={attendanceTotal}
              limit={PAGE_SIZE}
              offset={attendanceOffset}
              onPageChange={setAttendanceOffset}
            />
          </Card>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 5. TAB 3: SHIFTS CONTENT                                            */}
      {/* ==================================================================== */}
      {activeTab === 'shifts' && (
        <div className="space-y-5">
          {/* Error Alert */}
          {shiftError && (
            <div
              role="alert"
              className="rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs border bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200"
            >
              <div className="flex items-center gap-2 font-semibold">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{shiftError}</span>
              </div>
              <Button variant="outline" onClick={handleApplyFilters}>
                <RefreshCw className="w-3 h-3 inline mr-1" /> Retry
              </Button>
            </div>
          )}

          {/* Shift Assigned KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <KPICard
              label="Shift A / GS1 (General Shift)"
              value={
                summaryData?.by_home_shift?.find((s) => s.key === 'A')?.count != null
                  ? `${summaryData.by_home_shift.find((s) => s.key === 'A').count} Assigned`
                  : '—'
              }
              subtitle="06:00 – 14:00 (Planned: 480 min | Break: 60 min)"
              icon={CalendarClock}
              iconBg="var(--brand-blue-soft)"
              iconColor="#4D8EEB"
              loading={!summaryData}
            />
            <KPICard
              label="Shift B / S2 (Afternoon Shift)"
              value={
                summaryData?.by_home_shift?.find((s) => s.key === 'B')?.count != null
                  ? `${summaryData.by_home_shift.find((s) => s.key === 'B').count} Assigned`
                  : '—'
              }
              subtitle="14:00 – 22:00 (Planned: 480 min | Break: 60 min)"
              icon={CalendarClock}
              iconBg="var(--brand-purple-soft)"
              iconColor="#6F3DBA"
              loading={!summaryData}
            />
            <KPICard
              label="Shift C / NS3 (Night Shift)"
              value={
                summaryData?.by_home_shift?.find((s) => s.key === 'C')?.count != null
                  ? `${summaryData.by_home_shift.find((s) => s.key === 'C').count} Assigned`
                  : '—'
              }
              subtitle="22:00 – 06:00 (Planned: 480 min | Break: 60 min)"
              icon={CalendarClock}
              iconBg="var(--brand-peach-soft)"
              iconColor="#F58A3A"
              loading={!summaryData}
            />
          </div>

          {/* Shift Schedules Card */}
          <Card className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <Layers className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Shift Calendar Schedules</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Operational shift rosters, start/end windows, and working day configurations ({shiftTotal.toLocaleString()} entries).
                  </p>
                </div>
              </div>
            </div>

            {/* Shift Calendar Table */}
            <div className="mt-4 border rounded-xl overflow-x-auto" style={{ borderColor: 'var(--border)' }}>
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
                {shiftLoading ? (
                  <tbody>
                    <tr>
                      <td colSpan={7} className="p-4 space-y-2">
                        <LoadingSkeleton className="h-8 w-full rounded" />
                        <LoadingSkeleton className="h-8 w-full rounded" />
                        <LoadingSkeleton className="h-8 w-full rounded" />
                      </td>
                    </tr>
                  </tbody>
                ) : shiftItems.length === 0 ? (
                  <tbody>
                    <tr>
                      <td colSpan={7} className="py-14">
                        <EmptyState
                          icon={CalendarClock}
                          iconClassName="w-8 h-8 mx-auto muted mb-2"
                          title="No shift schedules found"
                          titleClassName="text-xs font-bold"
                          description="No matching entries in dim_shift_calendar for the selected filters."
                        />
                      </td>
                    </tr>
                  </tbody>
                ) : (
                  <tbody className="divide-y text-[11px]" style={{ borderColor: 'var(--border)' }}>
                    {shiftItems.map((row) => (
                      <tr key={`${row.calendar_date}-${row.shift_id}`} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                        <td className="p-3 font-bold text-slate-900 dark:text-white whitespace-nowrap">{row.calendar_date}</td>
                        <td className="p-3 whitespace-nowrap">
                          <StatusBadge background="var(--brand-blue-soft)" color="#4D8EEB">
                            {SHIFT_NAMES[row.shift_id] || `Shift ${row.shift_id}`}
                          </StatusBadge>
                        </td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.shift_start.replace('T', ' ')}</td>
                        <td className="p-3 text-slate-700 dark:text-slate-300 whitespace-nowrap">{row.shift_end.replace('T', ' ')}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{row.planned_minutes} min</td>
                        <td className="p-3 text-slate-600 dark:text-slate-400 whitespace-nowrap">{row.break_minutes} min</td>
                        <td className="p-3 whitespace-nowrap">
                          <StatusBadge
                            background={row.is_working_day ? 'var(--emerald-soft)' : 'var(--rose-soft)'}
                            color={row.is_working_day ? '#0E9C86' : '#E45C72'}
                          >
                            {row.is_working_day ? 'Yes' : 'No'}
                          </StatusBadge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                )}
              </table>
            </div>

            {/* Pagination Controls */}
            <PaginationControls
              total={shiftTotal}
              limit={PAGE_SIZE}
              offset={shiftOffset}
              onPageChange={setShiftOffset}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
