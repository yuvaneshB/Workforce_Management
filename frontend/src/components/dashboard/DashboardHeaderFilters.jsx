import { Calendar, ChevronDown, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PLANT_OPTIONS } from '../../utils/constants';

function formatDisplayDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr + 'T00:00:00');
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export function DashboardHeaderFilters({
  startDate = '',
  endDate = '',
  plantId = '',
  shiftId = '',
  department = '',
  filterOptions = { departments: [], sections: [] },
  onDateRangeChange,
  onPlantChange,
  onShiftChange,
  onDepartmentChange,
  onReset,
}) {
  const [dateOpen, setDateOpen] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(startDate || '');
  const [tempEndDate, setTempEndDate] = useState(endDate || '');
  const [validationError, setValidationError] = useState('');
  const datePopoverRef = useRef(null);

  useEffect(() => {
    if (!dateOpen) return undefined;
    function handleOutside(event) {
      if (datePopoverRef.current && !datePopoverRef.current.contains(event.target)) {
        setDateOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [dateOpen]);

  function handleToggleOpen() {
    setDateOpen((prev) => {
      const next = !prev;
      if (next) {
        setTempStartDate(startDate || '');
        setTempEndDate(endDate || '');
        setValidationError('');
      }
      return next;
    });
  }

  let dateRangeLabel = 'Select Date Range';
  if (startDate && endDate) {
    dateRangeLabel = `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}`;
  } else if (startDate) {
    dateRangeLabel = `From ${formatDisplayDate(startDate)}`;
  } else if (endDate) {
    dateRangeLabel = `Until ${formatDisplayDate(endDate)}`;
  }

  function handleStartDateChange(e) {
    const val = e.target.value;
    setTempStartDate(val);
    if (tempEndDate && val && tempEndDate < val) {
      setValidationError('To Date cannot be earlier than From Date');
    } else {
      setValidationError('');
    }
  }

  function handleEndDateChange(e) {
    const val = e.target.value;
    setTempEndDate(val);
    if (tempStartDate && val && val < tempStartDate) {
      setValidationError('To Date cannot be earlier than From Date');
    } else {
      setValidationError('');
    }
  }

  function handleClear() {
    setTempStartDate('');
    setTempEndDate('');
    setValidationError('');
    onDateRangeChange?.({ startDate: '', endDate: '' });
  }

  function handleDone() {
    if (!tempStartDate && !tempEndDate) {
      setValidationError('');
      onDateRangeChange?.({ startDate: '', endDate: '' });
      setDateOpen(false);
      return;
    }

    if (tempStartDate && !tempEndDate) {
      setValidationError('Please select an end date');
      return;
    }

    if (!tempStartDate && tempEndDate) {
      setValidationError('Please select a start date');
      return;
    }

    if (tempEndDate < tempStartDate) {
      setValidationError('To Date cannot be earlier than From Date');
      return;
    }

    setValidationError('');
    onDateRangeChange?.({ startDate: tempStartDate, endDate: tempEndDate });
    setDateOpen(false);
  }

  const hasActiveFilters = Boolean(startDate || endDate || plantId || shiftId || department);

  return (
    <div className="surface bg-white dark:bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-4 shadow-sm mb-3.5">
      <div className="flex flex-wrap lg:flex-nowrap items-center gap-4">
        {/* Date Range Selector Popover */}
        <div className="relative flex-1 min-w-[200px]" ref={datePopoverRef}>
          <button
            type="button"
            onClick={handleToggleOpen}
            className="w-full h-9 px-3 rounded-lg border border-[var(--border)] surface text-[11px] font-medium text-[var(--text)] hover:border-[var(--brand-purple)] transition-colors flex items-center justify-between gap-2 cursor-pointer shadow-2xs"
            title="Filter date range"
          >
            <span className="flex items-center gap-2 truncate">
              <Calendar className="w-3.5 h-3.5 text-[var(--brand-purple)] shrink-0" />
              <span className="truncate">{dateRangeLabel}</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--secondary)] shrink-0" />
          </button>

          {dateOpen && (
            <div className="absolute left-0 top-full mt-2 z-50 surface rounded-2xl border border-[var(--border)] p-4 shadow-xl w-72 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                  From
                </label>
                <input
                  type="date"
                  value={tempStartDate}
                  min="2024-01-01"
                  max="2026-12-31"
                  onChange={handleStartDateChange}
                  className="w-full h-10 px-3 rounded-xl border border-[var(--border)] surface text-xs sm:text-sm text-[var(--text)] outline-none focus:border-[var(--brand-purple)] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text)] mb-1.5">
                  To
                </label>
                <input
                  type="date"
                  value={tempEndDate}
                  min="2024-01-01"
                  max="2026-12-31"
                  onChange={handleEndDateChange}
                  className="w-full h-10 px-3 rounded-xl border border-[var(--border)] surface text-xs sm:text-sm text-[var(--text)] outline-none focus:border-[var(--brand-purple)] cursor-pointer"
                />
              </div>

              {validationError && (
                <p className="text-[11px] font-medium text-rose-500">
                  {validationError}
                </p>
              )}

              <div className="border-t border-[var(--border)] pt-2" />

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs font-medium text-[var(--secondary)] hover:text-[var(--text)] transition-colors cursor-pointer"
                >
                  Clear dates
                </button>
                <button
                  type="button"
                  onClick={handleDone}
                  className="px-4 py-1.5 rounded-xl border border-[var(--border)] surface text-xs font-bold text-[var(--text)] hover:bg-[var(--muted-fill)] transition-colors shadow-2xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Plant Select */}
        <div className="relative flex-1 min-w-[130px]">
          <select
            value={plantId}
            onChange={(e) => onPlantChange(e.target.value)}
            className="w-full h-9 pl-3 pr-8 rounded-lg border border-[var(--border)] surface text-[11px] font-medium text-[var(--text)] hover:border-[var(--brand-purple)] transition-colors cursor-pointer appearance-none shadow-2xs outline-none truncate"
          >
            {PLANT_OPTIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--secondary)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Shift Select */}
        <div className="relative flex-1 min-w-[120px]">
          <select
            value={shiftId}
            onChange={(e) => onShiftChange(e.target.value)}
            className="w-full h-9 pl-3 pr-8 rounded-lg border border-[var(--border)] surface text-[11px] font-medium text-[var(--text)] hover:border-[var(--brand-purple)] transition-colors cursor-pointer appearance-none shadow-2xs outline-none truncate"
          >
            <option value="">All Shifts</option>
            <option value="A">Shift: GS1</option>
            <option value="B">Shift: S2</option>
            <option value="C">Shift: NS3</option>
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--secondary)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Department Select */}
        <div className="relative flex-1 min-w-[140px]">
          <select
            value={department}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="w-full h-9 pl-3 pr-8 rounded-lg border border-[var(--border)] surface text-[11px] font-medium text-[var(--text)] hover:border-[var(--brand-purple)] transition-colors cursor-pointer appearance-none shadow-2xs outline-none truncate"
          >
            <option value="">All Departments</option>
            {filterOptions.departments?.map((d) => (
              <option key={d.department_id || d.id} value={d.department_id || d.id}>
                {d.department_name || d.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--secondary)] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={onReset}
            className="h-9 px-3 rounded-lg border border-[var(--border)] surface text-[11px] font-semibold text-[var(--brand-purple)] hover:bg-[var(--muted-fill)] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
            title="Reset filters"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>
    </div>
  );
}
