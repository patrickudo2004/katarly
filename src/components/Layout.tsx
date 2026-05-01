import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  UserCheck, 
  Clock, 
  Settings, 
  LogOut,
  Shield, 
  MessageSquare, 
  Trophy, 
  ShoppingBag, 
  Scale, 
  User, 
  ChevronLeft, 
  ChevronRight,
  Menu,
  Users
} from 'lucide-react';
import { RoleBadge, UserRole } from './RoleBadge';
import { ThemeToggle } from './ThemeToggle';
import styles from './Layout.module.css';

import { useAuthActions } from "@convex-dev/auth/react";

interface LayoutProps {
  children: React.ReactNode;
  user: {
    name: string;
    role: UserRole;
    churchName: string;
  };
}

export const Layout: React.FC<LayoutProps> = ({ children, user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved === 'true';
  });

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarCollapsed', String(newState));
      return newState;
    });
  };

  const allRoles = ['SuperAdmin', 'DeaconHead', 'PastoralOversight', 'DepartmentHead', 'SubunitLead', 'Volunteer', 'Probation', 'OnNotice'];

  const navItems = [
    { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', roles: allRoles },
    { label: 'Admin', icon: <Shield size={20} />, path: '/admin', roles: ['SuperAdmin', 'DeaconHead'] },
    { label: 'Church Settings', icon: <Settings size={20} />, path: '/admin/settings', roles: ['SuperAdmin'] },
    { label: 'Services', icon: <Calendar size={20} />, path: '/services', roles: ['SuperAdmin', 'DeaconHead', 'DepartmentHead', 'SubunitLead'] },
    { label: 'Attendance', icon: <UserCheck size={20} />, path: '/attendance', roles: allRoles },
    { label: 'Rota', icon: <Calendar size={20} />, path: '/rota', roles: ['SuperAdmin', 'DeaconHead', 'DepartmentHead', 'SubunitLead', 'Volunteer'] },
    { label: 'Time Off', icon: <Clock size={20} />, path: '/time-off', roles: ['SuperAdmin', 'DeaconHead', 'DepartmentHead', 'SubunitLead', 'Volunteer'] },
    { label: 'Chat', icon: <MessageSquare size={20} />, path: '/chat', roles: allRoles },
    { label: 'Marketplace', icon: <ShoppingBag size={20} />, path: '/marketplace', roles: allRoles },
    { label: 'Hall of Fame', icon: <Trophy size={20} />, path: '/hall-of-fame', roles: allRoles },
    { label: 'Invites', icon: <Users size={20} />, path: '/invites', roles: ['SuperAdmin', 'DeaconHead', 'DepartmentHead'] },
    { label: 'Profile', icon: <User size={20} />, path: '/profile', roles: allRoles },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className={styles.container}>
      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>K</div>
          {!isCollapsed && <span className={styles.logoText}>Katarly</span>}
          <button className={styles.collapseBtn} onClick={toggleSidebar}>
            {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {!isCollapsed && (
          <div className={styles.churchInfo}>
            <p className={styles.churchName}>{user.churchName}</p>
            <div className="flex items-center justify-between">
              <RoleBadge role={user.role} />
              <ThemeToggle className={styles.themeToggle} />
            </div>
          </div>
        )}

        <nav className={styles.nav}>
          {filteredNav.map(item => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
              title={isCollapsed ? item.label : undefined}
            >
              {item.icon}
              {!isCollapsed && <span>{item.label}</span>}
              {location.pathname === item.path && !isCollapsed && <ChevronRight size={16} className={styles.activeIndicator} />}
            </Link>
          ))}
        </nav>

        <div className={styles.footer}>
          <Link to="/profile" className={styles.userInfo}>
            <div className={styles.avatar}>{user.name[0]}</div>
            {!isCollapsed && (
              <div className={styles.userMeta}>
                <p className={styles.userName}>{user.name}</p>
                <button className={styles.logoutBtn} onClick={(e) => { e.preventDefault(); signOut(); }}>
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.pageTitle}>
            {navItems.find(i => i.path === location.pathname)?.label || 'Page'}
          </h1>
        </header>
        <div className={styles.content}>
          {children}
        </div>
      </main>
    </div>
  );
};
