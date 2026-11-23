import {
  Award,
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Database,
  Flame,
  Layers,
  Lock,
  Server,
  Shield,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
  Workflow,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { Card } from '../common/Card';

export const PIPELINE_STAGES = [
  {
    id: 1,
    num: '1',
    headerTitle: '1. SOURCE SYSTEM',
    headerSub: '18 Enterprise Tables',
    headerBg: 'bg-[#831843]', // Deep Burgundy
    badgeColor: 'border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/50',
    title: 'Neon Serverless PostgreSQL Database',
    tech: 'PostgreSQL 16 & Relational Silos',
    description:
      'Centralized operational database hosting 18 enterprise tables populated via CSV import to Neon PostgreSQL (live connectors for ERP, MES, and HRIS are Planned with zero mock data).',
    icon: Database,
    items: [
      {
        title: 'ERP & Master Entities',
        desc: 'employee_master (1,700), plant (2), dept (6), vendor (6) via CSV import',
        sub: 'CSV import to Neon DB • ERP (Planned)',
        icon: Database,
        iconColor: 'text-blue-600',
      },
      {
        title: 'MES & Shopfloor Logs',
        desc: 'attendance_transactions (177k), overtime (58k hrs), line output via CSV import',
        sub: 'CSV import to Neon DB • MES (Planned)',
        icon: Server,
        iconColor: 'text-emerald-600',
      },
      {
        title: 'Skills, Roster & Exits',
        desc: 'employee_skill (2,927), training (9.6k), exits (120 leavers) via CSV import',
        sub: 'CSV import to Neon DB • HRIS (Planned)',
        icon: ShieldCheck,
        iconColor: 'text-purple-600',
      },
    ],
    protocol: 'PostgreSQL Wire / SSL Pooled',
    security: 'SSL Encrypted • Read-Only Pool',
    latency: '< 45 ms',
  },
  {
    id: 2,
    num: '2',
    headerTitle: '2. API GATEWAY',
    headerSub: 'FastAPI Engine',
    headerBg: 'bg-[#1E3A8A]', // Deep Blue
    badgeColor: 'border-blue-300 text-blue-700 bg-blue-50 dark:bg-blue-950/50',
    title: 'FastAPI High-Performance Engine',
    tech: 'FastAPI & SQLAlchemy 2.0',
    description:
      'High-throughput Python ASGI backend providing authenticated REST endpoints, Pydantic v2 schemas, server-side aggregations, and real-time SSE streaming pipelines.',
    icon: Server,
    centerCard: {
      title: 'FastAPI Engine',
      port: 'Port 8000 - SSE',
      sub: 'Async Normalizer',
      icon: Cpu,
    },
    items: [
      {
        title: 'SQLAlchemy 2.0 ORM',
        desc: 'Pooled read-only database sessions with zero write permission',
        sub: 'Connection Pooling',
        icon: Database,
        iconColor: 'text-blue-600',
      },
      {
        title: 'SSE Streaming Pipeline',
        desc: '/api/v1/agent/stream-analysis real-time stage progress',
        sub: 'Server-Sent Events',
        icon: Zap,
        iconColor: 'text-amber-500',
      },
    ],
    protocol: 'HTTP/2 • REST • JSON • SSE',
    security: 'CORS Allowlist • ReadOnlyError Guards',
    latency: '< 80 ms',
  },
  {
    id: 3,
    num: '3',
    headerTitle: '3. MULTI-AGENT CORE',
    headerSub: '7 Specialist Agents',
    headerBg: 'bg-[#581C87]', // Deep Purple
    badgeColor: 'border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/50',
    title: 'Multi-Agent Cognitive AI Core',
    tech: 'LangChain & Domo AI Services',
    description:
      'Central Orchestrator (intent routing + conversation memory) coordinating 7 autonomous specialist agents (Attendance, Workforce Planning, Overtime, Attrition, Skills & Training, Vendor, Production) grounded in Neon PostgreSQL, paired with a Domo AI conversational layer for natural-language response over verified data.',
    icon: Brain,
    items: [
      {
        title: 'Central Orchestrator',
        desc: 'Intent routing & isolated conversation memory across 7 specialist domains',
        sub: 'Intent Routing + Memory',
        icon: Brain,
        iconColor: 'text-purple-600',
      },
      {
        title: '7 Specialist Agents',
        desc: 'Attendance, Workforce Planning, Overtime, Attrition, Skills & Training, Vendor, Production',
        sub: 'Attendance, Planning, OT, Attrition, Skills, Vendor, Production',
        icon: Bot,
        iconColor: 'text-blue-600',
      },
      {
        title: 'Domo AI Conversational Layer',
        desc: 'Natural-language response synthesis grounded strictly over verified Neon data',
        sub: 'Conversational Layer (Verified Data)',
        icon: Zap,
        iconColor: 'text-amber-500',
      },
    ],
    protocol: 'LangChain Tool Protocol • Domo LLM',
    security: 'Isolated Memory • Grounded Facts',
    latency: '350 ms – 1.2 s',
  },
  {
    id: 4,
    num: '4',
    headerTitle: '4. GOVERNANCE',
    headerSub: 'HR Approval + Audit Trail',
    headerBg: 'bg-[#1D4ED8]', // Royal Blue
    badgeColor: 'border-indigo-300 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50',
    title: 'Human-in-the-Loop Governance Gate',
    tech: 'React 18 & HITL Approval',
    description:
      'Zero-write read-only enforcement ensuring all AI-generated roster adjustments, overtime rebalancing, and standby assignments require HR Approval + Audit Trail. RBAC and dual authority sign-off are on the Roadmap.',
    icon: ShieldCheck,
    centerCard: {
      title: 'Human Approval Gate',
      port: 'HR Approval + Audit Trail',
      sub: 'Read-Only Governance',
      icon: ShieldCheck,
    },
    items: [
      {
        title: 'HR Approval + Audit Trail',
        desc: 'Plant HRBP and Operations sign-off with audit logging; RBAC and dual authority sign-off on Roadmap',
        sub: 'RBAC & Dual Sign-Off (Roadmap)',
        icon: Users,
        iconColor: 'text-blue-600',
      },
      {
        title: 'Read-Only Safeguards',
        desc: 'Strict ReadOnlyError blocks unauthorized database writes',
        sub: 'Immutable Audit Trail',
        icon: Lock,
        iconColor: 'text-rose-600',
      },
    ],
    protocol: 'HITL Review Protocol • JWT Auth',
    security: 'Human Verification Required • Read-Only DB',
    latency: 'Interactive Session',
  },
  {
    id: 5,
    num: '5',
    headerTitle: '5. CLOSED-LOOP',
    headerSub: 'Actions & Dispatch (Planned)',
    headerBg: 'bg-[#7F1D1D]', // Dark Crimson
    badgeColor: 'border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/50',
    title: 'Closed-Loop Operational Actions & Dispatch',
    tech: 'Manufacturing Operations & SLAs',
    description:
      'Future factory floor closed-loop outcomes: automated standby worker dispatch (Planned), cost-neutral overtime equalization with illustrative target of ₹2.5M savings (Planned), and automated command post dispatch (Planned).',
    icon: Zap,
    items: [
      {
        title: 'Shortage Mitigation (Planned)',
        desc: 'Automated standby redeployment to prevent line starvation on night shifts',
        sub: 'Planned • Zero Assembly Downtime',
        icon: UserCheck,
        iconColor: 'text-emerald-600',
      },
      {
        title: 'Cost Containment (Planned)',
        desc: 'Overtime equalization to contain contractor premiums',
        sub: 'Illustrative target: ₹2.5M Savings',
        icon: TrendingUp,
        iconColor: 'text-blue-600',
      },
      {
        title: 'Command Portals (Planned)',
        desc: 'Automated dispatch triggers and closed-loop command consoles',
        sub: 'Planned • Automated Dispatch',
        icon: Layers,
        iconColor: 'text-purple-600',
      },
    ],
    protocol: 'Operational SLAs • Factory Gate Dispatch',
    security: 'Enterprise Governance Compliant',
    latency: 'Live Shift Updates',
  },
];

export function SystemArchitecturePipelineCard({ onInspectStage, className = '' }) {
  const [selectedStageId, setSelectedStageId] = useState(1);

  const handleStageClick = (stage) => {
    setSelectedStageId(stage.id);
    onInspectStage?.(stage);
  };

  return (
    <Card className={`p-3.5 sm:p-4 flex flex-col justify-between h-[390px] border border-[var(--border)] shadow-xs select-none ${className}`}>
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#5932EA]/10 dark:bg-purple-950/50 text-[#5932EA] dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
            <Workflow className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-[13px] sm:text-sm font-extrabold text-[var(--text)] tracking-tight">
            System Architecture Pipeline
          </h2>
        </div>

        <span className="text-[10px] text-purple-600 dark:text-purple-400 font-semibold cursor-pointer hover:underline flex items-center gap-0.5">
          Click any card to inspect details <span className="text-xs">↘</span>
        </span>
      </div>

      {/* 5-Stage Horizontal Connected Pipeline */}
      <div className="grid grid-cols-5 gap-1.5 sm:gap-2 flex-1 my-1 items-stretch relative">
        {PIPELINE_STAGES.map((stage, idx) => {
          const isSelected = selectedStageId === stage.id;
          const isLast = idx === PIPELINE_STAGES.length - 1;

          return (
            <div key={stage.id} className="relative flex flex-col h-full">
              {/* Stage Card Box */}
              <div
                onClick={() => handleStageClick(stage)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleStageClick(stage);
                  }
                }}
                className={`flex-1 flex flex-col rounded-xl border transition-all cursor-pointer overflow-hidden group ${
                  isSelected
                    ? 'border-[#5932EA] ring-2 ring-[#5932EA]/30 bg-purple-50/15 dark:bg-purple-950/20 shadow-xs'
                    : 'border-[var(--border)] hover:border-purple-300 dark:hover:border-purple-700 bg-[var(--surface)] hover:bg-[var(--surface-hover)]/30'
                }`}
              >
                {/* Header Banner */}
                <div className={`${stage.headerBg} text-white px-2 py-1.5 text-center shrink-0`}>
                  <div className="text-[10px] font-black tracking-wider uppercase leading-none">
                    {stage.headerTitle}
                  </div>
                  <div className="text-[8px] text-white/80 font-medium tracking-tight mt-0.5 truncate">
                    {stage.headerSub}
                  </div>
                </div>

                {/* Body Content: 3 mini cards stacked */}
                <div className="p-1.5 flex-1 flex flex-col justify-between gap-1 overflow-hidden">
                  {stage.centerCard ? (
                    <>
                      {/* Main Center Badge for Gateway & Governance */}
                      <div className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)]/40 p-1.5 flex flex-col items-center justify-center text-center">
                        <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-200 dark:border-blue-800 mb-1">
                          <stage.centerCard.icon className="w-4 h-4" />
                        </div>
                        <div className="text-[9.5px] font-extrabold text-[var(--text)] leading-tight">
                          {stage.centerCard.title}
                        </div>
                        <div className="text-[8px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded mt-0.5 font-mono">
                          {stage.centerCard.port}
                        </div>
                        <div className="text-[7.5px] text-[var(--secondary)] mt-0.5">
                          {stage.centerCard.sub}
                        </div>
                      </div>

                      {/* Supporting Item */}
                      {stage.items.slice(0, 1).map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-1 text-center shrink-0"
                        >
                          <div className="text-[8.5px] font-bold text-[var(--text)] truncate">
                            {item.title}
                          </div>
                          <div className="text-[7px] text-[var(--secondary)] truncate">
                            {item.sub}
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    /* 3 Stacked Sub-Cards */
                    stage.items.map((item, itemIdx) => {
                      const ItemIcon = item.icon;
                      return (
                        <div
                          key={itemIdx}
                          className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface-hover)]/30 hover:bg-[var(--surface-hover)] p-1.5 flex flex-col justify-center transition-colors"
                        >
                          <div className="flex items-center gap-1 min-w-0">
                            <ItemIcon className={`w-3 h-3 shrink-0 ${item.iconColor || 'text-[var(--primary)]'}`} />
                            <div className="text-[9px] font-bold text-[var(--text)] truncate leading-tight">
                              {item.title}
                            </div>
                          </div>
                          <div className="text-[7.5px] text-[var(--secondary)] truncate mt-0.5 leading-tight">
                            {item.sub}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Connector Arrow to Next Column */}
              {!isLast && (
                <div
                  aria-hidden="true"
                  className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-10 w-3 h-3 text-slate-400 dark:text-slate-600 pointer-events-none items-center justify-center font-bold text-[10px]"
                >
                  →
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Card Footer Bar */}
      <div className="flex items-center justify-between text-[9px] text-[var(--secondary)] pt-1.5 border-t border-[var(--border)] mt-1">
        <span className="flex items-center gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Neon PostgreSQL Wire • FastAPI ASGI • 7 Specialist Agents • Domo AI Conversational Layer
        </span>
        <span className="font-mono text-[8.5px] text-[#5932EA] dark:text-purple-400 font-bold">
          Implemented + Roadmap
        </span>
      </div>
    </Card>
  );
}

export default SystemArchitecturePipelineCard;
