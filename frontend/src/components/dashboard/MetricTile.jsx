import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function MetricTile({
  label,
  value = '—',
  subtitle,
  loading = false,
  accentColor,
}) {
  return (
    <div
      className="rounded-xl border p-3.5"
      style={{ borderColor: 'var(--border)', background: 'var(--brand-bg)' }}
    >
      <div className="text-[10px] muted font-semibold">{label}</div>
      {loading ? (
        <>
          <LoadingSkeleton className="h-6 w-16 rounded-md mt-2" />
          <LoadingSkeleton className="h-2.5 w-28 rounded-md mt-1.5" />
        </>
      ) : (
        <>
          <div
            className="text-lg font-extrabold mt-1.5"
            style={accentColor ? { color: accentColor } : undefined}
          >
            {value}
          </div>
          {subtitle && <div className="text-[10px] muted mt-1">{subtitle}</div>}
        </>
      )}
    </div>
  );
}

