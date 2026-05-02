import React from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Calendar, MapPin, QrCode, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import styles from './mobile.module.css';

export const VolunteerHome: React.FC = () => {
  const navigate = useNavigate();
  const nextService = useQuery(api.services.getNextService);
  const myShifts = useQuery(api.rotas.getMyShifts);
  const church = useQuery(api.churches.getMyChurch);

  if (nextService === undefined || myShifts === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <div className={styles.card + ' ' + styles.countdownCard}>
          <span className={styles.countdownLabel}>Next Service In</span>
          <span className={styles.countdownValue}>
            {nextService ? formatDistanceToNow(nextService.startTime) : 'No upcoming services'}
          </span>
          <span className={styles.countdownLabel}>{nextService?.name || '---'}</span>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Upcoming Shifts</h2>
        </div>
        <div className={styles.list}>
          {myShifts.length === 0 ? (
            <div className={styles.emptyState}>
              No upcoming shifts assigned.
            </div>
          ) : (
            myShifts.map((shift: any) => (
              <div key={shift._id} className={styles.listItem}>
                <div className={styles.itemIcon}>
                  <Calendar size={20} />
                </div>
                <div className={styles.itemInfo}>
                  <p className={styles.itemTitle}>{shift.subunit?.name || 'Department'} - {shift.role}</p>
                  <p className={styles.itemSubtitle}>
                    {shift.service ? format(shift.service.startTime, 'EEE, d MMM • p') : 'TBD'}
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
    </div>
  );
};
