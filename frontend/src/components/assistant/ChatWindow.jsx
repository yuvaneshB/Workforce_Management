import { useEffect, useRef } from 'react';
import { ArrowUpRight, Bot, RotateCcw, Sparkles } from 'lucide-react';
import { ASSISTANT_SUGGESTIONS } from '../../utils/constants';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';

export function ChatWindow({
  messages = [],
  inputValue,
  onInputChange,
  onSelectSuggestion,
  onSendMessage,
  onNewConversation,
  inputRef,
  loading = false,
  isThinking = false,
  error = null,
  missingProvider = false,
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0 || isThinking || loading) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isThinking, loading]);

  const subtitle = missingProvider
    ? 'LLM Provider Not Configured'
    : 'Enterprise Workforce Intelligence';

  return (
    <div className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
      <div
        className="px-5 py-3 border-b flex items-center justify-between shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8.5 h-8.5 rounded-xl grid place-items-center shrink-0"
            style={{ background: 'var(--purple-soft)', color: '#493287' }}
          >
            <Bot className="w-4.5 h-4.5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-[var(--text)]">Workforce Assistant</div>
            <div className="text-[10px] muted mt-0.5">{subtitle}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {(loading || isThinking) && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#493287] animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-[#493287]" />
              <span>Thinking...</span>
            </div>
          )}
          {onNewConversation && (messages.length > 0 || isThinking || loading) && (
            <button
              type="button"
              onClick={onNewConversation}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--border)] hover:bg-[var(--surface-hover)] text-[var(--text)] transition-colors cursor-pointer shadow-2xs"
              title="Start a new conversation"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>New Chat</span>
            </button>
          )}
        </div>
      </div>

      {messages.length === 0 ? (
        <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable] p-6 sm:p-8 flex flex-col items-center justify-center text-center min-h-0">
          <div className="max-w-3xl w-full flex flex-col items-center">
            <div
              className="w-12 h-12 rounded-2xl grid place-items-center mb-3 shrink-0 shadow-xs"
              style={{ background: 'var(--purple-soft)', color: '#493287' }}
            >
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-center text-[var(--text)]">
              Your Workforce Intelligence Assistant
            </h2>
            <p className="text-xs muted text-center max-w-lg mt-1.5 leading-relaxed">
              Ask questions about manpower availability, attendance, skills, shifts, departments,
              and section staffing.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full mt-6 text-left">
              {ASSISTANT_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => onSelectSuggestion(suggestion)}
                  className="suggestion text-left rounded-xl border p-3 sm:px-4 sm:py-3 text-xs font-medium cursor-pointer transition-all hover:bg-[var(--surface-hover)] hover:border-[#493287]/40 hover:shadow-xs flex items-center justify-between gap-3 group"
                  style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
                >
                  <span className="leading-snug text-[var(--text)] group-hover:text-[#493287] transition-colors">
                    {suggestion}
                  </span>
                  <ArrowUpRight className="w-4 h-4 shrink-0 text-slate-400 group-hover:text-[#493287] transition-colors" />
                </button>
              ))}
            </div>

            <p className="text-[11px] muted mt-4">
              Suggested prompts execute real workforce analytical tools and models.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto [scrollbar-gutter:stable] p-4 sm:p-6 min-h-0">
          <div className="max-w-4xl mx-auto w-full space-y-4">
            {messages
              .filter(
                (msg) =>
                  msg.role === 'user' ||
                  (msg.content && msg.content.trim() !== '') ||
                  msg.isError ||
                  msg.isMissingProvider
              )
              .map((msg) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  isError={msg.isError}
                  isMissingProvider={msg.isMissingProvider}
                />
              ))}
            {(isThinking || loading) && (
              <div className="flex justify-start w-full animate-in fade-in duration-200">
                <div className="flex items-start gap-2.5 max-w-[90%] sm:max-w-2xl">
                  <div
                    className="w-7 h-7 rounded-lg grid place-items-center shrink-0 mt-0.5 animate-pulse"
                    style={{ background: 'var(--purple-soft)', color: '#493287' }}
                    aria-label="Assistant Thinking"
                  >
                    <Bot className="w-4 h-4" />
                  </div>
                  <div
                    className="rounded-2xl rounded-tl-sm border px-4 py-2.5 text-xs flex items-center gap-2 shadow-xs border-[var(--border)] surface text-[var(--text)]"
                  >
                    <span className="font-semibold text-xs text-[#493287] dark:text-purple-300">Thinking</span>
                    <div className="flex gap-1 items-center">
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#493287] animate-bounce"
                        style={{ animationDelay: '0ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#493287] animate-bounce"
                        style={{ animationDelay: '150ms' }}
                      />
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-[#493287] animate-bounce"
                        style={{ animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      <ChatInput
        value={inputValue}
        onChange={onInputChange}
        onSubmit={onSendMessage}
        inputRef={inputRef}
        loading={loading || isThinking}
      />
    </div>
  );
}
