import React from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Users, QrCode, MessageSquare, Loader2, MapPin } from 'lucide-react';
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
  
  const liveAttendance = useQuery(
    api.subunits.getLiveAttendance, 
    nextService && mySubunitId ? { serviceId: nextService._id, subunitId: mySubunitId } : "skip"
  );

  // Loading state: only wait for me and nextService. 
  // liveAttendance can be undefined if skipped (which is fine)
  if (me === undefined || nextService === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  const presentCount = liveAttendance?.length || 0;

  return (
    <div className={styles.page}>
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
          {!liveAttendance || liveAttendance.length === 0 ? (
            <div className={styles.emptyState}>
              No one has checked in yet.
            </div>
          ) : (
            liveAttendance.map((record: any) => (
              <div key={record._id} className={styles.listItem}>
                <div className={styles.avatar} style={{ width: 32, height: 32, fontSize: '0.75rem' }}>
                  {record.user?.name?.[0] || '?'}
                </div>
                <div className={styles.itemInfo}>
                  <p className={styles.itemTitle}>{record.user?.name || 'Unknown User'}</p>
                  <p className={styles.itemSubtitle}>
                    {record.status} • {format(record.timestamp, 'p')}
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
