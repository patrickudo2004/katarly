import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Video, MapPin, Clock, Calendar, Laptop, Loader2, ArrowRight, Star, AlertCircle } from 'lucide-react';
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
      excuseReason?: string;
      excuseDetail?: string;
      wellnessRating?: number;
      wellnessFeedback?: string;
    } | null;
  };
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting }) => {
  const navigate = useNavigate();
  const checkIn = useMutation(api.meetings.checkInToMeeting);
  const lodgeExcuse = useMutation(api.meetings.lodgeMeetingExcuse);
  const submitFeedback = useMutation(api.meetings.submitMeetingFeedback);

  const [showDetails, setShowDetails] = useState(false);
  
  // Excuse states
  const [showExcuseForm, setShowExcuseForm] = useState(false);
  const [excuseReason, setExcuseReason] = useState('Work');
  const [excuseDetail, setExcuseDetail] = useState('');
  const [isSubmittingExcuse, setIsSubmittingExcuse] = useState(false);

  // Feedback states
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  const now = Date.now();
  const isActive = now >= meeting.startTime - 15 * 60 * 1000 && now <= meeting.endTime + 30 * 60 * 1000;
  const isCheckedIn = !!meeting.userAttendance;
  const hasEnded = now > meeting.endTime;

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

  const handleExcuseSubmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSubmittingExcuse(true);
    try {
      await lodgeExcuse({
        meetingId: meeting._id as any,
        reason: excuseReason,
        detail: excuseDetail || undefined,
      });
      setShowExcuseForm(false);
    } catch (err) {
      console.error("Failed to lodge excuse:", err);
    } finally {
      setIsSubmittingExcuse(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (rating === 0) return;
    setIsSubmittingFeedback(true);
    try {
      await submitFeedback({
        meetingId: meeting._id as any,
        rating,
        feedback: feedbackText || undefined,
      });
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error("Failed to submit feedback:", err);
    } finally {
      setIsSubmittingFeedback(false);
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

  // Condition to show rating widget
  const showRatingWidget = hasEnded && isCheckedIn && meeting.userAttendance?.status !== 'Excused' && !meeting.userAttendance?.wellnessRating && !feedbackSubmitted;

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
              {meeting.userAttendance?.status === 'Excused' ? (
                <div className={styles.successBadge} style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' }}>
                  ✓ Excused ({meeting.userAttendance?.excuseReason})
                </div>
              ) : (
                <div className={styles.successBadge}>
                  ✓ Attended {meeting.userAttendance?.attendanceType === 'online' ? 'Online' : 'Physically'}
                </div>
              )}
              {meeting.userAttendance?.status !== 'Excused' && (meeting.format === 'Online' || meeting.format === 'Hybrid') && meeting.meetingUrl && (
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

        {/* Excuse trigger button */}
        {!isCheckedIn && !hasEnded && !showExcuseForm && (
          <button 
            className={styles.excuseBtn}
            onClick={(e) => {
              e.stopPropagation();
              setShowExcuseForm(true);
            }}
          >
            <AlertCircle size={14} />
            Cannot Attend? Lodge Excuse
          </button>
        )}

        {/* Excuse Form */}
        {showExcuseForm && (
          <div className={styles.excuseForm} onClick={(e) => e.stopPropagation()}>
            <span className={styles.formLabel}>Reason for Absence</span>
            <select 
              value={excuseReason} 
              onChange={(e) => setExcuseReason(e.target.value)}
              className={styles.formSelect}
            >
              <option value="Work">Work Conflict</option>
              <option value="Health">Health / Sick</option>
              <option value="Travel">Out of Town / Travel</option>
              <option value="Family">Family / Personal Emergency</option>
              <option value="Other">Other</option>
            </select>
            
            <span className={styles.formLabel}>Optional Details</span>
            <textarea 
              placeholder="Provide brief context for leaders..."
              value={excuseDetail}
              onChange={(e) => setExcuseDetail(e.target.value)}
              className={styles.formTextarea}
            />

            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <button 
                onClick={handleExcuseSubmit}
                disabled={isSubmittingExcuse}
                className={styles.primaryBtn}
                style={{ background: '#ef4444', color: 'white', padding: '8px 12px', fontSize: '0.8125rem' }}
              >
                {isSubmittingExcuse ? 'Submitting...' : 'Submit Excuse'}
              </button>
              <button 
                onClick={() => setShowExcuseForm(false)}
                className={styles.secondaryBtn}
                style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Rating Feedback Widget */}
        {showRatingWidget && (
          <div className={styles.ratingBox} onClick={(e) => e.stopPropagation()}>
            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Rate this alignment meeting
            </span>
            <div className={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Star 
                  key={s}
                  size={20}
                  className={styles.starIcon}
                  fill={s <= (hoverRating || rating) ? '#f59e0b' : 'none'}
                  stroke={s <= (hoverRating || rating) ? '#f59e0b' : 'var(--text-secondary)'}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(s)}
                />
              ))}
            </div>
            
            <textarea 
              placeholder="Optional wellness/meeting feedback..."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className={styles.formTextarea}
              style={{ width: '100%' }}
            />

            <button 
              onClick={handleFeedbackSubmit}
              disabled={isSubmittingFeedback || rating === 0}
              className={styles.primaryBtn}
              style={{ padding: '8px 16px', fontSize: '0.8125rem', width: '100%', justifyContent: 'center' }}
            >
              {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        )}

        {/* Feedback Success State */}
        {feedbackSubmitted && (
          <div style={{ fontSize: '0.8125rem', color: '#10b981', textAlign: 'center', marginTop: '0.5rem', fontWeight: 600 }}>
            ✓ Thank you for your feedback!
          </div>
        )}
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
