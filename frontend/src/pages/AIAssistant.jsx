import { useRef, useState } from 'react';
import { extractApiErrorMessage } from '../api/client';
import { sendChatMessage, streamChatAnalysis } from '../api/workforceApi';
import { ChatWindow } from '../components/assistant/ChatWindow';
import { Card } from '../components/common/Card';
import { ROUTE_META } from '../utils/constants';

const INITIAL_PIPELINE_STAGES = [
  { id: 1, name: 'Understanding User Question', desc: 'Analyzing natural language intent, entities & context', status: 'pending' },
  { id: 2, name: 'Selecting Specialist Agent', desc: 'Routing query to relevant workforce specialist(s)', status: 'pending' },
  { id: 3, name: 'Retrieving Neon PostgreSQL Data', desc: 'Querying verified enterprise relational tables', status: 'pending' },
  { id: 4, name: 'Performing Quantitative Analysis', desc: 'Computing baseline variances and domain metrics', status: 'pending' },
  { id: 5, name: 'Generating AI Insights', desc: 'Synthesizing evidence-based findings via Domo AI', status: 'pending' },
  { id: 6, name: 'Preparing Final Response', desc: 'Formatting direct answer, metrics, and recommendations', status: 'pending' },
];

export function AIAssistant() {
  const meta = ROUTE_META['/assistant'];
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [error, setError] = useState(null);
  const [missingProvider, setMissingProvider] = useState(false);
  const inputRef = useRef(null);
  const activeStreamAbortRef = useRef(null);

  function handleSelectSuggestion(promptText) {
    setInputValue(promptText);
    inputRef.current?.focus();
  }

  async function handleSendMessage() {
    const trimmed = inputValue.trim();
    if (!trimmed || loading || isThinking) return;

    // Generate unique message and execution IDs
    const userMessageId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const assistantMessageId = `assistant-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const executionId = `EXEC-CENTRAL-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const userMsg = {
      id: userMessageId,
      role: 'user',
      content: trimmed,
    };

    const initialAssistantMsg = {
      id: assistantMessageId,
      role: 'assistant',
      isStreaming: true,
      currentStageId: 1,
      stages: INITIAL_PIPELINE_STAGES.map((s) => ({ ...s, status: 'pending' })),
      selectedAgents: [],
      content: '',
      directAnswer: '',
      keyMetrics: [],
      evidence: [],
      trendsAndFindings: [],
      recommendations: [],
      dataLimitations: [],
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setInputValue('');
    setIsThinking(true);
    setLoading(true);
    setError(null);

    // Abort controller for current SSE stream
    const controller = new AbortController();
    activeStreamAbortRef.current = controller;

    let streamCompleted = false;

    try {
      await streamChatAnalysis({
        message: trimmed,
        conversationId,
        executionId,
        signal: controller.signal,
        onInit: (data) => {
          if (data.conversation_id) {
            setConversationId(data.conversation_id);
          }
          if (Array.isArray(data.stages)) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? {
                      ...msg,
                      stages: data.stages.map((st) => ({
                        id: st.id,
                        name: st.name,
                        desc: st.desc,
                        status: 'pending',
                      })),
                    }
                  : msg
              )
            );
          }
        },
        onStageStart: (data) => {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== assistantMessageId) return msg;
              const nextStages = (msg.stages || INITIAL_PIPELINE_STAGES).map((st) =>
                st.id === data.stage_id
                  ? { ...st, status: 'running', message: data.message }
                  : st
              );
              return {
                ...msg,
                currentStageId: data.stage_id,
                stages: nextStages,
                selectedAgents: data.selected_agents || msg.selectedAgents,
              };
            })
          );
        },
        onStageEnd: (data) => {
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== assistantMessageId) return msg;
              const nextStages = (msg.stages || INITIAL_PIPELINE_STAGES).map((st) =>
                st.id === data.stage_id
                  ? {
                      ...st,
                      status: 'completed',
                      duration_ms: data.duration_ms,
                      message: data.message,
                    }
                  : st
              );
              return {
                ...msg,
                stages: nextStages,
              };
            })
          );
        },
        onDone: (data) => {
          streamCompleted = true;
          setIsThinking(false);
          setLoading(false);
          if (data.conversation_id) {
            setConversationId(data.conversation_id);
          }
          setMissingProvider(false);

          const res = data.result || {};
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id !== assistantMessageId) return msg;
              const completedStages = (msg.stages || INITIAL_PIPELINE_STAGES).map((st) => ({
                ...st,
                status: 'completed',
              }));
              return {
                ...msg,
                isStreaming: false,
                stages: completedStages,
                content: res.answer || res.direct_answer || 'Analysis complete.',
                directAnswer: res.direct_answer || '',
                keyMetrics: res.key_metrics || [],
                evidence: res.evidence || [],
                trendsAndFindings: res.trends_and_findings || [],
                recommendations: res.recommendations || [],
                dataLimitations: res.data_limitations || [],
                selectedAgents: res.selected_agents || msg.selectedAgents || [],
              };
            })
          );
        },
        onError: async (errData) => {
          console.warn('SSE stream error, trying fallback to POST /chat:', errData);
          if (!streamCompleted) {
            await executeFallback(trimmed, assistantMessageId);
          }
        },
      });
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }
      console.warn('SSE stream threw, attempting fallback HTTP POST:', err);
      if (!streamCompleted) {
        await executeFallback(trimmed, assistantMessageId);
      }
    } finally {
      activeStreamAbortRef.current = null;
      setIsThinking(false);
      setLoading(false);
    }
  }

  // Graceful fallback to HTTP POST /api/v1/agent/chat if SSE is unreachable
  async function executeFallback(trimmedQuery, assistantMessageId) {
    try {
      const response = await sendChatMessage({
        message: trimmedQuery,
        conversationId,
      });

      if (response?.conversation_id) {
        setConversationId(response.conversation_id);
      }
      setMissingProvider(false);

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id !== assistantMessageId) return msg;
          const completedStages = (msg.stages || INITIAL_PIPELINE_STAGES).map((st) => ({
            ...st,
            status: 'completed',
          }));
          return {
            ...msg,
            isStreaming: false,
            stages: completedStages,
            content: response?.answer || response?.direct_answer || response?.response || 'Analysis complete.',
            directAnswer: response?.direct_answer || '',
            keyMetrics: response?.key_metrics || [],
            evidence: response?.evidence || [],
            trendsAndFindings: response?.trends_and_findings || [],
            recommendations: response?.recommendations || [],
            dataLimitations: response?.data_limitations || [],
            selectedAgents: response?.selected_agents || ['Central Workforce Assistant'],
          };
        })
      );
    } catch (fallbackErr) {
      if (fallbackErr.response?.status === 503) {
        setMissingProvider(true);
        if (fallbackErr.response.data?.conversation_id) {
          setConversationId(fallbackErr.response.data.conversation_id);
        }
        const errDetail =
          fallbackErr.response.data?.answer ||
          fallbackErr.response.data?.error ||
          'Workforce AI Assistant is currently unavailable because the language model provider is not configured.';
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  isStreaming: false,
                  content: errDetail,
                  isMissingProvider: true,
                }
              : msg
          )
        );
      } else {
        const errMsg =
          extractApiErrorMessage(fallbackErr) ||
          fallbackErr.response?.data?.error ||
          fallbackErr.response?.data?.detail ||
          fallbackErr.message ||
          'Failed to contact central workforce assistant.';
        setError(errMsg);
        if (fallbackErr.response?.data?.conversation_id) {
          setConversationId(fallbackErr.response.data.conversation_id);
        }
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMessageId
              ? {
                  ...msg,
                  isStreaming: false,
                  content: errMsg,
                  isError: true,
                }
              : msg
          )
        );
      }
    } finally {
      setIsThinking(false);
      setLoading(false);
    }
  }

  function handleNewConversation() {
    if (activeStreamAbortRef.current) {
      activeStreamAbortRef.current.abort();
    }
    setInputValue('');
    setConversationId(null);
    setMessages([]);
    setError(null);
    setMissingProvider(false);
    setIsThinking(false);
    setLoading(false);
    inputRef.current?.focus();
  }

  return (
    <section aria-label={meta.title} className="h-[calc(100vh-84px)] min-h-[500px]">
      <Card className="overflow-hidden h-full flex flex-col p-0 shadow-xs border">
        <ChatWindow
          messages={messages}
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSelectSuggestion={handleSelectSuggestion}
          onSendMessage={handleSendMessage}
          onNewConversation={handleNewConversation}
          inputRef={inputRef}
          loading={loading}
          isThinking={isThinking}
          error={error}
          missingProvider={missingProvider}
        />
      </Card>
    </section>
  );
}

export default AIAssistant;
