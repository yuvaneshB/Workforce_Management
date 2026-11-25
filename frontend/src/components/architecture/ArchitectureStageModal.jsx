import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Wrench,
  X,
} from 'lucide-react';
import { useEffect } from 'react';

export function ArchitectureStageModal({ stage, onClose, onSelectStage, totalStages = 5 }) {
  // Handle escape key to close
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!stage) return null;

  const currentId = stage.id;
  const prevId = currentId > 1 ? currentId - 1 : totalStages;
  const nextId = currentId < totalStages ? currentId + 1 : 1;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="architecture-modal-title"
    >
      <div
        className="surface w-full max-w-4xl rounded-2xl border border-[var(--border)] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4.5 border-b border-[var(--border)] bg-[var(--page-bg)] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-black tracking-wider uppercase"
              style={{
                background: 'var(--brand-purple-soft)',
                color: 'var(--brand-purple)',
                border: '1px solid rgba(53, 43, 109, 0.25)',
              }}
            >
              Stage {stage.badge}
            </span>
            <div className="min-w-0">
              <h2
                id="architecture-modal-title"
                className="text-lg sm:text-xl font-extrabold text-[var(--text)] tracking-tight truncate"
              >
                {stage.title}
              </h2>
              <p className="text-[11px] sm:text-xs text-[var(--secondary)] font-medium truncate mt-0.5">
                {stage.tech}
              </p>
            </div>
          </div>

          {/* Quick Stage Switcher Pills & Close */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1 bg-[var(--surface)] p-1 rounded-lg border border-[var(--border)]">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => onSelectStage(num)}
                  className={`w-7 h-7 rounded text-xs font-bold transition-all cursor-pointer ${
                    currentId === num
                      ? 'bg-[var(--brand-purple)] text-white shadow-xs'
                      : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--muted-fill)]'
                  }`}
                  title={`Jump to Stage ${num}`}
                >
                  {num}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-lg grid place-items-center text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--muted-fill)] transition-colors cursor-pointer"
              aria-label="Close stage details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section 1: Stage Overview */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--brand-purple)]" />
              <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--brand-purple)]">
                1. Stage Overview
              </h3>
            </div>
            <div className="p-4 rounded-xl bg-[var(--page-bg)] border border-[var(--border)] space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5">
                <span className="text-sm font-bold text-[var(--text)]">
                  Stage {stage.badge} – {stage.title}
                </span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]">
                  {stage.overview.tagline}
                </span>
              </div>
              <p className="text-xs text-[var(--text)] leading-relaxed">
                <strong>Business Purpose: </strong>
                {stage.overview.purpose}
              </p>
              <p className="text-xs text-[var(--secondary)] leading-relaxed">
                <strong>Why this stage exists: </strong>
                {stage.overview.whyExists}
              </p>
            </div>
          </section>

          {/* Section 2: What Happens in This Stage */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--brand-blue)]" />
              <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--brand-blue)]">
                2. What Happens in This Stage
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {stage.whatHappens.map((step, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-[var(--page-bg)] border border-[var(--border)] flex gap-3 items-start"
                >
                  <span
                    className="w-5 h-5 rounded-full shrink-0 grid place-items-center text-[10px] font-black text-white mt-0.5"
                    style={{ background: 'var(--brand-purple)' }}
                  >
                    {idx + 1}
                  </span>
                  <p className="text-xs text-[var(--text)] leading-snug">{step}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Section 3: Components & Responsibilities */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[var(--brand-orange)]" />
              <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--brand-orange)]">
                3. Components & Responsibilities
              </h3>
            </div>
            <div className="border border-[var(--border)] rounded-xl overflow-hidden bg-[var(--page-bg)]">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--muted-fill)] text-[var(--secondary)]">
                      <th className="py-2.5 px-3.5 font-bold">Component / Technology</th>
                      <th className="py-2.5 px-3.5 font-bold">Code Reference / Source</th>
                      <th className="py-2.5 px-3.5 font-bold">Verified Responsibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {stage.components.map((comp, idx) => (
                      <tr key={idx} className="hover:bg-[var(--surface)] transition-colors">
                        <td className="py-2.5 px-3.5 font-bold text-[var(--text)] whitespace-nowrap">
                          {comp.name}
                        </td>
                        <td className="py-2.5 px-3.5 font-mono text-[11px] text-[var(--brand-purple)] whitespace-nowrap">
                          {comp.file}
                        </td>
                        <td className="py-2.5 px-3.5 text-[var(--secondary)] leading-relaxed">
                          {comp.role}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Stage 04 Special Highlight: 11 Analytics & 3 Planning Tools */}
          {stage.id === 4 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[var(--brand-purple)]" />
                <h3 className="text-xs font-bold tracking-wider uppercase text-[var(--text)]">
                  Registered LangChain Tools Inventory (14 Tools Total)
                </h3>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {/* 11 Analytics Tools */}
                <div className="p-3.5 rounded-xl bg-[var(--page-bg)] border border-[var(--border)] space-y-2">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                    <span className="text-xs font-bold text-[var(--brand-purple)] uppercase tracking-wider">
                      Analytics Tools (11)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[var(--brand-purple-soft)] text-[var(--brand-purple)]">
                      workforce_tools.py
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {[
                      { name: 'get_workforce_summary', desc: 'Total roster, active count, new joiners, exits, and plant breakdown' },
                      { name: 'get_attendance_analytics', desc: 'Present, absent, on-leave, late records and overall attendance rates' },
                      { name: 'get_department_analytics', desc: 'Headcount and HR allocation across 6 manufacturing departments' },
                      { name: 'get_shift_analytics', desc: 'Attendance and headcount distribution across General (GS1), S2, and NS3' },
                      { name: 'get_experience_analytics', desc: 'Tenure bands (<1 yr, 1-3 yrs, 3-5 yrs, 5+ yrs) across production teams' },
                      { name: 'get_section_analytics', desc: 'Assembly, Surface Mount, Quality, Logistics, and Testing line allocations' },
                      { name: 'get_overtime_analytics', desc: 'Shift overtime hours, cost impact, and threshold violation monitoring' },
                      { name: 'get_team_production_analytics', desc: 'Units produced, target vs actual yields, defect correlations per team' },
                      { name: 'get_shift_efficiency_analytics', desc: 'Manufacturing labor productivity and units produced per man-hour' },
                      { name: 'get_skills_analytics', desc: 'Skill level distribution (L1 basic through L4 expert) across workforce' },
                      { name: 'get_compliance_analytics', desc: 'Safety certification status (LOTO, IPC-A-610, First Aid, RF Test)' },
                    ].map((tool, tIdx) => (
                      <div key={tIdx} className="text-xs p-1.5 rounded bg-[var(--surface)] border border-[var(--border)]">
                        <span className="font-mono font-bold text-[var(--brand-purple)]">{tIdx + 1}. {tool.name}</span>
                        <p className="text-[11px] text-[var(--secondary)] mt-0.5">{tool.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3 Planning Tools */}
                <div className="p-3.5 rounded-xl bg-[var(--page-bg)] border border-[var(--border)] space-y-2">
                  <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                    <span className="text-xs font-bold text-[var(--brand-blue)] uppercase tracking-wider">
                      Workforce Planning Tools (3)
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[var(--brand-blue-soft)] text-[var(--brand-blue)]">
                      planning_tools.py
                    </span>
                  </div>
                  <div className="space-y-2">
                    {[
                      {
                        name: 'get_workforce_shortage',
                        desc: 'Compares target operational staffing baseline (30 workers per shift) against active present roster to detect critical line shortages.',
                      },
                      {
                        name: 'get_shift_workforce_availability',
                        desc: 'Calculates date-specific shift headcounts distinguishing PRESENT, ABSENT, LEAVE, and LATE personnel for upcoming rotations.',
                      },
                      {
                        name: 'recommend_replacement_employees',
                        desc: 'Executes deterministic multi-criteria scoring (skill level match, active safety certifications, shift compatibility, rest hours) to rank eligible replacement candidates.',
                      },
                    ].map((tool, tIdx) => (
                      <div key={tIdx} className="text-xs p-2.5 rounded bg-[var(--surface)] border border-[var(--border)]">
                        <span className="font-mono font-bold text-[var(--brand-blue)]">{tIdx + 1}. {tool.name}</span>
                        <p className="text-[11px] text-[var(--secondary)] mt-1">{tool.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Section 4 & 5: Inputs & Processing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Section 4: Inputs */}
            <div className="p-4 rounded-xl bg-[var(--page-bg)] border border-[var(--border)] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--brand-cyan)]" />
                <h4 className="text-xs font-bold tracking-wider uppercase text-[var(--brand-cyan)]">
                  4. Inputs & Origins
                </h4>
              </div>
              <p className="text-xs text-[var(--secondary)]">
                <strong>Source: </strong>
                {stage.inputs.source}
              </p>
              <ul className="space-y-1.5 mt-2">
                {stage.inputs.items.map((item, idx) => (
                  <li key={idx} className="text-xs text-[var(--text)] flex items-start gap-2">
                    <span className="text-[var(--brand-cyan)] font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 5: Processing */}
            <div className="p-4 rounded-xl bg-[var(--page-bg)] border border-[var(--border)] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--brand-purple)]" />
                <h4 className="text-xs font-bold tracking-wider uppercase text-[var(--brand-purple)]">
                  5. Processing & Transformations
                </h4>
              </div>
              <ul className="space-y-1.5 mt-1">
                {stage.processing.map((proc, idx) => (
                  <li key={idx} className="text-xs text-[var(--text)] flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--brand-purple)] shrink-0 mt-0.5" />
                    <span>{proc}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 6 & 7: Outputs & Connection to Next Stage */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Section 6: Outputs */}
            <div className="p-4 rounded-xl bg-[var(--page-bg)] border border-[var(--border)] space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--brand-emerald)]" />
                <h4 className="text-xs font-bold tracking-wider uppercase text-[var(--brand-emerald)]">
                  6. Outputs & Destination
                </h4>
              </div>
              <p className="text-xs text-[var(--secondary)]">
                <strong>Destination: </strong>
                {stage.outputs.destination}
              </p>
              <ul className="space-y-1.5 mt-2">
                {stage.outputs.items.map((item, idx) => (
                  <li key={idx} className="text-xs text-[var(--text)] flex items-start gap-2">
                    <span className="text-[var(--brand-emerald)] font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Section 7: Connection to Next Stage */}
            <div className="p-4 rounded-xl bg-[var(--page-bg)] border border-[var(--border)] space-y-2">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-3.5 h-3.5 text-[var(--brand-blue)]" />
                <h4 className="text-xs font-bold tracking-wider uppercase text-[var(--brand-blue)]">
                  7. Connection to Next Stage
                </h4>
              </div>
              <p className="text-xs text-[var(--text)] leading-relaxed">
                {stage.nextStageConnection}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer with Prev / Next Navigation */}
        <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-t border-[var(--border)] bg-[var(--page-bg)] shrink-0">
          <button
            type="button"
            onClick={() => onSelectStage(prevId)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold text-[var(--text)] hover:bg-[var(--muted-fill)] border border-[var(--border)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Previous Stage ({String(prevId).padStart(2, '0')})
          </button>

          <span className="text-xs font-semibold text-[var(--secondary)]">
            Stage {stage.badge} of {String(totalStages).padStart(2, '0')}
          </span>

          <button
            type="button"
            onClick={() => onSelectStage(nextId)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold text-white transition-all cursor-pointer shadow-xs"
            style={{ background: 'var(--brand-purple)' }}
          >
            Next Stage ({String(nextId).padStart(2, '0')})
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
