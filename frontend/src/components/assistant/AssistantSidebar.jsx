import { MessageSquare, Plus } from 'lucide-react';

export function AssistantSidebar({
  onNewConversation,
  conversationId,
  messageCount = 0,
  firstQuestion = '',
}) {
  const sessionTitle = firstQuestion ? firstQuestion : 'New conversation';

  return (
    <aside
      className="w-full lg:w-[230px] shrink-0 p-3.5 sm:p-4 border-b lg:border-b-0 lg:border-r flex flex-col justify-between h-full overflow-y-auto"
      style={{ borderColor: 'var(--border)', background: 'var(--brand-bg)' }}
    >
      <div>
        <button
          type="button"
          onClick={onNewConversation}
          className="w-full rounded-lg px-3 py-2 text-xs text-white font-bold cursor-pointer transition-opacity hover:opacity-90 flex items-center justify-center gap-2 shadow-xs"
          style={{ background: '#6F3DBA' }}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New conversation</span>
        </button>

        <div className="text-[9px] muted font-bold tracking-widest mt-5 mb-2.5">
          ACTIVE SESSION
        </div>
        {conversationId || messageCount > 0 ? (
          <div
            className="rounded-lg border p-2.5 text-left text-[10px]"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          >
            <div className="flex items-center gap-1.5 font-semibold" style={{ color: '#6F3DBA' }}>
              <MessageSquare className="w-3.5 h-3.5 shrink-0" />
              <span>Current Session</span>
            </div>
            <div className="text-[10px] font-medium text-[var(--text)] mt-1 truncate" title={sessionTitle}>
              {sessionTitle}
            </div>
            <div className="text-[9px] muted mt-1">
              {messageCount} {messageCount === 1 ? 'message' : 'messages'}
            </div>
          </div>
        ) : (
          <div className="text-[10px] muted py-2.5 text-center">No active conversation</div>
        )}
      </div>
    </aside>
  );
}


