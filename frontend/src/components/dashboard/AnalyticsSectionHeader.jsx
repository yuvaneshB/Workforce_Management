import { StatusBadge } from '../common/StatusBadge';

export function AnalyticsSectionHeader({
  title,
  description,
  badgeText,
  badgeBg = 'var(--blue-soft)',
  badgeColor = '#4D8EEB',
  rightSlot,
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
      <div>
        <h2 className="text-sm font-extrabold tracking-tight">{title}</h2>
        {description && <p className="text-[11px] muted mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {rightSlot}
        {badgeText && (
          <StatusBadge background={badgeBg} color={badgeColor}>
            {badgeText}
          </StatusBadge>
        )}
      </div>
    </div>
  );
}

