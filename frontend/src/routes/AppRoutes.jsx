import React, { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';

// Code-split pages for instant, lightweight route navigation
const Home = lazy(() => import('../pages/Home').then((m) => ({ default: m.Home })));
const Dashboard = lazy(() => import('../pages/Dashboard').then((m) => ({ default: m.Dashboard })));
const WorkforceManagement = lazy(() =>
  import('../pages/WorkforceManagement').then((m) => ({ default: m.WorkforceManagement }))
);
const OrganizationStructure = lazy(() =>
  import('../pages/OrganizationStructure').then((m) => ({ default: m.OrganizationStructure }))
);
const WorkforceAnalytics = lazy(() =>
  import('../pages/WorkforceAnalytics').then((m) => ({ default: m.WorkforceAnalytics }))
);
const DataConnectors = lazy(() =>
  import('../pages/DataConnectors').then((m) => ({ default: m.DataConnectors }))
);
const AIAssistant = lazy(() =>
  import('../pages/AIAssistant').then((m) => ({ default: m.AIAssistant }))
);

function PageFallback() {
  return (
    <div className="w-full h-[55vh] flex flex-col items-center justify-center p-8 select-none">
      <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mb-2.5">
        <div className="w-4 h-4 rounded-full border-2 border-purple-600 border-t-transparent animate-spin" />
      </div>
      <p className="text-xs font-medium text-[var(--secondary)]">Loading module...</p>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route
          path="/"
          element={
            <Suspense fallback={<PageFallback />}>
              <Home />
            </Suspense>
          }
        />
        <Route
          path="/home"
          element={
            <Suspense fallback={<PageFallback />}>
              <Home />
            </Suspense>
          }
        />
        <Route
          path="/dashboard"
          element={
            <Suspense fallback={<PageFallback />}>
              <Dashboard />
            </Suspense>
          }
        />
        {/* Consolidated Workforce Management (Workforce, Attendance, Shifts) */}
        <Route
          path="/employees"
          element={
            <Suspense fallback={<PageFallback />}>
              <WorkforceManagement />
            </Suspense>
          }
        />
        <Route path="/workforce" element={<Navigate to="/employees" replace />} />
        <Route path="/attendance" element={<Navigate to="/employees?tab=attendance" replace />} />
        <Route path="/shifts" element={<Navigate to="/employees?tab=shifts" replace />} />

        {/* Unified Organization Structure (Departments and Sections) */}
        <Route
          path="/organization-structure"
          element={
            <Suspense fallback={<PageFallback />}>
              <OrganizationStructure />
            </Suspense>
          }
        />
        <Route path="/operations" element={<Navigate to="/organization-structure?tab=departments" replace />} />
        <Route path="/approvals" element={<Navigate to="/employees?tab=hr-approval" replace />} />

        <Route
          path="/analytics"
          element={
            <Suspense fallback={<PageFallback />}>
              <WorkforceAnalytics />
            </Suspense>
          }
        />
        <Route path="/workforce-planning" element={<Navigate to="/analytics?tab=workforce" replace />} />
        <Route path="/planning" element={<Navigate to="/analytics?tab=workforce" replace />} />
        <Route path="/intelligence" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/data-connectors"
          element={
            <Suspense fallback={<PageFallback />}>
              <DataConnectors />
            </Suspense>
          }
        />
        <Route path="/architecture" element={<Navigate to="/home" replace />} />
        <Route path="/system-architecture" element={<Navigate to="/home" replace />} />
        <Route
          path="/assistant"
          element={
            <Suspense fallback={<PageFallback />}>
              <AIAssistant />
            </Suspense>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}

