import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Monitor, Key, FileSearch, BarChart3,
  Users, Settings, Upload, ChevronLeft, ChevronRight,
  LogOut, ShieldCheck,
} from 'lucide-react';
import { cls } from '../utils/helpers';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  divider?: boolean;
}

const NAV: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Activos', path: '/assets', icon: <Monitor size={18} /> },
  { label: 'Licencias', path: '/licenses', icon: <Key size={18} /> },
  { label: 'Auditoría', path: '/audit', icon: <FileSearch size={18} />, divider: true },
  { label: 'Reportes', path: '/reports', icon: <BarChart3 size={18} /> },
  { label: 'Importar', path: '/import', icon: <Upload size={18} />, divider: true },
  { label: 'Usuarios', path: '/users', icon: <Users size={18} />, adminOnly: true },
  { label: 'Catálogos', path: '/catalogs', icon: <Settings size={18} />, adminOnly: true },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { pathname } = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const items = NAV.filter(n => !n.adminOnly || isAdmin);

  return (
    <aside className={cls(
      'flex flex-col h-screen bg-slate-900 border-r border-slate-700/50 transition-all duration-300 flex-shrink-0',
      collapsed ? 'w-[72px]' : 'w-[256px]'
    )}>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-slate-700/50">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <ShieldCheck size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-100">SIGAT-ES</p>
              <p className="text-xs text-slate-500">Gestión de Activos</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
            <ShieldCheck size={16} className="text-white" />
          </div>
        )}
        <button
          onClick={() => setCollapsed(c => !c)}
          className={cls(
            'p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer',
            collapsed && 'mx-auto mt-4'
          )}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {items.map((item, i) => {
          const active = pathname === item.path || pathname.startsWith(item.path + '/');
          return (
            <React.Fragment key={item.path}>
              {item.divider && i > 0 && <div className="border-t border-slate-700/50 my-2 mx-2" />}
              <Link
                to={item.path}
                className={cls(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150 group',
                  active
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                )}
                title={collapsed ? item.label : undefined}
              >
                <span className={cls('flex-shrink-0', active ? 'text-blue-400' : 'group-hover:text-slate-200')}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{item.label}</span>
                )}
                {!collapsed && active && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
                )}
              </Link>
            </React.Fragment>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-700/50 p-3">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-white">
                {user?.full_name?.split(' ').map(n => n[0]).slice(0, 2).join('') ?? 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-100 truncate">{user?.full_name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.role?.name ?? 'Usuario'}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={logout}
            className="w-full flex justify-center p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
            title="Cerrar sesión"
          >
            <LogOut size={16} />
          </button>
        )}
      </div>
    </aside>
  );
};
