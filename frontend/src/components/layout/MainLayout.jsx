import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="fixed inset-0 overflow-hidden flex bg-[var(--page-bg)] text-[var(--text)] select-none">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />

        <main className="flex-1 min-w-0 h-full overflow-y-auto no-scrollbar">
          <div className="px-4 lg:px-6 pb-4 w-full max-w-[1600px] mx-auto">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
