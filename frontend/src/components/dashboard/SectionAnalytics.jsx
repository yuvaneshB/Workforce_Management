import { BarChart2, Layers } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
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

  const sections = !error
    ? (sectionAnalytics?.items ?? []).filter((s) => s.employee_count > 0)
    : [];

  const totalSectionEmployees = sections.reduce((acc, s) => acc + (s.employee_count || 0), 0);

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col justify-between min-h-[220px]">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="w-4 h-4 shrink-0" style={{ color: '#4D8EEB' }} aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold whitespace-nowrap">Section-wise Analytics</h2>
          </div>
          {!loading && !error && sections.length > 0 && (
            <span className="text-[10px] font-semibold muted shrink-0">{sections.length} active sections</span>
          )}
        </div>

        {loading ? (
          <LoadingSkeleton className="h-32 w-full rounded-lg" />
        ) : sections.length > 0 ? (
          <div className="h-32 w-full my-1">
            <ResponsiveContainer width="100%" height={128}>
              <BarChart data={sections} margin={{ top: 8, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis dataKey="section_id" stroke={palette.axisText} fontSize={8} tickLine={false} />
                <YAxis stroke={palette.axisText} fontSize={9} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val, name, item) => [
                    `${val.toLocaleString()} employees (${totalSectionEmployees > 0 ? ((val / totalSectionEmployees) * 100).toFixed(1) : 0}%)`,
                    `${item.payload.section_name || item.payload.section_id} (${item.payload.section_id})`,
                  ]}
                />
                <Bar
                  dataKey="employee_count"
                  name="Employees"
                  fill={palette.supply}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-32 w-full my-1 flex items-center justify-center px-2">
            <EmptyState
              icon={BarChart2}
              iconClassName="w-6 h-6 mx-auto muted mb-1.5"
              title="No data available"
              titleClassName="text-[11px] font-bold"
              description="Section-wise workforce and attendance will appear here."
            />
          </div>
        )}
      </div>

      {!loading && !error && sections.length > 0 && (
        <div className="flex items-center justify-between pt-2 border-t border-[var(--border)] text-[10px] text-[var(--secondary)]">
          <span>Active Sections: <strong className="text-[var(--text)]">{sections.length}</strong></span>
          <span>Assigned Workforce: <strong className="text-[var(--text)]">{totalSectionEmployees.toLocaleString()} employees</strong></span>
        </div>
      )}
    </Card>
  );
}
