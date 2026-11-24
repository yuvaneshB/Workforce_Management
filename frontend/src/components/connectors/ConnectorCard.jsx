import { AlertCircle, CheckCircle2, ChevronRight, Clock, RefreshCw, Settings, Sliders } from 'lucide-react';
import { Card } from '../common/Card';
import { ConnectorIcon } from './ConnectorIcons';

export function ConnectorCard({ connector, connectionState, onConfigure }) {
  const status = connectionState?.status || 'not_connected'; // 'not_connected' | 'connecting' | 'connected' | 'failed'
  const isConnecting = status === 'connecting';
  const isConnected = status === 'connected';
  const isFailed = status === 'failed';

  // Badge styling according to connection status
  function renderStatusBadge() {
    if (isConnected) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          Connected
        </span>
      );
    }
    if (isFailed) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
          Failed
        </span>
      );
    }
    if (isConnecting) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400 animate-spin" />
          Connecting...
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Not Connected
      </span>
    );
  }

  return (
    <Card className="p-3 flex flex-col justify-between h-[158px] border hover:border-violet-300 dark:hover:border-violet-800 transition-all duration-200 group">
      {/* Top Row: 40px Icon + Name and Status Badge in same row */}
      <div className="flex items-start gap-2.5 min-w-0">
        <div
          onClick={() => onConfigure?.(connector)}
          className="w-10 h-10 rounded-xl overflow-hidden shadow-xs flex items-center justify-center shrink-0 cursor-pointer"
          title="Click to view details and configuration"
        >
          <ConnectorIcon id={connector.id} className="w-10 h-10 object-cover" />
        </div>

        <div className="flex-1 min-w-0">
          <h3
            onClick={() => onConfigure?.(connector)}
            className="text-xs font-bold text-slate-900 dark:text-white leading-tight break-words cursor-pointer hover:text-violet-600 dark:hover:text-violet-400 transition-colors line-clamp-1"
            title={connector.description}
          >
            {connector.name}
          </h3>
          <div className="mt-1">{renderStatusBadge()}</div>
        </div>
      </div>

      {/* Bottom: Full Width Connect Button with h-9 */}
      <div className="mt-auto pt-2">
        {isConnected ? (
          <button
            type="button"
            onClick={() => onConfigure?.(connector)}
            className="w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manage Settings</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onConfigure?.(connector)}
            disabled={isConnecting}
            className="w-full h-9 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 active:scale-[0.99] text-white shadow-xs transition-all cursor-pointer disabled:opacity-60"
          >
            {isConnecting ? (
              <>
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : isFailed ? (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </>
            ) : (
              <>
                <span>Connect</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>
    </Card>
  );
}

export default ConnectorCard;
