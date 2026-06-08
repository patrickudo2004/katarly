import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Video, MapPin, Clock, Calendar, Laptop, Loader2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import styles from './MeetingCard.module.css';

interface MeetingCardProps {
  meeting: {
    _id: string;
    name: string;
    description?: string;
    startTime: number;
    endTime: number;
    format: "Physical" | "Online" | "Hybrid";
    platform: "Teams" | "Zoom" | "Meet" | "Custom";
    meetingUrl?: string;
    locationName?: string;
    userAttendance?: {
      status: string;
      timestamp: number;
      attendanceType: string;
      method: string;
    } | null;
  };
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting }) => {
  const navigate = useNavigate();
  const checkIn = useMutation(api.meetings.checkInToMeeting);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = Date.now();
  const isActive = now >= meeting.startTime - 15 * 60 * 1000 && now <= meeting.endTime + 30 * 60 * 1000;
  const isCheckedIn = !!meeting.userAttendance;

  const handleOnlineJoin = async () => {
    if (!meeting.meetingUrl) return;
    setIsCheckingIn(true);
    setError(null);
    try {
      // 1. Mark attendance on the backend
      await checkIn({
        meetingId: meeting._id as any,
        attendanceType: 'online',
      });
      // 2. Open Teams/Zoom in a new window
      window.open(meeting.meetingUrl, '_blank');
      // Refresh local route context
      navigate(0);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to check in online');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const getPlatformColors = () => {
    switch (meeting.platform) {
      case 'Teams':
        return { bg: 'rgba(98, 100, 167, 0.1)', text: '#6264a7', border: 'rgba(98, 100, 167, 0.2)', name: 'MS Teams' };
      case 'Zoom':
        return { bg: 'rgba(45, 140, 255, 0.1)', text: '#2d8cff', border: 'rgba(45, 140, 255, 0.2)', name: 'Zoom' };
      case 'Meet':
        return { bg: 'rgba(15, 157, 88, 0.1)', text: '#0f9d58', border: 'rgba(15, 157, 88, 0.2)', name: 'Google Meet' };
      default:
        return { bg: 'rgba(107, 114, 128, 0.1)', text: 'var(--text-secondary)', border: 'var(--border-color)', name: 'Virtual Link' };
    }
  };

  const platform = getPlatformColors();

  return (
    <div className={`${styles.card} ${isActive ? styles.activeCard : ''}`}>
      <div className={styles.header}>
        <div className={styles.meta}>
          <span className={`${styles.formatBadge} ${styles[meeting.format]}`}>
            {meeting.format}
          </span>
          {(meeting.format === 'Online' || meeting.format === 'Hybrid') && (
            <span 
              className={styles.platformBadge} 
              style={{ backgroundColor: platform.bg, color: platform.text, borderColor: platform.border }}
            >
              <Laptop size={12} style={{ marginRight: '4px' }} />
              {platform.name}
            </span>
          )}
        </div>
        {isActive && !isCheckedIn && (
          <span className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            Live Now
          </span>
        )}
      </div>

      <h3 className={styles.title}>{meeting.name}</h3>
      {meeting.description && <p className={styles.description}>{meeting.description}</p>}

      <div className={styles.details}>
        <div className={styles.detailItem}>
          <Clock size={14} className={styles.detailIcon} />
          <span>
            {format(meeting.startTime, 'p')} - {format(meeting.endTime, 'p')} ({format(meeting.startTime, 'MMM d')})
          </span>
        </div>

        {meeting.locationName && (meeting.format === 'Physical' || meeting.format === 'Hybrid') && (
          <div className={styles.detailItem}>
            <MapPin size={14} className={styles.detailIcon} />
            <span>{meeting.locationName}</span>
          </div>
        )}
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.actions}>
        {isCheckedIn ? (
          <div className={styles.successBadge}>
            ✓ Attended {meeting.userAttendance?.attendanceType === 'online' ? 'Online' : 'Physically'}
          </div>
        ) : isActive ? (
          <div className={styles.buttonGroup}>
            {(meeting.format === 'Online' || meeting.format === 'Hybrid') && (
              <button 
                onClick={handleOnlineJoin} 
                disabled={isCheckingIn}
                className={styles.primaryBtn}
                style={{ backgroundColor: platform.text }}
              >
                {isCheckingIn ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <>
                    Join {platform.name}
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            )}

            {(meeting.format === 'Physical' || meeting.format === 'Hybrid') && (
              <button 
                onClick={() => navigate(`/meetings?scan=true&id=${meeting._id}`)}
                className={meeting.format === 'Hybrid' ? styles.secondaryBtn : styles.primaryBtn}
              >
                <MapPin size={16} />
                Scan Sanctuary QR
              </button>
            )}
          </div>
        ) : (
          <span className={styles.scheduledText}>
            Scheduled ({format(meeting.startTime, 'eeee p')})
          </span>
        )}
      </div>
    </div>
  );
};
