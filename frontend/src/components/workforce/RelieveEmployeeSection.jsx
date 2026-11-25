import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  HelpCircle,
  Layers,
  RefreshCw,
  RotateCcw,
  Search,
  Undo2,
  UserCheck,
  UserMinus,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  fetchExitOptions,
  fetchRecentlyRelieved,
  reinstateEmployee,
  relieveEmployee,
  searchActiveEmployees,
} from '../../api/workforceApi';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

function formatTenure(months) {
  if (months == null || isNaN(months)) return '—';
  const m = Number(months);
  if (m < 12) {
    return `${m.toFixed(1)} mos`;
  }
  const years = (m / 12).toFixed(1);
  return `${years} yrs (${m.toFixed(1)} mos)`;
}

export function RelieveEmployeeSection({ onEmployeeRelieved, onNavigateToDirectory }) {
  // Options State
  const [exitOptions, setExitOptions] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const searchContainerRef = useRef(null);

  // Form Fields
  const todayStr = new Date().toISOString().split('T')[0];
  const [exitDate, setExitDate] = useState(todayStr);
  const [exitType, setExitType] = useState('Resignation');
  const [exitReason, setExitReason] = useState('Better Salary Offer');
  const [regrettableLoss, setRegrettableLoss] = useState('No');
  const [remarks, setRemarks] = useState('');

  // Validation & Submission State
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Recently Relieved Table State
  const [recentlyRelieved, setRecentlyRelieved] = useState([]);
  const [loadingRelieved, setLoadingRelieved] = useState(false);
  const [reinstatingId, setReinstatingId] = useState(null);

  // 1. Load Exit Options & Recently Relieved on mount
  const loadOptions = useCallback(async () => {
    try {
      setLoadingOptions(true);
      setOptionsError(null);
      const data = await fetchExitOptions();
      setExitOptions(data);
      if (data.exit_types?.length > 0) {
        setExitType(data.exit_types[0]);
      }
      if (data.exit_reasons?.length > 0) {
        setExitReason(data.exit_reasons[0]);
      }
    } catch (err) {
      setOptionsError(err.message || 'Failed to load exit options.');
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  const loadRecentlyRelieved = useCallback(async () => {
    try {
      setLoadingRelieved(true);
      const data = await fetchRecentlyRelieved({ limit: 20 });
      setRecentlyRelieved(Array.isArray(data) ? data : []);
    } catch {
      // Non-blocking for recently relieved list
    } finally {
      setLoadingRelieved(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
    loadRecentlyRelieved();
  }, [loadOptions, loadRecentlyRelieved]);

  // 2. Debounced Active Employee Search
  useEffect(() => {
    if (!searchQuery || selectedEmployee) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const results = await searchActiveEmployees({ q: searchQuery.trim(), status: 'Active', limit: 10 });
        setSearchResults(results);
        setShowDropdown(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedEmployee]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 3. Selection Handler
  const handleSelectEmployee = (emp) => {
    setSelectedEmployee(emp);
    setSearchQuery(`${emp.full_name} (${emp.employee_id})`);
    setShowDropdown(false);
    setErrors({});
    setSubmitError(null);
    setSuccessMessage(null);

    // Set exit date default to today (bounded by joining date)
    const doj = emp.date_of_joining ? String(emp.date_of_joining) : '';
    if (doj && doj > todayStr) {
      setExitDate(doj);
    } else {
      setExitDate(todayStr);
    }
  };

  const handleClearSelection = () => {
    setSelectedEmployee(null);
    setSearchQuery('');
    setSearchResults([]);
    setExitDate(todayStr);
    setRemarks('');
    setErrors({});
    setSubmitError(null);
  };

  // 4. Form Validation
  const validateForm = () => {
    const errs = {};
    if (!selectedEmployee) {
      errs.employee = 'Please search and select an active employee.';
    }
    if (!exitDate) {
      errs.exitDate = 'Exit date is required.';
    } else {
      if (exitDate > todayStr) {
        errs.exitDate = 'Exit date cannot be in the future.';
      }
      if (selectedEmployee?.date_of_joining && exitDate < selectedEmployee.date_of_joining) {
        errs.exitDate = `Exit date cannot be before date of joining (${selectedEmployee.date_of_joining}).`;
      }
    }
    if (!exitType) {
      errs.exitType = 'Exit type is required.';
    }
    if (!exitReason) {
      errs.exitReason = 'Exit reason is required.';
    }
    if (remarks && remarks.length > 500) {
      errs.remarks = 'Remarks must not exceed 500 characters.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // 5. Submit Handler
  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitError(null);
    setShowConfirmModal(true);
  };

  const handleConfirmRelieve = async () => {
    setShowConfirmModal(false);
    if (!selectedEmployee) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const payload = {
        exit_date: exitDate,
        exit_type: exitType,
        exit_reason: exitReason,
        regrettable_loss: regrettableLoss,
        remarks: remarks.trim() || null,
      };

      const result = await relieveEmployee(selectedEmployee.employee_id, payload);

      setSuccessMessage(
        `Employee ${result.full_name} (${result.employee_id}) marked as Resigned on ${result.exit_date}.`
      );

      // Reset selection and form
      handleClearSelection();

      // Refresh recently relieved list and trigger parent refresh
      await loadRecentlyRelieved();
      if (onEmployeeRelieved) {
        onEmployeeRelieved(result);
      }
    } catch (err) {
      const resData = err.response?.data;
      let msg = 'Failed to relieve employee.';
      if (typeof resData?.detail === 'string') {
        msg = resData.detail;
      } else if (Array.isArray(resData?.detail)) {
        msg = resData.detail.map((d) => d.msg || d.message || JSON.stringify(d)).join('; ');
      } else if (resData?.message) {
        msg = resData.message;
      } else if (err.message) {
        msg = err.message;
      }
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // 6. Reinstate Handler (Undo Safety)
  const handleReinstate = async (empId, empName) => {
    if (!window.confirm(`Reinstate ${empName} (${empId}) back to Active status?`)) {
      return;
    }

    try {
      setReinstatingId(empId);
      await reinstateEmployee(empId);
      setSuccessMessage(`Employee ${empName} (${empId}) has been reinstated to Active status.`);
      await loadRecentlyRelieved();
      if (onEmployeeRelieved) {
        onEmployeeRelieved({ employee_id: empId, status: 'Active' });
      }
    } catch (err) {
      alert(`Failed to reinstate: ${err.response?.data?.detail || err.message}`);
    } finally {
      setReinstatingId(null);
    }
  };

  if (loadingOptions) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (optionsError) {
    return (
      <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-sm flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>Failed to load exit options: {optionsError}</span>
        <button
          type="button"
          onClick={loadOptions}
          className="ml-auto underline font-bold cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <Card className="p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <UserMinus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-[var(--text)] tracking-tight">
                Relieve Employee (Attrition Management)
              </h2>
              <p className="text-xs text-[var(--secondary)] mt-0.5">
                Mark active employees as resigned/exited with validated exit type, reason, and tenure records.
              </p>
            </div>
          </div>
          {onNavigateToDirectory && (
            <button
              type="button"
              onClick={onNavigateToDirectory}
              className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Back to Workforce Directory &rarr;
            </button>
          )}
        </div>

        {/* Global Success Banner */}
        {successMessage && (
          <div className="mt-4 p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMessage(null)}
              className="text-emerald-700 dark:text-emerald-300 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Global Error Banner */}
        {submitError && (
          <div className="mt-4 p-3.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-200 text-xs flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{submitError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSubmitError(null)}
              className="text-rose-700 dark:text-rose-300 hover:text-rose-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 1: Active Employee Search */}
        <div className="mt-6 space-y-4">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              1
            </span>
            <label className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
              Select Active Employee
            </label>
          </div>

          <div ref={searchContainerRef} className="relative max-w-xl">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (selectedEmployee) setSelectedEmployee(null);
                }}
                onFocus={() => {
                  if (searchResults.length > 0) setShowDropdown(true);
                }}
                placeholder="Search active employee by ID (e.g. EMP-10001) or full name..."
                className={`w-full h-10 pl-9 pr-10 rounded-xl border text-xs font-medium outline-none transition-all shadow-2xs bg-[var(--surface)] text-[var(--text)] ${
                  errors.employee
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-[var(--border)] focus:border-purple-500 hover:border-purple-300 dark:hover:border-purple-700'
                }`}
              />
              {selectedEmployee ? (
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  title="Clear selection"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : isSearching ? (
                <div className="absolute right-3 top-3">
                  <RefreshCw className="w-4 h-4 text-purple-600 animate-spin" />
                </div>
              ) : null}
            </div>

            {errors.employee && (
              <p className="text-[11px] text-rose-500 font-semibold mt-1">{errors.employee}</p>
            )}

            {/* Dropdown Results */}
            {showDropdown && searchResults.length > 0 && !selectedEmployee && (
              <div className="absolute left-0 right-0 top-11 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-30 max-h-60 overflow-y-auto divide-y divide-[var(--border)]">
                {searchResults.map((emp) => (
                  <button
                    key={emp.employee_id}
                    type="button"
                    onClick={() => handleSelectEmployee(emp)}
                    className="w-full text-left p-3 hover:bg-[var(--surface-hover)] transition-colors flex items-center justify-between gap-3 text-xs cursor-pointer"
                  >
                    <div>
                      <div className="font-bold text-[var(--text)]">
                        {emp.full_name} <span className="text-[11px] text-purple-600 font-bold">({emp.employee_id})</span>
                      </div>
                      <div className="text-[11px] text-[var(--secondary)] mt-0.5">
                        {emp.designation} &bull; {emp.department_name} ({emp.plant_id})
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 shrink-0">
                      Active
                    </span>
                  </button>
                ))}
              </div>
            )}

            {showDropdown && searchResults.length === 0 && !isSearching && searchQuery.trim() && !selectedEmployee && (
              <div className="absolute left-0 right-0 top-11 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg z-30 p-4 text-xs text-center text-[var(--secondary)]">
                No active employee matches &ldquo;{searchQuery}&rdquo;.
              </div>
            )}
          </div>

          {/* Selected Employee Read-Only Summary Card */}
          {selectedEmployee && (
            <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900 bg-purple-50/50 dark:bg-purple-950/20 space-y-3">
              <div className="flex items-center justify-between border-b border-purple-200/60 dark:border-purple-900/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="font-extrabold text-xs text-[var(--text)]">
                    Selected Employee Details
                  </span>
                </div>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300">
                  {selectedEmployee.employment_status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)] block">
                    Employee ID
                  </span>
                  <span className="font-bold text-[var(--text)]">{selectedEmployee.employee_id}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)] block">
                    Full Name
                  </span>
                  <span className="font-bold text-[var(--text)]">{selectedEmployee.full_name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)] block">
                    Manufacturing Plant
                  </span>
                  <span className="font-semibold text-[var(--text)]">{selectedEmployee.plant_id}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)] block">
                    Department
                  </span>
                  <span className="font-semibold text-[var(--text)]">{selectedEmployee.department_name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)] block">
                    Section
                  </span>
                  <span className="font-semibold text-[var(--text)]">{selectedEmployee.section_name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)] block">
                    Designation
                  </span>
                  <span className="font-semibold text-[var(--text)]">{selectedEmployee.designation}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)] block">
                    Employment Type
                  </span>
                  <span className="font-semibold text-[var(--text)]">
                    {selectedEmployee.employment_type}
                    {selectedEmployee.vendor_name ? ` (${selectedEmployee.vendor_name})` : ''}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)] block">
                    Home Shift
                  </span>
                  <span className="font-semibold text-[var(--text)]">{selectedEmployee.shift_id}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)] block">
                    Date of Joining
                  </span>
                  <span className="font-semibold text-[var(--text)]">{selectedEmployee.date_of_joining}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--secondary)] block">
                    Current Tenure
                  </span>
                  <span className="font-extrabold text-purple-700 dark:text-purple-300">
                    {formatTenure(selectedEmployee.current_tenure_months)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Exit Details Form */}
        <form onSubmit={handleOpenConfirm} className="mt-8 space-y-5 border-t border-[var(--border)] pt-6">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-purple-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              2
            </span>
            <label className="text-xs font-bold text-[var(--text)] uppercase tracking-wider">
              Enter Exit & Attrition Details
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Exit Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-purple-600" />
                Exit Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={exitDate}
                max={todayStr}
                min={selectedEmployee?.date_of_joining || ''}
                onChange={(e) => setExitDate(e.target.value)}
                className={`w-full h-10 px-3 rounded-xl border text-xs font-medium outline-none transition-all shadow-2xs bg-[var(--surface)] text-[var(--text)] ${
                  errors.exitDate
                    ? 'border-rose-400 focus:border-rose-500'
                    : 'border-[var(--border)] focus:border-purple-500 hover:border-purple-300 dark:hover:border-purple-700'
                }`}
              />
              {errors.exitDate && (
                <p className="text-[11px] text-rose-500 font-semibold">{errors.exitDate}</p>
              )}
            </div>

            {/* Exit Type */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
                Exit Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={exitType}
                onChange={(e) => setExitType(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[var(--border)] text-xs font-medium outline-none transition-all shadow-2xs bg-[var(--surface)] text-[var(--text)] focus:border-purple-500 hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer"
              >
                {exitOptions?.exit_types?.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errors.exitType && (
                <p className="text-[11px] text-rose-500 font-semibold">{errors.exitType}</p>
              )}
            </div>

            {/* Exit Reason */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
                Exit Reason <span className="text-rose-500">*</span>
              </label>
              <select
                value={exitReason}
                onChange={(e) => setExitReason(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[var(--border)] text-xs font-medium outline-none transition-all shadow-2xs bg-[var(--surface)] text-[var(--text)] focus:border-purple-500 hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer"
              >
                {exitOptions?.exit_reasons?.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              {errors.exitReason && (
                <p className="text-[11px] text-rose-500 font-semibold">{errors.exitReason}</p>
              )}
            </div>

            {/* Regrettable Loss */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[var(--text)] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Regrettable Loss?
              </label>
              <select
                value={regrettableLoss}
                onChange={(e) => setRegrettableLoss(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-[var(--border)] text-xs font-medium outline-none transition-all shadow-2xs bg-[var(--surface)] text-[var(--text)] focus:border-purple-500 hover:border-purple-300 dark:hover:border-purple-700 cursor-pointer"
              >
                <option value="No">No (Normal attrition / Non-critical)</option>
                <option value="Yes">Yes (Key talent / High impact loss)</option>
              </select>
            </div>

            {/* Remarks / Destination (spans 2 cols on lg) */}
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-bold text-[var(--text)]">
                Remarks / Next Destination <span className="text-slate-400 font-normal">(Optional, max 500 chars)</span>
              </label>
              <textarea
                rows={1}
                maxLength={500}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Relocating to hometown, competitor offer, higher studies..."
                className="w-full h-10 px-3 py-2 rounded-xl border border-[var(--border)] text-xs font-medium outline-none transition-all shadow-2xs bg-[var(--surface)] text-[var(--text)] focus:border-purple-500 hover:border-purple-300 dark:hover:border-purple-700 resize-none"
              />
              {errors.remarks && (
                <p className="text-[11px] text-rose-500 font-semibold">{errors.remarks}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={handleClearSelection}
              disabled={submitting}
              className="h-10 px-4 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedEmployee}
              className="h-10 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Relieving...
                </>
              ) : (
                <>
                  <UserMinus className="w-3.5 h-3.5" />
                  Relieve Employee
                </>
              )}
            </button>
          </div>
        </form>
      </Card>

      {/* Confirmation Modal Dialog */}
      {showConfirmModal && selectedEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-extrabold text-[var(--text)]">
                Confirm Employee Relieve
              </h3>
            </div>

            <p className="text-xs text-[var(--secondary)] leading-relaxed">
              Are you sure you want to mark{' '}
              <strong className="text-[var(--text)]">{selectedEmployee.full_name}</strong> (
              <strong className="text-purple-600">{selectedEmployee.employee_id}</strong>) as relieved on{' '}
              <strong className="text-[var(--text)]">{exitDate}</strong>?
            </p>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-[var(--border)] text-[11px] space-y-1 text-[var(--secondary)]">
              <div>&bull; Exit Type: <span className="font-bold text-[var(--text)]">{exitType}</span></div>
              <div>&bull; Reason: <span className="font-bold text-[var(--text)]">{exitReason}</span></div>
              <div>&bull; Regrettable Loss: <span className="font-bold text-[var(--text)]">{regrettableLoss}</span></div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
              This will record the exit transaction in Neon PostgreSQL and update all operations dashboards and AI assistant metrics immediately.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="h-9 px-4 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--secondary)] hover:bg-[var(--surface-hover)] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRelieve}
                className="h-9 px-5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <UserMinus className="w-3.5 h-3.5" />
                Confirm Relieve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recently Relieved Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            <h3 className="text-sm font-extrabold text-[var(--text)] tracking-tight">
              Recently Relieved Employees
            </h3>
          </div>
          <button
            type="button"
            onClick={loadRecentlyRelieved}
            disabled={loadingRelieved}
            className="text-xs font-bold text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${loadingRelieved ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loadingRelieved ? (
          <div className="space-y-2 py-4">
            <LoadingSkeleton className="h-10 w-full rounded-xl" />
            <LoadingSkeleton className="h-10 w-full rounded-xl" />
            <LoadingSkeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : recentlyRelieved.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--secondary)]">
            No recently relieved employee records found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[10px] uppercase font-bold text-[var(--secondary)] tracking-wider">
                  <th className="py-2.5 px-3">Employee ID</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Department</th>
                  <th className="py-2.5 px-3">Exit Date</th>
                  <th className="py-2.5 px-3">Exit Type</th>
                  <th className="py-2.5 px-3">Exit Reason</th>
                  <th className="py-2.5 px-3">Tenure</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {recentlyRelieved.map((item) => (
                  <tr key={item.attrition_id} className="hover:bg-[var(--surface-hover)] transition-colors">
                    <td className="py-2.5 px-3 font-bold text-purple-600">{item.employee_id}</td>
                    <td className="py-2.5 px-3 font-bold text-[var(--text)]">{item.employee_name}</td>
                    <td className="py-2.5 px-3 text-[var(--secondary)]">{item.department_name}</td>
                    <td className="py-2.5 px-3 font-semibold text-[var(--text)]">{item.exit_date}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-[var(--text)] border border-[var(--border)]">
                        {item.exit_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[var(--secondary)]">{item.exit_reason}</td>
                    <td className="py-2.5 px-3 text-purple-700 dark:text-purple-300 font-bold">
                      {formatTenure(item.tenure_months)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleReinstate(item.employee_id, item.employee_name)}
                        disabled={reinstatingId === item.employee_id}
                        className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/40 transition-colors cursor-pointer flex items-center gap-1 ml-auto"
                        title="Undo exit and reinstate to Active"
                      >
                        {reinstatingId === item.employee_id ? (
                          <RefreshCw className="w-3 h-3 animate-spin" />
                        ) : (
                          <Undo2 className="w-3 h-3" />
                        )}
                        Reinstate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
