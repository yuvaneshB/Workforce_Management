import {
  ArrowRight,
  CheckCircle2,
  Database,
  Flame,
  Layers,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Card } from '../common/Card';

const STAGE_DETAILS = {
  1: {
    title: '1. Source System Silos & Workforce Connectors',
    badge: 'STAGE 1 • DATA EXTRACTION',
    badgeStyle: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400',
    description:
      'Extracts, ingests, and synchronizes real-time transactional data across 7 disparate manufacturing workforce data categories into the centralized operational database.',
    protocols: 'FastAPI ETL Connectors - Live Attendance Webhooks - PostgreSQL CDC',
    tables: 'dim_workforce, fact_attendance_daily, dim_shift_calendar, fact_hourly_production',
    flowTitle: 'Workforce Ingestion & Extraction Architecture:',
    points: [
      'HRMS & ERP Connector: Ingests permanent and vendor workforce profiles, skill grades (L1–L4), and active department mappings.',
      'MES & TimeTrack Pipeline: Captures high-frequency start-of-shift biometric punches and timestamps (Present, Absent, Leave, Late).',
      'QMS & Certification Audit: Monitors IPC-A-610, ESD, LOTO, and Forklift safety certification compliance records.',
      'Shift Calendar Mapping: Ingests 3-shift operational rosters (GS1 Morning, S2 Evening, NS3 Night) across 12 plant sections.',
      'Vendor Workforce Allocation: Tracks headcount delivery from vendors V1 through V6 and monitors historical tenure exit brackets.',
    ],
  },
  2: {
    title: '2. FastAPI Engine & Analytical Normalizer',
    badge: 'STAGE 2 • API GATEWAY',
    badgeStyle: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400',
    description:
      'High-performance async Python gateway serving authenticated RESTful endpoints, workforce analytics aggregations, and deterministic tool execution environments.',
    protocols: 'HTTP/2 JSON / ASGI Starlette - Pydantic v2 - SQLAlchemy 2.0 Async',
    tables: 'read_only_replica_pool, analytics_cache_redis, planning_service_pool',
    flowTitle: 'Gateway Routing & Processing Flow:',
    points: [
      'Async Request Normalizer: Validates and sanitizes multi-tenant shift queries with Pydantic type safety and zero data leakage.',
      'Connection Pooling: Maintains sub-second connection reuse against Neon PostgreSQL read-only replicas.',
      'Analytical Aggregations: Computes server-side attendance rates, overtime distributions, and department shortage matrices.',
      'Tool Execution Sandbox: Wraps verified analytics methods for LangChain autonomous tool execution and audit logging.',
      'Deterministic Rate Limiting: Enforces sub-second response times for complex multi-table operational planning queries.',
    ],
  },
  3: {
    title: '3. Multi-Agent Cognitive Core',
    badge: 'STAGE 3 • MULTI-AGENT REASONING',
    badgeStyle: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400',
    description:
      'Trio of specialized autonomous LLM agents collaborating to understand natural language intent, audit shift staffing feasibility, and proactively surveil operational shortages.',
    protocols: 'LangChain ReAct Agent - Gemini 1.5 Pro - Structured Tool Calling',
    tables: 'conversation_memory, agent_audit_log, replacement_scoring_cache',
    flowTitle: 'Multi-Agent Autonomous Orchestration Flow:',
    points: [
      'Agent 1 (Assistant): Interprets conversational workforce queries and translates natural language into structured analytical queries.',
      'Agent 2 (Feasibility): Conducts 7-stage constraint verification auditing shift availability, skill grades, and certification validity.',
      'Agent 3 (Surveillance): 24/7 background monitor detecting shift shortages, overtime spikes, and line-stoppage risks.',
      'Deterministic Tool Binding: Agents execute only verified database queries, eliminating AI hallucinations.',
      'Consensus Resolution: Synthesizes multi-agent findings into clear, actionable executive replacement recommendations.',
    ],
  },
  4: {
    title: '4. Governance & Human Approval Gate',
    badge: 'STAGE 4 • GOVERNANCE & COMPLIANCE',
    badgeStyle: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400',
    description:
      'Human-in-the-loop validation enforcing segregation of duties, regulatory labor compliance, and mandatory HR authorization prior to shopfloor roster updates.',
    protocols: 'Human-in-the-Loop (HITL) - RBAC JWT - Immutable Audit Trails',
    tables: 'hr_approvals, compliance_check_log, governance_audit_events',
    flowTitle: 'Governance & Approval Decision Gates:',
    points: [
      '100% Sign-Off Gate: High-impact actions (shift reassignments, overtime authorisations) require human approval.',
      'Recommendation Transparency: Visualizes confidence scoring, skill match criteria, and operational impact.',
      'One-Click Decision Interface: HR approves, requests revisions, or rejects with mandatory rationale.',
      'Segregation of Duties: Prevents single-operator override on critical plant compliance regulations and labor caps.',
      'Audit Trail Persistence: Every decision is cryptographically logged with HR timestamp and metadata.',
    ],
  },
  5: {
    title: '5. Closed-Loop Execution & Dispatch',
    badge: 'STAGE 5 • CLOSED-LOOP DISPATCH',
    badgeStyle: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400',
    description:
      'Closes the loop between AI surveillance, HR authorization, and shopfloor shift coverage via automated candidate scoring, corrective roster actions, and live MES updates.',
    protocols: 'Live FastAPI REST - Deterministic Replacement Scoring - Real-Time Attendance Webhooks',
    tables: 'dim_workforce, fact_attendance_daily, dim_shift_calendar, fact_hourly_production',
    flowTitle: 'Execution Logic & Operational Flow:',
    points: [
      'Shortage Detection: Surveillance Agent scans start-of-shift attendance punches against required machine line rosters.',
      'Candidate Scoring: Feasibility Agent ranks available standby workers based on skill grade (L1–L4), shift history, and valid certifications.',
      'HR Approval Gate: HR reviews top recommended replacements and authorizes assignment via one-click approval.',
      'Roster Dispatch: Automatically dispatches shift reassignment notices to shopfloor leads and updates MES operator badges.',
      'Continuous Feedback: Tracks post-shift machine throughput and yield quality to refine future replacement recommendation scoring.',
    ],
  },
};

export function StageExecutionDetailsCard({ selectedStage = 5 }) {
  const current = STAGE_DETAILS[selectedStage] || STAGE_DETAILS[5];

  return (
    <Card className="p-4 lg:col-span-7 flex flex-col justify-between min-h-[340px] border border-[var(--border)] shadow-xs select-none">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <h2 className="text-[13px] sm:text-sm font-extrabold text-[var(--text)] tracking-tight whitespace-nowrap">
              {current.title}
            </h2>
          </div>

          <span
            className={`text-[9.5px] font-black border px-2.5 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${current.badgeStyle}`}
          >
            {current.badge}
          </span>
        </div>

        {/* Subtitle Description */}
        <p className="text-[11.5px] text-[var(--secondary)] leading-relaxed mb-3">
          {current.description}
        </p>

        {/* Protocols & Tables Grey Banner */}
        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-[var(--border)] grid grid-cols-1 md:grid-cols-12 gap-2 text-[10.5px] mb-3.5">
          <div className="md:col-span-7">
            <span className="font-extrabold text-[var(--text)]">PROTOCOLS: </span>
            <span className="font-medium text-[var(--secondary)]">{current.protocols}</span>
          </div>
          <div className="md:col-span-5 md:text-right">
            <span className="font-extrabold text-[var(--text)]">DATABASE TABLES: </span>
            <span className="font-mono font-bold text-[#7C3AED] dark:text-purple-400 text-[10px]">
              {current.tables}
            </span>
          </div>
        </div>

        {/* Execution Logic & Operational Flow */}
        <div>
          <h3 className="text-[11.5px] font-extrabold text-[var(--text)] mb-2">
            {current.flowTitle}
          </h3>

          <div className="space-y-1.5">
            {current.points.map((pt, idx) => {
              const colonIndex = pt.indexOf(':');
              const boldPart = colonIndex !== -1 ? pt.slice(0, colonIndex + 1) : '';
              const restPart = colonIndex !== -1 ? pt.slice(colonIndex + 1) : pt;

              return (
                <div key={idx} className="flex items-start gap-2 text-[11px] leading-snug">
                  <span className="w-4 h-4 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-black text-[9px] flex items-center justify-center shrink-0 mt-0.5 border border-red-200 dark:border-red-900">
                    {idx + 1}
                  </span>
                  <div className="text-[var(--text)]">
                    {boldPart && <span className="font-extrabold text-[var(--text)]">{boldPart}</span>}
                    <span className="text-[var(--secondary)] font-medium">{restPart}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
