export function Button({
  children,
  variant = 'outline',
  type = 'button',
  className = '',
  style,
  ...props
}) {
  const variantClasses = {
    primary: 'rounded-lg px-3.5 py-2 text-[11px] font-semibold text-white cursor-pointer transition-opacity hover:opacity-90',
    outline: 'rounded-lg px-3.5 py-2 text-[11px] font-semibold border cursor-pointer transition-colors hover:bg-[var(--muted-fill)]',
    banner: 'rounded-lg px-3.5 py-2 text-[11px] font-bold cursor-pointer transition-opacity hover:opacity-95',
    ghost: 'rounded-lg px-3.5 py-2 text-[11px] font-semibold cursor-pointer transition-colors hover:bg-[var(--muted-fill)]',
  };

  const variantStyles = {
    primary: { background: 'var(--brand-purple)', color: 'var(--on-accent)' },
    outline: { borderColor: 'var(--border)', background: 'var(--surface)', color: 'var(--text-primary)' },
    banner: { background: 'var(--surface)', color: 'var(--text-primary)' },
    ghost: { color: 'var(--text-primary)' },
  };

  return (
    <button
      type={type}
      className={`${variantClasses[variant] || variantClasses.outline} ${className}`}
      style={{ ...variantStyles[variant], ...style }}
      {...props}
    >
      {children}
    </button>
  );
}
