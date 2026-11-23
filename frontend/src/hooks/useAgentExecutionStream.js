import { useCallback, useEffect, useRef, useState } from 'react';
import { streamAgentAnalysis } from '../api/agentStreamClient';

const DEFAULT_STAGES = [
  { id: 1, name: 'Request Validation', desc: 'Validating scope and parameters', status: 'pending' },
  { id: 2, name: 'Database Retrieval', desc: 'Querying Neon PostgreSQL records', status: 'pending' },
  { id: 3, name: 'Data Preparation', desc: 'Normalizing and deduplicating data', status: 'pending' },
  { id: 4, name: 'Specialist Analysis', desc: 'Executing core analytical logic', status: 'pending' },
  { id: 5, name: 'AI Insight Generation', desc: 'Synthesizing evidence-based findings', status: 'pending' },
  { id: 6, name: 'Result Preparation', desc: 'Packaging metrics and recommendations', status: 'pending' },
];

export function useAgentExecutionStream({ agentType, filters = {}, autoStart = false, isOpen = true }) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionId, setExecutionId] = useState(null);
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [activeStageId, setActiveStageId] = useState(null);
  const [activeMessage, setActiveMessage] = useState('');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const abortControllerRef = useRef(null);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const currentExecutionIdRef = useRef(null);

  // Stop running timer
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Cancel execution cleanly
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    stopTimer();
    setIsExecuting(false);
  }, [stopTimer]);

  // Execute agent analysis fresh from Stage 1
  const execute = useCallback(
    async (customFilters) => {
      // 1. Immediately abort any ongoing in-flight stream
      cancel();

      const activeFilters = customFilters || filters;
      const controller = new AbortController();
      abortControllerRef.current = controller;

      // 2. Generate brand-new unique execution ID
      const prefix = String(agentType || 'agn').slice(0, 3).toUpperCase();
      const freshExecId = `EXE-${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      currentExecutionIdRef.current = freshExecId;
      setExecutionId(freshExecId);

      // 3. Reset all execution states cleanly to Stage 1
      setIsExecuting(true);
      setError(null);
      setResult(null);
      setActiveStageId(1);
      setActiveMessage('Stage 1: Validating request parameters and scope...');

      // Reset all stages to initial state: Stage 1 running, 2-6 pending
      setStages(
        DEFAULT_STAGES.map((s) => ({
          ...s,
          status: s.id === 1 ? 'running' : 'pending',
          duration_ms: null,
          message: s.id === 1 ? 'Validating request scope...' : '',
        }))
      );

      // 4. Reset elapsed timer to 0s
      startTimeRef.current = Date.now();
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);

      // Check whether event belongs to the current active execution
      const isStaleEvent = (incomingId) => {
        if (!incomingId || !currentExecutionIdRef.current) return false;
        return incomingId !== currentExecutionIdRef.current;
      };

      try {
        await streamAgentAnalysis({
          agentType,
          executionId: freshExecId,
          filters: activeFilters,
          signal: controller.signal,
          onInit: (data) => {
            if (isStaleEvent(data.execution_id)) return;
            if (data.execution_id) {
              currentExecutionIdRef.current = data.execution_id;
              setExecutionId(data.execution_id);
            }
            if (Array.isArray(data.stages) && data.stages.length > 0) {
              setStages(
                data.stages.map((st) => ({
                  id: st.id,
                  name: st.name,
                  desc: st.desc || '',
                  status: st.id === 1 ? 'running' : 'pending',
                  duration_ms: null,
                  message: st.id === 1 ? (st.desc || 'Validating scope...') : '',
                }))
              );
            }
          },
          onStageStart: (data) => {
            if (isStaleEvent(data.execution_id)) return;
            const sId = data.stage_id;
            setActiveStageId(sId);
            setActiveMessage(data.message || `Stage ${sId}: Processing...`);
            setStages((prev) =>
              prev.map((s) =>
                s.id === sId
                  ? { ...s, status: 'running', message: data.message || '' }
                  : s.id < sId
                  ? { ...s, status: 'completed' }
                  : { ...s, status: 'pending', duration_ms: null, message: '' }
              )
            );
          },
          onStageEnd: (data) => {
            if (isStaleEvent(data.execution_id)) return;
            const sId = data.stage_id;
            const isSuccess = data.status === 'completed';
            setStages((prev) =>
              prev.map((s) =>
                s.id === sId
                  ? {
                      ...s,
                      status: isSuccess ? 'completed' : 'failed',
                      duration_ms: data.duration_ms || null,
                      message: data.message || '',
                    }
                  : s
              )
            );
            if (!isSuccess) {
              setError(data.message || 'Stage execution failed');
            }
          },
          onDone: (data) => {
            if (isStaleEvent(data.execution_id)) return;
            stopTimer();
            setIsExecuting(false);
            setActiveStageId(null);
            setActiveMessage('Execution completed successfully');
            setStages((prev) =>
              prev.map((s) => ({
                ...s,
                status: s.status === 'failed' ? 'failed' : 'completed',
              }))
            );
            if (data.result) {
              setResult(data.result);
              if (data.result.execution_id) {
                currentExecutionIdRef.current = data.result.execution_id;
                setExecutionId(data.result.execution_id);
              }
            }
          },
          onError: (data) => {
            if (isStaleEvent(data.execution_id)) return;
            stopTimer();
            setIsExecuting(false);
            const errMsg = data.message || data.error || 'Execution encountered an error';
            setError(errMsg);
            setStages((prev) =>
              prev.map((s) => (s.status === 'running' ? { ...s, status: 'failed' } : s))
            );
          },
        });
      } catch (err) {
        if (!controller.signal.aborted) {
          stopTimer();
          setIsExecuting(false);
          setError(err.message || 'Execution failed');
        }
      }
    },
    [agentType, filters, cancel, stopTimer]
  );

  // Auto-start when drawer opens
  useEffect(() => {
    if (isOpen && autoStart) {
      execute();
    }
    return () => {
      cancel();
    };
  }, [isOpen, autoStart]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    isExecuting,
    executionId,
    stages,
    activeStageId,
    activeMessage,
    elapsedSeconds,
    error,
    result,
    execute,
    cancel,
    retry: () => execute(),
  };
}


