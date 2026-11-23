import { Briefcase, Layers, UserCheck, Users2 } from 'lucide-react';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function WorkforceDemographicsSummary({
  genderAnalytics = null,
  experienceAnalytics = null,
  newJoinerAnalytics = null,
  sectionAnalytics = null,
  loading = false,
}) {
  const genderBuckets = genderAnalytics?.buckets ?? [];
  const maleBucket = genderBuckets.find((b) => b.key === 'MALE' || b.key === 'Male');
  const femaleBucket = genderBuckets.find((b) => b.key === 'FEMALE' || b.key === 'Female');

  const expItems = experienceAnalytics?.items ?? [];
  const totalSections = sectionAnalytics?.total_sections ?? (sectionAnalytics?.items?.length ?? 0);
  const newJoinerCount = newJoinerAnalytics?.total_new_joiners ?? 0;
  const avgTenure = newJoinerAnalytics?.avg_tenure_months ?? 0;

  return (
    <Card className="p-4 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users2 className="w-4 h-4 text-purple-600" />
            <h3 className="text-[13px] font-bold text-[var(--foreground)]">Workforce Demographics & Staffing Summary</h3>
          </div>
          <span className="text-[10px] muted font-semibold">Executive Snapshot</span>
        </div>

        {loading ? (
          <div className="space-y-2 py-2">
            <LoadingSkeleton className="h-10 w-full rounded-md" />
            <LoadingSkeleton className="h-10 w-full rounded-md" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {/* Gender Profile */}
            <div className="p-2.5 rounded-lg border bg-[var(--muted-fill)]" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] muted font-semibold flex items-center gap-1 mb-1">
                <Users2 className="w-3 h-3 text-blue-500" /> Gender Balance
              </div>
              <div className="text-xs font-bold">
                {maleBucket ? `${maleBucket.count} M` : '—'} · {femaleBucket ? `${femaleBucket.count} F` : '—'}
              </div>
              <div className="text-[9px] muted mt-0.5">
                {maleBucket?.percentage ? `${maleBucket.percentage}% / ${femaleBucket?.percentage}%` : '50% / 50%'}
              </div>
            </div>

            {/* Experience Tiers */}
            <div className="p-2.5 rounded-lg border bg-[var(--muted-fill)]" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] muted font-semibold flex items-center gap-1 mb-1">
                <Briefcase className="w-3 h-3 text-indigo-500" /> Experience Tiers
              </div>
              <div className="text-xs font-bold">{expItems.length > 0 ? `${expItems.length} Tenure Tiers` : '—'}</div>
              <div className="text-[9px] muted mt-0.5 truncate">
                {expItems[0] ? `Top: ${expItems[0].bucket_name} (${expItems[0].employee_count})` : 'Distribution logged'}
              </div>
            </div>

            {/* New Joiners */}
            <div className="p-2.5 rounded-lg border bg-[var(--muted-fill)]" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] muted font-semibold flex items-center gap-1 mb-1">
                <UserCheck className="w-3 h-3 text-emerald-500" /> New Joiners
              </div>
              <div className="text-xs font-bold">{newJoinerCount} Employees</div>
              <div className="text-[9px] muted mt-0.5">{avgTenure.toFixed(1)} mo avg tenure</div>
            </div>

            {/* Section Coverage */}
            <div className="p-2.5 rounded-lg border bg-[var(--muted-fill)]" style={{ borderColor: 'var(--border)' }}>
              <div className="text-[10px] muted font-semibold flex items-center gap-1 mb-1">
                <Layers className="w-3 h-3 text-amber-500" /> Plant Sections
              </div>
              <div className="text-xs font-bold">{totalSections} Active Sections</div>
              <div className="text-[9px] muted mt-0.5">Assembly, Fab & Pack</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-2 border-t text-[10px] muted flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
        <span>Explore full workforce distributions, tenure breakdown, and section matrices in Analytics.</span>
      </div>
    </Card>
  );
}

