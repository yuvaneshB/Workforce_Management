import {
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { AttendanceTrendChart } from '../components/dashboard/AttendanceTrendChart';
import { AttritionReasonsChart } from '../components/dashboard/AttritionReasonsChart';
import { AttritionTrendChart } from '../components/dashboard/AttritionTrendChart';
import { DashboardFilters } from '../components/dashboard/DashboardFilters';
import { DepartmentWorkforceChart } from '../components/dashboard/DepartmentWorkforceChart';
import { EmploymentTypeDistribution } from '../components/dashboard/EmploymentTypeDistribution';
import { OvertimeAnalytics } from '../components/dashboard/OvertimeAnalytics';
import { ProductionPerformance } from '../components/dashboard/ProductionPerformance';
import { ShiftPerformanceTable } from '../components/dashboard/ShiftPerformanceTable';
import { SkillsCoverage } from '../components/dashboard/SkillsCoverage';
import { TrainingCompliance } from '../components/dashboard/TrainingCompliance';
import { VendorWorkforceChart } from '../components/dashboard/VendorWorkforceChart';
import { WorkforceKPICards } from '../components/dashboard/WorkforceKPICards';
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
    filterOptions,
    loading,
    attendanceLoading,
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
    employmentType,
    vendorId,
    granularity,
  });

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

      {/* 3. Executive KPI Cards */}
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

      {/* 4. Workforce Analytics Section */}
      <div className="space-y-4">
        {/* Row 4.1: Chart A (Attendance Trend) + Chart B (Permanent vs Vendor Distribution) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-stretch">
          <div className="lg:col-span-2">
            <AttendanceTrendChart
              attendanceAnalytics={attendanceAnalytics}
              granularity={granularity}
              onGranularityChange={setGranularity}
              loading={loading || attendanceLoading}
              error={errors?.attendanceAnalytics}
              onRetry={refetch}
              minimal={true}
            />
          </div>
          <div>
            <EmploymentTypeDistribution
              workforceSummary={workforceSummary}
              employmentType={employmentType}
              vendorId={vendorId}
              loading={loading}
              variant="pie"
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

      {/* 5. Manufacturing Workforce Operations */}
      <div className="space-y-4">
        {/* Row 5.1: Shift Performance Comparison Table - Full Width */}
        <ShiftPerformanceTable
          attendanceAnalytics={attendanceAnalytics}
          shiftEfficiencyAnalytics={shiftEfficiencyAnalytics}
          overtimeAnalytics={overtimeAnalytics}
          planningShortages={planningShortages}
          planningAvailability={planningAvailability}
          workforceSummary={workforceSummary}
          loading={loading}
          minimal={true}
        />

        {/* Row 5.3: Overtime Analytics + Production Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
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
        </div>
      </div>

      {/* 6. Workforce Capability & Compliance */}
      <div className="space-y-4">
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
