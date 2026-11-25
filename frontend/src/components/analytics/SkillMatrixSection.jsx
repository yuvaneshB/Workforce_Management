import { AlertCircle, Award, Bot, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

import { ActiveIndustryCertificationsCard } from './ActiveIndustryCertificationsCard';
import { DepartmentSkillGradeCompositionCard } from './DepartmentSkillGradeCompositionCard';
import { EmployeeSkillDetailsTable } from './EmployeeSkillDetailsTable';
import { SkillGapAnalysisCard } from './SkillGapAnalysisCard';
import { SkillGradeDistributionCard } from './SkillGradeDistributionCard';
import { SkillMatrixKPICards } from './SkillMatrixKPICards';
import { TrainingRequirementsCard } from './TrainingRequirementsCard';

export function SkillMatrixSection({
  data = null,
  loading = false,
  error = null,
  onRetry,
  onRunAgent,
}) {
  if (loading) {
    return (
      <div className="space-y-4 mb-6">
        {/* Row 1 Skeletons: 5 KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-3.5">
              <LoadingSkeleton className="h-4 w-24 rounded mb-2" />
              <LoadingSkeleton className="h-6 w-20 rounded" />
            </Card>
          ))}
        </div>

        {/* Row 2 Skeletons: 3 Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4 lg:col-span-4">
              <LoadingSkeleton className="h-52 w-full rounded-lg" />
            </Card>
          ))}
        </div>

        {/* Row 3 Skeletons: 2 Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
          <Card className="p-4 lg:col-span-7">
            <LoadingSkeleton className="h-52 w-full rounded-lg" />
          </Card>
          <Card className="p-4 lg:col-span-5">
            <LoadingSkeleton className="h-52 w-full rounded-lg" />
          </Card>
        </div>

        {/* Row 4 Skeleton: Table */}
        <Card className="p-4">
          <LoadingSkeleton className="h-64 w-full rounded-lg" />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-5 mb-6" style={{ background: 'var(--rose-soft)' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-rose-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Failed to load Skill Matrix Analytics: {error}</span>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="w-3 h-3 mr-1 inline" /> Retry
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (!data || data.total_employees === 0) {
    return (
      <Card className="p-8 mb-6">
        <EmptyState
          icon={Award}
          title="No Skill Matrix Data"
          description="No employee records found matching the selected filters."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Header and Agent Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800 shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text)] tracking-tight">
              Workforce Skill Matrix &amp; Certification Analytics
            </h2>
          </div>
        </div>

        {/* Skill & Training Agent Action */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onRunAgent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs transition-all duration-150 hover:brightness-110 active:scale-95 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #493287 0%, #5B44A3 100%)',
            }}
            title="Run Skill & Training Intelligence Agent"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Run Agent</span>
          </button>
        </div>
      </div>

      {/* Row 1: 5 Executive KPI Cards */}
      <SkillMatrixKPICards data={data} loading={loading} error={error} />

      {/* Row 2: 3 Analytics Cards (Skill Grade Distribution, Industry Certs, Dept Composition) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        <SkillGradeDistributionCard data={data} loading={loading} error={error} />
        <ActiveIndustryCertificationsCard data={data} loading={loading} error={error} />
        <DepartmentSkillGradeCompositionCard data={data} loading={loading} error={error} />
      </div>

      {/* Row 3: 2 Analytics Cards (Skill Gap Analysis, Training Requirements) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        <SkillGapAnalysisCard data={data} loading={loading} error={error} />
        <TrainingRequirementsCard data={data} loading={loading} error={error} />
      </div>

      {/* Row 4: Full-Width Employee Skill Details Table */}
      <EmployeeSkillDetailsTable data={data} loading={loading} error={error} />
    </div>
  );
}
