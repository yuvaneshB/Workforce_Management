import { apiClient } from './client';
import { cachedGet, CACHE_TTL, invalidateCache } from './cacheClient';
import { streamAgentAnalysis } from './agentStreamClient';

export { invalidateCache, streamAgentAnalysis };

export async function fetchEmployeeCreateOptions({ signal } = {}) {
  const { data } = await apiClient.get('/api/v1/workforce/employees/options', { signal });
  return data;
}

export async function createEmployee(payload, { signal } = {}) {
  const { data } = await apiClient.post('/api/v1/workforce/employees', payload, { signal });
  invalidateCache();
  return data;
}

export async function searchActiveEmployees({ q = '', status = 'Active', limit = 10, signal } = {}) {
  const { data } = await apiClient.get('/api/v1/workforce/employees/search', {
    params: { q, status, limit },
    signal,
  });
  return data;
}

export async function fetchExitOptions({ signal } = {}) {
  return cachedGet('/api/v1/workforce/employees/exit-options', { signal }, {
    ttlMs: CACHE_TTL.STATIC_REFERENCE,
  });
}

export async function relieveEmployee(employeeId, payload, { signal } = {}) {
  const { data } = await apiClient.post(
    `/api/v1/workforce/employees/${encodeURIComponent(employeeId)}/relieve`,
    payload,
    { signal }
  );
  invalidateCache();
  return data;
}

export async function fetchRecentlyRelieved({ limit = 20, signal } = {}) {
  const { data } = await apiClient.get('/api/v1/workforce/employees/relieved', {
    params: { limit },
    signal,
  });
  return data;
}

export async function reinstateEmployee(employeeId, { signal } = {}) {
  const { data } = await apiClient.post(
    `/api/v1/workforce/employees/${encodeURIComponent(employeeId)}/reinstate`,
    {},
    { signal }
  );
  invalidateCache();
  return data;
}

export async function checkBackendHealth({ signal } = {}) {
  const { data } = await apiClient.get('/health', { signal });
  return data;
}

export async function fetchWorkforceSummary({
  plantId,
  departmentId,
  sectionId,
  shiftId,
  employmentType,
  vendorId,
  teamId,
  operatorTeam,
  signal,
  forceRefresh,
} = {}) {
  const params = {};
  if (plantId) params.plant_id = plantId;
  if (departmentId) params.department_id = departmentId;
  if (sectionId) params.section_id = sectionId;
  if (shiftId) params.shift_id = shiftId;
  if (employmentType) params.employment_type = employmentType;
  if (vendorId) params.vendor_id = vendorId;
  const team = teamId || operatorTeam;
  if (team) params.team_id = team;
  return cachedGet('/api/v1/workforce/summary', { params, signal }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh,
  });
}

export async function fetchVendorWorkforceOverview({
  plantId,
  departmentId,
  sectionId,
  shiftId,
  vendorId,
  startDate,
  endDate,
  period = 'daily',
  signal,
  forceRefresh,
} = {}) {
  const params = { period };
  if (plantId) params.plant_id = plantId;
  if (departmentId) params.department_id = departmentId;
  if (sectionId) params.section_id = sectionId;
  if (shiftId) params.shift_id = shiftId;
  if (vendorId) params.vendor_id = vendorId;
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  return cachedGet('/api/v1/workforce/vendor-overview', { params, signal }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh,
  });
}

export async function fetchEmployees({
  search,
  plantId,
  teamId,
  departmentId,
  sectionId,
  vendorId,
  employmentType,
  role,
  skillGrade,
  homeShift,
  shiftId,
  limit = 25,
  offset = 0,
  signal,
  forceRefresh,
} = {}) {
  const params = { limit, offset, sort_by: 'employee_id', sort_order: 'asc' };
  if (search) params.search = search;
  if (plantId) params.plant_id = plantId;
  if (teamId) params.team_id = teamId;
  if (departmentId) params.department_id = departmentId;
  if (sectionId) params.section_id = sectionId;
  if (vendorId) params.vendor_id = vendorId;
  if (employmentType) params.employment_type = employmentType;
  if (role) params.role = role;
  if (skillGrade) params.skill_grade = skillGrade;
  if (homeShift || shiftId) params.home_shift = homeShift || shiftId;

  return cachedGet('/api/v1/employees', { params, signal }, {
    ttlMs: CACHE_TTL.WORKFORCE_LIST,
    forceRefresh,
  });
}

export async function fetchAttendanceAnalytics({
  period = 'daily',
  startDate,
  endDate,
  shiftId,
  plantId,
  employeeId,
  departmentId,
  sectionId,
  operatorTeam,
  employmentType,
  vendorId,
  signal,
  forceRefresh,
} = {}) {
  const params = { period };
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (shiftId) params.shift_id = shiftId;
  if (plantId) params.plant_id = plantId;
  if (employeeId) params.employee_id = employeeId;
  if (departmentId) params.department_id = departmentId;
  if (sectionId) params.section_id = sectionId;
  if (operatorTeam) params.operator_team = operatorTeam;
  if (employmentType) params.employment_type = employmentType;
  if (vendorId) params.vendor_id = vendorId;

  return cachedGet('/api/v1/analytics/attendance', { params, signal }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh,
  });
}

export async function fetchAttendanceRecords({
  search,
  startDate,
  endDate,
  shiftId,
  plantId,
  departmentId,
  sectionId,
  attendanceStatus,
  limit = 25,
  offset = 0,
  signal,
  forceRefresh,
} = {}) {
  const params = { limit, offset, sort_by: 'work_date', sort_order: 'desc' };
  if (search) params.search = search;
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (shiftId) params.shift_id = shiftId;
  if (plantId) params.plant_id = plantId;
  if (departmentId) params.department_id = departmentId;
  if (sectionId) params.section_id = sectionId;
  if (attendanceStatus) params.attendance_status = attendanceStatus;

  return cachedGet('/api/v1/attendance', { params, signal }, {
    ttlMs: CACHE_TTL.WORKFORCE_LIST,
    forceRefresh,
  });
}

export async function fetchShifts({
  startDate,
  endDate,
  shiftId,
  limit = 25,
  offset = 0,
  signal,
  forceRefresh,
} = {}) {
  const params = { limit, offset, sort_by: 'calendar_date', sort_order: 'asc' };
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (shiftId) params.shift_id = shiftId;

  return cachedGet('/api/v1/shifts', { params, signal }, {
    ttlMs: CACHE_TTL.STATIC_REFERENCE,
    forceRefresh,
  });
}

export async function fetchProduction({
  startDate,
  endDate,
  plantId,
  shiftId,
  limit = 25,
  offset = 0,
  signal,
  forceRefresh,
} = {}) {
  const params = { limit, offset, sort_by: 'event_ts', sort_order: 'desc' };
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (plantId) params.plant_id = plantId;
  if (shiftId) params.shift_id = shiftId;

  return cachedGet('/api/v1/production', { params, signal }, {
    ttlMs: CACHE_TTL.WORKFORCE_LIST,
    forceRefresh,
  });
}

export async function fetchProductionAnalytics({
  startDate,
  endDate,
  plantId,
  shiftId,
  signal,
  forceRefresh,
} = {}) {
  const params = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (plantId) params.plant_id = plantId;
  if (shiftId) params.shift_id = shiftId;

  return cachedGet('/api/v1/analytics/production', { params, signal }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh,
  });
}

export async function fetchDepartments({ plantId, search, limit = 100, offset = 0, signal, forceRefresh } = {}) {
  const params = { limit, offset };
  if (plantId) params.plant_id = plantId;
  if (search) params.search = search;
  return cachedGet('/api/v1/departments', { params, signal }, {
    ttlMs: CACHE_TTL.STATIC_REFERENCE,
    forceRefresh,
  });
}

export async function fetchSections({ departmentId, plantId, search, limit = 100, offset = 0, signal, forceRefresh } = {}) {
  const params = { limit, offset };
  if (departmentId) params.department_id = departmentId;
  if (plantId) params.plant_id = plantId;
  if (search) params.search = search;
  return cachedGet('/api/v1/sections', { params, signal }, {
    ttlMs: CACHE_TTL.STATIC_REFERENCE,
    forceRefresh,
  });
}

function buildAnalyticsParams({
  period,
  startDate,
  endDate,
  plantId,
  shiftId,
  departmentId,
  sectionId,
  employmentType,
  vendorId,
  teamId,
  operatorTeam,
} = {}) {
  const params = {};
  if (period) params.period = period;
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (plantId) params.plant_id = plantId;
  if (shiftId) params.shift_id = shiftId;
  if (departmentId) params.department_id = departmentId;
  if (sectionId) params.section_id = sectionId;
  if (employmentType) params.employment_type = employmentType;
  if (vendorId) params.vendor_id = vendorId;
  const team = teamId || operatorTeam;
  if (team) params.team_id = team;
  return params;
}

export async function fetchGenderAnalytics(filters = {}) {
  return cachedGet('/api/v1/analytics/gender', {
    params: buildAnalyticsParams(filters),
    signal: filters.signal,
  }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh: filters.forceRefresh,
  });
}

export async function fetchDepartmentAnalytics(filters = {}) {
  return cachedGet('/api/v1/analytics/departments', {
    params: buildAnalyticsParams(filters),
    signal: filters.signal,
  }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh: filters.forceRefresh,
  });
}

export async function fetchExperienceAnalytics(filters = {}) {
  return cachedGet('/api/v1/analytics/experience', {
    params: buildAnalyticsParams(filters),
    signal: filters.signal,
  }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh: filters.forceRefresh,
  });
}

export async function fetchNewJoinerAnalytics(filters = {}) {
  return cachedGet('/api/v1/analytics/new-joiners', {
    params: buildAnalyticsParams(filters),
    signal: filters.signal,
  }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh: filters.forceRefresh,
  });
}

export async function fetchSectionAnalytics(filters = {}) {
  return cachedGet('/api/v1/analytics/sections', {
    params: buildAnalyticsParams(filters),
    signal: filters.signal,
  }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh: filters.forceRefresh,
  });
}

export async function fetchVendorAnalytics({
  plantId,
  shiftId,
  departmentId,
  sectionId,
  teamId,
  operatorTeam,
  signal,
  forceRefresh,
} = {}) {
  const params = {};
  if (plantId) params.plant_id = plantId;
  if (shiftId) params.shift_id = shiftId;
  if (departmentId) params.department_id = departmentId;
  if (sectionId) params.section_id = sectionId;
  const team = teamId || operatorTeam;
  if (team) params.team_id = team;
  return cachedGet('/api/v1/analytics/vendors', { params, signal }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh,
  });
}

export async function fetchOvertimeAnalytics({
  startDate,
  endDate,
  shiftId,
  departmentId,
  sectionId,
  plantId,
  employmentType,
  vendorId,
  teamId,
  operatorTeam,
  signal,
  forceRefresh,
} = {}) {
  const params = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (shiftId) params.shift_id = shiftId;
  if (departmentId) params.department_id = departmentId;
  if (sectionId) params.section_id = sectionId;
  if (plantId) params.plant_id = plantId;
  if (employmentType) params.employment_type = employmentType;
  if (vendorId) params.vendor_id = vendorId;
  const team = teamId || operatorTeam;
  if (team) params.team_id = team;

  return cachedGet('/api/v1/analytics/overtime', { params, signal }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh,
  });
}

export async function fetchTeamProductionAnalytics({
  startDate,
  endDate,
  plantId,
  shiftId,
  departmentId,
  sectionId,
  employmentType,
  vendorId,
  operatorTeam,
  signal,
  forceRefresh,
} = {}) {
  const params = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (plantId) params.plant_id = plantId;
  if (shiftId) params.shift_id = shiftId;
  if (departmentId) params.department_id = departmentId;
  if (sectionId) params.section_id = sectionId;
  if (employmentType) params.employment_type = employmentType;
  if (vendorId) params.vendor_id = vendorId;
  if (operatorTeam) params.operator_team = operatorTeam;

  return cachedGet('/api/v1/analytics/team-production', { params, signal }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh,
  });
}

export async function fetchShiftEfficiencyAnalytics({
  startDate,
  endDate,
  plantId,
  shiftId,
  departmentId,
  sectionId,
  employmentType,
  vendorId,
  teamId,
  operatorTeam,
  signal,
  forceRefresh,
} = {}) {
  const params = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (plantId) params.plant_id = plantId;
  if (shiftId) params.shift_id = shiftId;
  if (departmentId) params.department_id = departmentId;
  if (sectionId) params.section_id = sectionId;
  if (employmentType) params.employment_type = employmentType;
  if (vendorId) params.vendor_id = vendorId;
  const team = teamId || operatorTeam;
  if (team) params.team_id = team;

  return cachedGet('/api/v1/analytics/shift-efficiency', { params, signal }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh,
  });
}

export async function fetchSkillsAnalytics({
  startDate,
  endDate,
  departmentId,
  sectionId,
  teamId,
  shiftId,
  plantId,
  employmentType,
  vendorId,
  signal,
  forceRefresh,
} = {}) {
  const params = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (departmentId) params.department_id = departmentId;
  if (sectionId) params.section_id = sectionId;
  if (teamId) params.team_id = teamId;
  if (shiftId) params.shift_id = shiftId;
  if (plantId) params.plant_id = plantId;
  if (employmentType) params.employment_type = employmentType;
  if (vendorId) params.vendor_id = vendorId;

  return cachedGet('/api/v1/analytics/skills', { params, signal }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh,
  });
}

export async function fetchAttritionAnalytics({
  startDate,
  endDate,
  plantId,
  departmentId,
  sectionId,
  shiftId,
  employmentType,
  vendorId,
  teamId,
  operatorTeam,
  signal,
  forceRefresh,
} = {}) {
  const params = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (plantId) params.plant_id = plantId;
  if (departmentId) params.department_id = departmentId;
  if (sectionId) params.section_id = sectionId;
  if (shiftId) params.shift_id = shiftId;
  if (employmentType) params.employment_type = employmentType;
  if (vendorId) params.vendor_id = vendorId;
  const team = teamId || operatorTeam;
  if (team) params.team_id = team;

  return cachedGet('/api/v1/analytics/attrition', { params, signal }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh,
  });
}

export async function fetchComplianceAnalytics({
  startDate,
  endDate,
  shiftId,
  departmentId,
  sectionId,
  plantId,
  employmentType,
  vendorId,
  teamId,
  operatorTeam,
  signal,
  forceRefresh,
} = {}) {
  const params = {};
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (shiftId) params.shift_id = shiftId;
  if (departmentId) params.department_id = departmentId;
  if (sectionId) params.section_id = sectionId;
  if (plantId) params.plant_id = plantId;
  if (employmentType) params.employment_type = employmentType;
  if (vendorId) params.vendor_id = vendorId;
  const team = teamId || operatorTeam;
  if (team) params.team_id = team;

  return cachedGet('/api/v1/analytics/compliance', { params, signal }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh,
  });
}

// ============================================================================
// Workforce Planning Endpoints (Phase 5)
// ============================================================================

export async function fetchWorkforceAvailability({
  date,
  plantId,
  shiftId,
  departmentId,
  sectionId,
  employmentType,
  vendorId,
  teamId,
  operatorTeam,
  signal,
  forceRefresh,
} = {}) {
  const params = { date };
  if (plantId) params.plant_id = plantId;
  if (shiftId) params.shift_id = shiftId;
  if (departmentId) params.department_id = departmentId;
  if (sectionId) params.section_id = sectionId;
  if (employmentType) params.employment_type = employmentType;
  if (vendorId) params.vendor_id = vendorId;
  const team = teamId || operatorTeam;
  if (team) params.team_id = team;

  return cachedGet('/api/v1/planning/availability', { params, signal }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh,
  });
}

export async function fetchWorkforceShortages({
  date,
  plantId,
  shiftId,
  departmentId,
  sectionId,
  employmentType,
  vendorId,
  teamId,
  operatorTeam,
  signal,
  forceRefresh,
} = {}) {
  const params = { date };
  if (plantId) params.plant_id = plantId;
  if (shiftId) params.shift_id = shiftId;
  if (departmentId) params.department_id = departmentId;
  if (sectionId) params.section_id = sectionId;
  if (employmentType) params.employment_type = employmentType;
  if (vendorId) params.vendor_id = vendorId;
  const team = teamId || operatorTeam;
  if (team) params.team_id = team;

  return cachedGet('/api/v1/planning/shortages', { params, signal }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh,
  });
}

export async function fetchReplacementRecommendations({
  employeeId,
  date,
  targetShift,
  mandatoryCertification = true,
  signal,
  forceRefresh,
} = {}) {
  const params = {
    employee_id: employeeId,
    date,
    mandatory_certification: mandatoryCertification,
  };
  if (targetShift) params.target_shift = targetShift;

  return cachedGet('/api/v1/planning/recommendations', { params, signal }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh,
  });
}

export async function sendChatMessage({ message, conversationId, signal } = {}) {
  const payload = {
    message,
    conversation_id: conversationId || null,
  };
  const { data } = await apiClient.post('/api/v1/agent/chat', payload, {
    signal,
    timeout: 120000,
  });
  return data;
}

export async function streamChatAnalysis({
  message,
  conversationId,
  executionId,
  onInit,
  onStageStart,
  onStageEnd,
  onDone,
  onError,
  signal,
} = {}) {
  return streamAgentAnalysis({
    agentType: 'central',
    executionId,
    filters: {
      message,
      conversation_id: conversationId,
    },
    onInit,
    onStageStart,
    onStageEnd,
    onDone,
    onError,
    signal,
  });
}

export async function runAttendanceAgentAnalysis(filters = {}, signal) {
  const payload = {
    startDate: filters.startDate || filters.start_date || null,
    endDate: filters.endDate || filters.end_date || null,
    plantId: filters.plantId || filters.plant_id || null,
    shiftId: filters.shiftId || filters.shift_id || null,
    departmentId: filters.departmentId || filters.department_id || null,
    sectionId: filters.sectionId || filters.section_id || null,
    operatorTeam: filters.operatorTeam || filters.operator_team || null,
  };
  const { data } = await apiClient.post('/api/v1/agent/attendance-analysis', payload, {
    signal,
    timeout: 90000,
  });
  return data;
}

export async function runWorkforcePlanningAgentAnalysis(filters = {}, signal) {
  const payload = {
    date: filters.date || filters.startDate || filters.start_date || null,
    startDate: filters.startDate || filters.start_date || null,
    endDate: filters.endDate || filters.end_date || null,
    plantId: filters.plantId || filters.plant_id || null,
    shiftId: filters.shiftId || filters.shift_id || null,
    departmentId: filters.departmentId || filters.department_id || null,
    sectionId: filters.sectionId || filters.section_id || null,
    operatorTeam: filters.operatorTeam || filters.operator_team || null,
  };
  const { data } = await apiClient.post('/api/v1/agent/workforce-planning-analysis', payload, {
    signal,
    timeout: 90000,
  });
  return data;
}

export async function runOvertimeAgentAnalysis(filters = {}, signal) {
  const payload = {
    date: filters.date || filters.startDate || filters.start_date || null,
    startDate: filters.startDate || filters.start_date || null,
    endDate: filters.endDate || filters.end_date || null,
    plantId: filters.plantId || filters.plant_id || null,
    shiftId: filters.shiftId || filters.shift_id || null,
    departmentId: filters.departmentId || filters.department_id || null,
    sectionId: filters.sectionId || filters.section_id || null,
    operatorTeam: filters.operatorTeam || filters.operator_team || null,
  };
  const { data } = await apiClient.post('/api/v1/agent/overtime-analysis', payload, {
    signal,
    timeout: 90000,
  });
  return data;
}

export async function runAttritionAgentAnalysis(filters = {}, signal) {
  const payload = {
    date: filters.date || filters.startDate || filters.start_date || null,
    startDate: filters.startDate || filters.start_date || null,
    endDate: filters.endDate || filters.end_date || null,
    plantId: filters.plantId || filters.plant_id || null,
    shiftId: filters.shiftId || filters.shift_id || null,
    departmentId: filters.departmentId || filters.department_id || null,
    sectionId: filters.sectionId || filters.section_id || null,
    operatorTeam: filters.operatorTeam || filters.operator_team || null,
  };
  const { data } = await apiClient.post('/api/v1/agent/attrition-analysis', payload, {
    signal,
    timeout: 90000,
  });
  return data;
}

export async function runSkillTrainingAgentAnalysis(filters = {}, signal) {
  const payload = {
    date: filters.date || filters.startDate || filters.start_date || null,
    startDate: filters.startDate || filters.start_date || null,
    endDate: filters.endDate || filters.end_date || null,
    plantId: filters.plantId || filters.plant_id || null,
    shiftId: filters.shiftId || filters.shift_id || null,
    departmentId: filters.departmentId || filters.department_id || null,
    sectionId: filters.sectionId || filters.section_id || null,
    operatorTeam: filters.operatorTeam || filters.operator_team || null,
  };
  const { data } = await apiClient.post('/api/v1/agent/skill-training-analysis', payload, {
    signal,
    timeout: 90000,
  });
  return data;
}

export async function fetchSinglePersonDependency({
  plantId,
  shiftId,
  date,
  departmentId,
  sectionId,
  employmentType,
  vendorId,
  signal,
  forceRefresh,
} = {}) {
  const params = {};
  if (plantId) params.plant_id = plantId;
  if (shiftId) params.shift_id = shiftId;
  if (date) params.date = date;
  if (departmentId) params.department_id = departmentId;
  if (sectionId) params.section_id = sectionId;
  if (employmentType) params.employment_type = employmentType;
  if (vendorId) params.vendor_id = vendorId;

  return cachedGet('/api/v1/intelligence/single-person-dependency', { params, signal }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh,
  });
}

export async function fetchLabourCompliance({ plantId, shiftId, date, startDate, endDate, signal, forceRefresh } = {}) {
  const params = {};
  if (plantId) params.plant_id = plantId;
  if (shiftId) params.shift_id = shiftId;
  if (date) params.date = date;
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;

  return cachedGet('/api/v1/intelligence/labour-compliance', { params, signal }, {
    ttlMs: CACHE_TTL.ANALYTICS,
    forceRefresh,
  });
}

export async function runProductionAgentAnalysis(filters = {}, signal) {
  const payload = {
    date: filters.date || filters.startDate || filters.start_date || null,
    startDate: filters.startDate || filters.start_date || null,
    endDate: filters.endDate || filters.end_date || null,
    plantId: filters.plantId || filters.plant_id || null,
    shiftId: filters.shiftId || filters.shift_id || null,
    departmentId: filters.departmentId || filters.department_id || null,
    sectionId: filters.sectionId || filters.section_id || null,
    operatorTeam: filters.operatorTeam || filters.operator_team || null,
  };
  const { data } = await apiClient.post('/api/v1/agent/production-analysis', payload, {
    signal,
    timeout: 90000,
  });
  return data;
}

export async function submitPlanningApproval({
  executionId,
  decision = 'APPROVED',
  notes = '',
  approvedBy = 'Workspace User (HR)',
  targetDate = null,
  specialistAgent = null,
  rejectionReason = null,
  forceFailure = false,
  signal,
} = {}) {
  const payload = {
    execution_id: executionId,
    decision,
    notes,
    approved_by: approvedBy,
    target_date: targetDate,
    specialist_agent: specialistAgent,
    rejection_reason: rejectionReason,
    force_failure: forceFailure,
  };
  const { data } = await apiClient.post('/api/v1/agent/approve-planning', payload, {
    signal,
    timeout: 5000,
  });
  invalidateCache();
  return data;
}

export async function fetchHrApprovals({
  status,
  agent,
  plantId,
  departmentId,
  startDate,
  endDate,
  search,
  limit = 25,
  offset = 0,
  signal,
} = {}) {
  const params = { limit, offset };
  if (status) params.status = status;
  if (agent) params.agent = agent;
  if (plantId) params.plant_id = plantId;
  if (departmentId) params.department_id = departmentId;
  if (startDate) params.start_date = startDate;
  if (endDate) params.end_date = endDate;
  if (search) params.search = search;

  const { data } = await apiClient.get('/api/v1/hr-approvals', { params, signal });
  return data;
}

export async function fetchHrApprovalDetails(approvalId, { signal } = {}) {
  const { data } = await apiClient.get(`/api/v1/hr-approvals/${encodeURIComponent(approvalId)}`, { signal });
  return data;
}

export async function recordHrReview(approvalId, { reviewedBy, reviewNotes }, { signal } = {}) {
  const { data } = await apiClient.post(
    `/api/v1/hr-approvals/${encodeURIComponent(approvalId)}/review`,
    {
      reviewed_by: reviewedBy,
      review_notes: reviewNotes,
    },
    { signal }
  );
  invalidateCache();
  return data;
}

export async function recordHrDecision(
  approvalId,
  { decision, approvedBy, decisionNotes, rejectionReason },
  { signal } = {}
) {
  const { data } = await apiClient.post(
    `/api/v1/hr-approvals/${encodeURIComponent(approvalId)}/decision`,
    {
      decision,
      approved_by: approvedBy,
      decision_notes: decisionNotes || null,
      rejection_reason: rejectionReason || null,
    },
    { signal }
  );
  invalidateCache();
  return data;
}

export async function resetHrDecision(approvalId, { signal } = {}) {
  const { data } = await apiClient.post(
    `/api/v1/hr-approvals/${encodeURIComponent(approvalId)}/reset`,
    {},
    { signal }
  );
  invalidateCache();
  return data;
}





