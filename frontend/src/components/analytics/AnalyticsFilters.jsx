import { Calendar, ChevronDown, RotateCcw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../common/Button';
import { Card } from '../common/Card';
import { PLANT_OPTIONS } from '../../utils/constants';

const SHIFTS = [
  { id: '', label: 'All Shifts' },
  { id: 'A', label: 'GS1' },
  { id: 'B', label: 'S2' },
  { id: 'C', label: 'NS3' },
];

const PLANTS = PLANT_OPTIONS;

const TEAMS = [
  { id: '', label: 'All Teams' },
  ...Array.from({ length: 18 }, (_, i) => {
    const id = `TEAM-${String(i + 1).padStart(2, '0')}`;
    return { id, label: id };
  }),
];

export function AnalyticsFilters({
  startDate = '',
  endDate = '',
  shiftId = '',
  departmentId = '',
  sectionId = '',
  plantId = '',
  operatorTeam = '',
  departments = [],
  sections = [],
  onStartDateChange,
  onEndDateChange,
  onShiftChange,
  onDepartmentChange,
  onSectionChange,
  onPlantChange,
  onTeamChange,
  onReset,
}) {
  const [dateOpen, setDateOpen] = useState(false);
  const datePopoverRef = useRef(null);

  useEffect(() => {
    if (!dateOpen) return undefined;
    function handleOutside(e) {
      if (datePopoverRef.current && !datePopoverRef.current.contains(e.target)) {
        setDateOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [dateOpen]);

  const dateLabel =
    startDate && endDate
      ? `${startDate} – ${endDate}`
      : startDate
        ? `From ${startDate}`
        : endDate
          ? `Until ${endDate}`
          : 'Select Date Range';

  const selectClass =
    'h-9 rounded-lg border px-2.5 text-[11px] font-medium outline-none cursor-pointer flex-1 min-w-[105px]';
  const selectStyle = {
    borderColor: 'var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
  };

  const hasActiveFilters = Boolean(
    startDate || endDate || shiftId || departmentId || sectionId || plantId || operatorTeam
  );

  return (
    <Card className="px-3.5 py-3 mb-4">
      <div className="flex flex-wrap items-center gap-2">
        {/* Date range popover */}
        <div ref={datePopoverRef} className="relative flex-1 min-w-[190px] max-w-[240px]">
          <button
            type="button"
            onClick={() => setDateOpen((prev) => !prev)}
            aria-label="Select Date Range"
            aria-expanded={dateOpen}
            className="w-full h-9 rounded-lg border px-3 flex items-center justify-between gap-2 text-[11px] font-medium cursor-pointer"
            style={{
              borderColor: 'var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
            }}
          >
            <span className="flex items-center gap-2 truncate">
              <Calendar className="w-3.5 h-3.5 muted shrink-0" />
              <span className="truncate">{dateLabel}</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 muted shrink-0" />
          </button>

          {dateOpen && (
            <div
              className="absolute left-0 mt-2 w-64 rounded-xl surface p-3 z-30 shadow-lg border space-y-2.5"
              style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              role="dialog"
              aria-label="Date range selector"
            >
              <label className="block text-[10px] font-semibold muted">
                From
                <input
                  type="date"
                  value={startDate}
                  max={endDate || undefined}
                  onChange={(e) => onStartDateChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-[11px] bg-transparent outline-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </label>

              <label className="block text-[10px] font-semibold muted">
                To
                <input
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => onEndDateChange(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-[11px] bg-transparent outline-none"
                  style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
                />
              </label>

              <div className="flex justify-between items-center pt-1 border-t" style={{ borderColor: 'var(--border)' }}>
                <button
                  type="button"
                  onClick={() => {
                    onStartDateChange('');
                    onEndDateChange('');
                  }}
                  className="text-[10px] muted hover:underline cursor-pointer"
                >
                  Clear dates
                </button>
                <Button size="sm" onClick={() => setDateOpen(false)}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Plant Filter */}
        <select
          value={plantId}
          onChange={(e) => onPlantChange(e.target.value)}
          className={selectClass}
          style={selectStyle}
          aria-label="Filter by Plant"
        >
          {PLANTS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>

        {/* Shift Filter */}
        <select
          value={shiftId}
          onChange={(e) => onShiftChange(e.target.value)}
          className={selectClass}
          style={selectStyle}
          aria-label="Filter by Shift"
        >
          {SHIFTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>

        {/* Department Filter */}
        <select
          value={departmentId}
          onChange={(e) => onDepartmentChange(e.target.value)}
          className={selectClass}
          style={selectStyle}
          aria-label="Filter by Department"
        >
          <option value="">All Departments</option>
          {departments.map((d) => (
            <option key={d.department_id} value={d.department_id}>
              {d.department_name}
            </option>
          ))}
        </select>

        {/* Section Filter */}
        <select
          value={sectionId}
          onChange={(e) => onSectionChange(e.target.value)}
          className={selectClass}
          style={selectStyle}
          aria-label="Filter by Section"
        >
          <option value="">All Sections</option>
          {sections.map((s) => (
            <option key={s.section_id} value={s.section_id}>
              {s.section_name}
            </option>
          ))}
        </select>

        {/* Team Filter */}
        <select
          value={operatorTeam}
          onChange={(e) => onTeamChange(e.target.value)}
          className={selectClass}
          style={selectStyle}
          aria-label="Filter by Team"
        >
          {TEAMS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Reset button */}
        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            className="h-9 px-3 text-[11px] shrink-0"
          >
            <RotateCcw className="w-3 h-3 mr-1 inline" /> Reset
          </Button>
        )}
      </div>
    </Card>
  );
}

