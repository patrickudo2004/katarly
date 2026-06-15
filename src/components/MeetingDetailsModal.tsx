import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { 
  X, 
  Video, 
  MapPin, 
  Clock, 
  Calendar, 
  Laptop, 
  Loader2, 
  CheckCircle2, 
  Users, 
  QrCode, 
  ExternalLink,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { format } from 'date-fns';
import styles from './MeetingDetailsModal.module.css';

interface MeetingDetailsModalProps {
  meetingId: any;
  onClose: () => void;
}

export const MeetingDetailsModal: React.FC<MeetingDetailsModalProps> = ({ meetingId, onClose }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'roster'>('details');
  const [showQrBroadcaster, setShowQrBroadcaster] = useState(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Form state for manual check-in
  const [selectedUserId, setSelectedUserId] = useState('');
  const [manualStatus, setManualStatus] = useState<'Present' | 'Late' | 'Excused'>('Present');
  const [manualType, setManualType] = useState<'physical' | 'online'>('physical');

  // Queries
  const me = useQuery(api.users.me);
  const meeting = useQuery(api.meetings.getMeetingDetails, { meetingId });
  const attendanceList = useQuery(api.meetings.getMeetingAttendance, { meetingId });
  const churchUsers = useQuery(api.users.getAllChurchUsers, {});

  // Mutations
  const checkIn = useMutation(api.meetings.checkInToMeeting);
  const checkInManually = useMutation(api.meetings.checkInUserManually);

  const isLeader = useMemo(() => {
    if (!me) return false;
    return ['SuperAdmin', 'DeaconHead', 'PastoralOversight', 'DepartmentHead', 'SubunitLead'].includes(me.role || '');
  }, [me]);

  const now = Date.now();
  const isActive = useMemo(() => {
    if (!meeting) return false;
    return now >= meeting.startTime - 15 * 60 * 1000 && now <= meeting.endTime + 30 * 60 * 1000;
  }, [meeting, now]);

  // Decoupled Background Check-in
  const handleJoinClick = () => {
    if (!meeting || !isActive || meeting.userAttendance) return;
    
    // Fire and forget: mutation runs in the background. Natively opens URL immediately!
    checkIn({
      meetingId: meeting._id as any,
      attendanceType: 'online',
    }).catch((err) => {
      console.warn("Background check-in failed:", err);
    });
  };

  // Filter candidates for manual check-in based on meeting scope
  const manualCandidates = useMemo(() => {
    if (!churchUsers || !meeting) return [];
    
    return churchUsers.filter((u) => {
      // Don't show users who have already checked in
      const alreadyCheckedIn = attendanceList?.some((att) => att.userId === u._id);
      if (alreadyCheckedIn) return false;

      // Scoping
      if (meeting.scope === 'Departmental') {
        return u.departmentId === meeting.departmentId;
      }
      if (meeting.scope === 'Subunit') {
        return u.subunitId === meeting.subunitId;
      }
      return true; // ChurchWide
    });
  }, [churchUsers, meeting, attendanceList]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !meeting) return;

    setIsSubmittingManual(true);
    try {
      await checkInManually({
        meetingId: meeting._id as any,
        targetUserId: selectedUserId as any,
        status: manualStatus,
        attendanceType: manualType,
      });
      setSelectedUserId('');
      setManualStatus('Present');
      alert('Manual check-in completed successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to complete manual check-in');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const getPlatformColors = (platform: string) => {
    switch (platform) {
      case 'Teams':
        return { text: '#6264a7', name: 'Microsoft Teams' };
      case 'Zoom':
        return { text: '#2d8cff', name: 'Zoom Call' };
      case 'Meet':
        return { text: '#0f9d58', name: 'Google Meet' };
      default:
        return { text: 'var(--accent)', name: 'Virtual Link' };
    }
  };

  if (!meeting || !me) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalContent} style={{ justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
            <Loader2 className="animate-spin text-purple-600" size={32} />
            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading meeting details...</p>
          </div>
        </div>
      </div>
    );
  }

  const platformInfo = getPlatformColors(meeting.platform);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <header className={styles.modalHeader}>
          <div className={styles.titleInfo}>
            <h2>{meeting.name}</h2>
            <p>{meeting.format} • Scope: {meeting.scope}</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </header>

        {/* Roster Tabs for Leaders */}
        {isLeader && (
          <nav className={styles.tabs}>
            <button 
              className={`${styles.tab} ${activeTab === 'details' ? styles.active : ''}`}
              onClick={() => setActiveTab('details')}
            >
              General Info
            </button>
            <button 
              className={`${styles.tab} ${activeTab === 'roster' ? styles.active : ''}`}
              onClick={() => setActiveTab('roster')}
            >
              Attendee Roster ({attendanceList?.length || 0})
            </button>
          </nav>
        )}

        {/* Content */}
        <div className={styles.modalContent}>
          {activeTab === 'details' ? (
            <>
              {/* Meeting Info Grid */}
              <div className={styles.detailsGrid}>
                <div className={styles.detailBlock}>
                  <span className={styles.label}>Schedule & Time</span>
                  <span className={styles.value}>
                    <Clock size={16} />
                    {format(meeting.startTime, 'p')} - {format(meeting.endTime, 'p')}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '1.5rem' }}>
                    {format(meeting.startTime, 'EEEE, MMMM dd, yyyy')}
                  </span>
                </div>

                {meeting.locationName && (meeting.format === 'Physical' || meeting.format === 'Hybrid') && (
                  <div className={styles.detailBlock}>
                    <span className={styles.label}>Venue Location</span>
                    <span className={styles.value}>
                      <MapPin size={16} />
                      {meeting.locationName}
                    </span>
                  </div>
                )}

                {meeting.meetingUrl && (meeting.format === 'Online' || meeting.format === 'Hybrid') && (
                  <div className={styles.detailBlock}>
                    <span className={styles.label}>Virtual platform</span>
                    <span className={styles.value} style={{ color: platformInfo.text }}>
                      <Laptop size={16} />
                      {platformInfo.name}
                    </span>
                  </div>
                )}
              </div>

              {/* Description */}
              {meeting.description && (
                <div className={styles.detailBlock}>
                  <span className={styles.label}>Description & Agenda</span>
                  <p className={styles.descriptionBox}>{meeting.description}</p>
                </div>
              )}

              {/* Attendance Status Confirmation */}
              {meeting.userAttendance && (
                <div className={styles.attendanceStatus}>
                  <CheckCircle2 size={18} />
                  <span>
                    Your attendance is verified: {meeting.userAttendance.status} ({meeting.userAttendance.attendanceType === 'online' ? 'Online' : 'Physically'} at {format(meeting.userAttendance.timestamp, 'p')})
                  </span>
                </div>
              )}

              {/* Action Buttons (Separated Join Call from Check-In Mutation) */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                
                {/* Standard anchor tag prevents popup blocker */}
                {meeting.meetingUrl && (meeting.format === 'Online' || meeting.format === 'Hybrid') && (
                  <a 
                    href={meeting.meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleJoinClick}
                    className={styles.joinLink}
                    style={{ backgroundColor: platformInfo.text }}
                  >
                    <Video size={18} />
                    {meeting.userAttendance ? 'Rejoin Virtual Call' : isActive ? 'Join & Check-In Online' : 'Open Virtual Link (Lobby)'}
                    <ExternalLink size={14} style={{ marginLeft: '4px' }} />
                  </a>
                )}

                {/* Broadcast QR code for Physical check-ins (Leaders only) */}
                {isLeader && meeting.qrCodeSecret && (meeting.format === 'Physical' || meeting.format === 'Hybrid') && (
                  <button 
                    onClick={() => setShowQrBroadcaster(true)}
                    className={styles.broadcastBtn}
                  >
                    <QrCode size={18} />
                    Broadcast Check-In QR Code
                  </button>
                )}
              </div>
            </>
          ) : (
            /* Attendance Roster Tab (Leaders only) */
            <div className={styles.rosterSection}>
              <h4 className={styles.label} style={{ marginBottom: '0.25rem' }}>Attended Members</h4>
              <div className={styles.rosterList}>
                {attendanceList?.map((log: any) => (
                  <div key={log._id} className={styles.rosterItem}>
                    <div className={styles.userMeta}>
                      <div className={styles.avatar}>
                        {log.user?.name?.[0] || 'U'}
                      </div>
                      <div>
                        <span className={styles.userName}>{log.user?.name}</span>
                        <p className={styles.userSub}>{log.user?.role} • {log.method}</p>
                      </div>
                    </div>
                    <div className={styles.checkinMeta}>
                      <span className={styles.checkinTime}>{format(log.timestamp, 'p')}</span>
                      <span className={`${styles.statusBadge} ${styles[log.status.toLowerCase()]}`}>
                        {log.status}
                      </span>
                    </div>
                  </div>
                ))}
                {attendanceList?.length === 0 && (
                  <p className={styles.emptyText}>No attendance records verified for this gathering yet.</p>
                )}
              </div>

              {/* Manual Check-in Override Panel */}
              <div className={styles.manualCheckinBox}>
                <h4>Manual Attendance Override</h4>
                <form onSubmit={handleManualSubmit} className={styles.form}>
                  <div className={styles.formRow}>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className={styles.select}
                      required
                    >
                      <option value="">Select volunteer...</option>
                      {manualCandidates.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>

                    <select
                      value={manualStatus}
                      onChange={(e) => setManualStatus(e.target.value as any)}
                      className={styles.select}
                    >
                      <option value="Present">Present</option>
                      <option value="Late">Late</option>
                      <option value="Excused">Excused</option>
                    </select>

                    <select
                      value={manualType}
                      onChange={(e) => setManualType(e.target.value as any)}
                      className={styles.select}
                    >
                      <option value="physical">Physical</option>
                      <option value="online">Online</option>
                    </select>
                  </div>
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                    <button 
                      type="submit" 
                      disabled={isSubmittingManual || !selectedUserId}
                      className={styles.submitBtn}
                    >
                      Log Manual Check-In
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* QR Code Broadcast Sub-Modal */}
      {showQrBroadcaster && meeting.qrCodeSecret && (
        <div className={styles.qrOverlay} onClick={() => setShowQrBroadcaster(false)}>
          <div className={styles.qrModal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.qrTitle}>Gathering Check-In QR</h3>
            <p className={styles.qrSubtitle}>Project this screen at the venue door. Volunteers scan to register attendance.</p>
            
            <div className={styles.qrFrame}>
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(meeting.qrCodeSecret)}`} 
                alt="Check-in QR" 
                style={{ width: '250px', height: '250px' }}
              />
            </div>
            
            <button 
              onClick={() => setShowQrBroadcaster(false)} 
              className={styles.qrCloseBtn}
            >
              Close Broadcast
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
