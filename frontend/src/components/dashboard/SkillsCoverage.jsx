import { Award } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const GRADE_METADATA = {
  G1: { baseColor: '#96A1C7', topColor: '#C5CCE3', darkBase: '#6775A8', darkTop: '#96A1C7' },
  G2: { baseColor: '#6775A8', topColor: '#96A1C7', darkBase: '#4A578F', darkTop: '#6775A8' },
  G3: { baseColor: '#4A578F', topColor: '#6775A8', darkBase: '#493287', darkTop: '#4A578F' },
  G4: { baseColor: '#493287', topColor: '#4A578F', darkBase: '#3B2870', darkTop: '#493287' },
  G5: { baseColor: '#3B2870', topColor: '#493287', darkBase: '#1F2F59', darkTop: '#3B2870' },
  G6: { baseColor: '#1F2F59', topColor: '#3B2870', darkBase: '#172343', darkTop: '#1F2F59' },
  G7: { baseColor: '#172343', topColor: '#1F2F59', darkBase: '#0F172A', darkTop: '#172343', isHighest: true },
};

const GRADE_ORDER = { G1: 1, G2: 2, G3: 3, G4: 4, G5: 5, G6: 6, G7: 7, L1: 1, L2: 2, L3: 3, L4: 4 };

const CERT_PALETTE = [
  '#493287', // brand primary
  '#4D8EEB', // blue
  '#0EA5E9', // sky
  '#F59E0B', // amber
  '#10B981', // emerald
  '#EC4899', // pink
  '#3B2870', // navy
  '#14B8A6', // teal
  '#F97316', // orange
];

export function SkillsCoverage({
  skillsAnalytics = null,
  complianceAnalytics = null,
  workforceSummary = null,
  loading = false,
  compact = false,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const hasData = Boolean(skillsAnalytics || workforceSummary);
  const totalEmployees =
    workforceSummary?.total_employees ||
    skillsAnalytics?.total_employees ||
    0;

  // 1. Skill Grade Distribution (G1 to G7)
  const rawGrades =
    skillsAnalytics?.skill_grade_distribution ||
    workforceSummary?.by_skill_grade ||
    [];

  const gradeData =
    rawGrades.length > 0
      ? rawGrades.map((g) => {
          const grade = g.skill_grade || g.key || '';
          const count = g.employee_count ?? g.count ?? 0;
          const pct =
            g.percentage != null
              ? Number(g.percentage).toFixed(1)
              : totalEmployees > 0
              ? ((count / totalEmployees) * 100).toFixed(1)
              : '0.0';
          return { grade, count, pct };
        })
      : [];

  gradeData.sort((a, b) => (GRADE_ORDER[a.grade] || 99) - (GRADE_ORDER[b.grade] || 99));

  // 2. Core Certifications
  const rawCerts =
    skillsAnalytics?.certification_distribution ||
    workforceSummary?.by_certification ||
    [];

  const sourceCerts =
    rawCerts.length > 0
      ? rawCerts.map((c) => {
          const cert = c.certification || c.key || '';
          const count = c.employee_count ?? c.count ?? 0;
          const pct =
            c.percentage != null
              ? Number(c.percentage).toFixed(1)
              : totalEmployees > 0
              ? ((count / totalEmployees) * 100).toFixed(1)
              : '0.0';
          return { cert, count, pct };
        })
      : [];

  const realCerts = [];
  let noneCert = null;

  sourceCerts.forEach((c) => {
    const isNone =
      !c.cert ||
      c.cert.toLowerCase() === 'none' ||
      c.cert.toLowerCase() === 'no certification' ||
      c.cert.toLowerCase() === 'n/a';
    if (isNone) {
      noneCert = {
        ...c,
        label: 'No certification',
        isNone: true,
      };
    } else {
      realCerts.push({
        ...c,
        label: c.cert,
        isNone: false,
      });
    }
  });

  // Sort real certifications by count descending
  realCerts.sort((a, b) => b.count - a.count);

  const enrichedRealCerts = realCerts.map((item, idx) => ({
    ...item,
    color: CERT_PALETTE[idx % CERT_PALETTE.length],
  }));

  const enrichedNoneCert = noneCert
    ? {
        ...noneCert,
        color: theme === 'dark' ? '#64748B' : '#94A3B8',
      }
    : null;

  const rankedCerts = enrichedNoneCert
    ? [...enrichedRealCerts, enrichedNoneCert]
    : enrichedRealCerts;

  // Custom tick for X Axis: Grade on top, percentage below
  const renderGradeTick = ({ x, y, payload }) => {
    const item = gradeData.find((g) => g.grade === payload.value);
    const pct = item?.pct != null ? `${item.pct}%` : '';
    const isHighest = item?.grade === 'G7';

    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={8}
          textAnchor="middle"
          fill={isHighest ? (theme === 'dark' ? '#8295E8' : '#493287') : palette.axisText}
          fontSize={10.5}
          fontWeight={700}
        >
          {payload.value}
        </text>
        <text
          x={0}
          y={0}
          dy={19}
          textAnchor="middle"
          fill={theme === 'dark' ? '#94A3B8' : '#64748B'}
          fontSize={9}
          fontWeight={500}
        >
          {pct}
        </text>
      </g>
    );
  };

  // Custom label on top of each bar: bold count value
  const renderBarCountLabel = (props) => {
    const { x, y, width, value } = props;
    if (value == null) return null;
    return (
      <text
        x={x + width / 2}
        y={y - 4}
        fill={theme === 'dark' ? '#F1F5F9' : '#0F172A'}
        textAnchor="middle"
        fontSize={10}
        fontWeight={800}
        className="select-none"
      >
        {value}
      </text>
    );
  };

  return (
    <div className="surface rounded-2xl p-4 border border-[var(--border)] shadow-xs flex flex-col h-full">
      <style>{`
        .skills-grade-chart .recharts-wrapper,
        .skills-grade-chart .recharts-surface,
        .skills-grade-chart svg,
        .skills-grade-chart *:focus,
        .skills-grade-chart *:focus-visible {
          outline: none !important;
          box-shadow: none !important;
          border: none !important;
        }
      `}</style>

      {/* 1. Header: Icon + title on ONE line */}
      <div className="flex items-center gap-2 mb-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center shrink-0">
          <Award className="w-4 h-4" />
        </div>
        <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight whitespace-nowrap">
          Skills Coverage & Matrix
        </h3>
      </div>

      {loading && (!hasData || (gradeData.length === 0 && rankedCerts.length === 0)) ? (
        <div className="flex-1 w-full min-h-[340px] flex items-center justify-center">
          <LoadingSkeleton className="h-72 w-full rounded-xl" />
        </div>
      ) : gradeData.length === 0 && rankedCerts.length === 0 ? (
        <div className="flex-1 w-full min-h-[220px] flex flex-col items-center justify-center text-center p-3 text-[var(--secondary)]">
          <Award className="w-6 h-6 mb-1 text-[var(--secondary)]/50" />
          <span className="text-xs font-semibold">No skills coverage data</span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between">
          {/* 2. Skill Grade Distribution Section */}
          <div className="shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)] block mb-0.5">
              Skill Grade Distribution
            </span>

            <div className="skills-grade-chart w-full h-[148px] outline-none">
              <ResponsiveContainer width="100%" height={148}>
                <BarChart
                  data={gradeData}
                  accessibilityLayer={false}
                  margin={{ top: 16, right: 8, left: -26, bottom: 0 }}
                  style={{ outline: 'none', border: 'none' }}
                >
                  <defs>
                    {gradeData.map((item) => {
                      const meta = GRADE_METADATA[item.grade] || GRADE_METADATA.G1;
                      const baseColor = theme === 'dark' ? meta.darkBase : meta.baseColor;
                      const topColor = theme === 'dark' ? meta.darkTop : meta.topColor;
                      return (
                        <linearGradient
                          key={item.grade}
                          id={`skillGradeGrad-${item.grade}`}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop offset="0%" stopColor={topColor} stopOpacity={1} />
                          <stop offset="100%" stopColor={baseColor} stopOpacity={1} />
                        </linearGradient>
                      );
                    })}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} vertical={false} opacity={0.6} />
                  <XAxis
                    dataKey="grade"
                    tick={renderGradeTick}
                    tickLine={false}
                    axisLine={{ stroke: palette.grid }}
                    interval={0}
                    height={30}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: palette.axisText, fontSize: 9 }}
                    tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
                    domain={[0, (dataMax) => Math.ceil(dataMax * 1.15)]}
                    width={26}
                  />
                  <Tooltip
                    wrapperStyle={{ zIndex: 100, outline: 'none' }}
                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const item = payload[0]?.payload;
                      if (!item) return null;
                      return (
                        <div
                          className="p-2.5 rounded-xl shadow-lg border text-xs"
                          style={{
                            backgroundColor: palette.tooltipBg,
                            borderColor: palette.tooltipBorder,
                            color: palette.tooltipText,
                          }}
                        >
                          <div className="font-bold text-[12px]">
                            {item.grade}: <span className="font-extrabold">{item.count.toLocaleString()} employees</span>{' '}
                            <span className="text-[var(--secondary)] font-normal">({item.pct}%)</span>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Bar
                    dataKey="count"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={34}
                  >
                    <LabelList dataKey="count" content={renderBarCountLabel} />
                    {gradeData.map((entry) => {
                      const isHighest = entry.grade === 'G7';
                      return (
                        <Cell
                          key={entry.grade}
                          fill={`url(#skillGradeGrad-${entry.grade})`}
                          stroke={isHighest ? (theme === 'dark' ? '#8295E8' : '#493287') : undefined}
                          strokeWidth={isHighest ? 1.5 : 0}
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Thin divider between parts */}
          <div className="my-1.5 border-t border-[var(--border)]/70" />

          {/* 3. Core Certifications Section */}
          <div className="flex-1 flex flex-col justify-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)] block mb-1">
              Core Certifications
            </span>

            <div className="space-y-1">
              {rankedCerts.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between gap-2 text-xs h-[30px] py-1"
                  title={`${item.label}: ${item.count.toLocaleString()} employees (${item.pct}%)`}
                >
                  {/* Certification name on the left (never truncated, wraps/truncates cleanly) */}
                  <div className="w-34 sm:w-40 shrink-0 pr-2 truncate">
                    <span
                      className={`font-semibold text-xs leading-none ${
                        item.isNone ? 'text-[var(--secondary)] italic' : 'text-[var(--text)]'
                      }`}
                      title={item.label}
                    >
                      {item.label}
                    </span>
                  </div>

                  {/* Horizontal progress bar in the middle (width = percent of workforce) */}
                  <div className="flex-1 min-w-[50px] h-2 rounded-full bg-[var(--muted-fill)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, Math.max(1, parseFloat(item.pct)))}%`,
                        backgroundColor: item.color,
                        opacity: item.isNone ? 0.65 : 1,
                      }}
                    />
                  </div>

                  {/* Count (bold) and percent (muted) on the right, right-aligned so columns line up */}
                  <div className="w-24 shrink-0 text-right tabular-nums flex items-baseline justify-end gap-1.5">
                    <span
                      className={`font-black text-xs ${
                        item.isNone ? 'text-[var(--secondary)]' : 'text-[var(--text)]'
                      }`}
                    >
                      {item.count.toLocaleString()}
                    </span>
                    <span className="text-[10px] font-medium text-[var(--secondary)] w-11 text-right">
                      ({item.pct}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SkillsCoverage;
