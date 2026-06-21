import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Calendar as CalendarIcon, Clock, Check, RefreshCw, ChevronLeft, Award, CheckCircle2, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import styles from './MySchedule.module.css';

export const MySchedule: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Dynamically toggle query parameters on tab switches to optimize fetch size and database performance
  const shifts = useQuery(api.rotas.getMyShifts, { upcomingOnly: activeTab === 'upcoming' });
  const confirmShift = useMutation(api.rotas.confirmShift);

  const handleConfirm = async (rotaId: any) => {
    setConfirmingId(rotaId);
    try {
      await confirmShift({ rotaId });
    } catch (err) {
      console.error('Failed to confirm shift:', err);
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

  // Group shifts by Month Year (e.g., "June 2026")
  const groupShiftsByMonth = (items: any[]) => {
    const groups: { [key: string]: any[] } = {};
    items.forEach((item) => {
      if (!item.service?.startTime) return;
      const monthYear = format(item.service.startTime, 'MMMM yyyy');
      if (!groups[monthYear]) {
        groups[monthYear] = [];
      }
      groups[monthYear].push(item);
    });
    return groups;
  };

  const safeShifts = shifts || [];
  const groupedShifts = groupShiftsByMonth(safeShifts);

  // Compute metric stats
  const totalCount = safeShifts.length;
  const confirmedCount = safeShifts.filter((s: any) => s.status === 'Confirmed').length;
  const pendingCount = safeShifts.filter((s: any) => s.status === 'Pending').length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <button onClick={() => navigate('/')} className={styles.backBtn} aria-label="Go Back">
          <ChevronLeft size={20} />
          <span>Home</span>
        </button>
        <div className={styles.titleGroup}>
          <CalendarIcon className={styles.headerIcon} />
          <div>
            <h1>My Schedule</h1>
            <p>Your assigned duties and historical service record</p>
          </div>
        </div>
      </header>

      {/* Metrics Row */}
      <div className={styles.metricsRow}>
        <div className={styles.metricCard}>
          <Award className={styles.metricIcon} style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.1)' }} />
          <div>
            <span className={styles.metricValue}>{totalCount}</span>
            <span className={styles.metricLabel}>Total Assigned</span>
          </div>
        </div>
        <div className={styles.metricCard}>
          <CheckCircle2 className={styles.metricIcon} style={{ color: '#16a34a', background: 'rgba(22, 163, 74, 0.1)' }} />
          <div>
            <span className={styles.metricValue}>{confirmedCount}</span>
            <span className={styles.metricLabel}>Confirmed</span>
          </div>
        </div>
        <div className={styles.metricCard}>
          <AlertCircle className={styles.metricIcon} style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }} />
          <div>
            <span className={styles.metricValue}>{pendingCount}</span>
            <span className={styles.metricLabel}>Pending Action</span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className={styles.tabsContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'upcoming' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming Shifts
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'history' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History Ledger
        </button>
      </div>

      {/* Shift List Content */}
      <div className={styles.contentArea}>
        {shifts === undefined ? (
          <div className={styles.loadingArea}>
            <Loader2 className="animate-spin text-purple-600" size={32} />
            <p>Retrieving schedule roster...</p>
          </div>
        ) : safeShifts.length === 0 ? (
          <div className={styles.emptyState}>
            <CalendarIcon size={48} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No Shifts Found</p>
            <p className={styles.emptySubtitle}>
              {activeTab === 'upcoming'
                ? "You have no upcoming shifts scheduled. Assign shifts from the Rota panel or claim open shifts on the Marketplace."
                : "You have no recorded past shifts in this system."}
            </p>
            {activeTab === 'upcoming' && (
              <button onClick={() => navigate('/marketplace')} className={styles.marketplaceBtn}>
                Browse Shift Marketplace
              </button>
            )}
          </div>
        ) : (
          <div className={styles.timeline}>
            {Object.keys(groupedShifts).map((monthYear) => (
              <div key={monthYear} className={styles.monthGroup}>
                <h3 className={styles.monthHeader}>{monthYear}</h3>
                <div className={styles.monthList}>
                  {groupedShifts[monthYear].map((shift) => {
                    const isPending = shift.status === 'Pending';
                    const isConfirmed = shift.status === 'Confirmed';
                    
                    return (
                      <div key={shift._id} className={styles.listItem}>
                        <div className={styles.timelineTrack}></div>
                        <div className={styles.itemBullet} style={{
                          background: isConfirmed ? '#16a34a' : isPending ? '#f59e0b' : '#94a3b8'
                        }}></div>
                        
                        <div className={styles.itemDetails}>
                          <div className={styles.itemMainInfo}>
                            <h4 className={styles.itemTitle}>
                              {(shift.subunit?.name || shift.department?.name || 'General')}
                            </h4>
                            <span className={styles.itemRole}>{shift.role}</span>
                          </div>
                          
                          <div className={styles.timeMeta}>
                            <Clock size={14} />
                            <span>{formatTimeSafe(shift.service?.startTime)}</span>
                          </div>
                        </div>

                        <div className={styles.itemActions}>
                          {isPending && activeTab === 'upcoming' ? (
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
                          ) : isConfirmed ? (
                            <div className={styles.confirmedBadge}>
                              Confirmed
                            </div>
                          ) : (
                            <div className={styles.statusBadge} style={{
                              color: shift.status === 'Declined' ? '#ef4444' : '#6b7280',
                              background: shift.status === 'Declined' ? 'rgba(239, 68, 68, 0.1)' : 'var(--bg-primary)'
                            }}>
                              {shift.status}
                            </div>
                          )}

                          {activeTab === 'upcoming' && isConfirmed && (
                            <button
                              onClick={() => navigate('/marketplace')}
                              className={styles.swapBtnIcon}
                              title="Request Swap"
                              aria-label="Request Swap"
                            >
                              <RefreshCw size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
