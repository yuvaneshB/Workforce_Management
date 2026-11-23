import { ArrowUp, Loader2 } from 'lucide-react';

export function ChatInput({ value, onChange, onSubmit, inputRef, loading = false }) {
  function handleSubmit(event) {
    event.preventDefault();
    if (!value.trim() || loading) return;
    onSubmit();
  }

  const isDisabled = !value.trim() || loading;

  return (
    <div
      className="p-3 sm:px-4 sm:py-3 border-t shrink-0"
      style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 rounded-xl border px-3 py-1.5"
        style={{ borderColor: 'var(--border)', background: 'var(--brand-bg)' }}
      >
        <input
          ref={inputRef}
          id="chatInput"
          type="text"
          value={value}
          disabled={loading}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-transparent outline-none py-1 text-xs text-[var(--text)] placeholder:text-slate-400 disabled:opacity-60"
          placeholder={loading ? 'Thinking...' : 'Ask a workforce question...'}
          aria-label="Ask a workforce question"
        />
        <button
          type="submit"
          disabled={isDisabled}
          aria-label="Send message"
          className="rounded-lg w-8 h-8 grid place-items-center text-white cursor-pointer transition-all hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          style={{ background: '#6F3DBA' }}
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ArrowUp className="w-3.5 h-3.5" />
          )}
        </button>
      </form>
      <div className="text-[10px] muted mt-1.5 text-center">
        Powered by Domo AI &amp; LangChain · Grounded in verified Neon PostgreSQL workforce data.
      </div>
    </div>
  );
}

