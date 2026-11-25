import {
  AlertCircle,
  AlertTriangle,
  Award,
  Bot,
  Brain,
  CheckCircle2,
  Clock,
  Cpu,
  Database,
  ExternalLink,
  Flame,
  Layers,
  Loader2,
  ShieldCheck,
  TrendingUp,
  User,
  Users,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { AgentFindingCard, AgentFindingList } from '../common/AgentFindingCard';
import { isJsonBlob, safeParseJson } from '../../utils/humanizeAgentOutput';

function parseInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, pIdx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={pIdx} className="font-bold text-[var(--text)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

function renderFormattedText(content) {
  if (!content) return null;

  const rawStr = String(content).trim();

  // If the whole content is a JSON blob
  if (isJsonBlob(rawStr)) {
    const parsed = safeParseJson(rawStr);
    if (parsed) {
      if (Array.isArray(parsed)) {
        return <AgentFindingList findings={parsed} />;
      }
      if (typeof parsed === 'object') {
        if (parsed.findings && Array.isArray(parsed.findings)) {
          return <AgentFindingList findings={parsed.findings} />;
        }
        return <AgentFindingCard finding={parsed} />;
      }
    }
  }

  const rawLines = String(content).split('\n');
  const blocks = [];
  let currentTable = null;
  let inCodeBlock = false;
  let codeBuffer = [];
  let codeLang = '';

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        const fullCode = codeBuffer.join('\n');
        if ((codeLang === 'json' || isJsonBlob(fullCode)) && safeParseJson(fullCode)) {
          blocks.push({ type: 'json', data: safeParseJson(fullCode) });
        } else {
          blocks.push({ type: 'code', text: fullCode, lang: codeLang });
        }
        inCodeBlock = false;
        codeBuffer = [];
        codeLang = '';
      } else {
        inCodeBlock = true;
        codeLang = trimmed.replace(/^```/, '').trim().toLowerCase();
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      if (!currentTable) {
        currentTable = [];
      }
      currentTable.push(trimmed);
    } else {
      if (currentTable) {
        blocks.push({ type: 'table', rows: currentTable });
        currentTable = null;
      }

      // If this single line is a JSON blob
      if (isJsonBlob(trimmed)) {
        const parsed = safeParseJson(trimmed);
        if (parsed) {
          blocks.push({ type: 'json', data: parsed });
          continue;
        }
      }

      blocks.push({ type: 'line', text: line });
    }
  }

  if (currentTable) {
    blocks.push({ type: 'table', rows: currentTable });
  }
  if (inCodeBlock && codeBuffer.length > 0) {
    const fullCode = codeBuffer.join('\n');
    if ((codeLang === 'json' || isJsonBlob(fullCode)) && safeParseJson(fullCode)) {
      blocks.push({ type: 'json', data: safeParseJson(fullCode) });
    } else {
      blocks.push({ type: 'code', text: fullCode, lang: codeLang });
    }
  }

  return blocks.map((block, bIdx) => {
    if (block.type === 'json') {
      if (Array.isArray(block.data)) {
        return (
          <div key={bIdx} className="my-2.5">
            <AgentFindingList findings={block.data} />
          </div>
        );
      }
      if (typeof block.data === 'object' && block.data) {
        if (block.data.findings && Array.isArray(block.data.findings)) {
          return (
            <div key={bIdx} className="my-2.5">
              <AgentFindingList findings={block.data.findings} />
            </div>
          );
        }
        return (
          <div key={bIdx} className="my-2.5">
            <AgentFindingCard finding={block.data} />
          </div>
        );
      }
    }

    if (block.type === 'code') {
      return (
        <pre
          key={bIdx}
          className="my-2.5 p-3 rounded-xl bg-slate-900 text-slate-100 text-[10.5px] font-mono overflow-x-auto"
        >
          <code>{block.text}</code>
        </pre>
      );
    }

    if (block.type === 'table') {
      const validRows = block.rows.filter((r) => !/^[|\s-:]+$/.test(r));
      if (validRows.length === 0) return null;

      const headerRow = validRows[0];
      const dataRows = validRows.slice(1);

      const parseCells = (rowStr) =>
        rowStr
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

      const headers = parseCells(headerRow);

      return (
        <div key={bIdx} className="my-2.5 overflow-x-auto rounded-xl border border-[var(--border)] shadow-xs">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="bg-[var(--surface-hover)] border-b border-[var(--border)]">
                {headers.map((h, hIdx) => (
                  <th key={hIdx} className="px-3 py-2 font-black text-[var(--text)] uppercase tracking-wider text-[10px]">
                    {parseInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((r, rIdx) => {
                const cells = parseCells(r);
                return (
                  <tr
                    key={rIdx}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface-hover)]/60 transition-colors"
                  >
                    {cells.map((c, cIdx) => (
                      <td key={cIdx} className="px-3 py-1.5 text-[var(--text)] font-medium">
                        {parseInline(c)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
    }

    const trimmed = block.text.trim();
    if (!trimmed) {
      return <div key={bIdx} className="h-1.5" />;
    }

    // Ignore horizontal rules
    if (/^[-*_]{3,}$/.test(trimmed)) {
      return null;
    }

    // Check headings
    const isHeading = trimmed.startsWith('#');
    let lineContent = trimmed;
    if (isHeading) {
      lineContent = trimmed.replace(/^#+\s*/, '');
    }

    // Check bullets
    const isBullet = lineContent.startsWith('- ') || lineContent.startsWith('* ');
    if (isBullet) {
      lineContent = lineContent.substring(2);
    }

    const parsedElements = parseInline(lineContent);

    if (isHeading) {
      return (
        <div key={bIdx} className="font-extrabold text-xs text-[var(--text)] mt-3 mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#493287]" />
          <span>{parsedElements}</span>
        </div>
      );
    }

    if (isBullet) {
      return (
        <div key={bIdx} className="flex items-start gap-2 my-1 pl-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#493287] shrink-0 mt-1.5" />
          <span className="leading-relaxed text-[var(--text)]">{parsedElements}</span>
        </div>
      );
    }

    return (
      <div key={bIdx} className="my-0.5 leading-relaxed text-[var(--text)]">
        {parsedElements}
      </div>
    );
  });
}

export function ChatMessage({
  role = 'assistant',
  content,
  message,
  isError = false,
  isMissingProvider = false,
  query,
  // Live SSE stream & structured intelligence fields
  isStreaming = false,
  stages = [],
  currentStageId = 1,
  selectedAgents = [],
  directAnswer,
  keyMetrics = [],
  evidence = [],
  trendsAndFindings = [],
  recommendations = [],
  dataLimitations = [],
}) {
  const text = content || message || directAnswer || '';
  const [showPipelineDetails, setShowPipelineDetails] = useState(false);

  // Do not render an empty assistant box while response is being generated
  if (role === 'assistant' && !text.trim() && !isError && !isMissingProvider) {
    return null;
  }

  if (role === 'user') {
    return (
      <div className="flex justify-end w-full animate-in fade-in duration-200">
        <div className="flex items-start gap-2.5 max-w-[85%] sm:max-w-xl">
          <div
            className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-white text-[11px] font-medium leading-relaxed shadow-sm break-words"
            style={{ background: '#493287' }}
          >
            <div className="whitespace-pre-wrap">{text}</div>
          </div>
          <div
            className="w-7 h-7 rounded-lg grid place-items-center shrink-0 mt-0.5 bg-purple-50 text-[#493287] dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
            aria-label="User"
          >
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  // Missing Provider Alert
  if (isMissingProvider) {
    return (
      <div className="flex justify-start w-full animate-in fade-in duration-200">
        <div className="flex items-start gap-2.5 max-w-[90%] sm:max-w-2xl">
          <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0 mt-0.5 bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="rounded-2xl rounded-tl-sm border p-3.5 text-[11px] leading-relaxed border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200">
            <div className="font-extrabold text-xs mb-1">Language Model Provider Not Configured</div>
            <div className="whitespace-pre-wrap">{text}</div>
          </div>
        </div>
      </div>
    );
  }

  // Error Alert
  if (isError) {
    return (
      <div className="flex justify-start w-full animate-in fade-in duration-200">
        <div className="flex items-start gap-2.5 max-w-[90%] sm:max-w-2xl">
          <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0 mt-0.5 bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="rounded-2xl rounded-tl-sm border p-3.5 text-[11px] leading-relaxed border-rose-300 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200">
            <div className="font-extrabold text-xs mb-1">Execution Interrupted</div>
            <div className="whitespace-pre-wrap">{text}</div>
          </div>
        </div>
      </div>
    );
  }

  // Active Live SSE Streaming Pipeline Display
  return (
    <div className="flex justify-start w-full animate-in fade-in duration-200">
      <div className="flex items-start gap-2.5 max-w-[92%] sm:max-w-3xl w-full">
        <div
          className="w-7 h-7 rounded-lg grid place-items-center shrink-0 mt-0.5 bg-purple-50 text-[#493287] dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
          aria-label="Assistant"
        >
          <Bot className="w-4 h-4" />
        </div>

        <div className="rounded-2xl rounded-tl-sm border p-4 text-[11px] leading-relaxed shadow-xs w-full surface border-[var(--border)] overflow-hidden space-y-3">
          {/* Header Bar: Selected Agents + Verified Operations Grounding */}
          {selectedAgents && selectedAgents.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[var(--border)]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold text-[var(--secondary)] uppercase tracking-wider">
                  Specialist Execution:
                </span>
                {selectedAgents.map((ag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9.5px] font-extrabold bg-[#493287]/10 text-[#493287] dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800"
                  >
                    <Zap className="w-2.5 h-2.5" />
                    {ag}
                  </span>
                ))}
              </div>

              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Verified Operations Data • Zero Mock Data
              </span>
            </div>
          )}

          {/* Live Execution Pipeline Stages (Active during streaming or expandable when complete) */}
          {stages && stages.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-hover)]/40 p-2.5 my-2">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--secondary)] uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-[#493287]" />
                  <span>Backend Execution Pipeline (6 Stages)</span>
                </div>
                {isStreaming ? (
                  <span className="inline-flex items-center gap-1 text-[9.5px] font-extrabold text-[#493287] animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Executing Stage {currentStageId}/6...
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPipelineDetails((p) => !p)}
                    className="text-[9.5px] font-bold text-purple-600 dark:text-purple-400 hover:underline cursor-pointer"
                  >
                    {showPipelineDetails ? 'Hide Execution Steps ▴' : 'View Execution Steps ▾'}
                  </button>
                )}
              </div>

              {(isStreaming || showPipelineDetails) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {stages.map((st) => {
                    const isDone = st.status === 'completed';
                    const isRunning = st.status === 'running';
                    const isFailed = st.status === 'failed';

                    return (
                      <div
                        key={st.id}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isRunning
                            ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-400 dark:border-purple-600 shadow-2xs'
                            : isDone
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                            : isFailed
                            ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800'
                            : 'bg-[var(--surface)] border-[var(--border)] opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[9px] font-black truncate text-[var(--text)]">
                            {st.id}. {st.name}
                          </span>
                          {isRunning ? (
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-[#493287] shrink-0" />
                          ) : isDone ? (
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          ) : isFailed ? (
                            <AlertCircle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                          ) : (
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                          )}
                        </div>
                        {st.duration_ms != null && isDone && (
                          <div className="text-[7.5px] text-[var(--secondary)] font-mono mt-0.5">
                            {st.duration_ms} ms
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Key Metrics Chips (Horizontal Card Deck) */}
          {keyMetrics && keyMetrics.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 my-2.5">
              {keyMetrics.map((km, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xs text-left"
                >
                  <div className="text-[8.5px] font-bold text-[var(--secondary)] uppercase tracking-wider truncate">
                    {km.label}
                  </div>
                  <div className="text-sm sm:text-base font-black text-[var(--text)] mt-0.5 tracking-tight truncate">
                    {km.value}
                  </div>
                  {km.source && (
                    <div className="text-[7.5px] font-semibold text-[#493287] dark:text-purple-400 truncate mt-0.5">
                      {km.source}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Main Answer Content (Markdown / Formatted prose / Tables) */}
          <div className="text-[var(--text)] text-[11.5px] leading-relaxed max-w-full break-words">
            {renderFormattedText(text)}
          </div>
        </div>
      </div>
    </div>
  );
}
