import React from 'react';
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Calendar, MapPin, QrCode, Loader2, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import styles from './mobile.module.css';

export const VolunteerHome: React.FC = () => {
  const navigate = useNavigate();
  const nextService = useQuery(api.services.getNextService);
  const myShifts = useQuery(api.rotas.getMyShifts);
  const church = useQuery(api.churches.getMyChurch);

  if (nextService === undefined || church === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    );
  }

  const safeMyShifts = myShifts || [];

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
    </div>
  );
};
