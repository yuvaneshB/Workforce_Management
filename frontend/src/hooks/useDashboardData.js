import { useCallback, useEffect, useState } from 'react';
import { extractApiErrorMessage } from '../api/client';
import {
  fetchAttendanceAnalytics,
  fetchAttritionAnalytics,
  fetchComplianceAnalytics,
  fetchDepartmentAnalytics,
  fetchDepartments,
  fetchExperienceAnalytics,
  fetchGenderAnalytics,
  fetchNewJoinerAnalytics,
  fetchOvertimeAnalytics,
  fetchSectionAnalytics,
  fetchSections,
  fetchShiftEfficiencyAnalytics,
  fetchSkillsAnalytics,
  fetchTeamProductionAnalytics,
  fetchWorkforceSummary,
  fetchWorkforceAvailability,
  fetchWorkforceShortages,
  fetchSinglePersonDependency,
} from '../api/workforceApi';

export function useDashboardData({
  startDate = '',
  endDate = '',
  plantId = '',
  shiftId = '',
  departmentId = '',
  sectionId = '',
  granularity = 'daily',
} = {}) {
  const [workforceSummary, setWorkforceSummary] = useState(null);
  const [attendanceAnalytics, setAttendanceAnalytics] = useState(null);
  const [attritionAnalytics, setAttritionAnalytics] = useState(null);
  const [genderAnalytics, setGenderAnalytics] = useState(null);
  const [departmentAnalytics, setDepartmentAnalytics] = useState(null);
  const [experienceAnalytics, setExperienceAnalytics] = useState(null);
  const [newJoinerAnalytics, setNewJoinerAnalytics] = useState(null);
  const [sectionAnalytics, setSectionAnalytics] = useState(null);
  const [overtimeAnalytics, setOvertimeAnalytics] = useState(null);
  const [teamProductionAnalytics, setTeamProductionAnalytics] = useState(null);
  const [shiftEfficiencyAnalytics, setShiftEfficiencyAnalytics] = useState(null);
  const [complianceAnalytics, setComplianceAnalytics] = useState(null);
  const [skillsAnalytics, setSkillsAnalytics] = useState(null);
  const [planningAvailability, setPlanningAvailability] = useState(null);
  const [planningShortages, setPlanningShortages] = useState(null);
  const [singlePersonDependency, setSinglePersonDependency] = useState(null);
  const [filterOptions, setFilterOptions] = useState({
    departments: [],
    sections: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errors, setErrors] = useState({});
  const [reloadToken, setReloadToken] = useState(0);

  const refetch = useCallback(() => {
    setReloadToken((prev) => prev + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    Promise.all([
      fetchDepartments({ signal: controller.signal }),
      fetchSections({ signal: controller.signal }),
    ])
      .then(([deptRes, secRes]) => {
        if (!active) return;
        setFilterOptions({
          departments: deptRes?.items ?? [],
          sections: secRes?.items ?? [],
        });
      })
      .catch(() => {
        // Non-blocking filter option load
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadDashboard() {
      setLoading(true);
      setError(null);
      setErrors({});

      const commonFilters = {
        startDate,
        endDate,
        plantId: plantId || undefined,
        shiftId,
        departmentId,
        sectionId,
        signal: controller.signal,
      };

      try {
        const results = await Promise.allSettled([
          fetchWorkforceSummary({
            plantId: plantId || undefined,
            signal: controller.signal,
          }),
          fetchAttendanceAnalytics({
            period: granularity,
            startDate,
            endDate,
            plantId: plantId || undefined,
            shiftId,
            departmentId: departmentId || undefined,
            sectionId: sectionId || undefined,
            signal: controller.signal,
          }),
          fetchGenderAnalytics(commonFilters),
          fetchDepartmentAnalytics(commonFilters),
          fetchExperienceAnalytics(commonFilters),
          fetchNewJoinerAnalytics({
            period: granularity,
            ...commonFilters,
          }),
          fetchSectionAnalytics(commonFilters),
          fetchOvertimeAnalytics(commonFilters),
          fetchTeamProductionAnalytics({
            startDate,
            endDate,
            plantId: plantId || undefined,
            shiftId,
            signal: controller.signal,
          }),
          fetchShiftEfficiencyAnalytics({
            startDate,
            endDate,
            plantId: plantId || undefined,
            shiftId,
            signal: controller.signal,
          }),
          fetchComplianceAnalytics(commonFilters),
          fetchSkillsAnalytics(commonFilters),
          fetchWorkforceAvailability({
            date: startDate || '2026-08-01',
            plantId: plantId || undefined,
            shiftId: shiftId || undefined,
            departmentId: departmentId || undefined,
            sectionId: sectionId || undefined,
            signal: controller.signal,
          }),
          fetchWorkforceShortages({
            date: startDate || '2026-08-01',
            plantId: plantId || undefined,
            shiftId: shiftId || undefined,
            signal: controller.signal,
          }),
          fetchSinglePersonDependency({
            plantId: plantId || undefined,
            shiftId: shiftId || undefined,
            date: startDate || '2026-08-01',
            signal: controller.signal,
          }),
          fetchAttritionAnalytics({
            startDate,
            endDate,
            plantId: plantId || undefined,
            departmentId: departmentId || undefined,
            sectionId: sectionId || undefined,
            signal: controller.signal,
          }),
        ]);

        if (!active) return;

        const [
          summaryRes,
          analyticsRes,
          genderRes,
          deptRes,
          expRes,
          njRes,
          secRes,
          overtimeRes,
          teamProdRes,
          shiftEffRes,
          complianceRes,
          skillsRes,
          availRes,
          shortagesRes,
          depRes,
          attritionRes,
        ] = results;

        const endpointErrors = {};

        if (summaryRes.status === 'fulfilled') setWorkforceSummary(summaryRes.value);
        else {
          setWorkforceSummary(null);
          endpointErrors.workforceSummary = extractApiErrorMessage(summaryRes.reason);
        }

        if (analyticsRes.status === 'fulfilled') setAttendanceAnalytics(analyticsRes.value);
        else {
          setAttendanceAnalytics(null);
          endpointErrors.attendanceAnalytics = extractApiErrorMessage(analyticsRes.reason);
        }

        if (genderRes.status === 'fulfilled') setGenderAnalytics(genderRes.value);
        else {
          setGenderAnalytics(null);
          endpointErrors.genderAnalytics = extractApiErrorMessage(genderRes.reason);
        }

        if (deptRes.status === 'fulfilled') setDepartmentAnalytics(deptRes.value);
        else {
          setDepartmentAnalytics(null);
          endpointErrors.departmentAnalytics = extractApiErrorMessage(deptRes.reason);
        }

        if (expRes.status === 'fulfilled') setExperienceAnalytics(expRes.value);
        else {
          setExperienceAnalytics(null);
          endpointErrors.experienceAnalytics = extractApiErrorMessage(expRes.reason);
        }

        if (njRes.status === 'fulfilled') setNewJoinerAnalytics(njRes.value);
        else {
          setNewJoinerAnalytics(null);
          endpointErrors.newJoinerAnalytics = extractApiErrorMessage(njRes.reason);
        }

        if (secRes.status === 'fulfilled') setSectionAnalytics(secRes.value);
        else {
          setSectionAnalytics(null);
          endpointErrors.sectionAnalytics = extractApiErrorMessage(secRes.reason);
        }

        if (overtimeRes.status === 'fulfilled') setOvertimeAnalytics(overtimeRes.value);
        else {
          setOvertimeAnalytics(null);
          endpointErrors.overtimeAnalytics = extractApiErrorMessage(overtimeRes.reason);
        }

        if (teamProdRes.status === 'fulfilled') setTeamProductionAnalytics(teamProdRes.value);
        else {
          setTeamProductionAnalytics(null);
          endpointErrors.teamProductionAnalytics = extractApiErrorMessage(teamProdRes.reason);
        }

        if (shiftEffRes.status === 'fulfilled') setShiftEfficiencyAnalytics(shiftEffRes.value);
        else {
          setShiftEfficiencyAnalytics(null);
          endpointErrors.shiftEfficiencyAnalytics = extractApiErrorMessage(shiftEffRes.reason);
        }

        if (complianceRes.status === 'fulfilled') setComplianceAnalytics(complianceRes.value);
        else {
          setComplianceAnalytics(null);
          endpointErrors.complianceAnalytics = extractApiErrorMessage(complianceRes.reason);
        }

        if (skillsRes.status === 'fulfilled') setSkillsAnalytics(skillsRes.value);
        else {
          setSkillsAnalytics(null);
          endpointErrors.skillsAnalytics = extractApiErrorMessage(skillsRes.reason);
        }

        if (availRes?.status === 'fulfilled') setPlanningAvailability(availRes.value);
        else {
          setPlanningAvailability(null);
        }

        if (shortagesRes?.status === 'fulfilled') setPlanningShortages(shortagesRes.value);
        else {
          setPlanningShortages(null);
        }

        if (depRes?.status === 'fulfilled') setSinglePersonDependency(depRes.value);
        else {
          setSinglePersonDependency(null);
        }

        if (attritionRes?.status === 'fulfilled') setAttritionAnalytics(attritionRes.value);
        else {
          setAttritionAnalytics(null);
        }

        setErrors(endpointErrors);

        const errorValues = Object.values(endpointErrors);
        if (errorValues.length > 0) {
          setError(errorValues[0]);
        }
      } catch (err) {
        if (!active) return;
        const message = extractApiErrorMessage(err);
        if (message) {
          setError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      active = false;
      controller.abort();
    };
  }, [startDate, endDate, plantId, shiftId, departmentId, sectionId, granularity, reloadToken]);

  return {
    workforceSummary,
    attendanceAnalytics,
    genderAnalytics,
    departmentAnalytics,
    experienceAnalytics,
    newJoinerAnalytics,
    sectionAnalytics,
    overtimeAnalytics,
    teamProductionAnalytics,
    shiftEfficiencyAnalytics,
    complianceAnalytics,
    skillsAnalytics,
    attritionAnalytics,
    planningAvailability,
    planningShortages,
    singlePersonDependency,
    filterOptions,
    loading,
    error,
    errors,
    refetch,
  };
}
