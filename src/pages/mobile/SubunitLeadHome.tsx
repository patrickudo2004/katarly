import React from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Users, QrCode, MessageSquare, Loader2, MapPin, ShieldAlert, ChevronRight, Calendar, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import styles from './mobile.module.css';

export const SubunitLeadHome: React.FC = () => {
  const navigate = useNavigate();
  const me = useQuery(api.users.me);
  const nextService = useQuery(api.services.getNextService);
  const subunits = useQuery(api.subunits.getSubunits);
  
  // Find the subunit this user leads
  const mySubunitId = me?.subunitId;
  
  const church = useQuery(api.churches.getMyChurch);
  const pendingVerifications = useQuery(api.attendance.getPendingVerifications, 
    church ? { churchId: church._id } : "skip"
  );
  const liveAttendance = useQuery(api.attendance.getServiceAttendance,
    nextService ? { serviceId: nextService._id } : "skip"
  );

  // Loading state
  // Only block if 'me' is loading. Other queries might be skipped (undefined) if church data is missing.
  if (me === undefined || (me?.churchId && (nextService === undefined || pendingVerifications === undefined || liveAttendance === undefined))) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  // Safe checks for arrays
  const safePendingVerifications = pendingVerifications || [];
  const safeLiveAttendance = liveAttendance || [];
  const presentCount = safeLiveAttendance.length;

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
      {safePendingVerifications.length > 0 && (
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
      )}

      <div className={styles.grid}>
        <div className={styles.card + ' ' + styles.statCard}>
          <span className={styles.statValue}>{presentCount}</span>
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
          {safeLiveAttendance.length === 0 ? (
            <div className={styles.emptyState}>
              No one has checked in yet.
            </div>
          ) : (
            safeLiveAttendance.map((record: any) => (
              <div key={record._id} className={styles.listItem}>
                <div className={styles.avatar} style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
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
