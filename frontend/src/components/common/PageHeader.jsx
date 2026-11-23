export function PageHeader({
  eyebrow,
  eyebrowColor = '#31B7C3',
  title,
  description,
  actions,
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-3 mb-6">
      <div>
        {eyebrow && (
          <div
            className="text-[10px] font-bold tracking-[.14em] uppercase mb-2"
            style={{ color: eyebrowColor }}
          >
            {eyebrow}
          </div>
        )}
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        {description && <p className="text-xs muted mt-2">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

