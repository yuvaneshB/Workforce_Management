import { AlertCircle, Bot, Factory, RefreshCw } from 'lucide-react';
import { CHART_COLORS } from '../../utils/constants';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { DowntimeAnalysisCard } from './DowntimeAnalysisCard';
import { PlantProductionCard } from './PlantProductionCard';
import { ProductionKPICards } from './ProductionKPICards';
import { ProductionTrendChart } from './ProductionTrendChart';
import { QualityAnalysisCard } from './QualityAnalysisCard';
import { ShiftProductionCard } from './ShiftProductionCard';
import { TeamPerformanceRankingCard } from './TeamPerformanceRankingCard';
import { TeamProductionTable } from './TeamProductionTable';

export function TeamProductionSection({
  data = null,
  production = null,
  loading = false,
  error = null,
  onRetry = null,
  palette = CHART_COLORS.light,
  onRunAgent = null,
}) {
  if (error) {
    return (
      <Card className="p-5 mb-6" style={{ background: 'var(--rose-soft)' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-rose-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Failed to load Production Analytics: {error}</span>
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

  return (
    <div className="space-y-4 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Factory className="w-4 h-4 text-purple-600" />
          Production Analytics &amp; Team Performance
        </h2>
        {onRunAgent && (
          <button
            type="button"
            onClick={onRunAgent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs transition-all duration-150 hover:brightness-110 active:scale-95 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #493287 0%, #5B44A3 100%)',
            }}
            title="Run Production Workforce Intelligence Agent"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Run Agent</span>
          </button>
        )}
      </div>

      {/* Row 1 & Row 2: Eight KPI Cards */}
      <ProductionKPICards data={data} loading={loading} error={error} />

      {/* Row 3: Production Trend (6 cols) | Shift-wise Production (3 cols) | Quality Analysis (3 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        <ProductionTrendChart loading={loading} error={error} />
        <ShiftProductionCard production={production} loading={loading} error={error} />
        <QualityAnalysisCard data={data} loading={loading} error={error} />
      </div>

      {/* Row 4: Downtime Analysis (4 cols) | Team Ranking (4 cols) | Plant Comparison (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
        <DowntimeAnalysisCard data={data} loading={loading} error={error} />
        <TeamPerformanceRankingCard data={data} loading={loading} error={error} />
        <PlantProductionCard production={production} loading={loading} error={error} />
      </div>

      {/* Row 5: Team Production & Attendance Performance Table */}
      <TeamProductionTable data={data} loading={loading} error={error} />
    </div>
  );
}
