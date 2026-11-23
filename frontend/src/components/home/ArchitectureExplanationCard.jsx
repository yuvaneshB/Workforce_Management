import {
  Atom,
  CheckCircle2,
  Database,
  Info,
  Link,
  Settings,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Card } from '../common/Card';

const COMPONENT_DETAILS = {
  'ai-agent': {
    name: 'AI Agent (LangChain)',
    icon: Link,
    iconColor: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-900/60 border-purple-200 dark:border-purple-800',
    desc: 'The central AI layer that understands workforce-related user requests, selects relevant workforce analytics tools, retrieves actual data through the backend APIs and generates useful insights and recommendations using the configured AI service.',
    functions: [
      'Understands workforce queries in natural language.',
      'Selects and executes relevant analytics tools.',
      'Retrieves workforce information through the API layer.',
      'Generates actionable insights and recommendations.',
    ],
  },
  fastapi: {
    name: 'FastAPI (API Layer)',
    icon: Zap,
    iconColor: 'text-cyan-600 dark:text-cyan-400',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/60 border-cyan-200 dark:border-cyan-800',
    desc: 'High-performance Python API framework powering data retrieval, real-time analytics processing, and secure communication between the UI, database, and AI agent.',
    functions: [
      'Validates and routes all incoming frontend and agent API requests.',
      'Executes optimized SQL queries and aggregate calculations.',
      'Enforces read-only database connections and schema boundaries.',
      'Provides sub-second response times for complex workforce metrics.',
    ],
  },
  neon: {
    name: 'Data Source (Neon PostgreSQL)',
    icon: Database,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/60 border-blue-200 dark:border-blue-800',
    desc: 'Serverless PostgreSQL database hosting the workforce management system of record, including attendance, shifts, production, departments, vendors, and historical exits.',
    functions: [
      'Maintains normalized dimensional tables (dim_workforce, dim_shift_calendar).',
      'Stores high-volume fact records for hourly production and daily attendance.',
      'Powers relational joins across departments, sections, teams, and vendors.',
      'Ensures data integrity and ACID compliance across all operations.',
    ],
  },
  domo: {
    name: 'Domo AI Services (Text Generation)',
    icon: Sparkles,
    iconColor: 'text-purple-600 dark:text-purple-400',
    iconBg: 'bg-purple-100 dark:bg-purple-900/60 border-purple-200 dark:border-purple-800',
    desc: 'Enterprise AI services integration providing natural language generation, predictive workforce insights, and intelligent replacement candidate recommendations.',
    functions: [
      'Generates human-like conversational responses for complex queries.',
      'Synthesizes multi-source manufacturing KPIs into executive summaries.',
      'Powers predictive shortage and absenteeism impact assessments.',
      'Recommends optimal replacement workers based on skills match.',
    ],
  },
  react: {
    name: 'React (Vite) Frontend',
    icon: Atom,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-100 dark:bg-blue-900/60 border-blue-200 dark:border-blue-800',
    desc: 'Modern enterprise single-page application built with React, Vite, and Tailwind CSS delivering responsive executive dashboards, interactive charts, and live AI assistance.',
    functions: [
      'Renders modular dashboards with interactive Recharts visualizations.',
      'Provides synchronized global filtering across dates, plants, and departments.',
      'Implements interactive conversational AI chat interface with markdown formatting.',
      'Ensures full responsive compatibility across desktop, tablet, and mobile views.',
    ],
  },
};

export function ArchitectureExplanationCard({ selectedId = 'ai-agent' }) {
  const current = COMPONENT_DETAILS[selectedId] || COMPONENT_DETAILS['ai-agent'];
  const Icon = current.icon;

  return (
    <Card className="p-4 lg:col-span-5 flex flex-col justify-between min-h-[300px] border border-[var(--border)] shadow-xs">
      <div>
        {/* Header */}
        <div className="flex items-center gap-2 mb-2.5">
          <Info className="w-4 h-4 text-blue-600 shrink-0" aria-hidden="true" />
          <h2 className="text-[13px] sm:text-sm font-bold text-[var(--text)] whitespace-nowrap">
            Architecture – Explanation
          </h2>
        </div>

        {/* Selected Component Pill */}
        <div className="flex items-center gap-2 mb-3 text-[11px] font-bold text-[var(--text)]">
          <span className="text-[var(--secondary)] font-medium">Selected Component :</span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-extrabold text-[11px]">
            <Icon className="w-3.5 h-3.5" />
            {current.name}
          </span>
        </div>

        {/* Description Row with Component Badge */}
        <div className="flex flex-col sm:flex-row items-start gap-3 mb-3.5">
          <div
            className={`w-24 h-24 rounded-2xl flex flex-col items-center justify-center p-2 text-center shrink-0 border ${current.iconBg} ${current.iconColor} shadow-xs`}
          >
            <Icon className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-extrabold leading-tight">
              {current.name.split(' (')[0]}
            </span>
            <span className="text-[8px] font-semibold opacity-80 mt-0.5">
              {current.name.includes('(') ? `(${current.name.split('(')[1]}` : ''}
            </span>
          </div>

          <p className="text-[11px] text-[var(--secondary)] leading-relaxed flex-1">
            {current.desc}
          </p>
        </div>

        {/* Key Functions */}
        <div>
          <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-[var(--text)] mb-2">
            <Settings className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Key Functions</span>
          </div>
          <div className="space-y-1.5">
            {current.functions.map((fn, idx) => (
              <div key={idx} className="flex items-start gap-2 text-[10.5px] text-[var(--text)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                <span className="leading-snug">{fn}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--secondary)]">
        <span>Architectural Role</span>
        <span className="font-bold text-purple-600">Enterprise Verified</span>
      </div>
    </Card>
  );
}

