import {
  AlertCircle,
  Briefcase,
  CheckCircle2,
  GraduationCap,
  RotateCcw,
  Save,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { createEmployee, fetchEmployeeCreateOptions } from '../../api/workforceApi';
import { Card } from '../common/Card';
import { LoadingSkeleton } from '../common/LoadingSkeleton';

export function AddEmployeeSection({ onEmployeeCreated, onNavigateToDirectory }) {
  const [options, setOptions] = useState(null);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(null);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('Single');
  const [residenceCity, setResidenceCity] = useState('');

  const [employmentType, setEmploymentType] = useState('Permanent');
  const [vendorId, setVendorId] = useState('');
  const [doj, setDoj] = useState(new Date().toISOString().split('T')[0]);
  const [plantId, setPlantId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [sectionId, setSectionId] = useState('');
  const [designation, setDesignation] = useState('');
  const [grade, setGrade] = useState('G1');
  const [shiftId, setShiftId] = useState('A');
  const [previousExpYears, setPreviousExpYears] = useState('0.0');

  // Interaction & Submission State
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [createdResult, setCreatedResult] = useState(null);

  // Load dropdown options
  useEffect(() => {
    let mounted = true;
    async function loadOptions() {
      try {
        setLoadingOptions(true);
        setOptionsError(null);
        const data = await fetchEmployeeCreateOptions();
        if (mounted) {
          setOptions(data);
          if (data.plants?.length > 0) {
            setPlantId(data.plants[0].plant_id);
          }
          if (data.cities?.length > 0) {
            setResidenceCity(data.cities[0]);
          }
        }
      } catch (err) {
        if (mounted) {
          setOptionsError(err.message || 'Failed to load form options.');
        }
      } finally {
        if (mounted) setLoadingOptions(false);
      }
    }
    loadOptions();
    return () => {
      mounted = false;
    };
  }, []);

  // Compute Age
  const age = useMemo(() => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    return calculatedAge;
  }, [dob]);

  // Available departments based on plant
  const availableDepartments = useMemo(() => {
    if (!options?.departments) return [];
    if (!plantId) {
      const map = new Map();
      options.departments.forEach((d) => {
        if (!map.has(d.department_id)) map.set(d.department_id, d);
      });
      return Array.from(map.values());
    }
    return options.departments.filter((d) => d.plant_id === plantId);
  }, [options, plantId]);

  // Available sections based on department
  const availableSections = useMemo(() => {
    if (!options?.sections) return [];
    if (!departmentId) return options.sections;
    return options.sections.filter((s) => s.department_id === departmentId);
  }, [options, departmentId]);

  // Handle designation selection with auto-preselection of department and section
  const handleDesignationChange = useCallback(
    (e) => {
      const newDesig = e.target.value;
      setDesignation(newDesig);
      setTouched((prev) => ({ ...prev, designation: true }));

      if (newDesig && options?.distinct_designations) {
        const match = options.distinct_designations.find((d) => d.designation === newDesig);
        if (match) {
          setDepartmentId(match.department_id);
          setSectionId(match.section_id);
        }
      }
    },
    [options]
  );

  // Field validation checks
  const errors = useMemo(() => {
    const errs = {};
    if (!firstName.trim()) errs.firstName = 'First name is required';
    if (!lastName.trim()) errs.lastName = 'Last name is required';
    if (!gender) errs.gender = 'Gender is required';

    if (!dob) {
      errs.dob = 'Date of birth is required';
    } else if (age === null || age < 18 || age > 65) {
      errs.dob = `Age must be between 18 and 65 (current: ${age ?? 'invalid'})`;
    }

    if (!maritalStatus) errs.maritalStatus = 'Marital status is required';
    if (!residenceCity) errs.residenceCity = 'Residence city is required';

    if (!employmentType) errs.employmentType = 'Employment type is required';
    if (employmentType.toLowerCase() === 'vendor' && !vendorId) {
      errs.vendorId = 'Vendor is required for vendor workforce';
    }

    if (!doj) {
      errs.doj = 'Date of joining is required';
    } else {
      const joinDate = new Date(doj);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (joinDate > today) {
        errs.doj = 'Date of joining cannot be in the future';
      }
    }

    if (!plantId) errs.plantId = 'Plant is required';
    if (!departmentId) errs.departmentId = 'Department is required';
    if (!sectionId) errs.sectionId = 'Section is required';
    if (!designation) errs.designation = 'Designation is required';
    if (!grade) errs.grade = 'Grade is required';
    if (!shiftId) errs.shiftId = 'Shift is required';

    const pExp = parseFloat(previousExpYears);
    if (isNaN(pExp) || pExp < 0) {
      errs.previousExpYears = 'Previous experience must be >= 0';
    }

    return errs;
  }, [
    firstName,
    lastName,
    gender,
    dob,
    age,
    maritalStatus,
    residenceCity,
    employmentType,
    vendorId,
    doj,
    plantId,
    departmentId,
    sectionId,
    designation,
    grade,
    shiftId,
    previousExpYears,
  ]);

  const isFormValid = Object.keys(errors).length === 0;

  // Clear form
  const handleClear = () => {
    setFirstName('');
    setLastName('');
    setGender('Male');
    setDob('');
    setMaritalStatus('Single');
    setResidenceCity(options?.cities?.[0] || '');
    setEmploymentType('Permanent');
    setVendorId('');
    setDoj(new Date().toISOString().split('T')[0]);
    if (options?.plants?.length > 0) setPlantId(options.plants[0].plant_id);
    setDepartmentId('');
    setSectionId('');
    setDesignation('');
    setGrade('G1');
    setShiftId('A');
    setPreviousExpYears('0.0');
    setTouched({});
    setSubmitError(null);
    setCreatedResult(null);
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({
      firstName: true,
      lastName: true,
      gender: true,
      dob: true,
      maritalStatus: true,
      residenceCity: true,
      employmentType: true,
      vendorId: true,
      doj: true,
      plantId: true,
      departmentId: true,
      sectionId: true,
      designation: true,
      grade: true,
      shiftId: true,
      previousExpYears: true,
    });

    if (!isFormValid) return;

    try {
      setSubmitting(true);
      setSubmitError(null);

      const payload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender,
        date_of_birth: dob,
        marital_status: maritalStatus,
        residence_city: residenceCity,
        employment_type: employmentType,
        plant_id: plantId,
        department_id: departmentId,
        section_id: sectionId,
        designation,
        grade,
        shift_id: shiftId,
        date_of_joining: doj,
        vendor_id: employmentType.toLowerCase() === 'vendor' ? vendorId : null,
        previous_experience_years: parseFloat(previousExpYears) || 0.0,
      };

      const result = await createEmployee(payload);
      setCreatedResult(result);
      if (onEmployeeCreated) {
        onEmployeeCreated(result);
      }
    } catch (err) {
      const resData = err.response?.data;
      let msg = 'Failed to create employee.';
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

  if (loadingOptions) {
    return (
      <div className="space-y-4">
        <LoadingSkeleton height="h-64" />
      </div>
    );
  }

  if (optionsError) {
    return (
      <div className="p-4 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-sm flex items-center gap-3">
        <AlertCircle className="w-5 h-5 shrink-0" />
        <span>Failed to load employee creation options: {optionsError}</span>
      </div>
    );
  }

  // Success Confirmation Card
  if (createdResult) {
    return (
      <Card className="p-6 md:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Employee Successfully Added
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Verified and persisted across Employee Master, Experience, and Mapping registries.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300">
              {createdResult.employee_id}
            </span>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
              {createdResult.employee_class}
            </span>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Full Name</div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
              {createdResult.full_name}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Department</div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
              {createdResult.department_name}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Section</div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
              {createdResult.section_name}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Plant & Shift</div>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 mt-1">
              {createdResult.plant} • {createdResult.shift}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 justify-end">
          <button
            type="button"
            onClick={handleClear}
            className="h-10 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Another</span>
          </button>

          <button
            type="button"
            onClick={onNavigateToDirectory}
            className="h-10 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-xs cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>View in Employee Directory</span>
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 md:p-8 space-y-6">
      {/* Header with Title and Live Dynamic Badges */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Add Employee
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Register employee details, department mappings, and initial experience tenure.
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {submitError && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-3"
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Failed to Add Employee</div>
            <div>{submitError}</div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8" noValidate>
        {/* ================================================================= */}
        {/* GROUP 1: PERSONAL INFORMATION                                    */}
        {/* ================================================================= */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Personal Information
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* First Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, firstName: true }))}
                placeholder="e.g. Anand"
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 transition-colors shadow-2xs"
              />
              {touched.firstName && errors.firstName && (
                <p className="text-xs text-rose-500 mt-1">{errors.firstName}</p>
              )}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, lastName: true }))}
                placeholder="e.g. Kumar"
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 transition-colors shadow-2xs"
              />
              {touched.lastName && errors.lastName && (
                <p className="text-xs text-rose-500 mt-1">{errors.lastName}</p>
              )}
            </div>

            {/* Gender */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Gender <span className="text-rose-500">*</span>
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 transition-colors shadow-2xs cursor-pointer"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            {/* Date of Birth & Live Age */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                {age !== null && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Age: {age} yrs
                  </span>
                )}
              </div>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, dob: true }))}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 transition-colors shadow-2xs cursor-pointer"
              />
              {touched.dob && errors.dob && (
                <p className="text-xs text-rose-500 mt-1">{errors.dob}</p>
              )}
            </div>

            {/* Marital Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Marital Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 transition-colors shadow-2xs cursor-pointer"
              >
                {options?.marital_statuses?.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Residence City */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Residence City <span className="text-rose-500">*</span>
              </label>
              <select
                value={residenceCity}
                onChange={(e) => setResidenceCity(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 transition-colors shadow-2xs cursor-pointer"
              >
                {options?.cities?.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* GROUP 2: EMPLOYMENT INFORMATION                                  */}
        {/* ================================================================= */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Employment Details
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Employee ID (Read-only) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Employee ID
              </label>
              <input
                type="text"
                disabled
                value="Auto-generated"
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 px-3 text-xs text-slate-400 dark:text-slate-500 italic outline-none cursor-not-allowed"
              />
            </div>

            {/* Employment Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Employment Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={employmentType}
                onChange={(e) => {
                  setEmploymentType(e.target.value);
                  if (e.target.value.toLowerCase() !== 'vendor') {
                    setVendorId('');
                  }
                }}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 transition-colors shadow-2xs cursor-pointer"
              >
                {options?.employment_types?.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* Vendor (Enabled only if Vendor employment type) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Vendor{' '}
                {employmentType.toLowerCase() === 'vendor' ? (
                  <span className="text-rose-500">*</span>
                ) : (
                  <span className="text-slate-400 font-normal">(N/A for Permanent)</span>
                )}
              </label>
              <select
                disabled={employmentType.toLowerCase() !== 'vendor'}
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, vendorId: true }))}
                className={`h-10 w-full rounded-xl border px-3 text-xs outline-none transition-colors shadow-2xs ${
                  employmentType.toLowerCase() === 'vendor'
                    ? 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:border-purple-500 cursor-pointer'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                }`}
              >
                <option value="">Select Vendor...</option>
                {options?.vendors?.map((v) => (
                  <option key={v.vendor_id} value={v.vendor_id}>
                    {v.vendor_name} ({v.vendor_id})
                  </option>
                ))}
              </select>
              {touched.vendorId && errors.vendorId && (
                <p className="text-xs text-rose-500 mt-1">{errors.vendorId}</p>
              )}
            </div>

            {/* Date of Joining */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Date of Joining <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={doj}
                max={new Date().toISOString().split('T')[0]}
                onChange={(e) => setDoj(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, doj: true }))}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 transition-colors shadow-2xs cursor-pointer"
              />
              {touched.doj && errors.doj && (
                <p className="text-xs text-rose-500 mt-1">{errors.doj}</p>
              )}
            </div>

            {/* Plant */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Manufacturing Plant <span className="text-rose-500">*</span>
              </label>
              <select
                value={plantId}
                onChange={(e) => {
                  setPlantId(e.target.value);
                  setDepartmentId('');
                  setSectionId('');
                }}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 transition-colors shadow-2xs cursor-pointer"
              >
                {options?.plants?.map((p) => (
                  <option key={p.plant_id} value={p.plant_id}>
                    {p.plant_name} ({p.plant_id})
                  </option>
                ))}
              </select>
            </div>

            {/* Designation (Searchable preselection) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Designation <span className="text-rose-500">*</span>
              </label>
              <select
                value={designation}
                onChange={handleDesignationChange}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 transition-colors shadow-2xs cursor-pointer"
              >
                <option value="">Select Designation...</option>
                {options?.distinct_designations?.map((d) => (
                  <option key={d.designation} value={d.designation}>
                    {d.designation}
                  </option>
                ))}
              </select>
              {touched.designation && errors.designation && (
                <p className="text-xs text-rose-500 mt-1">{errors.designation}</p>
              )}
            </div>

            {/* Department (Filtered by Plant) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                value={departmentId}
                onChange={(e) => {
                  setDepartmentId(e.target.value);
                  setSectionId('');
                }}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 transition-colors shadow-2xs cursor-pointer"
              >
                <option value="">Select Department...</option>
                {availableDepartments.map((d) => (
                  <option key={`${d.department_id}-${d.plant_id || ''}`} value={d.department_id}>
                    {d.department_name} ({d.department_id})
                  </option>
                ))}
              </select>
              {touched.departmentId && errors.departmentId && (
                <p className="text-xs text-rose-500 mt-1">{errors.departmentId}</p>
              )}
            </div>

            {/* Section (Filtered by Department) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Section <span className="text-rose-500">*</span>
              </label>
              <select
                value={sectionId}
                onChange={(e) => setSectionId(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 transition-colors shadow-2xs cursor-pointer"
              >
                <option value="">Select Section...</option>
                {availableSections.map((s) => (
                  <option key={s.section_id} value={s.section_id}>
                    {s.section_name} ({s.section_id})
                  </option>
                ))}
              </select>
              {touched.sectionId && errors.sectionId && (
                <p className="text-xs text-rose-500 mt-1">{errors.sectionId}</p>
              )}
            </div>

            {/* Grade */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Skill Grade <span className="text-rose-500">*</span>
              </label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 transition-colors shadow-2xs cursor-pointer"
              >
                {options?.grades?.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            {/* Home Shift */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Home Shift <span className="text-rose-500">*</span>
              </label>
              <select
                value={shiftId}
                onChange={(e) => setShiftId(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 transition-colors shadow-2xs cursor-pointer"
              >
                {options?.shifts?.map((s) => (
                  <option key={s.shift_id} value={s.shift_id}>
                    Shift {s.shift_id} ({s.shift_name} {s.start_time}-{s.end_time})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* GROUP 3: EXPERIENCE INFORMATION                                  */}
        {/* ================================================================= */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Experience History
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Previous Industry Experience (Years) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.1"
                value={previousExpYears}
                onChange={(e) => setPreviousExpYears(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, previousExpYears: true }))}
                placeholder="0.0"
                className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-purple-500 transition-colors shadow-2xs"
              />
              {touched.previousExpYears && errors.previousExpYears && (
                <p className="text-xs text-rose-500 mt-1">{errors.previousExpYears}</p>
              )}
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={handleClear}
            disabled={submitting}
            className="h-10 px-5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>

          <button
            type="submit"
            disabled={submitting || !isFormValid}
            className="h-10 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 dark:disabled:bg-purple-900/50 text-white text-xs font-bold flex items-center gap-2 transition-colors shadow-xs cursor-pointer disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Employee</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Card>
  );
}
