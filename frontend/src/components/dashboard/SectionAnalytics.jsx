import { BarChart2, Layers } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function SectionAnalytics({ sectionAnalytics = null, loading = false, error = null }) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawSections = !error
    ? (sectionAnalytics?.items ?? []).filter((s) => (s.employee_count || 0) > 0)
    : [];

  // Sort descending by employee_count
  const sorted = [...rawSections].sort(
    (a, b) => (b.employee_count || 0) - (a.employee_count || 0)
  );

  const totalHeadcount = sorted.reduce((acc, s) => acc + (s.employee_count || 0), 0);

  // Top 12 sections plus Others
  const top12 = sorted.slice(0, 12);
  const remaining = sorted.slice(12);
  const othersCount = remaining.reduce((acc, s) => acc + (s.employee_count || 0), 0);

  const displaySections = top12.map((s) => ({
    ...s,
    displayName: s.section_id || s.section_name,
    fullName: s.section_name || s.section_id,
  }));

  if (othersCount > 0) {
    displaySections.push({
      section_id: 'Others',
      section_name: `Other Sections (${remaining.length})`,
      displayName: 'Others',
      fullName: `Other Sections (${remaining.length} sections)`,
      employee_count: othersCount,
    });
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const pct = totalHeadcount > 0 ? ((data.employee_count / totalHeadcount) * 100).toFixed(1) : 0;
      return (
        <div
          className="p-2.5 rounded-lg text-xs shadow-lg border"
          style={{
            backgroundColor: palette.tooltipBg,
            borderColor: palette.tooltipBorder,
            color: palette.tooltipText,
          }}
        >
          <p className="font-bold mb-1 text-[var(--foreground)]">
            {data.fullName} {data.section_id !== 'Others' && `(${data.section_id})`}
          </p>
          <p className="text-[11px] font-semibold text-[#4D8EEB]">
            {data.employee_count.toLocaleString()} employees ({pct}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 flex flex-col h-full min-h-[280px]">
      {/* Single clean line header - no subtitles */}
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 shrink-0" style={{ color: '#4D8EEB' }} aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold truncate">Section-wise Analytics</h2>
        </div>
        {sorted.length > 0 && !loading && (
          <span className="text-[11px] font-bold text-[var(--secondary)] shrink-0">
            Top 12 of {sorted.length} Sections
          </span>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton className="h-[200px] w-full rounded-lg flex-1" />
      ) : displaySections.length > 0 ? (
        <div className="h-[200px] w-full flex-1">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={displaySections}
              margin={{ top: 12, right: 10, left: -25, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />
              <XAxis
                dataKey="displayName"
                stroke={palette.axisText}
                fontSize={9}
                tickLine={false}
              />
              <YAxis
                stroke={palette.axisText}
                fontSize={9}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="employee_count"
                name="Employees"
                fill={palette.supply}
                radius={[4, 4, 0, 0]}
                barSize={18}
              >
                {displaySections.map((entry, index) => (
                  <Cell
                    key={`cell-sec-${index}`}
                    fill={entry.section_id === 'Others' ? '#94A3B8' : '#4D8EEB'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[200px] w-full flex-1 flex items-center justify-center px-2">
          <EmptyState
            icon={BarChart2}
            title="No data available"
            description="Section-wise workforce distribution will appear here."
          />
        </div>
      )}
    </Card>
  );
}
