import { ChevronRight, Workflow } from 'lucide-react';
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
  Stage1HeaderIcon,
  Stage2HeaderIcon,
  Stage3HeaderIcon,
  Stage4HeaderIcon,
  Stage5HeaderIcon,
} from './PipelineIcons';

export const PIPELINE_STAGES = [
  {
    id: 1,
    headerTitle: '1. SOURCE SYSTEM',
    headerSub: '18 Enterprise Tables · CSV import',
    headerBg: 'bg-[#991b1b]',
    headerIcon: Stage1HeaderIcon,
    accentColor: 'rose',
    stageLabel: 'STAGE 1 · SOURCE SYSTEM',
    subCards: [
      {
        id: 'erp',
        title: 'ERP & Master Entities',
        sub: '1,700 employees, 2 plants, depts, vendors',
        icon: Erp3DIcon,
        color: 'rose',
        bgTint:
          'bg-rose-50/70 hover:bg-rose-50/90 dark:bg-rose-950/25 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/60',
      },
      {
        id: 'mes',
        title: 'MES & Shopfloor Logs',
        sub: 'Attendance, overtime, production records',
        icon: Mes3DIcon,
        color: 'rose',
        bgTint:
          'bg-rose-50/70 hover:bg-rose-50/90 dark:bg-rose-950/25 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/60',
      },
      {
        id: 'skills_roster',
        title: 'Skills, Roster & Exits',
        sub: 'Skills matrix, training, rosters, exits',
        icon: Skills3DIcon,
        color: 'rose',
        bgTint:
          'bg-rose-50/70 hover:bg-rose-50/90 dark:bg-rose-950/25 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/60',
      },
      {
        id: 'neon_db',
        title: 'Neon PostgreSQL Database',
        sub: '18 tables, pooled read-only connection',
        icon: NeonDb3DIcon,
        color: 'rose',
        bgTint:
          'bg-rose-50/70 hover:bg-rose-50/90 dark:bg-rose-950/25 dark:hover:bg-rose-950/40 border-rose-200 dark:border-rose-900/60',
      },
    ],
  },
  {
    id: 2,
    headerTitle: '2. API GATEWAY',
    headerSub: 'FastAPI Engine',
    headerBg: 'bg-[#1D4ED8]',
    headerIcon: Stage2HeaderIcon,
    accentColor: 'blue',
    stageLabel: 'STAGE 2 · API GATEWAY',
    subCards: [
      {
        id: 'fastapi',
        title: 'FastAPI Engine',
        sub: 'REST endpoints, query filters, CORS',
        icon: FastApi3DIcon,
        color: 'blue',
        bgTint:
          'bg-blue-50/70 hover:bg-blue-50/90 dark:bg-blue-950/25 dark:hover:bg-blue-950/40 border-blue-200 dark:border-blue-900/60',
      },
      {
        id: 'sqlalchemy',
        title: 'SQLAlchemy 2.0 ORM',
        sub: 'Connection pooling, typed models',
        icon: SqlAlchemy3DIcon,
        color: 'blue',
        bgTint:
          'bg-blue-50/70 hover:bg-blue-50/90 dark:bg-blue-950/25 dark:hover:bg-blue-950/40 border-blue-200 dark:border-blue-900/60',
      },
      {
        id: 'sse',
        title: 'SSE Streaming',
        sub: 'Server-Sent Events for agent execution',
        icon: Sse3DIcon,
        color: 'blue',
        bgTint:
          'bg-blue-50/70 hover:bg-blue-50/90 dark:bg-blue-950/25 dark:hover:bg-blue-950/40 border-blue-200 dark:border-blue-900/60',
      },
    ],
  },
  {
    id: 3,
    headerTitle: '3. MULTI-AGENT CORE',
    headerSub: '7 Specialist Agents',
    headerBg: 'bg-[#1F2F59]',
    headerIcon: Stage3HeaderIcon,
    accentColor: 'purple',
    stageLabel: 'STAGE 3 · MULTI-AGENT CORE',
    subCards: [
      {
        id: 'central_orch',
        title: 'Central Orchestrator',
        sub: 'Intent routing, task dispatch, aggregation',
        icon: Orchestrator3DIcon,
        color: 'purple',
        bgTint:
          'bg-purple-50/70 hover:bg-purple-50/90 dark:bg-purple-950/25 dark:hover:bg-purple-950/40 border-purple-200 dark:border-purple-900/60',
      },
      {
        id: 'specialist_agents',
        title: '7 Specialist Agents',
        sub: 'Shortage, Attendance, Attrition, Skills...',
        icon: SpecialistAgents3DIcon,
        color: 'purple',
        bgTint:
          'bg-purple-50/70 hover:bg-purple-50/90 dark:bg-purple-950/25 dark:hover:bg-purple-950/40 border-purple-200 dark:border-purple-900/60',
      },
      {
        id: 'domo_ai',
        title: 'Domo AI Conversational Layer',
        sub: 'Text-to-SQL, auto-visualizations',
        icon: DomoAi3DIcon,
        color: 'purple',
        bgTint:
          'bg-purple-50/70 hover:bg-purple-50/90 dark:bg-purple-950/25 dark:hover:bg-purple-950/40 border-purple-200 dark:border-purple-900/60',
      },
    ],
  },
  {
    id: 4,
    headerTitle: '4. GOVERNANCE',
    headerSub: 'HR Approval',
    headerBg: 'bg-[#0F766E]',
    headerIcon: Stage4HeaderIcon,
    accentColor: 'emerald',
    stageLabel: 'STAGE 4 · GOVERNANCE',
    subCards: [
      {
        id: 'human_approval',
        title: 'Human Approval',
        sub: 'HR reviews agent suggestions and approves or rejects them before any action',
        icon: HumanApproval3DIcon,
        color: 'emerald',
        bgTint:
          'bg-emerald-50/70 hover:bg-emerald-50/90 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60',
      },
    ],
  },
  {
    id: 5,
    headerTitle: '5. CLOSED-LOOP',
    headerSub: 'Actions & Dispatch (Planned)',
    headerBg: 'bg-[#B45309]',
    headerIcon: Stage5HeaderIcon,
    accentColor: 'amber',
    stageLabel: 'STAGE 5 · CLOSED-LOOP',
    subCards: [
      {
        id: 'shortage_mit',
        title: 'Shortage Mitigation',
        sub: 'Auto-draft roster adjustments & standby replacement dispatch',
        isPlanned: true,
        icon: ShortageMitigation3DIcon,
        color: 'amber',
        bgTint:
          'bg-amber-50/70 hover:bg-amber-50/90 dark:bg-amber-950/25 dark:hover:bg-amber-950/40 border-amber-200 dark:border-amber-900/60',
      },
      {
        id: 'cost_contain',
        title: 'Cost Containment',
        sub: 'Overtime threshold alerts & team labor cost balancing',
        isPlanned: true,
        icon: CostContainment3DIcon,
        color: 'amber',
        bgTint:
          'bg-amber-50/70 hover:bg-amber-50/90 dark:bg-amber-950/25 dark:hover:bg-amber-950/40 border-amber-200 dark:border-amber-900/60',
      },
    ],
  },
];

export function SystemArchitecturePipelineCard({
  selected = { type: 'stage', id: 'erp' },
  onSelect,
  className = '',
}) {
  return (
    <Card
      className={`p-2 sm:p-2.5 flex flex-col justify-between border border-[var(--border)] shadow-xs select-none min-h-0 overflow-hidden ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-1.5 mb-1.5 shrink-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-5 h-5 rounded-lg bg-[#493287]/10 dark:bg-purple-950/50 text-[#493287] dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-200 dark:border-purple-800">
            <Workflow className="w-3 h-3" />
          </div>
          <h2 className="text-xs sm:text-[12.5px] font-extrabold text-[var(--text)] tracking-tight truncate">
            System Architecture Pipeline
          </h2>
        </div>

        <span className="text-[9px] sm:text-[9.5px] text-purple-600 dark:text-purple-400 font-semibold tracking-tight shrink-0">
          Click a card for details
        </span>
      </div>

      {/* 5-Stage Horizontal Connected Pipeline */}
      <div className="flex-1 flex flex-col justify-between min-h-0 overflow-hidden">
        <div className="grid grid-cols-5 gap-1 sm:gap-1.5 flex-1 items-stretch relative h-full min-h-0">
          {PIPELINE_STAGES.map((stage, idx) => {
            const isLast = idx === PIPELINE_STAGES.length - 1;
            const HeaderIcon = stage.headerIcon;
            const isStage4 = stage.id === 4;
            const isStage5 = stage.id === 5;

            return (
              <div key={stage.id} className="relative flex flex-col h-full min-h-0">
                {/* Stage Column Box */}
                <div className="flex-1 flex flex-col rounded-lg sm:rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden shadow-2xs h-full min-h-0">
                  {/* Solid Colored Header with 3D Stage Icon */}
                  <div
                    className={`${stage.headerBg} text-white px-1 py-1 flex flex-col items-center justify-center shrink-0 shadow-xs text-center`}
                  >
                    <HeaderIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white mb-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
                    <div className="text-[clamp(8px,0.7vw,9.5px)] font-extrabold tracking-tight uppercase leading-tight text-center break-words max-w-full">
                      {stage.headerTitle}
                    </div>
                    <div className="text-[clamp(6.5px,0.55vw,7.5px)] text-white/90 font-medium tracking-tight mt-0.5 leading-tight text-center break-words max-w-full">
                      {stage.headerSub}
                    </div>
                  </div>

                  {/* Stage Sub-Cards Stack */}
                  <div className="p-0.5 sm:p-1 flex-1 flex flex-col gap-1 justify-between min-h-0">
                    {stage.subCards.map((sc) => {
                      const IconComp = sc.icon;
                      const isSelected =
                        selected?.type === 'stage' &&
                        (selected?.id === sc.id || (sc.id === 'human_approval' && selected?.id === 'hitl'));

                      // Stage 4: Single stretched card filling column
                      if (isStage4) {
                        return (
                          <div
                            key={sc.id}
                            onClick={() => onSelect?.({ type: 'stage', id: sc.id })}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelect?.({ type: 'stage', id: sc.id });
                              }
                            }}
                            className={`group rounded-md sm:rounded-lg border p-1 sm:p-1.5 transition-all cursor-pointer flex flex-col items-center justify-center text-center flex-1 h-full min-h-0 ${
                              sc.bgTint
                            } ${
                              isSelected
                                ? 'ring-2 ring-emerald-600 border-emerald-600 dark:ring-emerald-400 bg-white dark:bg-slate-900 shadow-md scale-[1.01]'
                                : 'hover:shadow-xs hover:scale-[1.005]'
                            }`}
                          >
                            <IconComp className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 mb-1 drop-shadow-sm group-hover:scale-105 transition-transform shrink-0" />
                            <div className="text-[clamp(9px,0.75vw,11px)] font-extrabold text-[var(--text)] leading-tight break-words">
                              {sc.title}
                            </div>
                            <div className="text-[clamp(7px,0.58vw,8px)] text-[var(--secondary)] font-medium leading-tight sm:leading-relaxed mt-0.5 sm:mt-1 break-words max-w-full">
                              {sc.sub}
                            </div>
                          </div>
                        );
                      }

                      // Stage 5: Two stretched cards filling column
                      if (isStage5) {
                        return (
                          <div
                            key={sc.id}
                            onClick={() => onSelect?.({ type: 'stage', id: sc.id })}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onSelect?.({ type: 'stage', id: sc.id });
                              }
                            }}
                            className={`group rounded-md sm:rounded-lg border p-1 sm:p-1.5 transition-all cursor-pointer flex flex-col items-center justify-center text-center flex-1 min-h-0 ${
                              sc.bgTint
                            } ${
                              isSelected
                                ? 'ring-2 ring-amber-600 border-amber-600 dark:ring-amber-400 bg-white dark:bg-slate-900 shadow-md scale-[1.01]'
                                : 'hover:shadow-xs hover:scale-[1.005]'
                            }`}
                          >
                            <IconComp className="w-6 h-6 sm:w-7 sm:h-7 mb-0.5 drop-shadow-2xs group-hover:scale-105 transition-transform shrink-0" />
                            <div className="flex items-center gap-1 justify-center flex-wrap">
                              <span className="text-[clamp(8px,0.65vw,9.5px)] font-bold text-[var(--text)] leading-tight break-words">
                                {sc.title}
                              </span>
                              <span className="text-[6px] font-bold uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700">
                                Planned
                              </span>
                            </div>
                            <div className="text-[clamp(6.5px,0.55vw,7.5px)] text-[var(--secondary)] font-medium leading-tight mt-0.5 break-words">
                              {sc.sub}
                            </div>
                          </div>
                        );
                      }

                      // Stages 1, 2, 3: Horizontal sub-cards with natural text wrapping
                      return (
                        <div
                          key={sc.id}
                          onClick={() => onSelect?.({ type: 'stage', id: sc.id })}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onSelect?.({ type: 'stage', id: sc.id });
                            }
                          }}
                          className={`group rounded-md sm:rounded-lg border p-1 sm:p-1.5 transition-all cursor-pointer flex items-center gap-1 sm:gap-1.5 flex-1 min-h-0 ${
                            sc.bgTint
                          } ${
                            isSelected
                              ? 'ring-2 ring-purple-600 border-purple-600 dark:ring-purple-400 bg-white dark:bg-slate-900 shadow-md scale-[1.01]'
                              : 'hover:shadow-xs hover:scale-[1.005]'
                          }`}
                        >
                          <IconComp className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 drop-shadow-2xs group-hover:scale-105 transition-transform" />

                          {/* Title & Subtitle with Natural Text Wrapping */}
                          <div className="min-w-0 flex-1">
                            <div className="text-[clamp(8px,0.65vw,9px)] font-bold text-[var(--text)] leading-tight break-words">
                              {sc.title}
                            </div>
                            <div className="text-[clamp(6.5px,0.55vw,7.5px)] text-[var(--secondary)] font-medium leading-tight mt-0.5 break-words">
                              {sc.sub}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Connector Arrow to Next Column on wide viewports */}
                {!isLast && (
                  <div
                    aria-hidden="true"
                    className="hidden xl:flex absolute -right-1 top-1/2 -translate-y-1/2 z-10 w-2.5 h-2.5 text-slate-400 dark:text-slate-500 items-center justify-center pointer-events-none"
                  >
                    <ChevronRight className="w-2.5 h-2.5" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}
