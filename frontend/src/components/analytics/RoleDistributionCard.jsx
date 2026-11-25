import { Award } from 'lucide-react';
import { ResponsiveContainer, Tooltip, Treemap } from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

// Distinctive harmonious color palette for treemap tiles
const TILE_COLORS = [
  '#1F2F59', // 1st - navy
  '#3B2870', // 2nd - deep indigo
  '#493287', // 3rd - brand primary
  '#4A578F', // 4th - medium indigo
  '#2C60B4', // 5th - deep blue
  '#4D8EEB', // 6th
  '#6AA2F3', // 7th
  '#0E9C86', // 8th - teal
  '#1CB8A1', // 9th
  '#F58A3A', // 10th - amber
  '#94A3B8', // Others - neutral slate
];

function getTreemapTileLines({ width, height, name = '', count = 0, pct = '0.0' }) {
  const padW = Math.max(0, width - 6);
  const padH = Math.max(0, height - 6);

  const safeName = String(name || '');
  const safeCount = typeof count === 'number' ? count : Number(count) || 0;
  const safePct = pct != null ? String(pct) : '0.0';

  // Tiny tile
  if (padW < 24 || padH < 14) {
    return { lines: [], totalHeight: 0 };
  }

  // Very thin horizontal strip (e.g. width >= 70, height < 28)
  if (padH < 28 && padW >= 70) {
    const fontSize = padH < 18 ? 8.5 : 9.5;
    const maxChars = Math.floor(padW / (fontSize * 0.55));
    let text = `${safeName} • ${safeCount.toLocaleString()} (${safePct}%)`;
    if (text.length > maxChars) {
      text = `${safeName}: ${safeCount.toLocaleString()} (${safePct}%)`;
    }
    if (text.length > maxChars) {
      text = `${safeName}: ${safeCount.toLocaleString()}`;
    }
    if (text.length > maxChars) {
      text = `${safeName.slice(0, Math.max(4, maxChars - 1))}…`;
    }
    return {
      lines: [{ text, fontSize, fontWeight: 700, opacity: 1, type: 'single' }],
      totalHeight: fontSize + 2,
    };
  }

  // Standard multi-line layout
  let roleFontSize = 11;
  let countFontSize = 10;
  let pctFontSize = 9.5;

  if (padW >= 140 && padH >= 80) {
    roleFontSize = 12.5;
    countFontSize = 11;
    pctFontSize = 10.5;
  } else if (padW < 75 || padH < 52) {
    roleFontSize = 9.5;
    countFontSize = 8.5;
    pctFontSize = 8.5;
  }

  const charW = roleFontSize * 0.58;
  const singleLineFits = safeName.length * charW <= padW;

  // Split role name into 2 lines if needed and possible
  let roleLines = [safeName];
  if (!singleLineFits && safeName.includes(' ')) {
    const words = safeName.split(' ');
    const l1 = words[0];
    const l2 = words.slice(1).join(' ');
    if (l1.length * charW <= padW && l2.length * charW <= padW) {
      roleLines = [l1, l2];
    } else {
      const smallerRoleFontSize = Math.max(8.5, roleFontSize - 1.5);
      const smallerCharW = smallerRoleFontSize * 0.58;
      if (l1.length * smallerCharW <= padW && l2.length * smallerCharW <= padW) {
        roleFontSize = smallerRoleFontSize;
        roleLines = [l1, l2];
      }
    }
  } else if (!singleLineFits) {
    const fitSize = Math.max(8, Math.min(roleFontSize, Math.floor(padW / (Math.max(1, safeName.length) * 0.58))));
    roleFontSize = fitSize;
  }

  const countStr = padW >= 75 ? `${safeCount.toLocaleString()} employees` : `${safeCount.toLocaleString()}`;
  const pctStr = `${safePct}%`;

  const roleLineHeight = roleFontSize + 2.5;
  const countLineHeight = countFontSize + 2;
  const pctLineHeight = pctFontSize + 2;

  const heightForFullLines = roleLines.length * roleLineHeight + countLineHeight + pctLineHeight;

  if (padH >= heightForFullLines + 4) {
    // Role (1 or 2 lines) + Count line + Percentage line
    const lines = [];
    roleLines.forEach((t) => {
      lines.push({ text: t, fontSize: roleFontSize, fontWeight: 700, opacity: 1, type: 'role' });
    });
    lines.push({ text: countStr, fontSize: countFontSize, fontWeight: 600, opacity: 0.95, type: 'count' });
    lines.push({ text: pctStr, fontSize: pctFontSize, fontWeight: 700, opacity: 0.9, type: 'pct' });
    return { lines, totalHeight: heightForFullLines };
  }

  // Combined count and pct line
  const combinedLine = `${safeCount.toLocaleString()} (${safePct}%)`;
  const combinedHeight = roleLineHeight + countLineHeight;
  if (padH >= combinedHeight + 2) {
    return {
      lines: [
        { text: roleLines[0], fontSize: roleFontSize, fontWeight: 700, opacity: 1, type: 'role' },
        { text: combinedLine, fontSize: countFontSize, fontWeight: 600, opacity: 0.95, type: 'count' },
      ],
      totalHeight: combinedHeight,
    };
  }

  // Compact fallback: role name or count
  if (padH >= roleLineHeight + 2) {
    return {
      lines: [
        { text: roleLines[0], fontSize: Math.min(roleFontSize, 9), fontWeight: 700, opacity: 1, type: 'role' },
      ],
      totalHeight: roleLineHeight,
    };
  }

  return {
    lines: [
      { text: `${safeCount.toLocaleString()}`, fontSize: 8.5, fontWeight: 700, opacity: 1, type: 'count' },
    ],
    totalHeight: 10,
  };
}

function renderTileLabels(x, y, width, height, lineData) {
  const { lines, totalHeight } = lineData;
  if (!lines || lines.length === 0) return null;

  const startY = y + Math.max(2, (height - totalHeight) / 2);
  let accumulatedY = 0;

  return lines.map((line, idx) => {
    const lineSpacing = line.fontSize + (line.type === 'role' ? 3 : 2);
    const baselineY = startY + accumulatedY + line.fontSize * 0.88;
    accumulatedY += lineSpacing;

    return (
      <text
        key={`tile-txt-${idx}`}
        x={x + width / 2}
        y={baselineY}
        textAnchor="middle"
        fill="#FFFFFF"
        fillOpacity={line.opacity || 1}
        fontSize={line.fontSize}
        fontWeight={line.fontWeight || 600}
        style={{ pointerEvents: 'none' }}
      >
        {line.text}
      </text>
    );
  });
}

function CustomTreemapContent(props) {
  const { x, y, width, height, name, count, pct, color, theme, depth } = props;
  if (!width || !height || width < 4 || height < 4) return null;
  // Skip root wrapper node in Recharts treemap
  if (depth === 0 && props.children && props.children.length > 0) return null;
  if (count == null && props.size == null) return null;

  const tileCount = count ?? props.size ?? 0;
  const tileName = name || props.payload?.name || '';
  const tilePct = pct ?? props.payload?.pct ?? '0.0';
  const tileColor = color || props.payload?.color || '#493287';

  const lineData = getTreemapTileLines({
    width,
    height,
    name: tileName,
    count: tileCount,
    pct: tilePct,
  });

  return (
    <g>
      <rect
        x={x + 1.5}
        y={y + 1.5}
        width={Math.max(0, width - 3)}
        height={Math.max(0, height - 3)}
        rx={5}
        ry={5}
        fill={tileColor}
        stroke={theme === 'dark' ? '#0f172a' : '#ffffff'}
        strokeWidth={1.5}
        className="transition-all duration-150 hover:opacity-90 cursor-pointer"
      />
      {renderTileLabels(x, y, width, height, lineData)}
    </g>
  );
}

function CustomTooltip({ active, payload, totalHeadcount, palette }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload || payload[0];
    if (!data) return null;
    const roleName = data.fullName || data.name || 'Unknown';
    const roleCount = typeof data.count === 'number' ? data.count : typeof data.size === 'number' ? data.size : 0;
    const rolePct = data.pct != null ? data.pct : totalHeadcount > 0 ? ((roleCount / totalHeadcount) * 100).toFixed(1) : '0.0';

    return (
      <div
        className="p-3 rounded-lg text-xs shadow-lg border"
        style={{
          backgroundColor: palette.tooltipBg,
          borderColor: palette.tooltipBorder,
          color: palette.tooltipText,
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 rounded-xs shrink-0" style={{ backgroundColor: data.color || '#493287' }} />
          <span className="font-bold text-[12px] text-[var(--foreground)]">
            {roleName}
          </span>
        </div>
        <div className="space-y-1 text-[11px]">
          <div className="flex items-center justify-between gap-4">
            <span className="muted">Employee Count:</span>
            <span className="font-bold text-[var(--foreground)]">
              {roleCount.toLocaleString()} employees
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="muted">Workforce Percentage:</span>
            <span className="font-bold text-[#4D8EEB]">{rolePct}%</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-[var(--border)]">
            <span className="muted">Total Workforce:</span>
            <span className="font-semibold text-[var(--secondary)]">
              {(totalHeadcount || 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
}

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
    fullName: r.key || r.name || 'Unknown',
    size: r.count,
    count: r.count,
    pct: totalHeadcount > 0 ? ((r.count / totalHeadcount) * 100).toFixed(1) : '0.0',
    color: TILE_COLORS[idx % TILE_COLORS.length],
  }));

  if (othersCount > 0) {
    treemapData.push({
      name: `Others (${remaining.length})`,
      fullName: `Other Roles (${remaining.length} categories)`,
      size: othersCount,
      count: othersCount,
      pct: totalHeadcount > 0 ? ((othersCount / totalHeadcount) * 100).toFixed(1) : '0.0',
      color: TILE_COLORS[10],
    });
  }

  return (
    <Card className="p-4 flex flex-col h-full min-h-[340px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 min-w-0 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Award className="w-4 h-4 shrink-0" style={{ color: '#4D8EEB' }} aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold truncate">Distribution by Role</h2>
        </div>
        {totalHeadcount > 0 && !loading && (
          <span className="text-[11px] font-bold text-[var(--secondary)] shrink-0">
            Top 10 Roles + Others ({(totalHeadcount || 0).toLocaleString()} Total)
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
              content={(contentProps) => <CustomTreemapContent {...contentProps} theme={theme} />}
            >
              <Tooltip
                content={(tooltipProps) => (
                  <CustomTooltip
                    {...tooltipProps}
                    totalHeadcount={totalHeadcount}
                    palette={palette}
                  />
                )}
              />
            </Treemap>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
