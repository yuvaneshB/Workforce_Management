import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Layers,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Shield,
  Star,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserMinus,
  Users,
  UserX,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import {
  fetchEmployees,
  fetchVendorWorkforceOverview,
} from '../../api/workforceApi';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { PaginationControls } from '../common/PaginationControls';
import { StatusBadge } from '../common/StatusBadge';
import { SHIFT_NAMES } from '../../utils/constants';

export function VendorDetailDrawer({ isOpen, onClose, vendor, filters = {} }) {
  const [drawerData, setDrawerData] = useState(null);
  const [drawerLoading, setDrawerLoading] = useState(true);
  const [drawerError, setDrawerError] = useState(null);

  // Vendor employee roster
  const [employees, setEmployees] = useState([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [empOffset, setEmpOffset] = useState(0);
  const [empSearch, setEmpSearch] = useState('');
  const [empLoading, setEmpLoading] = useState(false);

  // Active section tab in drawer: 'overview' | 'roster' | 'attendance' | 'attrition'
  const [activeTab, setActiveTab] = useState('overview');

  const vendorId = vendor?.vendor_id;

  // Load Vendor Overview details
  useEffect(() => {
    if (!isOpen || !vendorId) return;

    let active = true;
    const controller = new AbortController();

    async function loadVendorDetails() {
      setDrawerLoading(true);
      setDrawerError(null);
      try {
        const data = await fetchVendorWorkforceOverview({
          vendorId,
          plantId: filters.plantId || undefined,
          departmentId: filters.departmentId || undefined,
          sectionId: filters.sectionId || undefined,
          shiftId: filters.shiftId || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined,
          period: 'daily',
          signal: controller.signal,
        });
        if (!active) return;
        setDrawerData(data);
      } catch (err) {
        if (!active) return;
        console.error('Failed to load vendor details:', err);
        setDrawerError(err?.response?.data?.detail || err?.message || 'Failed to load vendor details');
      } finally {
        if (active) setDrawerLoading(false);
      }
    }

    loadVendorDetails();
    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen, vendorId, filters]);

  // Load Vendor Employee Roster
  useEffect(() => {
    if (!isOpen || !vendorId) return;

    let active = true;
    const controller = new AbortController();

    async function loadRoster() {
      setEmpLoading(true);
      try {
        const res = await fetchEmployees({
          vendorId,
          employmentType: 'Vendor',
          plantId: filters.plantId || undefined,
          search: empSearch.trim() || undefined,
          limit: 10,
          offset: empOffset,
          signal: controller.signal,
        });
        if (!active) return;
        setEmployees(res?.items || []);
        setTotalEmployees(res?.pagination?.total || 0);
      } catch (err) {
        if (!active) return;
        console.error('Failed to load vendor employee roster:', err);
      } finally {
        if (active) setEmpLoading(false);
      }
    }

    loadRoster();
    return () => {
      active = false;
      controller.abort();
    };
  }, [isOpen, vendorId, empOffset, empSearch, filters.plantId]);

  if (!isOpen || !vendor) return null;

  const currentVendor = drawerData?.vendors?.find((v) => v.vendor_id === vendorId) || vendor;
  const kpis = drawerData?.kpis;
  const attendance = drawerData?.attendance;
  const attrition = drawerData?.attrition;
  const allocation = drawerData?.allocation;

  const isContractActive = (currentVendor?.status || '').toLowerCase() === 'active';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs">
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <aside className="w-screen max-w-3xl bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/70 dark:bg-slate-900/80">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">
                    {currentVendor?.vendor_name}
                  </h2>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                    {currentVendor?.vendor_id}
                  </span>
                  <StatusBadge
                    background={isContractActive ? 'var(--emerald-soft)' : 'var(--brand-peach-soft)'}
                    color={isContractActive ? '#0E9C86' : '#F58A3A'}
                  >
                    {currentVendor?.status || 'Active'}
                  </StatusBadge>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {currentVendor?.service_category || 'Workforce Staffing Partner'} • Operating in {currentVendor?.city || currentVendor?.plant || 'Manufacturing Plants'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="px-5 pt-3 border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto no-scrollbar bg-white dark:bg-slate-900">
            {[
              { id: 'overview', label: 'Vendor Overview', icon: Building2 },
              { id: 'roster', label: `Employee Roster (${kpis?.total_vendor_employees ?? currentVendor?.total_employees ?? 0})`, icon: Users },
              { id: 'attendance', label: 'Attendance Compliance', icon: Clock },
              { id: 'attrition', label: `Exits & Attrition (${attrition?.total_exits ?? 0})`, icon: UserMinus },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`h-9 px-3.5 text-xs font-semibold rounded-t-xl transition-colors flex items-center gap-1.5 border-b-2 shrink-0 ${
                    isActive
                      ? 'border-purple-600 text-purple-600 dark:text-purple-400 font-bold bg-purple-50/50 dark:bg-purple-950/20'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {drawerError && (
              <div className="p-3.5 rounded-xl border bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{drawerError}</span>
              </div>
            )}

            {/* TAB 1: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-5">
                {/* 4 Mini KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <div className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400">Total Workforce</div>
                    <div className="text-xl font-black text-slate-900 dark:text-white mt-1">
                      {currentVendor?.total_employees ?? '—'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Staffing quota</div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/20">
                    <div className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">Assigned Active</div>
                    <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                      {currentVendor?.assigned_employees ?? '—'}
                    </div>
                    <div className="text-[10px] text-emerald-600/80 mt-0.5">Active shopfloor</div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/20">
                    <div className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">Unassigned / Exited</div>
                    <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-1">
                      {currentVendor?.unassigned_employees ?? '—'}
                    </div>
                    <div className="text-[10px] text-amber-600/80 mt-0.5">Inactive/resigned</div>
                  </div>

                  <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-800/40 bg-blue-50/30 dark:bg-blue-950/20">
                    <div className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-400">Performance Rating</div>
                    <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1">
                      <span>{currentVendor?.performance_rating ? `${currentVendor.performance_rating}/5.0` : '4.6/5.0'}</span>
                      <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                    </div>
                    <div className="text-[10px] text-blue-600/80 mt-0.5">SLA evaluation</div>
                  </div>
                </div>

                {/* Contract & Contact Information Card */}
                <Card className="p-4 border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5 text-purple-600" />
                    <span>Contract & Commercial Details</span>
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div className="space-y-1">
                      <span className="text-slate-400 block text-[11px]">Primary Contact Person</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {currentVendor?.contact_person || 'HR Relationship Manager'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 block text-[11px]">Payment Terms</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {currentVendor?.payment_terms_days ? `Net ${currentVendor.payment_terms_days} Days` : 'Net 30 Days'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 block text-[11px]">Contract Period</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {currentVendor?.contract_start || '2024-01-01'} to {currentVendor?.contract_end || '2026-12-31'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 block text-[11px]">Registered Location</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {currentVendor?.city ? `${currentVendor.city}, ${currentVendor.state || 'India'}` : 'Tamil Nadu / Karnataka'}
                      </span>
                    </div>
                  </div>
                </Card>

                {/* Associated Plants & Departments */}
                <Card className="p-4 border-slate-200 dark:border-slate-800">
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-purple-600" />
                    <span>Operational Footprint</span>
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-slate-400 block text-[11px] mb-1">Associated Plants</span>
                      <div className="flex flex-wrap gap-2">
                        {(currentVendor?.plant || 'IN-TN-01')
                          .split(',')
                          .map((p) => p.trim())
                          .map((p) => (
                            <span
                              key={p}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-800/60"
                            >
                              {p === 'IN-TN-01' ? 'Chennai Electronics Plant (IN-TN-01)' : p === 'IN-KA-01' ? 'Bengaluru Electronics Plant (IN-KA-01)' : p}
                            </span>
                          ))}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 block text-[11px] mb-1">Supported Departments</span>
                      <div className="flex flex-wrap gap-1.5">
                        {allocation?.by_department?.map((d) => (
                          <span
                            key={d.id}
                            className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
                          >
                            {d.label}: <strong className="text-slate-900 dark:text-white">{d.assigned} active</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 2: EMPLOYEE ROSTER */}
            {activeTab === 'roster' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={empSearch}
                      onChange={(e) => {
                        setEmpSearch(e.target.value);
                        setEmpOffset(0);
                      }}
                      placeholder="Search vendor employees..."
                      className="w-full h-8 pl-8 pr-3 rounded-lg border text-xs outline-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800"
                    />
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Showing {employees.length} of {totalEmployees} contractor personnel
                  </span>
                </div>

                <div className="border rounded-xl overflow-x-auto border-slate-200 dark:border-slate-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200 dark:border-slate-800">
                        <th className="p-2.5">Employee ID</th>
                        <th className="p-2.5">Name</th>
                        <th className="p-2.5">Plant</th>
                        <th className="p-2.5">Department</th>
                        <th className="p-2.5">Section</th>
                        <th className="p-2.5">Role</th>
                        <th className="p-2.5">Grade</th>
                        <th className="p-2.5">Shift</th>
                        <th className="p-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                      {empLoading ? (
                        <tr>
                          <td colSpan={9} className="p-4 space-y-2">
                            <LoadingSkeleton className="h-6 w-full rounded" />
                            <LoadingSkeleton className="h-6 w-full rounded" />
                            <LoadingSkeleton className="h-6 w-full rounded" />
                          </td>
                        </tr>
                      ) : employees.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-xs text-slate-400">
                            No employees found matching criteria.
                          </td>
                        </tr>
                      ) : (
                        employees.map((emp) => (
                          <tr key={emp.employee_id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <td className="p-2.5 font-bold text-slate-900 dark:text-white">{emp.employee_id}</td>
                            <td className="p-2.5 text-slate-700 dark:text-slate-300 font-medium">{emp.employee_name || '—'}</td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400">{emp.plant_id}</td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400">{emp.department_name || emp.department_id}</td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400">{emp.section_name || emp.section_id}</td>
                            <td className="p-2.5 text-slate-700 dark:text-slate-300">{emp.role}</td>
                            <td className="p-2.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                                {emp.skill_grade}
                              </span>
                            </td>
                            <td className="p-2.5 text-slate-600 dark:text-slate-400">
                              {SHIFT_NAMES[emp.home_shift] || `Shift ${emp.home_shift}`}
                            </td>
                            <td className="p-2.5">
                              <StatusBadge
                                background={emp.active_status === 'Active' ? 'var(--emerald-soft)' : 'var(--rose-soft)'}
                                color={emp.active_status === 'Active' ? '#0E9C86' : '#E45C72'}
                              >
                                {emp.active_status}
                              </StatusBadge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <PaginationControls
                  total={totalEmployees}
                  limit={10}
                  offset={empOffset}
                  onPageChange={setEmpOffset}
                />
              </div>
            )}

            {/* TAB 3: ATTENDANCE */}
            {activeTab === 'attendance' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Attendance Rate</span>
                    <div className="text-xl font-extrabold text-purple-600 dark:text-purple-400 mt-1">
                      {attendance?.attendance_pct != null ? `${attendance.attendance_pct}%` : '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-950/20">
                    <span className="text-[10px] uppercase font-bold text-emerald-700">Present Shifts</span>
                    <div className="text-xl font-extrabold text-emerald-600 mt-1">
                      {attendance?.present_count?.toLocaleString() ?? '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-800/40 bg-rose-50/30 dark:bg-rose-950/20">
                    <span className="text-[10px] uppercase font-bold text-rose-700">Absent Shifts</span>
                    <div className="text-xl font-extrabold text-rose-600 mt-1">
                      {attendance?.absent_count?.toLocaleString() ?? '—'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800/40 bg-amber-50/30 dark:bg-amber-950/20">
                    <span className="text-[10px] uppercase font-bold text-amber-700">Late Arrivals</span>
                    <div className="text-xl font-extrabold text-amber-600 mt-1">
                      {attendance?.late_count?.toLocaleString() ?? '—'}
                    </div>
                  </div>
                </div>

                <Card className="p-4 border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                    Recent Attendance Compliance Trajectory
                  </h4>
                  <p className="text-[11px] text-slate-500 mb-3">
                    Aggregated across {attendance?.trend?.length || 0} recorded shift periods. Total recorded shifts: {attendance?.present_count + attendance?.absent_count + attendance?.leave_count || 0}.
                  </p>
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-56 overflow-y-auto">
                    {attendance?.trend?.slice(-7).reverse().map((pt) => (
                      <div key={pt.date} className="py-2 flex items-center justify-between text-xs">
                        <span className="font-mono text-slate-600 dark:text-slate-400">{pt.date}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-600 font-semibold">{pt.present} Present</span>
                          <span className="text-rose-600 font-semibold">{pt.absent} Absent</span>
                          <span className="text-amber-600 font-semibold">{pt.late} Late</span>
                          <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                            {pt.attendance_pct}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>
            )}

            {/* TAB 4: ATTRITION */}
            {activeTab === 'attrition' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20">
                    <span className="text-[10px] uppercase font-bold text-rose-700 dark:text-rose-400">Total Exited Personnel</span>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                      {attrition?.total_exits ?? 0}
                    </div>
                    <div className="text-[10px] text-rose-700/80 mt-0.5">Recorded vendor contract departures</div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40">
                    <span className="text-[10px] uppercase font-bold text-slate-500">Dominant Exit Reason</span>
                    <div className="text-sm font-bold text-slate-900 dark:text-white mt-1 truncate">
                      {attrition?.exit_reasons?.[0]?.reason || 'Contract Completed'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {attrition?.exit_reasons?.[0]?.count || 0} occurrences ({attrition?.exit_reasons?.[0]?.percentage || 0}%)
                    </div>
                  </div>
                </div>

                <Card className="p-4 border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">
                    Recorded Contractor Exit Reasons
                  </h4>
                  <div className="space-y-2.5">
                    {attrition?.exit_reasons?.map((r) => (
                      <div key={r.reason} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">{r.reason}</span>
                          <span className="text-slate-500 font-mono">
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
                    {(!attrition?.exit_reasons || attrition.exit_reasons.length === 0) && (
                      <div className="text-xs text-slate-400 text-center py-4">
                        Zero recorded exits for this partner agency.
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default VendorDetailDrawer;

