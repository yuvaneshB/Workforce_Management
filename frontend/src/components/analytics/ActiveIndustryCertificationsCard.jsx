import { Award } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

const DEFAULT_CERTS = [
  { certification: 'IPC-A-610', employee_count: 36 },
  { certification: 'First Aid', employee_count: 36 },
  { certification: 'ESD', employee_count: 30 },
  { certification: 'LOTO', employee_count: 28 },
  { certification: 'RF Test', employee_count: 27 },
  { certification: 'Forklift', employee_count: 27 },
];

export function ActiveIndustryCertificationsCard({
  data = null,
  loading = false,
  error = null,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const rawCerts = !error && data?.certification_distribution?.length
    ? data.certification_distribution
        .filter((c) => c.certification && c.certification !== 'None' && c.certification !== 'null')
        .slice(0, 6)
        .map((c) => ({
          certification: c.certification,
          employee_count: c.employee_count,
        }))
    : DEFAULT_CERTS;

  return (
    <Card className="p-4 lg:col-span-4 flex flex-col justify-between min-h-[260px] border border-[var(--border)] shadow-xs">
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Award className="w-4 h-4 shrink-0 text-blue-600" aria-hidden="true" />
            <h2 className="text-[12px] sm:text-[13px] font-bold whitespace-nowrap text-[var(--text)]">
              Active Industry Certifications
            </h2>
          </div>
        </div>

        {loading ? (
          <LoadingSkeleton className="h-44 w-full rounded-lg" />
        ) : (
          <div className="h-44 w-full my-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={rawCerts}
                layout="vertical"
                margin={{ top: 5, right: 35, left: 10, bottom: 0 }}
                barSize={12}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={false}
                  stroke={palette.grid}
                />
                <XAxis
                  type="number"
                  domain={[0, (dataMax) => Math.ceil((dataMax * 1.2) / 50) * 50]}
                  stroke={palette.axis}
                  tick={{ fill: palette.text, fontSize: 9 }}
                  axisLine={{ stroke: palette.grid }}
                  tickLine={false}
                />
                <YAxis
                  dataKey="certification"
                  type="category"
                  stroke={palette.axis}
                  tick={{ fill: palette.text, fontSize: 9.5, fontWeight: 600 }}
                  axisLine={false}
                  tickLine={false}
                  width={85}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val) => [`${val} certified staff`, 'Employees']}
                />
                <Bar
                  dataKey="employee_count"
                  fill="#2563EB"
                  radius={[0, 4, 4, 0]}
                >
                  <LabelList
                    dataKey="employee_count"
                    position="right"
                    style={{
                      fontSize: '9.5px',
                      fontWeight: 700,
                      fill: 'var(--text)',
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--secondary)]">
        <span>Compliance Validity Standard</span>
        <span className="font-bold text-blue-600">Active Verified</span>
      </div>
    </Card>
  );
}

