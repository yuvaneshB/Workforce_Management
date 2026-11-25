import { Database, Layers, LayoutGrid } from 'lucide-react';

export function HomeTopCommandBar({ activeTab = 'architecture', onSelectTab }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none mb-1">
      {/* Left Mode Toggles */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSelectTab && onSelectTab('architecture')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs ${
            activeTab === 'architecture'
              ? 'bg-[#493287] text-white shadow-slate-500/20'
              : 'surface text-[var(--secondary)] hover:text-[var(--text)] border border-[var(--border)]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Workforce Architecture & Operations Command</span>
        </button>

        <button
          onClick={() => onSelectTab && onSelectTab('overview')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-[#493287] text-white shadow-xs'
              : 'surface text-[var(--secondary)] hover:text-[var(--text)] border border-[var(--border)]'
          }`}
        >
          <LayoutGrid className="w-4 h-4" />
          <span>Executive Overview & Analytics</span>
        </button>
      </div>

      {/* Right Database Grounding Notice */}
      <div className="flex items-center gap-2 text-[11px] text-[var(--secondary)]">
        <span>Database Grounding:</span>
        <span className="font-extrabold text-[var(--text)]">
          Neon PostgreSQL 18 Enterprise Tables
        </span>
        <span className="inline-flex items-center gap-1 font-black text-emerald-600 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
          Zero Mock Data
        </span>
      </div>
    </div>
  );
}
