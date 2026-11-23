export function IconButton({
  children,
  type = 'button',
  className = '',
  style,
  label,
  title,
  ...props
}) {
  return (
    <button
      type={type}
      aria-label={label || title}
      title={title || label}
      className={`w-9 h-9 rounded-lg grid place-items-center cursor-pointer transition-colors hover:opacity-85 ${className}`}
      style={{ background: 'var(--page-bg)', ...style }}
      {...props}
    >
      {children}
    </button>
  );
}

