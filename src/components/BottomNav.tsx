import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  Calendar, 
  QrCode, 
  MessageSquare, 
  User, 
  BarChart3, 
  Users,
  LayoutGrid,
  RefreshCw,
  Trophy,
  Heart,
  Video
} from 'lucide-react';
import { UserRole } from './RoleBadge';
import styles from './BottomNav.module.css';

interface BottomNavProps {
  role: UserRole;
}

interface NavItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  isAction?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ role }) => {
  const getNavItems = (): NavItem[] => {
    if (role === 'SuperAdmin' || role === 'DeaconHead') {
      return [
        { icon: <BarChart3 size={24} />, label: 'Overview', path: '/' },
        { icon: <MessageSquare size={24} />, label: 'Chat', path: '/chat' },
        { icon: <QrCode size={24} />, label: 'Check In', path: '/attendance', isAction: true },
        { icon: <Video size={24} />, label: 'Meetings', path: '/meetings' },
        { icon: <LayoutGrid size={24} />, label: 'Admin', path: '/admin' },
      ];
    }

    if (role === 'PastoralOversight') {
      return [
        { icon: <Home size={24} />, label: 'Home', path: '/' },
        { icon: <MessageSquare size={24} />, label: 'Chat', path: '/chat' },
        { icon: <QrCode size={24} />, label: 'Check In', path: '/attendance', isAction: true },
        { icon: <Video size={24} />, label: 'Meetings', path: '/meetings' },
        { icon: <Heart size={24} />, label: 'Oversight', path: '/reports' },
      ];
    }

    if (role === 'DepartmentHead') {
      return [
        { icon: <Home size={24} />, label: 'Home', path: '/' },
        { icon: <MessageSquare size={24} />, label: 'Chat', path: '/chat' },
        { icon: <QrCode size={24} />, label: 'Check In', path: '/attendance', isAction: true },
        { icon: <Video size={24} />, label: 'Meetings', path: '/meetings' },
        { icon: <Calendar size={24} />, label: 'Rota', path: '/rota' },
      ];
    }

    if (role === 'SubunitLead') {
      return [
        { icon: <Users size={24} />, label: 'Team', path: '/' },
        { icon: <MessageSquare size={24} />, label: 'Chat', path: '/chat' },
        { icon: <QrCode size={24} />, label: 'Check In', path: '/attendance', isAction: true },
        { icon: <Video size={24} />, label: 'Meetings', path: '/meetings' },
        { icon: <Calendar size={24} />, label: 'Schedule', path: '/my-schedule' },
      ];
    }

    // Volunteer / Probation / OnNotice
    return [
      { icon: <Home size={24} />, label: 'Home', path: '/' },
      { icon: <MessageSquare size={24} />, label: 'Chat', path: '/chat' },
      { icon: <QrCode size={24} />, label: 'Check In', path: '/attendance', isAction: true },
      { icon: <Video size={24} />, label: 'Meetings', path: '/meetings' },
      { icon: <Calendar size={24} />, label: 'Schedule', path: '/my-schedule' },
    ];
  };

  const navItems = getNavItems();

  return (
    <nav className={styles.nav}>
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) => 
            `${styles.navItem} ${isActive ? styles.active : ''} ${item.isAction ? styles.actionItem : ''}`
          }
        >
          <div className={styles.iconWrapper}>
            {item.icon}
          </div>
          <span className={styles.label}>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};
