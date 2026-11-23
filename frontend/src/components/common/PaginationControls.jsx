import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export function PaginationControls({ total = 0, limit = 25, offset = 0, onPageChange }) {
  if (total === 0) return null;

  const start = offset + 1;
  const end = Math.min(offset + limit, total);
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  return (
    <div
      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 mt-4 border-t"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="text-[11px] muted font-medium">
        Showing <span className="font-bold">{start.toLocaleString()}</span>–
        <span className="font-bold">{end.toLocaleString()}</span> of{' '}
        <span className="font-bold">{total.toLocaleString()}</span> records
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          disabled={!hasPrev}
          onClick={() => onPageChange(Math.max(0, offset - limit))}
          className={!hasPrev ? 'opacity-50 !cursor-not-allowed' : ''}
        >
          <ChevronLeft className="w-3.5 h-3.5 inline mr-1" /> Previous
        </Button>
        <Button
          variant="outline"
          disabled={!hasNext}
          onClick={() => onPageChange(offset + limit)}
          className={!hasNext ? 'opacity-50 !cursor-not-allowed' : ''}
        >
          Next <ChevronRight className="w-3.5 h-3.5 inline ml-1" />
        </Button>
      </div>
    </div>
  );
}

