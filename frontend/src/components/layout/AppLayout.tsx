import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Home, Zap, BookOpen, Package, Users, Trophy, MessageSquare,
  ArrowLeftRight, User, Settings, LogOut, Bell, Search, Menu, X,
  ChevronRight, Star, Layers, Rocket
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';

const NAV_ITEMS = [
  { path: '/dashboard', icon: Home, label: 'Home' },
  { path: '/people', icon: Users, label: 'People' },
  { path: '/skill-graph', icon: Layers, label: 'Skill Graph' },
  { path: '/skills', icon: Zap, label: 'SkillSwap' },
  { path: '/borrow', icon: Package, label: 'Borrow Hub' },
  { path: '/dream-team', icon: Rocket, label: 'Dream Team' },
  { path: '/quests', icon: Trophy, label: 'Quests & Rewards' },
  { path: '/messages', icon: MessageSquare, label: 'Messages' },
  { path: '/exchanges', icon: ArrowLeftRight, label: 'My Requests' },
];


const BOTTOM_NAV = [
  { path: '/profile', icon: User, label: 'Profile' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

function XPBar({ xp, level }: { xp: number; level: number }) {
  const xpInLevel = xp % 100;
  return (
    <div className="sidebar-xp">
      <div className="flex items-center justify-between mb-2">
        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', fontWeight: 600 }}>
          Level {level}
        </span>
        <span style={{ color: 'var(--cx-lime)', fontSize: '0.75rem', fontWeight: 700 }}>
          {xp} XP
        </span>
      </div>
      <div className="progress-bar" style={{ background: 'rgba(255,255,255,0.12)' }}>
        <div
          className="progress-fill"
          style={{ width: `${xpInLevel}%`, background: 'linear-gradient(90deg, var(--cx-lime), #a8e44a)' }}
        />
      </div>
      <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6875rem', marginTop: '0.25rem' }}>
        {100 - xpInLevel} XP to next level
      </div>
    </div>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuthStore();
  const { sidebarOpen, setSidebar } = useUIStore();
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const { data: notifData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: async () => {
      const res = await api.get('/notifications/?is_read=false&page_size=5');
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const unreadCount = notifData?.unread_count ?? 0;

  function handleLogout() {
    logout();
    navigate('/');
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '??';

  return (
    <div className="cx-app-layout">
      {/* Sidebar Overlay (mobile) */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
            zIndex: 99, display: 'block'
          }}
          onClick={() => setSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`cx-sidebar ${sidebarOpen ? 'mobile-open' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">CX</div>
          <span className="sidebar-logo-text">CampusX</span>
          <button
            className="btn btn-ghost btn-icon"
            style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.4)', display: 'none' }}
            onClick={() => setSidebar(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* XP Indicator */}
        <XPBar xp={user?.xp ?? 0} level={user?.level ?? 1} />

        {/* Navigation */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Main</div>
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              onClick={() => setSidebar(false)}
            >
              <Icon size={20} className="sidebar-icon" />
              <span>{label}</span>
              {label === 'Messages' && unreadCount > 0 && (
                <span className="sidebar-badge">{unreadCount}</span>
              )}
            </NavLink>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: '0.5rem' }}>Account</div>
          <NavLink
            to="/profile"
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebar(false)}
          >
            <User size={20} className="sidebar-icon" />
            <span>My Profile</span>
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            onClick={() => setSidebar(false)}
          >
            <Settings size={20} className="sidebar-icon" />
            <span>Settings</span>
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
            >
              <Star size={20} className="sidebar-icon" />
              <span>Admin Panel</span>
            </NavLink>
          )}
        </nav>

        {/* User profile footer */}
        <div style={{
          margin: '0 0.75rem 1rem',
          padding: '0.75rem',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: 'var(--cx-radius)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
        }}>
          <div className="avatar avatar-sm" style={{ background: 'var(--cx-primary)', color: 'white', flexShrink: 0 }}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="truncate" style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600 }}>
              {user?.full_name}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.75rem' }}>
              {user?.department}
            </div>
          </div>
          <button
            className="btn btn-ghost btn-icon btn-sm"
            style={{ color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="cx-main">
        {/* Top bar */}
        <header className="cx-topbar">
          <button
            className="btn btn-ghost btn-icon hide-mobile"
            style={{ display: 'none' }}
            onClick={() => setSidebar(true)}
          >
            <Menu size={22} />
          </button>
          <button
            className="btn btn-ghost btn-icon"
            style={{ display: 'flex' }}
            onClick={() => setSidebar(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            <Menu size={22} />
          </button>

          {/* Search */}
          <div className="search-bar" style={{ flex: 1, maxWidth: 480 }}>
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search skills, resources, students..."
              onFocus={() => navigate('/skills')}
            />
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {/* Notifications */}
            <button
              className="btn btn-ghost btn-icon"
              style={{ position: 'relative' }}
              onClick={() => navigate('/exchanges')}
              title="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span style={{
                  position: 'absolute', top: '4px', right: '4px',
                  width: '8px', height: '8px', background: 'var(--cx-coral)',
                  borderRadius: '50%', border: '2px solid white',
                }} />
              )}
            </button>

            {/* Avatar */}
            <NavLink to="/profile">
              <div
                className="avatar avatar-sm"
                style={{
                  background: 'var(--cx-primary)',
                  color: 'white',
                  cursor: 'pointer',
                  border: '2px solid var(--cx-primary-subtle)',
                }}
              >
                {user?.avatar_url
                  ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initials
                }
              </div>
            </NavLink>
          </div>
        </header>

        {/* Page content */}
        <div className="cx-page animate-fadeIn">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="mobile-bottom-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <Home size={22} />
          <span>Home</span>
        </NavLink>
        <NavLink to="/skill-graph" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <Layers size={22} />
          <span>Graph</span>
        </NavLink>
        <NavLink to="/skills" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <Zap size={22} />
          <span>Skills</span>
        </NavLink>
        <NavLink to="/borrow" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <Package size={22} />
          <span>Borrow</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
          <User size={22} />
          <span>Profile</span>
        </NavLink>
      </nav>
    </div>
  );
}
