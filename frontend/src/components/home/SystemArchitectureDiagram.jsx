import {
  ArrowLeftRight,
  ArrowUpDown,
  Atom,
  Database,
  Layers,
  Link,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Card } from '../common/Card';

export function SystemArchitectureDiagram({
  selectedId = 'ai-agent',
  onSelect,
}) {
  return (
    <Card className="p-4 lg:col-span-7 flex flex-col justify-between min-h-[380px] border border-[var(--border)] shadow-xs">
      <div>
        {/* Section Header */}
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold text-[var(--text)] whitespace-nowrap">
            System Architecture
          </h2>
        </div>

        {/* Diagram Flow Container */}
        <div className="relative pt-1 pb-2 flex flex-col items-center">
          {/* Top Node: Domo AI Services */}
          <div className="flex justify-center mb-1 w-full">
            <div
              onClick={() => onSelect('domo')}
              className={`w-48 p-2 rounded-xl border text-center transition-all cursor-pointer select-none ${
                selectedId === 'domo'
                  ? 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/60 ring-2 ring-purple-400/40 shadow-sm'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-purple-300 dark:hover:border-purple-700'
              }`}
            >
              <div className="flex items-center justify-center gap-1.5 text-purple-600 dark:text-purple-400">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">Domo AI Services</span>
              </div>
              <div className="text-[9.5px] font-semibold text-[var(--secondary)]">
                (Text Generation)
              </div>
            </div>
          </div>

          {/* Vertical Arrow between Domo AI and AI Agent */}
          <div className="h-4 flex items-center justify-center text-[var(--secondary)]">
            <ArrowUpDown className="w-3.5 h-3.5 text-purple-500" />
          </div>

          {/* Main Horizontal Flow: Neon -> FastAPI -> AI Agent -> React */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center w-full">
            {/* 1. Data Source (Neon PostgreSQL) */}
            <div
              onClick={() => onSelect('neon')}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer h-full flex flex-col justify-between select-none ${
                selectedId === 'neon'
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/60 ring-2 ring-blue-400/40 shadow-sm'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <div className="text-center mb-1.5">
                <div className="text-[11px] font-extrabold text-[var(--text)]">Data Source</div>
                <div className="text-[9px] text-[var(--secondary)] font-semibold">(Neon PostgreSQL)</div>
              </div>
              <div className="space-y-1">
                {[
                  'Employee Data',
                  'Attendance Data',
                  'Shift Calendar',
                  'Production Data',
                  'Department Data',
                  'Vendor Data',
                  'Attrition Data',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-1 text-[9.5px] font-medium text-[var(--text)] bg-[var(--surface-hover)] px-1.5 py-0.5 rounded border border-[var(--border)]"
                  >
                    <Database className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                    <span className="truncate">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. FastAPI (API Layer) */}
            <div className="relative h-full flex flex-col justify-center">
              {/* Connector to Neon */}
              <div
                onClick={() => onSelect('fastapi')}
                className={`p-2.5 rounded-xl border transition-all cursor-pointer h-full flex flex-col justify-between select-none ${
                  selectedId === 'fastapi'
                    ? 'border-cyan-500 bg-cyan-50/70 dark:bg-cyan-950/60 ring-2 ring-cyan-400/40 shadow-sm'
                    : 'border-[var(--border)] bg-[var(--surface)] hover:border-cyan-300 dark:hover:border-cyan-700'
                }`}
              >
                <div className="text-center mb-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-100 dark:bg-cyan-950 text-cyan-600 mx-auto flex items-center justify-center mb-1">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div className="text-[11px] font-extrabold text-[var(--text)]">FastAPI</div>
                  <div className="text-[9px] text-[var(--secondary)] font-semibold">(API Layer)</div>
                </div>

                <div className="space-y-1.5 mt-auto">
                  {['API Gateway', 'Data Retrieval', 'Analytics Processing'].map((sub) => (
                    <div
                      key={sub}
                      className="text-[9px] font-semibold text-center text-[var(--secondary)] bg-[var(--surface-hover)] py-0.5 px-1 rounded border border-[var(--border)]"
                    >
                      {sub}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 3. AI Agent (LangChain) - Highlighted */}
            <div
              onClick={() => onSelect('ai-agent')}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer h-full flex flex-col justify-between select-none ${
                selectedId === 'ai-agent'
                  ? 'border-[#6F3DBA] bg-purple-50 dark:bg-purple-950/70 ring-2 ring-purple-500/50 shadow-md'
                  : 'border-purple-300 dark:border-purple-800 bg-purple-50/40 dark:bg-purple-950/30 hover:border-purple-500'
              }`}
            >
              <div className="text-center mb-2">
                <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300 mx-auto flex items-center justify-center mb-1">
                  <Link className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-extrabold text-purple-700 dark:text-purple-300">
                  AI Agent
                </div>
                <div className="text-[9px] text-purple-600/80 dark:text-purple-400 font-semibold">
                  (LangChain)
                </div>
              </div>

              <div className="space-y-1.5 mt-auto">
                {[
                  'Central AI Agent',
                  'Workforce Analytics Tools',
                  'Agent Decision Making',
                ].map((item) => (
                  <div
                    key={item}
                    className="text-[9px] font-bold text-center text-purple-700 dark:text-purple-300 bg-purple-100/70 dark:bg-purple-900/40 py-0.5 px-1 rounded border border-purple-200 dark:border-purple-800 truncate"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* 4. React (Vite) Frontend */}
            <div
              onClick={() => onSelect('react')}
              className={`p-2.5 rounded-xl border transition-all cursor-pointer h-full flex flex-col justify-between select-none ${
                selectedId === 'react'
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/60 ring-2 ring-blue-400/40 shadow-sm'
                  : 'border-[var(--border)] bg-[var(--surface)] hover:border-blue-300 dark:hover:border-blue-700'
              }`}
            >
              <div className="text-center mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 mx-auto flex items-center justify-center mb-1">
                  <Atom className="w-4 h-4" />
                </div>
                <div className="text-[11px] font-extrabold text-[var(--text)]">React (Vite)</div>
                <div className="text-[9px] text-[var(--secondary)] font-semibold">Frontend</div>
              </div>

              <div className="space-y-1.5 mt-auto">
                {[
                  'Workforce Dashboard',
                  'Analytics',
                  'Workforce Planning',
                  'AI Assistance',
                ].map((item) => (
                  <div
                    key={item}
                    className="text-[9px] font-semibold text-center text-[var(--secondary)] bg-[var(--surface-hover)] py-0.5 px-1 rounded border border-[var(--border)] truncate"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--secondary)]">
        <span>Click any architecture tier to inspect capabilities</span>
        <span className="font-bold text-purple-600 dark:text-purple-400">
          Interactive Architecture Flow
        </span>
      </div>
    </Card>
  );
}

