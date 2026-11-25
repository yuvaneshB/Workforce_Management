import {
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Layers,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import React from 'react';

export function AgentExecutionPipeline({
  stages = [],
  isExecuting = false,
  activeStageId = null,
  activeMessage = '',
  elapsedSeconds = 0,
  error = null,
  totalDurationMs = null,
  executionId = null,
  onRetry = null,
  collapsible = false,
  defaultCollapsed = false,
}) {
  const isCompleted = !isExecuting && !error && stages.every((s) => s.status === 'completed');
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  // If executing, always keep expanded so progress is visible
  const showDetails = !collapsible || isExecuting || !isCollapsed;

  return (
    <div className="p-3.5 rounded-xl border border-[var(--border)] bg-gradient-to-br from-slate-50/70 to-purple-50/20 dark:from-slate-900/60 dark:to-purple-950/10 select-none">
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${showDetails ? 'mb-2.5' : ''}`}>
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--text)]">
            Execution Pipeline
          </span>
          {stages.length > 0 && (
            <span className="text-[10px] text-slate-400 font-normal">
              ({stages.length} Stages)
            </span>
          )}
          {executionId && (
            <span className="text-[9.5px] font-mono text-slate-400 hidden sm:inline">
              ({executionId})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 text-[10px] font-semibold">
          {isExecuting ? (
            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>
                Stage {activeStageId || 1}: Processing ({elapsedSeconds}s)
              </span>
            </span>
          ) : isCompleted ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                Completed in {totalDurationMs ? `${(totalDurationMs / 1000).toFixed(1)}s` : `${elapsedSeconds}s`}
              </span>
            </span>
          ) : error ? (
            <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Failed</span>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="ml-1 px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-[9px] hover:underline cursor-pointer"
                >
                  Retry
                </button>
              )}
            </div>
          ) : (
            <span className="text-slate-400">Ready to execute</span>
          )}

          {collapsible && !isExecuting && (
            <button
              type="button"
              onClick={() => setIsCollapsed((prev) => !prev)}
              className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800 text-purple-600 dark:text-purple-400 font-bold flex items-center transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand pipeline stages' : 'Collapse pipeline stages'}
              aria-label={isCollapsed ? 'Expand pipeline stages' : 'Collapse pipeline stages'}
            >
              {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {showDetails && (
        <>
          {/* Grid of Real Stages */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5 text-[10.5px]">
            {stages.map((s) => {
              const isDone = s.status === 'completed';
              const isRunning = s.status === 'running' || (isExecuting && s.id === activeStageId);
              const isFailed = s.status === 'failed';

              return (
                <div
                  key={s.id}
                  className={`p-2 rounded-lg border flex flex-col justify-between transition-all ${
                    isDone
                      ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-300'
                      : isRunning
                      ? 'border-purple-400 bg-purple-50/60 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 shadow-xs ring-1 ring-purple-400/40'
                      : isFailed
                      ? 'border-rose-300 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20 text-rose-700 dark:text-rose-300'
                      : 'border-[var(--border)] bg-[var(--surface)] text-[var(--secondary)] opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold gap-1">
                    <span className="truncate">{s.name}</span>
                    {isDone ? (
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : isRunning ? (
                      <Loader2 className="w-3 h-3 animate-spin text-purple-600 dark:text-purple-400 shrink-0" />
                    ) : isFailed ? (
                      <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                    )}
                  </div>
                  <span className="text-[9px] font-mono mt-1 opacity-80">
                    {s.duration_ms ? `${s.duration_ms}ms` : isRunning ? 'running...' : isFailed ? 'failed' : 'pending'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Live Stage Status / Backend Message Callout */}
          {(isExecuting || error) && (
            <div
              className={`mt-2 p-2 rounded-lg border text-[11px] flex items-center justify-between gap-2 ${
                error
                  ? 'bg-rose-50/60 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300'
                  : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text)]'
              }`}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                {error ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping shrink-0" />
                )}
                <span className="truncate font-medium">
                  {error ? `Execution Error: ${error}` : activeMessage || 'Backend analyzing operational records...'}
                </span>
              </div>

              {error && onRetry && (
                <button
                  onClick={onRetry}
                  className="flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 text-white font-bold text-[10px] hover:bg-rose-700 shrink-0 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Retry Analysis
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AgentExecutionPipeline;

