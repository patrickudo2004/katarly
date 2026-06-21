import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Calendar, Loader2, Check, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import styles from './UpcomingShiftsCard.module.css';

export const UpcomingShiftsCard: React.FC = () => {
  const navigate = useNavigate();
  const myShifts = useQuery(api.rotas.getMyShifts);
  const confirmShift = useMutation(api.rotas.confirmShift);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (myShifts === undefined) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className="animate-spin text-purple-600" size={24} />
      </div>
    );
  }

  const safeMyShifts = myShifts || [];
  if (safeMyShifts.length === 0) {
    return null; // Don't show the card if there are no assignments
  }

  const handleConfirm = async (rotaId: any) => {
    setConfirmingId(rotaId);
    try {
      await confirmShift({ rotaId });
    } catch (err) {
      console.error("Failed to confirm shift:", err);
    } finally {
      setConfirmingId(null);
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
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Your Schedule</h2>
      <div className={styles.list}>
        {safeMyShifts.map((shift: any) => {
          const isPending = shift.status === 'Pending';
          return (
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
              <div className={styles.actions}>
                {isPending ? (
                  <>
                    <button
                      onClick={() => handleConfirm(shift._id)}
                      disabled={confirmingId === shift._id}
                      className={styles.confirmBtn}
                      aria-label="Confirm Shift"
                    >
                      {confirmingId === shift._id ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <Check size={14} />
                      )}
                      <span>Confirm</span>
                    </button>
                    <button
                      onClick={() => navigate('/marketplace')}
                      className={styles.swapBtn}
                      aria-label="Swap Shift"
                    >
                      <RefreshCw size={14} />
                      <span>Swap</span>
                    </button>
                  </>
                ) : (
                  <>
                    <div className={styles.badgeConfirmed}>
                      Confirmed
                    </div>
                    <button
                      onClick={() => navigate('/marketplace')}
                      className={styles.swapBtn}
                      style={{ padding: '0.5rem', borderRadius: '50%' }}
                      title="Request Swap"
                      aria-label="Swap Shift"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
