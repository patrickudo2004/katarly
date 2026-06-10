import React, { useState } from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Calendar, MapPin, QrCode, Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { MeetingCard } from '../../components/MeetingCard';
import { MemberProfileModal } from '../../components/MemberProfileModal';
import styles from './mobile.module.css';

export const VolunteerHome: React.FC = () => {
  const navigate = useNavigate();
  const me = useQuery(api.users.me);
  const nextService = useQuery(api.services.getNextService);
  const myShifts = useQuery(api.rotas.getMyShifts);
  const church = useQuery(api.churches.getMyChurch);
  const meetings = useQuery(api.meetings.getMeetingsForUser);
  const [showProfileModal, setShowProfileModal] = useState(false);

  if (me === undefined || nextService === undefined || church === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  const safeMyShifts = myShifts || [];
  const now = Date.now();
  const activeMeetings = (meetings || []).filter((meeting: any) => 
    now >= meeting.startTime - 15 * 60 * 1000 && 
    now <= meeting.endTime + 30 * 60 * 1000
  );

  const formatDistanceSafe = (timestamp: number | undefined) => {
    if (!timestamp) return 'No upcoming services';
    try {
      return formatDistanceToNow(timestamp, { addSuffix: true });
    } catch (e) {
      return 'TBD';
    }
  };

  const formatTimeSafe = (timestamp: number | undefined) => {
    if (!timestamp) return 'TBD';
    try {
      return format(timestamp, 'EEE, d MMM • p');
    } catch (e) {
      return 'TBD';
    }
  };

  return (
    <div className={styles.page}>
      {me?.role === "Probation" && (
        <section className={styles.section}>
          <div 
            className={`${styles.card} cursor-pointer hover:border-purple-300 transition-all`}
            style={{ 
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.08) 0%, rgba(167, 139, 250, 0.08) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.2)',
              padding: '1.25rem',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}
            onClick={() => setShowProfileModal(true)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="text-purple-600" style={{ display: 'flex' }}><TrendingUp size={20} /></span>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)' }}>Your Restoration Growth Track</span>
              </div>
              <span style={{ fontSize: '0.75rem', fontWeight: 750, color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)', padding: '0.25rem 0.50rem', borderRadius: '9999px', textTransform: 'uppercase' }}>Active</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              You are on a restorative journey to full status. Click here to see your checklist, metrics, and leadership remarks.
            </p>
          </div>
        </section>
      )}

      {activeMeetings.length > 0 && (
        <section className={styles.section} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <h2 className={styles.sectionTitle}>Active Gatherings</h2>
          {activeMeetings.map((meeting: any) => (
            <MeetingCard key={meeting._id} meeting={meeting} />
          ))}
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.card + ' ' + styles.countdownCard}>
          <span className={styles.countdownLabel}>Next Service</span>
          <span className={styles.countdownValue}>
            {formatDistanceSafe(nextService?.startTime)}
          </span>
          <span className={styles.countdownLabel}>{nextService?.name || '---'}</span>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Upcoming Shifts</h2>
        </div>
        <div className={styles.list}>
          {myShifts === undefined ? (
            <div className="flex items-center justify-center py-8 bg-white border border-gray-100 rounded-2xl">
              <Loader2 className="animate-spin text-purple-600" size={24} />
            </div>
          ) : safeMyShifts.length === 0 ? (
            <div className={styles.emptyState}>
              No upcoming shifts assigned.
            </div>
          ) : (
            safeMyShifts.map((shift: any) => (
              <div key={shift._id} className={styles.listItem}>
                <div className={styles.itemIcon}>
                  <Calendar size={20} />
                </div>
                <div className={styles.itemInfo}>
                  <p className={styles.itemTitle}>
                    {(shift.subunit?.name || shift.department?.name || 'General')} - {shift.role}
                  </p>
                  <p className={styles.itemSubtitle}>
                    {formatTimeSafe(shift.service?.startTime)}
                  </p>
                </div>
                <div className={styles.badge} style={{ 
                  background: shift.status === 'Confirmed' ? '#dcfce7' : '#fee2e2', 
                  color: shift.status === 'Confirmed' ? '#15803d' : '#991b1b' 
                }}>
                  {shift.status}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/time-off')}
            className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm active:scale-95 transition-all"
          >
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar size={20} />
            </div>
            <span className="text-xs font-semibold text-gray-700">Request Time Off</span>
          </button>
          
          <button 
            onClick={() => navigate('/marketplace')}
            className="flex flex-col items-center gap-2 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm active:scale-95 transition-all"
          >
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <RefreshCw size={20} />
            </div>
            <span className="text-xs font-semibold text-gray-700">Shift Marketplace</span>
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Location</h2>
        </div>
        <div className={styles.card}>
          <div className={styles.listItem} style={{ border: 'none', padding: 0 }}>
            <div className={styles.itemIcon}>
              <MapPin size={20} />
            </div>
            <div className={styles.itemInfo}>
              <p className={styles.itemTitle}>{church?.name || 'Main Sanctuary'}</p>
              <p className={styles.itemSubtitle}>{church?.address || 'Location not set'}</p>
            </div>
          </div>
        </div>
      </section>

      <button className={styles.floatingBtn} onClick={() => navigate('/attendance')}>
        <QrCode size={24} />
      </button>

      {showProfileModal && (
        <MemberProfileModal 
          userId={me._id} 
          onClose={() => setShowProfileModal(false)} 
        />
      )}
    </div>
  );
};
