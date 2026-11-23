import {
  AlertTriangle,
  Award,
  Bot,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Hourglass,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { Card } from '../common/Card';
import { ExecutionDetailModal } from './ExecutionDetailModal';

const AGENT_KPIS = [
  {
    title: 'Total Agent Runs',
    value: '48',
    trend: '▲ +12% vs prev. period',
    trendGood: true,
    icon: CalendarClock,
    iconBg: 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  },
  {
    title: 'Actions Completed',
    value: '42',
    subtext: '(87.5%)',
    icon: CheckCircle2,
    iconBg: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
  {
    title: 'Pending Approval',
    value: '4',
    subtext: '(8.3%)',
    icon: Hourglass,
    iconBg: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  {
    title: 'Action Escalated',
    value: '2',
    subtext: '(4.2%)',
    icon: AlertTriangle,
    iconBg: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  },
];

const RECENT_EXECUTIONS = [
  {
    id: 'EXE-101',
    time: 'Oct 30, 2026 09:15',
    task: 'Workforce Shortage',
    taskIcon: Users,
    taskColor: 'text-rose-600 dark:text-rose-400',
    details: '5 absences in Assembly (Shift-A). Recommended 5 replacements.',
    status: 'Completed',
    statusBadge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    trigger: 'Daily start-of-shift attendance scan for Line 1 (Assembly).',
    tools: ['detect_workforce_shortages', 'fetch_available_workers', 'score_replacement_candidates'],
    governance: 'HR approved candidate roster at 09:20.',
    action: '5 operators reassigned from Standby Pool. Roster updated in MES.',
  },
  {
    id: 'EXE-102',
    time: 'Oct 29, 2026 14:20',
    task: 'Overtime Optimization',
    taskIcon: Clock,
    taskColor: 'text-amber-600 dark:text-amber-400',
    details: 'Overtime > 15% in Quality. Suggested reallocation of 3 employees.',
    status: 'Approved',
    statusBadge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    trigger: 'Continuous overtime monitoring threshold alert (> 12% departmental cap).',
    tools: ['fetch_overtime_analytics', 'check_labour_compliance', 'generate_allocation_plan'],
    governance: 'Production Head signed off on overtime redistribution.',
    action: '3 Quality inspectors reallocated to Shift S2.',
  },
  {
    id: 'EXE-103',
    time: 'Oct 28, 2026 10:05',
    task: 'Skill Gap Analysis',
    taskIcon: Award,
    taskColor: 'text-blue-600 dark:text-blue-400',
    details: '22 employees below required skill (L3). Recommended training plan.',
    status: 'In Review',
    statusBadge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    trigger: 'Quarterly skill matrix and IPC-A-610 certification audit.',
    tools: ['fetch_skills_analytics', 'detect_competency_gaps', 'recommend_training_modules'],
    governance: 'Training Director reviewing schedule for upcoming plant shutdown.',
    action: 'Pending final date confirmation with technical institute.',
  },
  {
    id: 'EXE-104',
    time: 'Oct 27, 2026 16:40',
    task: 'Attrition Risk Analysis',
    taskIcon: UserMinus,
    taskColor: 'text-purple-600 dark:text-purple-400',
    details: 'High exit risk in Production (5 employees). Suggested retention actions.',
    status: 'Completed',
    statusBadge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    trigger: 'Monthly predictive retention telemetry scan.',
    tools: ['fetch_attrition_analytics', 'evaluate_tenure_risk', 'suggest_retention_interventions'],
    governance: 'HR Plant Partner notified with personalized employee retention briefs.',
    action: 'Retention 1-on-1 meetings scheduled for week 44.',
  },
  {
    id: 'EXE-105',
    time: 'Oct 26, 2026 11:30',
    task: 'Absenteeism Monitoring',
    taskIcon: Calendar,
    taskColor: 'text-indigo-600 dark:text-indigo-400',
    details: 'Absenteeism 3.35% (↑0.4%). No immediate action required.',
    status: 'Completed',
    statusBadge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    trigger: 'Scheduled morning shift absenteeism telemetry assessment.',
    tools: ['fetch_attendance_analytics', 'calculate_plant_impact', 'evaluate_shift_readiness'],
    governance: 'Standard automated checkpoint; within allowable plant variance (5%).',
    action: 'Logged to executive metrics database. No intervention triggered.',
  },
];

export function AgentExecutionOperationsCard() {
  const [selectedExecution, setSelectedExecution] = useState(null);

  return (
    <Card className="p-3.5 lg:col-span-6 flex flex-col justify-between min-h-[360px] border border-[var(--border)] shadow-xs select-none">
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 mb-2.5">
          <div className="w-6 h-6 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
            <Bot className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-[13px] sm:text-sm font-extrabold text-[var(--text)] tracking-tight whitespace-nowrap">
            Workforce Agent Execution & Operations
          </h2>
        </div>

        {/* 4 KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {AGENT_KPIS.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div
                key={idx}
                className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-between shadow-2xs"
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-bold text-[var(--secondary)] truncate">
                    {kpi.title}
                  </span>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 ${kpi.iconBg}`}
                  >
                    <Icon className="w-3 h-3" />
                  </div>
                </div>

                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-black text-[var(--text)] tracking-tight">
                    {kpi.value}
                  </span>
                  {kpi.subtext && (
                    <span className="text-[10px] font-bold text-[var(--secondary)]">
                      {kpi.subtext}
                    </span>
                  )}
                </div>

                {kpi.trend && (
                  <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {kpi.trend}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Recent Executions Table */}
        <div>
          <div className="text-[11px] font-extrabold text-[var(--text)] mb-1.5 flex items-center justify-between">
            <span>Recent Agent Executions</span>
            <span className="text-[9.5px] font-medium text-[var(--secondary)]">
              Click row to inspect workflow
            </span>
          </div>

          <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--surface)]">
            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-hover)] text-[10px] font-extrabold text-[var(--secondary)] uppercase tracking-wider">
                    <th className="py-1.5 px-2.5 whitespace-nowrap">Run Time</th>
                    <th className="py-1.5 px-2.5 whitespace-nowrap">Agent Task</th>
                    <th className="py-1.5 px-2.5">Details / Recommendation</th>
                    <th className="py-1.5 px-2.5 text-right whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {RECENT_EXECUTIONS.map((item) => {
                    const TaskIcon = item.taskIcon;
                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedExecution(item)}
                        className="hover:bg-[var(--surface-hover)] transition-colors cursor-pointer group"
                      >
                        <td className="py-2 px-2.5 font-medium text-[var(--secondary)] whitespace-nowrap text-[10.5px]">
                          {item.time}
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-bold text-[var(--text)] text-[11px]">
                            <TaskIcon className={`w-3.5 h-3.5 ${item.taskColor} shrink-0`} />
                            <span>{item.task}</span>
                          </div>
                        </td>
                        <td className="py-2 px-2.5 text-[var(--text)] text-[10.5px] max-w-[240px] truncate" title={item.details}>
                          {item.details}
                        </td>
                        <td className="py-2 px-2.5 text-right whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9.5px] font-bold border ${item.statusBadge}`}
                          >
                            {item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Selected Execution Details Modal */}
      {selectedExecution && (
        <ExecutionDetailModal
          execution={selectedExecution}
          onClose={() => setSelectedExecution(null)}
        />
      )}
    </Card>
  );
}

