import { PieChart as PieIcon } from 'lucide-react';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ATTRITION_BY_REASON } from '../../data/attritionData';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function AttritionByReasonCard({ data = null, loading = false }) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const reasons = data && data.length > 0 ? data : ATTRITION_BY_REASON;
  const totalExits = reasons.reduce((acc, curr) => acc + (curr.count || 0), 0);
  const primaryDriver = reasons.length > 0 ? reasons[0] : null;

  return (
    <Card className="p-4 lg:col-span-5 flex flex-col justify-between min-h-[260px] border border-[var(--border)] shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <PieIcon className="w-4 h-4 shrink-0 text-purple-600" aria-hidden="true" />
            <h2 className="text-[12px] sm:text-[13px] font-bold whitespace-nowrap text-[var(--text)]">
              Attrition by Reason
            </h2>
          </div>
          <span className="text-[9px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800 shrink-0">
            {totalExits} Recorded
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : totalExits === 0 ? (
          <div className="h-44 w-full my-1 flex flex-col items-center justify-center text-center p-4 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <PieIcon className="w-6 h-6 text-emerald-500 mb-2 opacity-80" />
            <p className="text-xs font-bold text-[var(--text)]">No Attrition Reasons</p>
            <p className="text-[11px] text-[var(--secondary)] mt-0.5">
              Zero employee exits logged in database (100% retained).
            </p>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-1 my-1">
            {/* Donut Chart with center metric */}
            <div className="relative w-[48%] h-44 flex items-center justify-center">
              <ResponsiveContainer width="100%" height={176}>
                <PieChart>
                  <Pie
                    data={reasons}
                    cx="50%"
                    cy="50%"
                    innerRadius={46}
                    outerRadius={68}
                    paddingAngle={2}
                    dataKey="count"
                    stroke="none"
                  >
                    {reasons.map((entry, index) => (
                      <Cell key={`cell-reason-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: palette.tooltipBg,
                      borderColor: palette.tooltipBorder,
                      color: palette.tooltipText,
                      fontSize: '11px',
                      borderRadius: '8px',
                    }}
                    formatter={(val, name, item) => [
                      `${val} exits (${item?.payload?.pct || ''})`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-xl font-black text-[var(--text)] leading-none">
                  {totalExits}
                </span>
                <span className="text-[8px] font-bold text-[var(--secondary)] uppercase tracking-wider mt-0.5">
                  Exits
                </span>
              </div>
            </div>

            {/* Legend Column */}
            <div className="w-[52%] max-h-44 overflow-y-auto space-y-1.5 pl-1 text-[10px] pr-1">
              {reasons.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 font-semibold text-[var(--text)] truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="truncate">{item.reason}</span>
                  </div>
                  <div className="font-extrabold text-[var(--text)] shrink-0">
                    {item.count} <span className="font-medium text-[var(--secondary)] text-[9px]">({item.pct})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--secondary)]">
        <span>Primary Voluntary Driver</span>
        <span className="font-bold text-blue-600">
          {primaryDriver ? `${primaryDriver.reason} (${primaryDriver.pct})` : 'None logged'}
        </span>
      </div>
    </Card>
  );
}

