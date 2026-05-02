import React from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Bell, ShieldAlert, Award, FileText, CheckCircle, Flame, Gift, ArrowRight, X, ChevronLeft } from 'lucide-react';
import styles from './NotificationTray.module.css';

interface NotificationTrayProps {
  onClose: () => void;
}

export const NotificationTray: React.FC<NotificationTrayProps> = ({ onClose }) => {
  const notifications = useQuery(api.notifications.getUserNotifications);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  if (notifications === undefined) {
    return (
      <div className={styles.trayContainer}>
        <div className={styles.empty}>Loading...</div>
      </div>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'probation_extended':
      case 'probation_ended':
        return <ShieldAlert size={20} />;
      case 'badge_earned':
      case 'streak_achieved':
        return <Award size={20} />;
      case 'borrow_request':
        return <FileText size={20} />;
      case 'swap_approved':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'reward_redeemed':
        return <Gift size={20} />;
      default:
        return <Bell size={20} />;
    }
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleNotifClick = async (notif: any) => {
    if (!notif.read) {
      await markAsRead({ notificationId: notif._id });
    }
    // Mobile view handling where we navigate based on notification type could go here
    onClose();
  };

  return (
    <div className={styles.trayContainer}>
      <div className={styles.header}>
        <div className="flex items-center gap-3">
          <button className={styles.backBtn} onClick={onClose}>
            <ChevronLeft size={24} />
          </button>
          <h3>Notifications</h3>
        </div>
        <div>
          {notifications.some(n => !n.read) && (
            <button onClick={handleMarkAllRead} className={styles.markReadBtn}>
              Mark all as read
            </button>
          )}
        </div>
      </div>
      
      <div className={styles.list}>
        {notifications.length === 0 ? (
          <div className={styles.empty}>
            <Bell size={32} />
            <p>You have no notifications.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div 
              key={notif._id} 
              className={`${styles.notificationItem} ${!notif.read ? styles.unread : ''}`}
              onClick={() => handleNotifClick(notif)}
            >
              <div className={styles.iconWrapper}>
                {getIcon(notif.type)}
              </div>
              <div className={styles.content}>
                <h4>{notif.title}</h4>
                <p>{notif.message}</p>
              </div>
              {!notif.read && <div className={styles.unreadDot} />}
            </div>
          ))
        )}
      </div>
      
    </div>
  );
};
