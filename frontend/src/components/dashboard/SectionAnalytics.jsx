import { BarChart2, Layers } from 'lucide-react';
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Legend,
  Line,
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

function formatShortSectionName(name) {
  if (!name) return '';
  if (name.length <= 13) return name;
  return `${name.slice(0, 11)}…`;
}

function computeDisplaySections(top12, remaining, othersCount, totalHeadcount) {
  let cumulative = 0;
  const sections = [];

  for (let i = 0; i < top12.length; i++) {
    const s = top12[i];
    cumulative += s.employee_count || 0;
    const individualPct = totalHeadcount > 0 ? ((s.employee_count || 0) / totalHeadcount) * 100 : 0;
    const cumulativePct = totalHeadcount > 0 ? (cumulative / totalHeadcount) * 100 : 0;

    sections.push({
      ...s,
      section_id: s.section_id,
      section_name: s.section_name || s.section_id,
      displayName: s.section_name || s.section_id,
      shortName: formatShortSectionName(s.section_name || s.section_id),
      employee_count: s.employee_count || 0,
      cumulativeCount: cumulative,
      individualPct: Number(individualPct.toFixed(1)),
      cumulativePct: Number(cumulativePct.toFixed(1)),
    });
  }

  if (othersCount > 0) {
    cumulative += othersCount;
    const individualPct = totalHeadcount > 0 ? (othersCount / totalHeadcount) * 100 : 0;
    sections.push({
      section_id: 'Others',
      section_name: `Other Sections (${remaining.length})`,
      displayName: 'Others',
      shortName: 'Others',
      employee_count: othersCount,
      cumulativeCount: cumulative,
      individualPct: Number(individualPct.toFixed(1)),
      cumulativePct: 100.0,
    });
  } else if (sections.length > 0) {
    sections[sections.length - 1].cumulativePct = 100.0;
  }

  return sections;
}

function CustomTooltip({ active, payload, palette, lineColor }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        className="p-3 rounded-lg text-xs shadow-lg border"
        style={{
          backgroundColor: palette.tooltipBg,
          borderColor: palette.tooltipBorder,
          color: palette.tooltipText,
        }}
      >
        <div className="font-bold text-[12px] mb-1.5 text-[var(--foreground)]">
          {data.section_name}
          {data.section_id !== 'Others' && (
            <span className="ml-1.5 font-normal text-[11px] text-[var(--secondary)]">
              ({data.section_id})
            </span>
          )}
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#3B82F6]">
              <span className="w-2 h-2 rounded-xs bg-[#3B82F6]" />
              Employee Count:
            </span>
            <span className="font-bold text-[var(--foreground)]">
              {data.employee_count.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-[#3B82F6]">
              <span className="w-2 h-2 rounded-xs bg-[#3B82F6]" />
              Individual Share:
            </span>
            <span className="font-bold text-[var(--foreground)]">
              {data.individualPct}%
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5" style={{ color: lineColor }}>
              <span className="w-2 h-2 rounded-xs" style={{ backgroundColor: lineColor }} />
              Cumulative Share:
            </span>
            <span className="font-bold text-[var(--foreground)]">
              {data.cumulativePct}%
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function renderSectionDot(props, totalPoints, lineColor, isDark) {
  const { cx, cy, index, stroke } = props;
  const isLast = index === totalPoints - 1;
  const dotColor = stroke || lineColor;

  if (isLast) {
    return (
      <g key={`sec-dot-${index}`}>
        <circle
          cx={cx}
          cy={cy}
          r={4}
          fill={dotColor}
          stroke={isDark ? '#192235' : '#FFFFFF'}
          strokeWidth={1.5}
        />
        {/* Upward arrow inspired by reference image */}
        <g transform={`translate(${cx + 1}, ${cy - 12})`}>
          <path
            d="M 0 6 L 6 0 M 6 0 L 2 0 M 6 0 L 6 4"
            stroke={dotColor}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </g>
    );
  }

  return (
    <circle
      key={`sec-dot-${index}`}
      cx={cx}
      cy={cy}
      r={3}
      fill={dotColor}
      stroke={isDark ? '#192235' : '#FFFFFF'}
      strokeWidth={1.5}
    />
  );
}

export function SectionAnalytics({ sectionAnalytics = null, loading = false, error = null }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;
  const lineColor = isDark ? '#93C5FD' : '#1F2F59';

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

  const displaySections = computeDisplaySections(top12, remaining, othersCount, totalHeadcount);

  return (
    <Card className="p-4 flex flex-col h-full min-h-[280px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Layers className="w-4 h-4 shrink-0" style={{ color: '#3B82F6' }} aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold truncate">Section-wise Analytics</h2>
        </div>
        {sorted.length > 0 && !loading && (
          <span className="text-[11px] font-bold text-[var(--secondary)] shrink-0">
            Top 12 of {sorted.length} Sections
          </span>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton className="h-[220px] w-full rounded-lg flex-1" />
      ) : displaySections.length > 0 ? (
        <div className="h-[220px] w-full flex-1">
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart
              data={displaySections}
              margin={{ top: 16, right: 10, left: -22, bottom: 20 }}
            >
              <defs>
                {/* Professional blue gradient for section bars */}
                <linearGradient id="sectionBlueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isDark ? '#60A5FA' : '#3B82F6'} stopOpacity={1} />
                  <stop offset="100%" stopColor={isDark ? '#2563EB' : '#1D4ED8'} stopOpacity={0.85} />
                </linearGradient>
                {/* Slate gradient for Others bar */}
                <linearGradient id="othersSlateGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={isDark ? '#64748B' : '#94A3B8'} stopOpacity={1} />
                  <stop offset="100%" stopColor={isDark ? '#475569' : '#64748B'} stopOpacity={0.85} />
                </linearGradient>
                {/* Arrowhead marker for line end */}
                <marker
                  id="sectionLineArrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={lineColor} />
                </marker>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} />

              <XAxis
                dataKey="shortName"
                stroke={palette.axisText}
                fontSize={8.5}
                tickLine={false}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={40}
              />

              <YAxis
                yAxisId="left"
                stroke={palette.axisText}
                fontSize={9}
                tickLine={false}
                axisLine={false}
                domain={[0, (dataMax) => Math.ceil((dataMax || 100) * 1.15)]}
                tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                stroke={palette.axisText}
                fontSize={9}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                tickFormatter={(val) => `${val}%`}
              />

              <Tooltip content={(tooltipProps) => <CustomTooltip {...tooltipProps} palette={palette} lineColor={lineColor} />} />

              <Legend
                verticalAlign="bottom"
                wrapperStyle={{
                  paddingTop: '6px',
                  fontSize: '10px',
                  fontWeight: 600,
                }}
                formatter={(value) => (
                  <span style={{ color: palette.labelText, marginRight: '6px' }}>
                    {value}
                  </span>
                )}
              />

              <Bar
                yAxisId="left"
                dataKey="employee_count"
                name="Workforce Headcount"
                radius={[4, 4, 0, 0]}
                barSize={16}
              >
                <LabelList
                  dataKey="employee_count"
                  position="top"
                  offset={4}
                  formatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val)}
                  style={{
                    fontSize: '8px',
                    fontWeight: 600,
                    fill: palette.axisText,
                  }}
                />
                {displaySections.map((entry, index) => (
                  <Cell
                    key={`cell-sec-${index}`}
                    fill={entry.section_id === 'Others' ? 'url(#othersSlateGrad)' : 'url(#sectionBlueGrad)'}
                  />
                ))}
              </Bar>

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="cumulativePct"
                name="Cumulative Workforce %"
                stroke={lineColor}
                strokeWidth={2.5}
                dot={(dotProps) => renderSectionDot(dotProps, displaySections.length, lineColor, isDark)}
                activeDot={{ r: 5.5, fill: lineColor, stroke: isDark ? '#192235' : '#FFFFFF', strokeWidth: 2 }}
                markerEnd="url(#sectionLineArrow)"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="h-[220px] w-full flex-1 flex items-center justify-center px-2">
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
