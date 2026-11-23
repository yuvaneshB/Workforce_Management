import { ArrowUpRight, Bot, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SUGGESTIONS = [
  'Which shift has the highest overtime?',
  'Show skill gaps by department',
  'What is the training compliance trend?',
  'Summarize workforce performance',
];

export function AIWorkforceBanner() {
  const navigate = useNavigate();

  function handleSelectQuestion(question) {
    navigate(`/assistant?q=${encodeURIComponent(question)}`);
  }

  return (
    <div className="surface rounded-2xl p-4.5 border border-[var(--border)] shadow-xs relative overflow-hidden flex flex-col justify-between h-full">
      {/* Decorative ambient sparkles in top right */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-4 text-[var(--brand-purple)]/10"
      >
        <Sparkles className="w-16 h-16" />
      </div>

      <div>
        {/* Header with Bot Icon, Title, and Description */}
        <div className="flex items-start gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] flex items-center justify-center shrink-0">
            <Bot className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
              AI Workforce Insights
            </h3>
            <p className="text-xs text-[var(--secondary)] mt-0.5">
              Ask questions and get data-driven insights about workforce, production, skills and compliance.
            </p>
          </div>
        </div>

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-[var(--secondary)] mr-1">
            Try asking:
          </span>
          {SUGGESTIONS.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectQuestion(q)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg border border-[var(--border)] surface text-[var(--text)] hover:border-[var(--brand-purple)] hover:text-[var(--brand-purple)] hover:bg-[var(--brand-purple-soft)] transition-colors cursor-pointer shadow-2xs"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => navigate('/assistant')}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-xs flex items-center gap-1.5 transition-all hover:opacity-95 cursor-pointer"
          style={{ background: 'var(--brand-purple)' }}
        >
          <ArrowUpRight className="w-4 h-4" />
          <span>Open AI Assistance</span>
        </button>
      </div>
    </div>
  );
}
