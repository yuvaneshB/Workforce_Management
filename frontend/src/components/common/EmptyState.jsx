export function EmptyState({
  icon: Icon,
  title,
  description,
  iconClassName = 'w-7 h-7 mx-auto muted mb-2',
  iconStyle,
  titleClassName = 'text-[11px] font-semibold',
  descriptionClassName = 'text-[10px] muted mt-1',
  className = 'text-center',
}) {
  return (
    <div className={className}>
      {Icon && <Icon className={iconClassName} style={iconStyle} aria-hidden="true" />}
      <p className={titleClassName}>{title}</p>
      {description && <p className={descriptionClassName}>{description}</p>}
    </div>
  );
}

