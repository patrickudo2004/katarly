import React, { useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { BottomNav } from '../components/BottomNav';
import { NotificationTray } from '../components/NotificationTray';
import { 
  Bell, LogOut, User, Moon, Sun, ChevronDown, X, Church, TrendingUp, 
  Menu, QrCode, LayoutDashboard, Shield, Settings, BarChart3, Calendar, 
  UserCheck, Video, Clock, MessageSquare, ShoppingBag, Trophy, Network, Users 
} from 'lucide-react';
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { UserRole } from '../components/RoleBadge';
import { QRPassModal } from '../components/QRPassModal';
import styles from './MobileLayout.module.css';

interface MobileLayoutProps {
  children: React.ReactNode;
  user: {
    _id: string;
    name: string;
    role: UserRole;
    churchName: string;
  };
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children, user }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showQRPass, setShowQRPass] = useState(false);
  const location = useLocation();
  const unreadCount = useQuery(api.notifications.getUnreadCount) || 0;
  const memberships = useQuery(api.users.getMyMemberships);
  const { signOut } = useAuthActions();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    sessionStorage.removeItem('sessionChurchId');
    await signOut();
    navigate('/login');
  };

  const allRoles = ['SuperAdmin', 'DeaconHead', 'PastoralOversight', 'DepartmentHead', 'SubunitLead', 'Volunteer', 'Probation', 'OnNotice'];

  const navItems = [
    { label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/', roles: allRoles },
    ...(memberships && memberships.length > 1 ? [
      { label: 'Switch Campus', icon: <Church size={20} />, path: '/select-church', roles: allRoles }
    ] : []),
    { label: 'Admin Panel', icon: <Shield size={20} />, path: '/admin', roles: ['SuperAdmin', 'DeaconHead'] },
    { label: 'Church Settings', icon: <Settings size={20} />, path: '/admin/settings', roles: ['SuperAdmin'] },
    { label: 'Reports', icon: <BarChart3 size={20} />, path: '/reports', roles: ['SuperAdmin', 'DeaconHead', 'DepartmentHead', 'DepartmentAssistant', 'DepartmentSecretary', 'PastoralOversight', 'SubunitLead', 'SubunitAssistant'] },
    { label: 'Services', icon: <Calendar size={20} />, path: '/services', roles: ['SuperAdmin', 'DeaconHead', 'DepartmentHead', 'SubunitLead'] },
    { label: 'Check In', icon: <UserCheck size={20} />, path: '/attendance', roles: allRoles },
    { label: 'Meetings', icon: <Video size={20} />, path: '/meetings', roles: allRoles },
    { label: 'My Schedule', icon: <Clock size={20} />, path: '/my-schedule', roles: allRoles },
    { label: 'Rota', icon: <Calendar size={20} />, path: '/rota', roles: ['SuperAdmin', 'DeaconHead', 'DepartmentHead', 'SubunitLead', 'Volunteer'] },
    { label: 'Time Off', icon: <Clock size={20} />, path: '/time-off', roles: ['SuperAdmin', 'DeaconHead', 'DepartmentHead', 'SubunitLead', 'Volunteer'] },
    { label: 'Chat', icon: <MessageSquare size={20} />, path: '/chat', roles: allRoles },
    { label: 'Marketplace', icon: <ShoppingBag size={20} />, path: '/marketplace', roles: allRoles },
    { label: 'Hall of Fame', icon: <Trophy size={20} />, path: '/hall-of-fame', roles: allRoles },
    { label: 'The Network', icon: <Network size={20} />, path: '/network', roles: allRoles },
    { label: 'Invites', icon: <Users size={20} />, path: '/invites', roles: ['SuperAdmin', 'DeaconHead', 'DepartmentHead'] },
    { label: 'People', icon: <Users size={20} />, path: '/people', roles: ['SuperAdmin', 'DeaconHead', 'DepartmentHead', 'SubunitLead'] },
    { label: 'Growth Tracks', icon: <TrendingUp size={20} />, path: '/probation', roles: ['SuperAdmin', 'DeaconHead', 'DepartmentHead', 'SubunitLead'] },
    { label: 'Profile', icon: <User size={20} />, path: '/profile', roles: allRoles },
  ];

  const filteredNav = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className="flex items-center gap-3">
          <button
            className={styles.burgerTrigger}
            onClick={() => setShowDrawer(true)}
            aria-label="Toggle Navigation Drawer"
          >
            <Menu size={24} />
          </button>
          <div className={styles.churchInfo}>
            <span className={styles.churchName}>{user.churchName}</span>
            <span className={styles.userName}>{user.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            className="p-2 rounded-full"
            style={{ color: 'var(--text-secondary)', transition: 'background-color 0.2s' }}
            onClick={() => setShowQRPass(true)}
            aria-label="My QR Pass"
          >
            <QrCode size={20} />
          </button>
          <button 
            className="relative p-2 rounded-full"
            style={{ color: 'var(--text-secondary)', transition: 'background-color 0.2s' }}
            onClick={() => setShowNotifications(!showNotifications)}
            aria-label="Notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <button 
            className={styles.userTrigger}
            onClick={() => setShowUserMenu(!showUserMenu)}
            aria-label="User Menu"
          >
            <div className={styles.avatar}>{user?.name?.[0] || '?'}</div>
            <ChevronDown size={14} className={styles.chevron} />
          </button>
        </div>
      </header>

      {showDrawer && (
        <div className={styles.drawerOverlay} onClick={() => setShowDrawer(false)}>
          <div className={styles.drawerContent} onClick={e => e.stopPropagation()}>
            <div className={styles.drawerHeader}>
              <div className={styles.drawerLogo}>
                <div className={styles.logoIcon}>S</div>
                <span className={styles.logoText}>ServeSync</span>
              </div>
              <button className={styles.drawerClose} onClick={() => setShowDrawer(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.drawerList}>
              {filteredNav.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`${styles.drawerItem} ${location.pathname === item.path ? styles.activeItem : ''}`}
                  onClick={() => setShowDrawer(false)}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {showQRPass && (
        <QRPassModal onClose={() => setShowQRPass(false)} userId={user._id} />
      )}
      {showUserMenu && (
        <div className={styles.menuOverlay} onClick={() => setShowUserMenu(false)}>
          <div className={styles.menuContent} onClick={e => e.stopPropagation()}>
            <div className={styles.menuHeader}>
              <div className={styles.menuAvatar}>{user?.name?.[0] || '?'}</div>
              <div className={styles.menuUserInfo}>
                <span className={styles.menuUserName}>{user.name}</span>
                <span className={styles.menuUserRole}>{user.role}</span>
              </div>
              <button className={styles.menuClose} onClick={() => setShowUserMenu(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.menuList}>
              <Link to="/profile" className={styles.menuItem} onClick={() => setShowUserMenu(false)}>
                <User size={20} />
                <span>My Profile</span>
              </Link>

              {['SuperAdmin', 'DeaconHead', 'DepartmentHead', 'SubunitLead'].includes(user.role) && (
                <Link to="/probation" className={styles.menuItem} onClick={() => setShowUserMenu(false)}>
                  <TrendingUp size={20} />
                  <span>Growth Tracks</span>
                </Link>
              )}

              {memberships && memberships.length > 1 && (
                <Link to="/select-church" className={styles.menuItem} onClick={() => setShowUserMenu(false)}>
                  <Church size={20} />
                  <span>Switch Campus</span>
                </Link>
              )}
              
              <button className={styles.menuItem} onClick={toggleTheme}>
                {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
              </button>
              
              <div className={styles.menuDivider} />
              
              <button className={`${styles.menuItem} ${styles.signOut}`} onClick={handleSignOut}>
                <LogOut size={20} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {showNotifications && (
        <NotificationTray onClose={() => setShowNotifications(false)} />
      )}

      <main className={styles.content}>
        {children}
      </main>

      <BottomNav role={user.role} />
    </div>
  );
};
