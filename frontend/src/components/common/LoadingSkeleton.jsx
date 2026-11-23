export function LoadingSkeleton({ className = 'h-4 w-full rounded-md' }) {
  return (
    <div
      className={`animate-pulse ${className}`}
      style={{ background: 'var(--muted-fill)' }}
      aria-hidden="true"
    />
  );
}

