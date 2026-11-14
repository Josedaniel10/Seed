import { useState } from 'react';
import type { ReactElement } from 'react';
import { NavLink } from 'react-router-dom';
import { FileText, PlusCircle, ClipboardCheck, LayoutDashboard, CheckSquare, Calendar,
  FileCheck, UserCheck, BarChart3, Users, Layers, BookOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { ROLE_MENU_ITEMS } from '../lib/permisos.ts';
import type { AppRole } from '../lib/permisos.ts';
import { readSidebarCollapsed, saveSidebarCollapsed } from '../lib/sidebarPreference.ts';

const icons: Record<string, LucideIcon> = {
  FileText, PlusCircle, ClipboardCheck, LayoutDashboard, CheckSquare, Calendar,
  FileCheck, UserCheck, BarChart3, Users, Layers, BookOpen,
};

export function AppSidebar({ activeRole }: { activeRole: AppRole }): ReactElement {
  const [collapsed, setCollapsed] = useState(readSidebarCollapsed);
  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    saveSidebarCollapsed(next);
  };

  return <aside className={`app-sidebar ${collapsed ? 'w-20' : 'w-60'} sticky top-14 self-start h-[calc(100dvh-3.5rem)] bg-white border-r border-[#E5E3DC] p-3.5 shrink-0 hidden md:flex flex-col gap-3`}>
      <button type="button" onClick={toggle} aria-expanded={!collapsed} aria-controls="desktop-navigation"
        aria-label={collapsed ? 'Ampliar menú lateral' : 'Reducir menú lateral'} title={collapsed ? 'Ampliar menú lateral' : 'Reducir menú lateral'}
        className="absolute right-0 top-5 translate-x-1/2 z-10 flex items-center justify-center w-6 h-6 rounded-full border border-[#E5E3DC] bg-white text-stone-400 shadow-xs hover:text-stone-700 hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4d7c0f] transition-colors cursor-pointer">
        {collapsed ? <ChevronRight size={14} strokeWidth={1.5} aria-hidden="true" /> : <ChevronLeft size={14} strokeWidth={1.5} aria-hidden="true" />}
      </button>
    <nav id="desktop-navigation" aria-label="Navegación del rol" className="min-h-0 flex-1 overflow-y-auto space-y-1">
      {(ROLE_MENU_ITEMS[activeRole] ?? []).map((item) => {
        const Icon = icons[item.iconName] ?? FileText;
        return <NavLink key={item.path} to={item.path} title={collapsed ? item.label : undefined}
          className={({ isActive }) => `flex items-center ${collapsed ? 'justify-center px-2' : 'gap-2.5 px-3'} min-h-10 py-2.5 rounded-xl text-xs font-medium transition-colors ${isActive
            ? 'bg-[#14281D] text-white font-semibold shadow-xs' : 'text-stone-600 hover:text-[#14281D] hover:bg-stone-100'}`}>
          <Icon size={17} aria-hidden="true" className="shrink-0" />
          <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
        </NavLink>;
      })}
    </nav>
  </aside>;
}
