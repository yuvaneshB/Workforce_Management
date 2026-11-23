import { Card } from './Card';
import { LoadingSkeleton } from './LoadingSkeleton';

export function KPICard({
  label,
  value = '—',
  subtitle,
  icon: Icon,
  iconBg,
  iconColor,
  loading = false,
}) {
  return (
    <Card className="p-4 h-full flex flex-col justify-between">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] muted font-semibold leading-tight">{label}</span>
        <span
          className="kpi-icon shrink-0"
          style={{ background: iconBg, color: iconColor }}
          aria-hidden="true"
        >
          {Icon && <Icon />}
        </span>
      </div>
      {loading ? (
        <div className="mt-3">
          <LoadingSkeleton className="h-7 w-20 rounded-md" />
          <LoadingSkeleton className="h-3 w-36 rounded-md mt-2" />
        </div>
      ) : (
        <div className="mt-3">
          <div className="text-xl font-extrabold tracking-tight">{value}</div>
          <div
            className="text-[10px] muted mt-0.5 truncate"
            title={typeof subtitle === 'string' ? subtitle : undefined}
          >
            {subtitle}
          </div>
        </div>
      )}
    </Card>
  );
}
