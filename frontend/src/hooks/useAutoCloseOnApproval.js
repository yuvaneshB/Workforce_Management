import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AGENT_DRAWER_AUTOCLOSE_MS } from '../utils/constants';
import { showApprovalToast } from '../utils/toast';

/**
 * useAutoCloseOnApproval
 * Automatically closes an agent drawer after delayMs (default 3s) once HR approval succeeds.
 *
 * @param {Object} options
 * @param {Function} options.onClose - Function to close the drawer
 * @param {number} [options.delayMs=3000] - Duration in ms
 * @param {string} [options.agentName] - Agent display name for toast notification
 * @param {boolean} [options.isOpen] - Current drawer open status
 * @returns {{ isCounting: boolean, secondsLeft: number, start: Function, cancel: Function }}
 */
export function useAutoCloseOnApproval({
  onClose,
  delayMs = AGENT_DRAWER_AUTOCLOSE_MS,
  agentName = 'Agent',
  isOpen = true,
} = {}) {
  const initialSeconds = Math.max(1, Math.ceil(delayMs / 1000));
  const [isCounting, setIsCounting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  const isMountedRef = useRef(true);
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const metaRef = useRef({ agentName, approvalId: null });

  // Keep references to prevent stale closures
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const cancel = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (isMountedRef.current) {
      setIsCounting(false);
      setSecondsLeft(initialSeconds);
    }
  }, [initialSeconds]);

  const start = useCallback(
    (info = {}) => {
      cancel();

      metaRef.current = {
        agentName: info.agentName || agentName,
        approvalId: info.approvalId || null,
      };

      if (!isMountedRef.current) return;

      setIsCounting(true);
      setSecondsLeft(initialSeconds);

      let currentSec = initialSeconds;

      intervalRef.current = setInterval(() => {
        currentSec -= 1;
        if (!isMountedRef.current) return;

        if (currentSec > 0) {
          setSecondsLeft(currentSec);
        } else {
          // Reached 0: clear and trigger close
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          setIsCounting(false);
          setSecondsLeft(0);

          // Show confirmation toast
          showApprovalToast({
            agentName: metaRef.current.agentName,
            approvalId: metaRef.current.approvalId,
          });

          // Close drawer
          if (typeof onCloseRef.current === 'function') {
            onCloseRef.current();
          }
        }
      }, 1000);
    },
    [agentName, cancel, initialSeconds]
  );

  // Clear timers if drawer closes or is re-opened
  useEffect(() => {
    if (!isOpen) {
      cancel();
    }
  }, [isOpen, cancel]);

  // Always clear timers on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return {
    isCounting,
    secondsLeft,
    start,
    cancel,
  };
}

/**
 * Reusable banner component for "Approved. Closing in 3s... [Keep open]"
 */
export function AutoCloseBanner({ isCounting, secondsLeft, onCancel, className = '' }) {
  if (!isCounting) return null;

  return React.createElement(
    'div',
    {
      className: `flex items-center justify-between text-xs font-medium text-emerald-800 dark:text-emerald-300 bg-emerald-50/90 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-3 py-1.5 rounded-lg transition-all animate-in fade-in duration-200 ${className}`,
    },
    React.createElement(
      'span',
      { className: 'flex items-center gap-1.5' },
      React.createElement('span', {
        className: 'w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0',
      }),
      React.createElement('span', null, `Approved. Closing in ${secondsLeft}s...`)
    ),
    React.createElement(
      'button',
      {
        type: 'button',
        onClick: onCancel,
        className:
          'text-[11px] font-bold text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 dark:hover:text-emerald-100 underline underline-offset-2 ml-2 cursor-pointer shrink-0',
      },
      'Keep open'
    )
  );
}

export default useAutoCloseOnApproval;
