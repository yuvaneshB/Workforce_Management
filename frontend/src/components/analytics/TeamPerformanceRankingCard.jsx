import { Award } from 'lucide-react';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const SECTION_NAME_MAP = {
  S001: 'Solder Paste Printing',
  S002: 'Pick & Place',
  S003: 'Reflow Soldering',
  S004: 'SPI/AOI Inspection',
  S005: 'Mainboard Assembly',
  S006: 'Battery & Frame Fitting',
  S007: 'Display Assembly',
  S008: 'Back Cover Fitting',
  S009: 'Final Assembly Line Support',
  S010: 'Camera Module',
  S011: 'Display Module',
  S012: 'Battery Pack Module',
  S013: 'RF Testing',
  S014: 'Functional Testing',
  S015: 'Camera Calibration',
  S016: 'Burn-in & Ageing',
  S017: 'Incoming Quality (IQC)',
  S018: 'In-Process Quality (IPQC)',
  S019: 'Final Quality (OQC)',
  S020: 'Quality Lab',
  S021: 'Mechanical Maintenance',
  S022: 'Electrical Maintenance',
  S023: 'Preventive Maintenance',
  S024: 'Line Feeding',
  S025: 'Material Movement',
  S026: 'Forklift & Tugger',
  S027: 'Packing',
  S028: 'Labeling',
  S029: 'Dispatch',
  S030: 'Process Engineering',
  S031: 'Industrial Engineering',
  S032: 'Automation',
  S033: 'Environment Health & Safety',
  S034: 'Security',
  S035: 'Fire & Emergency',
  S036: 'Human Resources',
  S037: 'Administration',
  S038: 'Canteen & Housekeeping',
  S039: 'Raw Material Stores',
  S040: 'Finished Goods Store',
  S041: 'Procurement Coordination',
};

function resolveSectionName(item) {
  if (item?.section_name && !/^S\d{3}$/i.test(item.section_name.trim())) {
    return item.section_name;
  }
  const code = item?.section_id || item?.operator_team || item?.team;
  if (code && SECTION_NAME_MAP[code]) {
    return SECTION_NAME_MAP[code];
  }
  return code || 'Section';
}

const DEFAULT_TOP_SECTIONS = [
  { sectionId: 'S014', sectionName: 'Functional Testing', achievement: 99.8, actual: 131900, good: 129394, rejectPct: '1.90%' },
  { sectionId: 'S011', sectionName: 'Display Module', achievement: 99.3, actual: 142899, good: 140267, rejectPct: '1.84%' },
  { sectionId: 'S003', sectionName: 'Reflow Soldering', achievement: 99.1, actual: 140010, good: 137371, rejectPct: '1.88%' },
  { sectionId: 'S027', sectionName: 'Packing', achievement: 98.8, actual: 134184, good: 131620, rejectPct: '1.91%' },
  { sectionId: 'S015', sectionName: 'Camera Calibration', achievement: 98.5, actual: 133500, good: 130980, rejectPct: '1.89%' },
];

export function TeamPerformanceRankingCard({
  data = null,
  loading = false,
  error = null,
}) {
  const rawItems = !error ? (data?.items ?? []) : [];
  let topSections = [...DEFAULT_TOP_SECTIONS];

  if (rawItems.length > 0) {
    const sorted = [...rawItems]
      .filter((t) => t.production_achievement_pct > 0)
      .sort((a, b) => b.production_achievement_pct - a.production_achievement_pct)
      .slice(0, 5)
      .map((t) => ({
        sectionId: t.section_id || t.operator_team,
        sectionName: resolveSectionName(t),
        achievement: t.production_achievement_pct,
        actual: t.actual_qty,
        good: t.good_qty,
        rejectPct: t.actual_qty > 0 ? `${((t.reject_qty / t.actual_qty) * 100).toFixed(2)}%` : '0.00%',
      }));
    if (sorted.length > 0) {
      topSections = sorted;
    }
  }

  const maxAchievement = Math.max(...topSections.map((s) => s.achievement), 100);

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col justify-between min-h-[260px]">
      <div>
        <div className="flex items-center gap-2 mb-2 min-w-0">
          <Award className="w-4 h-4 shrink-0 text-[#493287]" aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">
            Section Performance Ranking (Top 5)
          </h2>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : (
          <div className="space-y-2.5 my-2">
            {topSections.map((s, idx) => {
              const widthPct = Math.min(100, Math.max(10, (s.achievement / maxAchievement) * 100));
              return (
                <div key={s.sectionId || s.sectionName} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 font-bold text-[var(--text)] min-w-0">
                      <span className="text-[9px] w-3.5 h-3.5 shrink-0 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center font-black">
                        {idx + 1}
                      </span>
                      <span className="truncate" title={s.sectionName}>
                        {s.sectionName}
                      </span>
                    </div>
                    <span className="font-black text-[var(--text)] text-[11px] shrink-0 ml-2">
                      {s.achievement}%
                    </span>
                  </div>

                  <div className="w-full h-3 rounded-full bg-[var(--muted-fill)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#493287] transition-all duration-500"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

