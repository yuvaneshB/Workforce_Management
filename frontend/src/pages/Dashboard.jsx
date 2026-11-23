import {
  AlertCircle,
  Factory,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { AttendanceTrendChart } from '../components/dashboard/AttendanceTrendChart';
import { AttritionReasonsChart } from '../components/dashboard/AttritionReasonsChart';
import { AttritionTrendChart } from '../components/dashboard/AttritionTrendChart';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import { DashboardHeader } from '../components/dashboard/DashboardHeader';
import { DepartmentWorkforceChart } from '../components/dashboard/DepartmentWorkforceChart';
import { EmploymentTypeDistribution } from '../components/dashboard/EmploymentTypeDistribution';
import { OvertimeAnalytics } from '../components/dashboard/OvertimeAnalytics';
import { ProductionPerformance } from '../components/dashboard/ProductionPerformance';
import { ShiftPerformanceTable } from '../components/dashboard/ShiftPerformanceTable';
import { SkillsCoverage } from '../components/dashboard/SkillsCoverage';
import { TrainingCompliance } from '../components/dashboard/TrainingCompliance';
import { VendorWorkforceChart } from '../components/dashboard/VendorWorkforceChart';
import { WorkforceAvailability } from '../components/dashboard/WorkforceAvailability';
import { WorkforceKPICards } from '../components/dashboard/WorkforceKPICards';
import { WorkforceProductivity } from '../components/dashboard/WorkforceProductivity';
import { WorkforceShortage } from '../components/dashboard/WorkforceShortage';
import { useDashboardData } from '../hooks/useDashboardData';

export function Dashboard() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [plantId, setPlantId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [department, setDepartment] = useState('');
  const [section, setSection] = useState('');
  const [employmentType, setEmploymentType] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [granularity, setGranularity] = useState('daily');

  const {
    workforceSummary,
    attendanceAnalytics,
    departmentAnalytics,
    overtimeAnalytics,
    shiftEfficiencyAnalytics,
    teamProductionAnalytics,
    complianceAnalytics,
    skillsAnalytics,
    attritionAnalytics,
    planningAvailability,
    planningShortages,
    singlePersonDependency,
    filterOptions,
    loading,
    error,
    errors,
    refetch,
  } = useDashboardData({
    startDate,
    endDate,
    plantId,
    shiftId,
    departmentId: department,
    sectionId: section,
    granularity,
  });

  const coverageWindow = workforceSummary?.attendance_coverage_window;

  function handleDateRangeChange({ startDate: newStart, endDate: newEnd }) {
    setStartDate(newStart || '');
    setEndDate(newEnd || '');
  }

  function handlePlantChange(newPlantId) {
    setPlantId(newPlantId);
    setDepartment('');
    setSection('');
  }

  function handleDepartmentChange(newDeptId) {
    setDepartment(newDeptId);
    setSection('');
  }

  // Auto-reset department and section if currently selected value is invalid for filtered plant
  useEffect(() => {
    if (department && filterOptions.departments?.length > 0) {
      const isValid = filterOptions.departments.some(
        (d) => (d.department_id || d.id) === department
      );
      if (!isValid) {
        setDepartment('');
        setSection('');
      }
    }
  }, [filterOptions.departments, department]);

  // Auto-reset section if currently selected value is invalid for filtered department/plant
  useEffect(() => {
    if (section && filterOptions.sections?.length > 0) {
      const isValid = filterOptions.sections.some(
        (s) => (s.section_id || s.id) === section
      );
      if (!isValid) {
        setSection('');
      }
    }
  }, [filterOptions.sections, section]);

  function handleResetFilters() {
    setStartDate('');
    setEndDate('');
    setPlantId('');
    setShiftId('');
    setDepartment('');
    setSection('');
    setEmploymentType('');
    setVendorId('');
  }

  const activeFiltersCount = [
    startDate || endDate,
    plantId,
    shiftId,
    department,
    section,
    employmentType,
    vendorId,
  ].filter(Boolean).length;

  return (
    <section
      aria-label="Workforce Operations Dashboard"
      className="space-y-4 pb-8 max-w-[1680px] mx-auto"
    >
      {/* Backend connection error banner if any */}
      {error && (
        <div
          role="alert"
          className="surface rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-rose-200 dark:border-rose-900"
          style={{ background: 'var(--rose-soft)' }}
        >
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <div>
              <div className="text-xs font-bold text-rose-900 dark:text-rose-200">
                Data connection message
              </div>
              <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={refetch}
            className="self-start sm:self-auto text-xs px-3 py-1 rounded-xl bg-white text-rose-700 font-bold border border-rose-300 shadow-2xs hover:bg-rose-50 cursor-pointer flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Global Professional Filter Bar with Live Operations Controls */}
      <DashboardFilters
        startDate={startDate}
        endDate={endDate}
        plantId={plantId}
        shiftId={shiftId}
        department={department}
        section={section}
        employmentType={employmentType}
        vendorId={vendorId}
        filterOptions={filterOptions}
        coverageWindow={coverageWindow}
        onRefresh={refetch}
        loading={loading}
        onDateRangeChange={handleDateRangeChange}
        onPlantChange={handlePlantChange}
        onShiftChange={setShiftId}
        onDepartmentChange={handleDepartmentChange}
        onSectionChange={setSection}
        onEmploymentTypeChange={setEmploymentType}
        onVendorChange={setVendorId}
        onReset={handleResetFilters}
      />

      {/* 3. Executive KPI Cards (8 KPI Cards) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-[var(--secondary)] flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[var(--brand-purple)]" />
            Executive Workforce Key Performance Indicators (8 Metrics)
          </span>
          <span className="text-[10px] text-[var(--secondary)]">
            Verified Neon DB records
          </span>
        </div>
        <WorkforceKPICards
          workforceSummary={workforceSummary}
          attendanceAnalytics={attendanceAnalytics}
          overtimeAnalytics={overtimeAnalytics}
          shiftEfficiencyAnalytics={shiftEfficiencyAnalytics}
          planningShortages={planningShortages}
          planningAvailability={planningAvailability}
          attritionAnalytics={attritionAnalytics}
          employmentType={employmentType}
          vendorId={vendorId}
          loading={loading}
        />
      </div>

      {/* 4. Section 6: Workforce Analytics Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 px-1 border-b border-[var(--border)]/60 pb-1.5">
          <TrendingUp className="w-4 h-4 text-[var(--brand-purple)]" />
          <h2 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
            Workforce Demographics & Analytics (Charts A – F)
          </h2>
        </div>

        {/* Row 4.1: Chart A (Attendance Trend) + Chart B (Permanent vs Vendor Distribution) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
          <div className="lg:col-span-2">
            <AttendanceTrendChart
              attendanceAnalytics={attendanceAnalytics}
              granularity={granularity}
              onGranularityChange={setGranularity}
              loading={loading}
              error={errors?.attendanceAnalytics}
              onRetry={refetch}
            />
          </div>
          <div>
            <EmploymentTypeDistribution
              workforceSummary={workforceSummary}
              employmentType={employmentType}
              vendorId={vendorId}
              loading={loading}
            />
          </div>
        </div>

        {/* Row 4.2: Chart C (Vendor-wise Distribution) + Chart D (Department-wise Distribution) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
          <VendorWorkforceChart
            selectedVendorId={vendorId}
            workforceSummary={workforceSummary}
            loading={loading}
            hasData={!error && !!workforceSummary}
          />
          <DepartmentWorkforceChart
            departmentAnalytics={departmentAnalytics}
            workforceSummary={workforceSummary}
            selectedDepartment={department}
            loading={loading}
          />
        </div>

        {/* Row 4.3: Chart E (Employee Attrition Trend) + Chart F (Attrition Reasons Analysis) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
          <AttritionTrendChart
            selectedPeriod="monthly"
            attritionAnalytics={attritionAnalytics}
            loading={loading}
            hasData={!error && (!!attritionAnalytics || !!workforceSummary)}
          />
          <AttritionReasonsChart
            attritionAnalytics={attritionAnalytics}
            loading={loading}
            hasData={!error && (!!attritionAnalytics || !!workforceSummary)}
          />
        </div>
      </div>

      {/* 5. Section 7: Manufacturing Workforce Operations */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 px-1 border-b border-[var(--border)]/60 pb-1.5">
          <Factory className="w-4 h-4 text-[var(--brand-purple)]" />
          <h2 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
            Manufacturing Operations & Shift Dispatch (Sections G – L)
          </h2>
        </div>

        {/* Row 5.1: G (Workforce Availability) + H (Workforce Shortage Detection) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
          <WorkforceAvailability
            planningAvailability={planningAvailability}
            workforceSummary={workforceSummary}
            attendanceAnalytics={attendanceAnalytics}
            loading={loading}
          />
          <WorkforceShortage
            planningShortages={planningShortages}
            planningAvailability={planningAvailability}
            attendanceAnalytics={attendanceAnalytics}
            loading={loading}
          />
        </div>

        {/* Row 5.2: I (Shift Performance Comparison Table - Full Width) */}
        <ShiftPerformanceTable
          attendanceAnalytics={attendanceAnalytics}
          shiftEfficiencyAnalytics={shiftEfficiencyAnalytics}
          overtimeAnalytics={overtimeAnalytics}
          planningShortages={planningShortages}
          planningAvailability={planningAvailability}
          workforceSummary={workforceSummary}
          loading={loading}
        />

        {/* Row 5.3: J (Overtime Analytics) + K (Production Performance) + L (Workforce Productivity) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
          <OvertimeAnalytics
            overtimeAnalytics={overtimeAnalytics}
            workforceSummary={workforceSummary}
            loading={loading}
          />
          <ProductionPerformance
            shiftEfficiencyAnalytics={shiftEfficiencyAnalytics}
            teamProductionAnalytics={teamProductionAnalytics}
            loading={loading}
          />
          <WorkforceProductivity
            shiftEfficiencyAnalytics={shiftEfficiencyAnalytics}
            teamProductionAnalytics={teamProductionAnalytics}
            loading={loading}
          />
        </div>
      </div>

      {/* 6. Section 8: Workforce Capability & Compliance */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 px-1 border-b border-[var(--border)]/60 pb-1.5">
          <ShieldCheck className="w-4 h-4 text-[var(--brand-purple)]" />
          <h2 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
            Workforce Capability & Technical Compliance (Sections M & N)
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-stretch">
          <SkillsCoverage
            skillsAnalytics={skillsAnalytics}
            complianceAnalytics={complianceAnalytics}
            workforceSummary={workforceSummary}
            loading={loading}
          />
          <TrainingCompliance
            complianceAnalytics={complianceAnalytics}
            workforceSummary={workforceSummary}
            loading={loading}
          />
        </div>
      </div>
    </section>
  );
}
