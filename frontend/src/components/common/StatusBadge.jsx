export function StatusBadge({
  children,
  background = 'var(--muted-fill)',
  color = 'var(--secondary)',
  className = '',
  style,
}) {
  return (
    <span
      className={`pill ${className}`}
      style={{ background, color, ...style }}
    >
      {children}
    </span>
  );
}

