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
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { RoleDistributionCard } from '../components/analytics/RoleDistributionCard';
import { ShiftEfficiencySection } from '../components/analytics/ShiftEfficiencySection';
import { ShiftWiseAttendanceCard } from '../components/analytics/ShiftWiseAttendanceCard';
import { SkillMatrixSection } from '../components/analytics/SkillMatrixSection';
import { TeamProductionSection } from '../components/analytics/TeamProductionSection';
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
  const [attendanceTrendLoading, setAttendanceTrendLoading] = useState(false);
  const attendancePeriodRef = useRef(attendancePeriod);
  attendancePeriodRef.current = attendancePeriod;
  const [calendarDate, setCalendarDate] = useState('');
  const [production, setProduction] = useState(null);
  const [genderData, setGenderData] = useState(null);
  const [deptData, setDeptData] = useState(null);
  const [expData, setExpData] = useState(null);
  const [njData, setNjData] = useState(null);
  const [newJoinerPeriod, setNewJoinerPeriod] = useState('daily');
  const [newJoinerLoading, setNewJoinerLoading] = useState(false);
  const newJoinerPeriodRef = useRef(newJoinerPeriod);
  newJoinerPeriodRef.current = newJoinerPeriod;
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
    setOperatorTeam('');
  }, []);

  const handleDepartmentChange = useCallback((newDeptId) => {
    setDepartmentId(newDeptId);
    setSectionId('');
    setOperatorTeam('');
  }, []);

  const handleSectionChange = useCallback((newSecId) => {
    setSectionId(newSecId);
    setOperatorTeam('');
  }, []);

  const activeFilters = useMemo(
    () => ({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      plantId: plantId || undefined,
      shiftId: shiftId || undefined,
      departmentId: departmentId || undefined,
      sectionId: sectionId || undefined,
      teamId: operatorTeam || undefined,
      operatorTeam: operatorTeam || undefined,
    }),
    [startDate, endDate, plantId, shiftId, departmentId, sectionId, operatorTeam]
  );

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
        setOperatorTeam('');
      }
    }
  }, [departments, departmentId]);

  useEffect(() => {
    if (sectionId && sections.length > 0) {
      const isValid = sections.some((s) => (s.section_id || s.id) === sectionId);
      if (!isValid) {
        setSectionId('');
        setOperatorTeam('');
      }
    }
  }, [sections, sectionId]);

  // Fetch Base Workforce, Demographics & Attendance Data
  useEffect(() => {
    let active = true;

    async function loadBase() {
      setBaseLoading(true);
      setBaseError(null);

      try {
        const [sRes, aRes, pRes, gRes, dRes, eRes, njRes, scRes, vRes, empRes] = await Promise.allSettled([
          fetchWorkforceSummary(activeFilters),
          fetchAttendanceAnalytics({
            period: attendancePeriodRef.current,
            ...activeFilters,
          }),
          fetchProductionAnalytics(activeFilters),
          fetchGenderAnalytics(activeFilters),
          fetchDepartmentAnalytics(activeFilters),
          fetchExperienceAnalytics(activeFilters),
          fetchNewJoinerAnalytics({ period: newJoinerPeriodRef.current, ...activeFilters }),
          fetchSectionAnalytics(activeFilters),
          fetchVendorAnalytics(activeFilters),
          fetchEmployees({
            limit: 500,
            ...activeFilters,
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
  }, [activeFilters, reloadToken]);

  // Isolated Attendance Period Effect: only re-fetches attendance trends for this card without reloading the entire page
  const isInitialPeriodMount = useRef(true);
  useEffect(() => {
    if (isInitialPeriodMount.current) {
      isInitialPeriodMount.current = false;
      return;
    }

    let active = true;
    async function updateAttendanceTrend() {
      setAttendanceTrendLoading(true);
      try {
        const res = await fetchAttendanceAnalytics({
          period: attendancePeriod,
          ...activeFilters,
        });
        if (active && res) {
          setAttendance(res);
        }
      } catch (err) {
        // preserve previous trend data on non-blocking error
      } finally {
        if (active) setAttendanceTrendLoading(false);
      }
    }

    updateAttendanceTrend();
    return () => {
      active = false;
    };
  }, [attendancePeriod]);

  // Isolated New Joiner Period Effect: only re-fetches joiner trends when D/W/M toggle is clicked
  const isInitialNJMount = useRef(true);
  useEffect(() => {
    if (isInitialNJMount.current) {
      isInitialNJMount.current = false;
      return;
    }

    let active = true;
    async function updateNJTrend() {
      setNewJoinerLoading(true);
      try {
        const res = await fetchNewJoinerAnalytics({
          period: newJoinerPeriod,
          ...activeFilters,
        });
        if (active && res) {
          setNjData(res);
        }
      } catch {
        // preserve existing data on non-blocking error
      } finally {
        if (active) setNewJoinerLoading(false);
      }
    }

    updateNJTrend();
    return () => {
      active = false;
    };
  }, [newJoinerPeriod]);

  // Fetch Overtime Analytics
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadOvertime() {
      setOvertimeLoading(true);
      setOvertimeError(null);
      try {
        const data = await fetchOvertimeAnalytics({
          ...activeFilters,
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
  }, [activeFilters, reloadToken]);

  // Fetch Team Production Performance
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadTeamProd() {
      setTeamProdLoading(true);
      setTeamProdError(null);
      try {
        const data = await fetchTeamProductionAnalytics({
          ...activeFilters,
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
  }, [activeFilters, reloadToken]);

  // Fetch Shift Efficiency Analytics
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadShiftEff() {
      setShiftEffLoading(true);
      setShiftEffError(null);
      try {
        const data = await fetchShiftEfficiencyAnalytics({
          ...activeFilters,
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
  }, [activeFilters, reloadToken]);

  // Fetch Skills Matrix Analytics
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadSkills() {
      setSkillsLoading(true);
      setSkillsError(null);
      try {
        const data = await fetchSkillsAnalytics({
          ...activeFilters,
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
  }, [activeFilters, reloadToken]);

  // Fetch Training Compliance Analytics
  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadCompliance() {
      setComplianceLoading(true);
      setComplianceError(null);
      try {
        const data = await fetchComplianceAnalytics({
          ...activeFilters,
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
  }, [activeFilters, reloadToken]);

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
        onSectionChange={handleSectionChange}
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
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-600" />
              Workforce Demographics & Role Distribution
            </h2>

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

          {/* Row 1: Gender Analytics | Employment Type Distribution | Employee Status Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-stretch">
            <GenderAnalytics genderAnalytics={genderData} loading={baseLoading} error={baseError} />
            <EmploymentTypeCard workforceSummary={summary} loading={baseLoading} error={baseError} />
            <EmployeeStatusCard workforceSummary={summary} employees={employees} loading={baseLoading} error={baseError} />
          </div>

          {/* Row 2: Department-wise Analytics | Section-wise Analytics | Plant-wise Workforce Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-stretch">
            <DepartmentAnalytics departmentAnalytics={deptData} loading={baseLoading} error={baseError} />
            <SectionAnalytics sectionAnalytics={secData} loading={baseLoading} error={baseError} />
            <PlantWorkforceCard workforceSummary={summary} attendance={attendance} selectedPlantId={plantId} loading={baseLoading} error={baseError} />
          </div>

          {/* Row A (2 columns, 50/50): Vendor-wise Workforce Distribution | Distribution by Role */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 items-stretch">
            <VendorWorkforceCard
              vendorData={vendorData}
              loading={baseLoading}
              error={baseError}
            />
            <RoleDistributionCard
              summary={summary}
              loading={baseLoading}
              error={baseError}
            />
          </div>

          {/* Row B (3 columns): Employee Experience Analytics | New Joiner Analytics | Employee Movement Trend */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 items-stretch">
            <ExperienceAnalytics experienceAnalytics={expData} loading={baseLoading} error={baseError} />
            <NewJoinerAnalytics
              newJoinerAnalytics={njData}
              granularity={newJoinerPeriod}
              onGranularityChange={setNewJoinerPeriod}
              loading={baseLoading || newJoinerLoading}
              error={baseError}
            />
            <EmployeeMovementCard employees={employees} loading={baseLoading} error={baseError} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ATTENDANCE ANALYTICS TAB                                               */}
      {/* ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Subheader */}
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-purple-600" />
              Attendance Overview
            </h2>

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
              loading={baseLoading || attendanceTrendLoading}
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
              data={attendance?.by_vendor}
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
          shiftId={shiftId}
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
