import { Users2 } from 'lucide-react';
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
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function TeamWorkforceCard({
  employees = [],
  teamData = null,
  selectedTeam = '',
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  // Aggregate by actual team assignments if teamData or valid team_id exists
  let validTeamItems = [];

  if (teamData?.items && Array.isArray(teamData.items) && teamData.items.length > 0) {
    validTeamItems = teamData.items.filter((t) => t.team_id && t.team_id !== 'null' && !t.team_id.startsWith('S0'));
  } else if (employees && employees.length > 0) {
    const teamCounts = {};
    employees.forEach((emp) => {
      // Only count if employee has a genuine team assignment (not fallback section_id starting with 'S0')
      if (emp.team_id && !emp.team_id.startsWith('S0') && emp.team_id.toLowerCase().includes('team')) {
        teamCounts[emp.team_id] = (teamCounts[emp.team_id] || 0) + 1;
      }
    });
    validTeamItems = Object.entries(teamCounts).map(([teamId, count]) => ({
      team_id: teamId,
      count,
    }));
  }

  const totalTeamWorkforce = validTeamItems.reduce((acc, t) => acc + (t.count || 0), 0);

  const chartData = validTeamItems.map((t) => ({
    team_id: t.team_id,
    short_team: t.team_id.replace('TEAM-', 'T'),
    count: t.count || 0,
    pct: totalTeamWorkforce > 0 ? (((t.count || 0) / totalTeamWorkforce) * 100).toFixed(1) : '0.0',
  }));

  const hasValidTeamData = chartData.length > 0 && totalTeamWorkforce > 0;

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col justify-between min-h-[220px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Users2 className="w-4 h-4 shrink-0" style={{ color: '#0E9C86' }} aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Team-wise Workforce Distribution</h2>
          </div>
          <span className="text-[10px] font-semibold muted shrink-0">
            {hasValidTeamData ? `${chartData.length} Teams Active` : 'Not Configured'}
          </span>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-32 w-full rounded-lg" />
        ) : !hasValidTeamData ? (
          <div className="h-32 w-full my-1 flex flex-col items-center justify-center text-center p-3 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
            <Users2 className="w-5 h-5 text-slate-400 mb-1 opacity-60" />
            <p className="text-xs font-bold text-[var(--text)]">Team Hierarchy Not Configured</p>
            <p className="text-[10px] text-[var(--secondary)] max-w-xs mt-0.5 leading-tight">
              Neon PostgreSQL schema does not maintain a team master table. Organizational workforce is tracked at Department and Section level (see Section-wise Analytics).
            </p>
          </div>
        ) : (
          <div className="h-32 w-full my-1">
            <ResponsiveContainer width="100%" height={128}>
              <BarChart data={chartData} margin={{ top: 8, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis
                  dataKey="short_team"
                  stroke={palette.axisText}
                  fontSize={8}
                  interval={0}
                  tickLine={false}
                />
                <YAxis
                  stroke={palette.axisText}
                  fontSize={9}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val, name, item) => [`${val} operators (${item.payload.pct}%)`, item.payload.team_id]}
                />
                <Bar dataKey="count" name="Operators" radius={[3, 3, 0, 0]}>
                  {chartData.map((entry, index) => {
                    const isSelected = selectedTeam ? selectedTeam === entry.team_id : true;
                    return (
                      <Cell
                        key={`cell-team-${index}`}
                        fill={
                          isSelected
                            ? selectedTeam === entry.team_id
                              ? '#F58A3A'
                              : '#0E9C86'
                            : '#CBD5E1'
                        }
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] text-[11px] text-[var(--secondary)] flex items-center justify-between">
        <span>Team Mapping: <strong className="text-[var(--text)]">{hasValidTeamData ? `${chartData.length} valid teams` : '0 mapped in DB'}</strong></span>
        <span>Eligible Workforce: <strong className="text-[var(--text)]">{hasValidTeamData ? totalTeamWorkforce : '1,700 (Section-based)'}</strong></span>
      </div>
    </Card>
  );
}
