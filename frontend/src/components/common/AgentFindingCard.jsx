import React from 'react';
import {
  MapPin,
  Search,
  AlertTriangle,
  Sparkles,
  Info,
} from 'lucide-react';
import { parseAgentFinding, normalizeFindings } from '../../utils/humanizeAgentOutput.js';

/**
 * Severity badge styling helper using project theme tokens.
 */
function getSeverityBadge(sev) {
  const s = String(sev || 'MODERATE').toUpperCase();
  if (s === 'HIGH' || s === 'CRITICAL') {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-900';
  }
  if (s === 'LOW' || s === 'MINOR') {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900';
  }
  return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900';
}

/**
 * Single Agent Finding / Recommendation Card
 */
export function AgentFindingCard({ finding, className = '' }) {
  const parsed = parseAgentFinding(finding);

  if (!parsed) return null;

  // Fallback for plain text or unparseable text
  if (!parsed.isStructured) {
    return (
      <div
        className={`p-3.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text)] leading-relaxed shadow-xs ${className}`}
      >
        <p className="whitespace-pre-wrap">{parsed.text}</p>
      </div>
    );
  }

  const { id, title, severity, metric, where, what, why, action, unknownFields } = parsed;

  return (
    <div
      className={`p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] shadow-xs transition-all hover:border-[#CFC8E6] dark:hover:border-purple-800/80 space-y-2.5 ${className}`}
    >
      {/* Heading Row: Severity Badge + Bold Title + Muted ID Tag */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0 flex-1">
          <span
            className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border shrink-0 mt-0.5 tracking-wider ${getSeverityBadge(
              severity
            )}`}
          >
            {severity}
          </span>
          <h4 className="text-xs font-bold text-[var(--text)] leading-snug break-words">
            {title}
          </h4>
        </div>
        {id && (
          <span className="text-[10px] font-mono font-semibold text-[var(--secondary)] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded shrink-0">
            {id}
          </span>
        )}
      </div>

      {/* Observed Metric Highlight (Accent-Soft Background) */}
      {metric && (
        <div className="p-2.5 rounded-lg bg-[#ECE9F5] dark:bg-purple-950/40 border border-[#CFC8E6] dark:border-purple-800/60 flex items-center justify-between text-xs gap-2">
          <span className="text-[11px] font-semibold text-[#493287] dark:text-[#A290DB]">
            Observed Metric:
          </span>
          <span className="font-bold font-mono text-[#493287] dark:text-purple-200 text-right truncate">
            {metric}
          </span>
        </div>
      )}

      {/* Labeled Rows with Small Icons */}
      <div className="space-y-2 pt-1 text-xs text-[var(--text)]">
        {/* Where */}
        {where && (
          <div className="flex items-start gap-2 text-[11.5px] leading-relaxed">
            <MapPin className="w-3.5 h-3.5 text-[#493287] dark:text-purple-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-[var(--text)]">Where: </strong>
              <span className="text-[var(--secondary)]">{where}</span>
            </div>
          </div>
        )}

        {/* What we found */}
        {what && (
          <div className="flex items-start gap-2 text-[11.5px] leading-relaxed">
            <Search className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-[var(--text)]">What we found: </strong>
              <span className="text-[var(--text)]">{what}</span>
            </div>
          </div>
        )}

        {/* Why it matters */}
        {why && (
          <div className="flex items-start gap-2 text-[11.5px] leading-relaxed">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-rose-700 dark:text-rose-400">
                Why it matters:{' '}
              </strong>
              <span className="text-[var(--secondary)]">{why}</span>
            </div>
          </div>
        )}

        {/* Suggested action (with accent left border) */}
        {action && (
          <div className="border-l-2 border-[#493287] dark:border-[#A290DB] pl-2.5 py-1.5 my-1 bg-purple-50/40 dark:bg-purple-950/20 rounded-r-lg flex items-start gap-2 text-[11.5px] leading-relaxed">
            <Sparkles className="w-3.5 h-3.5 text-[#493287] dark:text-[#A290DB] shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold text-[#493287] dark:text-purple-300">
                Suggested action:{' '}
              </strong>
              <span className="text-[var(--text)]">{action}</span>
            </div>
          </div>
        )}

        {/* Unknown Fields */}
        {unknownFields &&
          unknownFields.map((uf, uIdx) => (
            <div key={uIdx} className="flex items-start gap-2 text-[11px] leading-relaxed">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold text-slate-600 dark:text-slate-400">
                  {uf.label}:{' '}
                </strong>
                <span className="text-[var(--secondary)]">{uf.value}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

/**
 * List container for multiple findings
 */
export function AgentFindingList({ findings = [], emptyMessage = 'No observed findings recorded.', className = '' }) {
  const items = normalizeFindings(findings);

  if (items.length === 0) {
    return (
      <div className="p-3.5 rounded-xl border border-dashed border-[var(--border)] text-center text-xs text-[var(--secondary)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, idx) => (
        <AgentFindingCard key={item.id || idx} finding={item} />
      ))}
    </div>
  );
}

export default AgentFindingCard;

