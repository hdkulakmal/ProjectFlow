import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  FolderGit2,
  Megaphone,
  Sliders,
  LogOut,
  Bell,
  Menu,
  GraduationCap
} from 'lucide-react';

export default function CoordinatorLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Dashboard', path: '/coordinator/dashboard', icon: LayoutDashboard },
    { name: 'Groups', path: '/coordinator/dashboard', icon: Users },
    { name: 'Announcements', path: '/coordinator/dashboard', icon: Megaphone },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'CD';

  return (
    <div className="min-h-screen bg-surface flex text-on-surface">
      {/* Desktop Sidebar (Fixed 280px) */}
      <aside className="hidden md:flex flex-col w-[280px] bg-white border-r border-outline-variant fixed inset-y-0 left-0 z-20">
        <div className="p-6 border-b border-outline-variant/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary tracking-tight">ProjectFlow</h1>
              <p className="text-xs text-on-surface-variant font-medium">Coordinator Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-surface-container-low text-primary border-l-4 border-secondary shadow-xs'
                      : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                  }`
                }
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.name}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-outline-variant bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center text-sm font-bold shrink-0">
                {initials}
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-primary truncate">{user?.fullName || 'Coordinator'}</p>
                <p className="text-xs text-on-surface-variant truncate">Project Coordinator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 text-outline hover:text-error rounded-lg hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-[280px] flex flex-col min-h-screen">
        <header className="h-16 sticky top-0 z-10 bg-surface/90 backdrop-blur-md border-b border-outline-variant px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-on-surface hover:bg-surface-container"
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-base font-bold text-primary">Academic Project Coordinator</h2>
          </div>

          <div className="flex items-center gap-3">
            <button className="relative p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            <div className="h-9 w-9 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}