// Workforce Attrition Dataset - Grounded in Neon PostgreSQL (Zero Mock Data)
// Single Source of Truth: public.attrition_transactions (120 total exits)

export const ATTRITION_SUMMARY = {
  total_exits: 120,
  total_exits_change_pct: 0.0,
  overall_attrition_rate: 7.1,
  attrition_rate_change_pp: 0.0,
  permanent_exits: 46,
  permanent_pct: 38.3,
  vendor_exits: 74,
  vendor_pct: 61.7,
  average_tenure_years: 4.5,
  tenure_change_years: 0.0,
  active_employees: 1580,
  retained_employees: 1580,
  retention_rate: 92.9,
};

export const ATTRITION_MONTHLY_TREND = [
  { month: 'Oct 2025', permanentAttrition: 1, vendorAttrition: 0, totalExits: 1, priorExits: 0 },
  { month: 'Nov 2025', permanentAttrition: 3, vendorAttrition: 3, totalExits: 6, priorExits: 1 },
  { month: 'Dec 2025', permanentAttrition: 2, vendorAttrition: 8, totalExits: 10, priorExits: 6 },
  { month: 'Jan 2026', permanentAttrition: 3, vendorAttrition: 9, totalExits: 12, priorExits: 10 },
  { month: 'Feb 2026', permanentAttrition: 4, vendorAttrition: 6, totalExits: 10, priorExits: 12 },
  { month: 'Mar 2026', permanentAttrition: 5, vendorAttrition: 9, totalExits: 14, priorExits: 10 },
  { month: 'Apr 2026', permanentAttrition: 6, vendorAttrition: 4, totalExits: 10, priorExits: 14 },
  { month: 'May 2026', permanentAttrition: 4, vendorAttrition: 6, totalExits: 10, priorExits: 10 },
  { month: 'Jun 2026', permanentAttrition: 1, vendorAttrition: 3, totalExits: 4, priorExits: 10 },
  { month: 'Jul 2026', permanentAttrition: 3, vendorAttrition: 7, totalExits: 10, priorExits: 4 },
  { month: 'Aug 2026', permanentAttrition: 6, vendorAttrition: 9, totalExits: 15, priorExits: 10 },
  { month: 'Sep 2026', permanentAttrition: 7, vendorAttrition: 4, totalExits: 11, priorExits: 15 },
  { month: 'Oct 2026', permanentAttrition: 1, vendorAttrition: 5, totalExits: 6, priorExits: 11 },
  { month: 'Nov 2026', permanentAttrition: 0, vendorAttrition: 1, totalExits: 1, priorExits: 6 },
];

export const ATTRITION_WEEKLY_TREND = [];

export const ATTRITION_DAILY_TREND = [];

export const ATTRITION_BY_REASON = [
  { reason: 'Absconding (No Contact)', count: 24, pct: '20.0%', color: '#493287' },
  { reason: 'Better Salary Offer', count: 18, pct: '15.0%', color: '#4D8EEB' },
  { reason: 'Contract Completed', count: 16, pct: '13.3%', color: '#F58A3A' },
  { reason: 'Family / Personal Reasons', count: 11, pct: '9.2%', color: '#E45C72' },
  { reason: 'Better Career Opportunity', count: 10, pct: '8.3%', color: '#31B7C3' },
  { reason: 'Poor Performance', count: 8, pct: '6.7%', color: '#0E9C86' },
  { reason: 'Higher Studies', count: 6, pct: '5.0%', color: '#B88943' },
  { reason: 'Disciplinary Action', count: 5, pct: '4.2%', color: '#5B44A3' },
  { reason: 'Supervisor Conflict', count: 5, pct: '4.2%', color: '#3E7BC4' },
  { reason: 'Health Issues', count: 4, pct: '3.3%', color: '#D9701F' },
  { reason: 'Shift Timing Issues', count: 3, pct: '2.5%', color: '#2BC0A6' },
  { reason: 'Work Pressure', count: 3, pct: '2.5%', color: '#FF7D90' },
  { reason: 'Marriage / Family Relocation', count: 3, pct: '2.5%', color: '#A290DB' },
  { reason: 'Relocation', count: 2, pct: '1.7%', color: '#78ACF5' },
  { reason: 'Commute Distance', count: 2, pct: '1.7%', color: '#1F2F59' },
];

export const DEPARTMENT_ATTRITION = [
  { department: 'Final Assembly', department_id: 'D02', count: 32, pct: '26.7%', label: '32 (26.7%)' },
  { department: 'Module Assembly', department_id: 'D03', count: 16, pct: '13.3%', label: '16 (13.3%)' },
  { department: 'Quality Assurance', department_id: 'D04', count: 11, pct: '9.2%', label: '11 (9.2%)' },
  { department: 'SMT Production', department_id: 'D01', count: 10, pct: '8.3%', label: '10 (8.3%)' },
  { department: 'Inventory & Stores', department_id: 'D06', count: 10, pct: '8.3%', label: '10 (8.3%)' },
  { department: 'Shipping & Logistics', department_id: 'D07', count: 10, pct: '8.3%', label: '10 (8.3%)' },
  { department: 'Maintenance & Facility', department_id: 'D05', count: 9, pct: '7.5%', label: '9 (7.5%)' },
  { department: 'Incoming Quality Control', department_id: 'D08', count: 9, pct: '7.5%', label: '9 (7.5%)' },
  { department: 'Process Engineering', department_id: 'D10', count: 7, pct: '5.8%', label: '7 (5.8%)' },
  { department: 'EHS & Industrial Safety', department_id: 'D11', count: 3, pct: '2.5%', label: '3 (2.5%)' },
  { department: 'Tooling & Calibration', department_id: 'D12', count: 3, pct: '2.5%', label: '3 (2.5%)' },
];

export const VENDOR_ATTRITION = [
  { vendor: 'Permanent Staff', vendor_id: null, count: 46, pct: '38.3%', label: '46 (38.3%)' },
  { vendor: 'Sri Vignesh Manpower Services (V01)', vendor_id: 'V01', count: 21, pct: '17.5%', label: '21 (17.5%)' },
  { vendor: 'Karnataka Skill Force (V05)', vendor_id: 'V05', count: 17, pct: '14.2%', label: '17 (14.2%)' },
  { vendor: 'Anand Industrial Staffing (V04)', vendor_id: 'V04', count: 13, pct: '10.8%', label: '13 (10.8%)' },
  { vendor: 'Namma Workforce Pvt Ltd (V03)', vendor_id: 'V03', count: 11, pct: '9.2%', label: '11 (9.2%)' },
  { vendor: 'Kovai Talent Solutions (V02)', vendor_id: 'V02', count: 9, pct: '7.5%', label: '9 (7.5%)' },
  { vendor: 'Prime HR Outsourcing (V06)', vendor_id: 'V06', count: 3, pct: '2.5%', label: '3 (2.5%)' },
];

export const TENURE_ATTRITION = [
  { band: '< 1 Year', tenure: '< 1 Year', count: 8, pct: '6.7%', label: '8 (6.7%)' },
  { band: '1 - 2 Years', tenure: '1 - 2 Years', count: 12, pct: '10.0%', label: '12 (10.0%)' },
  { band: '2 - 3 Years', tenure: '2 - 3 Years', count: 12, pct: '10.0%', label: '12 (10.0%)' },
  { band: '3 - 5 Years', tenure: '3 - 5 Years', count: 30, pct: '25.0%', label: '30 (25.0%)' },
  { band: '5+ Years', tenure: '5+ Years', count: 58, pct: '48.3%', label: '58 (48.3%)' },
];

export const EXITED_EMPLOYEES_RECORDS = [];
