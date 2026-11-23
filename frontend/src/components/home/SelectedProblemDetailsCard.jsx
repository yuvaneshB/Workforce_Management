import {
  AlertCircle,
  AlertTriangle,
  Award,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  Database,
  Flame,
  Layers,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Card } from '../common/Card';

export const PROBLEM_DETAILS = {
  shortages: {
    id: 'shortages',
    num: '01',
    category: 'WORKFORCE SHORTAGES',
    title: 'Workforce Shortages & Shift Understaffing',
    subtitle: 'Assembly & Machining Line Deficits – Uncovered Demands in NS3 Shift',
    severityBadge: 'CRITICAL RISK • SOLVED BY WORKFORCE PLANNING AGENT',
    severityColor: 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    icon: Clock,
    challenges: [
      {
        title: 'Sluggish Shift Shortage Detection',
        description: 'Manual supervisor headcount rollcalls take 1–2 hours after shift gate entry, severely delaying standby operator dispatch.',
      },
      {
        title: 'Assembly Line Starvation',
        description: 'Uncovered takt positions halt conveyor progression, idling up to 10 downstream operators and compounding station backlog.',
      },
      {
        title: 'Unvetted Standby Substitution',
        description: 'Slotting replacement workers without verified L2+ qualification grades increases assembly rework rates by up to 14%.',
      },
      {
        title: 'Contractor Vendor Replenishment Lag',
        description: 'Third-party staffing agencies take 24–48 hours to supply replacement heads during sudden peak production spikes.',
      },
      {
        title: 'Statutory Overtime Compounding',
        description: 'Masking persistent vacancy gaps by mandating double shifts breaches statutory 50 hr/month factory labor caps.',
      },
    ],
    agent: {
      name: 'Workforce Planning Agent',
      service: 'workforce_planning_agent_service.py',
      endpoint: '/api/v1/agent/stream-analysis',
      role: 'Audits required vs active headcount, flags 10-person team deficits, and identifies immediate standby replacements.',
    },
  },
  absenteeism: {
    id: 'absenteeism',
    num: '02',
    category: 'ABSENTEEISM SPIKES',
    title: 'Absenteeism Spikes & Unscheduled Line Disruptions',
    subtitle: 'Peak Post-Weekend Absence Surges – 16.2% Absent & Late Arrivals',
    severityBadge: 'HIGH VARIANCE • SOLVED BY ATTENDANCE AGENT',
    severityColor: 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    icon: AlertTriangle,
    challenges: [
      {
        title: 'Monday Morning (GS1) Drop-offs',
        description: 'Absenteeism surges to 16.2% on morning shifts following weekend rotations, disrupting initial line ramp-up targets.',
      },
      {
        title: 'Station Pairing Fragmentation',
        description: 'Missing technicians break critical dual-operator assembly stations, cutting takt line velocity by nearly a third.',
      },
      {
        title: 'Unplanned Cross-Coverage Errors',
        description: 'Emergency reassignment of uncertified operators into packaging creates downstream bottleneck jams and quality holds.',
      },
      {
        title: 'Vendor Attendance Disparities',
        description: 'High variance in contractor agency punctuality causes unpredictable shift opening headcounts across Plant 1 & 2.',
      },
      {
        title: 'Chronic Absenteeism Blindspots',
        description: 'Absence of biometric streak tracking leaves chronic repeat attendance offenders unaddressed prior to shift release.',
      },
    ],
    agent: {
      name: 'Attendance Agent',
      service: 'attendance_agent_service.py',
      endpoint: '/api/v1/agent/stream-analysis',
      role: 'Scans 177,665 biometric punches in real time; audits chronic absenteeism streaks and shift arrival correlations.',
    },
  },
  attrition: {
    id: 'attrition',
    num: '03',
    category: 'ATTRITION RISKS',
    title: 'Attrition Risks & Contractor Turnover Velocity',
    subtitle: 'Elevated Leaver Velocity – 61.7% of Plant Exits in Contractor Workforce',
    severityBadge: 'MODERATE RISK • SOLVED BY ATTRITION AGENT',
    severityColor: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    icon: Flame,
    challenges: [
      {
        title: 'High Contractor Exit Churn',
        description: '61.7% of total factory exits (74 out of 120 leavers) originate within temporary contractor agency workforce.',
      },
      {
        title: 'First 90-Day Resignation Cliff',
        description: 'Turnover concentrates heavily within initial 3-month probation due to steep manufacturing shopfloor learning curves.',
      },
      {
        title: 'Critical CNC Knowledge Drain',
        description: 'Senior technician departures in precision machining leave automated CNC cells without certified operator mentors.',
      },
      {
        title: 'Salary Disparity Flight Risks',
        description: 'Wage competition within the automotive manufacturing corridor drives 15.0% of logged voluntary resignations.',
      },
      {
        title: 'Contract Expiration Bottlenecks',
        description: 'Unsynchronized vendor contract completions create temporary multi-week staffing voids in high-volume shifts.',
      },
    ],
    agent: {
      name: 'Attrition Agent',
      service: 'attrition_agent_service.py',
      endpoint: '/api/v1/agent/stream-analysis',
      role: 'Evaluates 120 exit transactions by tenure bracket and vendor agency; identifies leading turnover root causes.',
    },
  },
  overtime: {
    id: 'overtime',
    num: '04',
    category: 'OVERTIME IMBALANCE',
    title: 'Overtime Imbalance & Chronic Operator Fatigue',
    subtitle: '58k OT Hours Concentrated in Top 15% – $1.46M Premium Spend',
    severityBadge: 'FATIGUE WARNING • SOLVED BY OVERTIME AGENT',
    severityColor: 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    icon: Layers,
    challenges: [
      {
        title: 'Acute Overtime Concentration',
        description: 'Top 15% of operators absorb 48% of total 58,433 overtime hours, causing chronic operator exhaustion and fatigue.',
      },
      {
        title: 'Statutory 50hr/mo Limit Breach',
        description: 'Repeat overtime operators frequently approach statutory 50 hr/month labor caps, incurring compliance audit penalties.',
      },
      {
        title: 'Late-Shift Scrap & Defect Spikes',
        description: 'Manufacturing telemetry demonstrates higher unit defect and rework rates during overtime hours exceeding standard shifts.',
      },
      {
        title: 'Escalating Overtime Premium Spend',
        description: 'Running premium 2.0x overtime rates incurs $1.46M annual cost that could be mitigated via cost-neutral shift equalization.',
      },
      {
        title: 'Weekend Standby Buffer Deficit',
        description: 'Absence of designated standby pools forces emergency weekend overtime call-ins at maximum hourly rates.',
      },
    ],
    agent: {
      name: 'Overtime Optimization Agent',
      service: 'overtime_agent_service.py',
      endpoint: '/api/v1/agent/stream-analysis',
      role: 'Monitors 58,433 overtime hours across 6 departments; models shift equalization to eliminate excess contractor premiums.',
    },
  },
  skills: {
    id: 'skills',
    num: '05',
    category: 'SKILL MISMATCHES',
    title: 'Skill Mismatches & Station Qualification Gaps',
    subtitle: '18 Critical Station Gaps – 89 Expired IPC & ESD Certifications',
    severityBadge: 'COMPLIANCE FOCUS • SOLVED BY SKILL AGENT',
    severityColor: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    icon: Shield,
    challenges: [
      {
        title: 'L1/L2 Operator Station Slotting',
        description: 'Critical high-complexity workstations in Assembly are staffed by entry-level operators lacking senior L3/L4 competencies.',
      },
      {
        title: 'Expired IPC & ESD Certifications',
        description: '89 core certifications are expired (led by IPC-A-610 inspection), creating serious quality vulnerabilities during OEM audits.',
      },
      {
        title: 'Single-Operator Dependency Hotspots',
        description: 'Specialized solder paste and wire bonding lines rely on only 1 certified technician per shift, creating line stoppage risks.',
      },
      {
        title: 'Training Remediation Retest Delays',
        description: '92 failed assessment candidates currently await structured re-testing and formal qualification re-certification.',
      },
      {
        title: 'ISO/QMS Compliance Vulnerabilities',
        description: 'Assigning operators to precision workstations without valid qualification logs violates factory standard operating procedures.',
      },
    ],
    agent: {
      name: 'Skill & Training Agent',
      service: 'skill_agent_service.py',
      endpoint: '/api/v1/agent/stream-analysis',
      role: 'Audits 2,927 skill mappings and 9,600 training events; matches certified L3/L4 standby operators to critical station quotas.',
    },
  },
};

export function SelectedProblemDetailsCard({ selectedProblem = 'shortages' }) {
  const problem = PROBLEM_DETAILS[selectedProblem] || PROBLEM_DETAILS.shortages;
  const agent = problem.agent;
  const Icon = problem.icon;

  return (
    <Card className="p-3.5 sm:p-4 flex flex-col justify-between h-[420px] border border-[var(--border)] shadow-xs select-none">
      {/* Top Header Row */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-[13px] font-extrabold text-[var(--text)] tracking-tight truncate">
                {problem.num}. {problem.title}
              </h2>
              <p className="text-[9.5px] text-[var(--secondary)] truncate font-medium">
                {problem.subtitle}
              </p>
            </div>
          </div>

          <span
            className={`text-[8.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${problem.severityColor}`}
          >
            {problem.severityBadge}
          </span>
        </div>

        {/* Problem Statements Subheader */}
        <div className="flex items-center justify-between my-2 px-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
            PROBLEM STATEMENTS:
          </span>
          <span className="text-[9px] font-bold text-[var(--secondary)] bg-[var(--surface-hover)] px-2 py-0.5 rounded-full border border-[var(--border)]">
            5 Failure Points
          </span>
        </div>

        {/* 5 Numbered Operational Challenges */}
        <div className="space-y-1.5">
          {problem.challenges.map((ch, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2 p-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-hover)]/30 transition-colors"
            >
              {/* Circular Number Badge */}
              <div className="w-4 h-4 rounded-full bg-rose-600 text-white text-[9px] font-black flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                {idx + 1}
              </div>

              {/* Text Description */}
              <div className="text-[10px] leading-tight min-w-0">
                <span className="font-extrabold text-[var(--text)] mr-1">
                  {ch.title}:
                </span>
                <span className="text-[var(--secondary)] font-normal">
                  {ch.description}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Strip: Responsible Agent */}
      <div className="pt-2 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[9px]">
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-extrabold text-[var(--text)] flex items-center gap-1">
            <Bot className="w-3 h-3 text-[#5932EA]" />
            Responsible Agent:
          </span>
          <span className="font-bold text-[#5932EA] dark:text-purple-400 truncate">
            {agent.name}
          </span>
          <span className="font-mono text-[8.5px] text-[var(--secondary)] hidden md:inline">
            ({agent.service})
          </span>
        </div>

        <span className="font-mono text-[8px] text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
          Neon PostgreSQL Verified
        </span>
      </div>
    </Card>
  );
}

export default SelectedProblemDetailsCard;
