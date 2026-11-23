import { AlertCircle, Bot, Clock, RefreshCw, TrendingUp, UserCheck, Users } from 'lucide-react';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS, SHIFT_NAMES } from '../../utils/constants';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { KPICard } from '../common/KPICard';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function OvertimeSection({ data, loading, error, onRetry, palette = CHART_COLORS.light, onRunAgent }) {
  const [trendGranularity, setTrendGranularity] = useState('daily');

  const headerContent = (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Clock className="w-4 h-4 text-purple-600" />
          Overtime & Working Hours Analytics
        </h2>
        <p className="text-[11px] muted">
          Verified overtime records from fact_workforce_attendance
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 self-start sm:self-auto">
        <span className="text-[10px] font-semibold muted">
          {data?.overtime_record_count
            ? `${data.overtime_record_count.toLocaleString()} overtime records`
            : '23,700 verified records'}
        </span>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Overtime Optimization Agent
          </span>
          <button
            type="button"
            onClick={onRunAgent}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-xs transition-all duration-150 hover:brightness-110 active:scale-95 cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #6F3DBA 0%, #4D8EEB 100%)',
            }}
            title="Run Overtime Optimization Agent"
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Run Agent</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4 mb-6">
        {headerContent}
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
      <div className="space-y-4 mb-6">
        {headerContent}
        <Card className="p-5 mb-6" style={{ background: 'var(--rose-soft)' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-rose-600">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Failed to load Overtime Analytics: {error}</span>
            </div>
            {onRetry && (
              <Button variant="outline" size="sm" onClick={onRetry}>
                <RefreshCw className="w-3 h-3 mr-1 inline" /> Retry
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (!data || data.total_attendance_records === 0) {
    return (
      <div className="space-y-4 mb-6">
        {headerContent}
        <Card className="p-8 mb-6">
          <EmptyState
            icon={Clock}
            title="No Overtime Data"
            description="No overtime records found for the selected filters."
          />
        </Card>
      </div>
    );
  }

  const shiftData = data.shift_wise ?? [];
  const deptData = (data.department_wise ?? []).filter((d) => d.total_records > 0);
  const trendData = trendGranularity === 'daily' ? (data.daily_trend ?? []) : (data.monthly_trend ?? []);
  const topEmployees = data.employee_wise ?? [];

  return (
    <div className="space-y-4 mb-6">
      {/* Header and section title */}
      {headerContent}

      {/* 4 Overtime KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <KPICard
          label="Total Overtime Hours"
          value={`${data.total_overtime_hours.toLocaleString()} hrs`}
          subtitle={`${data.overtime_record_count.toLocaleString()} overtime shifts`}
          icon={Clock}
          iconBg="var(--brand-purple-soft)"
          iconColor="#6F3DBA"
        />
        <KPICard
          label="Employees with Overtime"
          value={data.total_employees_with_overtime.toLocaleString()}
          subtitle={`Out of ${data.total_employees.toLocaleString()} total active staff`}
          icon={Users}
          iconBg="var(--brand-blue-soft)"
          iconColor="#4D8EEB"
        />
        <KPICard
          label="Overtime Frequency Rate"
          value={`${data.overtime_rate_pct}%`}
          subtitle="Percentage of attendance records with OT"
          icon={TrendingUp}
          iconBg="var(--emerald-soft)"
          iconColor="#0E9C86"
        />
        <KPICard
          label="Avg OT per OT Employee"
          value={`${data.avg_overtime_hours_per_employee} hrs`}
          subtitle="Total overtime hours / employees with OT"
          icon={UserCheck}
          iconBg="var(--brand-blue-soft)"
          iconColor="#31B7C3"
        />
      </div>

      {/* Row 1 Charts: Shift Overtime & Department Overtime */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Shift-wise Overtime Bar Chart */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[12px] font-bold">Shift-wise Overtime Hours & Frequency</h3>
              <p className="text-[10px] muted">Overtime hours worked by shift roster</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={shiftData}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis
                  dataKey="shift_id"
                  stroke={palette.axisText}
                  fontSize={10}
                  tickFormatter={(v) => SHIFT_NAMES[v] || `Shift ${v}`}
                />
                <YAxis stroke={palette.axisText} fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  labelFormatter={(label) => SHIFT_NAMES[label] || `Shift ${label}`}
                  formatter={(val, name) => [
                    name === 'Overtime Hours' ? `${val.toLocaleString()} hrs` : `${val}%`,
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="overtime_hours" name="Overtime Hours" fill="#6F3DBA" radius={[6, 6, 0, 0]} />
                <Bar dataKey="overtime_rate_pct" name="OT Frequency %" fill="#31B7C3" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Department-wise Overtime Bar Chart */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[12px] font-bold">Department-wise Overtime Hours</h3>
              <p className="text-[10px] muted">Total overtime hours logged across departments</p>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis type="number" stroke={palette.axisText} fontSize={10} />
                <YAxis
                  dataKey="department_name"
                  type="category"
                  stroke={palette.axisText}
                  fontSize={10}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val) => [`${val.toLocaleString()} hrs`, 'Overtime Hours']}
                />
                <Bar dataKey="overtime_hours" name="Overtime Hours" fill="#4D8EEB" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Row 2: Overtime Trend (Daily / Monthly) & Top Overtime Employees */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Trend Chart (7 cols) */}
        <Card className="p-4 lg:col-span-7">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-[12px] font-bold">Overtime Trend Analysis</h3>
              <p className="text-[10px] muted">Daily or monthly aggregate overtime hours</p>
            </div>
            <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setTrendGranularity('daily')}
                className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${
                  trendGranularity === 'daily' ? 'bg-blue-600 text-white' : 'muted hover:text-current'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setTrendGranularity('monthly')}
                className={`px-2 py-1 text-[10px] font-medium rounded-md transition-colors ${
                  trendGranularity === 'monthly' ? 'bg-blue-600 text-white' : 'muted hover:text-current'
                }`}
              >
                Monthly
              </button>
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke={palette.grid} />
                <XAxis
                  dataKey={trendGranularity === 'daily' ? 'date' : 'label'}
                  stroke={palette.axisText}
                  fontSize={10}
                />
                <YAxis stroke={palette.axisText} fontSize={10} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: palette.tooltipBg,
                    borderColor: palette.tooltipBorder,
                    color: palette.tooltipText,
                    fontSize: '11px',
                    borderRadius: '8px',
                  }}
                  formatter={(val, name) => [
                    name === 'Overtime Hours' ? `${val} hrs` : `${val} shifts`,
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Line
                  type="monotone"
                  dataKey="overtime_hours"
                  name="Overtime Hours"
                  stroke="#6F3DBA"
                  strokeWidth={2}
                  dot={trendGranularity === 'monthly'}
                />
                <Line
                  type="monotone"
                  dataKey="overtime_records"
                  name="Overtime Shifts"
                  stroke="#0E9C86"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Top Overtime Employees Table (5 cols) */}
        <Card className="p-4 lg:col-span-5 flex flex-col">
          <h3 className="text-[12px] font-bold mb-1">Top Overtime Contributors</h3>
          <p className="text-[10px] muted mb-3">Highest cumulative overtime hours logged</p>
          <div className="overflow-y-auto max-h-56 flex-1 pr-1">
            <table className="w-full text-left text-[11px]">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  <th className="pb-1.5 font-semibold muted">Employee</th>
                  <th className="pb-1.5 font-semibold muted">Department</th>
                  <th className="pb-1.5 font-semibold muted text-right">OT Hrs</th>
                  <th className="pb-1.5 font-semibold muted text-right">Days</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {topEmployees.slice(0, 8).map((emp) => (
                  <tr key={emp.employee_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-1.5 font-medium truncate max-w-[110px]" title={emp.employee_name}>
                      <div>{emp.employee_name}</div>
                      <div className="text-[9px] muted">{emp.employee_id}</div>
                    </td>
                    <td className="py-1.5 muted truncate max-w-[90px]">{emp.department_name}</td>
                    <td className="py-1.5 text-right font-bold text-purple-600">
                      {emp.overtime_hours}h
                    </td>
                    <td className="py-1.5 text-right muted">{emp.overtime_days}d</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

