import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Factory,
  FileCheck2,
  Filter,
  Layers,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { Button } from './Button';
import {
  composeReviewNotes,
  getAgentReviewFindings,
  getAgentReviewMetrics,
  getAgentReviewRecommendations,
} from '../../utils/agentReviewConfig';
import { cleanText } from '../../utils/humanizeAgentOutput';

/**
 * Reusable HR Review Panel.
 * Docks to the left of the agent drawer on desktop (>=lg) and acts as a modal sheet below lg.
 */
export function AgentReviewPanel({
  isOpen,
  onClose,
  onSave,
  agentConfig = {},
  result,
  filters = {},
  executionId,
  initialNotes = '',
  reviewerName = 'Workspace User (HR)',
  returnFocusRef,
}) {
  const panelRef = useRef(null);
  const decisionRadioGroupRef = useRef(null);
  const idPrefix = useId();

  // Review states
  const [decision, setDecision] = useState(''); // 'Agree with findings' | 'Partially agree' | 'Need more information'
  const [notes, setNotes] = useState(initialNotes || '');
  const [reviewedFindingIds, setReviewedFindingIds] = useState(new Set());
  const [acceptedRecIds, setAcceptedRecIds] = useState(new Set());
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  // Derived content from real agent result
  const metrics = useMemo(() => {
    return getAgentReviewMetrics(agentConfig?.agentId, result, filters);
  }, [agentConfig?.agentId, result, filters]);

  const findings = useMemo(() => {
    return getAgentReviewFindings(result);
  }, [result]);

  const recommendations = useMemo(() => {
    return getAgentReviewRecommendations(result);
  }, [result]);

  // Sync initial notes if passed in
  useEffect(() => {
    if (initialNotes && !notes) {
      setNotes(initialNotes);
    }
  }, [initialNotes]);

  // Trap focus inside panel and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const panelEl = panelRef.current;
    if (!panelEl) return;

    // Focus the first interactive element or the container
    const focusableSelectors =
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const focusableElements = panelEl.querySelectorAll(focusableSelectors);
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    } else {
      panelEl.focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const currentFocusables = panelEl.querySelectorAll(focusableSelectors);
        if (currentFocusables.length === 0) return;
        const first = currentFocusables[0];
        const last = currentFocusables[currentFocusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      // Return focus to trigger button
      if (returnFocusRef?.current) {
        returnFocusRef.current.focus();
      }
    };
  }, [isOpen, onClose, returnFocusRef]);

  if (!isOpen) return null;

  // Checkbox handlers
  const toggleFindingReviewed = (id) => {
    setReviewedFindingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllFindings = () => {
    if (reviewedFindingIds.size === findings.length) {
      setReviewedFindingIds(new Set());
    } else {
      setReviewedFindingIds(new Set(findings.map((f) => f.id)));
    }
  };

  const toggleRecommendation = (id) => {
    setAcceptedRecIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Validation: disabled until decision is chosen, and if notes entered, it cannot be only whitespace
  const isNotesWhitespaceOnly = notes.length > 0 && !notes.trim();
  const isSaveDisabled = !decision || isNotesWhitespaceOnly || isSaving;

  // Handle Save
  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaveDisabled) return;

    setIsSaving(true);
    setSaveError(null);

    const acceptedTitles = recommendations
      .filter((r) => acceptedRecIds.has(r.id))
      .map((r) => r.title);

    const composedText = composeReviewNotes({
      decision,
      acceptedRecTitles: acceptedTitles,
      reviewedFindingsCount: reviewedFindingIds.size,
      totalFindings: findings.length,
      notes: notes.trim(),
    });

    try {
      if (typeof onSave === 'function') {
        await onSave(composedText, {
          decision,
          acceptedRecTitles: acceptedTitles,
          reviewedCount: reviewedFindingIds.size,
          totalFindings: findings.length,
          rawNotes: notes.trim(),
        });
      }
      onClose();
    } catch (err) {
      console.error('Failed to save HR review from panel:', err);
      setSaveError(err?.message || 'Failed to record HR review. Please retry.');
    } finally {
      setIsSaving(false);
    }
  };

  const severityBadgeClass = (sev) => {
    switch (sev) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800';
      case 'HIGH':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800';
      case 'MEDIUM':
      case 'MODERATE':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-800';
      default:
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800';
    }
  };

  const formattedDateTime = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const dateScopeLabel =
    filters?.date ||
    (filters?.startDate && filters?.endDate
      ? `${filters.startDate} - ${filters.endDate}`
      : 'Active Period');

  const plantScopeLabel = filters?.plantId || 'All Plants';
  const shiftScopeLabel = filters?.shiftId || 'All Shifts';

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${idPrefix}-review-title`}
      tabIndex={-1}
      className="fixed inset-0 lg:static z-50 lg:z-30 w-full lg:w-[440px] max-w-full lg:max-w-[440px] shrink-0 h-full pointer-events-auto bg-[var(--surface)] text-[var(--text)] border-r border-[var(--border)] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right-4 duration-200 outline-none"
    >
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-[var(--border)] bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent shrink-0">
        <div className="flex items-center gap-2 mb-1 text-[#493287] dark:text-purple-300 font-bold text-xs uppercase tracking-wider">
          <FileCheck2 className="w-4 h-4 text-[#493287] dark:text-purple-400" />
          <span>HR Review</span>
          <span className="text-slate-400 font-normal">•</span>
          <span className="truncate">{agentConfig?.agentName || 'Agent Review'}</span>
        </div>

        <h3
          id={`${idPrefix}-review-title`}
          className="text-sm font-extrabold text-[var(--text)] tracking-tight truncate"
        >
          {agentConfig?.agentName || 'Specialist Agent'} Evaluation
        </h3>

        {/* Filter Scope Chips & Execution ID */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2.5 text-[10px]">
          {executionId && (
            <span className="font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-[var(--border)]">
              {executionId}
            </span>
          )}
          <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{dateScopeLabel}</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-[var(--border)] flex items-center gap-1">
            <Factory className="w-3 h-3" />
            <span>{plantScopeLabel}</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-[var(--border)] flex items-center gap-1">
            <Layers className="w-3 h-3" />
            <span>{shiftScopeLabel}</span>
          </span>
        </div>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 no-scrollbar text-xs">
        {/* Error notification if save failed */}
        {saveError && (
          <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200 flex items-start gap-2 shadow-xs">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold block">Save Failed</span>
              <span>{saveError}</span>
            </div>
          </div>
        )}

        {/* 1. What You Are Reviewing (3 to 4 metrics) */}
        {metrics && metrics.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">
                What You Are Reviewing
              </h4>
              <span className="text-[10px] text-slate-400 font-medium">Ground Truth Data</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {metrics.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-[var(--border)] bg-slate-50/60 dark:bg-slate-900/40"
                >
                  <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                    {item.label}
                  </span>
                  <span className="text-base font-black text-[var(--text)] mt-0.5 block truncate">
                    {item.value}
                  </span>
                  {item.hint && (
                    <span className="text-[9.5px] text-slate-400 block truncate mt-0.5">
                      {item.hint}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 2. Findings Checklist */}
        {findings && findings.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">
                  Observed Findings ({findings.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={toggleAllFindings}
                className="text-[10px] font-bold text-purple-700 dark:text-purple-300 hover:underline cursor-pointer"
              >
                {reviewedFindingIds.size === findings.length ? 'Clear all' : 'Mark all reviewed'}
              </button>
            </div>

            <div className="space-y-2">
              {findings.map((f, idx) => {
                const isChecked = reviewedFindingIds.has(f.id);
                return (
                  <label
                    key={f.id || idx}
                    className={`block p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isChecked
                        ? 'border-purple-300 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/20 shadow-xs'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:bg-slate-50 dark:hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleFindingReviewed(f.id)}
                        className="mt-1 w-3.5 h-3.5 rounded border-slate-300 text-[#493287] focus:ring-[#493287] cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-bold border uppercase tracking-wider ${severityBadgeClass(
                              f.severity
                            )}`}
                          >
                            {f.severity}
                          </span>
                          <span className="text-[9.5px] font-mono text-slate-400">{f.id}</span>
                        </div>
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-[11.5px] leading-snug">
                          {f.title}
                        </div>
                        {f.metric && (
                          <div className="text-[10.5px] text-purple-700 dark:text-purple-300 mt-1 font-semibold truncate">
                            {f.metric}
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>
        )}

        {/* 3. Recommendations Acceptance Checklist */}
        {recommendations && recommendations.length > 0 && (
          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold uppercase tracking-wider text-[11px] text-slate-500 dark:text-slate-400">
                Action Plan Recommendations ({recommendations.length})
              </h4>
              <span className="text-[10px] text-slate-400">Accept to adopt</span>
            </div>

            <div className="space-y-2">
              {recommendations.map((rec, idx) => {
                const isAccepted = acceptedRecIds.has(rec.id);
                return (
                  <label
                    key={rec.id || idx}
                    className={`block p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                      isAccepted
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20 shadow-xs'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:bg-slate-50 dark:hover:bg-slate-900/40'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={isAccepted}
                        onChange={() => toggleRecommendation(rec.id)}
                        className="mt-1 w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-[11.5px] leading-snug flex items-center justify-between gap-1">
                          <span>{rec.title}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              isAccepted
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {isAccepted ? 'Accepted' : 'Pending'}
                          </span>
                        </div>
                        {rec.action && (
                          <div className="text-[10.5px] text-[var(--secondary)] mt-1 leading-relaxed">
                            {rec.action}
                          </div>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>
        )}

        {/* 4. Your Review & Decision Form */}
        <section className="space-y-3 pt-2 border-t border-[var(--border)]">
          <div>
            <label className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300 block mb-1.5">
              HR Review Assessment & Decision <span className="text-rose-500">*</span>
            </label>

            <div
              ref={decisionRadioGroupRef}
              role="radiogroup"
              aria-label="HR Review Decision"
              className="grid grid-cols-1 gap-2"
            >
              {[
                {
                  value: 'Agree with findings',
                  desc: 'Endorse agent observations and adopt recommendations',
                },
                {
                  value: 'Partially agree',
                  desc: 'Acknowledge observations with operational caveats',
                },
                {
                  value: 'Need more information',
                  desc: 'Request additional shopfloor telemetry or follow-up audit',
                },
              ].map((opt) => {
                const isSelected = decision === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-purple-500 dark:border-purple-600 bg-purple-50/50 dark:bg-purple-950/40 text-purple-950 dark:text-purple-100 shadow-xs'
                        : 'border-[var(--border)] bg-[var(--surface)] hover:bg-slate-50 dark:hover:bg-slate-900/40'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${idPrefix}-hr-decision`}
                      value={opt.value}
                      checked={isSelected}
                      onChange={(e) => setDecision(e.target.value)}
                      className="mt-1 w-3.5 h-3.5 text-[#493287] border-slate-300 focus:ring-[#493287] cursor-pointer"
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-[11.5px] block leading-tight">
                        {opt.value}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                        {opt.desc}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Notes Textarea */}
          <div className="space-y-1">
            <label
              htmlFor={`${idPrefix}-hr-notes`}
              className="font-bold uppercase tracking-wider text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between"
            >
              <span>HR Review Notes / Operational Justification</span>
              <span className="text-[10px] text-slate-400 font-normal">Plain text</span>
            </label>

            <textarea
              id={`${idPrefix}-hr-notes`}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={agentConfig?.notesPlaceholder || 'Add administrative review notes...'}
              rows={3}
              className="w-full text-xs p-2.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder:text-slate-400 resize-none"
            />

            {agentConfig?.realisticExample && (
              <p className="text-[10px] text-slate-400 italic leading-snug">
                Example: &ldquo;{agentConfig.realisticExample}&rdquo;
              </p>
            )}
          </div>

          {/* Reviewer Meta Footer Info */}
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-[var(--border)] flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>
                Reviewer: <strong className="text-[var(--text)]">{reviewerName}</strong>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{formattedDateTime}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Controls */}
      <div className="px-5 py-3.5 border-t border-[var(--border)] bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between gap-3 shrink-0">
        <Button
          variant="outline"
          size="sm"
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className="h-8 px-4 text-xs cursor-pointer"
        >
          Cancel
        </Button>

        <Button
          size="sm"
          type="button"
          onClick={handleSave}
          disabled={isSaveDisabled}
          className="h-8 px-4 text-xs font-semibold text-white disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          style={{
            background: isSaveDisabled
              ? undefined
              : 'linear-gradient(135deg, #493287 0%, #5B44A3 100%)',
          }}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Saving Review...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Save Review</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default AgentReviewPanel;

