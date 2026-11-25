import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Flame,
  HelpCircle,
  Layers,
  MessageSquare,
  Shield,
  Sparkles,
} from 'lucide-react';
import { Card } from '../common/Card';

export const PROBLEM_DETAILS = {
  shortages: {
    id: 'shortages',
    num: '01',
    title: 'Workforce Shortages',
    agentName: 'Workforce Planning Agent',
    serviceFile: 'workforce_planning_agent_service.py',
    icon: Clock,
    themeColor: 'rose',
    badgeClass: 'border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300',
    problemText:
      'Shift-level workforce shortages occur when available headcount falls below operational requirements across plants, departments, or shifts, leading to understaffed lines and operational delays.',
    whatAgentDoes: [
      'Compares required vs available workforce by plant, department, and shift',
      'Detects shortages and flags understaffed manufacturing sections',
      'Suggests skill-compatible replacement employees from the available workforce',
    ],
    exampleQuestion: 'Are there any workforce shortages in Plant 1 Shift A today?',
  },
  absenteeism: {
    id: 'absenteeism',
    num: '02',
    title: 'Absenteeism Spikes',
    agentName: 'Attendance Agent',
    serviceFile: 'attendance_agent_service.py',
    icon: AlertTriangle,
    themeColor: 'amber',
    badgeClass: 'border-amber-300 text-amber-800 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300',
    problemText:
      'Unplanned absenteeism and late arrivals disrupt scheduled line operations and reduce shift productivity across manufacturing sections.',
    whatAgentDoes: [
      'Tracks absenteeism rates and late arrivals across rotational shifts',
      'Finds department, shift, and plant absence hotspots',
      'Flags chronic absentees and consecutive absence streaks',
    ],
    exampleQuestion: 'Which department has the highest absenteeism rate this month?',
  },
  attrition: {
    id: 'attrition',
    num: '03',
    title: 'Attrition Risks',
    agentName: 'Attrition Agent',
    serviceFile: 'attrition_agent_service.py',
    icon: Flame,
    themeColor: 'purple',
    badgeClass: 'border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/60 dark:text-purple-300',
    problemText:
      'Employee turnover and contract resignations create vacancy gaps that impact plant stability and require proactive retention strategies.',
    whatAgentDoes: [
      'Shows overall attrition rates and departures by department',
      'Evaluates employee tenure patterns and recorded leaving reasons',
      'Suggests targeted retention actions for high-turnover areas',
    ],
    exampleQuestion: 'What are the primary reasons for employee attrition in the Production department?',
  },
  overtime: {
    id: 'overtime',
    num: '04',
    title: 'Overtime Imbalance',
    agentName: 'Overtime Agent',
    serviceFile: 'overtime_agent_service.py',
    icon: Layers,
    themeColor: 'sky',
    badgeClass: 'border-sky-300 text-sky-700 bg-sky-50 dark:bg-sky-950/60 dark:text-sky-300',
    problemText:
      'Overtime hours and premium expenses concentrate unevenly among a small group of repeat employees, increasing fatigue risks and labor costs.',
    whatAgentDoes: [
      'Measures overtime hours, overtime rates, and associated spend',
      'Finds department and shift overtime concentration',
      'Detects repeat overtime employees and suggests cost reduction',
    ],
    exampleQuestion: 'What is our total overtime spend and which shift logged the most OT hours?',
  },
  skills: {
    id: 'skills',
    num: '05',
    title: 'Skill Mismatches',
    agentName: 'Skills & Training Agent',
    serviceFile: 'skill_agent_service.py',
    icon: Shield,
    themeColor: 'emerald',
    badgeClass: 'border-emerald-300 text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300',
    problemText:
      'Mismatches between required station qualifications and employee competency levels create operational bottlenecks and compliance exposure.',
    whatAgentDoes: [
      'Analyses L1–L4 skill levels and multi-skilling coverage across workstations',
      'Identifies critical station skill gaps across plant departments',
      'Evaluates training completion rates and tracks certification validity',
    ],
    exampleQuestion: 'How many operators hold L3 or L4 certifications in Assembly?',
  },
};

export function SelectedProblemDetailsCard({ selectedProblem = 'shortages' }) {
  const problem = PROBLEM_DETAILS[selectedProblem] || PROBLEM_DETAILS.shortages;
  const Icon = problem.icon;

  return (
    <Card className="p-3.5 sm:p-4 flex flex-col justify-between border border-[var(--border)] shadow-xs select-none">
      <div>
        {/* Top Header Row with Solving Agent's Name */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs sm:text-[13px] font-extrabold text-[var(--text)] tracking-tight break-words">
                  {problem.num}. {problem.title}
                </h3>
              </div>
              <p className="text-[10px] text-[var(--brand-purple)] font-bold tracking-tight">
                Solved by {problem.agentName}
              </p>
            </div>
          </div>

          <span
            className={`text-[8.5px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md border shrink-0 ${problem.badgeClass}`}
          >
            {problem.agentName}
          </span>
        </div>

        {/* Section 1: Problem */}
        <div className="my-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-[var(--secondary)] mb-1 flex items-center gap-1">
            <Icon className="w-3 h-3 text-[var(--secondary)]" />
            Problem
          </div>
          <p className="text-[11px] sm:text-[11.5px] text-[var(--text)] leading-relaxed bg-[var(--surface-hover)]/40 p-2.5 rounded-xl border border-[var(--border)] break-words">
            {problem.problemText}
          </p>
        </div>

        {/* Section 2: What the agent does */}
        <div className="my-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-[var(--secondary)] mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[var(--brand-purple)]" />
            What the Agent Does
          </div>
          <div className="space-y-1.5">
            {problem.whatAgentDoes.map((bullet, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]/30 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span className="text-[11px] text-[var(--text)] leading-tight break-words">
                  {bullet}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Ask the assistant */}
        <div className="my-2.5 p-2.5 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40">
          <div className="text-[9.5px] font-black uppercase tracking-wider text-[#493287] dark:text-purple-400 flex items-center gap-1 mb-1">
            <MessageSquare className="w-3 h-3" />
            Ask the Assistant
          </div>
          <div className="text-[11px] font-medium text-[var(--text)] italic break-words flex items-center gap-1.5">
            <span>&ldquo;{problem.exampleQuestion}&rdquo;</span>
          </div>
        </div>
      </div>

      {/* Footer Strip */}
      <div className="pt-2 border-t border-[var(--border)] mt-2 flex flex-wrap items-center justify-between gap-1 text-[9px] text-[var(--secondary)]">
        <span className="flex items-center gap-1.5 font-medium">
          <Bot className="w-3 h-3 text-[#493287]" />
          Autonomous Specialist Agent: <strong className="text-[var(--text)]">{problem.agentName}</strong>
        </span>
        <span className="font-mono text-[8px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
          Grounded
        </span>
      </div>
    </Card>
  );
}

export default SelectedProblemDetailsCard;
