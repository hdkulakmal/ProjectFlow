import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  MessageSquare,
  FileText,
  Calendar,
  LogOut,
  Bell,
  Menu,
  X,
  GraduationCap
} from 'lucide-react';
import { BookOpen } from 'lucide-react'


export default function StudentLayout({ children, projectTitle = "ProjectFlow", groupNumber = "Group" }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Fetch unread notifications count
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications/unread-count');
        setUnreadCount(res.data.unreadCount || 0);
      } catch (err) {
        console.error('Failed to load notifications count');
      }
    };
    fetchNotifications();
  }, []);

    const navLinks = [
    { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
    { name: 'My Group', path: '/student/group', icon: Users },
    { name: 'Previous Projects', path: '/student/projects', icon: BookOpen },
    { name: 'Supervisor Requests', path: '/student/supervisor-requests', icon: UserPlus },
    { name: 'Communication', path: '/student/chat', icon: MessageSquare },
    { name: 'Documents', path: '/student/documents', icon: FileText },
    { name: 'Timeline', path: '/student/timeline', icon: Calendar },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // User initials for avatar
  const initials = user?.fullName
    ? user.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'ST';

  return (
    <div className="min-h-screen bg-surface flex text-on-surface">
      {/* Desktop Sidebar (Fixed 280px) */}
      <aside className="hidden md:flex flex-col w-[280px] bg-white border-r border-outline-variant fixed inset-y-0 left-0 z-20">
        {/* Logo / Header */}
        <div className="p-6 border-b border-outline-variant/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-primary tracking-tight">ProjectFlow</h1>
              <p className="text-xs text-on-surface-variant font-medium">University of Vavuniya</p>
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
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

        {/* User Profile & Logout at Bottom */}
        <div className="p-4 border-t border-outline-variant bg-slate-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-primary-container text-white flex items-center justify-center text-sm font-bold shrink-0">
                {initials}
              </div>
              <div className="truncate">
                <p className="text-sm font-bold text-primary truncate">{user?.fullName || 'Student'}</p>
                <p className="text-xs text-on-surface-variant truncate">{user?.registrationNumber || 'Student'}</p>
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

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-primary/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-72 bg-white flex flex-col h-full shadow-2xl z-10">
            <div className="p-5 flex justify-between items-center border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <h1 className="font-bold text-primary">ProjectFlow</h1>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X className="h-6 w-6 text-on-surface" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
              {navLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        isActive
                          ? 'bg-surface-container-low text-primary border-l-4 border-secondary'
                          : 'text-on-surface-variant hover:text-primary hover:bg-surface-container'
                      }`
                    }
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="p-4 border-t border-outline-variant flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-primary truncate">{user?.fullName}</p>
                <p className="text-xs text-on-surface-variant">Student</p>
              </div>
              <button onClick={handleLogout} className="text-error p-2">
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 md:ml-[280px] flex flex-col min-h-screen">
        {/* Sticky Top Header */}
        <header className="h-16 sticky top-0 z-10 bg-surface/90 backdrop-blur-md border-b border-outline-variant px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 rounded-lg text-on-surface hover:bg-surface-container"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div>
              <h2 className="text-base font-bold text-primary truncate max-w-xs md:max-w-md">
                {projectTitle}
              </h2>
              <p className="text-xs text-on-surface-variant">{groupNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Notifications Button */}
            <button
              onClick={() => navigate('/student/chat')}
              className="relative p-2 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Profile Avatar Badge */}
            <div className="h-9 w-9 rounded-full bg-primary-container text-white flex items-center justify-center text-xs font-bold shadow-xs">
              {initials}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}