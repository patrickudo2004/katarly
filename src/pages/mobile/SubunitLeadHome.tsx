import React from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Users, QrCode, MessageSquare, Loader2, MapPin, ShieldAlert, ChevronRight, Calendar, RefreshCw, Video } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { MeetingCard } from '../../components/MeetingCard';
import styles from './mobile.module.css';

export const SubunitLeadHome: React.FC = () => {
  const navigate = useNavigate();
  const me = useQuery(api.users.me);
  const nextService = useQuery(api.services.getNextService);
  const meetings = useQuery(api.meetings.getMeetingsForUser);
  
  // Find the subunit this user leads
  const mySubunitId = me?.subunitId;
  
  const church = useQuery(api.churches.getMyChurch);
  const pendingVerifications = useQuery(api.attendance.getPendingVerifications, 
    church ? { churchId: church._id } : "skip"
  );
  
  // Scope live attendance specifically to the subunit being led, guarding against skipped queries
  const shouldSkip = !nextService || !mySubunitId;
  const liveAttendance = useQuery(api.subunits.getLiveAttendance,
    shouldSkip ? "skip" : { serviceId: nextService._id, subunitId: mySubunitId }
  );

  // Critical loading state (block main layout only on basic user & church/service context)
  const isMeLoading = me === undefined;
  const isChurchLoading = church === undefined;
  const isNextServiceLoading = nextService === undefined;

  if (isMeLoading || (me?.churchId && (isChurchLoading || isNextServiceLoading))) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  // Safe checks for arrays
  const safePendingVerifications = pendingVerifications || [];
  const isLiveAttendanceLoading = liveAttendance === undefined && !shouldSkip;
  const safeLiveAttendance = shouldSkip ? [] : (liveAttendance || []);
  const presentCount = safeLiveAttendance.length;

  const now = Date.now();
  const activeMeetings = (meetings || []).filter((meeting: any) => 
    now >= meeting.startTime - 15 * 60 * 1000 && 
    now <= meeting.endTime + 30 * 60 * 1000
  );

  const formatTimeSafe = (timestamp: number | undefined) => {
    if (!timestamp) return 'TBD';
    try {
      return format(timestamp, 'p');
    } catch (e) {
      return 'TBD';
    }
  };

  return (
    <div className={styles.page}>
      {activeMeetings.length > 0 && (
        <section className={styles.section} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <h2 className={styles.sectionTitle}>Active Gatherings</h2>
          {activeMeetings.map((meeting: any) => (
            <MeetingCard key={meeting._id} meeting={meeting} />
          ))}
        </section>
      )}

      {pendingVerifications === undefined ? (
        <div 
          className={styles.card} 
          style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px dashed rgba(139, 92, 246, 0.3)', marginBottom: '1.5rem', alignItems: 'center', justifyContent: 'center', minHeight: '80px' }}
        >
          <Loader2 className="animate-spin text-purple-600" size={20} />
        </div>
      ) : safePendingVerifications.length > 0 ? (
        <div 
          className={styles.card} 
          style={{ background: 'rgba(139, 92, 246, 0.1)', border: '1px solid #8b5cf6', marginBottom: '1.5rem' }}
          onClick={() => navigate('/admin')} // Or a specific mobile verification view if we had one
        >
          <div className={styles.sectionHeader}>
            <h3 style={{ color: '#8b5cf6', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={20} />
              {safePendingVerifications.length} Verification {safePendingVerifications.length === 1 ? 'Request' : 'Requests'}
            </h3>
            <ChevronRight size={20} color="#8b5cf6" />
          </div>
          <p className={styles.itemSubtitle}>Volunteers waiting for geofence approval</p>
        </div>
      ) : null}

      <div className={styles.grid}>
        <div className={styles.card + ' ' + styles.statCard}>
          {isLiveAttendanceLoading ? (
            <Loader2 className="animate-spin text-purple-600" size={20} />
          ) : (
            <span className={styles.statValue}>{presentCount}</span>
          )}
          <span className={styles.statLabel}>Checked In</span>
        </div>
        <div className={styles.card + ' ' + styles.statCard}>
          <span className={styles.statValue}>{nextService?.name || 'No Service'}</span>
          <span className={styles.statLabel}>Current Service</span>
        </div>
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Team Live Attendance</h2>
          {nextService && <div className={styles.badge} style={{ background: '#fef2f2', color: '#ef4444' }}>Live</div>}
        </div>
        <div className={styles.list}>
          {isLiveAttendanceLoading ? (
            <div className="flex items-center justify-center py-8 bg-white border border-gray-100 rounded-2xl">
              <Loader2 className="animate-spin text-purple-600" size={24} />
            </div>
          ) : safeLiveAttendance.length === 0 ? (
            <div className={styles.emptyState}>
              {!mySubunitId ? "No subunit assigned" : "No active service for check-in"}
            </div>
          ) : (
            safeLiveAttendance.map((record: any) => (
              <div key={record._id} className={styles.listItem}>
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 font-bold text-xs">
                  {record.user?.name?.[0] || '?'}
                </div>
                <div className={styles.itemInfo}>
                  <p className={styles.itemTitle}>{record.user?.name || 'Unknown User'}</p>
                  <p className={styles.itemSubtitle}>
                    {record.status} • {formatTimeSafe(record.timestamp)}
                  </p>
                </div>
                <div className={styles.badge} style={{ 
                  color: record.status === 'Present' ? '#22c55e' : '#f59e0b', 
                  border: `1px solid ${record.status === 'Present' ? '#22c55e' : '#f59e0b'}` 
                }}>
                  {record.status}
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

          <button 
            onClick={() => navigate('/meetings?create=true')}
            className="col-span-2 flex items-center justify-center gap-3 p-4 bg-white border border-gray-100 rounded-2xl shadow-sm active:scale-95 transition-all"
          >
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Video size={20} />
            </div>
            <span className="text-sm font-semibold text-gray-700">Schedule Subunit Meeting</span>
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.card} onClick={() => navigate('/chat')} style={{ cursor: 'pointer' }}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.itemTitle}>Subunit Chat</h3>
            <MessageSquare size={18} color="#8b5cf6" />
          </div>
          <p className={styles.itemSubtitle}>Internal team coordination</p>
        </div>
      </section>

      <button className={styles.floatingBtn} onClick={() => navigate('/attendance')}>
        <QrCode size={24} />
      </button>
    </div>
  );
};
