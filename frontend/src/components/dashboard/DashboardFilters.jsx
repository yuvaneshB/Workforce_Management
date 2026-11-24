import {
  Calendar,
  Check,
  ChevronDown,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PLANT_OPTIONS } from '../../utils/constants';

export const SHIFT_OPTIONS = [
  { id: '', label: 'All Shifts' },
  { id: 'A', label: 'Shift A – GS1' },
  { id: 'B', label: 'Shift B – S2' },
  { id: 'C', label: 'Shift C – NS3' },
];

export const EMPLOYMENT_TYPE_OPTIONS = [
  { id: '', label: 'All Employees' },
  { id: 'permanent', label: 'Permanent Staff' },
  { id: 'vendor', label: 'Vendor Employees' },
];

export const VENDOR_OPTIONS = [
  { id: '', label: 'All Vendors' },
  { id: 'V01', label: 'V01: Sri Vignesh' },
  { id: 'V02', label: 'V02: Kovai Talent' },
  { id: 'V03', label: 'V03: Namma Workforce' },
  { id: 'V04', label: 'V04: Anand Industrial' },
  { id: 'V05', label: 'V05: Karnataka Skill' },
  { id: 'V06', label: 'V06: Prime HR' },
];

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

/**
 * Reusable custom dropdown menu control adhering to all strict design requirements:
 * - Exactly h-10 height
 * - Same border radius, padding, text color, font size
 * - Same right-aligned chevron icon
 * - Popover menu matching exact trigger width, max-height with scroll, hover/selected states, z-50
 */
function FilterDropdownControl({
  value,
  options = [],
  placeholder = '',
  onChange,
  isOpen = false,
  onToggle,
  className = '',
}) {
  const selectedOption = options.find((opt) => opt.id === value);
  const displayLabel = selectedOption?.label || placeholder;
  const isSelected = Boolean(value);

  return (
    <div className={`relative w-full ${className}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`w-full h-10 px-3 rounded-xl border text-xs font-semibold surface flex items-center justify-between gap-1.5 cursor-pointer shadow-2xs transition-all outline-none truncate select-none ${
          isSelected
            ? 'border-[var(--brand-purple)] text-[var(--brand-purple)] bg-[var(--brand-purple-soft)]/20 font-bold'
            : 'border-[var(--border)] text-[var(--text)] hover:border-[var(--brand-purple)]/60'
        }`}
        title={displayLabel}
      >
        <span className="truncate flex-1 text-left min-w-0">{displayLabel}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 shrink-0 text-[var(--secondary)] transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[var(--brand-purple)]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 w-full z-50 surface rounded-xl border border-[var(--border)] shadow-xl max-h-60 overflow-y-auto py-1 animate-in fade-in zoom-in-95 duration-100"
        >
          {options.map((opt) => {
            const active = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange?.(opt.id);
                  onToggle?.();
                }}
                className={`w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer hover:bg-[var(--surface-hover)] ${
                  active
                    ? 'bg-[var(--brand-purple-soft)]/35 text-[var(--brand-purple)] font-bold'
                    : 'text-[var(--text)]'
                }`}
                title={opt.label}
              >
                <span className="truncate pr-2">{opt.label}</span>
                {active && (
                  <Check className="w-3.5 h-3.5 text-[var(--brand-purple)] shrink-0 ml-auto" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function DashboardFilters({
  startDate = '',
  endDate = '',
  plantId = '',
  shiftId = '',
  department = '',
  section = '',
  employmentType = '',
  vendorId = '',
  filterOptions = { departments: [], sections: [] },
  onDateRangeChange,
  onPlantChange,
  onShiftChange,
  onDepartmentChange,
  onSectionChange,
  onEmploymentTypeChange,
  onVendorChange,
  onReset,
  onRefresh = null,
  loading = false,
}) {
  const [openDropdown, setOpenDropdown] = useState(null);
  const [tempStartDate, setTempStartDate] = useState(startDate || '');
  const [tempEndDate, setTempEndDate] = useState(endDate || '');
  const [validationError, setValidationError] = useState('');
  const containerRef = useRef(null);

  // Close open dropdown when clicking outside or pressing Escape
  useEffect(() => {
    if (!openDropdown) return undefined;

    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpenDropdown(null);
      }
    }

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openDropdown]);

  const hasActiveFilters = Boolean(
    startDate ||
      endDate ||
      plantId ||
      shiftId ||
      department ||
      section ||
      employmentType ||
      vendorId
  );

  function toggleDropdown(name) {
    setOpenDropdown((prev) => {
      const next = prev === name ? null : name;
      if (next === 'date') {
        setTempStartDate(startDate || '');
        setTempEndDate(endDate || '');
        setValidationError('');
      }
      return next;
    });
  }

  // Format Date Range trigger label
  let dateRangeLabel = 'Select Date Range';
  if (startDate && endDate) {
    dateRangeLabel = `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
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

  function handleApplyPreset(start, end) {
    setTempStartDate(start);
    setTempEndDate(end);
    setValidationError('');
    onDateRangeChange?.({ startDate: start, endDate: end });
    setOpenDropdown(null);
  }

  function handleClearDates() {
    setTempStartDate('');
    setTempEndDate('');
    setValidationError('');
    onDateRangeChange?.({ startDate: '', endDate: '' });
    setOpenDropdown(null);
  }

  function handleDoneDates() {
    if (tempStartDate && tempEndDate && tempEndDate < tempStartDate) {
      setValidationError('To Date cannot be earlier than From Date');
      return;
    }
    setValidationError('');
    onDateRangeChange?.({ startDate: tempStartDate, endDate: tempEndDate });
    setOpenDropdown(null);
  }

  // Department options from active database records
  const deptOptions = [
    { id: '', label: 'All Departments' },
    ...(filterOptions.departments || []).map((d) => ({
      id: d.department_id || d.id,
      label: d.department_name || d.name,
    })),
  ];

  // Section options from active database records
  const secOptions = [
    { id: '', label: 'All Sections' },
    ...(filterOptions.sections || []).map((s) => ({
      id: s.section_id || s.id,
      label: s.section_name || s.name,
    })),
  ];

  return (
    <div
      ref={containerRef}
      className="surface rounded-2xl border border-[var(--border)] p-3 shadow-xs"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-[repeat(7,minmax(0,1fr))_auto] gap-2.5 items-center">
        {/* 1. Date Range Filter */}
        <div className="relative w-full">
            <button
              type="button"
              onClick={() => toggleDropdown('date')}
              aria-haspopup="dialog"
              aria-expanded={openDropdown === 'date'}
              className={`w-full h-10 px-3 rounded-xl border text-xs font-semibold surface flex items-center justify-between gap-1.5 cursor-pointer shadow-2xs transition-all outline-none truncate select-none ${
                startDate || endDate
                  ? 'border-[var(--brand-purple)] text-[var(--brand-purple)] bg-[var(--brand-purple-soft)]/20 font-bold'
                  : 'border-[var(--border)] text-[var(--text)] hover:border-[var(--brand-purple)]/60'
              }`}
              title="Filter by date range"
            >
              <span className="truncate flex items-center gap-1.5 text-left flex-1 min-w-0">
                <Calendar className="w-3.5 h-3.5 text-[var(--brand-purple)] shrink-0" />
                <span className="truncate">{dateRangeLabel}</span>
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 shrink-0 text-[var(--secondary)] transition-transform duration-200 ${
                  openDropdown === 'date' ? 'rotate-180 text-[var(--brand-purple)]' : ''
                }`}
              />
            </button>

            {openDropdown === 'date' && (
              <div className="absolute left-0 top-full mt-1.5 z-50 surface rounded-2xl border border-[var(--border)] p-3.5 shadow-xl w-72 space-y-3 animate-in fade-in zoom-in-95 duration-100">
                <div className="text-xs font-bold text-[var(--text)] flex items-center justify-between">
                  <span>Select Operational Dates</span>
                  <span className="text-[10px] text-[var(--secondary)] font-normal">2026 Dataset</span>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('2026-08-01', '2026-10-31')}
                    className="px-2 py-1.5 rounded-lg border border-[var(--border)] text-[10px] font-semibold hover:border-[var(--brand-purple)] hover:text-[var(--brand-purple)] text-left cursor-pointer transition-colors"
                  >
                    All (Aug–Oct 2026)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('2026-08-01', '2026-08-31')}
                    className="px-2 py-1.5 rounded-lg border border-[var(--border)] text-[10px] font-semibold hover:border-[var(--brand-purple)] hover:text-[var(--brand-purple)] text-left cursor-pointer transition-colors"
                  >
                    August 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('2026-09-01', '2026-09-30')}
                    className="px-2 py-1.5 rounded-lg border border-[var(--border)] text-[10px] font-semibold hover:border-[var(--brand-purple)] hover:text-[var(--brand-purple)] text-left cursor-pointer transition-colors"
                  >
                    September 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('2026-10-01', '2026-10-31')}
                    className="px-2 py-1.5 rounded-lg border border-[var(--border)] text-[10px] font-semibold hover:border-[var(--brand-purple)] hover:text-[var(--brand-purple)] text-left cursor-pointer transition-colors"
                  >
                    October 2026
                  </button>
                </div>

                <div className="border-t border-[var(--border)] pt-2 space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--secondary)] mb-1">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={tempStartDate}
                      min="2024-01-01"
                      max="2026-12-31"
                      onChange={handleStartDateChange}
                      className="w-full h-8.5 px-2.5 rounded-lg border border-[var(--border)] surface text-xs text-[var(--text)] outline-none focus:border-[var(--brand-purple)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[var(--secondary)] mb-1">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={tempEndDate}
                      min="2024-01-01"
                      max="2026-12-31"
                      onChange={handleEndDateChange}
                      className="w-full h-8.5 px-2.5 rounded-lg border border-[var(--border)] surface text-xs text-[var(--text)] outline-none focus:border-[var(--brand-purple)]"
                    />
                  </div>
                </div>

                {validationError && (
                  <p className="text-[10px] font-semibold text-rose-500">
                    {validationError}
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={handleClearDates}
                    className="text-[11px] font-semibold text-[var(--secondary)] hover:text-[var(--text)] cursor-pointer"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={handleDoneDates}
                    className="px-3 py-1 rounded-lg bg-[var(--brand-purple)] text-white text-[11px] font-bold shadow-2xs hover:opacity-90 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Plant Filter */}
          <FilterDropdownControl
            value={plantId}
            options={PLANT_OPTIONS}
            placeholder="All Plants"
            onChange={onPlantChange}
            isOpen={openDropdown === 'plant'}
            onToggle={() => toggleDropdown('plant')}
          />

          {/* 3. Shift Filter */}
          <FilterDropdownControl
            value={shiftId}
            options={SHIFT_OPTIONS}
            placeholder="All Shifts"
            onChange={onShiftChange}
            isOpen={openDropdown === 'shift'}
            onToggle={() => toggleDropdown('shift')}
          />

          {/* 4. Department Filter */}
          <FilterDropdownControl
            value={department}
            options={deptOptions}
            placeholder="All Departments"
            onChange={onDepartmentChange}
            isOpen={openDropdown === 'department'}
            onToggle={() => toggleDropdown('department')}
          />

          {/* 5. Section Filter */}
          <FilterDropdownControl
            value={section}
            options={secOptions}
            placeholder="All Sections"
            onChange={onSectionChange}
            isOpen={openDropdown === 'section'}
            onToggle={() => toggleDropdown('section')}
          />

          {/* 6. Employment Type (Employees) Filter */}
          <FilterDropdownControl
            value={employmentType}
            options={EMPLOYMENT_TYPE_OPTIONS}
            placeholder="All Employees"
            onChange={onEmploymentTypeChange}
            isOpen={openDropdown === 'employment'}
            onToggle={() => toggleDropdown('employment')}
          />

          {/* 7. Vendor Filter */}
          <FilterDropdownControl
            value={vendorId}
            options={VENDOR_OPTIONS}
            placeholder="All Vendors"
            onChange={onVendorChange}
            isOpen={openDropdown === 'vendor'}
            onToggle={() => toggleDropdown('vendor')}
          />

        {/* Right: Reset & Refresh Actions on the same row */}
        <div className="flex items-center justify-end gap-1.5 shrink-0 col-span-full sm:col-span-1 md:col-span-2 xl:col-span-1">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="h-10 px-2.5 rounded-xl text-xs font-bold text-[var(--secondary)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
              title="Clear all active filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="h-10 px-3.5 rounded-xl border border-[var(--border)] surface text-xs font-bold text-[var(--text)] hover:border-[var(--brand-purple)] hover:text-[var(--brand-purple)] active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs shrink-0 select-none whitespace-nowrap"
              title="Refresh dashboard data"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  loading ? 'animate-spin text-[var(--brand-purple)]' : 'text-[var(--secondary)]'
                }`}
              />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardFilters;
