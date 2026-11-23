import { AlertCircle, CheckCircle2, FileCheck, RefreshCw, ShieldAlert, ShieldCheck } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS } from '../../utils/constants';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { KPICard } from '../common/KPICard';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function ComplianceSection({ data, loading, error, onRetry, palette = CHART_COLORS.light }) {
  if (loading) {
    return (
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <LoadingSkeleton className="h-4 w-24 rounded mb-2" />
              <LoadingSkeleton className="h-7 w-20 rounded" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <LoadingSkeleton className="h-64 w-full rounded-xl" />
          </Card>
          <Card className="p-5">
            <LoadingSkeleton className="h-64 w-full rounded-xl" />
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="p-5 mb-6" style={{ background: 'var(--rose-soft)' }}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-rose-600">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Failed to load Compliance Analytics: {error}</span>
          </div>
          {onRetry && (
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw className="w-3 h-3 mr-1 inline" /> Retry
            </Button>
          )}
        </div>
      </Card>
    );
  }

  if (!data || data.total_compliance_records === 0) {
    return (
      <Card className="p-8 mb-6">
        <EmptyState
          icon={FileCheck}
          title="No Compliance Data"
          description="No attendance compliance records found for the selected filters."
        />
      </Card>
    );
  }

  // Training compliance donut data
  const trainingPieData = [
    { name: 'Current', value: data.current_count, color: '#0E9C86' },
    { name: 'Expired', value: data.expired_count, color: '#E45C72' },
  ];

  // Skill match donut data
  const skillPieData = [
    { name: 'Matched', value: data.matched_count, color: '#4D8EEB' },
    { name: 'Skill Gap', value: data.gap_count, color: '#F58A3A' },
  ];

  const deptData = (data.department_wise ?? []).filter((d) => d.total_records > 0);
  const dailyData = data.daily_trend ?? [];

  return (
    <div className="space-y-4 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-emerald-600" />
            Training Compliance & Skill Match Analytics
          </h2>
          <p className="text-[11px] muted">
            Verified compliance and skill match rates from public.fact_workforce_attendance
          </p>
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          label="Training Compliance Rate"
          value={`${data.training_compliance_pct}%`}
          subtitle={`${data.current_count.toLocaleString()} Current / ${data.expired_count.toLocaleString()} Expired`}
          icon={CheckCircle2}
          iconBg="var(--emerald-soft)"
          iconColor="#0E9C86"
        />
        <KPICard
          label="Training Expiration Alerts"
          value={data.expired_count.toLocaleString()}
          subtitle="Shifts worked with expired certifications"
          icon={ShieldAlert}
          iconBg="var(--rose-soft)"
          iconColor="#E45C72"
        />
        <KPICard
          label="Skill Match Rate"
          value={`${data.skill_match_pct}%`}
          subtitle={`${data.matched_count.toLocaleString()} Matched / ${data.gap_count.toLocaleString()} Gaps`}
          icon={ShieldCheck}
          iconBg="var(--brand-blue-soft)"
          iconColor="#4D8EEB"
        />
        <KPICard
          label="Skill Gap Shifts"
          value={data.gap_count.toLocaleString()}
          subtitle="Shifts with role-skill requirement gaps"
          icon={AlertCircle}
          iconBg="var(--brand-peach-soft)"
          iconColor="#F58A3A"
        />
      </div>

      {/* Row 1: Donut Charts for Training Compliance and Skill Match */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Training Compliance Donut */}
        <Card className="p-4">
          <h3 className="text-[12px] font-bold mb-1">Training Compliance Status</h3>
          <p className="text-[10px] muted mb-2">Proportion of compliant vs expired training records</p>
          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={trainingPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {trainingPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
                  formatter={(val, name) => [`${val.toLocaleString()} records`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
              <span className="text-xl font-extrabold text-emerald-600">{data.training_compliance_pct}%</span>
              <span className="text-[9px] muted">Compliant</span>
            </div>
          </div>
        </Card>

        {/* Skill Match Donut */}
        <Card className="p-4">
          <h3 className="text-[12px] font-bold mb-1">Shift Skill Match Distribution</h3>
          <p className="text-[10px] muted mb-2">Role alignment vs detected skill gaps</p>
          <div className="h-56 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={skillPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {skillPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
                  formatter={(val, name) => [`${val.toLocaleString()} records`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
              <span className="text-xl font-extrabold text-blue-600">{data.skill_match_pct}%</span>
              <span className="text-[9px] muted">Matched</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Row 2: Department-wise Compliance Bar Chart & Daily Compliance Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Department Compliance Bar Chart */}
        <Card className="p-4">
          <h3 className="text-[12px] font-bold mb-1">Department Compliance & Skill Match %</h3>
          <p className="text-[10px] muted mb-3">Compliance and skill adherence rates across departments</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis dataKey="department_name" stroke={palette.axisText} fontSize={9} />
                <YAxis stroke={palette.axisText} fontSize={10} domain={[80, 100]} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val) => [`${val}%`, 'Rate']}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="compliance_pct" name="Compliance %" fill="#0E9C86" radius={[4, 4, 0, 0]} />
                <Bar dataKey="skill_match_pct" name="Skill Match %" fill="#4D8EEB" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Daily Compliance Trend Line Chart */}
        <Card className="p-4">
          <h3 className="text-[12px] font-bold mb-1">Daily Compliance & Skill Match Trend</h3>
          <p className="text-[10px] muted mb-3">Day-by-day rates across the reporting window</p>
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis dataKey="date" stroke={palette.axisText} fontSize={9} />
                <YAxis stroke={palette.axisText} fontSize={10} domain={[85, 100]} unit="%" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val, name) => [`${val}%`, name]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="compliance_pct"
                  name="Training Compliance %"
                  stroke="#0E9C86"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="skill_match_pct"
                  name="Skill Match %"
                  stroke="#4D8EEB"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

