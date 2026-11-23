import { AlertCircle, CalendarClock, Info, RefreshCw } from 'lucide-react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

import { HourlyProductionTrendCard } from './HourlyProductionTrendCard';
import { IndividualShiftSummaryCards } from './IndividualShiftSummaryCards';
import { ShiftAbsenteeismCard } from './ShiftAbsenteeismCard';
import { ShiftAttendanceThroughputCard } from './ShiftAttendanceThroughputCard';
import { ShiftDowntimeCard } from './ShiftDowntimeCard';
import { ShiftEfficiencyKPICards } from './ShiftEfficiencyKPICards';
import { ShiftPerformanceRankingCard } from './ShiftPerformanceRankingCard';
import { ShiftPerformanceTable } from './ShiftPerformanceTable';
import { ShiftProductionOutputCard } from './ShiftProductionOutputCard';
import { ShiftQualityPerformanceCard } from './ShiftQualityPerformanceCard';
import { WorkforceUtilizationCard } from './WorkforceUtilizationCard';

export function ShiftEfficiencySection({
  data = null,
  loading = false,
  error = null,
  onRetry,
}) {
  if (loading) {
    return (
      <div className="space-y-4 mb-6">
        {/* Row 1 Skeletons: 4 KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <LoadingSkeleton className="h-4 w-28 rounded mb-2" />
              <LoadingSkeleton className="h-7 w-20 rounded mb-1" />
              <LoadingSkeleton className="h-3 w-32 rounded" />
            </Card>
          ))}
        </div>

        {/* Row 2 Skeletons: 3 Shift Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-4">
              <LoadingSkeleton className="h-5 w-32 rounded mb-3" />
              <LoadingSkeleton className="h-32 w-full rounded-lg" />
            </Card>
          ))}
        </div>

        {/* Row 3 & 4 Skeletons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <LoadingSkeleton className="h-40 w-full rounded-lg" />
            </Card>
          ))}
        </div>

        {/* Row 5 Skeleton: Table */}
        <Card className="p-4">
          <LoadingSkeleton className="h-56 w-full rounded-lg" />
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
            <span>Failed to load Shift Efficiency Analytics: {error}</span>
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

  if (!data || data.total_shifts === 0) {
    return (
      <Card className="p-8 mb-6">
        <EmptyState
          icon={CalendarClock}
          title="No Shift Efficiency Data"
          description="No records found for the selected shift or date range."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800 shrink-0">
            <CalendarClock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[var(--text)] tracking-tight">
              Shift-wise Production & Workforce Efficiency
            </h2>
            <p className="text-[11px] text-[var(--secondary)]">
              Comprehensive shift performance, workforce utilization, quality and downtime analysis
            </p>
          </div>
        </div>
      </div>

      {/* Productivity Attribution Notice */}
      <div
        className="rounded-xl p-3 flex items-start gap-2.5 text-[11px] border"
        style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
      >
        <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <span className="text-[var(--secondary)] leading-relaxed">
          <strong className="text-[var(--text)] font-semibold">Productivity Notice:</strong> Production per present employee is a shift-level throughput indicator (actual production quantity divided by present attendance count), not individual operator output.
        </span>
      </div>

      {/* Row 1: Overall Shift KPI Cards (4 cards) */}
      <ShiftEfficiencyKPICards data={data} loading={loading} error={error} />

      {/* Row 2: 3 Individual Shift Summary Cards (GS1, S2, NS3) */}
      <IndividualShiftSummaryCards data={data} loading={loading} error={error} />

      {/* Row 3: 4 Analytical Charts (Production Output, Attendance & Throughput, Ranking, Hourly Trend) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
        <ShiftProductionOutputCard data={data} loading={loading} error={error} />
        <ShiftAttendanceThroughputCard data={data} loading={loading} error={error} />
        <ShiftPerformanceRankingCard data={data} loading={loading} error={error} />
        <HourlyProductionTrendCard data={data} loading={loading} error={error} />
      </div>

      {/* Row 4: 4 Analytical Charts (Workforce Utilization, Absenteeism, Quality Performance, Downtime) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3.5">
        <WorkforceUtilizationCard data={data} loading={loading} error={error} />
        <ShiftAbsenteeismCard data={data} loading={loading} error={error} />
        <ShiftQualityPerformanceCard data={data} loading={loading} error={error} />
        <ShiftDowntimeCard data={data} loading={loading} error={error} />
      </div>

      {/* Row 5: Shift Performance Detail (Comparison) Table */}
      <ShiftPerformanceTable data={data} loading={loading} error={error} />
    </div>
  );
}
