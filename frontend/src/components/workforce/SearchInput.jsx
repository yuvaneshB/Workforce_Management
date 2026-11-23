import { Search } from 'lucide-react';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search records...',
  ariaLabel = 'Search records',
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2 border max-w-sm w-full"
      style={{ borderColor: 'var(--border)' }}
    >
      <Search className="w-4 h-4 muted shrink-0" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="bg-transparent outline-none text-[10px] w-full"
      />
    </div>
  );
}

