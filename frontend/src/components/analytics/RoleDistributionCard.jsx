import { Award } from 'lucide-react';
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

// Distinctive harmonious color palette for treemap tiles
const TILE_COLORS = [
  '#4D2E89', // 1st - deepest purple
  '#6F3DBA', // 2nd
  '#804ECB', // 3rd
  '#9160DC', // 4th
  '#2C60B4', // 5th - deep blue
  '#4D8EEB', // 6th
  '#6AA2F3', // 7th
  '#0E9C86', // 8th - teal
  '#1CB8A1', // 9th
  '#F58A3A', // 10th - amber
  '#94A3B8', // Others - neutral slate
];

export function RoleDistributionCard({
  summary = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawRoles = !error && summary?.by_role ? summary.by_role : [];
  const validRoles = rawRoles.filter((r) => (r.count || 0) > 0);
  const totalHeadcount = validRoles.reduce((acc, r) => acc + (r.count || 0), 0);

  // Sort descending by count
  const sorted = [...validRoles].sort((a, b) => (b.count || 0) - (a.count || 0));
  const top10 = sorted.slice(0, 10);
  const remaining = sorted.slice(10);
  const othersCount = remaining.reduce((acc, r) => acc + (r.count || 0), 0);

  const treemapData = top10.map((r, idx) => ({
    name: r.key || r.name || 'Unknown',
    size: r.count,
    count: r.count,
    pct: totalHeadcount > 0 ? ((r.count / totalHeadcount) * 100).toFixed(1) : '0.0',
    color: TILE_COLORS[idx % TILE_COLORS.length],
  }));

  if (othersCount > 0) {
    treemapData.push({
      name: `Others (${remaining.length})`,
      size: othersCount,
      count: othersCount,
      pct: totalHeadcount > 0 ? ((othersCount / totalHeadcount) * 100).toFixed(1) : '0.0',
      color: TILE_COLORS[10],
    });
  }

  // Custom Treemap Content to render formatted labels on adequately sized tiles
  const CustomTreemapContent = (props) => {
    const { x, y, width, height, name, count, pct, color } = props;
    if (!width || !height || width < 4 || height < 4) return null;

    const showFull = width >= 65 && height >= 42;
    const showCompact = width >= 45 && height >= 26;

    return (
      <g>
        <rect
          x={x + 1.5}
          y={y + 1.5}
          width={Math.max(0, width - 3)}
          height={Math.max(0, height - 3)}
          rx={5}
          ry={5}
          fill={color || '#6F3DBA'}
          stroke={theme === 'dark' ? '#0f172a' : '#ffffff'}
          strokeWidth={1.5}
          className="transition-all duration-150 hover:opacity-90 cursor-pointer"
        />
        {showFull ? (
          <>
            <text
              x={x + width / 2}
              y={y + height / 2 - 6}
              textAnchor="middle"
              fill="#ffffff"
              fontSize={11}
              fontWeight={700}
              style={{ pointerEvents: 'none' }}
            >
              {name.length > Math.floor(width / 7) ? `${name.slice(0, Math.floor(width / 7))}…` : name}
            </text>
            <text
              x={x + width / 2}
              y={y + height / 2 + 10}
              textAnchor="middle"
              fill="#ffffff"
              fillOpacity={0.92}
              fontSize={10}
              fontWeight={600}
              style={{ pointerEvents: 'none' }}
            >
              {count} ({pct}%)
            </text>
          </>
        ) : showCompact ? (
          <text
            x={x + width / 2}
            y={y + height / 2 + 3}
            textAnchor="middle"
            fill="#ffffff"
            fontSize={10}
            fontWeight={700}
            style={{ pointerEvents: 'none' }}
          >
            {count}
          </text>
        ) : null}
      </g>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="p-2.5 rounded-lg text-xs shadow-lg border"
          style={{
            backgroundColor: palette.tooltipBg,
            borderColor: palette.tooltipBorder,
            color: palette.tooltipText,
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="font-bold">{data.name}</span>
          </div>
          <p className="text-[11px] font-semibold">
            {data.count.toLocaleString()} employees ({data.pct}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 flex flex-col h-full min-h-[340px]">
      {/* Single clean line header */}
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Award className="w-4 h-4 shrink-0" style={{ color: '#4D8EEB' }} aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold truncate">Distribution by Role</h2>
        </div>
        {totalHeadcount > 0 && !loading && (
          <span className="text-[11px] font-bold text-[var(--secondary)] shrink-0">
            Top 10 Roles + Others ({totalHeadcount.toLocaleString()} Total)
          </span>
        )}
      </div>

      {loading ? (
        <LoadingSkeleton className="h-[280px] w-full rounded-lg flex-1" />
      ) : treemapData.length === 0 ? (
        <div className="h-[280px] flex-1 flex items-center justify-center">
          <EmptyState
            icon={Award}
            title="No Role Data"
            description="Role distribution will appear here."
          />
        </div>
      ) : (
        <div className="h-[280px] w-full flex-1">
          <ResponsiveContainer width="100%" height={280}>
            <Treemap
              data={treemapData}
              dataKey="size"
              aspectRatio={4 / 3}
              stroke="#fff"
              content={<CustomTreemapContent />}
            >
              <Tooltip content={<CustomTooltip />} />
            </Treemap>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}

