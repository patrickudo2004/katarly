import React, { useState, useMemo } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import QRCode from 'react-qr-code';
import { 
  X, 
  MapPin, 
  Clock, 
  Calendar, 
  Laptop, 
  Loader2, 
  CheckCircle2, 
  Users, 
  QrCode as QrCodeIcon, 
  ExternalLink,
  UserCheck,
  Share2,
  Trash2,
  Edit,
  Copy,
  Printer
} from 'lucide-react';
import { format } from 'date-fns';
import styles from './ServiceDetailsModal.module.css';

interface ServiceDetailsModalProps {
  serviceId: any;
  onClose: () => void;
  onDuplicate?: () => void;
  onEdit?: () => void;
}

export const ServiceDetailsModal: React.FC<ServiceDetailsModalProps> = ({ 
  serviceId, 
  onClose, 
  onDuplicate, 
  onEdit 
}) => {
  const [activeTab, setActiveTab] = useState<'details' | 'roster'>('details');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  // Form state for manual check-in
  const [selectedUserId, setSelectedUserId] = useState('');
  const [manualStatus, setManualStatus] = useState<'Present' | 'Late' | 'Excused'>('Present');

  // Queries
  const me = useQuery(api.users.me);
  const service = useQuery(api.services.getServiceDetails, { serviceId });
  const church = useQuery(api.churches.getMyChurch);
  const churchUsers = useQuery(api.users.getAllChurchUsers, {});

  // Mutations
  const manualMark = useMutation(api.attendance.manualMark);
  const deleteService = useMutation(api.services.deleteService);

  const isLeader = useMemo(() => {
    if (!me) return false;
    return ['SuperAdmin', 'DeaconHead', 'PastoralOversight'].includes(me.role || '');
  }, [me]);

  const now = Date.now();
  const isActive = useMemo(() => {
    if (!service) return false;
    // active 1 hour before start to 1 hour after end
    return now >= service.startTime - 60 * 60 * 1000 && now <= service.endTime + 60 * 60 * 1000;
  }, [service, now]);

  const handleCopyInvite = () => {
    if (!service) return;
    const formatDate = format(service.startTime, 'EEEE, MMM d');
    const formatTime = `${format(service.startTime, 'p')} - ${format(service.endTime, 'p')}`;
    const inviteText = `📅 *Service Gathering Invite*: *${service.name}*\n⏰ Date: ${formatDate}\n⏰ Time: ${formatTime}\n📍 Format: *${service.format || 'Physical'}* ${service.locationName ? `(${service.locationName})` : ''}\n\n👉 View shifts and sign up here:\nhttps://servesync-pi.vercel.app/service-management?id=${service._id}`;
    
    navigator.clipboard.writeText(inviteText)
      .then(() => {
        alert("Shareable invite copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy invite:", err);
      });
  };

  const handlePrintPass = () => {
    if (!service || !church) return;
    const dateStr = format(new Date(service.startTime), 'yyyy-MM-dd');
    const printUrl = `/print/attendance/${church._id}?secret=${church.settings?.qrCodeSecret || ''}&date=${dateStr}`;
    window.open(printUrl, '_blank');
  };

  const handleDeleteClick = async () => {
    if (!service) return;
    if (window.confirm("Are you sure you want to delete this service? This will delete all rotas, swaps, and attendance records associated with it. This action cannot be undone.")) {
      try {
        await deleteService({ id: serviceId });
        onClose();
        alert("Service deleted successfully.");
      } catch (err: any) {
        alert(err.message || "Failed to delete service.");
      }
    }
  };

  const getPlatformStyles = (platform: string, url?: string) => {
    if (platform === 'Custom' && url) {
      const lower = url.toLowerCase();
      if (lower.includes('whatsapp.com')) {
        return { backgroundColor: 'rgba(37, 211, 102, 0.1)', color: '#25d366', borderColor: 'rgba(37, 211, 102, 0.2)' };
      }
      if (lower.includes('discord.gg') || lower.includes('discord.com')) {
        return { backgroundColor: 'rgba(88, 101, 242, 0.1)', color: '#5865f2', borderColor: 'rgba(88, 101, 242, 0.2)' };
      }
      if (lower.includes('slack.com')) {
        return { backgroundColor: 'rgba(74, 21, 75, 0.1)', color: '#4a154b', borderColor: 'rgba(74, 21, 75, 0.2)' };
      }
      if (lower.includes('youtube.com') || lower.includes('youtu.be')) {
        return { backgroundColor: 'rgba(255, 0, 0, 0.1)', color: '#ff0000', borderColor: 'rgba(255, 0, 0, 0.2)' };
      }
      if (lower.includes('facebook.com')) {
        return { backgroundColor: 'rgba(24, 119, 242, 0.1)', color: '#1877f2', borderColor: 'rgba(24, 119, 242, 0.2)' };
      }
    }
    switch (platform) {
      case 'Teams': return { backgroundColor: 'rgba(98, 100, 167, 0.1)', color: '#6264a7', borderColor: 'rgba(98, 100, 167, 0.2)' };
      case 'Zoom': return { backgroundColor: 'rgba(45, 140, 255, 0.1)', color: '#2d8cff', borderColor: 'rgba(45, 140, 255, 0.2)' };
      case 'Meet': return { backgroundColor: 'rgba(15, 157, 88, 0.1)', color: '#0f9d58', borderColor: 'rgba(15, 157, 88, 0.2)' };
      default: return { backgroundColor: 'rgba(107, 114, 128, 0.1)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)' };
    }
  };

  const getPlatformName = (platform: string, url?: string) => {
    if (platform === 'Custom' && url) {
      const lower = url.toLowerCase();
      if (lower.includes('whatsapp.com')) return 'WhatsApp';
      if (lower.includes('discord.gg') || lower.includes('discord.com')) return 'Discord';
      if (lower.includes('slack.com')) return 'Slack';
      if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YouTube Live';
      if (lower.includes('facebook.com')) return 'Facebook Live';
      return 'External Link';
    }
    switch (platform) {
      case 'Teams': return 'MS Teams';
      case 'Zoom': return 'Zoom';
      case 'Meet': return 'Google Meet';
      default: return 'Virtual Link';
    }
  };

  const manualCandidates = useMemo(() => {
    if (!churchUsers || !service) return [];
    // Filter to volunteers in the church
    return churchUsers.filter(u => u.role !== 'SuperAdmin');
  }, [churchUsers, service]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId || !service || !me) return;

    setIsSubmittingManual(true);
    try {
      await manualMark({
        serviceId: service._id,
        userId: selectedUserId as any,
        status: manualStatus,
        markedById: me._id,
      });
      setSelectedUserId('');
      alert("Attendance marked successfully.");
    } catch (err: any) {
      alert(err.message || "Failed to mark attendance.");
    } finally {
      setIsSubmittingManual(false);
    }
  };

  if (!service) {
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modal} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem' }}>
          <Loader2 className="animate-spin text-purple-600" size={32} />
        </div>
      </div>
    );
  }

  const qrValue = `SERVICE:${service._id}:${service.qrCodeSecret}`;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleContainer}>
            <h2>{service.name}</h2>
            <div className={styles.badgeRow}>
              <span className={`${styles.formatBadge} ${styles[service.format || 'Physical']}`}>
                {service.format || 'Physical'}
              </span>
              {(service.format === 'Online' || service.format === 'Hybrid') && service.meetingUrl && (
                <span 
                  className={styles.platformBadge} 
                  style={getPlatformStyles(service.platform || 'Custom', service.meetingUrl)}
                >
                  <Laptop size={12} style={{ marginRight: '4px' }} />
                  {getPlatformName(service.platform || 'Custom', service.meetingUrl)}
                </span>
              )}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={20} /></button>
        </div>

        {/* Tab Controls */}
        <div className={styles.tabBar}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'details' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('details')}
          >
            <Calendar size={16} /> Details
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'roster' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('roster')}
          >
            <Users size={16} /> Rota & Shift Roster ({service.rotas?.length || 0})
          </button>
        </div>

        {/* Modal Scroll Content */}
        <div className={styles.modalContent}>
          {activeTab === 'details' && (
            <div className={styles.detailsTab}>
              <div className={styles.metaSection}>
                <div className={styles.metaItem}>
                  <Clock className={styles.metaIcon} size={18} />
                  <div>
                    <strong>Date & Time</strong>
                    <p>
                      {format(new Date(service.startTime), 'EEEE, MMMM d, yyyy')}
                      <br />
                      {format(new Date(service.startTime), 'p')} - {format(new Date(service.endTime), 'p')}
                    </p>
                  </div>
                </div>

                {service.locationName && (
                  <div className={styles.metaItem}>
                    <MapPin className={styles.metaIcon} size={18} />
                    <div>
                      <strong>Location</strong>
                      <p>{service.locationName}</p>
                    </div>
                  </div>
                )}

                {(service.format === 'Online' || service.format === 'Hybrid') && service.meetingUrl && (
                  <div className={styles.metaItem}>
                    <Laptop className={styles.metaIcon} size={18} />
                    <div>
                      <strong>Virtual Access Room</strong>
                      <p className={styles.urlText}>{service.meetingUrl}</p>
                      <a 
                        href={service.meetingUrl} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={styles.joinStreamBtn}
                      >
                        <ExternalLink size={16} style={{ marginRight: '6px' }} /> Launch Live Stream
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {/* QR Code Ticket Viewer */}
              {service.format !== 'Online' && (
                <div className={styles.qrSection}>
                  <div className={styles.qrCard}>
                    <div style={{ background: '#fff', padding: '12px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)', flexShrink: 0 }}>
                      <QRCode value={qrValue} size={110} level="H" />
                    </div>
                    <div className={styles.qrDetails}>
                      <h3>Check-In Security Pass</h3>
                      <p>Scan this QR code to confirm attendance. Uses <strong>{service.qrType || 'Unique'}</strong> security.</p>
                      <div className={styles.qrCodeValueBox}>
                        <code>{qrValue}</code>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className={styles.actionContainer}>
                <button className={styles.utilityBtn} onClick={handleCopyInvite}>
                  <Share2 size={16} /> Copy Invite
                </button>
                {service.format !== 'Online' && (
                  <button className={styles.utilityBtn} onClick={handlePrintPass}>
                    <Printer size={16} /> Print Pass
                  </button>
                )}
                {isLeader && onDuplicate && (
                  <button className={styles.utilityBtn} onClick={() => { onDuplicate(); onClose(); }}>
                    <Copy size={16} /> Duplicate (+7d)
                  </button>
                )}
              </div>
            </div>
          )}

          {activeTab === 'roster' && (
            <div className={styles.rosterTab}>
              <div className={styles.rosterSection}>
                <h3>Scheduled Shift Roles</h3>
                {service.rotas && service.rotas.length > 0 ? (
                  <div className={styles.rosterGrid}>
                    {service.rotas.map((role: any) => (
                      <div key={role._id} className={styles.rosterCard}>
                        <div className={styles.rosterHeader}>
                          <span className={styles.roleName}>{role.role}</span>
                          {role.roleFormat && (
                            <span className={`${styles.roleFormatBadge} ${styles[role.roleFormat]}`}>
                              {role.roleFormat}
                            </span>
                          )}
                        </div>
                        <div className={styles.rosterVolunteer}>
                          {role.userName ? (
                            <div className={styles.volunteerInfo}>
                              {role.userImage ? (
                                <img src={role.userImage} alt={role.userName} className={styles.avatar} />
                              ) : (
                                <div className={styles.avatarPlaceholder}>
                                  {role.userName.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div>
                                <span className={styles.volunteerName}>{role.userName}</span>
                                <span className={`${styles.statusLabel} ${styles[role.status]}`}>
                                  {role.status}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className={styles.unassigned}>Open Shift (No steward scheduled)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptyRoster}>
                    <Users size={32} />
                    <p>No rota roles scheduled for this service.</p>
                  </div>
                )}
              </div>

              {/* Manual Attendance Check-in Form for Leaders */}
              {isLeader && (
                <div className={styles.manualMarkSection}>
                  <h3>Manual Attendance Override</h3>
                  <form onSubmit={handleManualSubmit} className={styles.manualForm}>
                    <div className={styles.manualField}>
                      <select 
                        value={selectedUserId} 
                        onChange={(e) => setSelectedUserId(e.target.value)}
                        required
                      >
                        <option value="">-- Select Volunteer to Check In --</option>
                        {manualCandidates.map(u => (
                          <option key={u._id} value={u._id}>
                            {u.name || u.email} ({u.role || 'Volunteer'})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.manualActions}>
                      <select 
                        value={manualStatus} 
                        onChange={(e) => setManualStatus(e.target.value as any)}
                      >
                        <option value="Present">Present</option>
                        <option value="Late">Late</option>
                        <option value="Excused">Excused</option>
                      </select>
                      <button 
                        type="submit" 
                        className={styles.manualSubmitBtn}
                        disabled={isSubmittingManual || !selectedUserId}
                      >
                        {isSubmittingManual ? <Loader2 className="animate-spin" size={16} /> : <UserCheck size={16} />} Mark Present
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Admin controls at the very bottom */}
        {isLeader && (
          <div className={styles.adminFooter}>
            {onEdit && (
              <button className={styles.editBtn} onClick={() => { onEdit(); onClose(); }}>
                <Edit size={16} style={{ marginRight: '6px' }} /> Edit Service
              </button>
            )}
            <button className={styles.deleteBtn} onClick={handleDeleteClick}>
              <Trash2 size={16} style={{ marginRight: '6px' }} /> Delete Service
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
