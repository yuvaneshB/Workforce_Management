export const THEME_STORAGE_KEY = 'workforce-theme';

export const SHIFT_NAMES = {
  A: 'GS1',
  B: 'S2',
  C: 'NS3',
};

export const PLANT_OPTIONS = [
  { id: '', label: 'All Plants' },
  { id: 'IN-TN-01', label: 'Plant 1' },
  { id: 'IN-KA-01', label: 'Plant 2' },
];

export function formatShiftName(shiftId) {
  if (!shiftId) return '—';
  return SHIFT_NAMES[shiftId] || `Shift ${shiftId}`;
}

export const BRAND_COLORS = {
  primary: '#6F3DBA',
  purple: '#6F3DBA',
  blue: '#4D8EEB',
  orange: '#F58A3A',
  navy: '#1F2F59',
  white: '#FFFFFF',
  sky: '#7FB0F2',
  cyan: '#31B7C3',
  peach: '#FFF2EB',
  rose: '#E45C72',
  emerald: '#0E9C86',
};

export const CHART_COLORS = {
  light: {
    categorical: ['#4D8EEB', '#D9701F', '#6F3DBA', '#0E9C86'],
    ordinal: ['#8FB8F2', '#5F97E4', '#3670BB', '#17477F'],
    surface: '#FFFFFF',
    axisText: '#7C839B',
    labelText: '#2C2C2C',
    grid: 'rgba(31, 47, 89, 0.12)',
    demand: '#4D8EEB',
    supply: '#31B7C3',
    shortage: '#6F3DBA',
    accent: '#0E9C86',
    tooltipBg: '#FFFFFF',
    tooltipBorder: 'rgba(31, 47, 89, 0.12)',
    tooltipText: '#1F2F59',
  },
  dark: {
    categorical: ['#6BA5F5', '#F0913E', '#A684EE', '#2BC0A6'],
    ordinal: ['#2E5C98', '#4A7EC2', '#71A3E4', '#A6CAFA'],
    surface: '#192235',
    axisText: '#8D97AE',
    labelText: '#DFE6F4',
    grid: 'rgba(214, 224, 244, 0.12)',
    demand: '#78ACF5',
    supply: '#4FD3DE',
    shortage: '#A684EE',
    accent: '#2BC0A6',
    tooltipBg: '#192235',
    tooltipBorder: 'rgba(214, 224, 244, 0.12)',
    tooltipText: '#F1F5FD',
  },
};

export const GRAPH_DEPTH_COLORS = {
  light: ['#e45c72', '#6f3dba', '#4d8eeb', '#f58a3a', '#31b7c3', '#b88943', '#8a63d2', '#3e7bc4'],
  dark: ['#ff7d90', '#a684ee', '#78acf5', '#ffab63', '#4fd3de', '#ddab5f', '#b192ec', '#6ba2e0'],
};

export const SIDEBAR_NAV_ITEMS = [
  { path: '/home', label: 'Home', icon: 'Home' },
  { path: '/dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { path: '/analytics', label: 'Analytics', icon: 'ChartNoAxesCombined' },
  { path: '/data-connectors', label: 'Data Connectors', icon: 'Plug' },
  { path: '/employees', label: 'Workforce Management', icon: 'Users' },
  { path: '/organization-structure', label: 'Organization Structure', icon: 'Building2' },
  { path: '/assistant', label: 'AI Assistance', icon: 'Bot' },
];

export const ROUTE_META = {
  '/': {
    crumb: 'Home',
    title: 'System Architecture',
    description: 'Manufacturing 360',
  },
  '/home': {
    crumb: 'Home',
    title: 'System Architecture',
    description: 'Manufacturing 360',
  },
  '/dashboard': {
    crumb: 'Dashboard',
    title: 'Workforce Operations Dashboard',
    description: 'Manufacturing Workforce - Executive Overview',
  },
  '/architecture': {
    crumb: 'System Architecture',
    title: 'System Architecture & Flow',
    description: 'Interactive end-to-end architecture and verified execution pipeline for the Workforce Management Agent',
  },
  '/system-architecture': {
    crumb: 'System Architecture',
    title: 'System Architecture & Flow',
    description: 'Interactive end-to-end architecture and verified execution pipeline for the Workforce Management Agent',
  },
  '/workforce-planning': {
    crumb: 'Workforce Planning',
    title: 'Workforce Analytics',
    description: 'Workforce planning, staffing availability, shortage detection, and replacement recommendations consolidated into Workforce Analytics.',
  },
  '/data-connectors': {
    crumb: 'Data Connectors',
    title: 'Data Connectors & Integrations',
    description: 'Configure and manage enterprise ERP, MES, database, and cloud connectors',
  },
  '/employees': {
    crumb: 'Workforce Management',
    title: 'Workforce Management',
    description: 'Manage employee information, attendance records and shift assignments in one place.',
  },
  '/workforce': {
    crumb: 'Workforce Management',
    title: 'Workforce Management',
    description: 'Manage employee information, attendance records and shift assignments in one place.',
  },
  '/attendance': {
    crumb: 'Attendance',
    title: 'Workforce Management',
    description: 'Manage employee information, attendance records and shift assignments in one place.',
  },
  '/shifts': {
    crumb: 'Shifts',
    title: 'Workforce Management',
    description: 'Manage employee information, attendance records and shift assignments in one place.',
  },
  '/organization-structure': {
    crumb: 'Organization Structure',
    title: 'Organization Structure',
    description: 'View and manage workforce hierarchy, distribution and employee assignments across plants, departments, sections and teams.',
  },
  '/operations': {
    crumb: 'Organization Structure',
    title: 'Organization Structure',
    description: 'View and manage workforce hierarchy, distribution and employee assignments across plants, departments, sections and teams.',
  },
  '/analytics': {
    crumb: 'Analytics',
    title: 'Workforce Analytics',
    description: 'Detailed workforce, attendance and manufacturing performance analysis',
  },
  '/assistant': {
    crumb: 'AI Assistance',
    title: 'AI Assistance',
    description: 'Workforce Management Agent - Ask, Analyze, and Get Insights',
  },
  '/approvals': {
    crumb: 'Organization Structure',
    title: 'Organization Structure',
    description: 'View and understand workforce distribution across departments and sections.',
  },
};

export const ASSISTANT_SUGGESTIONS = [
  'Who is the best employee in September?',
  'Which plant has the best workforce performance in September?',
  'Show absenteeism in Plant 1.',
  'Which department has high absenteeism and overtime together?',
  'Which department has the highest workforce shortage?',
  'What are the main recorded reasons for employee exits?',
  'Which department has the most skill gaps?',
  'Which vendor supplies the most employees?',
];

export const PROTOTYPE_CHAT_NOTICE =
  'This is a UI prototype. AI chat will be connected during the backend and Domo integration phase.';
