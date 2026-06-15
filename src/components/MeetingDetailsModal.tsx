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
  UserCheck,
  Star,
  Share2,
  Trash2,
  Edit,
  Save,
  Undo,
  Copy
} from 'lucide-react';
import { format } from 'date-fns';
import styles from './MeetingDetailsModal.module.css';

interface MeetingDetailsModalProps {
  meetingId: any;
  onClose: () => void;
  onDuplicate?: () => void;
}

export const MeetingDetailsModal: React.FC<MeetingDetailsModalProps> = ({ meetingId, onClose, onDuplicate }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'roster' | 'feedback'>('details');
  const [showQrBroadcaster, setShowQrBroadcaster] = useState(false);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editFormat, setEditFormat] = useState<'Physical' | 'Online' | 'Hybrid'>('Physical');
  const [editPlatform, setEditPlatform] = useState<'Teams' | 'Zoom' | 'Meet' | 'Custom'>('Teams');
  const [editUrl, setEditUrl] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editEndTime, setEditEndTime] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
  const updateMeeting = useMutation(api.meetings.updateMeeting);
  const deleteMeeting = useMutation(api.meetings.deleteMeeting);

  const isLeader = useMemo(() => {
    if (!me) return false;
    return ['SuperAdmin', 'DeaconHead', 'PastoralOversight', 'DepartmentHead', 'SubunitLead'].includes(me.role || '');
  }, [me]);

  const canModify = useMemo(() => {
    if (!me || !meeting) return false;
    if (meeting.createdBy === me._id || me.role === 'SuperAdmin' || me.role === 'DeaconHead') return true;
    
    if (meeting.scope === 'Departmental') {
      return ['DepartmentHead', 'DepartmentAssistant', 'DepartmentSecretary', 'PastoralOversight'].includes(me.role || '') && me.departmentId === meeting.departmentId;
    }
    if (meeting.scope === 'Subunit') {
      return (
        (['SubunitLead', 'SubunitAssistant'].includes(me.role || '') && me.subunitId === meeting.subunitId) ||
        (['DepartmentHead', 'PastoralOversight'].includes(me.role || '') && me.departmentId === meeting.departmentId)
      );
    }
    return false;
  }, [me, meeting]);

  const now = Date.now();
  const isActive = useMemo(() => {
    if (!meeting) return false;
    return now >= meeting.startTime - 15 * 60 * 1000 && now <= meeting.endTime + 30 * 60 * 1000;
  }, [meeting, now]);

  // Decoupled Background Check-in
  const handleJoinClick = () => {
    if (!meeting || !isActive || meeting.userAttendance) return;
    
    checkIn({
      meetingId: meeting._id as any,
      attendanceType: 'online',
    }).catch((err) => {
      console.warn("Background check-in failed:", err);
    });
  };

  const handleCopyInvite = () => {
    if (!meeting) return;
    const formatDate = format(meeting.startTime, 'EEEE, MMM d');
    const formatTime = `${format(meeting.startTime, 'p')} - ${format(meeting.endTime, 'p')}`;
    const inviteText = `📅 *Gathering Invite*: *${meeting.name}*\n⏰ Date: ${formatDate}\n⏰ Time: ${formatTime}\n📍 Format: *${meeting.format}* ${meeting.locationName ? `(${meeting.locationName})` : ''}\n\n👉 Tap here to check-in and join the gathering:\nhttps://servesync-pi.vercel.app/meetings?id=${meeting._id}`;
    
    navigator.clipboard.writeText(inviteText)
      .then(() => {
        alert("Shareable invite copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy invite:", err);
      });
  };

  const startEditing = () => {
    if (!meeting) return;
    setEditName(meeting.name);
    setEditDescription(meeting.description || '');
    setEditFormat(meeting.format);
    setEditPlatform(meeting.platform);
    setEditUrl(meeting.meetingUrl || '');
    setEditLocation(meeting.locationName || '');
    
    const timezoneOffset = new Date().getTimezoneOffset() * 60000;
    const localStart = new Date(meeting.startTime - timezoneOffset).toISOString().slice(0, 16);
    const localEnd = new Date(meeting.endTime - timezoneOffset).toISOString().slice(0, 16);
    setEditStartTime(localStart);
    setEditEndTime(localEnd);
    
    setIsEditing(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEdit(true);
    try {
      await updateMeeting({
        meetingId,
        name: editName,
        description: editDescription || undefined,
        startTime: new Date(editStartTime).getTime(),
        endTime: new Date(editEndTime).getTime(),
        format: editFormat,
        platform: editPlatform,
        meetingUrl: editUrl || undefined,
        locationName: editLocation || undefined,
      });
      setIsEditing(false);
      alert("Gathering details updated successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to update gathering details");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this gathering? This will delete all attendance records and cannot be undone.")) {
      try {
        await deleteMeeting({ meetingId });
        onClose();
        alert("Gathering deleted successfully.");
      } catch (err: any) {
        alert(err.message || "Failed to delete gathering");
      }
    }
  };

  // Filter candidates for manual check-in based on meeting scope
  const manualCandidates = useMemo(() => {
    if (!churchUsers || !meeting) return [];
    
    return churchUsers.filter((u) => {
      const alreadyCheckedIn = attendanceList?.some((att) => att.userId === u._id);
      if (alreadyCheckedIn) return false;

      if (meeting.scope === 'Departmental') {
        return u.departmentId === meeting.departmentId;
      }
      if (meeting.scope === 'Subunit') {
        return u.subunitId === meeting.subunitId;
      }
      return true;
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

  const getPlatformColors = (platform: string, url?: string) => {
    if (platform === 'Custom' && url) {
      const lower = url.toLowerCase();
      if (lower.includes('whatsapp.com')) {
        return { text: '#25d366', name: 'WhatsApp Call' };
      }
      if (lower.includes('discord.gg') || lower.includes('discord.com')) {
        return { text: '#5865f2', name: 'Discord Room' };
      }
      if (lower.includes('slack.com')) {
        return { text: '#4a154b', name: 'Slack Huddle' };
      }
      if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
        return { text: '#ff0000', name: 'YouTube Live' };
      }
      if (lower.includes('facebook.com')) {
        return { text: '#1877f2', name: 'Facebook Live' };
      }
      return { text: 'var(--text-secondary)', name: 'External Link' };
    }

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

  const platformInfo = getPlatformColors(meeting.platform, meeting.meetingUrl);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <header className={styles.modalHeader}>
          <div className={styles.titleInfo}>
            <h2>{isEditing ? `Edit: ${meeting.name}` : meeting.name}</h2>
            <p>{meeting.format} • Scope: {meeting.scope}</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!isEditing && (
              <button 
                onClick={handleCopyInvite} 
                className={styles.closeBtn} 
                title="Copy Invite Text"
                style={{ padding: '8px', display: 'flex', color: 'var(--text-secondary)' }}
              >
                <Share2 size={18} />
              </button>
            )}
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Roster Tabs for Leaders */}
        {isLeader && !isEditing && (
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
            {attendanceList?.some(a => a.wellnessRating !== undefined) && (
              <button 
                className={`${styles.tab} ${activeTab === 'feedback' ? styles.active : ''}`}
                onClick={() => setActiveTab('feedback')}
              >
                Feedback & Ratings
              </button>
            )}
          </nav>
        )}

        {/* Content */}
        <div className={styles.modalContent}>
          {isEditing ? (
            /* Inline Edit Form */
            <form onSubmit={handleEditSubmit} className={styles.form} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className={styles.label}>Gathering Name</span>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={styles.select}
                  style={{ width: '100%', background: 'var(--bg-secondary)' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span className={styles.label}>Description & Agenda</span>
                <textarea 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className={styles.select}
                  style={{ width: '100%', background: 'var(--bg-secondary)', minHeight: '60px', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className={styles.label}>Format</span>
                  <select 
                    value={editFormat}
                    onChange={(e) => setEditFormat(e.target.value as any)}
                    className={styles.select}
                    style={{ background: 'var(--bg-secondary)' }}
                  >
                    <option value="Physical">Physical</option>
                    <option value="Online">Online</option>
                    <option value="Hybrid">Hybrid</option>
                  </select>
                </div>

                {(editFormat === 'Online' || editFormat === 'Hybrid') && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className={styles.label}>Platform</span>
                    <select 
                      value={editPlatform}
                      onChange={(e) => setEditPlatform(e.target.value as any)}
                      className={styles.select}
                      style={{ background: 'var(--bg-secondary)' }}
                    >
                      <option value="Teams">MS Teams</option>
                      <option value="Zoom">Zoom</option>
                      <option value="Meet">Google Meet</option>
                      <option value="Custom">Custom Link</option>
                    </select>
                  </div>
                )}
              </div>

              {(editFormat === 'Online' || editFormat === 'Hybrid') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className={styles.label}>Meeting Room Link</span>
                  <input 
                    type="url" 
                    value={editUrl}
                    onChange={(e) => setEditUrl(e.target.value)}
                    placeholder="https://..."
                    className={styles.select}
                    style={{ width: '100%', background: 'var(--bg-secondary)' }}
                    required
                  />
                </div>
              )}

              {(editFormat === 'Physical' || editFormat === 'Hybrid') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className={styles.label}>Physical Location Name</span>
                  <input 
                    type="text" 
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. Main Sanctuary"
                    className={styles.select}
                    style={{ width: '100%', background: 'var(--bg-secondary)' }}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className={styles.label}>Start Time</span>
                  <input 
                    type="datetime-local" 
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    className={styles.select}
                    style={{ background: 'var(--bg-secondary)' }}
                    required
                  />
                </div>

                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span className={styles.label}>End Time</span>
                  <input 
                    type="datetime-local" 
                    value={editEndTime}
                    onChange={(e) => setEditEndTime(e.target.value)}
                    className={styles.select}
                    style={{ background: 'var(--bg-secondary)' }}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsEditing(false)}
                  className={styles.broadcastBtn}
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
                >
                  <Undo size={16} /> Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSavingEdit}
                  className={styles.submitBtn}
                >
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </form>
          ) : activeTab === 'details' ? (
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
                <div className={styles.attendanceStatus} style={meeting.userAttendance.status === 'Excused' ? { background: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' } : {}}>
                  <CheckCircle2 size={18} />
                  {meeting.userAttendance.status === 'Excused' ? (
                    <span>
                      Your attendance is marked as Excused: {meeting.userAttendance.excuseReason} {meeting.userAttendance.excuseDetail ? `("${meeting.userAttendance.excuseDetail}")` : ""}
                    </span>
                  ) : (
                    <span>
                      Your attendance is verified: {meeting.userAttendance.status} ({meeting.userAttendance.attendanceType === 'online' ? 'Online' : 'Physically'} at {format(meeting.userAttendance.timestamp, 'p')})
                    </span>
                  )}
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

                {/* Leader Moderation overrides (Edit / Delete) */}
                {canModify && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '0.5rem', width: '100%' }}>
                    <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                      <button 
                        onClick={startEditing}
                        className={styles.broadcastBtn}
                        style={{ flex: 1, background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', border: '1px solid rgba(139, 92, 246, 0.2)' }}
                      >
                        <Edit size={16} /> Edit Details
                      </button>
                      <button 
                        onClick={handleDelete}
                        className={styles.broadcastBtn}
                        style={{ flex: 1, background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                      >
                        <Trash2 size={16} /> Delete Gathering
                      </button>
                    </div>
                    {onDuplicate && (
                      <button 
                        onClick={() => {
                          onDuplicate();
                          onClose();
                        }}
                        className={styles.broadcastBtn}
                        style={{ width: '100%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                      >
                        <Copy size={16} /> Duplicate Gathering (Template)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : activeTab === 'roster' ? (
            /* Attendance Roster Tab (Leaders only) */
            <div className={styles.rosterSection}>
              <h4 className={styles.label} style={{ marginBottom: '0.25rem' }}>Attended Members</h4>
              <div className={styles.rosterList}>
                {attendanceList?.map((log: any) => (
                  <div key={log._id} className={styles.rosterItem} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '0.5rem', padding: '0.875rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className={styles.userMeta}>
                        <div className={styles.avatar}>
                          {log.user?.name?.[0] || 'U'}
                        </div>
                        <div>
                          <span className={styles.userName}>{log.user?.name}</span>
                          <p className={styles.userSub}>
                            {log.user?.role} • {log.method} • {log.attendanceType === 'online' ? 'Online' : 'Physical'}
                          </p>
                        </div>
                      </div>
                      <div className={styles.checkinMeta}>
                        <span className={styles.checkinTime}>{format(log.timestamp, 'p')}</span>
                        <span className={`${styles.statusBadge} ${styles[log.status.toLowerCase()]}`}>
                          {log.status}
                        </span>
                      </div>
                    </div>
                    {log.status === 'Excused' && log.excuseReason && (
                      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        <strong>Excuse ({log.excuseReason}):</strong> {log.excuseDetail || 'No additional note provided'}
                      </div>
                    )}
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
          ) : (
            /* Wellness Feedback Tab (Leaders only) */
            <div className={styles.rosterSection}>
              <h4 className={styles.label} style={{ marginBottom: '0.5rem' }}>Volunteer Feedback & Meeting Quality</h4>
              <div className={styles.rosterList}>
                {attendanceList?.filter(a => a.wellnessRating !== undefined).map((log: any) => (
                  <div key={log._id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className={styles.userMeta}>
                        <div className={styles.avatar}>
                          {log.user?.name?.[0] || 'U'}
                        </div>
                        <div>
                          <span className={styles.userName}>{log.user?.name}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>{log.user?.role}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', color: '#f59e0b', fontWeight: 700, alignItems: 'center' }}>
                        <Star size={16} fill="#f59e0b" />
                        <span>{log.wellnessRating} / 5</span>
                      </div>
                    </div>
                    {log.wellnessFeedback && (
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-primary)', fontStyle: 'italic', margin: 0, paddingLeft: '2.5rem' }}>
                        "{log.wellnessFeedback}"
                      </p>
                    )}
                  </div>
                ))}
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
