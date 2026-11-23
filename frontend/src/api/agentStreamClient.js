/**
 * Streaming Client for Specialist Agent Real-Time Execution.
 * Consumes Server-Sent Events (SSE) from /api/v1/agent/stream-analysis via Fetch ReadableStream.
 */

import { API_BASE_URL } from './client';

export async function streamAgentAnalysis({
  agentType,
  executionId,
  filters = {},
  onInit,
  onStageStart,
  onStageEnd,
  onDone,
  onError,
  signal,
}) {
  const payload = {
    agent_type: agentType,
    execution_id: executionId || null,
    message: filters.message || filters.user_query || null,
    conversation_id: filters.conversation_id || filters.conversationId || null,
    filters: {
      message: filters.message || filters.user_query || null,
      conversation_id: filters.conversation_id || filters.conversationId || null,
      date: filters.date || null,
      start_date: filters.startDate || filters.start_date || null,
      end_date: filters.endDate || filters.end_date || null,
      plant_id: filters.plantId || filters.plant_id || null,
      shift_id: filters.shiftId || filters.shift_id || null,
      department_id: filters.departmentId || filters.department_id || null,
      section_id: filters.sectionId || filters.section_id || null,
      operator_team: filters.operatorTeam || filters.operator_team || null,
    },
  };

  try {
    const rawBase = (API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');
    const candidateUrls = [
      `${rawBase}/api/v1/agent/stream-analysis`,
      '/api/v1/agent/stream-analysis',
      'http://127.0.0.1:8000/api/v1/agent/stream-analysis',
    ].filter((v, idx, arr) => arr.indexOf(v) === idx);

    let response = null;
    let lastError = null;

    for (const url of candidateUrls) {
      try {
        const resp = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify(payload),
          signal,
        });

        if (resp.ok) {
          response = resp;
          break;
        } else if (resp.status !== 404) {
          const errText = await resp.text();
          throw new Error(`Server returned HTTP ${resp.status}: ${errText || resp.statusText}`);
        } else {
          lastError = new Error(`Server returned HTTP 404 at ${url}`);
        }
      } catch (fetchErr) {
        if (signal?.aborted) throw fetchErr;
        lastError = fetchErr;
      }
    }

    if (!response) {
      throw lastError || new Error('Failed to connect to agent stream endpoint across configured URLs');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        try {
          const eventData = JSON.parse(trimmed.slice(5).trim());
          const eventType = eventData.event;

          if (eventType === 'init') {
            onInit?.(eventData);
          } else if (eventType === 'stage_start') {
            onStageStart?.(eventData);
          } else if (eventType === 'stage_end') {
            onStageEnd?.(eventData);
          } else if (eventType === 'done') {
            onDone?.(eventData);
          } else if (eventType === 'error') {
            onError?.(eventData);
          }
        } catch (parseErr) {
          console.warn('Failed to parse SSE JSON chunk:', trimmed, parseErr);
        }
      }
    }
  } catch (err) {
    if (signal?.aborted) {
      console.log(`Execution stream aborted cleanly for agent ${agentType}`);
      return;
    }
    console.error(`Agent execution stream error for ${agentType}:`, err);
    onError?.({
      event: 'error',
      message: err.message || 'Stream connection failed',
      error: String(err),
    });
  }
}

