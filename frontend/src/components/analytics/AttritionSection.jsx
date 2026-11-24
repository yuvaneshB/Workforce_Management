import { Bot, UserMinus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fetchAttritionAnalytics } from '../../api/workforceApi';
import { Card } from '../common/Card';

import { AttritionByReasonCard } from './AttritionByReasonCard';
import { AttritionKPICards } from './AttritionKPICards';
import { AttritionTrendCard } from './AttritionTrendCard';
import { DepartmentAttritionCard } from './DepartmentAttritionCard';
import { EmployeeExitDetailsTable } from './EmployeeExitDetailsTable';
import { TenureWiseAttritionCard } from './TenureWiseAttritionCard';
import { VendorAttritionCard } from './VendorAttritionCard';

export function AttritionSection({
  startDate = '',
  endDate = '',
  plantId = '',
  shiftId = '',
  departmentId = '',
  sectionId = '',
  teamId = '',
  loading = false,
  error = null,
  onRunAgent,
}) {
  const [employmentType, setEmploymentType] = useState('ALL');
  const [selectedVendor, setSelectedVendor] = useState('ALL');

  const [attritionData, setAttritionData] = useState(null);
  const [internalLoading, setInternalLoading] = useState(true);
  const [internalError, setInternalError] = useState(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function loadAttrition() {
      setInternalLoading(true);
      setInternalError(null);
      try {
        const data = await fetchAttritionAnalytics({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          plantId: plantId || undefined,
          shiftId: shiftId || undefined,
          departmentId: departmentId || undefined,
          sectionId: sectionId || undefined,
          teamId: teamId || undefined,
          employmentType: employmentType !== 'ALL' ? employmentType : undefined,
          vendorId: selectedVendor !== 'ALL' ? selectedVendor : undefined,
          signal: controller.signal,
        });
        if (active) {
          setAttritionData(data);
        }
      } catch (err) {
        if (active) {
          setInternalError(err?.message || 'Failed to fetch attrition analytics');
        }
      } finally {
        if (active) {
          setInternalLoading(false);
        }
      }
    }

    loadAttrition();
    return () => {
      active = false;
      controller.abort();
    };
  }, [startDate, endDate, plantId, shiftId, departmentId, sectionId, teamId, employmentType, selectedVendor]);

  const summary = attritionData?.summary || {
    total_attrition: 0,
    attrition_rate: 0,
    ytd_attrition: 0,
    critical_role_attrition: 0,
    early_attrition_rate: 0,
    regrettable_attrition: 0,
  };
  const monthlyTrend = attritionData?.monthly_trend || [];
  const byReason = attritionData?.by_reason || [];
  const byDepartment = attritionData?.by_department || [];
  const byVendor = attritionData?.by_vendor || [];
  const byTenure = attritionData?.by_tenure || [];
  const exitedRecords = attritionData?.exited_records || [];

  const isLoading = loading || internalLoading;

  return (
    <div className="space-y-4 mb-6">
      {/* Header and In-tab Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800 shrink-0">
            <UserMinus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text)] tracking-tight">
              Workforce Attrition &amp; Employee Retention Analytics
            </h2>
          </div>
        </div>

        {/* Local In-tab Filters & Agent Action */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Employment Type */}
          <select
            value={employmentType}
            onChange={(e) => setEmploymentType(e.target.value)}
            className="h-8 px-2.5 text-[11px] font-semibold rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-2xs"
          >
            <option value="ALL">Employment: All Types</option>
            <option value="Permanent">Permanent</option>
            <option value="Vendor">Vendor</option>
          </select>

          {/* Vendor */}
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="h-8 px-2.5 text-[11px] font-semibold rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer shadow-2xs"
          >
            <option value="ALL">All Vendors</option>
            <option value="Permanent">Permanent Only</option>
            <option value="V01">V01 (Sri Vignesh)</option>
            <option value="V02">V02 (Kovai Talent)</option>
            <option value="V03">V03 (Namma Workforce)</option>
            <option value="V04">V04 (Anand Industrial)</option>
            <option value="V05">V05 (Karnataka Skill)</option>
            <option value="V06">V06 (Prime HR)</option>
          </select>

          <button
            type="button"
            onClick={onRunAgent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs transition-all duration-150 hover:brightness-110 active:scale-95 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #6F3DBA 0%, #4D8EEB 100%)',
            }}
            title="Run Attrition & Retention Intelligence Agent"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Run Agent</span>
          </button>
        </div>
      </div>

      {/* Row 1: 5 Executive KPI Cards */}
      <AttritionKPICards summary={summary} loading={isLoading} />

      {/* Row 2: Attrition Trend & Attrition by Reason */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        <AttritionTrendCard data={monthlyTrend} loading={isLoading} />
        <AttritionByReasonCard data={byReason} loading={isLoading} />
      </div>

      {/* Row 3: Department-wise Attrition & Vendor-wise Attrition */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        <DepartmentAttritionCard data={byDepartment} loading={isLoading} />
        <VendorAttritionCard data={byVendor} loading={isLoading} />
      </div>

      {/* Row 4: Tenure-wise Attrition */}
      <TenureWiseAttritionCard data={byTenure} loading={isLoading} />

      {/* Row 5: Employee Exit Details Table */}
      <EmployeeExitDetailsTable
        records={exitedRecords}
        employmentTypeFilter={employmentType}
        vendorFilter={selectedVendor}
        loading={isLoading}
      />
    </div>
  );
}
