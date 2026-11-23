import { AlertCircle, CheckCircle2, ChevronRight, Clock, Settings, Sliders } from 'lucide-react';
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
          Connection Failed
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
    <Card className="p-4 flex flex-col justify-between h-[305px] border hover:border-purple-300 dark:hover:border-purple-800 transition-all duration-200 group">
      <div>
        {/* Top Header: Brand Icon + Status Badge */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-xs flex items-center justify-center shrink-0">
            <ConnectorIcon id={connector.id} className="w-10 h-10 object-cover" />
          </div>
          {renderStatusBadge()}
        </div>

        {/* Connector Name & Category Badge */}
        <div className="mb-2">
          <div className="flex items-center justify-between gap-1.5">
            <h3 className="text-xs font-bold text-slate-900 dark:text-white truncate" title={connector.name}>
              {connector.name}
            </h3>
            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0">
              {connector.category}
            </span>
          </div>
        </div>

        {/* Short Description */}
        <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-3 leading-relaxed mb-3">
          {connector.description}
        </p>
      </div>

      {/* Bottom Area: Supported Events + Connect Action */}
      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 mt-auto">
        {/* Supported Events count & backend status indicator */}
        <div className="flex items-center justify-between text-[10px] mb-2.5 text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            {connector.supportedEventsLabel}
          </span>
          <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 font-medium">
            Driver pending
          </span>
        </div>

        {/* Primary Action Button */}
        {isConnected ? (
          <button
            type="button"
            onClick={() => onConfigure(connector)}
            className="w-full h-8.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Manage Settings</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onConfigure(connector)}
            disabled={isConnecting}
            className="w-full h-8.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white shadow-xs transition-colors cursor-pointer disabled:opacity-60"
          >
            {isConnecting ? (
              <>
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : isFailed ? (
              <>
                <Settings className="w-3.5 h-3.5" />
                <span>Reconfigure / Retry</span>
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

