import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Clock,
  Database,
  Flame,
  Layers,
  Shield,
  UserCheck,
} from 'lucide-react';
import React, { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../common/Card';
import {
  CostContainment3DIcon,
  DomoAi3DIcon,
  Erp3DIcon,
  FastApi3DIcon,
  HumanApproval3DIcon,
  Mes3DIcon,
  NeonDb3DIcon,
  Orchestrator3DIcon,
  ShortageMitigation3DIcon,
  Skills3DIcon,
  SpecialistAgents3DIcon,
  SqlAlchemy3DIcon,
  Sse3DIcon,
} from './PipelineIcons';

export const DETAILS_DATA = {
  // 1. SOURCE SYSTEM
  'erp': {
    id: 'erp',
    type: 'stage',
    title: 'ERP & Master Entities',
    tag: 'STAGE 1 · SOURCE SYSTEM',
    stageColor: 'rose',
    icon: Erp3DIcon,
    col1Title: 'Overview',
    col1Text:
      'Master data of the whole organization: 1,700 employees across 2 manufacturing plants (IN-TN-01, IN-KA-01), 6 operational departments, and 6 staffing vendors. Fully synchronized into Neon PostgreSQL tables.',
    col2Title: 'Key points',
    points: [
      'Employee master with 1,700 records',
      '2 plants (IN-TN-01 and IN-KA-01)',
      'Departments, sections, and vendors mapped to employees',
    ],
  },
  'mes': {
    id: 'mes',
    type: 'stage',
    title: 'MES & Shopfloor Logs',
    tag: 'STAGE 1 · SOURCE SYSTEM',
    stageColor: 'rose',
    icon: Mes3DIcon,
    col1Title: 'Overview',
    col1Text:
      'Daily operational records behind attendance, overtime, and production analysis. Captures shift logs, gate swipes, line output quantities, and rotational shift rosters across manufacturing sections.',
    col2Title: 'Key points',
    points: [
      'Attendance transactions (about 177k records)',
      'Overtime and production transactions',
      'Shift roster records',
    ],
  },
  'skills_roster': {
    id: 'skills_roster',
    type: 'stage',
    title: 'Skills, Roster & Exits',
    tag: 'STAGE 1 · SOURCE SYSTEM',
    stageColor: 'rose',
    icon: Skills3DIcon,
    col1Title: 'Overview',
    col1Text:
      'Records that describe capability and movement of people. Tracks workforce qualifications, structured operator skill assessments, regulatory training completions, and historical employee departure records.',
    col2Title: 'Key points',
    points: [
      'Skill mapping (about 2,927 records)',
      'Training records (about 9.6k)',
      'Exit records (120)',
    ],
  },
  'neon_db': {
    id: 'neon_db',
    type: 'stage',
    title: 'Neon PostgreSQL Database',
    tag: 'STAGE 1 · SOURCE SYSTEM',
    stageColor: 'rose',
    icon: NeonDb3DIcon,
    col1Title: 'Overview',
    col1Text:
      'All 18 tables live in Neon PostgreSQL and are read through SQLAlchemy. Functions as the authoritative single source of truth across plants with isolated pooling for analytical performance.',
    col2Title: 'Key points',
    points: [
      '18 tables as the single source of truth',
      'Read-only pool for dashboards, analytics, and agents',
      'Writes only through the controlled employee import',
    ],
  },

  // 2. API GATEWAY
  'fastapi': {
    id: 'fastapi',
    type: 'stage',
    title: 'FastAPI Engine',
    tag: 'STAGE 2 · API GATEWAY',
    stageColor: 'blue',
    icon: FastApi3DIcon,
    col1Title: 'Overview',
    col1Text:
      'Async Python backend serving dashboard, analytics, workforce management, and agent endpoints. Built with Starlette and Pydantic v2 for high-throughput operational intelligence.',
    col2Title: 'Key points',
    points: [
      'Async ASGI on port 8000',
      'REST endpoints for every module',
      'Filters (date, plant, shift, department, section) normalized per request',
    ],
  },
  'sqlalchemy': {
    id: 'sqlalchemy',
    type: 'stage',
    title: 'SQLAlchemy 2.0 ORM',
    tag: 'STAGE 2 · API GATEWAY',
    stageColor: 'blue',
    icon: SqlAlchemy3DIcon,
    col1Title: 'Overview',
    col1Text:
      'Typed models for all tables with pooled connections. Manages isolated database sessions and consistent analytical queries across all dashboard charts and AI agents.',
    col2Title: 'Key points',
    points: [
      'Connection pooling',
      'Separate read-only sessions',
      'Consistent queries across modules',
    ],
  },
  'sse': {
    id: 'sse',
    type: 'stage',
    title: 'SSE Streaming',
    tag: 'STAGE 2 · API GATEWAY',
    stageColor: 'blue',
    icon: Sse3DIcon,
    col1Title: 'Overview',
    col1Text:
      'Server-sent events stream agent stages to the UI while an agent runs. Delivers real-time execution transparency directly into chat drawers and autonomous decision monitors.',
    col2Title: 'Key points',
    points: [
      'Stage by stage progress',
      'No page reload',
      'Works with the assistant chat',
    ],
  },

  // 3. MULTI-AGENT CORE
  'central_orch': {
    id: 'central_orch',
    type: 'stage',
    title: 'Central Orchestrator',
    tag: 'STAGE 3 · MULTI-AGENT CORE',
    stageColor: 'purple',
    icon: Orchestrator3DIcon,
    col1Title: 'Overview',
    col1Text:
      'Reads the question and decides which specialist agent should answer. Evaluates user intent, extracts filter parameters, and coordinates multi-agent consensus workflows.',
    col2Title: 'Key points',
    points: [
      'Extracts filters from the question',
      'Routes to one or more specialist agents',
      'Keeps conversation context for follow-ups',
    ],
  },
  'specialist_agents': {
    id: 'specialist_agents',
    type: 'stage',
    title: '7 Specialist Agents',
    tag: 'STAGE 3 · MULTI-AGENT CORE',
    stageColor: 'purple',
    icon: SpecialistAgents3DIcon,
    col1Title: 'Overview',
    col1Text:
      'Each agent analyses its own data with SQL and returns metrics, findings, and recommendations. Covers the entire operational spectrum from staffing and overtime to skill readiness.',
    col2Title: 'Key points',
    points: [
      'Attendance, workforce planning, overtime, attrition',
      'Skills and training, vendor, production',
      'Results merged into one answer',
    ],
  },
  'domo_ai': {
    id: 'domo_ai',
    type: 'stage',
    title: 'Domo AI Conversational Layer',
    tag: 'STAGE 3 · MULTI-AGENT CORE',
    stageColor: 'purple',
    icon: DomoAi3DIcon,
    col1Title: 'Overview',
    col1Text:
      'Turns verified results into a natural, friendly answer. Combines deterministic database metrics with conversational summaries, falling back to structured cards if the LLM is unavailable.',
    col2Title: 'Key points',
    points: [
      'Uses only values returned from the database',
      'Keeps the structured tables and metrics',
      'Falls back to the structured answer if the LLM is unavailable',
    ],
  },

  // 4. GOVERNANCE (Human Approval ONLY)
  'human_approval': {
    id: 'human_approval',
    type: 'stage',
    title: 'Human Approval',
    tag: 'STAGE 4 · GOVERNANCE',
    stageColor: 'emerald',
    icon: HumanApproval3DIcon,
    col1Title: 'Overview',
    col1Text:
      'HR reviews agent suggestions and approves or rejects them before any action. Enforces supervisory oversight before any roster update, overtime dispatch, or line rearrangement is finalized.',
    col2Title: 'Key points',
    points: [
      'HR reviews and approves or rejects each agent suggestion',
      'Zero autonomous actions applied without explicit human sign-off',
      'Every approval decision is time-stamped, logged, and audited',
    ],
  },
  // Alias for backward-compatibility with previous hitl id
  'hitl': {
    id: 'human_approval',
    type: 'stage',
    title: 'Human Approval',
    tag: 'STAGE 4 · GOVERNANCE',
    stageColor: 'emerald',
    icon: HumanApproval3DIcon,
    col1Title: 'Overview',
    col1Text:
      'HR reviews agent suggestions and approves or rejects them before any action. Enforces supervisory oversight before any roster update, overtime dispatch, or line rearrangement is finalized.',
    col2Title: 'Key points',
    points: [
      'HR reviews and approves or rejects each agent suggestion',
      'Zero autonomous actions applied without explicit human sign-off',
      'Every approval decision is time-stamped, logged, and audited',
    ],
  },

  // 5. CLOSED-LOOP (Shortage Mitigation & Cost Containment ONLY)
  'shortage_mit': {
    id: 'shortage_mit',
    type: 'stage',
    title: 'Shortage Mitigation (Planned)',
    tag: 'STAGE 5 · CLOSED-LOOP',
    stageColor: 'amber',
    icon: ShortageMitigation3DIcon,
    col1Title: 'Overview',
    col1Text:
      'After HR approval, replacement personnel would be dispatched automatically. Builds upon workforce planning suggestions to streamline standby worker allocation across active shifts.',
    col2Title: 'Key points',
    points: [
      'Builds on replacement and standby worker suggestions',
      'Integrates directly with rotational shift rosters upon sign-off',
      'Planned capability for autonomous dispatch',
    ],
  },
  'cost_contain': {
    id: 'cost_contain',
    type: 'stage',
    title: 'Cost Containment (Planned)',
    tag: 'STAGE 5 · CLOSED-LOOP',
    stageColor: 'amber',
    icon: CostContainment3DIcon,
    col1Title: 'Overview',
    col1Text:
      'Equalize overtime across teams after supervisory sign-off. Leverages overtime agent findings to prevent repeat overtime fatigue and balance staffing costs between manufacturing departments.',
    col2Title: 'Key points',
    points: [
      'Identifies chronic overtime hotspots and fatigue risks',
      'Automated threshold alerts when shifts exceed target labor cost',
      'Planned capability for intelligent workload balancing',
    ],
  },

  // PROBLEMS SOLVED BY AGENTS
  'shortages': {
    id: 'shortages',
    type: 'problem',
    num: '01',
    title: 'WORKFORCE SHORTAGES',
    tag: 'PROBLEM 01 · WORKFORCE PLANNING AGENT',
    stageColor: 'rose',
    icon: Clock,
    col1Title: 'Problem',
    col1Text:
      'Required headcount is not always covered on a shift and supervisors need replacement options quickly to prevent line-level delays and station downtime.',
    col2Title: 'What the agent does',
    points: [
      'Compares required vs available workforce by plant, department, and shift',
      'Detects shortage gaps',
      'Suggests skill-compatible replacement employees',
    ],
    exampleQuestion: 'Which shifts are short of workers this month?',
  },
  'absenteeism': {
    id: 'absenteeism',
    type: 'problem',
    num: '02',
    title: 'ABSENTEEISM SPIKES',
    tag: 'PROBLEM 02 · ATTENDANCE AGENT',
    stageColor: 'amber',
    icon: AlertTriangle,
    col1Title: 'Problem',
    col1Text:
      'Absence and late arrivals rise in some departments or shifts and are hard to spot early, leading to unexpected staffing gaps at the start of operational shifts.',
    col2Title: 'What the agent does',
    points: [
      'Tracks absenteeism and late arrivals',
      'Finds department, shift, and plant hotspots',
      'Flags chronic absentees and consecutive absence streaks',
    ],
    exampleQuestion: 'Which department has the highest absenteeism?',
  },
  'attrition': {
    id: 'attrition',
    type: 'problem',
    num: '03',
    title: 'ATTRITION RISKS',
    tag: 'PROBLEM 03 · ATTRITION AGENT',
    stageColor: 'purple',
    icon: Flame,
    col1Title: 'Problem',
    col1Text:
      'Employees leave without early warning and it is unclear which groups are at risk, making it difficult to maintain stable staffing across specialized stations.',
    col2Title: 'What the agent does',
    points: [
      'Shows attrition rate and exits by department',
      'Analyses tenure patterns and leaving reasons',
      'Suggests retention actions',
    ],
    exampleQuestion: 'Why are employees leaving and from which departments?',
  },
  'overtime': {
    id: 'overtime',
    type: 'problem',
    num: '04',
    title: 'OVERTIME IMBALANCE',
    tag: 'PROBLEM 04 · OVERTIME AGENT',
    stageColor: 'sky',
    icon: Layers,
    col1Title: 'Problem',
    col1Text:
      'Overtime concentrates on a few departments, shifts, or employees, raising cost and fatigue risks while leaving other qualified teams under-utilized.',
    col2Title: 'What the agent does',
    points: [
      'Measures OT hours and estimated cost',
      'Finds concentration by department and shift',
      'Lists repeat OT employees and suggests cost reduction',
    ],
    exampleQuestion: 'Who is doing the most overtime?',
  },
  'skills': {
    id: 'skills',
    type: 'problem',
    num: '05',
    title: 'SKILL MISMATCHES',
    tag: 'PROBLEM 05 · SKILLS & TRAINING AGENT',
    stageColor: 'emerald',
    icon: Shield,
    col1Title: 'Problem',
    col1Text:
      'Skills, certifications, and training do not always match what roles need, creating operational bottlenecks and compliance exposure across technical workstations.',
    col2Title: 'What the agent does',
    points: [
      'Analyses skill levels and multi-skilling',
      'Finds skill gaps and training completion',
      'Checks certification validity and expiry',
    ],
    exampleQuestion: 'Which skills have the biggest gaps?',
  },
};

export const UnifiedDetailsCard = forwardRef(function UnifiedDetailsCard(
  { selected, className = '' },
  ref
) {
  const navigate = useNavigate();

  // Selected item lookup with safe fallback to ERP
  const currentKey = selected?.id || 'erp';
  const item = DETAILS_DATA[currentKey] || DETAILS_DATA.erp;
  const isProblem = item.type === 'problem';
  const Icon = item.icon || Database;

  const handleOpenAssistant = () => {
    if (item.exampleQuestion) {
      navigate(`/assistant?q=${encodeURIComponent(item.exampleQuestion)}`);
    } else {
      navigate('/assistant');
    }
  };

  return (
    <Card
      ref={ref}
      className={`p-3 sm:p-3.5 flex flex-col justify-between border border-[var(--border)] shadow-xs select-none h-full min-h-0 overflow-hidden ${className}`}
    >
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header: 3D icon or glyph tile, title, and tag chip */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-[var(--border)] shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {isProblem ? (
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 dark:bg-purple-950/50 text-[#493287] dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
                <Icon className="w-4 h-4" />
              </div>
            ) : (
              <Icon className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 drop-shadow-sm" />
            )}
            <div className="min-w-0">
              <h3 className="text-xs sm:text-[13px] font-extrabold text-[var(--foreground)] tracking-tight truncate">
                {item.title}
              </h3>
              <p className="text-[9.5px] sm:text-[10px] text-[var(--secondary)] font-medium truncate">
                {isProblem ? 'Autonomous Problem Resolution' : 'Pipeline Stage Component'}
              </p>
            </div>
          </div>

          <span className="text-[8.5px] sm:text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 bg-[var(--muted-fill)] border-[var(--border)] text-[var(--foreground)]">
            {item.tag}
          </span>
        </div>

        {/* Body: 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 flex-1 min-h-0">
          {/* Left Column: Overview or Problem */}
          <div className="flex flex-col min-h-0">
            <span className="text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider text-[var(--secondary)] mb-1 shrink-0">
              {item.col1Title}
            </span>
            <div className="p-2.5 sm:p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)]/30 flex-1 flex items-center overflow-y-auto">
              <p className="text-[11px] sm:text-[11.5px] text-[var(--foreground)] leading-relaxed">
                {item.col1Text}
              </p>
            </div>
          </div>

          {/* Right Column: Key Points or What the Agent Does */}
          <div className="flex flex-col min-h-0">
            <span className="text-[9px] sm:text-[9.5px] font-bold uppercase tracking-wider text-[var(--secondary)] mb-1 shrink-0">
              {item.col2Title}
            </span>
            <div className="space-y-1.5 flex-1 flex flex-col justify-center min-h-0">
              {item.points.map((pt, i) => (
                <div
                  key={i}
                  className="flex items-start gap-1.5 p-1.5 sm:p-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[10px] sm:text-[10.5px] leading-tight"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span className="text-[var(--foreground)] font-medium">{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* For Problems only: footer strip with question chip and Open AI Assistant button */}
      {isProblem && (
        <div className="pt-2 mt-2 border-t border-[var(--border)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <span className="text-[9.5px] font-bold text-[var(--secondary)] shrink-0">
              Ask the assistant:
            </span>
            <span
              onClick={handleOpenAssistant}
              className="text-[10px] italic text-purple-600 dark:text-purple-400 font-medium px-2 py-0.5 rounded-md bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/60 truncate cursor-pointer hover:underline"
              title="Click to ask in AI Assistant"
            >
              &ldquo;{item.exampleQuestion}&rdquo;
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenAssistant}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-white rounded-lg shadow-xs transition-all duration-150 hover:brightness-110 active:scale-95 cursor-pointer shrink-0"
            style={{
              background: 'linear-gradient(135deg, #493287 0%, #5B44A3 100%)',
            }}
          >
            <Bot className="w-3.5 h-3.5" />
            <span>Open AI Assistant</span>
          </button>
        </div>
      )}
    </Card>
  );
});

export default UnifiedDetailsCard;
