import {
  AlertCircle,
  Award,
  BarChart3,
  Bot,
  CalendarClock,
  Clock,
  Factory,
  FileCheck,
  RefreshCw,
  UserMinus,
  Users,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { extractApiErrorMessage } from '../api/client';
import {
  fetchAttendanceAnalytics,
  fetchComplianceAnalytics,
  fetchDepartmentAnalytics,
  fetchDepartments,
  fetchEmployees,
  fetchExperienceAnalytics,
  fetchGenderAnalytics,
  fetchNewJoinerAnalytics,
  fetchOvertimeAnalytics,
  fetchProductionAnalytics,
  fetchSectionAnalytics,
  fetchSections,
  fetchShiftEfficiencyAnalytics,
  fetchSkillsAnalytics,
  fetchTeamProductionAnalytics,
  fetchVendorAnalytics,
  fetchWorkforceAvailability,
  fetchWorkforceShortages,
  fetchWorkforceSummary,
} from '../api/workforceApi';
import { AnalyticsFilters } from '../components/analytics/AnalyticsFilters';
import { AttendanceAgentDrawer } from '../components/analytics/AttendanceAgentDrawer';
import { WorkforcePlanningAgentDrawer } from '../components/analytics/WorkforcePlanningAgentDrawer';
import { OvertimeAgentDrawer } from '../components/analytics/OvertimeAgentDrawer';
import { AttritionAgentDrawer } from '../components/analytics/AttritionAgentDrawer';
import { ProductionAgentDrawer } from '../components/analytics/ProductionAgentDrawer';
import { SkillTrainingAgentDrawer } from '../components/analytics/SkillTrainingAgentDrawer';
import { VendorAgentDrawer } from '../components/analytics/VendorAgentDrawer';
import { AttendanceCalendarCard } from '../components/analytics/AttendanceCalendarCard';
import { AttendanceKPICards } from '../components/analytics/AttendanceKPICards';
import { AttendanceTrendChart } from '../components/analytics/AttendanceTrendChart';
import { AttritionSection } from '../components/analytics/AttritionSection';
import { ComplianceSection } from '../components/analytics/ComplianceSection';
import { DepartmentAbsenteeismCard } from '../components/analytics/DepartmentAbsenteeismCard';
import { DetailedAttendanceTable } from '../components/analytics/DetailedAttendanceTable';
import { EmployeeMovementCard } from '../components/analytics/EmployeeMovementCard';
import { EmployeeStatusCard } from '../components/analytics/EmployeeStatusCard';
import { EmploymentTypeCard } from '../components/analytics/EmploymentTypeCard';
import { LateArrivalCard } from '../components/analytics/LateArrivalCard';
import { OvertimeSection } from '../components/analytics/OvertimeSection';
import { PlantWorkforceCard } from '../components/analytics/PlantWorkforceCard';
import { ShiftEfficiencySection } from '../components/analytics/ShiftEfficiencySection';
import { ShiftWiseAttendanceCard } from '../components/analytics/ShiftWiseAttendanceCard';
import { SkillMatrixSection } from '../components/analytics/SkillMatrixSection';
import { TeamProductionSection } from '../components/analytics/TeamProductionSection';
import { TeamWorkforceCard } from '../components/analytics/TeamWorkforceCard';
import { VendorAttendanceCard } from '../components/analytics/VendorAttendanceCard';
import { VendorWorkforceCard } from '../components/analytics/VendorWorkforceCard';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { LoadingSkeleton } from '../components/common/LoadingSkeleton';
import { DepartmentAnalytics } from '../components/dashboard/DepartmentAnalytics';
import { ExperienceAnalytics } from '../components/dashboard/ExperienceAnalytics';
import { GenderAnalytics } from '../components/dashboard/GenderAnalytics';
import { NewJoinerAnalytics } from '../components/dashboard/NewJoinerAnalytics';
import { SectionAnalytics } from '../components/dashboard/SectionAnalytics';
import { WorkforceAvailability } from '../components/dashboard/WorkforceAvailability';
import { WorkforceShortage } from '../components/dashboard/WorkforceShortage';
import { useTheme } from '../hooks/useTheme';
import { CHART_COLORS } from '../utils/constants';

const ANALYTICS_TABS = [
  { id: 'workforce', label: 'Workforce', icon: Users },
  { id: 'attendance', label: 'Attendance', icon: CalendarClock },
  { id: 'production', label: 'Production', icon: Factory },
  { id: 'overtime', label: 'Overtime', icon: Clock },
  { id: 'shift-eff', label: 'Shift Efficiency', icon: BarChart3 },
  { id: 'skills', label: 'Skills Matrix', icon: Award },
  { id: 'attrition', label: 'Attrition', icon: UserMinus },
  { id: 'compliance', label: 'Compliance', icon: FileCheck },
];

export function WorkforceAnalytics() {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  // Active module tab with query string synchronization
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    tabParam && ANALYTICS_TABS.some((t) => t.id === tabParam) ? tabParam : 'workforce'
  );

  useEffect(() => {
    if (tabParam && ANALYTICS_TABS.some((t) => t.id === tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [tabParam, activeTab]);

  const handleTabChange = useCallback(
    (tabId) => {
      setActiveTab(tabId);
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('tab', tabId);
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const [isAttendanceAgentOpen, setIsAttendanceAgentOpen] = useState(false);
  const [isPlanningAgentOpen, setIsPlanningAgentOpen] = useState(false);
  const [isOvertimeAgentOpen, setIsOvertimeAgentOpen] = useState(false);
  const [isAttritionAgentOpen, setIsAttritionAgentOpen] = useState(false);
  const [isSkillAgentOpen, setIsSkillAgentOpen] = useState(false);
  const [isProductionAgentOpen, setIsProductionAgentOpen] = useState(false);
  const [isVendorAgentOpen, setIsVendorAgentOpen] = useState(false);

  // Workforce Planning state (Availability & Shortages integrated into Workforce tab)
  const [planningAvailability, setPlanningAvailability] = useState(null);
  const [planningShortages, setPlanningShortages] = useState(null);
  const [planningLoading, setPlanningLoading] = useState(false);
  const [planningError, setPlanningError] = useState(null);

  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [plantId, setPlantId] = useState('');
  const [operatorTeam, setOperatorTeam] = useState('');

  // Dropdown reference lists
  const [departments, setDepartments] = useState([]);
  const [sections, setSections] = useState([]);

  // Base workforce & attendance data
  const [summary, setSummary] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [attendancePeriod, setAttendancePeriod] = useState('daily');
  const [calendarDate, setCalendarDate] = useState('');
  const [production, setProduction] = useState(null);
  const [genderData, setGenderData] = useState(null);
  const [deptData, setDeptData] = useState(null);
  const [expData, setExpData] = useState(null);
  const [njData, setNjData] = useState(null);
  const [secData, setSecData] = useState(null);
  const [vendorData, setVendorData] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [baseLoading, setBaseLoading] = useState(true);
  const [baseError, setBaseError] = useState(null);

  // Five advanced modules data & states
  const [overtimeData, setOvertimeData] = useState(null);
  const [overtimeLoading, setOvertimeLoading] = useState(true);
  const [overtimeError, setOvertimeError] = useState(null);

  const [teamProdData, setTeamProdData] = useState(null);
  const [teamProdLoading, setTeamProdLoading] = useState(true);
  const [teamProdError, setTeamProdError] = useState(null);

  const [shiftEffData, setShiftEffData] = useState(null);
  const [shiftEffLoading, setShiftEffLoading] = useState(true);
  const [shiftEffError, setShiftEffError] = useState(null);

  const [skillsData, setSkillsData] = useState(null);
  const [skillsLoading, setSkillsLoading] = useState(true);
  const [skillsError, setSkillsError] = useState(null);

  const [complianceData, setComplianceData] = useState(null);
  const [complianceLoading, setComplianceLoading] = useState(true);
  const [complianceError, setComplianceError] = useState(null);

  const [reloadToken, setReloadToken] = useState(0);
  const refetchAll = useCallback(() => setReloadToken((p) => p + 1), []);

  const handleResetFilters = useCallback(() => {
    setStartDate('');
    setEndDate('');
    setShiftId('');
    setDepartmentId('');
    setSectionId('');
    setPlantId('');
    setOperatorTeam('');
  }, []);

  const handlePlantChange = useCallback((newPlantId) => {
    setPlantId(newPlantId);
    setDepartmentId('');
    setSectionId('');
  }, []);

  const handleDepartmentChange = useCallback((newDeptId) => {
    setDepartmentId(newDeptId);
    setSectionId('');
  }, []);

  // Fetch departments & sections for filter dropdowns on mount or when plant/dept changes
  useEffect(() => {
    const controller = new AbortController();
    async function loadDropdowns() {
      try {
        const [dRes, sRes] = await Promise.all([
          fetchDepartments({ plantId: plantId || undefined, limit: 100, signal: controller.signal }),
          fetchSections({ departmentId: departmentId || undefined, plantId: plantId || undefined, limit: 100, signal: controller.signal }),
        ]);
        setDepartments(dRes?.items ?? []);
        setSections(sRes?.items ?? []);
      } catch {
        // non-blocking
      }
    }
    loadDropdowns();
    return () => controller.abort();
  }, [plantId, departmentId]);

  // Auto-reset department or section if selection becomes invalid
  useEffect(() => {
    if (departmentId && departments.length > 0) {
      const isValid = departments.some((d) => (d.department_id || d.id) === departmentId);
      if (!isValid) {
        setDepartmentId('');
        setSectionId('');
      }
    }
  }, [departments, departmentId]);

  useEffect(() => {
    if (sectionId && sections.length > 0) {
      const isValid = sections.some((s) => (s.section_id || s.id) === sectionId);
      if (!isValid) {
        setSectionId('');
      }
    }
  }, [sections, sectionId]);

  // Fetch Base Workforce, Demographics & Attendance Data
  useEffect(() => {
    let active = true;

    async function loadBase() {
      setBaseLoading(true);
      setBaseError(null);
      const commonFilters = {
        startDate,
        endDate,
        plantId: plantId || undefined,
        shiftId,
        departmentId,
        sectionId,
      };

      try {
        const [sRes, aRes, pRes, gRes, dRes, eRes, njRes, scRes, vRes, empRes] = await Promise.allSettled([
          fetchWorkforceSummary({
            plantId: plantId || undefined,
          }),
          fetchAttendanceAnalytics({
            period: attendancePeriod,
            startDate,
            endDate,
            plantId: plantId || undefined,
            shiftId: shiftId || undefined,
            departmentId: departmentId || undefined,
            sectionId: sectionId || undefined,
            operatorTeam: operatorTeam || undefined,
          }),
          fetchProductionAnalytics({
            startDate,
            endDate,
            plantId,
            shiftId,
          }),
          fetchGenderAnalytics(commonFilters),
          fetchDepartmentAnalytics(commonFilters),
          fetchExperienceAnalytics(commonFilters),
          fetchNewJoinerAnalytics({ period: 'daily', ...commonFilters }),
          fetchSectionAnalytics(commonFilters),
          fetchVendorAnalytics({
            plantId: plantId || undefined,
          }),
          fetchEmployees({
            limit: 500,
            plantId: plantId || undefined,
            teamId: operatorTeam || undefined,
          }),
        ]);

        if (!active) return;
        if (sRes.status === 'fulfilled' && sRes.value) setSummary(sRes.value);
        if (aRes.status === 'fulfilled' && aRes.value) setAttendance(aRes.value);
        if (pRes.status === 'fulfilled' && pRes.value) setProduction(pRes.value);
        if (gRes.status === 'fulfilled' && gRes.value) setGenderData(gRes.value);
        if (dRes.status === 'fulfilled' && dRes.value) setDeptData(dRes.value);
        if (eRes.status === 'fulfilled' && eRes.value) setExpData(eRes.value);
        if (njRes.status === 'fulfilled' && njRes.value) setNjData(njRes.value);
        if (scRes.status === 'fulfilled' && scRes.value) setSecData(scRes.value);
        if (vRes.status === 'fulfilled' && vRes.value) setVendorData(vRes.value);
        if (empRes.status === 'fulfilled' && empRes.value) setEmployees(empRes.value?.items ?? []);
      } catch (err) {
        if (!active) return;
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          setBaseError(extractApiErrorMessage(err));
        }
      } finally {
        if (active) setBaseLoading(false);
      }
    }

    loadBase();
    return () => {
      active = false;
    };
  }, [startDate, endDate, shiftId, departmentId, sectionId, plantId, operatorTeam, attendancePeriod, reloadToken]);

  // Fetch Workforce Planning Data (Availability & Shortage Gap Analysis) for the Workforce Tab
  useEffect(() => {
    if (activeTab !== 'workforce') return;
    let active = true;

    async function loadPlanning() {
      setPlanningLoading(true);
      setPlanningError(null);
      const targetDate = startDate || '2026-08-01';

      try {
        const [availSettled, shortSettled] = await Promise.allSettled([
          fetchWorkforceAvailability({
            date: targetDate,
            plantId: plantId || undefined,
            shiftId: shiftId || undefined,
            departmentId: departmentId || undefined,
            sectionId: sectionId || undefined,
          }),
          fetchWorkforceShortages({
            date: targetDate,
            plantId: plantId || undefined,
            shiftId: shiftId || undefined,
          }),
        ]);

        if (!active) return;

        if (availSettled.status === 'fulfilled' && availSettled.value) {
          setPlanningAvailability(availSettled.value);
        } else if (availSettled.status === 'rejected') {
          const err = availSettled.reason;
          if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
            console.warn('Workforce planning availability non-blocking error:', err);
          }
        }

        if (shortSettled.status === 'fulfilled' && shortSettled.value) {
          setPlanningShortages(shortSettled.value);
        } else if (shortSettled.status === 'rejected') {
          const err = shortSettled.reason;
          if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
            console.warn('Workforce planning shortages non-blocking error:', err);
          }
        }
      } catch (err) {
        if (!active) return;
        if (err?.name !== 'CanceledError' && err?.code !== 'ERR_CANCELED') {
          console.warn('Workforce planning non-blocking error:', err);
          setPlanningError(extractApiErrorMessage(err));
        }
      } finally {
        if (active) setPlanningLoading(false);
      }
    }

    loadPlanning();
    return () => {
      active = false;
    };
  }, [activeTab, startDate, plantId, shiftId, departmentId, sectionId, reloadToken]);

  // Fetch Overtime Analytics
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadOvertime() {
      setOvertimeLoading(true);
      setOvertimeError(null);
      try {
        const data = await fetchOvertimeAnalytics({
          startDate,
          endDate,
          shiftId,
          departmentId,
          sectionId,
          plantId,
          signal: controller.signal,
        });
        if (active) setOvertimeData(data);
      } catch (err) {
        if (active) setOvertimeError(extractApiErrorMessage(err));
      } finally {
        if (active) setOvertimeLoading(false);
      }
    }

    loadOvertime();
    return () => {
      active = false;
      controller.abort();
    };
  }, [startDate, endDate, shiftId, departmentId, sectionId, plantId, reloadToken]);

  // Fetch Team Production Performance
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadTeamProd() {
      setTeamProdLoading(true);
      setTeamProdError(null);
      try {
        const data = await fetchTeamProductionAnalytics({
          startDate,
          endDate,
          plantId,
          shiftId,
          operatorTeam,
          signal: controller.signal,
        });
        if (active) setTeamProdData(data);
      } catch (err) {
        if (active) setTeamProdError(extractApiErrorMessage(err));
      } finally {
        if (active) setTeamProdLoading(false);
      }
    }

    loadTeamProd();
    return () => {
      active = false;
      controller.abort();
    };
  }, [startDate, endDate, plantId, shiftId, operatorTeam, reloadToken]);

  // Fetch Shift Efficiency Analytics
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadShiftEff() {
      setShiftEffLoading(true);
      setShiftEffError(null);
      try {
        const data = await fetchShiftEfficiencyAnalytics({
          startDate,
          endDate,
          plantId,
          shiftId,
          signal: controller.signal,
        });
        if (active) setShiftEffData(data);
      } catch (err) {
        if (active) setShiftEffError(extractApiErrorMessage(err));
      } finally {
        if (active) setShiftEffLoading(false);
      }
    }

    loadShiftEff();
    return () => {
      active = false;
      controller.abort();
    };
  }, [startDate, endDate, plantId, shiftId, reloadToken]);

  // Fetch Skills Matrix Analytics
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadSkills() {
      setSkillsLoading(true);
      setSkillsError(null);
      try {
        const data = await fetchSkillsAnalytics({
          departmentId,
          sectionId,
          teamId: operatorTeam,
          shiftId,
          plantId: plantId || undefined,
          signal: controller.signal,
        });
        if (active) setSkillsData(data);
      } catch (err) {
        if (active) setSkillsError(extractApiErrorMessage(err));
      } finally {
        if (active) setSkillsLoading(false);
      }
    }

    loadSkills();
    return () => {
      active = false;
      controller.abort();
    };
  }, [departmentId, sectionId, operatorTeam, shiftId, plantId, reloadToken]);

  // Fetch Training Compliance Analytics
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadCompliance() {
      setComplianceLoading(true);
      setComplianceError(null);
      try {
        const data = await fetchComplianceAnalytics({
          startDate,
          endDate,
          shiftId,
          departmentId,
          sectionId,
          plantId,
          signal: controller.signal,
        });
        if (active) setComplianceData(data);
      } catch (err) {
        if (active) setComplianceError(extractApiErrorMessage(err));
      } finally {
        if (active) setComplianceLoading(false);
      }
    }

    loadCompliance();
    return () => {
      active = false;
      controller.abort();
    };
  }, [startDate, endDate, shiftId, departmentId, sectionId, plantId, reloadToken]);

  return (
    <section aria-label="Workforce Analytics">
      {/* Global Analytics Filters */}
      <AnalyticsFilters
        startDate={startDate}
        endDate={endDate}
        shiftId={shiftId}
        departmentId={departmentId}
        sectionId={sectionId}
        plantId={plantId}
        operatorTeam={operatorTeam}
        departments={departments}
        sections={sections}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onShiftChange={setShiftId}
        onDepartmentChange={handleDepartmentChange}
        onSectionChange={setSectionId}
        onPlantChange={handlePlantChange}
        onTeamChange={setOperatorTeam}
        onReset={handleResetFilters}
        onReload={refetchAll}
      />

      {/* Module Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-4 border-b" style={{ borderColor: 'var(--border)' }}>
        {ANALYTICS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'surface border muted hover:text-[var(--foreground)] hover:bg-[var(--muted-fill)]'
              }`}
              style={{
                borderColor: isActive ? 'transparent' : 'var(--border)',
                background: isActive ? '#6F3DBA' : 'var(--surface)',
                color: isActive ? 'var(--on-accent)' : 'inherit',
              }}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Base Error Alert */}
      {baseError && (
        <div
          role="alert"
          className="surface rounded-xl p-3.5 mb-4 flex items-center justify-between gap-3"
          style={{ background: 'var(--rose-soft)' }}
        >
          <div className="flex items-center gap-2 text-[11px] font-semibold">
            <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#E45C72' }} />
            <span>{baseError}</span>
          </div>
          <Button variant="outline" size="sm" onClick={refetchAll}>
            <RefreshCw className="w-3 h-3 inline mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. WORKFORCE ANALYTICS TAB                                               */}
      {/* ========================================================================= */}
      {activeTab === 'workforce' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Workforce Demographics & Role Distribution
              </h2>
              <p className="text-[10px] muted mt-0.5">
                Headcount breakdown by gender, departments, plant sections, tenure buckets, and role classifications.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
              <span className="text-[10px] font-semibold muted">
                {summary?.total_employees ? `${summary.total_employees.toLocaleString()} total workforce` : '1,700 total workforce'}
              </span>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Workforce Planning Agent</span>
                <button
                  type="button"
                  onClick={() => setIsPlanningAgentOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs transition-all duration-150 hover:brightness-110 active:scale-95 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #6F3DBA 0%, #4D8EEB 100%)',
                  }}
                  title="Run Workforce Planning Agent"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Run Agent</span>
                </button>
              </div>
            </div>
          </div>

          {/* Workforce Planning & Availability Intelligence (Required vs Available & Shortages) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-stretch">
            <WorkforceAvailability
              planningAvailability={planningAvailability}
              workforceSummary={summary}
              attendanceAnalytics={attendance}
              loading={planningLoading}
            />
            <WorkforceShortage
              planningShortages={planningShortages}
              planningAvailability={planningAvailability}
              attendanceAnalytics={attendance}
              loading={planningLoading}
            />
          </div>

          {/* Row 1: Gender Analytics | Employment Type Distribution | Employee Status Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            <GenderAnalytics genderAnalytics={genderData} loading={baseLoading} error={baseError} />
            <EmploymentTypeCard workforceSummary={summary} loading={baseLoading} error={baseError} />
            <EmployeeStatusCard workforceSummary={summary} employees={employees} loading={baseLoading} error={baseError} />
          </div>

          {/* Row 2: Department-wise Analytics | Section-wise Analytics | Plant-wise Workforce Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            <DepartmentAnalytics departmentAnalytics={deptData} loading={baseLoading} error={baseError} />
            <SectionAnalytics sectionAnalytics={secData} loading={baseLoading} error={baseError} />
            <PlantWorkforceCard workforceSummary={summary} attendance={attendance} selectedPlantId={plantId} loading={baseLoading} error={baseError} />
          </div>

          {/* Row 3: Vendor-wise Workforce Distribution | Distribution by Role | Team-wise Workforce Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            <VendorWorkforceCard
              vendorData={vendorData}
              loading={baseLoading}
              error={baseError}
            />
            <Card className="p-4 lg:col-span-4 flex flex-col justify-between min-h-[220px]">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Award className="w-4 h-4 shrink-0" style={{ color: '#4D8EEB' }} aria-hidden="true" />
                    <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Distribution by Role</h2>
                  </div>
                  <span className="text-[10px] font-semibold muted shrink-0">employee_master</span>
                </div>
                {baseLoading ? (
                  <LoadingSkeleton className="h-32 w-full rounded-lg" />
                ) : (
                  <div className="h-32 w-full my-1">
                    <ResponsiveContainer width="100%" height={128}>
                      <BarChart data={summary?.by_role ?? []} margin={{ top: 8, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                        <XAxis dataKey="key" stroke={palette.axisText} fontSize={8} tickLine={false} />
                        <YAxis stroke={palette.axisText} fontSize={9} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: palette.tooltipBg,
                            borderColor: palette.tooltipBorder,
                            color: palette.tooltipText,
                            fontSize: '11px',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="count" name="Employees" fill={palette.demand} radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[10px] muted">
                <span>Roles: <strong>{summary?.by_role?.length != null ? `${summary.by_role.length} Categories` : '—'}</strong></span>
                <span>Total: <strong>{summary?.total_employees != null ? `${summary.total_employees} Staff` : '—'}</strong></span>
              </div>
            </Card>
            <TeamWorkforceCard employees={employees} selectedTeam={operatorTeam} loading={baseLoading} error={baseError} />
          </div>

          {/* Row 4: Employee Experience Analytics | New Joiner Analytics | Employee Movement Trend */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            <ExperienceAnalytics experienceAnalytics={expData} loading={baseLoading} error={baseError} />
            <NewJoinerAnalytics newJoinerAnalytics={njData} granularity="daily" loading={baseLoading} error={baseError} />
            <EmployeeMovementCard newJoinerAnalytics={njData} loading={baseLoading} error={baseError} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ATTENDANCE ANALYTICS TAB                                               */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Subheader */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-purple-600" />
                Attendance Overview
              </h2>
              <p className="text-[10px] muted mt-0.5">
                Attendance insights, absenteeism, shift performance and detailed employee attendance records.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
              <span className="text-[10px] font-semibold muted">
                {attendance?.total_records ? `${attendance.total_records.toLocaleString()} verified records` : '177,043 verified records'}
              </span>

              <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Attendance Agent</span>
                <button
                  type="button"
                  onClick={() => setIsAttendanceAgentOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs transition-all duration-150 hover:brightness-110 active:scale-95 cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #6F3DBA 0%, #4D8EEB 100%)',
                  }}
                  title="Run Attendance Intelligence Agent"
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>Run Agent</span>
                </button>
              </div>
            </div>
          </div>

          {/* Row 1: Six Attendance KPI Cards */}
          <AttendanceKPICards
            attendance={attendance}
            loading={baseLoading}
            error={baseError}
          />

          {/* Row 2: Attendance Trend (lg:col-span-6) | Shift-wise Attendance (lg:col-span-3) | Department-wise Absenteeism (lg:col-span-3) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            <AttendanceTrendChart
              attendance={attendance}
              period={attendancePeriod}
              onPeriodChange={setAttendancePeriod}
              loading={baseLoading}
              error={baseError}
            />
            <ShiftWiseAttendanceCard
              attendance={attendance}
              selectedShiftId={shiftId}
              loading={baseLoading}
              error={baseError}
            />
            <DepartmentAbsenteeismCard
              departmentAnalytics={deptData}
              loading={baseLoading}
              error={baseError}
            />
          </div>

          {/* Row 3: Attendance Calendar (lg:col-span-4) | Late Arrival Analysis (lg:col-span-4) | Vendor-wise Attendance (lg:col-span-4) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            <AttendanceCalendarCard
              attendance={attendance}
              selectedDate={calendarDate}
              onDateSelect={(d) => setCalendarDate((prev) => (prev === d ? '' : d))}
              loading={baseLoading}
              error={baseError}
            />
            <LateArrivalCard
              attendance={attendance}
              loading={baseLoading}
              error={baseError}
            />
            <VendorAttendanceCard
              loading={baseLoading}
              error={baseError}
            />
          </div>

          {/* Row 4: Detailed Employee Attendance Records (Full Width Table) */}
          <DetailedAttendanceTable
            startDate={calendarDate || startDate}
            endDate={calendarDate || endDate}
            globalShiftId={shiftId}
            departmentId={departmentId}
            sectionId={sectionId}
            plantId={plantId}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PRODUCTION ANALYTICS TAB                                               */}
      {/* ========================================================================= */}
      {activeTab === 'production' && (
        <div className="space-y-4">
          <TeamProductionSection
            data={teamProdData}
            production={production}
            loading={teamProdLoading || baseLoading}
            error={teamProdError || baseError}
            onRetry={refetchAll}
            palette={palette}
            onRunAgent={() => setIsProductionAgentOpen(true)}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. OVERTIME ANALYTICS TAB                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'overtime' && (
        <OvertimeSection
          data={overtimeData}
          loading={overtimeLoading}
          error={overtimeError}
          onRetry={refetchAll}
          palette={palette}
          onRunAgent={() => setIsOvertimeAgentOpen(true)}
        />
      )}

      {/* ========================================================================= */}
      {/* 5. SHIFT EFFICIENCY TAB                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'shift-eff' && (
        <ShiftEfficiencySection
          data={shiftEffData}
          loading={shiftEffLoading}
          error={shiftEffError}
          onRetry={refetchAll}
          palette={palette}
        />
      )}

      {/* ========================================================================= */}
      {/* 6. SKILLS MATRIX TAB                                                      */}
      {/* ========================================================================= */}
      {activeTab === 'skills' && (
        <SkillMatrixSection
          data={skillsData}
          loading={skillsLoading}
          error={skillsError}
          onRetry={refetchAll}
          palette={palette}
          onRunAgent={() => setIsSkillAgentOpen(true)}
        />
      )}

      {/* ========================================================================= */}
      {/* 7. ATTRITION TAB                                                          */}
      {/* ========================================================================= */}
      {activeTab === 'attrition' && (
        <AttritionSection
          startDate={startDate}
          endDate={endDate}
          plantId={plantId}
          departmentId={departmentId}
          sectionId={sectionId}
          teamId={operatorTeam}
          palette={palette}
          onRunAgent={() => setIsAttritionAgentOpen(true)}
        />
      )}

      {/* ========================================================================= */}
      {/* 8. COMPLIANCE TAB                                                         */}
      {/* ========================================================================= */}
      {activeTab === 'compliance' && (
        <ComplianceSection
          data={complianceData}
          loading={complianceLoading}
          error={complianceError}
          onRetry={refetchAll}
          palette={palette}
        />
      )}

      {/* Attendance Intelligence Agent Slide-over Drawer */}
      <AttendanceAgentDrawer
        isOpen={isAttendanceAgentOpen}
        onClose={() => setIsAttendanceAgentOpen(false)}
        filters={{
          startDate,
          endDate,
          plantId,
          shiftId,
          departmentId,
          sectionId,
          operatorTeam,
        }}
      />

      {/* Workforce Planning Agent Slide-over Drawer */}
      <WorkforcePlanningAgentDrawer
        isOpen={isPlanningAgentOpen}
        onClose={() => setIsPlanningAgentOpen(false)}
        filters={{
          date: startDate || '2026-08-01',
          startDate,
          endDate,
          plantId,
          shiftId,
          departmentId,
          sectionId,
          operatorTeam,
        }}
      />

      {/* Overtime Optimization Agent Slide-over Drawer */}
      <OvertimeAgentDrawer
        isOpen={isOvertimeAgentOpen}
        onClose={() => setIsOvertimeAgentOpen(false)}
        filters={{
          date: startDate,
          startDate,
          endDate,
          plantId,
          shiftId,
          departmentId,
          sectionId,
          operatorTeam,
        }}
      />

      {/* Attrition & Retention Agent Slide-over Drawer */}
      <AttritionAgentDrawer
        isOpen={isAttritionAgentOpen}
        onClose={() => setIsAttritionAgentOpen(false)}
        filters={{
          date: startDate,
          startDate,
          endDate,
          plantId,
          departmentId,
          sectionId,
          operatorTeam,
        }}
      />

      {/* Skill & Training Agent Slide-over Drawer */}
      <SkillTrainingAgentDrawer
        isOpen={isSkillAgentOpen}
        onClose={() => setIsSkillAgentOpen(false)}
        filters={{
          date: startDate,
          startDate,
          endDate,
          plantId,
          shiftId,
          departmentId,
          sectionId,
          operatorTeam,
        }}
      />

      {/* Production Workforce Intelligence Agent Slide-over Drawer */}
      <ProductionAgentDrawer
        isOpen={isProductionAgentOpen}
        onClose={() => setIsProductionAgentOpen(false)}
        filters={{
          date: startDate,
          startDate,
          endDate,
          plantId,
          shiftId,
          departmentId,
          sectionId,
          operatorTeam,
        }}
      />

      {/* Vendor Workforce Intelligence Agent Slide-over Drawer */}
      <VendorAgentDrawer
        isOpen={isVendorAgentOpen}
        onClose={() => setIsVendorAgentOpen(false)}
        filters={{
          plantId,
          departmentId,
          sectionId,
          startDate,
          endDate,
        }}
      />
    </section>
  );
}
