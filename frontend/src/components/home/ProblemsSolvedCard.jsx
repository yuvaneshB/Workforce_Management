import {
  AlertTriangle,
  Award,
  Check,
  Clock,
  Flame,
  Layers,
  Shield,
  ShieldAlert,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { Card } from '../common/Card';

export const PROBLEMS_SOLVED_LIST = [
  {
    id: 'shortages',
    num: '01',
    title: 'WORKFORCE SHORTAGES',
    subtitle: 'Assembly & Machining Line Deficits',
    metric: 'NS3 Shift Deficits',
    icon: Clock,
    themeColor: 'rose',
    activeTheme: 'border-2 border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 shadow-xs',
    inactiveTheme: 'border-[var(--border)] text-rose-700/80 dark:text-rose-400 hover:border-rose-400 hover:bg-rose-50/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
    badge: 'VIEWING ✓',
  },
  {
    id: 'absenteeism',
    num: '02',
    title: 'ABSENTEEISM SPIKES',
    subtitle: 'Unscheduled Absence on Peak Days',
    metric: '16.2% Absent/Late',
    icon: AlertTriangle,
    themeColor: 'amber',
    activeTheme: 'border-2 border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 shadow-xs',
    inactiveTheme: 'border-[var(--border)] text-amber-700/80 dark:text-amber-400 hover:border-amber-400 hover:bg-amber-50/30',
    iconColor: 'text-amber-600 dark:text-amber-400',
    badge: 'VIEWING ✓',
  },
  {
    id: 'attrition',
    num: '03',
    title: 'ATTRITION RISKS',
    subtitle: 'Contractor vs Permanent Turnover',
    metric: '7.1% Turnover (120 Exits)',
    icon: Flame,
    themeColor: 'purple',
    activeTheme: 'border-2 border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 shadow-xs',
    inactiveTheme: 'border-[var(--border)] text-purple-700/80 dark:text-purple-400 hover:border-purple-400 hover:bg-purple-50/30',
    iconColor: 'text-purple-600 dark:text-purple-400',
    badge: 'VIEWING ✓',
  },
  {
    id: 'overtime',
    num: '04',
    title: 'OVERTIME IMBALANCE',
    subtitle: '58k OT Hours & Fatigue Concentration',
    metric: '58,433 Hours • $1.46M Spend',
    icon: Layers,
    themeColor: 'sky',
    activeTheme: 'border-2 border-sky-500 bg-sky-50/70 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 shadow-xs',
    inactiveTheme: 'border-[var(--border)] text-sky-700/80 dark:text-sky-400 hover:border-sky-400 hover:bg-sky-50/30',
    iconColor: 'text-sky-600 dark:text-sky-400',
    badge: 'VIEWING ✓',
  },
  {
    id: 'skills',
    num: '05',
    title: 'SKILL MISMATCHES',
    subtitle: 'Certification Deficits at Key Stations',
    metric: '18 Station Gaps • 2,927 Skills',
    icon: Shield,
    themeColor: 'rose',
    activeTheme: 'border-2 border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 shadow-xs',
    inactiveTheme: 'border-[var(--border)] text-rose-700/80 dark:text-rose-400 hover:border-rose-400 hover:bg-rose-50/30',
    iconColor: 'text-rose-600 dark:text-rose-400',
    badge: 'VIEWING ✓',
  },
];

export function ProblemsSolvedCard({
  selectedProblem = 'shortages',
  onSelectProblem,
  className = '',
}) {
  return (
    <Card className={`p-3.5 sm:p-4 flex flex-col justify-between h-[390px] border border-[var(--border)] shadow-xs select-none ${className}`}>
      {/* Top Header Row */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-[13px] sm:text-sm font-extrabold text-[var(--text)] tracking-tight">
            Problems Solved by Agents
          </h2>
        </div>

        <span className="text-[9px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-2 py-0.5 rounded-md">
          5 CORE PROBLEMS
        </span>
      </div>

      {/* 5 Clickable Horizontal Problem Rows */}
      <div className="flex flex-col justify-between gap-1.5 flex-1 my-1">
        {PROBLEMS_SOLVED_LIST.map((prob) => {
          const isSelected = selectedProblem === prob.id;
          const Icon = prob.icon;

          return (
            <div
              key={prob.id}
              onClick={() => onSelectProblem?.(prob.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectProblem?.(prob.id);
                }
              }}
              className={`rounded-xl px-3 py-2 sm:py-2.5 flex items-center justify-between transition-all cursor-pointer ${
                isSelected ? prob.activeTheme : prob.inactiveTheme
              }`}
            >
              {/* Left Side: Number + Title */}
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-mono text-xs sm:text-[13px] font-black tracking-tight shrink-0">
                  {prob.num}
                </span>
                <span className="text-xs sm:text-[12.5px] font-black tracking-wide truncate">
                  {prob.title}
                </span>
              </div>

              {/* Right Side: Status Badge + Icon */}
              <div className="flex items-center gap-2 shrink-0">
                {isSelected && (
                  <span className="text-[9.5px] font-extrabold tracking-wide uppercase px-2 py-0.5 rounded-full border border-current flex items-center gap-1 bg-white/60 dark:bg-black/30">
                    VIEWING <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </span>
                )}
                <Icon className={`w-4 h-4 ${prob.iconColor}`} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Card Footer Bar */}
      <div className="flex items-center justify-between text-[9px] text-[var(--secondary)] pt-1.5 border-t border-[var(--border)] mt-1">
        <span>Click any problem card to inspect operational failure points below</span>
        <span className="font-mono text-[8.5px] text-purple-600 dark:text-purple-400 font-bold">
          Dynamic Sync Active
        </span>
      </div>
    </Card>
  );
}

export default ProblemsSolvedCard;
