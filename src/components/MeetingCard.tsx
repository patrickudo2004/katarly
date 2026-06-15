import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Video, MapPin, Clock, Calendar, Laptop, Loader2, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { MeetingDetailsModal } from './MeetingDetailsModal';
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
  const [showDetails, setShowDetails] = useState(false);

  const now = Date.now();
  const isActive = now >= meeting.startTime - 15 * 60 * 1000 && now <= meeting.endTime + 30 * 60 * 1000;
  const isCheckedIn = !!meeting.userAttendance;

  // Decoupled Background Check-in side-effect
  const handleOnlineJoin = () => {
    if (isCheckedIn) return;
    checkIn({
      meetingId: meeting._id as any,
      attendanceType: 'online',
    }).catch((err) => {
      console.warn("Background check-in failed:", err);
    });
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
    <>
      <div 
        className={`${styles.card} ${isActive ? styles.activeCard : ''}`} 
        onClick={() => setShowDetails(true)}
        style={{ cursor: 'pointer' }}
      >
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

        <div className={styles.actions}>
          {isCheckedIn ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
              <div className={styles.successBadge}>
                ✓ Attended {meeting.userAttendance?.attendanceType === 'online' ? 'Online' : 'Physically'}
              </div>
              {(meeting.format === 'Online' || meeting.format === 'Hybrid') && meeting.meetingUrl && (
                <a 
                  href={meeting.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={styles.secondaryBtn}
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
                >
                  Rejoin Room
                  <ArrowRight size={14} />
                </a>
              )}
            </div>
          ) : isActive ? (
            <div className={styles.buttonGroup}>
              {(meeting.format === 'Online' || meeting.format === 'Hybrid') && meeting.meetingUrl && (
                <a 
                  href={meeting.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOnlineJoin();
                  }}
                  className={styles.primaryBtn}
                  style={{ backgroundColor: platform.text, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  Join {platform.name}
                  <ArrowRight size={16} />
                </a>
              )}

              {(meeting.format === 'Physical' || meeting.format === 'Hybrid') && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/meetings?scan=true&id=${meeting._id}`);
                  }}
                  className={meeting.format === 'Hybrid' ? styles.secondaryBtn : styles.primaryBtn}
                >
                  <MapPin size={16} />
                  Scan Sanctuary QR
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%' }}>
              <span className={styles.scheduledText}>
                Scheduled ({format(meeting.startTime, 'eeee p')})
              </span>
              {(meeting.format === 'Online' || meeting.format === 'Hybrid') && meeting.meetingUrl && (
                <a 
                  href={meeting.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className={styles.secondaryBtn}
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', fontSize: '0.75rem', padding: '0.5rem' }}
                >
                  Open Lobby Link
                  <ArrowRight size={12} />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {showDetails && (
        <MeetingDetailsModal
          meetingId={meeting._id}
          onClose={() => setShowDetails(false)}
        />
      )}
    </>
  );
};
