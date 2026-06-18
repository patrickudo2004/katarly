import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  Bell, ShieldAlert, Award, CheckCircle, Gift,
  ChevronLeft, ArrowRightLeft, UserCheck, Clock, X
} from 'lucide-react';
import { BorrowBottomSheet, BorrowSheetMode } from './BorrowBottomSheet';
import styles from './NotificationTray.module.css';

interface NotificationTrayProps {
  onClose: () => void;
}

// Map notification types to which bottom sheet mode they need
const BORROW_ACTION_MAP: Record<string, BorrowSheetMode> = {
  borrow_request: 'approval',             // Dept head / SubunitLead needs to approve
  borrow_assignment_pending: 'assignment', // Volunteer needs to accept/decline
};

// Map types to icons
const getIcon = (type: string) => {
  switch (type) {
    case 'probation_extended':
    case 'probation_ended':
      return <ShieldAlert size={20} />;
    case 'badge_earned':
    case 'streak_achieved':
      return <Award size={20} />;
    case 'borrow_request':
      return <ArrowRightLeft size={20} />;
    case 'borrow_assignment_pending':
      return <UserCheck size={20} />;
    case 'borrow_request_approved':
    case 'borrow_accepted':
    case 'swap_approved':
      return <CheckCircle size={20} style={{ color: '#059669' }} />;
    case 'borrow_request_declined':
    case 'borrow_declined':
      return <X size={20} style={{ color: '#dc2626' }} />;
    case 'borrow_expired':
      return <Clock size={20} />;
    case 'reward_redeemed':
      return <Gift size={20} />;
    default:
      return <Bell size={20} />;
  }
};

// Colour accent per type
const getAccent = (type: string): string => {
  if (type.startsWith('borrow_')) {
    if (type === 'borrow_request' || type === 'borrow_assignment_pending') return '#8b5cf6';
    if (type.includes('approved') || type.includes('accepted')) return '#059669';
    if (type.includes('declined')) return '#dc2626';
    return '#6b7280';
  }
  if (type === 'badge_earned' || type === 'streak_achieved') return '#f59e0b';
  if (type === 'probation_extended' || type === 'probation_ended') return '#ef4444';
  return '#8b5cf6';
};

export const NotificationTray: React.FC<NotificationTrayProps> = ({ onClose }) => {
  const notifications = useQuery(api.notifications.getUserNotifications);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const [activeSheet, setActiveSheet] = useState<BorrowSheetMode | null>(null);

  if (notifications === undefined) {
    return (
      <div className={styles.trayContainer}>
        <div className={styles.empty}>Loading...</div>
      </div>
    );
  }

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleNotifClick = async (notif: any) => {
    if (!notif.read) {
      await markAsRead({ notificationId: notif._id });
    }

    // If the notification type maps to an actionable borrow sheet, open it
    const sheetMode = BORROW_ACTION_MAP[notif.type];
    if (sheetMode) {
      setActiveSheet(sheetMode);
      return; // don't close the tray — sheet renders on top
    }

    // All other types: just close the tray
    onClose();
  };

  return (
    <>
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
            notifications.map((notif) => {
              const accent = getAccent(notif.type);
              const isActionable = !!BORROW_ACTION_MAP[notif.type];
              return (
                <div
                  key={notif._id}
                  className={`${styles.notificationItem} ${!notif.read ? styles.unread : ''}`}
                  onClick={() => handleNotifClick(notif)}
                  style={isActionable ? { borderLeft: `3px solid ${accent}` } : undefined}
                >
                  <div
                    className={styles.iconWrapper}
                    style={{ color: accent, background: `${accent}18` }}
                  >
                    {getIcon(notif.type)}
                  </div>
                  <div className={styles.content}>
                    <h4>{notif.title}</h4>
                    <p>{notif.message}</p>
                    {isActionable && (
                      <span className={styles.actionHint}>Tap to take action →</span>
                    )}
                  </div>
                  {!notif.read && <div className={styles.unreadDot} />}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Borrow action bottom sheet — sits on top of the notification tray */}
      {activeSheet && (
        <BorrowBottomSheet
          isOpen
          mode={activeSheet}
          onClose={() => setActiveSheet(null)}
        />
      )}
    </>
  );
};
