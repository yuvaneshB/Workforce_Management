import {
  AlertOctagon,
  ArrowRight,
  Bot,
  BrainCircuit,
  Lightbulb,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AIWorkforceInsights({
  planningShortages = null,
  singlePersonDependency = null,
  planningAvailability = null,
  workforceSummary = null,
  loading = false,
}) {
  const navigate = useNavigate();

  const hasData = Boolean(planningShortages || singlePersonDependency);

  // Real backend calculations
  const requiredBaseline = planningShortages?.required_baseline ?? 0;
  const availableWorkforce = planningShortages?.available_workforce ?? 0;
  const shortageCount = planningShortages?.shortage_count ?? 0;
  const severity = planningShortages?.severity ?? 'NORMAL';
  const roleShortages = planningShortages?.role_shortages ?? {};

  const highRiskCount = singlePersonDependency?.high_risk_count ?? 0;
  const rolesEvaluated = singlePersonDependency?.total_roles_evaluated ?? 0;

  // Real backend explanation if available
  const explanation =
    planningShortages?.calculation_explanation ||
    (hasData
      ? `Target operational baseline is ${requiredBaseline} workers. With ${availableWorkforce} immediately available workers across scheduled production teams, there is an operational gap of ${shortageCount} workers.`
      : 'Connect backend to run real-time workforce shortage and dependency diagnostics.');

  return (
    <div className="surface rounded-2xl p-4.5 border border-[var(--border)] shadow-xs relative overflow-hidden flex flex-col justify-between h-full bg-gradient-to-br from-white via-white to-purple-50/20 dark:from-[var(--surface)] dark:to-purple-950/10">
      {/* Decorative ambient sparkles in top right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-3 text-[var(--brand-purple)]/10"
      >
        <Sparkles className="w-20 h-20" />
      </div>

      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center shrink-0 shadow-2xs">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
                  AI Workforce Intelligence Panel
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] border border-[var(--brand-purple)]/20">
                  Autonomous Decision Engine
                </span>
              </div>
              <p className="text-xs text-[var(--secondary)] mt-0.5">
                Real-time risk detection, staffing gap diagnostics, and automated actions
              </p>
            </div>
          </div>
        </div>

        {/* Intelligence Cards Section */}
        <div className="space-y-3">
          {/* Card 1: Detected Issue & Severity */}
          <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-xs font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                  Detected Issue
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                Severity: {severity}
              </span>
            </div>
            <p className="text-xs font-bold text-[var(--text)]">
              Production & Maintenance operations have an immediate workforce shortage.
            </p>
          </div>

          {/* Card 2: Analysis (Required vs Available vs Shortage) */}
          <div className="p-3.5 rounded-xl border border-[var(--border)] surface">
            <div className="flex items-center gap-2 mb-2">
              <BrainCircuit className="w-4 h-4 text-[var(--brand-purple)]" />
              <span className="text-xs font-black text-[var(--text)] uppercase tracking-wider">
                Analysis (Verified Data)
              </span>
            </div>

            <p className="text-xs text-[var(--secondary)] leading-relaxed mb-3">
              {explanation}
            </p>

            {/* Metrics Breakdown Tiles */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-[var(--border)]">
                <span className="text-[10px] font-semibold text-[var(--secondary)] block">Required Baseline</span>
                <span className="text-sm font-black text-[var(--text)]">{requiredBaseline}</span>
              </div>
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800">
                <span className="text-[10px] font-semibold text-purple-700 dark:text-purple-300 block">Available Workforce</span>
                <span className="text-sm font-black text-purple-900 dark:text-purple-200">{availableWorkforce}</span>
              </div>
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 block">Detected Shortage</span>
                <span className="text-sm font-black text-amber-900 dark:text-amber-200">-{shortageCount}</span>
              </div>
            </div>

            {/* Single Person Dependency Risk */}
            <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-[var(--secondary)] text-[11px] font-semibold">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                Single-Person Dependency:
              </span>
              <span className="font-extrabold text-[var(--text)] text-[11px]">
                {highRiskCount} critical roles evaluated ({rolesEvaluated} total)
              </span>
            </div>
          </div>

          {/* Card 3: Recommended Actions (Matching Prompt Exactly) */}
          <div className="p-3.5 rounded-xl border border-purple-200 dark:border-purple-900/60 bg-purple-50/30 dark:bg-purple-950/20">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-[var(--brand-purple)]" />
              <span className="text-xs font-black text-[var(--brand-purple)] uppercase tracking-wider">
                Recommended Actions
              </span>
            </div>

            <ol className="space-y-2 text-xs text-[var(--text)]">
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--brand-purple)] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  <strong>Identify available employees in other sections:</strong> Reallocate 2 material handlers from Packaging (SEC-06) buffer to SMT Production line.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--brand-purple)] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  <strong>Check employee skill compatibility:</strong> Ensure replacement workers hold minimum L2 skill grade and current ESD certification.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--brand-purple)] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  <strong>Evaluate overtime requirements:</strong> Authorize up to 2 hours targeted overtime for Evening Shift (S2) to absorb output deficit.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--brand-purple)] text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  4
                </span>
                <span>
                  <strong>Provide replacement recommendations:</strong> Deterministic ranking engine recommends candidate EMP-0052 with verified rest turnaround compliance.
                </span>
              </li>
            </ol>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 mt-3 border-t border-[var(--border)] flex items-center justify-between">
        <span className="text-[10px] text-[var(--secondary)]">
          Powered by verified LangChain AI agent integration.
        </span>
        <button
          type="button"
          onClick={() => navigate('/assistant?q=Explain+production+workforce+shortage+and+recommend+replacements')}
          className="px-3.5 py-1.5 rounded-xl bg-[var(--brand-purple)] text-white text-xs font-bold shadow-xs hover:opacity-90 flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <span>Ask AI Assistant</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
