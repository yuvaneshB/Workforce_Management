/**
 * toast.js
 * Non-blocking bottom-right toast notification system.
 */

export function showApprovalToast(optionsOrMessage) {
  if (typeof document === 'undefined') return;

  let message = '';
  if (typeof optionsOrMessage === 'string') {
    message = optionsOrMessage;
  } else if (optionsOrMessage && typeof optionsOrMessage === 'object') {
    const { agentName = 'Agent', approvalId } = optionsOrMessage;
    message = `Approved: ${agentName} recommendations${approvalId ? ` (${approvalId})` : ''}`;
  } else {
    message = 'Approved recommendations successfully.';
  }

  // Ensure toast container exists
  let container = document.getElementById('app-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'app-toast-container';
    container.className =
      'fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none select-none max-w-sm';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className =
    'pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border border-emerald-300 dark:border-emerald-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-800 dark:text-slate-100 text-xs font-semibold transform transition-all duration-300 ease-out translate-y-3 opacity-0';

  // Checkmark icon container
  const iconSpan = document.createElement('span');
  iconSpan.className =
    'w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 text-xs font-black shadow-2xs';
  iconSpan.textContent = '✓';

  // Message text container
  const textSpan = document.createElement('span');
  textSpan.className = 'leading-snug break-words flex-1';
  textSpan.textContent = message;

  toast.appendChild(iconSpan);
  toast.appendChild(textSpan);
  container.appendChild(toast);

  // Trigger smooth enter animation
  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-3', 'opacity-0');
    toast.classList.add('translate-y-0', 'opacity-100');
  });

  // Auto-dismiss after 4 seconds
  const dismissTimer = setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 4000);

  // Allow clicking toast to dismiss immediately
  toast.onclick = () => {
    clearTimeout(dismissTimer);
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 200);
  };
}

