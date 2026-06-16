import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { useNavigate } from 'react-router-dom';
import {
  Scale, AlertTriangle, BarChart2, MessageSquareLock,
  ChevronRight, Loader2, CheckCircle, Users, ClipboardList, UserPlus
} from 'lucide-react';
import { MeetingCard } from '../../components/MeetingCard';
import styles from './mobile.module.css';
import { MobileAssignShiftModal } from '../../components/MobileAssignShiftModal';

export const DeaconHeadHome: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'overview' | 'escalations' | 'board'>('overview');
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const dashboard = useQuery(api.deaconBoard.getDeaconDashboard);
  const boardMessages = useQuery(api.deaconBoard.getDeaconBoardMessages);
  const postAnnouncement = useMutation(api.deaconBoard.postBoardAnnouncement);

  const [newMessage, setNewMessage] = useState('');
  const [posting, setPosting] = useState(false);
  const meetings = useQuery(api.meetings.getMeetingsForUser);

  if (dashboard === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin" size={32} style={{ color: '#1e3a5f' }} />
      </div>
    );
  }

  const handlePost = async () => {
    if (!newMessage.trim()) return;
    setPosting(true);
    try {
      await postAnnouncement({ text: newMessage.trim() });
      setNewMessage('');
    } finally {
      setPosting(false);
    }
  };

  const stats = [
    { icon: Users, label: 'Total Volunteers', value: dashboard?.totalVolunteers ?? 0, color: '#1e3a5f' },
    { icon: BarChart2, label: 'Avg. Attendance', value: `${dashboard?.avgAttendance ?? 0}%`, color: '#15803d' },
    { icon: AlertTriangle, label: 'Active Probations', value: dashboard?.activeProbations ?? 0, color: '#f59e0b' },
    { icon: ClipboardList, label: 'Pending Escalations', value: dashboard?.pendingEscalations ?? 0, color: '#ef4444' },
  ];

  const now = Date.now();
  const activeMeetings = (meetings || []).filter((meeting: any) => 
    now >= meeting.startTime - 15 * 60 * 1000 && 
    now <= meeting.endTime + 30 * 60 * 1000
  );

  return (
    <div className={styles.page}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a8e 100%)',
        borderRadius: 20,
        padding: '1.5rem',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Scale size={24} color="white" />
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: '1.1rem', margin: 0 }}>Deacon Board</p>
          <p style={{ fontSize: '0.8rem', opacity: 0.75, margin: 0 }}>Governance Dashboard</p>
        </div>
      </div>

      {activeMeetings.length > 0 && (
        <section className={styles.section} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.5rem' }}>
          <h2 className={styles.sectionTitle}>Active Gatherings</h2>
          {activeMeetings.map((meeting: any) => (
            <MeetingCard key={meeting._id} meeting={meeting} />
          ))}
        </section>
      )}

      {/* Stat Grid */}
      <div className={styles.grid} style={{ gridTemplateColumns: '1fr 1fr' }}>
        {stats.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className={`${styles.card} ${styles.statCard}`}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `${color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 0.5rem',
            }}>
              <Icon size={18} color={color} />
            </div>
            <p className={styles.statValue} style={{ color }}>{value}</p>
            <p className={styles.statLabel}>{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', background: 'var(--bg-secondary)',
        padding: 4, borderRadius: 12, gap: 2,
      }}>
        {(['overview', 'escalations', 'board'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              flex: 1, padding: '8px 4px', border: 'none', borderRadius: 8,
              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              background: activeTab === tab ? 'var(--card-bg)' : 'transparent',
              color: activeTab === tab ? '#1e3a5f' : 'var(--text-secondary)',
              boxShadow: activeTab === tab ? '0 2px 4px rgba(0,0,0,0.07)' : 'none',
              textTransform: 'capitalize',
            }}
          >
            {tab === 'board' ? '🔒 Board' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Quick Actions</h2>
          </div>
          <div className={styles.list}>
            <div className={styles.listItem} style={{ cursor: 'pointer' }} onClick={() => navigate('/attendance')}>
              <div className={styles.itemIcon} style={{ background: '#1e3a5f18', color: '#1e3a5f' }}>
                <BarChart2 size={20} />
              </div>
              <div className={styles.itemInfo}>
                <p className={styles.itemTitle}>View Reports</p>
                <p className={styles.itemSubtitle}>Church-wide attendance & KPIs</p>
              </div>
              <ChevronRight size={16} color="#9ca3af" />
            </div>
            <div className={styles.listItem} style={{ cursor: 'pointer' }} onClick={() => navigate('/admin')}>
              <div className={styles.itemIcon} style={{ background: '#15803d18', color: '#15803d' }}>
                <Users size={20} />
              </div>
              <div className={styles.itemInfo}>
                <p className={styles.itemTitle}>Manage Department</p>
                <p className={styles.itemSubtitle}>Assign roles & oversee structure</p>
              </div>
              <ChevronRight size={16} color="#9ca3af" />
            </div>
            <div className={styles.listItem} style={{ cursor: 'pointer' }} onClick={() => setIsAssignModalOpen(true)}>
              <div className={styles.itemIcon} style={{ background: '#8b5cf618', color: '#8b5cf6' }}>
                <UserPlus size={20} />
              </div>
              <div className={styles.itemInfo}>
                <p className={styles.itemTitle}>Assign Shift</p>
                <p className={styles.itemSubtitle}>Schedule workforce roles</p>
              </div>
              <ChevronRight size={16} color="#9ca3af" />
            </div>
            <div className={styles.listItem} style={{ cursor: 'pointer' }} onClick={() => setActiveTab('board')}>
              <div className={styles.itemIcon} style={{ background: '#1e3a5f18', color: '#1e3a5f' }}>
                <MessageSquareLock size={20} />
              </div>
              <div className={styles.itemInfo}>
                <p className={styles.itemTitle}>Board Channel</p>
                <p className={styles.itemSubtitle}>Private Deacon Board communications</p>
              </div>
              <ChevronRight size={16} color="#9ca3af" />
            </div>
          </div>
        </section>
      )}

      {/* Escalations Tab */}
      {activeTab === 'escalations' && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Pending Escalations</h2>
          </div>
          {(dashboard?.pendingEscalations ?? 0) === 0 ? (
            <div className={styles.card} style={{ alignItems: 'center', textAlign: 'center', gap: '0.5rem' }}>
              <CheckCircle size={32} color="#22c55e" />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>All clear</p>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No pending escalations right now</p>
            </div>
          ) : (
            <div className={styles.card}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {dashboard?.pendingEscalations} item(s) requiring board review.
                Navigate to the admin panel to approve or reject them.
              </p>
              <button
                onClick={() => navigate('/admin')}
                style={{
                  background: '#1e3a5f', color: 'white', border: 'none',
                  borderRadius: 10, padding: '10px 16px', fontWeight: 600,
                  fontSize: '0.875rem', cursor: 'pointer',
                }}
              >
                Go to Admin Panel
              </button>
            </div>
          )}
        </section>
      )}

      {/* Board Chat Tab */}
      {activeTab === 'board' && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>🔒 Deacon Board</h2>
          </div>
          <div className={styles.card} style={{ gap: '0.75rem' }}>
            {/* Message input */}
            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Post a board message..."
              rows={2}
              style={{
                width: '100%', border: '1px solid var(--border-color)',
                borderRadius: 10, padding: '10px 12px', fontSize: '0.875rem',
                background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                resize: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handlePost}
              disabled={posting || !newMessage.trim()}
              style={{
                background: posting || !newMessage.trim() ? '#94a3b8' : '#1e3a5f',
                color: 'white', border: 'none', borderRadius: 10,
                padding: '10px 16px', fontWeight: 600, fontSize: '0.875rem',
                cursor: posting || !newMessage.trim() ? 'not-allowed' : 'pointer',
              }}
            >
              {posting ? 'Posting...' : 'Post to Board'}
            </button>
          </div>

          {/* Messages */}
          <div className={styles.list}>
            {boardMessages === undefined ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-purple-600" size={24} />
              </div>
            ) : boardMessages.length === 0 ? (
              <div className={styles.card} style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                No board messages yet. Be the first to post.
              </div>
            ) : (
              boardMessages.map((msg) => (
                <div key={msg._id} style={{
                  background: '#1e3a5f08',
                  border: '1px solid #1e3a5f20',
                  borderLeft: '3px solid #1e3a5f',
                  borderRadius: 12, padding: '0.875rem 1rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#1e3a5f' }}>
                      {msg.author.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {new Date(msg.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-primary)' }}>{msg.text}</p>
                </div>
              ))
            )}
          </div>
        </section>
      )}
      <MobileAssignShiftModal 
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
      />
    </div>
  );
};
