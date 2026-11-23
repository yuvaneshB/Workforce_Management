import { Database } from 'lucide-react';
import { useState } from 'react';
import { Card } from '../common/Card';
import { EmptyState } from '../common/EmptyState';
import { FilterDropdown } from './FilterDropdown';
import { SearchInput } from './SearchInput';

const DEFAULT_COLUMNS = ['RECORD', 'DETAILS', 'STATUS', 'ACTION'];

export function DataTable({
  columns = DEFAULT_COLUMNS,
  rows = [],
  searchPlaceholder = 'Search records...',
  emptyTitle = 'No records to display',
  emptyDescription = 'Connect and validate your workforce dataset to populate this page.',
  filterOptions = [],
}) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Card className="p-5">
      <div className="flex flex-col md:flex-row gap-3 justify-between mb-5">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={searchPlaceholder}
        />
        <FilterDropdown options={filterOptions} />
      </div>

      <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'var(--border)' }}>
        <div
          className="grid grid-cols-4 gap-2 p-3 text-[9px] font-bold muted"
          style={{ background: 'var(--brand-bg)' }}
        >
          {columns.map((col) => (
            <span key={col}>{col}</span>
          ))}
        </div>

        {rows.length === 0 ? (
          <div className="py-16">
            <EmptyState
              icon={Database}
              iconClassName="w-8 h-8 mx-auto muted mb-3"
              title={emptyTitle}
              titleClassName="text-xs font-bold"
              description={emptyDescription}
              descriptionClassName="text-[10px] muted mt-2"
            />
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {rows.map((row, idx) => (
              <div key={row.id || idx} className="grid grid-cols-4 gap-2 p-3 text-[11px]">
                {row.cells}
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

