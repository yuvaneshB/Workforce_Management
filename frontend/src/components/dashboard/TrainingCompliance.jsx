import { ShieldCheck } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function TrainingCompliance({
  complianceAnalytics = null,
  workforceSummary = null,
  loading = false,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const hasData = Boolean(complianceAnalytics);
  const compliancePct = complianceAnalytics?.training_compliance_pct ?? 0;
  const skillMatchPct = complianceAnalytics?.skill_match_pct ?? 0;
  const currentCount = complianceAnalytics?.current_count ?? 0;
  const expiredCount = complianceAnalytics?.expired_count ?? 0;
  const matchedCount = complianceAnalytics?.matched_count ?? 0;
  const gapCount = complianceAnalytics?.gap_count ?? 0;

  const totalCerts = currentCount + expiredCount;
  const validPct = totalCerts > 0 ? ((currentCount / totalCerts) * 100).toFixed(1) : '0.0';
  const expiredPct = totalCerts > 0 ? ((expiredCount / totalCerts) * 100).toFixed(1) : '0.0';

  const certStatusData = [
    {
      name: 'Valid',
      label: 'Valid Certifications',
      value: currentCount,
      pct: validPct,
      color: '#10B981', // emerald
    },
    {
      name: 'Expired',
      label: 'Expired Certifications',
      value: expiredCount,
      pct: expiredPct,
      color: '#EF4444', // rose
    },
  ];

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col h-full">
      {/* Header: Icon + title on ONE line */}
      <div className="flex items-center gap-2 mb-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center shrink-0">
          <ShieldCheck className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight whitespace-nowrap">
          Training & Compliance Audit
        </h3>
      </div>

      {loading && !hasData ? (
        <div className="flex-1 w-full min-h-[340px] flex items-center justify-center">
          <LoadingSkeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : !hasData ? (
        <div className="flex-1 w-full min-h-[220px] flex flex-col items-center justify-center text-center p-3 text-[var(--secondary)]">
          <ShieldCheck className="w-6 h-6 mb-1 text-[var(--secondary)]/50" />
          <span className="text-xs font-semibold">No compliance data</span>
          <span className="text-[10px]">No compliance records match current selection</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          {/* Top 2 Primary Progress Rings / Bars */}
          <div className="grid grid-cols-2 gap-2.5 mb-2.5 shrink-0">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--border)]">
              <span className="text-[10px] font-bold text-[var(--secondary)] block mb-1">
                Training Completion
              </span>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-lg sm:text-xl font-black text-emerald-600">
                  {compliancePct.toFixed(1)}%
                </span>
                <span className="text-[10px] font-semibold text-[var(--secondary)]">
                  {currentCount.toLocaleString()} valid
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--muted-fill)] overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, compliancePct)}%` }}
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-[var(--border)]">
              <span className="text-[10px] font-bold text-[var(--secondary)] block mb-1">
                Skill Assignment Match
              </span>
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-lg sm:text-xl font-black text-[var(--brand-purple)]">
                  {skillMatchPct.toFixed(1)}%
                </span>
                <span className="text-[10px] font-semibold text-[var(--secondary)]">
                  {matchedCount.toLocaleString()} aligned
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--muted-fill)] overflow-hidden">
                <div
                  className="h-full bg-[var(--brand-purple)] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, skillMatchPct)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Certification Status Tiles */}
          <div className="grid grid-cols-3 gap-2 text-xs mb-2.5 shrink-0">
            <div className="p-2 rounded-lg bg-[var(--muted-fill)] text-center">
              <span className="text-[10px] font-semibold text-[var(--secondary)] block">Valid Certs</span>
              <span className="text-sm font-extrabold text-[var(--text)]">{currentCount.toLocaleString()}</span>
            </div>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-center">
              <span className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 block">Expired</span>
              <span className="text-sm font-extrabold text-rose-900 dark:text-rose-200">{expiredCount.toLocaleString()}</span>
            </div>
            <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-center">
              <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 block">Skill Gaps</span>
              <span className="text-sm font-extrabold text-amber-900 dark:text-amber-200">{gapCount.toLocaleString()}</span>
            </div>
          </div>

          {/* Thin divider */}
          <div className="my-1.5 border-t border-[var(--border)]/70 shrink-0" />

          {/* NEW block filling remaining height: Certification Status donut */}
          <div className="flex-1 flex flex-col justify-start min-h-[140px]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)] block mb-1">
              Certification Status
            </span>

            {totalCerts === 0 ? (
              <div className="flex-1 min-h-[120px] flex flex-col items-center justify-center text-center p-3 text-[var(--secondary)] bg-[var(--surface-hover)]/30 rounded-xl border border-dashed border-[var(--border)]">
                <ShieldCheck className="w-5 h-5 mb-1 text-[var(--secondary)]/50" />
                <span className="text-xs font-semibold">No certification records</span>
                <span className="text-[10px]">No certifications tracked for current selection</span>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-between gap-4 sm:gap-6 pt-1">
                {/* Donut with center total */}
                <div className="w-[130px] sm:w-[140px] h-[130px] sm:h-[140px] relative shrink-0 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart accessibilityLayer={false}>
                      <Pie
                        data={certStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={36}
                        outerRadius={56}
                        paddingAngle={totalCerts > 0 && currentCount > 0 && expiredCount > 0 ? 3 : 0}
                        dataKey="value"
                        stroke={isDark ? (palette.surface || '#192235') : '#FFFFFF'}
                        strokeWidth={2}
                      >
                        {certStatusData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        wrapperStyle={{ zIndex: 100, outline: 'none' }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0]?.payload;
                          if (!d) return null;
                          return (
                            <div
                              className="p-2 rounded-xl shadow-lg border text-xs"
                              style={{
                                backgroundColor: palette.tooltipBg,
                                borderColor: palette.tooltipBorder,
                                color: palette.tooltipText,
                              }}
                            >
                              <div className="font-bold flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                                <span>{d.label}:</span>
                                <span className="font-extrabold">{d.value.toLocaleString()} ({d.pct}%)</span>
                              </div>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-xs sm:text-sm font-black text-[var(--text)] tabular-nums leading-none">
                      {totalCerts.toLocaleString()}
                    </span>
                    <span className="text-[8.5px] font-bold text-[var(--secondary)] uppercase tracking-wider mt-0.5">
                      Audited
                    </span>
                  </div>
                </div>

                {/* Compact legend on the right */}
                <div className="flex-1 space-y-2.5">
                  {certStatusData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-semibold text-[var(--text)] text-[11px] sm:text-xs truncate">{item.label}</span>
                      </div>
                      <div className="text-right tabular-nums shrink-0 ml-2">
                        <span className="font-black text-[11px] sm:text-xs text-[var(--text)] mr-1.5">{item.value.toLocaleString()}</span>
                        <span className="text-[10px] font-semibold text-[var(--secondary)]">({item.pct}%)</span>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[var(--border)]/60 flex items-center justify-between text-[11px] text-[var(--secondary)]">
                    <span className="font-semibold">Compliance Rate</span>
                    <span className="font-black text-emerald-600 dark:text-emerald-400">{validPct}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TrainingCompliance;
