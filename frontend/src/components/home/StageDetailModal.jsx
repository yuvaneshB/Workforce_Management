import { CheckCircle2, Shield, X, Zap } from 'lucide-react';

export function StageDetailModal({ stage, onClose }) {
  if (!stage) return null;

  const StageIcon = stage.icon || Zap;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="surface w-full max-w-xl rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)] bg-[var(--surface-hover)]">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border ${stage.iconBg || 'bg-purple-50 text-[#5932EA] border-purple-200 dark:bg-purple-950/50 dark:border-purple-800'}`}
            >
              <StageIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-[var(--secondary)] uppercase tracking-wider">
                Stage {stage.id || stage.num} • Architecture Pipeline
              </div>
              <h3 className="text-base font-extrabold text-[var(--text)]">
                {stage.title} <span className="text-sm font-semibold text-[var(--secondary)]">({stage.tech})</span>
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--muted-fill)] transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto no-scrollbar">
          {/* Overview */}
          <div>
            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider mb-1.5">
              Role & Responsibility
            </h4>
            <p className="text-xs text-[var(--secondary)] leading-relaxed">
              {stage.description}
            </p>
          </div>

          {/* Core Capabilities */}
          <div>
            <h4 className="text-xs font-bold text-[var(--text)] uppercase tracking-wider mb-2">
              Pipeline Capabilities
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(stage.items || []).map((item, idx) => {
                const title = item.title || item.name || (typeof item === 'string' ? item : `Capability ${idx + 1}`);
                const detail = item.desc || item.detail || item.sub || '';
                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex items-start gap-2 shadow-2xs"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[var(--text)] truncate">{title}</div>
                      {detail && (
                        <div className="text-[10.5px] text-[var(--secondary)] mt-0.5 leading-snug">
                          {detail}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Technical Specifications */}
          <div className="p-3.5 rounded-xl bg-[var(--surface-hover)] border border-[var(--border)]">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-[var(--text)]">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>Technical Implementation</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-[var(--secondary)]">Protocol / Layer:</span>{' '}
                <span className="font-semibold text-[var(--text)]">{stage.protocol || 'REST / JSON / SQL'}</span>
              </div>
              <div>
                <span className="text-[var(--secondary)]">Security:</span>{' '}
                <span className="font-semibold text-[var(--text)]">{stage.security || 'Role-Based Read-Only'}</span>
              </div>
              <div>
                <span className="text-[var(--secondary)]">Execution Time:</span>{' '}
                <span className="font-semibold text-[var(--text)]">{stage.latency || '< 150 ms'}</span>
              </div>
              <div>
                <span className="text-[var(--secondary)]">Availability:</span>{' '}
                <span className="font-semibold text-emerald-600 font-bold">99.9% Uptime</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[var(--border)] bg-[var(--surface-hover)] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-[var(--secondary)]">
            <Shield className="w-3.5 h-3.5 text-blue-600" />
            <span>Enterprise Verified Pipeline Component</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-[var(--primary)] text-white text-xs font-bold shadow-xs hover:opacity-90 transition-opacity cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

