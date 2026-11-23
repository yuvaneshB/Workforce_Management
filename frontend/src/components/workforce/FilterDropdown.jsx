import { Filter } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../common/Button';

export function FilterDropdown({ label = 'Filters', options = [] }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className="relative self-start md:self-auto">
      <Button
        variant="outline"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Filter className="w-3 h-3 inline mr-1" /> {label}
      </Button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-56 rounded-xl p-3 surface z-20"
          role="menu"
        >
          <div className="text-[10px] font-bold mb-1">Filter options</div>
          {options.length > 0 ? (
            <div className="space-y-1 mt-2">
              {options.map((opt) => (
                <div key={opt} className="text-[10px] muted py-1">
                  {opt}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[10px] muted leading-4">
              Filters will become active after your workforce dataset is connected.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

