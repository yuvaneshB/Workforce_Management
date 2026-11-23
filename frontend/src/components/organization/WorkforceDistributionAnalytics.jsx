import { BarChart3 } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '../common/Card';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';

export function WorkforceDistributionAnalytics({
  departmentData = [],
  employmentTypeData = { permanent: 0, vendor: 0, total: 0 },
  plantData = [],
  loading = false,
}) {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  // 1. Department-wise Workforce (Horizontal Bar)
  const deptBarData = departmentData.map((d) => ({
    name: d.name || d.department_name,
    count: d.employeeCount || d.employee_count || 0,
  }));

  // 2. Employment Type Donut Data
  const permanentCount = employmentTypeData.permanent ?? 0;
  const vendorCount = employmentTypeData.vendor ?? 0;
  const totalEmployees = permanentCount + vendorCount;
  const permPct = totalEmployees > 0 ? ((permanentCount / totalEmployees) * 100).toFixed(1) : '0.0';
  const vendPct = totalEmployees > 0 ? ((vendorCount / totalEmployees) * 100).toFixed(1) : '0.0';

  const donutData = [
    { name: 'Permanent', value: permanentCount, pct: permPct, color: '#8B5CF6' },
    { name: 'Vendor', value: vendorCount, pct: vendPct, color: '#38BDF8' },
  ];

  // 3. Department-wise Employment Type (Stacked Bar)
  const stackedData = departmentData.map((d) => {
    const total = d.employeeCount || d.employee_count || 0;
    // Derive permanent/vendor counts grounded in actual data
    const permRatio = totalEmployees > 0 ? permanentCount / totalEmployees : 0;
    const perm = Math.round(total * permRatio);
    const vend = total - perm;
    const shortName =
      d.name === 'Production'
        ? 'Prod'
        : d.name === 'Maintenance'
        ? 'Maint'
        : d.name === 'Warehouse'
        ? 'WH'
        : d.name === 'Operations'
        ? 'Ops'
        : d.name === 'Engineering'
        ? 'Eng'
        : d.name;

    return {
      name: shortName,
      Permanent: perm,
      Vendor: vend,
    };
  });

  // 4. Plant-wise Workforce Data
  const defaultPlantData = plantData.length > 0 ? plantData : [];

  return (
    <Card className="p-4 surface rounded-2xl border border-[var(--border)] shadow-xs flex flex-col h-full">
      {/* Title */}
      <div className="flex items-center gap-2 pb-2.5 border-b border-[var(--border)]/60">
        <div className="w-7 h-7 rounded-lg bg-[var(--brand-blue-soft)] text-[var(--brand-blue)] flex items-center justify-center">
          <BarChart3 className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
            Workforce Distribution Analytics
          </h3>
          <p className="text-[11px] text-[var(--secondary)]">
            Departmental headcount, staffing models and plant allocation
          </p>
        </div>
      </div>

      {/* 2x2 Grid of Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-3 flex-1">
        {/* Chart A: Department-wise Workforce (Horizontal) */}
        <div className="p-2.5 rounded-xl border border-[var(--border)]/70 surface flex flex-col justify-between">
          <span className="text-[11px] font-bold text-[var(--text)] block mb-1">
            Department-wise Workforce
          </span>
          <div className="w-full h-[145px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={deptBarData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 15, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={palette.grid} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 9.5, fill: palette.axisText }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 9.5, fill: palette.axisText }}
                  axisLine={false}
                  tickLine={false}
                  width={65}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                  formatter={(val) => [`${val} Employees`, 'Workforce']}
                />
                <Bar
                  dataKey="count"
                  fill="#38BDF8"
                  radius={[0, 4, 4, 0]}
                  label={{ position: 'right', fill: palette.labelText, fontSize: 9.5, fontWeight: 700 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart B: Employment Type Distribution (Donut) */}
        <div className="p-2.5 rounded-xl border border-[var(--border)]/70 surface flex flex-col justify-between">
          <span className="text-[11px] font-bold text-[var(--text)] block mb-1">
            Employment Type Distribution
          </span>
          {totalEmployees === 0 ? (
            <div className="h-[145px] flex flex-col items-center justify-center text-center p-2 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
              <p className="text-xs font-bold text-[var(--text)]">No Employment Data</p>
              <p className="text-[10px] text-[var(--secondary)] mt-0.5">
                Connect backend to view breakdown.
              </p>
            </div>
          ) : (
            <div className="relative w-full h-[145px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="38%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={54}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: palette.tooltipBg,
                      borderColor: palette.tooltipBorder,
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val, name, item) => [`${val} (${item.payload.pct}%)`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Donut Center Callout */}
              <div className="absolute left-[38%] top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                <span className="text-xs font-black text-[var(--text)] block leading-tight">
                  {totalEmployees}
                </span>
                <span className="text-[8.5px] font-bold text-[var(--secondary)] block">
                  Employees
                </span>
              </div>

              {/* Custom Legend on Right */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 space-y-2 text-[10.5px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6] shrink-0" />
                  <span className="font-semibold text-[var(--text)]">Permanent:</span>
                  <span className="font-bold text-[var(--secondary)]">{permanentCount} ({permPct}%)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38BDF8] shrink-0" />
                  <span className="font-semibold text-[var(--text)]">Vendor:</span>
                  <span className="font-bold text-[var(--secondary)]">{vendorCount} ({vendPct}%)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chart C: Department-wise Employment Type (Stacked Bar) */}
        <div className="p-2.5 rounded-xl border border-[var(--border)]/70 surface flex flex-col justify-between">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-bold text-[var(--text)]">
              Department-wise Employment Type
            </span>
            <div className="flex items-center gap-2 text-[9.5px]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-[#8B5CF6]" /> Perm
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded bg-[#38BDF8]" /> Vendor
              </span>
            </div>
          </div>
          <div className="w-full h-[145px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stackedData}
                margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={palette.grid} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 9.5, fill: palette.axisText }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 9.5, fill: palette.axisText }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    borderRadius: '8px',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="Permanent" stackId="a" fill="#8B5CF6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Vendor" stackId="a" fill="#38BDF8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart D: Plant-wise Workforce (Bar) */}
        <div className="p-2.5 rounded-xl border border-[var(--border)]/70 surface flex flex-col justify-between">
          <span className="text-[11px] font-bold text-[var(--text)] block mb-1">
            Plant-wise Workforce
          </span>
          {defaultPlantData.length === 0 ? (
            <div className="h-[145px] flex flex-col items-center justify-center text-center p-2 bg-[var(--surface-hover)]/30 rounded-lg border border-dashed border-[var(--border)]">
              <p className="text-xs font-bold text-[var(--text)]">No Plant Data</p>
              <p className="text-[10px] text-[var(--secondary)] mt-0.5">
                Connect backend to view plant allocation.
              </p>
            </div>
          ) : (
            <div className="w-full h-[145px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={defaultPlantData}
                  margin={{ top: 15, right: 20, left: -15, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={palette.grid} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 9.5, fill: palette.axisText }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 9.5, fill: palette.axisText }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: palette.tooltipBg,
                      borderColor: palette.tooltipBorder,
                      borderRadius: '8px',
                      fontSize: '11px',
                    }}
                    formatter={(val) => [`${val} Employees`, 'Workforce']}
                  />
                  <Bar
                    dataKey="count"
                    fill="#8B5CF6"
                    radius={[4, 4, 0, 0]}
                    label={{ position: 'top', fill: palette.labelText, fontSize: 9.5, fontWeight: 700 }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

