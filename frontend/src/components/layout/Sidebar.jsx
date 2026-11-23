import {
  Bot,
  Brain,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarClock,
  ChartNoAxesCombined,
  ChevronDown,
  FileText,
  Home,
  Layers,
  LayoutDashboard,
  Network,
  Plug,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { SIDEBAR_NAV_ITEMS } from '../../utils/constants';

const NAV_ICONS = {
  Home,
  LayoutDashboard,
  Users,
  UserCheck,
  Plug,
  CalendarCheck,
  CalendarClock,
  Building2,
  Briefcase,
  Layers,
  ChartNoAxesCombined,
  FileText,
  Network,
  Bot,
  Brain,
};

export function Sidebar({ isOpen, onClose }) {
  return (
    <>
      <div
        className={`mobile-overlay ${isOpen ? 'show' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        id="sidebar"
        className={`w-[228px] shrink-0 flex flex-col px-3.5 py-3.5 h-full overflow-y-auto no-scrollbar relative z-30 select-none ${
          isOpen ? 'open' : ''
        }`}
        style={{
          background: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--sidebar-border)',
          boxShadow: '4px 0 28px rgba(81, 70, 168, 0.22)',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {/* Subtle Ambient Decorative Glows */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 w-44 h-44 rounded-full blur-2xl opacity-25"
          style={{ background: 'radial-gradient(circle, #FFFFFF 0%, transparent 70%)' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-28 -left-16 w-52 h-52 rounded-full blur-3xl opacity-20"
          style={{ background: 'radial-gradient(circle, #C4B5FD 0%, transparent 70%)' }}
        />

        {/* Brand Header */}
        <div className="relative mb-3.5 shrink-0">
          <div className="bg-white rounded-xl py-2 px-3 shadow-xs flex items-center justify-center">
            <img
              src="/gwc-logo.png"
              alt="GWC DATA.AI"
              className="h-7 w-auto object-contain"
            />
          </div>
          <div className="px-1 mt-2.5">
            <div className="font-extrabold text-[15px] text-white tracking-tight leading-snug">
              Workforce
            </div>
            <div
              className="font-medium text-[11px] leading-tight mt-0.5"
              style={{ color: 'var(--sidebar-muted)' }}
            >
              Management Agent
            </div>
          </div>
          <button
            type="button"
            className="absolute top-1 right-1 lg:hidden cursor-pointer text-slate-700 hover:text-black transition-colors p-1"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Menu */}
        <nav className="relative space-y-1 flex-1 py-1" aria-label="Primary navigation">
          {SIDEBAR_NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.icon];
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) => `nav-item group ${isActive ? 'active' : ''}`}
              >
                {Icon && (
                  <Icon className="w-4 h-4 shrink-0 opacity-85 group-hover:opacity-100 group-hover:scale-110 transition-all duration-200" />
                )}
                <span className="truncate">{item.label}</span>
                {item.hasChevron && (
                  <ChevronDown className="w-3.5 h-3.5 ml-auto opacity-70 group-hover:opacity-100 transition-transform duration-200 group-hover:translate-y-0.5" />
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
