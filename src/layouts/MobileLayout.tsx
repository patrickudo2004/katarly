import React, { useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { BottomNav } from '../components/BottomNav';
import { NotificationTray } from '../components/NotificationTray';
import { Bell, LogOut, User, Moon, Sun, ChevronDown, X } from 'lucide-react';
import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { UserRole } from '../components/RoleBadge';
import styles from './MobileLayout.module.css';

interface MobileLayoutProps {
  children: React.ReactNode;
  user: {
    name: string;
    role: UserRole;
    churchName: string;
  };
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ children, user }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const unreadCount = useQuery(api.notifications.getUnreadCount) || 0;
  const { signOut } = useAuthActions();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.churchInfo}>
          <span className={styles.churchName}>{user.churchName}</span>
          <span className={styles.userName}>{user.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            className="relative p-2 rounded-full"
            style={{ color: 'var(--text-secondary)', transition: 'background-color 0.2s' }}
            onClick={() => setShowNotifications(!showNotifications)}
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
          >
            <div className={styles.avatar}>{user?.name?.[0] || '?'}</div>
            <ChevronDown size={14} className={styles.chevron} />
          </button>
        </div>
      </header>
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
