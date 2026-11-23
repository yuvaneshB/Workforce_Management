import {
  Calendar,
  ChevronDown,
  Filter,
  RefreshCw,
  RotateCcw,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { PLANT_OPTIONS } from '../../utils/constants';

export const VENDOR_OPTIONS = [
  { id: '', label: 'All Vendors' },
  { id: 'VEND-01', label: 'VEND-01: Apex Industrial Services' },
  { id: 'VEND-02', label: 'VEND-02: Prime Technical Services' },
  { id: 'VEND-03', label: 'VEND-03: Core Facility Partners' },
  { id: 'VEND-04', label: 'VEND-04: Summit Workforce Solutions' },
  { id: 'VEND-05', label: 'VEND-05: Global Tech Staffing' },
  { id: 'VEND-06', label: 'VEND-06: Precision Workforce' },
];

export const EMPLOYMENT_TYPE_OPTIONS = [
  { id: '', label: 'All Employment Types' },
  { id: 'permanent', label: 'Permanent Employees' },
  { id: 'vendor', label: 'Vendor Contract' },
];

export const MANUFACTURING_DEPARTMENTS = [
  { id: 'DEPT-01', name: 'Production' },
  { id: 'DEPT-02', name: 'Quality' },
  { id: 'DEPT-03', name: 'Maintenance' },
  { id: 'DEPT-04', name: 'Warehouse' },
  { id: 'DEPT-05', name: 'Operations' },
  { id: 'DEPT-06', name: 'Engineering' },
  { id: 'DEPT-07', name: 'HR' },
  { id: 'DEPT-08', name: 'Administration' },
];

export const MANUFACTURING_SECTIONS = [
  { id: 'SEC-01', name: 'SMT Production' },
  { id: 'SEC-02', name: 'Final Assembly' },
  { id: 'SEC-03', name: 'Quality Inspection' },
  { id: 'SEC-04', name: 'Maintenance' },
  { id: 'SEC-05', name: 'Material Handling' },
  { id: 'SEC-06', name: 'Packaging' },
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
  coverageWindow = null,
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
    setDateOpen(false);
  }

  function handleClearDates() {
    setTempStartDate('');
    setTempEndDate('');
    setValidationError('');
    onDateRangeChange?.({ startDate: '', endDate: '' });
  }

  function handleDoneDates() {
    if (tempStartDate && tempEndDate && tempEndDate < tempStartDate) {
      setValidationError('To Date cannot be earlier than From Date');
      return;
    }
    setValidationError('');
    onDateRangeChange?.({ startDate: tempStartDate, endDate: tempEndDate });
    setDateOpen(false);
  }

  // Combine fetched options with standard manufacturing master lists
  const availableDepts =
    filterOptions.departments?.length > 0
      ? filterOptions.departments
      : MANUFACTURING_DEPARTMENTS;

  const availableSecs =
    filterOptions.sections?.length > 0
      ? filterOptions.sections
      : MANUFACTURING_SECTIONS;

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

  const minDate = coverageWindow?.min_date;
  const maxDate = coverageWindow?.max_date;
  const coverageLabel =
    minDate && maxDate
      ? `${minDate} to ${maxDate}`
      : 'Aug 01, 2026 – Oct 31, 2026';

  const getSelectClass = (val) =>
    `w-full h-9 pl-3 pr-7 rounded-xl border text-[11px] font-semibold surface cursor-pointer appearance-none shadow-2xs outline-none truncate transition-all ${
      val
        ? 'border-[var(--brand-purple)] text-[var(--brand-purple)] bg-[var(--brand-purple-soft)]/25 font-bold'
        : 'border-[var(--border)] text-[var(--text)] hover:border-[var(--brand-purple)]/60'
    }`;

  return (
    <div className="surface rounded-2xl border border-[var(--border)] p-2.5 sm:p-3 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
          {/* 1. Date Range Filter */}
          <div className="relative min-w-[155px] max-w-[210px] flex-1" ref={datePopoverRef}>
            <button
              type="button"
              onClick={handleToggleOpen}
              className={`w-full h-9 px-3 rounded-xl border text-[11px] font-semibold surface flex items-center justify-between gap-1.5 cursor-pointer shadow-2xs transition-colors truncate ${
                startDate || endDate
                  ? 'border-[var(--brand-purple)] text-[var(--brand-purple)] bg-[var(--brand-purple-soft)]/25 font-bold'
                  : 'border-[var(--border)] text-[var(--text)] hover:border-[var(--brand-purple)]/60'
              }`}
              title="Filter by date range"
            >
              <span className="flex items-center gap-1.5 truncate">
                <Calendar className="w-3.5 h-3.5 text-[var(--brand-purple)] shrink-0" />
                <span className="truncate">{dateRangeLabel}</span>
              </span>
              <ChevronDown className="w-3 h-3 text-[var(--secondary)] shrink-0" />
            </button>

            {dateOpen && (
              <div className="absolute left-0 top-full mt-2 z-50 surface rounded-2xl border border-[var(--border)] p-3.5 shadow-xl w-72 space-y-3">
                <div className="text-xs font-bold text-[var(--text)] flex items-center justify-between">
                  <span>Select Operational Dates</span>
                  <span className="text-[10px] text-[var(--secondary)] font-normal">2026 Dataset</span>
                </div>

                {/* Quick Presets */}
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('2026-08-01', '2026-10-31')}
                    className="px-2 py-1 rounded-lg border border-[var(--border)] text-[10px] font-semibold hover:border-[var(--brand-purple)] hover:text-[var(--brand-purple)] text-left"
                  >
                    All (Aug-Oct 2026)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('2026-08-01', '2026-08-31')}
                    className="px-2 py-1 rounded-lg border border-[var(--border)] text-[10px] font-semibold hover:border-[var(--brand-purple)] hover:text-[var(--brand-purple)] text-left"
                  >
                    August 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('2026-09-01', '2026-09-30')}
                    className="px-2 py-1 rounded-lg border border-[var(--border)] text-[10px] font-semibold hover:border-[var(--brand-purple)] hover:text-[var(--brand-purple)] text-left"
                  >
                    September 2026
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset('2026-10-01', '2026-10-31')}
                    className="px-2 py-1 rounded-lg border border-[var(--border)] text-[10px] font-semibold hover:border-[var(--brand-purple)] hover:text-[var(--brand-purple)] text-left"
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
          <div className="relative min-w-[110px] max-w-[145px] flex-1">
            <select
              value={plantId}
              onChange={(e) => onPlantChange(e.target.value)}
              className={getSelectClass(plantId)}
            >
              {PLANT_OPTIONS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--secondary)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 3. Shift Filter */}
          <div className="relative min-w-[110px] max-w-[145px] flex-1">
            <select
              value={shiftId}
              onChange={(e) => onShiftChange(e.target.value)}
              className={getSelectClass(shiftId)}
            >
              <option value="">All Shifts</option>
              <option value="A">Shift A – GS1</option>
              <option value="B">Shift B – S2</option>
              <option value="C">Shift C – NS3</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--secondary)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 4. Department Filter */}
          <div className="relative min-w-[130px] max-w-[165px] flex-1">
            <select
              value={department}
              onChange={(e) => onDepartmentChange(e.target.value)}
              className={getSelectClass(department)}
            >
              <option value="">All Departments</option>
              {availableDepts.map((d) => (
                <option key={d.department_id || d.id} value={d.department_id || d.id}>
                  {d.department_name || d.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--secondary)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 5. Section Filter */}
          <div className="relative min-w-[120px] max-w-[160px] flex-1">
            <select
              value={section}
              onChange={(e) => onSectionChange(e.target.value)}
              className={getSelectClass(section)}
            >
              <option value="">All Sections</option>
              {availableSecs.map((s) => (
                <option key={s.section_id || s.id} value={s.section_id || s.id}>
                  {s.section_name || s.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--secondary)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 6. Employment Type Filter */}
          <div className="relative min-w-[130px] max-w-[170px] flex-1">
            <select
              value={employmentType}
              onChange={(e) => onEmploymentTypeChange(e.target.value)}
              className={getSelectClass(employmentType)}
            >
              {EMPLOYMENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--secondary)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* 7. Vendor Filter */}
          <div className="relative min-w-[120px] max-w-[165px] flex-1">
            <select
              value={vendorId}
              onChange={(e) => onVendorChange(e.target.value)}
              className={getSelectClass(vendorId)}
            >
              {VENDOR_OPTIONS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[var(--secondary)] absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reset Action */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="h-9 px-3 rounded-xl bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] border border-[var(--brand-purple)]/30 text-[11px] font-bold hover:bg-[var(--brand-purple)] hover:text-white transition-all cursor-pointer shadow-2xs flex items-center gap-1.5 shrink-0"
              title="Reset all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Right Utility: Coverage & Refresh */}
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          {/* Coverage pill */}
          <div className="flex items-center gap-1.5 px-3 h-9 rounded-xl surface border border-[var(--border)] shadow-2xs text-[11px] font-semibold text-[var(--secondary)]">
            <Calendar className="w-3.5 h-3.5 text-[var(--brand-purple)] shrink-0" />
            <span className="hidden lg:inline text-[var(--secondary)]">Coverage:</span>
            <span className="text-[var(--text)] font-bold">{coverageLabel}</span>
          </div>

          {/* Refresh button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 px-3.5 h-9 rounded-xl surface border border-[var(--border)] text-[var(--text)] hover:border-[var(--brand-purple)] hover:text-[var(--brand-purple)] transition-colors shadow-2xs text-[11px] font-semibold cursor-pointer disabled:opacity-60"
              title="Refresh dashboard data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[var(--brand-purple)]' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
