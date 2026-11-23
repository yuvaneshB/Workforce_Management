import { Bell, ChevronDown, Menu, Search } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { ROUTE_META } from '../../utils/constants';
import { ThemeToggle } from '../common/ThemeToggle';

export function Topbar({ onOpenSidebar }) {
  const { pathname } = useLocation();
  const meta = ROUTE_META[pathname] || ROUTE_META['/home'] || ROUTE_META['/dashboard'];

  const isHome = pathname === '/' || pathname === '/home';

  return (
    <header className="flex items-center justify-between gap-4 pt-3.5 pb-2.5 px-5 lg:px-6 shrink-0">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          className="lg:hidden muted cursor-pointer p-1 shrink-0"
          onClick={onOpenSidebar}
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {isHome ? (
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-xs font-bold text-[var(--secondary)] whitespace-nowrap">
              Workforce 360
            </span>
            <span className="text-[var(--border)] font-normal">/</span>
            <h1 className="text-[17px] sm:text-[19px] font-black tracking-tight leading-tight text-[var(--text)] whitespace-nowrap">
              System Architecture
            </h1>
          </div>
        ) : (
          <div className="min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-[20px] sm:text-[23px] font-extrabold tracking-tight leading-tight text-[var(--text)] whitespace-nowrap truncate">
                {meta.title}
              </h1>
              {pathname === '/dashboard' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--brand-purple-soft)] text-[var(--brand-purple)] border border-[var(--brand-purple)]/20 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand-purple)] animate-pulse" />
                  LIVE OPS
                </span>
              )}
            </div>
            <p className="text-[11px] text-[var(--secondary)] mt-0.5 whitespace-nowrap truncate">
              {meta.description}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5 shrink-0">
        {isHome ? (
          <>
            {/* Search Input */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--secondary)] w-64 shadow-2xs">
              <Search className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Search workforce, shifts, skills...</span>
              <span className="text-[9.5px] font-mono px-1 py-0.5 rounded bg-[var(--surface-hover)] border border-[var(--border)] ml-auto text-[var(--secondary)]">
                ⌘K
              </span>
            </div>

            {/* Dark Mode Toggle */}
            <ThemeToggle />

            {/* Admin Badge */}
            <div className="px-3 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-[10px] font-black text-[#5932EA] dark:text-purple-300 uppercase tracking-wider select-none">
              ADMIN
            </div>
          </>
        ) : (
          <>
            <button
              type="button"
              title="Notifications"
              aria-label="Notifications"
              className="w-9 h-9 rounded-full surface grid place-items-center cursor-pointer transition-colors hover:bg-[var(--muted-fill)] shrink-0"
            >
              <Bell className="w-4 h-4 text-[var(--secondary)]" />
            </button>

            <ThemeToggle />

            <div className="hidden sm:flex items-center gap-2 rounded-full surface pl-1 pr-3 h-9 shrink-0">
              <div
                className="w-7 h-7 rounded-full grid place-items-center text-[10px] font-bold text-white shrink-0"
                style={{ background: 'var(--brand-purple)', color: 'var(--on-accent)' }}
              >
                YU
              </div>
              <div className="leading-tight text-left">
                <div className="text-[11px] font-bold text-[var(--text)] whitespace-nowrap">
                  Workspace User
                </div>
                <div className="text-[9px] text-[var(--secondary)] whitespace-nowrap">
                  HR
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--secondary)] ml-0.5" />
            </div>
          </>
        )}
      </div>
    </header>
  );
}
