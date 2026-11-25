import {
  BarChart3,
  Calendar,
  Clock,
  PieChart as PieIcon,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useTheme } from '../../hooks/useTheme';
import { CHART_COLORS } from '../../utils/constants';
import { Card } from '../common/Card';

// Real Data for Attrition View (matches reference image)
const ATTRITION_RATE = 2.87;
const ATTRITION_TREND_MONTHLY = [
  { period: 'Aug 2026', rate: 2.65 },
  { period: 'Sep 2026', rate: 3.14 },
  { period: 'Oct 2026', rate: 2.87 },
];
const ATTRITION_TREND_DAILY = [
  { period: 'Oct 28', rate: 2.7 },
  { period: 'Oct 29', rate: 2.9 },
  { period: 'Oct 30', rate: 2.85 },
  { period: 'Oct 31', rate: 2.87 },
];
const ATTRITION_TREND_YEARLY = [
  { period: '2024', rate: 3.4 },
  { period: '2025', rate: 3.1 },
  { period: '2026', rate: 2.87 },
];

const ATTRITION_REASONS_HOME = [
  { reason: 'Better Opportunity', pct: 34.32, color: '#493287' },
  { reason: 'Higher Salary', pct: 22.74, color: '#4A578F' },
  { reason: 'Personal Reasons', pct: 14.32, color: '#A78BFA' },
  { reason: 'Work-Life Balance', pct: 11.79, color: '#96A1C7' },
  { reason: 'Career Growth', pct: 9.89, color: '#DDD6FE' },
  { reason: 'Other', pct: 6.94, color: '#EDE9FE' },
];

const ATTRITION_BY_VENDOR_HOME = [
  { vendor: 'PP', rate: 2.45, label: '(2.45%)' },
  { vendor: 'CDC', rate: 3.18, label: '(3.18%)' },
  { vendor: 'V1', rate: 2.92, label: '(2.92%)' },
  { vendor: 'V2', rate: 2.67, label: '(2.67%)' },
];

// Real Data for Absenteeism View
const ABSENTEEISM_RATE = 3.35;
const ABSENTEEISM_TREND_MONTHLY = [
  { period: 'Aug 2026', rate: 3.21 },
  { period: 'Sep 2026', rate: 3.48 },
  { period: 'Oct 2026', rate: 3.35 },
];
const ABSENTEEISM_DEPT = [
  { department: 'Production', pct: 4.62, color: '#EF4444' },
  { department: 'Maintenance', pct: 3.98, color: '#3B82F6' },
  { department: 'Warehouse', pct: 3.21, color: '#3B82F6' },
  { department: 'Quality', pct: 2.94, color: '#3B82F6' },
  { department: 'Operations', pct: 2.61, color: '#3B82F6' },
  { department: 'Admin', pct: 1.89, color: '#3B82F6' },
];
const ABSENTEEISM_SHIFT = [
  { shift: 'GS1 (Morning)', rate: 3.6, label: '(3.6%)' },
  { shift: 'S2 (Evening)', rate: 3.4, label: '(3.4%)' },
  { shift: 'NS3 (Night)', rate: 3.7, label: '(3.7%)' },
];

export function WorkforceMetricsCard() {
  const { theme } = useTheme();
  const palette = CHART_COLORS[theme] || CHART_COLORS.light;

  const [activeMetricTab, setActiveMetricTab] = useState('attrition'); // 'absenteeism' | 'attrition'
  const [timeUnit, setTimeUnit] = useState('Month'); // 'Day' | 'Month' | 'Year'

  const attritionTrend =
    timeUnit === 'Day'
      ? ATTRITION_TREND_DAILY
      : timeUnit === 'Year'
        ? ATTRITION_TREND_YEARLY
        : ATTRITION_TREND_MONTHLY;

  const absenteeismTrend =
    timeUnit === 'Day'
      ? [
          { period: 'Oct 28', rate: 3.3 },
          { period: 'Oct 29', rate: 3.4 },
          { period: 'Oct 30', rate: 3.3 },
          { period: 'Oct 31', rate: 3.35 },
        ]
      : timeUnit === 'Year'
        ? [
            { period: '2024', rate: 3.9 },
            { period: '2025', rate: 3.6 },
            { period: '2026', rate: 3.35 },
          ]
        : ABSENTEEISM_TREND_MONTHLY;

  return (
    <Card className="p-4 lg:col-span-7 flex flex-col justify-between min-h-[300px] border border-[var(--border)] shadow-xs">
      <div>
        {/* Header & Toggle Controls */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <BarChart3 className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
            <h2 className="text-[13px] sm:text-sm font-bold text-[var(--text)] whitespace-nowrap">
              Workforce Metrics
            </h2>
          </div>

          {/* Metric View Toggle (Absenteeism vs Attrition) */}
          <div className="flex items-center gap-1 bg-[var(--surface-hover)] p-0.5 rounded-lg border border-[var(--border)]">
            <button
              onClick={() => setActiveMetricTab('absenteeism')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                activeMetricTab === 'absenteeism'
                  ? 'bg-[#493287] text-white shadow-xs'
                  : 'text-[var(--secondary)] hover:text-[var(--text)]'
              }`}
            >
              Absenteeism
            </button>
            <button
              onClick={() => setActiveMetricTab('attrition')}
              className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                activeMetricTab === 'attrition'
                  ? 'bg-[#493287] text-white shadow-xs'
                  : 'text-[var(--secondary)] hover:text-[var(--text)]'
              }`}
            >
              Attrition
            </button>
          </div>
        </div>

        {/* 2x2 Grid of Sub-Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Sub-Card 1: Overall Rate Gauge */}
          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-[var(--text)] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>
                  {activeMetricTab === 'attrition' ? 'Overall Attrition Rate' : 'Overall Absenteeism Rate'}
                </span>
              </div>
              <div className="text-2xl font-black text-[var(--text)] tracking-tight mt-1">
                {activeMetricTab === 'attrition' ? `${ATTRITION_RATE}%` : `${ABSENTEEISM_RATE}%`}
              </div>
              <div className="text-[10px] text-[var(--secondary)] font-medium mt-0.5">
                {activeMetricTab === 'attrition' ? '120 exits of 1,700 employees' : '177,043 attendance records'}
              </div>
            </div>

            {/* Circular Gauge */}
            <div className="relative w-16 h-16 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      {
                        value: activeMetricTab === 'attrition' ? ATTRITION_RATE : ABSENTEEISM_RATE,
                        fill: '#493287',
                      },
                      {
                        value: 100 - (activeMetricTab === 'attrition' ? ATTRITION_RATE : ABSENTEEISM_RATE),
                        fill: palette.grid || 'rgba(0,0,0,0.06)',
                      },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={22}
                    outerRadius={30}
                    startAngle={90}
                    endAngle={-270}
                    dataKey="value"
                    stroke="none"
                  />
                </PieChart>
              </ResponsiveContainer>
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-[var(--text)] pointer-events-none">
                {activeMetricTab === 'attrition' ? `${ATTRITION_RATE}%` : `${ABSENTEEISM_RATE}%`}
              </span>
            </div>
          </div>

          {/* Sub-Card 2: Trend Line Chart */}
          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between">
            <div className="flex items-center justify-between gap-1 mb-1">
              <div className="text-[11px] font-bold text-[var(--text)] flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                <span>{activeMetricTab === 'attrition' ? 'Attrition Trend' : 'Absenteeism Trend'}</span>
              </div>

              {/* Day / Month / Year Pills */}
              <div className="flex items-center gap-0.5 bg-[var(--surface-hover)] p-0.5 rounded border border-[var(--border)] text-[9px] font-semibold">
                {['Day', 'Month', 'Year'].map((unit) => (
                  <button
                    key={unit}
                    onClick={() => setTimeUnit(unit)}
                    className={`px-1.5 py-0.5 rounded cursor-pointer ${
                      timeUnit === unit
                        ? 'bg-[#493287] text-white font-bold'
                        : 'text-[var(--secondary)] hover:text-[var(--text)]'
                    }`}
                  >
                    {unit}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-16 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={activeMetricTab === 'attrition' ? attritionTrend : absenteeismTrend}
                  margin={{ top: 12, right: 15, left: -25, bottom: -5 }}
                >
                  <CartesianGrid strokeDasharray="2 2" vertical={false} stroke={palette.grid} />
                  <XAxis
                    dataKey="period"
                    tick={{ fill: palette.text, fontSize: 8.5 }}
                    tickLine={false}
                    axisLine={{ stroke: palette.grid }}
                  />
                  <YAxis
                    domain={[0, 6]}
                    ticks={[0, 2, 4, 6]}
                    tick={{ fill: palette.text, fontSize: 8 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: palette.tooltipBg,
                      borderColor: palette.tooltipBorder,
                      color: palette.tooltipText,
                      fontSize: '10px',
                      borderRadius: '6px',
                    }}
                    formatter={(val) => [`${val}%`, 'Rate']}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="#493287"
                    strokeWidth={2}
                    dot={{ r: 3, fill: '#493287' }}
                  >
                    <LabelList
                      dataKey="rate"
                      position="top"
                      formatter={(v) => `${v}%`}
                      style={{ fontSize: '8.5px', fontWeight: 700, fill: 'var(--text)' }}
                    />
                  </Line>
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sub-Card 3: Reasons or Department Distribution */}
          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="text-[11px] font-bold text-[var(--text)] flex items-center gap-1.5 mb-1.5">
              <PieIcon className="w-3.5 h-3.5 text-purple-600" />
              <span>
                {activeMetricTab === 'attrition' ? 'Attrition Reasons' : 'Absenteeism by Department'}
              </span>
            </div>

            {activeMetricTab === 'attrition' ? (
              <div className="space-y-1">
                {ATTRITION_REASONS_HOME.map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-[9.5px]">
                    <span className="font-medium text-[var(--secondary)] truncate w-32">
                      {r.reason}
                    </span>
                    <div className="flex items-center gap-2 flex-1 max-w-[120px] ml-2">
                      <div className="w-full h-1.5 rounded-full bg-[var(--muted-fill)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(r.pct / 35) * 100}%`,
                            backgroundColor: r.color,
                          }}
                        />
                      </div>
                      <span className="font-extrabold text-[var(--text)] shrink-0 w-10 text-right">
                        {r.pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-1">
                {ABSENTEEISM_DEPT.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-[9.5px]">
                    <span className="font-medium text-[var(--secondary)] truncate w-28">
                      {d.department}
                    </span>
                    <div className="flex items-center gap-2 flex-1 max-w-[120px] ml-2">
                      <div className="w-full h-1.5 rounded-full bg-[var(--muted-fill)] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(d.pct / 5) * 100}%`,
                            backgroundColor: d.color,
                          }}
                        />
                      </div>
                      <span className="font-extrabold text-[var(--text)] shrink-0 w-10 text-right">
                        {d.pct.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sub-Card 4: By Vendor or By Shift */}
          <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between">
            <div className="text-[11px] font-bold text-[var(--text)] flex items-center gap-1.5 mb-1">
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>
                {activeMetricTab === 'attrition' ? 'Attrition by Vendor' : 'Absenteeism by Shift'}
              </span>
            </div>

            <div className="h-28 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={activeMetricTab === 'attrition' ? ATTRITION_BY_VENDOR_HOME : ABSENTEEISM_SHIFT}
                  margin={{ top: 12, right: 10, left: -25, bottom: 0 }}
                  barSize={24}
                >
                  <CartesianGrid strokeDasharray="2 2" vertical={false} stroke={palette.grid} />
                  <XAxis
                    dataKey={activeMetricTab === 'attrition' ? 'vendor' : 'shift'}
                    tick={{ fill: palette.text, fontSize: 8.5, fontWeight: 700 }}
                    axisLine={{ stroke: palette.grid }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 6]}
                    ticks={[0, 1, 2, 3, 4, 5, 6]}
                    tick={{ fill: palette.text, fontSize: 8 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: palette.tooltipBg,
                      borderColor: palette.tooltipBorder,
                      color: palette.tooltipText,
                      fontSize: '10px',
                      borderRadius: '6px',
                    }}
                    formatter={(val) => [`${val}%`, 'Rate']}
                  />
                  <Bar
                    dataKey="rate"
                    fill={activeMetricTab === 'attrition' ? '#3B82F6' : '#1F2F59'}
                    radius={[3, 3, 0, 0]}
                  >
                    <LabelList
                      dataKey="rate"
                      position="top"
                      formatter={(v) => `${v}%`}
                      style={{ fontSize: '8px', fontWeight: 700, fill: 'var(--text)' }}
                    />
                    {(activeMetricTab === 'attrition'
                      ? ATTRITION_BY_VENDOR_HOME
                      : ABSENTEEISM_SHIFT
                    ).map((_, idx) => (
                      <Cell
                        key={`cell-${idx}`}
                        fill={
                          idx === 1
                            ? '#493287'
                            : idx === 0
                              ? '#3B82F6'
                              : idx === 2
                                ? '#2563EB'
                                : '#60A5FA'
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--secondary)]">
        <span>Dual Perspective Operational Analytics</span>
        <span className="font-bold text-purple-600">
          {activeMetricTab === 'attrition' ? 'Annualized Workforce Exits' : 'Daily Shift Absenteeism'}
        </span>
      </div>
    </Card>
  );
}

