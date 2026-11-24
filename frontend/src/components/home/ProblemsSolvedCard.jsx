import {
  AlertTriangle,
  Check,
  Clock,
  Flame,
  Layers,
  Shield,
} from 'lucide-react';
import { Card } from '../common/Card';

export const PROBLEMS_SOLVED_LIST = [
  {
    id: 'shortages',
    num: '01',
    title: 'WORKFORCE SHORTAGES',
    agentName: 'Workforce Planning Agent',
    icon: Clock,
    themeColor: 'rose',
    activeTheme:
      'ring-2 ring-rose-500 border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 shadow-sm',
    inactiveTheme:
      'border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-hover)]/40 hover:border-slate-300 dark:hover:border-slate-700',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    id: 'absenteeism',
    num: '02',
    title: 'ABSENTEEISM SPIKES',
    agentName: 'Attendance Agent',
    icon: AlertTriangle,
    themeColor: 'amber',
    activeTheme:
      'ring-2 ring-amber-500 border-amber-500 bg-amber-50/80 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 shadow-sm',
    inactiveTheme:
      'border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-hover)]/40 hover:border-slate-300 dark:hover:border-slate-700',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    id: 'attrition',
    num: '03',
    title: 'ATTRITION RISKS',
    agentName: 'Attrition Agent',
    icon: Flame,
    themeColor: 'purple',
    activeTheme:
      'ring-2 ring-purple-500 border-purple-500 bg-purple-50/80 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-sm',
    inactiveTheme:
      'border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-hover)]/40 hover:border-slate-300 dark:hover:border-slate-700',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  {
    id: 'overtime',
    num: '04',
    title: 'OVERTIME IMBALANCE',
    agentName: 'Overtime Agent',
    icon: Layers,
    themeColor: 'sky',
    activeTheme:
      'ring-2 ring-sky-500 border-sky-500 bg-sky-50/80 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 shadow-sm',
    inactiveTheme:
      'border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-hover)]/40 hover:border-slate-300 dark:hover:border-slate-700',
    iconColor: 'text-sky-600 dark:text-sky-400',
  },
  {
    id: 'skills',
    num: '05',
    title: 'SKILL MISMATCHES',
    agentName: 'Skills & Training Agent',
    icon: Shield,
    themeColor: 'emerald',
    activeTheme:
      'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 shadow-sm',
    inactiveTheme:
      'border-[var(--border)] bg-transparent text-[var(--text)] hover:bg-[var(--surface-hover)]/40 hover:border-slate-300 dark:hover:border-slate-700',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
  },
];

export function ProblemsSolvedCard({
  selected,
  onSelect,
  className = '',
}) {
  const handleSelect = (probId) => {
    onSelect?.({ type: 'problem', id: probId });
  };

  return (
    <Card
      className={`p-2 sm:p-2.5 flex flex-col justify-between border border-[var(--border)] shadow-xs select-none h-full min-h-0 overflow-hidden ${className}`}
    >
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-1.5 mb-1 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
            <Flame className="w-3 h-3" />
          </div>
          <h2 className="text-xs sm:text-[12.5px] font-extrabold text-[var(--text)] tracking-tight truncate">
            Problems Solved by Agents
          </h2>
        </div>
      </div>

      {/* 5 Clickable Horizontal Problem Rows - evenly distributed with flex-1 */}
      <div className="flex flex-col justify-between gap-1 sm:gap-1.5 flex-1 my-0.5 min-h-0">
        {PROBLEMS_SOLVED_LIST.map((prob) => {
          const isSelected =
            selected?.type === 'problem' && selected?.id === prob.id;
          const Icon = prob.icon;

          return (
            <div
              key={prob.id}
              onClick={() => handleSelect(prob.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(prob.id);
                }
              }}
              className={`rounded-lg sm:rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5 flex items-center justify-between transition-all cursor-pointer flex-1 min-h-0 border ${
                isSelected ? prob.activeTheme : prob.inactiveTheme
              }`}
            >
              {/* Left Side: Number + Title + Subtitle Agent */}
              <div className="flex items-center gap-2 min-w-0 pr-1.5">
                <span className="font-mono text-[10px] sm:text-[11px] font-black tracking-tight shrink-0">
                  {prob.num}
                </span>
                <div className="min-w-0">
                  <div className="text-[clamp(8.5px,0.7vw,11px)] font-black tracking-wide leading-tight break-words">
                    {prob.title}
                  </div>
                  <div className="text-[clamp(7px,0.55vw,8.5px)] opacity-75 font-medium leading-tight mt-0.5 break-words">
                    {prob.agentName}
                  </div>
                </div>
              </div>

              {/* Right Side: Status Badge + Icon */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isSelected && (
                  <span className="text-[7.5px] sm:text-[8px] font-extrabold tracking-wide uppercase px-1.5 py-0.2 rounded-full border border-current flex items-center gap-0.5 bg-white/70 dark:bg-black/40">
                    VIEWING <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
                <Icon className={`w-3.5 h-3.5 ${prob.iconColor}`} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default ProblemsSolvedCard;
